import asyncio
import unittest

from reference import (
    BusinessError, RateLimitError, ToolCall, ToolSpec, TransientError,
    execute_tools, retry, rrf, run_agent,
)


def validate_lookup(args):
    if set(args) != {"order_id"} or not isinstance(args["order_id"], str):
        raise ValueError("expected order_id")
    return dict(args)


async def lookup(order_id):
    return {"order_id": order_id}


def scripted(*responses):
    iterator = iter(responses)

    async def model(messages):
        return next(iterator)

    return model


def call(call_id="c1", **overrides):
    return {"type": "tool_call", "call_id": call_id, "name": "lookup",
            "arguments": {"order_id": "o1"}, **overrides}


class LoopTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.tools = {"lookup": ToolSpec(lookup, validate_lookup)}

    async def test_result_is_correlated(self):
        async def model(messages):
            if len(messages) == 1:
                return call()
            self.assertEqual(messages[-1]["call_id"], "c1")
            self.assertTrue(messages[-1]["content"]["ok"])
            return {"type": "final", "content": "found"}

        result = await run_agent(model, self.tools, "query")
        self.assertEqual((result.status, result.output, result.turns),
                         ("completed", "found", 2))

    async def test_invalid_arguments_are_not_executed(self):
        executions = []

        async def execute(**args):
            executions.append(args)

        async def model(messages):
            if len(messages) == 1:
                return call(arguments={"order_id": 123, "is_admin": True})
            self.assertEqual(messages[-1]["content"]["error"]["code"],
                             "INVALID_ARGUMENTS")
            return {"type": "final", "content": "clarify"}

        await run_agent(model, {"lookup": ToolSpec(execute, validate_lookup)}, "x")
        self.assertEqual(executions, [])

    async def test_unknown_tool_can_be_corrected(self):
        result = await run_agent(scripted(call(name="missing"),
            {"type": "final", "content": "unavailable"}), self.tools, "x")
        self.assertEqual(result.status, "completed")

    async def test_repeated_call_stops_before_third_execution(self):
        executions = []

        async def execute(**args):
            executions.append(args)
            return {}

        result = await run_agent(scripted(call("1"), call("2"), call("3")),
                                 {"lookup": ToolSpec(execute, validate_lookup)}, "x")
        self.assertEqual(result.status, "stalled")
        self.assertEqual(len(executions), 2)

    async def test_duplicate_call_id_is_protocol_error(self):
        result = await run_agent(scripted(call(), call()), self.tools, "x")
        self.assertEqual(result.error, "INVALID_CALL_ID")

    async def test_invalid_model_output(self):
        for response in ([], {"type": "other"}, {"type": "final", "content": 1}):
            with self.subTest(response=response):
                result = await run_agent(scripted(response), self.tools, "x")
                self.assertEqual(result.status, "failed")

    async def test_write_tool_is_not_executed(self):
        result = await run_agent(scripted(call()),
            {"lookup": ToolSpec(lookup, validate_lookup, read_only=False)}, "x")
        self.assertEqual(result.error, "WRITE_TOOL_NOT_SUPPORTED")

    async def test_model_error_is_redacted(self):
        async def model(_):
            raise RuntimeError("secret-token")

        result = await run_agent(model, self.tools, "x")
        self.assertEqual(result.error, "MODEL_ERROR")

    async def test_total_deadline_cancels_model(self):
        cleaned = asyncio.Event()

        async def model(_):
            try:
                await asyncio.Event().wait()
            finally:
                cleaned.set()

        result = await run_agent(model, self.tools, "x", total_timeout=0.03)
        self.assertEqual(result.status, "timeout")
        self.assertTrue(cleaned.is_set())

    async def test_tool_timeout_is_observation(self):
        async def slow(**_):
            await asyncio.Event().wait()

        async def model(messages):
            if len(messages) == 1:
                return call()
            self.assertEqual(messages[-1]["content"]["error"]["code"], "TOOL_TIMEOUT")
            return {"type": "final", "content": "tool unavailable"}

        result = await run_agent(model, {"lookup": ToolSpec(slow, validate_lookup)},
                                 "x", tool_timeout=0.02)
        self.assertEqual(result.status, "completed")

    async def test_turn_limit(self):
        result = await run_agent(scripted(call()), self.tools, "x", max_turns=1)
        self.assertEqual(result.status, "max_turns")

    async def test_external_cancel_propagates(self):
        entered = asyncio.Event()

        async def model(_):
            entered.set()
            await asyncio.Event().wait()

        task = asyncio.create_task(run_agent(model, self.tools, "x"))
        await entered.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task


class RetryTests(unittest.IsolatedAsyncioTestCase):
    async def test_transient_then_success(self):
        attempts = []

        async def invoke():
            attempts.append(1)
            if len(attempts) < 3:
                raise TransientError()
            return 7

        self.assertEqual(await retry(invoke, base=0), 7)
        self.assertEqual(len(attempts), 3)

    async def test_business_error_not_retried(self):
        attempts = []

        async def invoke():
            attempts.append(1)
            raise BusinessError()

        with self.assertRaises(BusinessError):
            await retry(invoke)
        self.assertEqual(len(attempts), 1)

    async def test_attempt_limit(self):
        attempts = []

        async def invoke():
            attempts.append(1)
            raise TransientError()

        with self.assertRaises(TransientError):
            await retry(invoke, attempts=2, base=0)
        self.assertEqual(len(attempts), 2)

    async def test_hanging_call_respects_deadline(self):
        cleaned = asyncio.Event()

        async def invoke():
            try:
                await asyncio.Event().wait()
            finally:
                cleaned.set()

        with self.assertRaises(asyncio.TimeoutError):
            await retry(invoke, deadline_s=0.03)
        self.assertTrue(cleaned.is_set())

    async def test_retry_after_larger_than_budget_does_not_retry(self):
        attempts = []

        async def invoke():
            attempts.append(1)
            raise RateLimitError(retry_after=10)

        with self.assertRaises(asyncio.TimeoutError):
            await retry(invoke, deadline_s=0.03)
        self.assertEqual(len(attempts), 1)

    async def test_cancel_propagates(self):
        entered = asyncio.Event()

        async def invoke():
            entered.set()
            await asyncio.Event().wait()

        task = asyncio.create_task(retry(invoke))
        await entered.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task


class ExecutorTests(unittest.IsolatedAsyncioTestCase):
    async def test_concurrency_and_order(self):
        active = peak = 0

        async def invoke(i):
            nonlocal active, peak
            active += 1
            peak = max(peak, active)
            try:
                await asyncio.sleep((6 - i) * 0.005)
                return i
            finally:
                active -= 1

        results = await execute_tools([
            ToolCall(str(i), lambda i=i: invoke(i)) for i in range(6)
        ], concurrency=3)
        self.assertEqual([r.value for r in results], list(range(6)))
        self.assertEqual([r.call_id for r in results], list(map(str, range(6))))
        self.assertEqual(peak, 3)
        self.assertEqual(active, 0)

    async def test_error_classification(self):
        async def business():
            raise BusinessError("private order")

        async def broken():
            raise RuntimeError("private credential")

        async def slow():
            await asyncio.Event().wait()

        results = await execute_tools([
            ToolCall("a", business), ToolCall("b", broken), ToolCall("c", slow)
        ], tool_timeout=0.02)
        self.assertEqual([r.error_code for r in results],
                         ["BUSINESS_REJECTED", "SYSTEM_ERROR", "TOOL_TIMEOUT"])

    async def test_deadline_includes_queue_and_prevents_start(self):
        started = []

        async def invoke(i):
            started.append(i)
            await asyncio.Event().wait()

        results = await execute_tools([
            ToolCall(str(i), lambda i=i: invoke(i)) for i in range(3)
        ], concurrency=1, tool_timeout=10, total_timeout=0.03)
        self.assertEqual(started, [0])
        self.assertTrue(all(r.error_code == "RUN_DEADLINE" for r in results))

    async def test_cancel_cleans_running_and_queued_tasks(self):
        entered = asyncio.Event()
        cleaned = asyncio.Event()
        started = []

        async def invoke(i):
            started.append(i)
            entered.set()
            try:
                await asyncio.Event().wait()
            finally:
                cleaned.set()

        task = asyncio.create_task(execute_tools([
            ToolCall(str(i), lambda i=i: invoke(i)) for i in range(3)
        ], concurrency=1))
        await entered.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertTrue(cleaned.is_set())
        self.assertEqual(started, [0])

    async def test_empty_batch(self):
        self.assertEqual(await execute_tools([]), [])

    async def test_duplicate_ids_rejected(self):
        with self.assertRaises(ValueError):
            await execute_tools([ToolCall("x", lambda: lookup("1"))] * 2)

    async def test_invalid_configuration(self):
        with self.assertRaises(ValueError):
            await execute_tools([], concurrency=0)
        with self.assertRaises(ValueError):
            await execute_tools([], total_timeout=float("nan"))


class RankingTests(unittest.TestCase):
    def test_fusion_and_stable_tie_break(self):
        self.assertEqual([d for d, _ in rrf(["b", "a"], ["a", "b"])], ["a", "b"])

    def test_duplicate_has_one_contribution_per_source(self):
        scores = dict(rrf(["a", "a", "b"], ["b", "a"]))
        self.assertAlmostEqual(scores["a"], 1 / 61 + 1 / 62)
        self.assertAlmostEqual(scores["b"], 1 / 63 + 1 / 61)

    def test_empty_and_invalid_k(self):
        self.assertEqual(rrf([]), [])
        with self.assertRaises(ValueError):
            rrf(["a"], k=0)


if __name__ == "__main__":
    unittest.main()

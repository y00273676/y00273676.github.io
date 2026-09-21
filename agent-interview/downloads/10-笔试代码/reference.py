"""Framework-independent interview references; standard library, Python 3.9+.

Factories must return cooperative async I/O. Timeouts request cancellation;
they cannot kill blocking code or roll back an external side effect.
"""
from __future__ import annotations

import asyncio
import json
import math
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Sequence


async def _invoke(factory: Callable[[], Awaitable[Any]]) -> Any:
    return await factory()


def _positive(value: float, name: str) -> None:
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{name} must be finite and positive")


def _count(value: int, name: str) -> None:
    if type(value) is not int or value < 1:
        raise ValueError(f"{name} must be a positive integer")


@dataclass(frozen=True)
class RunResult:
    status: str
    output: Any
    turns: int
    error: str | None = None


@dataclass(frozen=True)
class ToolSpec:
    execute: Callable[..., Awaitable[Any]]
    validate: Callable[[dict[str, Any]], dict[str, Any]]
    # Only register trusted, already-authorized read tools in this exercise.
    read_only: bool = True


async def run_agent(
    model,
    tools: dict[str, ToolSpec],
    user_input: str,
    *,
    max_turns: int = 8,
    total_timeout: float = 30.0,
    tool_timeout: float = 5.0,
    repeat_limit: int = 2,
) -> RunResult:
    """C1: custom adapter protocol, not OpenAI/LangChain wire messages.

    model returns {type: final, content: str} or
    {type: tool_call, call_id: str, name: str, arguments: dict}.
    External cancellation propagates as CancelledError.
    A final answer here is a loop terminal event, not business verification.
    """
    _count(max_turns, "max_turns")
    _count(repeat_limit, "repeat_limit")
    _positive(total_timeout, "total_timeout")
    _positive(tool_timeout, "tool_timeout")
    loop = asyncio.get_running_loop()
    deadline = loop.time() + total_timeout
    messages = [{"role": "user", "content": user_input}]
    seen: Counter[str] = Counter()
    call_ids: set[str] = set()

    for turn in range(1, max_turns + 1):
        remaining = deadline - loop.time()
        if remaining <= 0:
            return RunResult("timeout", None, turn - 1, "RUN_DEADLINE")
        try:
            response = await asyncio.wait_for(
                _invoke(lambda: model(messages)), remaining
            )
        except asyncio.TimeoutError:
            return RunResult("timeout", None, turn, "MODEL_TIMEOUT")
        except Exception:
            return RunResult("failed", None, turn, "MODEL_ERROR")
        if loop.time() >= deadline:
            return RunResult("timeout", None, turn, "RUN_DEADLINE")
        if not isinstance(response, dict):
            return RunResult("failed", None, turn, "INVALID_MODEL_RESPONSE")
        if response.get("type") == "final":
            if not isinstance(response.get("content"), str):
                return RunResult("failed", None, turn, "INVALID_FINAL")
            return RunResult("completed", response["content"], turn)
        if response.get("type") != "tool_call":
            return RunResult("failed", None, turn, "INVALID_MODEL_RESPONSE")

        call_id = response.get("call_id")
        if not isinstance(call_id, str) or not call_id or call_id in call_ids:
            return RunResult("failed", None, turn, "INVALID_CALL_ID")
        call_ids.add(call_id)
        name, arguments = response.get("name"), response.get("arguments")
        observation = {"ok": False, "error": {"code": "INVALID_TOOL_CALL"}}
        if isinstance(name, str) and name in tools and isinstance(arguments, dict):
            spec = tools[name]
            if not spec.read_only:
                return RunResult("failed", None, turn, "WRITE_TOOL_NOT_SUPPORTED")
            try:
                args = spec.validate(arguments)
                if not isinstance(args, dict) or not all(isinstance(k, str) for k in args):
                    raise ValueError("invalid validator result")
                key = name + ":" + json.dumps(args, sort_keys=True, allow_nan=False)
            except (TypeError, ValueError):
                observation = {"ok": False, "error": {"code": "INVALID_ARGUMENTS"}}
            else:
                seen[key] += 1
                if seen[key] > repeat_limit:
                    return RunResult("stalled", None, turn, "REPEATED_CALL")
                remaining = deadline - loop.time()
                if remaining <= 0:
                    return RunResult("timeout", None, turn, "RUN_DEADLINE")
                try:
                    value = await asyncio.wait_for(
                        _invoke(lambda: spec.execute(**args)),
                        min(tool_timeout, remaining),
                    )
                    observation = {"ok": True, "data": value}
                except asyncio.TimeoutError:
                    observation = {"ok": False, "error": {"code": "TOOL_TIMEOUT"}}
                except Exception:
                    observation = {"ok": False, "error": {"code": "TOOL_ERROR"}}
                if loop.time() >= deadline:
                    return RunResult("timeout", None, turn, "RUN_DEADLINE")
        messages.extend([
            response,
            {"role": "tool", "call_id": call_id, "content": observation},
        ])
    return RunResult("max_turns", None, max_turns, "TURN_LIMIT")


class TransientError(Exception):
    """Explicitly classified transient failure; safe-to-retry contract required."""


class RateLimitError(TransientError):
    def __init__(self, retry_after: float = 0.0):
        if not math.isfinite(retry_after) or retry_after < 0:
            raise ValueError("retry_after must be finite and nonnegative")
        self.retry_after = retry_after
        super().__init__("rate limited")


async def retry(
    call: Callable[[], Awaitable[Any]],
    *,
    attempts: int = 4,
    base: float = 0.2,
    cap: float = 2.0,
    deadline_s: float = 3.0,
) -> Any:
    """C2: explicit transient errors only; timeout is not retried automatically."""
    _count(attempts, "attempts")
    _positive(deadline_s, "deadline_s")
    _positive(cap, "cap")
    if not math.isfinite(base) or base < 0:
        raise ValueError("base must be finite and nonnegative")
    loop = asyncio.get_running_loop()
    deadline = loop.time() + deadline_s
    for attempt in range(attempts):
        remaining = deadline - loop.time()
        if remaining <= 0:
            raise asyncio.TimeoutError("retry deadline exceeded")
        try:
            value = await asyncio.wait_for(_invoke(call), remaining)
            if loop.time() >= deadline:
                raise asyncio.TimeoutError("retry deadline exceeded")
            return value
        except TransientError as exc:
            if attempt + 1 == attempts:
                raise
            delay = random.uniform(0, min(cap, base * 2 ** min(attempt, 30)))
            if isinstance(exc, RateLimitError):
                delay = max(delay, exc.retry_after)
            remaining = deadline - loop.time()
            if delay >= remaining:
                raise asyncio.TimeoutError("retry deadline exceeded") from exc
            await asyncio.sleep(delay)


class BusinessError(Exception):
    """Expected domain rejection. Do not include secrets in the code."""


@dataclass(frozen=True)
class ToolCall:
    call_id: str
    invoke: Callable[[], Awaitable[Any]]


@dataclass(frozen=True)
class ToolResult:
    call_id: str
    status: str
    value: Any = None
    error_code: str | None = None


async def execute_tools(
    calls: Sequence[ToolCall],
    *,
    concurrency: int = 3,
    tool_timeout: float = 2.0,
    total_timeout: float = 5.0,
) -> list[ToolResult]:
    """C4: finite batch of read tools; total deadline includes semaphore wait."""
    _count(concurrency, "concurrency")
    _positive(tool_timeout, "tool_timeout")
    _positive(total_timeout, "total_timeout")
    if any(not isinstance(c.call_id, str) or not c.call_id for c in calls):
        raise ValueError("call_id must be nonempty text")
    if len({c.call_id for c in calls}) != len(calls):
        raise ValueError("duplicate call_id")
    loop = asyncio.get_running_loop()
    deadline = loop.time() + total_timeout
    semaphore = asyncio.Semaphore(concurrency)

    async def run_one(call: ToolCall) -> ToolResult:
        acquired = False
        try:
            remaining = deadline - loop.time()
            if remaining <= 0:
                return ToolResult(call.call_id, "error", error_code="RUN_DEADLINE")
            await asyncio.wait_for(semaphore.acquire(), remaining)
            acquired = True
            remaining = deadline - loop.time()
            if remaining <= 0:
                return ToolResult(call.call_id, "error", error_code="RUN_DEADLINE")
            value = await asyncio.wait_for(
                _invoke(call.invoke), min(tool_timeout, remaining)
            )
            if loop.time() >= deadline:
                return ToolResult(call.call_id, "error", error_code="RUN_DEADLINE")
            return ToolResult(call.call_id, "ok", value)
        except asyncio.TimeoutError:
            code = "RUN_DEADLINE" if loop.time() >= deadline else "TOOL_TIMEOUT"
            return ToolResult(call.call_id, "error", error_code=code)
        except BusinessError:
            return ToolResult(call.call_id, "error", error_code="BUSINESS_REJECTED")
        except Exception:
            return ToolResult(call.call_id, "error", error_code="SYSTEM_ERROR")
        finally:
            if acquired:
                semaphore.release()

    tasks = [asyncio.create_task(run_one(call)) for call in calls]
    try:
        return await asyncio.gather(*tasks)
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


def rrf(*rankings: list[str], k: int = 60) -> list[tuple[str, float]]:
    """C7: each source contributes once/doc, at its first original rank."""
    _count(k, "k")
    scores: dict[str, float] = defaultdict(float)
    for ranking in rankings:
        seen = set()
        for rank, doc_id in enumerate(ranking, start=1):
            if not isinstance(doc_id, str):
                raise ValueError("doc_id must be text")
            if doc_id not in seen:
                scores[doc_id] += 1.0 / (k + rank)
                seen.add(doc_id)
    return sorted(scores.items(), key=lambda item: (-item[1], item[0]))

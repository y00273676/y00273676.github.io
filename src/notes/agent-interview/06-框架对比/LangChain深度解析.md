# Agent 面试专题：框架对比 · LangChain深度解析

> 校订：2026-09-21。面向高级工程师、架构与技术负责人。保留专题 Q 编号；与主题库 Q 编号分开使用。

## Q24: LangChain 的核心设计理念是什么？有哪些优缺点？

### 专业版答案

LangChain v1 的高层 Agent 入口是 `langchain.agents.create_agent`，基于 LangGraph 运行并提供 middleware 扩展。旧资料中的 `LLMChain`、`ConversationBufferMemory`、旧 `AgentExecutor` 组合不能直接当作 v1 新项目模板。

学习重点是模型/工具适配、状态、middleware、结构化输出和错误边界；需要细粒度编排时再使用底层图。框架可以减少通用代码，但不能代替授权、业务事务、评测和部署。

迁移步骤：锁定旧版本与回归任务 → 盘点 Agent/Memory/回调接口 → 逐项替换 → 比较消息、工具、流式与恢复语义 → 灰度。不要只把 import 改完就宣布完成。

版本依据：[LangChain v1 迁移指南](https://docs.langchain.com/oss/python/migrate/langchain-v1)。

### 白话版答案

现在的入口和旧教程不同，迁移要验证运行行为，不只是修复导入错误。

### 高级追问与评分点

迁移后对话正常但人工审批恢复重复执行工具，如何定位框架恢复语义与业务幂等缺口？

---

复习入口：[[00-Agent开发岗位面试与笔试全题库]] · [[09-高级架构与技术负责人/高级面试题]] · [[99-更新说明与资料来源]]。

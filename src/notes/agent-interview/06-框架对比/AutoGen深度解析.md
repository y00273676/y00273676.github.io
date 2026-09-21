# Agent 面试专题：框架对比 · AutoGen深度解析

> 校订：2026-09-21。面向高级工程师、架构与技术负责人。保留专题 Q 编号；与主题库 Q 编号分开使用。

## Q35: 如何理解和维护 AutoGen 系统，并规划迁移？

### 专业版答案

首先确认实际依赖版本。旧 `autogen.AssistantAgent`、`UserProxyAgent`、`GroupChatManager` 教程对应旧接口体系；后续 AutoGen 提供 Core、AgentChat 与 Extensions，不能混用例子。

截至核对日，AutoGen 官方仓库标注维护模式，建议新用户使用 Microsoft Agent Framework，并提供迁移路径。存量项目不必立即重写：先识别运行时、消息、工具、终止和人机交互契约，建立差分回归，再逐步替换。

评审重点是终止条件、共享状态、工具执行边界、取消与人工恢复。对话式协作不是“互相聊天就能可靠完成”。

依据：[AutoGen 官方维护说明](https://github.com/microsoft/autogen)、[官方迁移指南](https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/)。

### 白话版答案

先知道用的是哪一代，再评估维护风险；能运行的老项目要带着测试迁移。

### 高级追问与评分点

迁移期间新旧系统影子运行如何避免两边都发邮件？要求隔离执行或重放只读记录。

---

复习入口：[[00-Agent开发岗位面试与笔试全题库]] · [[09-高级架构与技术负责人/高级面试题]] · [[99-更新说明与资料来源]]。

# 2026-08-08 OpenClaw MCP 长任务超时提示收口

## 背景

用户反馈 OpenClaw 调用 MCP 时，会不稳定地出现“超时”提示，尤其集中在设计工作台相关调用。

本轮同时要继续做 `local-single-user` 打包，因此先把 OpenClaw 这条不稳定提示的根因和最小修复收口，避免把“客户端等待超时”和“服务端真实失败”混在一起。

## 根因

排查 `apps/server/src/modules/openclaw/openclaw-installation.service.ts`、`apps/server/src/modules/openclaw/openclaw.service.ts` 与 `apps/server/src/modules/works/works.service.ts` 后确认有两个关键点：

1. `create_design_work` 并不是纯排队接口  
   - 它会继续同步等待 `worksService.generateDesignWork()`  
   - 图片设计场景下会直接等待模型与生图链路返回

2. 安装中心导出的客户端配置 timeout 不一致  
   - `WorkBuddy` 片段已有 `timeout: 600000`
   - `OpenClaw / Cursor / Claude Desktop` 片段此前没有同步写入该配置

3. OpenClaw 对外返回语义也有偏差  
   - `create_design_work` 成功后，响应标题仍写成“设计任务已受理”
   - `resultStatus` 会被推断为 `IN_PROGRESS`
   - 这会让上层客户端误以为任务还在排队，而不是已经同步完成

所以这类“不稳定超时”更多是：

- 长任务实际执行时间较长
- 客户端 timeout 配置不统一
- 返回语义又把“已完成”包装成了“处理中”

而不是 MCP 网关本身已经断掉。

## 本次修复

### 1. 安装中心导出的 MCP 片段统一补长超时

- 文件：`apps/server/src/modules/openclaw/openclaw-installation.service.ts`

本次把以下片段统一补为 `timeout: 600000`：

- OpenClaw
- Cursor
- Claude Desktop
- WorkBuddy 维持原值不变

### 2. 设计任务成功返回改为已完成语义

- 文件：`apps/server/src/modules/openclaw/openclaw.service.ts`

调整 `create_design_work` 成功响应：

- 标题从“设计任务已受理”改为“设计任务已完成”
- summary 从“创建任务”改为“完成任务”
- 补充 `任务 ID`
- 显式返回 `resultStatus: "COMPLETED"`

这样即使这次调用本身较慢，只要已经成功返回，就不会再把成功结果误导成“继续查状态”。

## 影响范围

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `docs/openclaw/README.md`
- `docs/openclaw/OpenClaw正式安装与网站对接说明.md`
- `docs/README.md`
- `docs/changes/2026-08-08-openclaw-mcp-timeout-stability.md`

## 验证

本次已完成：

- 静态核对 OpenClaw 安装中心导出的各客户端配置片段
- 静态确认 `create_design_work` 会同步等待设计生成链路，而非纯排队返回
- 核对 OpenClaw 响应状态推断逻辑与设计任务返回文案

本次待继续执行：

- 重新构建并打包 `local-single-user`
- 产物级核对最新包是否包含本轮 OpenClaw 修正

## 结论

OpenClaw 里的“超时不稳定”提示，根因不是单一接口偶发失效，而是长任务调用和客户端等待策略不一致。

这次先做了两层收口：

1. 统一导出长超时配置，减少客户端过早断开
2. 成功返回时明确标记为已完成，减少误导性的“处理中”状态

后续如果仍要继续降低长任务超时感知，下一步应考虑把设计工作台这类 MCP 工具进一步改成“快速受理 + 站内任务轮询”的真正异步模式。

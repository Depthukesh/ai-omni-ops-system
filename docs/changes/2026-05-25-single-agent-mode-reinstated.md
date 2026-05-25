# 2026-05-25 恢复单 Agent 开发模式

## 背景

- 本仓库在一次真实的多 Agent 并行开发尝试中，先后出现了工作树失联、独立 `git init` 打断原有拓扑、主工作区 Git 元数据需要人工恢复等风险。
- 虽然并行 Agent 已完成的 `more-features/design` 子模块最终被安全收口到 `main`，但当前收益不足以覆盖额外的 Git 与工作区风险。
- 因此本轮决定结束多 Agent 并行开发，恢复为单 Agent 统一开发、验证、提交与推送。

## 本次调整

- `AGENTS.md`
  - 将默认协作方式改回单 Agent 收口。
  - 将多 Agent 规则降级为历史背景，不再作为当前默认执行方式。
- `docs/ai-multi-agent-collaboration-playbook.md`
  - 在文档顶部明确标记为历史参考。
  - 保留旧规则正文，供后续复盘与必要时恢复使用。
- `docs/development-delivery-checklist.md`
  - 去掉“默认存在第二个 Agent”时的开发前确认项与交付后说明项。
- `docs/README.md`
  - 将多 Agent 协作文档描述调整为历史资料，并补记本次模式回退。

## 当前默认规则

- 用户需求只对接一个执行 Agent。
- 代码、验证、文档更新、提交与推送均由同一个主 Agent 负责。
- 不再默认新建并行 Agent、本地并行工作树或额外飞书协作链路。
- 历史并行目录、分支和飞书文档仅保留为现场资料，不继续扩展。

## 保留的历史现场

- `agent/xhs-skill/main` 分支已完成收口，当前与 `main` 一致。
- 另一个 Agent 的工作目录与飞书记录暂不立即删除，作为短期回溯现场保留。
- 只清理为了安全合并临时创建的合并工作区，避免继续扩大工作区数量。

## 验证

- 人工回读 `AGENTS.md`
- 人工回读 `docs/ai-multi-agent-collaboration-playbook.md`
- 人工回读 `docs/development-delivery-checklist.md`
- 人工回读 `docs/README.md`

## 后续建议

- 后续由主 Agent 单线推进开发，避免继续复用多工作区并行写代码模式。
- 另找安全窗口，彻底梳理主工作区 Git 现场与历史并行目录，决定是否最终删除旧目录。

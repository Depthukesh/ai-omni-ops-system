# 2026-05-19 AI Agent 权限与 Secrets 管理策略

## 为什么补这份文档

- 当前仓库已经准备支持多 Agent 协作，但之前只有协作流程，没有把 GitHub 权限、Secrets 边界和接入最小权限方案写清楚。
- 如果第二个 Agent 接入时没有权限分层，很容易出现：
  - 误给推送权限
  - 误给生产权限
  - 把真实密钥写入仓库文档
  - 在交付说明或日志中泄露敏感信息

## 本次新增内容

- 新增 `docs/ai-agent-access-and-secrets-policy.md`
- 重点明确了：
  - 主 Agent / 并行 Agent / 文档 Agent 的权限边界
  - GitHub 读取、写入、PR、Actions 的默认建议
  - Secrets 的分类、允许存放位置、禁止写入位置
  - 第二个 Agent 的最小权限建议
  - 主 Agent 的权限管理职责
  - 敏感信息遮挡规则
  - 第二个 Agent 的标准接入提示

## 影响范围

- `docs/`
- `AGENTS.md`
- 多 Agent 协作文档体系

## 使用方式

1. 接入第二个 Agent 前，先让其阅读：
   - `AGENTS.md`
   - `docs/ai-multi-agent-collaboration-playbook.md`
   - `docs/ai-agent-access-and-secrets-policy.md`
2. 由主 Agent 明确本轮任务边界和验证方式。
3. 如需环境变量或联调凭据，由主 Agent 或人工受控注入，不写入仓库文档。

## 后续建议

- 如果后续确实启用 GitHub PR 流程，建议把分支保护、CODEOWNERS 和机器人权限再单独固化为仓库治理文档。
- 如果以后要开放生产排障给专用 Agent，应单独再补生产环境访问策略，而不是把生产细节混进通用协作文档。

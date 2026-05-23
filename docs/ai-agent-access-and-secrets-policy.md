# AI Agent 权限与 Secrets 管理策略

## 1. 目标

- 为本仓库接入第二个或更多 AI Agent 时，定义清晰的权限边界和 Secrets 使用规则。
- 保证 Agent 能完成开发、联调、提交协作，但不会因为权限过大或密钥暴露带来额外风险。
- 明确哪些信息可以写进文档，哪些只能保存在受控系统中，哪些必须由主 Agent 或人工持有。

## 2. 基本原则

### 2.1 最小权限原则

- 默认只给 Agent 完成当前任务所需的最小权限。
- 第二个 Agent 默认不直接拥有：
  - GitHub 仓库推送权限
  - GitHub Actions / Secrets 修改权限
  - 生产环境 SSH 权限
  - 生产数据库直连权限
  - 任意第三方平台的真实主密钥

### 2.2 明文不入库原则

- 真实密码、Token、API Key、私钥、连接串，不允许写入：
  - `docs/`
  - `AGENTS.md`
  - `README.md`
  - `docs/changes/*.md`
  - 提交信息
  - 代码注释
  - 测试快照
- 这些文档里只能写“需要什么权限、到哪里申请、如何注入、谁审批”，不能写真实值。

### 2.3 主 Agent 收口原则

- 主 Agent 负责权限边界解释、Secrets 使用约束、最终提交与推送。
- 并行 Agent 只使用已经受控注入的运行时能力，不自行请求扩大权限。

### 2.4 环境隔离原则

- 本地开发、测试环境、生产环境的权限必须分层。
- 不能因为本地方便，就默认把生产权限也给 Agent。

## 3. Agent 角色权限矩阵

### 3.1 主 Agent

- 默认可拥有：
  - 全仓库只读
  - 本地工作区写入
  - 本地构建与诊断
  - Git 本地提交
  - 在用户明确授权时推送远端
- 默认不应直接拥有：
  - GitHub Secrets 明文查看能力
  - 生产 SSH 长期权限
  - 生产数据库明文凭据
- 如需临时使用高权限，由人工显式授权并限制时长。

### 3.2 并行 Agent

- 默认只拥有：
  - 仓库代码只读或局部写入
  - 本地文件修改
  - 本地检索、诊断、构建
  - 受控联调所需的环境变量读取能力
- 默认不拥有：
  - `git push`
  - GitHub 仓库设置修改
  - GitHub Actions 修改
  - GitHub Secrets 管理
  - 生产环境访问
  - 真实第三方主密钥

### 3.3 文档 Agent

- 只需要：
  - 文档读取
  - 文档编辑
  - 结构索引更新
- 不需要：
  - 代码推送
  - 生产权限
  - Secrets 明文

## 4. GitHub 权限策略

### 4.1 仓库读取

- 第二个 Agent 可以读取仓库代码、文档和变更记录。
- 若采用 GitHub App 或机器人账号，至少要能读取：
  - 代码
  - Issues / PR（若你后续启用）
  - Actions 日志（只读）

### 4.2 仓库写入

- 默认不建议让第二个 Agent 直接推送 `main`。
- 推荐策略：
  - 主 Agent 执行 `git commit` 和 `git push`
  - 第二个 Agent 只输出补丁、修改结果或候选文件

### 4.3 分支与 PR

- 如果后续进入常态化多 Agent 开发，建议增加以下 GitHub 规则：
  - `main` 开启分支保护
  - 禁止普通机器人直接 push `main`
  - 通过 PR 或主 Agent 收口后再合并
  - 敏感目录可增加 CODEOWNERS

### 4.4 GitHub Actions

- 第二个 Agent 默认不应修改部署工作流、Secrets、环境保护规则。
- 若需要联调 CI，只允许：
  - 读取 Actions 执行日志
  - 提出 workflow 修改建议
- 最终 workflow 改动由主 Agent 或人工确认后提交。

## 5. Secrets 分类

### 5.1 一级 Secrets：禁止给并行 Agent 明文

- GitHub PAT
- SSH 私钥
- 生产服务器密码
- 生产数据库连接串
- 支付平台主密钥
- OSS 主密钥
- 飞书应用主密钥
- OpenAI / Anthropic / Gemini / OpenRouter 等正式环境主密钥

### 5.2 二级 Secrets：可受控注入，但不写入文档

- 本地开发 `.env` 中的测试 Key
- 测试环境 API Key
- 非生产对象存储凭据
- 本地代理或中间层 Token

### 5.3 三级配置：允许写文档，但不等于 Secrets

- 哪个服务需要哪些环境变量
- 环境变量名称
- 注入位置
- 配置用途
- 权限申请路径

## 6. Secrets 存放位置

### 6.1 允许的存放位置

- GitHub Secrets
- 云平台 Secret Manager
- 1Password / Bitwarden / 企业密码库
- 本地 `.env.local` / `.env`，但必须受 `.gitignore` 保护
- 服务器进程环境变量

### 6.2 禁止的存放位置

- 仓库中的 `docs/*.md`
- `AGENTS.md`
- `README.md`
- `docs/changes/*.md`
- 任意源码文件硬编码
- 测试数据种子
- 截图、日志、终端输出归档

## 7. Agent 接入时需要的最小信息

第二个 Agent 不需要真实密码正文，但需要知道：

- 当前仓库的主规则入口：
  - `AGENTS.md`
  - `docs/ai-multi-agent-collaboration-playbook.md`
  - `docs/engineering-standards.md`
  - `docs/README.md`
- 当前任务允许触碰的代码范围
- 当前任务禁止触碰的模块
- 需要什么验证方式
- 如果要联调，需要哪些环境变量名称
- 这些环境变量由谁负责注入

## 8. 推荐接入方式

### 8.1 本地开发接入

- 第二个 Agent 通过当前受控 IDE / Agent 环境接入本地工作区。
- 使用已存在的受控运行时环境变量。
- 不单独保留额外一份明文 Secrets 说明书。

### 8.2 远程仓库接入

- 第二个 Agent 如需访问 GitHub，优先使用只读 token 或 GitHub App 受限权限。
- 如果只是协助开发，不需要给它仓库管理权限。

### 8.3 生产环境接入

- 默认禁止第二个 Agent 直接操作生产。
- 如确需排障：
  - 由人工临时授权
  - 明确时间窗口
  - 明确操作范围
  - 完成后立即回收

## 9. 主 Agent 的权限管理职责

- 主 Agent 负责判断第二个 Agent 是否真的需要某项权限。
- 主 Agent 负责明确：
  - 这项权限用于什么任务
  - 是否存在更低风险替代方案
  - 是否可只给只读权限
  - 是否可通过人手动注入而不是长期开放
- 主 Agent 不能因为“方便”就默认请求全量权限。

## 10. 并行 Agent 的禁止事项

- 不得要求把真实密钥写进仓库文档。
- 不得把用户提供的密码、Token、API Key 回写到代码、docs 或提交信息中。
- 不得绕过主 Agent 直接扩大权限。
- 不得擅自推送远端或改 GitHub 配置。
- 不得把终端输出中的敏感值转述到普通交付文案里。

## 11. 敏感信息遮挡规则

- 交付说明中只写：
  - 是否已配置
  - 需要哪些变量
  - 是否缺失
  - 缺失会影响什么
- 不写：
  - 真实 Key
  - 完整 URL 中带 token 的查询串
  - 完整 Authorization Header
  - 私钥内容

## 12. 推荐权限配置

### 12.1 你 + 主 Agent + 第二个 Agent

- 你：
  - 持有最高决策权
  - 决定是否推送、是否授权高权限、是否允许部署
- 主 Agent：
  - 全局编排
  - 代码收口
  - 文档同步
  - Git 收口
- 第二个 Agent：
  - 并行检索
  - 低耦合子任务
  - review
  - 文档协助

### 12.2 推荐默认权限组合

- 第二个 Agent 默认拥有：
  - 仓库读取
  - 本地代码编辑
  - 本地构建验证
- 第二个 Agent 默认没有：
  - 推送权限
  - 生产权限
  - Secrets 明文

## 13. 接入第二个 Agent 的标准提示

```md
你是本项目的并行 Agent。

你开始前必须先读：
- `AGENTS.md`
- `docs/ai-multi-agent-collaboration-playbook.md`
- `docs/ai-agent-access-and-secrets-policy.md`
- `docs/engineering-standards.md`
- `docs/README.md`

你本轮只允许处理主 Agent 分配的子范围。
你没有默认推送权限。
你不能请求把真实密码、Token、API Key、私钥写入仓库文档。
如果当前任务需要联调环境变量，由主 Agent 或人工负责注入。
你完成后只返回：
- 改动文件
- 验证结果
- 风险
- 建议下一步
```

## 14. 后续建议

- 如果后续真的接入第二个 Agent，建议再补两项仓库级治理：
  - GitHub 分支保护与 CODEOWNERS
  - 一个“Agent 权限登记表”，记录谁能读、谁能写、谁能推、谁能读日志
- 如果将来接入生产排障 Agent，建议单独再建：
  - `docs/production-access-policy.md`
  - 只写流程与审批，不写明文凭据

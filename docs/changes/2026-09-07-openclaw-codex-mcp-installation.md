# 2026-09-07 OpenClaw 安装中心补入 Codex MCP 配置

## 背景

用户要求在 `个人中心 -> OpenClaw 安装中心` 里补充 `Codex` 的 MCP 配置入口，并同步更新 MCP / Skill 说明，避免用户还要自己根据官方文档手工拼 `config.toml`。

## 本次处理

1. 在 OpenClaw 安装中心后端导出的 `snippetTemplates` 中新增 `codex` 配置片段。
2. 在 OpenClaw 安装页前端新增 `Codex` 标签，直接展示可复制的 `config.toml` 片段。
3. 片段按 Codex 官方 `streamable HTTP` 口径输出：
   - `url`
   - `bearer_token_env_var = "OPENCLAW_INSTALL_TOKEN"`
   - `http_headers = { "x-brand-id" = "<brandId>" }`
4. 同步更新 OpenClaw 安装文档、Skill 包 README 与站点地图，明确：
   - `Codex CLI`
   - `ChatGPT Desktop`
   - IDE 扩展
   当前共用 `~/.codex/config.toml`

## 影响范围

- OpenClaw 安装中心现在除了 OpenClaw / WorkBuddy / Cursor / Claude Desktop 外，还能直接给出 Codex 的 MCP 安装片段。
- 本次只扩展安装说明与配置导出，不改 OpenClaw MCP 本身的权限、品牌头校验和工具能力。

## 验证重点

1. `apps/server` 构建通过，确认安装中心新字段没有打断后端类型与编译。
2. `apps/web` 构建通过，确认前端新增 `Codex` 标签后页面类型与渲染正常。
3. 复查安装页、OpenClaw 文档与 Skill 包说明，确保三处口径一致。

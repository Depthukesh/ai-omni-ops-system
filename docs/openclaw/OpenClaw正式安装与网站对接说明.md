# OpenClaw正式安装与网站对接说明

## 目标

把本地联调用的 `账号 + 密码 + stdio 脚本` 方式，升级成正式环境可交付的 `网站安装中心 + 品牌级安装令牌 + MCP HTTP 网关` 方式。

正式交付时，品牌用户不需要理解 MCP、Skill、CLI 差异，也不需要暴露网站登录密码。用户只需要在网站里完成登录，进入安装中心，复制一段配置，粘贴到 OpenClaw、WorkBuddy、Cursor 或 Claude Desktop 即可。

当前正式交付口径也需要明确：

- 现在真正需要安装的是网站 MCP
- 页面里的“品牌运营助手 Skill”目前是官方使用规范和示例，不是额外必须安装的执行包
- 后续如果要扩展更多网站能力，建议先补 MCP 工具，再按场景补正式 Skill，让 Skill 去编排调用这套网站能力

## 为什么不再用本地联调方式

本地联调脚本的价值只是验证：

- 网站能力层是否可调用
- MCP 工具定义是否正确
- OpenClaw 对话链路是否能跑通

它不适合正式环境，原因包括：

- 会暴露网站账号密码
- 会要求用户在本机运行脚本
- 很难做品牌级权限隔离
- 不利于后续审计、吊销、续期

## 正式安装方式

正式环境改成三层结构：

1. 网站安装中心生成品牌级安装令牌
2. OpenClaw 通过 MCP HTTP 地址连接网站
3. 网站 MCP 网关再转调现有 OpenClaw 能力层

对应用户体验：

1. 用户登录网站
2. 切到目标品牌
3. 打开 `个人中心 -> OpenClaw 安装`
4. 点击“生成正式安装令牌”
5. 复制 `OpenClaw`、`WorkBuddy`、`Cursor` 或 `Claude Desktop` 配置片段
6. 粘贴到对应客户端
7. 直接开始用自然语言操作品牌能力

## 当前正式落地点

### 网站页面

- `apps/web/src/app/(dashboard)/personal-center/openclaw/page.tsx`
- 页面内同时提供：
  - MCP 安装配置复制
  - 令牌状态查看
  - Skill 示例提问
  - 正式交付检查清单
  - 正式说明文档跳转

### 网站接口

- `GET /api/openclaw/installation-hub`
- `POST /api/openclaw/installation-hub/tokens/rotate`
- `DELETE /api/openclaw/installation-hub/tokens/:tokenId`
- `POST /api/openclaw/mcp`

### 服务端核心

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `apps/server/src/modules/openclaw/openclaw-installation.controller.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`

## 安全原则

### 1. 不暴露网站账号密码

OpenClaw 安装只使用品牌级安装令牌，不再使用网站手机号、邮箱或密码。

### 2. 令牌绑定品牌

安装令牌绑定当前品牌，并在请求头里带上 `x-brand-id`，避免跨品牌误用。

### 3. 令牌绑定生成者权限

安装令牌的实际执行权限复用网站当前账号的品牌权限。如果生成者后续被移出品牌或失去权限，相关能力会自动失效。

### 4. 令牌可重置、可吊销、可过期

当前正式实现采用“品牌单活令牌”策略：

- 重新生成时，旧令牌自动失效
- 可以在网站里直接停用当前令牌
- 默认有效期 30 天

### 5. 支持审计

令牌记录保存：

- 令牌预览
- 最近使用时间
- 过期时间
- 更新时间

后续可继续扩展成完整调用审计。

## MCP 安装片段

OpenClaw 正式配置示例：

```json
{
  "mcp": {
    "servers": {
      "ai-omni-ops-品牌名": {
        "enabled": true,
        "url": "https://你的域名/api/openclaw/mcp",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer ocp_xxx",
          "x-brand-id": "br_xxx"
        }
      }
    }
  }
}
```

WorkBuddy 正式配置示例：

```json
{
  "mcpServers": {
    "ai-omni-ops-品牌名": {
      "url": "https://你的域名/api/openclaw/mcp",
      "headers": {
        "Authorization": "Bearer ocp_xxx",
        "x-brand-id": "br_xxx"
      },
      "type": "streamableHttp",
      "timeout": 600000
    }
  }
}
```

## Skill 使用方式

Skill 不再要求用户自己写复杂 prompt。网站安装中心会同时给出品牌运营助手的使用提示，用户常见提问包括：

- 帮我看当前品牌最近的增长报告重点
- 帮我创建一个品牌知识库，并把这份资料加入进去
- 帮我看最近 30 天失败任务主要卡在哪些问题上
- 围绕这个品牌生成一份半年营销规划

## MCP 与 Skill 的关系

### 当前阶段

- 当前正式可交付的是 MCP 安装链路
- 用户安装 MCP 后，已经可以直接调用网站暴露的品牌能力
- 页面里的 Skill 区块主要用于说明“品牌运营助手应该如何理解任务、如何编排调用 MCP”

### 后续扩展方式

如果后面要增加更多“网站里的技能”，建议采用统一路径：

1. 先把网站能力沉淀成新的 MCP tool
2. 再为高频场景编写正式 Skill
3. 让正式 Skill 优先调用 `ai-omni-ops` MCP，而不是绕开网站能力层

### 与第三方相似 Skill 的冲突

如果用户自己又安装了一个和网站能力很像的 Skill，比如都能做“小红书原创笔记”，OpenClaw 不一定天然优先调用我们这一方。默认会结合以下信息做路由判断：

- 当前会话上下文
- Skill 自身描述
- MCP tool 描述
- 模型对任务匹配的判断

所以正式场景建议遵守三条原则：

- 官方核心执行能力统一走网站 MCP
- 官方 Skill 明确写成“优先调用 ai-omni-ops MCP”
- 安装中心明确提示“安装相似第三方 Skill 时，可能出现能力重叠”

## 当前测试方式

从这一步开始，以网站正式链路为主，不再以本地脚本安装为交付方式。

测试重点应转成：

1. 网站页面是否能正常生成安装令牌
2. 页面复制出的配置是否正确
3. `POST /api/openclaw/mcp` 是否能用 Bearer 令牌完成 `initialize / tools/list / tools/call`
4. OpenClaw 实际挂载后是否能在对话里调用品牌能力

## 最新验证结论

截至 2026-06-11，当前验证结果如下：

- 服务端正式链路已验证通过：`installation-hub`、令牌轮换、`POST /api/openclaw/mcp` 的 `initialize / tools/list / tools/call` 已跑通
- 网站安装页代码已落地：`apps/web/src/app/(dashboard)/personal-center/openclaw/page.tsx`
- 线上站点 `https://17ai.site/personal-center/openclaw` 已可访问，正式安装页和令牌生成链路可用
- 当前开发机本地 `Next build` 仍被 `@next/swc-win32-x64-msvc` DLL 初始化失败阻塞，因此没法在这台机器上完成本地生产预览页验证

这意味着：

- 后端正式安装能力已经具备
- 前端页面代码已经完成
- 当前待完成事项主要是前端页面部署与部署后的页面回归验证，而不是 OpenClaw 能力层本身

## 上线前最小检查清单

为了把这套能力真正交付给品牌用户，建议上线前至少完成以下检查：

1. 将最新前端代码部署到正式网站，确认 `个人中心 -> OpenClaw 安装` 可访问
2. 进入安装页后验证“生成正式安装令牌 / 停用当前令牌 / 复制配置”三项操作
3. 校验安装页里的文档链接能打开：
   - `OpenClaw正式安装与网站对接说明.html`
   - `品牌运营助手Skill示例SKILL.html`
4. 使用页面生成的正式令牌，在真实 OpenClaw 或 WorkBuddy 客户端完成一次 MCP 挂载
5. 在 OpenClaw 对话里至少验证一次：
   - 获取当前品牌上下文
   - 查看最近任务摘要
   - 查看最近品牌增长报告摘要
   - 创建知识库或生成规划类内容
6. 验证令牌重置后，旧配置立即失效，避免品牌成员继续误用旧令牌

## 后续建议

- 增加调用日志表，记录工具名、品牌、调用耗时、结果状态
- 持续补充多客户端安装模板，例如 WorkBuddy / Claude / Cursor / VS Code
- 增加安装向导页，把 Skill 与 MCP 合并成“一键安装说明”

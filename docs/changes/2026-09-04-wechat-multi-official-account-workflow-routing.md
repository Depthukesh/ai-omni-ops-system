# 2026-09-04 公众号多账号配置与工作流路由

## 背景

- 用户要求把 `内容获客 -> 公众号 -> 配置初始化` 从单公众号配置升级为多公众号管理。
- 同时要求 `创作工作流` 在创建和编辑时都能选择具体公众号，并确保后续发布确认与正式发布都按所选公众号走对应凭证。
- `发布历史` 还需要显式标注所属公众号，方便同品牌下区分多账号发稿记录。

## 本次改动

### 1. 配置初始化支持多公众号账号

- 新增公众号账号 CRUD：
  - 创建公众号
  - 编辑公众号
  - 删除公众号
  - 切换默认公众号
- 每个公众号账号独立维护：
  - 账号名称
  - AppID
  - AppSecret
  - IP 白名单
  - 默认账号状态
- 默认公众号切换后，会同步兼容配置与工作流偏好里的默认账号，避免旧链路与新账号真源脱节。

### 2. 工作流按所选公众号走发布链路

- 创建工作流时支持传入 `accountId`。
- 编辑工作流 Step 1 输入时也支持重新切换 `accountId`。
- 服务端会把 `accountId / accountName` 写入工作流主记录。
- 发布确认与正式发布不再只读取全局单套公众号配置，而是：
  - 先读取工作流绑定账号
  - 再按该账号的 AppID / AppSecret / IP 白名单计算发布检查项
  - 最终按该账号凭证调用公众号发布接口

### 3. 发布历史标注所属公众号

- 发布历史记录会回写 `accountId / accountName`。
- 前端发布历史卡片左上角和卡片正文信息区都会显示公众号名称。
- OpenClaw / MCP 读取发布历史时，也会一并返回账号名称，方便外部协作和排查。

## 影响范围

- 页面：
  - `内容获客 -> 公众号 -> 配置初始化`
  - `内容获客 -> 公众号 -> 创作工作流`
  - `内容获客 -> 公众号 -> 发布历史`
- 服务端：
  - 公众号账号 CRUD
  - 工作流账号绑定
  - 发布确认与正式发布凭证选择
- OpenClaw：
  - `get_wechat_official_accounts`
  - `get_wechat_workflow_sessions`
  - `get_wechat_publish_history`
  - `manage_wechat_workflow`

## 风险控制

- 保留 `WechatAccountConfig` 兼容层，不直接拆掉旧配置入口，减少对历史链路的冲击。
- 删除公众号前会检查是否仍被工作流引用，避免删除后导致既有工作流失联。
- 默认公众号变更时同步刷新偏好默认账号，避免“默认配置”和“默认账号”不一致。

## 验证

- `npm run build:web`
- `npm run build:server`

## 参考文件

- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
- `apps/web/src/services/works.ts`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`
- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`

# 2026-05-05 小红书草稿发布基础

## 背景
- 用户要求在 `原创笔记` 和 `二创笔记` 增加 `一键发布`，并先收口为 `一键保存到小红书草稿箱`，不做自动正式发布。
- 同时要求除了浏览器保存草稿之外，还要增加 `手机扫码接力保存草稿`。

## 本次目标
- 先补站内发布域，并优先落地 `电脑端一键发布到草稿箱`。
- 在电脑端未安装扩展或不方便操作时，再回退到 `手机扫码接力保存草稿`。
- 复用现有作品域与任务体系，为后续浏览器扩展直存草稿预留统一发布数据结构。

## 关键实现
- 新增 `PublishingModule`，提供：
  - 创建小红书电脑端自动发布会话
  - 查询电脑端发布会话
  - 标记电脑端发布完成
  - 创建小红书手机扫码接力会话
  - 查询接力会话
  - 标记接力完成
- 发布任务先复用 `Task.inputJson/outputJson` 承载会话数据，不新增 Prisma 表，降低 MVP 改动面。
- `WorksService` 新增可发布作品读取能力，统一把原创/二创作品映射成发布 payload。
- `TasksService` 向前端补出 `inputJson/outputJson`，让页面能够把发布任务与具体作品关联起来。
- `xiaohongshu/page.tsx` 新增：
  - 原创/二创卡片 `一键发布`
  - 电脑端一键发布按钮与扩展握手
  - 原创/二创发布状态卡
  - 发布弹窗
  - 手机扫码接力二维码展示
  - 手动标记“我已在手机完成保存”
- 新增移动端承接页 `publish/mobile/[token]`，手机扫码后可查看标题、正文、图片素材与接力说明。
- 移动端承接页新增 `一键保存到草稿箱` 交互：
  - 优先调用手机系统分享，尝试把标题、正文与配图一起交给小红书
  - 当前浏览器不支持文件分享时，退化为复制文案并拉起小红书 App
  - 保留单独的“复制标题和正文”“仅打开小红书”备用动作
- 手机端继续收口为“最强半自动”：
  - 新增“复制文案并打开小红书”一键动作
  - 补充手机端最佳操作顺序提示
  - 每张配图增加“查看原图”入口，方便长按保存到相册
- 新增浏览器扩展目录 `apps/web/public/extensions/xhs-draft-publisher`：
  - 后台脚本负责打开小红书创作者中心
  - 内容脚本负责自动上传图片、填写标题和正文，并点击保存草稿

## 配套调整
- 新增前端 `publishing.ts` 服务层。
- `apps/web` 安装 `qrcode` 与 `@types/qrcode` 用于前端本地生成二维码。
- `dev-web-stable.cjs` 改为 `0.0.0.0` 监听，支持同局域网手机访问接力页。
- 收尾修正 `PublishingService` 的账号字段映射，去掉不存在的 `username` 访问，确保 `3011` 可以重新构建并启动。
- 桌面发布任务新增 `XHS_PUBLISH_DESKTOP_DRAFT`，并把状态文案切到“电脑端一键发布优先、手机扫码接力备用”。

## 验证结果
- `apps/server` 已通过 `npm run build`。
- `apps/web` 已通过 `npm run build`。
- 受管脚本已重新拉起：
  - `3001` 前端预览
  - `3011` 后端服务
- 已实测接口：
  - `/api/health`
  - `/api/works/brands/br_demo_001/xiaohongshu/original`
  - `/api/works/brands/br_demo_001/xiaohongshu/rewrite`
  - `/api/publishing/brands/br_demo_001/xiaohongshu/works/:workId/desktop-draft-session`
  - `/api/publishing/brands/br_demo_001/xiaohongshu/works/:workId/mobile-draft-session`
- 已实测手机承接页返回 `200`，确认 `/publish/mobile/[token]` 可打开。

## 方案边界
- 当前主链路已切到 `浏览器扩展复用本地登录态 -> 自动保存到草稿箱`。
- `手机扫码接力保存草稿` 仍保留为备用方案。
- 手机端当前通过 H5 触发系统分享与 App 拉起，尽量收口为“一键接力”；是否能在系统分享面板中直接进入小红书图文草稿，仍取决于手机浏览器与小红书 App 的支持程度。
- 手机端进入小红书 App 后，网页无法继续像电脑扩展一样自动控制 App 内界面；当前产品边界是“拉起 App + 文案复制 + 图片保存辅助”的最强半自动方案。

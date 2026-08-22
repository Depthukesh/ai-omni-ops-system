# 2026-08-22 视频混剪归档目标扩展与 mixedcut 项目列表放开

## 背景

在 mixedcut 成片自动回流站内作品列表后，用户继续提出两个体验问题：

1. mixedcut 页面底部最近项目不应只显示少量项目
2. mixedcut 成片不应让前台用户再区分 `某音` 和 `某号`，而应直接同步到同一个 `内容获客 -> 某音/某号 -> 作品列表`

本次目标不是重做 mixedcut 整体产品层，而是在现有主链上补齐两个最小但真实可用的收口：

- 放开 mixedcut 前端模板里的项目数前端截断
- 让主站视频混剪工作区默认把成片回流到统一的 `某音/某号作品列表`

## 本次改动

### 1. 主站视频混剪工作区默认回流到某音/某号统一作品列表

文件：

- `apps/web/src/app/(dashboard)/douyin/video-remix-workspace.tsx`
- `apps/web/src/services/personal-center.ts`
- `apps/server/src/modules/third-party-platforms/third-party-platforms.controller.ts`

新增能力：

- 在 `内容获客 -> 某音/某号 -> 视频混剪` 工作区中，mixedcut 成片默认自动回流到同一个 `某音/某号作品列表`
- 创建 mixedcut 任务时仍走 `douyin` scope，因为当前这个作品池本身就同时承载抖音与视频号发布链
- 查询 mixedcut 任务进度时，也按同一 `workspaceScope` 触发自动归档
- 任务完成后，页面会明确提示当前成片已同步到 `某音/某号作品列表`

这里不再让用户前台区分 `某音` 和 `某号`，避免把视频号和公众号板块混淆。

### 2. mixedcut 页面最近项目不再前端限制 5 条或 20 条

文件：

- `workspace-notes/mixedcut_integration_bundle/frontend/templates/remix.html`

收口内容：

- “最近 5 个项目”文案已改为动态总数
- 最近项目面板请求从：
  - `/api/projects?type=remix&limit=5...`
  改为：
  - `/api/projects?type=remix...`
- 页面内“加载混剪项目素材”的另一路请求，也从：
  - `/api/projects?type=remix&limit=20...`
  改为：
  - `/api/projects?type=remix...`

这样 mixedcut 前端不会再额外做 5 条 / 20 条的前端截断，实际显示数量交由后端返回结果决定。

## 影响范围

- `内容获客 -> 某音/某号 -> 视频混剪`
- `内容获客 -> 某音/某号 -> 作品列表`
- mixedcut `/remix` 页面底部最近项目区

## 当前边界

- 当前 mixedcut 成片默认归档到 `douyin` scope，对应前台统一展示的 `某音/某号作品列表`
- 公众号板块仍保持独立，不混入该列表
- mixedcut 页面虽然已移除前端数量截断，但最终能显示多少仍取决于 `/api/projects` 的真实返回量与页面承载能力

## 验证

- 静态复核前后端 `workspaceScope` 已贯通：
  - 创建任务
  - 查询进度
  - 自动归档到 `OpenClawVideoWork`
- 静态复核 mixedcut 模板里原先两处 `limit=5 / limit=20` 已去掉

说明：

- 本次尚未在这条变更记录内补新的整站 build 与容器重建结果
- 若要让当前运行中的 Docker / mixedcut 实例立即生效，仍需重建对应服务

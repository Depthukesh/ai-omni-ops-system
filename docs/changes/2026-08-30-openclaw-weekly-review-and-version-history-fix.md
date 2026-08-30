# 2026-08-30 OpenClaw 每周复盘编辑链路与版本历史修复

## 1. 变更背景

- 内容获客三个板块里的 OpenClaw 复盘入口仍然显示为“每日复盘”，且查看弹窗只能只读查看和删除。
- 用户希望复盘记录在点击查看后可以直接修改，同时继续保留底部留言区。
- 个人中心 `版本与升级` 页当前版本号一直停在 `0.1.0`，仓库回退模式下的历史更新记录也会被错误地展示成同一个版本号，难以判断每次真实变更。

## 2. 变更目标

- 把内容获客与品牌增长相关的 OpenClaw 复盘统一改成“每周复盘”。
- 让每周复盘详情支持直接编辑并保存，同时保留留言协作。
- 修复标准运行态版本页的版本号与更新记录展示。
- 同步 OpenClaw MCP / Skill 文档与工具列表。

## 3. 修改内容

### 3.1 前端

- 内容获客工作台三组导航把 `每日复盘` 统一改成 `每周复盘`。
- 某书、某音/某号、公众号、品牌增长四个工作区的 OpenClaw 复盘说明文案同步更新。
- `OpenClawLobsterDiaryWorkspace` 从只读弹窗改成可编辑详情弹窗：
  - 支持直接修改日期、标题、正文
  - 保留原有留言区
  - 保存后刷新工作区数据并回写最新内容

### 3.2 后端

- OpenClaw 龙虾日记新增更新能力：
  - 站内接口新增 `PATCH /openclaw/brands/:brandId/lobster-diaries/:diaryId`
  - 服务层新增 `updateDiary`
- OpenClaw MCP 新增：
  - `update_openclaw_lobster_diary`
- OpenClaw 工具描述与安装中心说明把“每日复盘”调整为“每周复盘”，并明确现在支持更新。

### 3.3 数据与配置

- 根包与工作区包版本统一从 `0.1.0` 提升到 `0.1.1`。
- 标准运行态版本页回退模式不再把所有 `docs/changes` 记录都强行标成当前版本号。
- 版本页现在会优先从单条变更文档正文里提取 `appVersion / version / 版本号`，提取不到时回退展示变更标题。

## 4. 修改意图

- 这次优先选择在现有龙虾日记链路上补“更新”能力，而不是重做一套新实体，影响范围更小，也不会破坏既有 OpenClaw 创建链。
- 每周复盘继续沿用现有 `lobster_diary` 数据表和评论线程，保证旧数据、旧工具名和历史记录仍然兼容。
- 版本页保持现有 UI，不额外扩展发布系统，只修正版本来源和历史日志映射，便于当前标准运行态继续低成本使用。

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
  - `/douyin`
  - `/wechat`
  - `/brand-growth`
  - `/personal-center/version`
- 影响接口：
  - `PATCH /openclaw/brands/:brandId/lobster-diaries/:diaryId`
  - `update_openclaw_lobster_diary`
- 影响模块：
  - OpenClaw 龙虾日记工作区
  - OpenClaw 安装中心 / Skill 包说明
  - 标准运行态版本回退展示
- 不影响已有数据结构，旧的龙虾日记记录会继续沿用原表原 ID。

## 6. 验证方式

- 前端构建：待执行
- 后端构建：待执行
- 手工校验点：
  - 内容获客三个板块与品牌增长页复盘入口显示为“每周复盘”
  - 点击查看后可直接编辑并保存
  - 留言区仍可正常提交
  - 版本页当前版本显示 `0.1.1`
  - 版本历史不再全部显示同一个版本号

## 7. 风险与后续

- 旧工具名 `lobster_diary` 继续保留，是为了兼容既有 OpenClaw / MCP 调用；后续如果要彻底改名，需统一迁移文档与外部依赖。
- 当前版本页对历史文档的版本提取依赖正文中的显式版本文本；旧变更文档若没有写版本号，页面会回退显示变更标题而不是伪造版本号。

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/content-acquisition-workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/openclaw-lobster-diary-workspace.tsx`
- `apps/server/src/modules/openclaw/openclaw-lobster-diary.controller.ts`
- `apps/server/src/modules/openclaw/openclaw-lobster-diary.service.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/system-update/system-update.service.ts`
- `apps/web/src/services/openclaw.ts`
- `package.json`

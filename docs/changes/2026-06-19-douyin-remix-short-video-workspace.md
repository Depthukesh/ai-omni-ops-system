# 2026-06-19 抖音独立复刻短视频工作台

## 1. 变更背景

- 原有抖音“AI 生视频（故事板）”里的 `REMIX` 只是旧分支，不适合承载完整的短视频复刻流程。
- 业务现在要求把“复刻短视频”从二创文案下方独立出来，成为一个单独板块，并按源视频时长自动切成多个 15 秒工作段。
- 每段不仅要出文字拆解，还要出角色卡图片、分镜图和一致性质检结果，之后再进入第二阶段逐段生视频并拼接成片。

## 2. 变更目标

- 在抖音工作台新增独立的 `复刻短视频` 板块，与 `AI 生视频（故事板）` 同级。
- 创建任务后，先完成第一阶段的复刻分析工作区输出：
  - 视频分析报告
  - 角色卡文字版
  - 分镜脚本
  - 角色卡图片版
  - 分镜图
  - 一致性质检结果
- 点击“一键生成视频”后，进入第二阶段：
  - 将每段分镜图和分段提示词送入选定视频模型
  - 生成各段短视频
  - 使用 `ffmpeg` 自动拼接完整视频
- 补齐技能、提示词、技能中心和文档口径。

## 3. 修改内容

### 3.1 前端

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 在抖音工作台新增独立 section：`remixShortVideo`
  - 新增独立权限键：`douyin.remixShortVideo`
  - 接入复刻短视频列表读取、创建任务和继续生成视频的刷新链路
- `apps/web/src/app/(dashboard)/douyin/remix-short-video-workspace.tsx`
  - 新增独立工作区组件
  - 创建弹窗字段包括：
    - 素材库短视频链接
    - 是否植入品牌资料
    - 产品资料
    - 是否植入营销策划方案
    - 上传短视频
    - 上传产品图/参考图
    - 选择视频大模型
    - 选择生图大模型
    - 用户要求
  - 任务详情区按每 15 秒一段显示多个板块，每段展示六类复刻产物，并在第二阶段显示分段视频和完整视频
- `apps/web/src/services/works.ts`
  - 新增复刻短视频工作记录类型、分段记录类型和两个接口：
    - `generateDouyinRemixShortVideoWork(...)`
    - `continueDouyinRemixShortVideoGeneration(...)`

### 3.2 后端

- `apps/server/src/modules/works/works.controller.ts`
  - 新增接口：
    - `GET /works/brands/:brandId/douyin/remix-short-video`
    - `POST /works/brands/:brandId/douyin/remix-short-video/generate`
    - `POST /works/brands/:brandId/douyin/remix-short-video/:workId/video/generate`
- `apps/server/src/modules/works/works.service.ts`
  - 新增独立 `VideoWorkKind`：`DOUYIN_REMIX_SHORT_VIDEO`
  - 第一阶段新增独立生成入口：
    - 解析用户上传短视频或素材库链接
    - 可选植入品牌资料、产品资料、营销策划方案
    - 调用复刻分析技能，按每 15 秒切段返回结构化 JSON
    - 按段生成角色图和分镜图
    - 将每段结果写入 `metadataJson.remixSegments`
  - 第二阶段新增独立继续生成入口：
    - 为每段生成图生视频提示词
    - 逐段生成短视频
    - 用 `ffmpeg concat` 自动拼接完整视频
    - 回写分段视频 URL、完整视频 URL 和资产 ID
  - 新增 `ffprobe` 时长探测能力，优先读取上传视频或源链接视频总时长

### 3.3 技能与提示词

- 复用外部规格：`技能/复刻视频/SKILL.md`
- 第一阶段技能：
  - `douyin-remix-short-video-studio`
  - 提示词：`prompt_douyin_remix_short_video`
- 第二阶段技能：
  - `douyin-remix-short-video-compose`
  - 提示词：`prompt_douyin_remix_short_video_compose`
- 模型口径调整：
  - 把规格中的 `gemini` 替换为 `kimi-k2.6`
  - 把原文档中“每 10 秒一段”改为当前实现的“每 15 秒一段”

### 3.4 权限与技能中心

- `packages/shared/src/brand-permissions.ts`
  - 新增权限键：`douyin.remixShortVideo`
- `apps/web/src/services/brand-growth.ts`
  - 同步新增前端权限类型
- `apps/server/src/common/prompt-source-loader.ts`
  - 新增两个提示词来源注册
- `apps/server/src/modules/admin/skills-prompts.service.ts`
  - 新增两个技能与提示词绑定关系
- `apps/web/src/services/admin.ts`
  - 新增两个技能种子、两个提示词种子和能力包绑定种子
- `packages/shared/src/skill-center-manifest.ts`
  - 技能中心新增“复刻短视频”分组，展示复刻分析与拼接成片两个节点

## 4. 修改意图

- 把复刻短视频从旧的 `REMIX` 分支拆成独立工作流，是为了避免继续和故事板视频共用旧状态机，降低后续维护复杂度。
- 第一阶段使用结构化 JSON 承接，是为了让每个 15 秒板块都能稳定拿到六类结果，而不是依赖自由文本再二次拆解。
- 第二阶段先逐段生成、再拼接完整视频，是因为用户需要同时拿到单段结果和完整成片。
- 继续沿用 `metadataJson` 持久化复刻分段，是为了与现有视频工作流的作品中心存储方式保持一致，不额外引入新表。

## 5. 影响范围

- 影响页面：
  - `/douyin`
- 影响板块：
  - 抖音工作台 `复刻短视频`
- 影响接口：
  - `GET /works/brands/:brandId/douyin/remix-short-video`
  - `POST /works/brands/:brandId/douyin/remix-short-video/generate`
  - `POST /works/brands/:brandId/douyin/remix-short-video/:workId/video/generate`
- 影响权限：
  - `douyin.remixShortVideo`
- 影响技能：
  - `douyin-remix-short-video-studio`
  - `douyin-remix-short-video-compose`
- 影响数据：
  - `MediaAsset.metadataJson` 新增复刻短视频相关字段，如：
    - `sourceVideoUrl`
    - `sourceDurationSec`
    - `segmentDurationSec`
    - `remixSegments`
    - `composeStatus`
    - `mergedVideoUrl`

## 6. 验证方式

- 编辑器诊断：
  - `GetDiagnostics`
- 编译验证：
  - `pnpm build:server`
  - `pnpm build:web`
- 手工验证建议：
  - 在抖音工作台打开“复刻短视频”，确认能正常创建任务和显示独立工作区
  - 用 45 秒素材验证会被切成 3 段，每段都能看到六类产物
  - 点击“一键生成视频”后确认每段视频单独可预览，且最终完整视频可预览

## 7. 风险与后续

- 当前完整拼接依赖服务端存在 `ffmpeg` 和 `ffprobe`，如果部署机缺少二进制，第二阶段会失败。
- 当前第一阶段的“源视频内容理解”主要依赖输入的短视频链接、上传文件和提示词结构化输出，后续可再补更强的视频直读分析能力。
- 当前文档来源仍指向 `技能/复刻视频/SKILL.md`，如果外部规格继续演进，需要同步确认 15 秒分段与 `kimi-k2.6` 口径是否仍保持一致。

## 8. 相关文件

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/douyin/remix-short-video-workspace.tsx`
- `apps/web/src/services/works.ts`
- `apps/web/src/services/admin.ts`
- `apps/web/src/services/brand-growth.ts`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/common/prompt-source-loader.ts`
- `apps/server/src/modules/admin/skills-prompts.service.ts`
- `packages/shared/src/brand-permissions.ts`
- `packages/shared/src/skill-center-manifest.ts`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`

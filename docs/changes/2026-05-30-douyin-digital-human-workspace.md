# 2026-05-30 抖音数字人工作台与蝉镜 OpenAPI 首版接入

## 背景

- 抖音工作台已经有营销策划方案、原创文案、二创文案、AI生视频（故事板）和 AI生视频，但还缺少独立的“数字人”板块。
- 本轮目标是先落一个可闭环的 V1：公共模板库、数字人视频创建、作品列表、结果找回、技能中心注册和第三方平台凭证入口。
- 现有第三方平台私钥结构只有一个 `apiKey` 字段，无法直接拆成蝉镜的 `app_id / secret_key / access_token` 三段式配置。

## 本次调整

### 1. 抖音工作台新增数字人一级板块

- `packages/shared/src/brand-permissions.ts`
  - 新增权限键 `douyin.digitalHuman`
  - 把数字人加入抖音权限树，并给 `STAFF / TALENT` 默认补齐 `view/edit`
- `apps/web/src/services/brand-growth.ts`
  - 同步前端权限类型，允许工作台和团队权限页识别 `douyin.digitalHuman`
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 新增 `digitalHuman` 一级 section
  - 聚合加载数字人模板标签、模板列表和作品列表
  - 接入自动轮询、结果刷新、媒体预览、创建/删除/找回动作
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 新增数字人工作区组件
  - 首版提供模板筛选、模板选择、形象类型切换、脚本输入、字幕/画布参数、作品中心和结果找回入口

### 2. 后端接通蝉镜 OpenAPI 与 works 作品闭环

- `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - 新增蝉镜 OpenAPI client
  - 接入 AccessToken 获取与缓存、公共模板标签、公共数字人模板、数字人视频创建和视频详情查询
- `apps/server/src/modules/works/works.service.ts`
  - 新增数字人模板与作品列表接口
  - 新增数字人视频创建、轮询刷新、结果找回、删除能力
  - 新增 `DOUYIN_DIGITAL_HUMAN_VIDEO` 元数据映射和 HTML 作品壳
  - 继续复用 `Task + MediaAsset + OSS 缓存 + recover` 模式，不新增独立持久化体系
- `apps/server/src/modules/works/works.controller.ts`
  - 新增：
    - `GET /works/brands/:brandId/douyin/digital-human/template-tags`
    - `GET /works/brands/:brandId/douyin/digital-human/templates`
    - `GET /works/brands/:brandId/douyin/digital-human/video`
    - `POST /works/brands/:brandId/douyin/digital-human/video/generate`
    - `POST /works/brands/:brandId/douyin/digital-human/video/recover`
    - `DELETE /works/brands/:brandId/douyin/digital-human/video/:workId`

### 3. 技能中心与提示词注册数字人口播脚本

- `提示词/抖音板块/数字人口播脚本.txt`
  - 新增数字人口播脚本真源提示词文件
- `apps/server/src/common/prompt-source-loader.ts`
  - 新增 `prompt_douyin_digital_human_script` 文件映射
- `apps/server/src/common/mock-data.ts`
  - 新增 fallback skill/prompt：
    - `skill_douyin_digital_human_script`
    - `prompt_douyin_digital_human_script`
- `apps/server/src/modules/admin/skills-prompts.service.ts`
  - 把 `douyin-digital-human-script-studio` 绑定到数字人口播脚本 prompt
- `apps/web/src/services/admin.ts`
  - 同步前端 fallback skill/prompt
- `apps/web/src/app/(dashboard)/skill-center-config.ts`
  - 在抖音区新增“数字人 -> 数字人-口播脚本”叶子项

### 4. 第三方平台新增蝉镜凭证入口

- `apps/server/src/common/third-party-platform-catalog.ts`
  - 新增 `蝉镜 OpenAPI` 平台种子
  - 备注明确当前凭证填写格式为 `appId::secretKey`
- 运行时兼容策略：
  - 继续复用现有 `apiKey` 单字段
  - 后端在调用蝉镜前再拆分为 `app_id` 和 `secret_key`
  - `access_token` 由 `ChanjingOpenApiService` 按需获取并缓存

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/app/(dashboard)/skill-center-config.ts`
  - `apps/web/src/services/admin.ts`
  - `apps/web/src/services/brand-growth.ts`
- 后端：
  - `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/works/works.module.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/common/third-party-platform-catalog.ts`
- 共享与提示词：
  - `packages/shared/src/brand-permissions.ts`
  - `提示词/抖音板块/数字人口播脚本.txt`
- 文档：
  - `README.md`
  - `docs/README.md`
  - `docs/site-map.md`
  - 本次新增变更记录

## 验证

- `GetDiagnostics` 检查：
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
- 后续应继续执行：
  - `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
  - `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`

## 后续关注

- 当前数字人模板接口先返回整批模板，V1 在前端做标签筛选；如果模板数量继续增长，建议把 tag/page/size 查询参数补到 controller 和前端 service。
- 当前个人中心第三方平台仍是单输入框，蝉镜凭证暂按 `appId::secretKey` 兼容；后续如果同类平台继续增加，建议把私钥模型升级成多字段结构。
- 当前数字人 V1 只覆盖公共模板库和数字人视频，定制数字人、口型驱动、背景图上传和更细的字幕布局仍留在下一轮。

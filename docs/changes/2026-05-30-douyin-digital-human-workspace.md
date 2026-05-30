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
  - 后续补充模板标签切换后的服务端筛选和模板分页增量加载，避免模板列表扩大后一次拉全量
  - 作品详情区补充手动输入蝉镜任务 ID 的找回入口，便于在已知任务号但本地记录未及时回填时补拉最终视频
  - 模板区补充关键词搜索、音色试听和形象预览视频，提升数字人模板挑选效率
  - 脚本编辑区补充快捷模板按钮，作品中心补充关键词搜索和状态筛选，方便高频运营场景快速复用与排查
  - 模板区补充“收藏模板”和“最近使用”，其中收藏已切服务端持久化，最近使用继续保留前端本地缓存
  - 脚本编辑区补充一键复制和导出 txt，作品中心补充“只看失败 / 只看已完成 / 只看生成中”等快捷筛选按钮
  - 作品中心继续补充“只看待找回”快捷筛选和失败作品一键重试，复用现有创建动作快速补单
  - 作品详情区补充“回填到创建区”，可把当前作品脚本和主要参数回填到编辑区继续修改
  - 脚本编辑区补充“保存为个人模板 / 套用模板 / 删除模板”，当前已切服务端持久化保存常用脚本
  - 个人脚本模板区继续补充“重命名模板 / 用当前脚本覆盖”，形成增删改查完整闭环
  - 个人脚本模板区继续补充“模板搜索 / 排序 / 另存为副本 / 已选模板摘要预览”，解决模板增多后下拉框难管理的问题
  - 创建区补充“参数差异提示”，可对比当前编辑参数与选中作品的差异，减少重复提交流程中的遗漏

### 2. 后端接通蝉镜 OpenAPI 与 works 作品闭环

- `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - 新增蝉镜 OpenAPI client
  - 接入 AccessToken 获取与缓存、公共模板标签、公共数字人模板、数字人视频创建和视频详情查询
- `apps/server/src/modules/works/works.service.ts`
  - 新增数字人模板与作品列表接口
  - 新增数字人视频创建、轮询刷新、结果找回、删除能力
  - 新增数字人模板收藏、个人脚本模板的服务端持久化读写接口，并为未迁移数据库场景保留内存兜底
  - 新增 `DOUYIN_DIGITAL_HUMAN_VIDEO` 元数据映射和 HTML 作品壳
  - 继续复用 `Task + MediaAsset + OSS 缓存 + recover` 模式，不新增独立持久化体系
- `apps/server/src/modules/works/works.controller.ts`
  - 新增：
    - `GET /works/brands/:brandId/douyin/digital-human/template-tags`
    - `GET /works/brands/:brandId/douyin/digital-human/templates`
    - `GET /works/brands/:brandId/douyin/digital-human/video`
    - `GET /works/brands/:brandId/douyin/digital-human/favorites`
    - `POST /works/brands/:brandId/douyin/digital-human/favorites`
    - `DELETE /works/brands/:brandId/douyin/digital-human/favorites/:templateId`
    - `GET /works/brands/:brandId/douyin/digital-human/script-templates`
    - `POST /works/brands/:brandId/douyin/digital-human/script-templates`
    - `PATCH /works/brands/:brandId/douyin/digital-human/script-templates/:templateId`
    - `DELETE /works/brands/:brandId/douyin/digital-human/script-templates/:templateId`
    - `POST /works/brands/:brandId/douyin/digital-human/video/generate`
    - `POST /works/brands/:brandId/douyin/digital-human/video/recover`
    - `DELETE /works/brands/:brandId/douyin/digital-human/video/:workId`
- `prisma/schema.prisma`
  - 新增：
    - `DigitalHumanFavoriteTemplate`
    - `DigitalHumanScriptTemplate`
- `prisma/migrations/20260530_digital_human_user_templates/migration.sql`
  - 新增数字人模板收藏和个人脚本模板的数据表迁移

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
- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
  - 当选中蝉镜平台时，输入框标题、占位文案和说明会明确提示按 `appId::secretKey` 形式填写
  - 页面会说明 `access_token` 由系统自动换取，无需手填，减少配置误解

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

- 当前数字人模板接口已经支持 `tag/page/size` 查询；模板收藏与个人脚本模板已切服务端持久化，最近使用继续保留前端本地缓存，下一步建议继续补团队共享和更细粒度排序。
- 当前个人脚本模板已经支持新增、套用、搜索、排序、重命名、覆盖更新、另存副本和删除，下一步可继续补标签分类与团队共享。
- 当前脚本复制和导出先走浏览器能力，适合单人运营使用；如果后续需要团队复用，建议继续补脚本模板沉淀和服务端共享。
- 当前服务端持久化已带未迁移数据库时的内存兜底；正式环境仍建议尽快执行本次 Prisma migration，避免重启后丢失收藏与脚本模板。
- 当前参数差异提示基于前端表单和选中作品实时比较，适合二次编辑校对；如果后续字段继续增加，建议抽成统一对比配置。
- 当前失败重试先复用前端已有作品参数重新发起新任务，适合快速补单；如果后续要做更强审计，建议再补“重试来源记录”和失败原因归档。
- 当前回填编辑优先复用本地模板列表匹配 `personId`；如果后续接入定制数字人，再补模板缺失时的兜底展示和更细的差异提示。
- 当前个人中心第三方平台仍是单输入框，蝉镜凭证暂按 `appId::secretKey` 兼容；后续如果同类平台继续增加，建议把私钥模型升级成多字段结构。
- 当前数字人 V1 只覆盖公共模板库和数字人视频，定制数字人、口型驱动、背景图上传和更细的字幕布局仍留在下一轮。

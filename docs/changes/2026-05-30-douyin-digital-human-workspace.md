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
  - 脚本模板区继续补充“个人模板 / 团队共享模板”双形态，支持共享筛选、共享状态切换和只读共享模板另存副本
  - 脚本模板区继续补充“模板分类”，支持按品牌宣传、活动促销、知识分享、直播预热、带货转化等用途沉淀与筛选脚本资产
  - 只读共享模板继续补充“保存为我的副本”默认落到个人模板，并在界面提示共享来源与当前保存目标，减少误覆盖团队资产
  - 脚本模板区继续补充“归档 / 恢复模板”，支持按生效中和已归档状态筛选模板资产，避免不常用模板只能删除
  - 脚本模板区继续补充“协作备注 / 适用说明”，支持保存、更新、搜索和预览模板备注，帮助团队沉淀适用场景与使用提醒
  - 脚本模板区继续补充“治理视图 / 审计提示”，支持按缺备注、只读共享、生效共享、归档资产等维度筛选，并展示模板资产统计和风险提示
  - 创建区补充“参数差异提示”，可对比当前编辑参数与选中作品的差异，减少重复提交流程中的遗漏

### 2. 后端接通蝉镜 OpenAPI 与 works 作品闭环

- `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - 新增蝉镜 OpenAPI client
  - 接入 AccessToken 获取与缓存、公共模板标签、公共数字人模板、数字人视频创建和视频详情查询
- `apps/server/src/modules/works/works.service.ts`
  - 新增数字人模板与作品列表接口
  - 新增数字人视频创建、轮询刷新、结果找回、删除能力
  - 新增数字人模板收藏、脚本模板的服务端持久化读写接口，并为未迁移数据库场景保留内存兜底
  - 脚本模板继续扩展 `isShared` 字段，支持品牌内团队共享模板与个人模板混合读取
  - 脚本模板继续扩展 `category` 字段，支持模板分类保存、读取与迁移兼容
  - 脚本模板继续扩展 `isArchived` 字段，支持模板归档、恢复和状态筛选
  - 脚本模板继续扩展 `note` 字段，支持协作备注的保存、更新、搜索与摘要展示
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
- `prisma/migrations/20260530_digital_human_shared_templates/migration.sql`
  - 为脚本模板补充 `isShared` 字段和共享索引
- `prisma/migrations/20260530_digital_human_template_categories/migration.sql`
  - 为脚本模板补充 `category` 字段和分类索引
- `prisma/migrations/20260530_digital_human_template_archives/migration.sql`
  - 为脚本模板补充 `isArchived` 字段和归档索引
- `prisma/migrations/20260530_digital_human_template_notes/migration.sql`
  - 为脚本模板补充 `note` 字段，承载协作备注与适用说明

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

### 5. 数字人结构纠偏第一轮

- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 把原先单页混合工作台纠偏为数字人内部五个栏目：
    - 模板库
    - 数字人视频
    - 作品中心
    - 定制数字人
    - 口型驱动
  - 顶部增加栏目切换与摘要卡，让用户先知道当前在“选模板 / 创建视频 / 看作品”的哪一步
  - 模板库与数字人视频改为条件渲染，避免继续把筛选、创建、作品和治理区全部堆在一个长页面
  - 作品中心独立为单独栏目，集中承载筛选、分页、详情、找回、失败重试、回填到创建区
  - 为 `定制数字人 / 口型驱动` 补独立栏目占位，先把原方案中的能力入口显式补齐
  - 脚本模板治理区收敛到 `数字人视频` 栏目下，并默认折叠，降低主创建流噪音
  - 从作品中心回填参数后会自动切回 `数字人视频`，形成“作品复用 -> 二次编辑 -> 再提交”的闭环
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 顶部全局状态从“演示数据”改为“部分接口降级”
  - 读取失败提示改为保留成功加载数据并提示刷新重试，避免误导用户以为当前数字人页是本地示例模式

### 6. 数字人组件拆分第二轮

- `apps/web/src/app/(dashboard)/douyin/digital-human-works-center-panel.tsx`
  - 新增作品中心独立子组件
  - 把作品搜索、状态筛选、卡片列表、分页、详情、找回、重试、预览、删除等结构从主文件中抽离
- `apps/web/src/app/(dashboard)/douyin/digital-human-placeholder-panel.tsx`
  - 新增通用占位栏目组件
  - 统一承载 `定制数字人 / 口型驱动` 两个 V2 栏目的说明壳子
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 主文件改为编排层，继续保留状态和业务动作，但把作品中心与占位栏目交给独立组件渲染
  - 本轮先优先抽离最重的分支，降低继续迭代时再次回到“大单体 JSX 文件”的风险

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
- 已执行：
  - `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`
  - `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
- 后续应继续执行：
  - 定制数字人真实文件上传与训练接口联调

## 后续关注

- 当前数字人模板接口已经支持 `tag/page/size` 查询；模板收藏与个人脚本模板已切服务端持久化，最近使用继续保留前端本地缓存，下一步建议继续补团队共享和更细粒度排序。
- 当前脚本模板已经支持个人/团队共享双形态、分类、归档、协作备注、治理视图、新增、套用、搜索、排序、重命名、覆盖更新、另存副本和删除，并补充只读共享模板副本导向与来源提示；下一步可继续补更强审计与共享审批。
- 当前脚本复制和导出先走浏览器能力，适合单人运营使用；如果后续需要团队复用，建议继续补脚本模板沉淀和服务端共享。
- 当前服务端持久化已带未迁移数据库时的内存兜底；正式环境仍建议尽快执行本次 Prisma migration，避免重启后丢失收藏与脚本模板。
- 当前参数差异提示基于前端表单和选中作品实时比较，适合二次编辑校对；如果后续字段继续增加，建议抽成统一对比配置。
- 当前失败重试先复用前端已有作品参数重新发起新任务，适合快速补单；如果后续要做更强审计，建议再补“重试来源记录”和失败原因归档。
- 当前回填编辑优先复用本地模板列表匹配 `personId`；如果后续接入定制数字人，再补模板缺失时的兜底展示和更细的差异提示。
- 当前个人中心第三方平台仍是单输入框，蝉镜凭证暂按 `appId::secretKey` 兼容；后续如果同类平台继续增加，建议把私钥模型升级成多字段结构。
- 当前数字人 V1 只覆盖公共模板库和数字人视频，定制数字人、口型驱动、背景图上传和更细的字幕布局仍留在下一轮。
- 当前多栏目结构已经落地第一轮，但前端仍集中在 `digital-human-workspace.tsx` 单文件内；下一轮建议继续按栏目拆分子组件，降低后续继续迭代时再次走偏的风险。
- 当前组件拆分已启动，作品中心和 V2 占位栏目已抽出；下一轮建议继续拆模板库/数字人视频区域，并开始接定制数字人接口壳子。
- 当前模板库与数字人视频渲染也已拆出，但主文件仍保留大量状态与动作；下一轮建议开始补 `定制数字人` 接口壳子，并继续收敛模板/脚本资产相关 props。
- 当前定制数字人已从静态占位升级为真实接口壳子，但训练视频上传、任务提交、详情查询和真正的持久化仍待下一轮继续接入。

### 8. 定制数字人接口壳子第四轮

- `apps/web/src/services/works.ts`
  - 新增定制数字人类型：
    - `DouyinDigitalHumanCustomPersonRecord`
    - `CreateDouyinDigitalHumanCustomPersonForm`
  - 新增定制数字人服务方法：
    - `getDouyinDigitalHumanCustomPersons`
    - `createDouyinDigitalHumanCustomPerson`
    - `deleteDouyinDigitalHumanCustomPerson`
- `apps/server/src/modules/works/works.controller.ts`
  - 新增定制数字人路由壳子：
    - `GET /works/brands/:brandId/douyin/digital-human/custom-person`
    - `POST /works/brands/:brandId/douyin/digital-human/custom-person/create`
    - `DELETE /works/brands/:brandId/douyin/digital-human/custom-person/:customPersonId`
- `apps/server/src/modules/works/works.service.ts`
  - 新增定制数字人 payload / record 类型
  - 新增定制数字人 service 壳子方法
  - 当前列表接口返回空数组，创建接口会明确提示“文件上传与训练接口正在接入中”，避免前端出现 404 或静默失败
- `apps/web/src/app/(dashboard)/douyin/digital-human-custom-person-workspace.tsx`
  - 新增定制数字人栏目组件
  - 提供列表、详情、训练表单、训练视频选择和删除入口
  - 当前先作为可联调壳子，下一轮继续接真实文件上传与训练任务
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 新增定制数字人 state、刷新逻辑和创建/删除回调
  - 数字人工作台刷新时会一起拉取定制数字人列表
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 定制数字人 tab 从纯说明占位升级为真实子组件接入

### 9. 定制数字人真实上传链路第五轮

- `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - 新增蝉镜文件管理能力：
    - `createUploadUrl`
    - `uploadSignedFile`
    - `getFileDetail`
  - 新增蝉镜定制数字人能力：
    - `createCustomisedPerson`
    - `listCustomisedPersons`
    - `getCustomisedPersonDetail`
    - `deleteCustomisedPerson`
  - 补充文件记录、定制数字人记录的归一化映射
- `apps/server/src/modules/works/works.service.ts`
  - `listDouyinDigitalHumanCustomPersons` 改为真实读取蝉镜定制数字人列表
  - `createDouyinDigitalHumanCustomPerson` 改为真实执行：
    - 训练视频格式校验
    - 获取 `create_upload_url`
    - 对 `sign_url` 发起 `PUT` 上传
    - 轮询 `file_detail` 等待文件可用
    - 调用 `create_customised_person`
    - 回查定制数字人详情并映射到工作台记录
  - `deleteDouyinDigitalHumanCustomPerson` 改为真实调用蝉镜删除接口
  - 定制数字人记录改成“按真实返回字段展示，缺失字段不再伪造”
- `apps/web/src/services/works.ts`
  - 同步放宽定制数字人记录字段为可选，兼容蝉镜列表不回传本地表单配置的情况
- `apps/web/src/app/(dashboard)/douyin/digital-human-custom-person-workspace.tsx`
  - 页面文案从“接口壳子 / 下一轮再接”改为“真实训练链路已接入”
  - 训练配置展示改为真实值优先，缺失时明确显示“服务端未返回 / 训练配置待同步”

### 10. 定制数字人与数字人视频联动第六轮

- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 新增数字人视频创建区来源状态：
    - `COMMON`
    - `CUSTOM`
  - 只把训练成功的定制数字人作为“可用于视频创建”的候选
  - 新增“定制数字人 -> 数字人视频”的编排动作：
    - 从定制数字人页一键带入
    - 从作品中心按 `personSource` 回填公共模板或定制数字人
  - 提交视频时改为按当前来源动态组装 payload，不再只支持公共模板
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 数字人视频创建区新增“数字人来源”切换
  - 当来源为公共模板时，继续显示模板标签 / 搜索 / 收藏 / 最近使用
  - 当来源为定制数字人时，显示：
    - 成功定制数字人下拉选择
    - 训练状态
    - 可用数量
    - 数字人 ID
  - 预览卡与提醒区改为同时兼容公共模板和定制数字人
- `apps/web/src/app/(dashboard)/douyin/digital-human-custom-person-workspace.tsx`
  - 在列表卡片和详情面板中新增“用于数字人视频”按钮
  - 仅对 `SUCCESS` 的定制数字人开放一键带入

### 11. 定制数字人本地配置回填第七轮

- `apps/server/src/modules/works/works.service.ts`
  - 新增 `DOUYIN_DIGITAL_HUMAN_CUSTOM` 本地 HTML work metadata 类型
  - `createDouyinDigitalHumanCustomPerson` 在真实调用蝉镜训练链路的同时：
    - 创建本地 Task
    - 创建本地 HTML work 壳
    - 把训练名称、训练类型、语言、分辨率、错误跳过等表单配置写入 metadata
    - 失败时把错误信息回写到本地 metadata 与 Task
  - `listDouyinDigitalHumanCustomPersons` 改为“蝉镜列表 + 本地 metadata”合并：
    - 优先用本地配置回填训练类型、语言、分辨率等字段
    - 当蝉镜列表暂未回传刚创建的数字人时，本地记录也能继续展示
  - `deleteDouyinDigitalHumanCustomPerson` 删除蝉镜记录后，同步清理本地 HTML work 与 Task
  - 新增：
    - `DigitalHumanCustomPersonWorkAssetMeta`
    - `loadDigitalHumanCustomPersonLocalConfigMap`
    - `saveDigitalHumanCustomPersonMetadataSnapshot`
    - `deleteDigitalHumanCustomPersonLocalWork`
    - `mapLocalCustomPersonMeta`
- 本轮效果
  - 定制数字人不再只是依赖蝉镜返回的瞬时字段
  - 本地可以稳定保存训练表单配置，后续刷新、列表显示、回填和继续联动都有可信来源

## 第七轮验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/works.service.ts`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`

### 12. 蝉镜配置保存运行时依赖修复

- 问题现象
  - 在个人中心配置蝉镜 `appid` / `secretKey` 保存时，后端报错：
    - `Cannot find module './encodings'`
  - 调用栈位于：
    - `body-parser`
    - `raw-body`
    - `iconv-lite`
- 根因判断
  - 不是 `appid` 参数格式错误
  - 是服务端运行环境中的 `iconv-lite` 安装产物不完整，导致请求体解析阶段加载 `./encodings` 失败
- 修复方式
  - `apps/server/package.json`
    - 显式新增 `iconv-lite`
  - `package-lock.json`
    - 锁定并记录 `iconv-lite@0.4.24`
- 结果
  - 避免服务端继续仅依赖 `@nestjs/platform-express -> body-parser -> raw-body` 的间接依赖链
  - 降低远端部署时因裁剪/安装异常导致的保存接口崩溃风险

### 13. 定制数字人本地 metadata 自动同步第八轮

- `apps/server/src/modules/works/works.service.ts`
  - `listDouyinDigitalHumanCustomPersons` 新增“蝉镜列表刷新 -> 本地 metadata 回写”逻辑
  - 当蝉镜返回定制数字人的最新状态、进度、预览视频、封面、失败原因、音色或尺寸信息时：
    - 会自动对比本地 `DOUYIN_DIGITAL_HUMAN_CUSTOM` metadata
    - 仅在存在差异时回写本地 HTML work metadata
  - 新增：
    - `DigitalHumanCustomPersonLocalEntry`
    - `syncDigitalHumanCustomPersonLocalSnapshot`
    - `shouldSyncDigitalHumanCustomPersonLocalMeta`
- 本轮效果
  - 本地配置回填不再只在“创建时”写入一次
  - 定制数字人的本地 work 壳会随着蝉镜真实状态持续同步，后续联动和回填更稳定

## 第八轮验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/works.service.ts`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`

### 14. 口型驱动高级参数真实提交第十四轮

- `apps/web/src/app/(dashboard)/douyin/digital-human-lip-sync-workspace.tsx`
  - 口型驱动状态说明改为与当前真实能力保持一致
  - 明确提示模型版本、播放顺序、驱动模式和音量会随任务一起提交并回写站内记录
- `apps/server/src/modules/works/works.service.ts`
  - `buildChanjingLipSyncCreatePayload` 不再写死 `model: 0`
  - 把前端已经打通到 metadata 的高级参数继续下钻到蝉镜真实创建请求：
    - `model`
    - `backway`
    - `drive_mode`
    - `volume`
  - `drive_mode` 为空时不再透传，避免无效空值污染请求
- 部署补充说明
  - 用户当前仍看到“数字人模板 / 形象类型为空”，高概率不是这条修复没写，而是服务器部署现场仍停留在模板排序修复之前的旧提交
  - 用户提供的 `10.txt` 已确认服务器当时停在 `a74cdeb`，部署脚本先死于 `apps/web/.next` 的 `EACCES`，后续 PM2 又遇到 `127.0.0.1:3001` 端口占用
  - 也就是说，线上之所以还没有模板，大概率是“修复提交未成功落到线上”，不是当前仓库里仍缺少模板排序修复

### 15. 数字人模板失败原因可视化第十五轮

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 新增数字人模板专属错误状态
  - 当模板列表或模板标签接口失败时，不再只保留全局“部分接口降级”，会单独提取失败消息并传给数字人工作台
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 新增 `templateLoadError` 透传
- `apps/web/src/app/(dashboard)/douyin/digital-human-template-library.tsx`
  - 模板库顶部新增就地错误提示
  - 当模板未成功读取时，模板下拉和形象类型下拉会显示明确占位文案，不再表现为无声空白
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 数字人视频创建区在公共模板模式下同步展示模板读取失败原因
  - 模板和形象类型下拉新增失败态占位文案
- 本轮效果
  - 用户现在可以直接在数字人面板看到“蝉镜配置缺失 / 模板接口失败 / 标签接口失败”等具体错误信息
  - 页面空白态从“看起来像没有模板”改为“明确告诉用户是读取失败还是当前筛选无结果”

### 16. 模板错误拆分与模板广场继续贴近蝉镜第十六轮

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 把数字人模板错误拆分为：
    - `templateLoadError`
    - `templateTagLoadError`
  - `refreshDigitalHumanWorkspace` 改为 `Promise.allSettled`
  - 当标签接口失败时，不再阻断作品、收藏、脚本模板和模板列表的刷新
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 新增 `templateTagLoadError` 透传到模板库和数字人视频创建区
- `apps/web/src/app/(dashboard)/douyin/digital-human-template-library.tsx`
  - 模板库顶部新增“模板广场”式焦点区：
    - 当前选中模板大图预览
    - 模板状态 / 作品累计 / 当前标签摘要
    - 推荐浏览 / 我的收藏 / 最近使用快捷切换
  - 模板错误与标签错误改为分开展示
  - 当标签接口失败但模板可用时，明确提示当前已回退为模板直出浏览和本地标签筛选
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 公共模板模式下同步区分：
    - 模板接口最近一次刷新失败
    - 标签接口异常但仍可继续创建视频
- `apps/web/src/styles/globals.css`
  - 新增模板广场头图、统计卡和快捷筛选区样式
- 本轮效果
  - 页面红条不再继续把“标签失败”误报成“模板整体失败”
  - 数字人模板区进一步从“表单选模板”升级为更接近蝉镜 `people` 页的广场浏览入口

### 17. 模板悬停创建与弹窗预览第十七轮

- `apps/web/src/app/(dashboard)/douyin/digital-human-template-library.tsx`
  - 移除模板库主页面内的大图详情区、形象详情区和底部详情卡，避免继续占用列表浏览空间
  - 模板卡片改为接近蝉镜 `people` 页的交互：
    - 鼠标滑到人物图上时显示“创建视频”按钮
    - 点击人物图时弹出模板详情弹窗
  - 模板详情弹窗内集中承载：
    - 大预览区
    - 收藏按钮
    - 多形象切换
    - 创建视频主按钮
  - 模板列表改为页码分页，固定每页 24 条，点击序号切页
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 模板库子组件 props 改为页码切换回调
  - 从模板弹窗“创建视频”进入数字人视频创建区时，会同步回填模板与形象类型
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 新增数字人模板页码切换动作，直接走模板接口的真实 `page/size`
  - 页码切换成功后同步更新工作台提示文案
- `apps/web/src/styles/globals.css`
  - 新增模板悬停遮罩、悬停按钮、弹窗、形象缩略图网格和页码分页样式
- 本轮效果
  - 模板库主页面回到“纯浏览卡片墙”形态
  - 详情信息改为点击人物后在弹窗中查看，更接近蝉镜原站交互

### 18. 顶部概览移除与标签失败静默化第十八轮

- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 移除模板库顶部“当前栏目 / 模板库 / 作品中心”概览卡区域，仅保留 tab 切换
- `apps/web/src/app/(dashboard)/douyin/digital-human-template-library.tsx`
  - 标签未同步成功时不再展示错误提示
  - 标签区改为“同步成功才显示”，同步失败时直接隐藏
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 公共模板模式下移除标签同步失败提示
  - 当标签未同步成功时，模板标签下拉直接隐藏
- 本轮效果
  - 页面被打叉的顶部概览区已去掉
  - 标签异常不再出现在页面上，直接按无标签模式展示

### 19. 独立语音库板块与语音能力接入第二十轮

- `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - 新增蝉镜语音相关 OpenAPI 能力：
    - 公共声音列表
    - 定制声音创建 / 详情 / 列表 / 删除
    - 语音合成任务创建 / 状态查询
  - 新增公共声音、定制声音、语音合成结果的归一化结构
- `apps/server/src/modules/works/works.service.ts`
  - 新增抖音数字人语音库业务封装：
    - `listDouyinVoiceLibrary`
    - `listDouyinCustomVoices`
    - `createDouyinCustomVoice`
    - `deleteDouyinCustomVoice`
    - `createDouyinSpeechTask`
    - `getDouyinSpeechTaskDetail`
  - 新增 `prompt_audio` 上传链路，支持声音克隆前的音频上传与文件就绪轮询
- `apps/server/src/modules/works/works.controller.ts`
  - 新增语音库路由：
    - `GET /works/brands/:brandId/douyin/digital-human/voice-library`
    - `GET /works/brands/:brandId/douyin/digital-human/voice-library/custom`
    - `POST /works/brands/:brandId/douyin/digital-human/voice-library/custom`
    - `DELETE /works/brands/:brandId/douyin/digital-human/voice-library/custom/:voiceId`
    - `POST /works/brands/:brandId/douyin/digital-human/voice-library/speech`
    - `GET /works/brands/:brandId/douyin/digital-human/voice-library/speech/:taskId`
- `apps/web/src/services/works.ts`
  - 新增前端语音类型：
    - `DouyinVoiceLibraryRecord`
    - `DouyinCustomVoiceRecord`
    - `DouyinSpeechTaskRecord`
  - 新增语音请求方法：
    - `getDouyinVoiceLibrary`
    - `getDouyinCustomVoices`
    - `createDouyinCustomVoice`
    - `deleteDouyinCustomVoice`
    - `createDouyinSpeechTask`
    - `getDouyinSpeechTaskDetail`
- `apps/web/src/app/(dashboard)/douyin/digital-human-voice-library-workspace.tsx`
  - 新增独立语音库子组件
  - 页面结构改为接近蝉镜 `audio` 页的：
    - 顶部摘要卡
    - `公共声音 / 我的声音` 切换
    - 筛选条
    - 左侧声音列表
    - 右侧声音创作区
  - 支持试听、分页、定制声音创建、删除、语音合成和结果查看
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 在 `模板库` 后新增独立 `语音库` tab
  - 接入语音库组件渲染和相关 props
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 新增语音库状态：
    - 公共声音列表
    - 我的声音列表
    - 语音合成当前任务与任务 ID
  - 数字人工作台初始化和刷新时会同步加载语音数据
  - 活跃任务轮询新增定制声音制作中与语音合成进行中的判断
  - 新增语音分页、声音克隆、删除声音、语音合成和结果刷新动作
- `apps/web/src/styles/globals.css`
  - 新增语音库独立样式，覆盖摘要卡、筛选区、声音卡片、创作区和字幕切片布局
- 本轮效果
  - 数字人工作台现在有独立的 `语音库` 板块，位置紧跟 `模板库`
  - 公共声音、定制声音、语音合成已经从服务端到前端完整接通
  - 页面不再只是表单堆叠，而是更接近蝉镜声音库的双栏浏览与创作布局

### 14. 定制数字人与视频创建参数映射第九轮

- `apps/web/src/services/works.ts`
  - `DouyinDigitalHumanCustomPersonRecord` 新增：
    - `width4k`
    - `height4k`
  - `GenerateDouyinDigitalHumanVideoForm` 新增：
    - `customPersonTrainType`
    - `customPersonSupport4k`
    - `customPersonWidth4k`
    - `customPersonHeight4k`
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 新增定制数字人推荐画布计算
  - 选中定制数字人时自动：
    - 切到半身形态
    - 回填推荐画布尺寸
  - “用于数字人视频” 时同步带入推荐尺寸
  - 提交视频时把定制数字人的训练类型、4K 能力和 4K 尺寸一起提交给后端
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 定制数字人创建区新增只读信息：
    - 训练类型
    - 输出能力 / 4K 尺寸
  - 定制数字人模式下：
    - 形象类型固定按半身展示
    - 提示缺少克隆音色时将按默认语音策略提交
    - 明确提示未返回 4K 能力时不能提交超出 1080p 的画布尺寸
- `apps/server/src/modules/works/works.service.ts`
  - 数字人视频生成 payload / 归一化结构补齐：
    - `customPersonTrainType`
    - `customPersonSupport4k`
    - `customPersonWidth4k`
    - `customPersonHeight4k`
  - 定制数字人记录与本地 metadata 新增：
    - `width4k`
    - `height4k`
  - 定制数字人列表同步逻辑新增：
    - `width4k`
    - `height4k`
  - `normalizeDigitalHumanCreatePayload` 新增 CUSTOM 预校验：
    - 定制数字人未返回 4K 能力时，阻止超出 1080p 的画布尺寸
    - 已返回 4K 尺寸上限时，阻止超过推荐上限的画布尺寸
    - CUSTOM 来源统一按 `sit_body` 提交，减少前端误选与实际能力不匹配

## 第九轮验证

- `GetDiagnostics`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - `apps/server/src/modules/works/works.service.ts`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`

### 15. 蝉镜平台动态统计第十轮

- `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
  - `UserThirdPartyPlatformRecord` 新增 `dynamicStats`
  - 个人中心第三方平台列表在蝉镜平台下新增动态统计：
    - 模板数
    - 定制数字人数
    - 标签数
    - 最近同步时间
    - 缺少凭证 / 同步失败状态说明
  - 统计来源改为真实调用蝉镜接口：
    - `listTemplateTags`
    - `listCommonDigitalPersons`
    - `listCustomisedPersons`
- `apps/server/src/modules/third-party-platforms/third-party-platforms.module.ts`
  - 注册 `ChanjingOpenApiService`，用于在个人中心第三方平台模块内直接做蝉镜动态统计
- `apps/web/src/services/personal-center.ts`
  - 第三方平台前端类型新增 `dynamicStats`
- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
  - 蝉镜平台卡片不再机械显示静态“模型数 / 默认模型”
  - 对蝉镜改为展示：
    - 模板数
    - 定制数字人数
    - 标签同步摘要
    - 动态统计状态
  - 详情区把“大模型 ID”改为蝉镜动态统计摘要，避免继续误导为模型平台

## 第十轮验证

- `GetDiagnostics`
  - `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
  - `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
  - `apps/web/src/services/personal-center.ts`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`

### 16. 口型驱动工作台壳子与前后端契约第十一轮

- `apps/web/src/services/works.ts`
  - 新增口型驱动记录类型：
    - `DouyinLipSyncWorkRecord`
    - `CreateDouyinLipSyncForm`
  - 新增口型驱动服务方法：
    - `getDouyinLipSyncWorks`
    - `generateDouyinLipSyncWork`
    - `recoverDouyinLipSyncGeneration`
    - `deleteDouyinLipSyncWork`
- `apps/server/src/modules/works/works.controller.ts`
  - 新增口型驱动路由：
    - `GET /works/brands/:brandId/douyin/digital-human/lip-sync`
    - `POST /works/brands/:brandId/douyin/digital-human/lip-sync/generate`
    - `POST /works/brands/:brandId/douyin/digital-human/lip-sync/recover`
    - `DELETE /works/brands/:brandId/douyin/digital-human/lip-sync/:workId`
  - 权限继续沿用：
    - 列表 `douyin.digitalHuman.view`
    - 创建 / 找回 / 删除 `douyin.digitalHuman.edit`
- `apps/server/src/modules/works/works.service.ts`
  - 新增口型驱动 payload / record 类型：
    - `CreateDouyinLipSyncPayload`
    - `RecoverDouyinLipSyncPayload`
    - `DouyinLipSyncWorkRecord`
  - 新增服务壳子方法：
    - `listDouyinLipSyncWorks`
    - `generateDouyinLipSync`
    - `recoverDouyinLipSync`
    - `deleteDouyinLipSync`
  - 当前阶段先补齐真实参数校验和明确报错：
    - 未上传驱动视频时阻止提交
    - 音频驱动未上传音频时阻止提交
    - 文本驱动未填写文案时阻止提交
    - 找回结果未填写任务 ID 时阻止找回
  - 当真实蝉镜接口尚未接入时，返回明确的“接口接入中”语义，避免前端出现 404 或静默失败
- `apps/web/src/app/(dashboard)/douyin/digital-human-lip-sync-workspace.tsx`
  - 新增口型驱动独立工作台组件
  - 提供：
    - 左侧任务列表
    - 右侧创建表单
    - 文本驱动 / 音频驱动切换
    - 驱动视频上传
    - 手动输入任务 ID 找回结果
    - 删除记录
  - 当前明确提示：
    - 本轮是“真实工作台壳子 + 前后端契约”
    - 下一轮继续接蝉镜真实 `video_lip_sync` 任务链路
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 口型驱动 tab 从占位文案升级为真实子组件接入
  - 新增口型驱动 props：
    - `lipSyncItems`
    - `onCreateLipSync`
    - `onRecoverLipSync`
    - `onDeleteLipSync`
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 新增口型驱动状态：
    - `digitalHumanLipSyncWorks`
  - 数字人工作台刷新时会一起加载口型驱动列表
  - 新增口型驱动创建 / 找回 / 删除回调
  - 活跃任务轮询判断新增口型驱动状态，避免列表刷新漏掉该栏目

## 第十一轮验证

- `GetDiagnostics`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-lip-sync-workspace.tsx`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/works/works.service.ts`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`

### 17. 口型驱动真实蝉镜任务链路第十二轮

- `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - 新增蝉镜口型驱动能力：
    - `createLipSyncVideo`
    - `listLipSyncVideos`
    - `getLipSyncVideoDetail`
  - 新增：
    - `ChanjingCreateLipSyncPayload`
    - `ChanjingLipSyncDetail`
  - 按蝉镜真实文档对齐：
    - `POST /open/v1/video_lip_sync/create`
    - `POST /open/v1/video_lip_sync/list`
    - `GET /open/v1/video_lip_sync/detail`
- `apps/server/src/modules/works/works.service.ts`
  - 新增本地 metadata 类型：
    - `DouyinLipSyncWorkAssetMeta`
    - `DouyinLipSyncSnapshot`
    - `NormalizedDouyinLipSyncPayload`
  - `generateDouyinLipSync` 改为真实执行：
    - 校验驱动视频 / 驱动音频 / 文本文案
    - 创建本地 Task
    - 创建本地 HTML work 壳
    - 上传驱动视频到蝉镜文件管理
    - 音频驱动模式下上传驱动音频
    - 调用真实 `video_lip_sync/create`
    - 保存 `providerTaskId`
    - 立即查询一次详情并回写站内状态
  - `listDouyinLipSyncWorks` 改为真实读取本地口型驱动作品，并对最近任务自动刷新蝉镜快照
  - `recoverDouyinLipSync` 改为真实调用蝉镜详情接口并执行结果回写
  - `deleteDouyinLipSync` 改为真实删除本地 HTML work、Task 和已转存视频 / 封面文件
  - 新增：
    - `uploadChanjingLipSyncVideo`
    - `uploadChanjingLipSyncAudio`
    - `runGenerateDouyinLipSyncTask`
    - `queryDouyinLipSyncSnapshot`
    - `persistDouyinLipSyncSnapshot`
    - `getDouyinLipSyncWorkRowById`
    - `findRecoverableDouyinLipSyncWorkRow`
    - `refreshDouyinLipSyncWorkSnapshot`
  - 口型驱动成功后会：
    - 下载并转存最终视频
    - 下载并转存封面
    - 回写本地 `MediaAsset.metadataJson`
    - 复用站内 `upsertRecoveredVideoMedia` 持久化视频资源
- `apps/web/src/app/(dashboard)/douyin/digital-human-lip-sync-workspace.tsx`
  - 页面文案从“接口接入中”改为真实能力说明
  - 明确提示：
    - 当前支持真实提交蝉镜口型驱动任务
    - 生成成功后会把结果视频回写到站内记录

## 第十二轮验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-lip-sync-workspace.tsx`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`

### 18. 数字人模板排序兼容修复第十三轮

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 数字人模板默认排序参数从 `hot_desc` 改为蝉镜文档实际支持的 `hottest`
  - 首次加载和“继续加载模板”两条链路统一改为 `hottest`
- `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - 新增 `normalizeCommonDigitalPersonSort`
  - 兼容以下旧值并归一到蝉镜真实参数：
    - `hot_desc` -> `hottest`
    - `latest_desc` -> `latest`

### 19. 蝉镜标签接口兼容与动态统计降级第十六轮

- `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - 蝉镜请求层不再直接 `response.json()`，改为先读取原始文本再安全解析
  - 当上游返回 404 纯文本、网关页或其他非 JSON 内容时，直接透出可读错误，不再显示 `Unexpected non-whitespace character after JSON at position 4`
  - `listTemplateTags` 新增 `www.chanjing.cc/api` 回退请求，兼容 `open-api.chanjing.cc` 下 `tag_list` 返回 404 的现场
- `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
  - 蝉镜动态统计改为 `Promise.allSettled`
  - 当标签接口失败但模板列表、定制数字人列表成功时，动态统计进入 `partial` 状态
  - 页面仍展示：
    - 模板数
    - 定制数字人数
    - 已同步时间
    - 标签统计失败原因
- `apps/web/src/services/personal-center.ts`
  - 第三方平台前端类型为蝉镜动态统计补充 `partial` 状态
- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
  - 蝉镜动态统计支持 `partial` 渲染
  - 模板 / 定制数字人 / 标签 chip 对未取到的统计值显示 `-`
  - 蝉镜说明文案改为优先展示“模板与定制数字人数已同步，标签接口暂不可用”的真实状态

### 20. 第三方接口改为品牌共享密钥第十七轮

- `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
  - 新增品牌共享密钥运行时模型：`BrandThirdPartyPlatformSecret`
  - 个人中心第三方接口配置从“当前用户私有 Key”切换为“当前品牌共享 Key”
  - 服务启动时自动创建品牌共享密钥表，并将历史 `UserThirdPartyPlatformSecret` 中同品牌同平台最近一次非空配置迁移到新表
  - `resolveBrandRuntimeApiKeys` 不再按 `ownerUserId` 解析，改为直接按 `brandId + platformId(baseUrl 匹配)` 读取共享密钥
- `apps/server/src/modules/third-party-platforms/third-party-platforms.controller.ts`
  - `/api/third-party-platforms/:id/secret` 继续沿用原路由，但写入目标改为品牌共享密钥
- `apps/server/src/modules/works/works.service.ts`
  - 第三方平台缺失密钥时的报错从“品牌 Owner 未配置”改为“当前品牌未配置品牌共享 API Key”
- `apps/server/src/modules/reports/reports.service.ts`
  - 报告链路对齐品牌共享密钥的报错口径
- `apps/server/src/common/mock-data.ts`
  - mock 数据从 `userThirdPartyPlatformSecrets` 切换为 `brandThirdPartyPlatformSecrets`
- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
  - 页面按钮、字段标题、说明文案统一改为“品牌共享 API Key”
- `docs/site-map.md`
  - 更新第三方接口配置模块、数字人模块和管理模块说明，改为品牌共享密钥策略
- `docs/database-archive.md`
  - 数据归档说明改为 `BrandThirdPartyPlatformSecret`

### 21. 蝉镜 AccessToken 失效自动刷新第十八轮

- `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - 蝉镜所有业务请求改为统一走 `requestCredentialJson`
  - 若上游返回 `AccessToken已失效`、`invalid access_token` 等鉴权失效信息，服务端会自动清理当前凭证对应的 token 缓存并重试一次
  - 用于处理“当前账号就是品牌 Owner、凭证手工校验正常，但服务端进程仍缓存着旧 token”这类现场

### 22. 数字人模板库卡片墙与标签降级第十九轮

- `apps/web/src/app/(dashboard)/douyin/digital-human-template-library.tsx`
  - 模板库从“下拉选择模板”升级为“卡片墙选模板”
  - 顶部标签从纯下拉改为 chip 选择
  - 当蝉镜 `tag_list` 接口失败但模板列表可用时，不再把页面整体判定为模板失败
  - 无法拿到服务端标签分组时，会从模板返回的 `tagNames` 回退成本地筛选 chip
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 数字人视频创建区对齐模板异常文案
  - 当模板已加载、仅标签接口失败时，提示改为“公共模板已加载，标签接口异常”
- `apps/web/src/styles/globals.css`
  - 新增数字人模板卡片墙、模板封面卡片、标签 pill 等样式

## 第十三轮验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`

## 第六轮验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-custom-person-workspace.tsx`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`

## 本轮补充验证

- `GetDiagnostics`
  - `apps/server/src/modules/works/chanjing-open-api.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/app/(dashboard)/douyin/digital-human-custom-person-workspace.tsx`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`

### 7. 数字人组件拆分第三轮

- `apps/web/src/app/(dashboard)/douyin/digital-human-template-library.tsx`
  - 新增模板库独立子组件
  - 把模板标签、关键词、收藏/最近使用筛选、模板选择、形象选择、模板预览、继续加载等结构从主文件中抽离
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 新增数字人视频创建子组件
  - 把模板选择、脚本编辑、脚本模板资产、参数配置、模板预览、最近使用模板等渲染结构从主文件中抽离
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 主文件继续收敛为 tab 编排层和状态/动作集中层
  - 模板库、数字人视频、作品中心、V2 占位栏目已全部开始以独立子组件渲染，不再继续把主结构堆回单个 JSX 分支

### 23. 飞影式首页与创作作品第一阶段

- `apps/web/src/app/(dashboard)/douyin/digital-human-home-panel.tsx`
  - 新增数字人首页子组件
  - 首屏收口为：
    - 快速创建数字人
    - 我的数字人
    - 公共数字人
    - 最近作品
  - 快速创建数字人改为弹窗提交，直接复用现有定制数字人训练链路
  - 首页提供：
    - 去创作作品
    - 去模板库挑选
    - 去语音库管理
    - 去作品中心
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 数字人工作台 tab 改为兼容式主流程：
    - 首页
    - 创作作品
    - 模板库
    - 语音库
    - 作品中心
  - 默认进入 `首页`
  - 原 `数字人视频` 保留底层创建逻辑，但界面命名改为 `创作作品`
  - `定制数字人 / 口型驱动` 先从主 tab 中收口，不再作为用户第一层主路径
  - 首页、模板库、公用数字人卡片和定制数字人卡片都统一带入 `创作作品`
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 面板标题从“数字人视频”改为“创作作品”
  - 文案明确说明模板库和语音库继续作为独立资源中心保留
- `apps/web/src/styles/globals.css`
  - 新增数字人首页首屏、卡片、快捷创建入口和弹窗样式
- 本轮效果
  - 新主流程已经开始落地，但没有推翻之前已经做好的模板库和语音库
  - 用户现在可以先从首页进入，再按需深入到模板库、语音库和作品中心
  - 数字人板块开始从“资源页堆叠”过渡到“首页 + 创作作品 + 资源中心”的兼容式结构

### 24. 创作作品声音选择接入第二阶段第一步

- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 创作页状态新增：
    - `selectedVoiceMode`
    - `selectedPublicVoiceId`
    - `selectedCustomVoiceId`
  - 支持 `默认音色 / 公共声音 / 我的声音` 三种模式
  - 作品回填时会优先按 `audioManId` 命中公共声音或我的声音
  - 提交数字人视频时，会把当前显式选中的声音真正写入 payload，不再只依赖模板默认音色
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 创作作品面板新增声音来源切换
  - 当选择公共声音或我的声音时，展示对应下拉选择器
  - 新增“当前声音说明”，明确告诉用户当前走的是模板默认音色、定制数字人默认音色、公共声音还是我的声音
- 本轮效果
  - 创作作品页现在已经可以直接改声音，不需要先退回语音库页面才能决定最终提交音色
  - 语音库继续保留为深度资源中心，创作页则补齐了高频选择能力

### 25. 创作作品多片段草稿与我的素材库接入

- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - 复用现有品牌素材库 `materialWorks`
  - 将已入库视频素材映射为数字人工作台可直接使用的 `materialLibraryItems`
- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 新增创作作品草稿卡片状态
  - 当前编辑区会自动同步到活动草稿卡片
  - 支持：
    - 新增片段
    - 复制当前片段
    - 删除当前片段
    - 切换片段并回填编辑区
  - 每个片段会独立记录：
    - 数字人来源
    - 形象
    - 声音来源
    - 我的素材库引用
    - 标题与脚本
    - 画布与字幕参数
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 创作作品页新增“多片段草稿”卡片条
  - 新增“我的素材库”选择器和素材预览入口
  - 创作页开始具备飞影式多片段编排的前端基础
- `apps/web/src/styles/globals.css`
  - 新增多片段草稿卡片样式
- 本轮效果
  - 创作作品不再只有单条创建表单，而是具备多片段编排层
  - 品牌素材库中的已入库视频可以直接在数字人创作页被引用
  - 当前仍保持兼容式重构，不影响模板库、语音库和作品中心

### 26. 创作作品批量生成与音频驱动接入

- `apps/web/src/app/(dashboard)/douyin/digital-human-workspace.tsx`
  - 把已完成的草稿 payload 组装能力正式接到界面动作上
  - 新增批量生成提交动作，按有效片段逐条复用既有数字人视频创建接口
  - 新增音频驱动弹窗状态关闭逻辑，避免重复打开时残留上次选择的文件
  - 音频驱动提交时把创作页 `1` 比例制音量换算为口型驱动链路使用的百分比音量，避免直接透传后音量异常偏低
- `apps/web/src/app/(dashboard)/douyin/digital-human-video-panel.tsx`
  - 创作作品快捷操作区新增：
    - `音频驱动`
    - `批量生成 n 个视频`
  - 新增音频驱动弹窗，支持：
    - 上传驱动视频
    - 上传驱动音频
    - 预览音频
    - 自动读取音频时长并展示预计时长
  - 明确提示素材库当前仍是参考素材入口，音频驱动因蝉镜接口要求继续走本地文件上传
- 本轮效果
  - 创作作品页已经能直接从多片段草稿批量提交多个视频
  - 用户已可在创作页内部发起音频驱动，不必再单独切回旧口型驱动工作台
  - 模板库、语音库、作品中心的既有结构未被改动，继续保持兼容式演进

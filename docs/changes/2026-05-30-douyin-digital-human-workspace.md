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
  - 非法排序值不再透传给蝉镜，避免公共数字人模板列表被参数错误直接打空

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

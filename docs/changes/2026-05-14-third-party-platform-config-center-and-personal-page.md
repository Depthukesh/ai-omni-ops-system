# 2026-05-14 第三方接口配置平台化与个人中心接入

## 1. 背景

- 用户要求在前端个人中心新增“第三方接口配置”，布局对齐技能中心：左侧平台列表，右侧展示并维护当前平台配置
- 个人中心右侧字段需要统一展示：
  - 第三方平台链接
  - API Key
  - 大模型 ID
  - 说明文档
- 后台“接口供应商”页也要改成同样的左右布局，并按平台聚合，例如同一个 `Base URL` 下的所有模型 ID 统一放到一个平台板块
- 后台这里不再填写 API Key；API Key 改为当前品牌下的 Owner 在个人中心维护自己的私有值

## 2. 本次处理

- 前端个人中心新增 `/personal-center/third-party-platforms`
  - 左侧按平台切换项目
  - 右侧展示平台链接、默认模型、模型 ID、说明文档与备注
  - 当前品牌只有 Owner 可保存该品牌下自己的私有 API Key
- 后台 `/admin` 的“接口供应商”页改为平台化视图
  - 左侧新增平台创建表单与平台列表
  - 右侧只维护当前选中平台的名称、类型、状态、平台链接、说明文档、默认模型、模型 ID 与备注
  - 删除后台页上的 API Key 输入，改为提示前台 Owner 维护私有 Key
- 前后端同步一套新的平台级配置接口：
  - 后台：`/api/admin/third-party-platforms`
  - 前台：`/api/third-party-platforms`、`/api/third-party-platforms/:id/secret`
- 后端新增平台级配置真源
  - `ThirdPartyPlatformConfig`：保存平台基线
  - `UserThirdPartyPlatformSecret`：保存用户在当前品牌下的私有 API Key
- 保留原 `ApiProviderConfig` 运行时表不动，避免影响 `ReportsModule` 与 `WorksModule` 现有按 `runtimeKey` 读取的生成链路
- 为后台平台页补齐默认模型联动 helper，并增加从旧 `ApiProviderRecord` 回退聚合到平台视图的本地 fallback，保证 API 不可用时仍能联调
- 将 `ThirdPartyPlatformConfig` 与 `UserThirdPartyPlatformSecret` 补入 `prisma/schema.prisma`，避免后续 `prisma db push` 把运行时已存在的新表当成未知结构

## 3. 影响文件

- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- `apps/web/src/app/(dashboard)/admin/page.tsx`
- `apps/web/src/services/personal-center.ts`
- `apps/web/src/services/admin.ts`
- `apps/server/src/modules/third-party-platforms/third-party-platforms.controller.ts`
- `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
- `apps/server/src/modules/third-party-platforms/third-party-platforms.module.ts`
- `apps/server/src/app.module.ts`
- `prisma/schema.prisma`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/database-archive.md`
- `docs/README.md`

## 4. 验证结果

- `GetDiagnostics` 检查：
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
  - `prisma/schema.prisma`
  - 以上文件均无新增诊断错误
- `npm --workspace apps/web run build` 通过
- `npm --workspace apps/server run build` 通过

## 5. 当前边界

- 当前后台可见的“接口供应商”页已切到平台级配置视图，前台个人中心读取同一份平台基线；但报告与创作生成链路的运行时真源仍是 `ApiProviderConfig`
- 前台个人中心只支持维护当前品牌下当前账号的私有 API Key，不支持编辑平台基线字段
- 当前私有 API Key 权限只开放给品牌 Owner，普通成员保持只读
- 当前运行时仍以 `ApiProviderConfig + runtimeKey` 决定可用 Provider，但当 Provider `baseUrl` 能匹配到 `ThirdPartyPlatformConfig` 时，会强制读取当前品牌 Owner 在 `UserThirdPartyPlatformSecret` 中保存的私有 API Key；若 Owner 未配置，则直接返回中文提醒，不再回退公共 Key
- 当前品牌间第三方模型调用已按 `brandId + ownerUserId + platformId` 隔离；不同品牌不会直接共用同一套平台私钥

## 6. 2026-05-14 补充修正

- 个人中心“第三方接口配置”页修正了搜索态交互
  - 搜索框增加关闭自动填充，避免浏览器把账号或手机号误填进搜索框后把平台列表过滤成 0 条
  - 当搜索结果为空时，不再把当前选中平台直接清空，避免出现“刚进入页面就整块内容消失”的假空白
  - 页面增加“清空搜索”，便于快速恢复完整平台列表
  - 当浏览器误把纯数字串填进搜索框且导致结果为 0 条时，页面会自动清空该异常搜索值，避免左侧项目一点击就全部消失
- 个人中心平台详情不再直接裸露展示 Base URL
  - 顶部摘要去掉 `OPENAI · https://...` 这类长链接文案
  - “第三方平台链接”改为按钮式跳转，不再直接把原始链接文字铺在卡片里
- 后台“接口供应商”平台页补了一轮排版收口
  - 左侧已移除“新增平台基线”表单，只保留`平台列表`
  - 页面不再提供新建平台入口，避免把后台排版重新拉成长表单墙
  - 平台列表筛选区维持单列，降低字段错位问题
  - 右侧详情头部去掉原始 Base URL 长文案，改成更紧凑的更新时间摘要，并补上“第三方平台链接”快捷跳转按钮

## 7. 2026-05-14 运行时补充

- `ThirdPartyPlatformsService` 新增品牌运行时 API Key 解析能力
  - 先按 `ApiProviderConfig.baseUrl / extraParams.baseUrls` 匹配平台级 `ThirdPartyPlatformConfig`
  - 再按 `brandId -> ownerUserId -> platformId` 读取 `UserThirdPartyPlatformSecret`
  - 命中平台时必须返回品牌 Owner 私有 Key；若 Owner 未配置，则直接返回中文提醒，不再回退 `ApiProviderConfig` 公共 Key
- `ReportsModule` 生成链路已接入品牌级私钥覆盖
  - 品牌增长报告、可视化报告、半年营销规划、小红书营销策划方案、营销日历都会把当前 `brandId` 透传到运行时 Provider 解析
- `WorksModule` 生成链路已接入品牌级私钥覆盖
  - 原创文案、原创配图提示词、二创文案、二创配图提示词、参考图分析、文生图、视频文案、视频提示词、视频成片生成都会优先读取当前品牌私钥
- 严格隔离补充
  - `ReportsModule` 与 `WorksModule` 的品牌级 Key 解析现已改为严格模式：只要命中平台基线，就必须使用该品牌 Owner 的私有 Key
  - 若品牌 Owner 尚未配置对应平台 API Key，会直接返回“请先前往个人中心-第三方接口配置完成设置后再试”的中文提醒

## 8. 2026-05-14 Right Codes 平台补充

- 平台与运行时种子
  - `ApiProviderConfig` 新增 `Right Codes · 文生文（可带图）`
    - 基础地址：`https://www.right.codes/draw`
    - 对应接口：`/v1/chat/completions`
    - 模型白名单：`gpt-5.3-codex`、`gpt-5.4`、`gpt-5.5`、`claude-opus-4-6`、`claude-opus-4-7`、`claude-sonnet-4-6`、`gemini-3.1-pro-preview`、`gemini-3-flash-preview`
  - `ApiProviderConfig` 新增 `Right Codes · 文生图/图生图`
    - 基础地址：`https://www.right.codes/draw`
    - 对应接口：`/v1/images/generations`
    - 模型白名单：`gpt-image-2`、`gpt-image-2-vip`、`nano-banana-2`
  - `ThirdPartyPlatformConfig` 平台引导从“仅空库初始化”改为“自动补齐缺失平台种子”，避免老库里看不到新平台
- 技能中心模型区分
  - `/api/user-skills/editor-options` 现在会返回带 Provider 作用域的模型选项，前端标签格式为 `模型名 · Provider名`
  - 当多个平台存在同名模型时，后台和个人中心技能页都会把选项值保存为 `providerId::modelName`
  - 运行时会先按 `providerId` 命中指定 Provider，再用真实 `modelName` 发起调用，从而把 `Right Codes` 与柏拉图平台的同名模型区分开
- Works 图像生成兼容补充
  - 文生图运行时从“只支持一条 image-generation Provider + chat completion 风格 payload”升级为“支持多个 image-generation Provider”
  - 当 Provider 标记 `requestMode=images-generations` 时，生成链路会改走 `/v1/images/generations` 风格 payload，兼容 `Right Codes`

## 9. 2026-05-15 原创参考图拆解提示词补充

- 用户反馈“添加笔记 -> 创作”时因缺少 `提示词/拆解图片提示词.txt` 而直接报错
- 本次补充：
  - `WorksService.loadImageAnalysisPrompt()` 在外部 txt 缺失时，不再抛出“未找到拆解图片提示词文件”
  - 改为内置回退到默认拆解提示词：
    - `反推出参考图的AI生图中文描述词，要极致详尽涵盖风格、构图、视角、元素，整理成一段连贯的能够指导 AI 作图工具创作类似作品的生图提示词。`
  - 该 fallback 已扩展为更完整的执行说明，覆盖风格、构图、视角、元素、光线、色彩、镜头语言、排版与可迁移视觉特征，避免原创笔记在缺失外部 txt 时中断

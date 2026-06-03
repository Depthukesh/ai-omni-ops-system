# 2026-06-03 公众号工作台正式落地与发布链路补齐

## 背景

- 公众号板块原先只有演示页面和零散说明，未在正式 `docs/` 体系中登记为已落地工作台。
- 本轮代码已经补齐公众号独立页面、配置保存、原创创作、HTML 草稿生成和一键发布入口，但 `docs/site-map.md` 仍写着“公众号尚未独立落地”。
- 用户明确要求按照 `AGENTS.md` 更新正式文档体系，而不是只更新 `.trae` 内部文档。

## 本次调整

### 1. 前台新增独立公众号工作台

- 页面入口：
  - `apps/web/src/app/(dashboard)/wechat/page.tsx`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
- 工作台结构已收口为两个正式板块：
  - 配置页面
  - 原创创作
- 顶部导航已补入独立 `公众号` 入口，前台登录拦截范围同步覆盖 `/wechat`

### 2. 配置页补齐公众号正式配置

- 前端配置页当前只保留：
  - `AppID`
  - `AppSecret`
  - `IP 白名单`
- 对应前端服务：
  - `getWechatAccountConfig`
  - `saveWechatAccountConfig`
- 对应后端接口：
  - `GET /works/brands/:brandId/wechat/config`
  - `POST /works/brands/:brandId/wechat/config`
- 服务端会返回 `appSecretMasked` 供前端掩码回显。
- 若用户本次未重填 `AppSecret`，但品牌下已有旧密钥，保存时会沿用旧值，不强制每次重新填写。

### 3. 原创创作页补齐正式创作链路

- 创作页当前会并行读取：
  - 当前品牌档案
  - 小红书营销日历工作区
  - 公众号配置
  - 公众号文章草稿列表
- 添加原创文章弹窗已收口为：
  - 营销日历下拉
  - 产品信息下拉
  - 品牌资料是否植入
  - 图片生成策略
  - 主题颜色
  - 创作要求
- 对应前端服务：
  - `getWechatArticleDrafts`
  - `generateWechatArticleDraft`
  - `updateWechatArticleDraft`
- 对应后端接口：
  - `GET /works/brands/:brandId/wechat/articles`
  - `POST /works/brands/:brandId/wechat/articles/generate`
  - `PATCH /works/brands/:brandId/wechat/articles/:draftId`
- 生成结果当前固定为 `HTML` 草稿，并在作品记录中保留：
  - 营销日历标签
  - 产品标签
  - 品牌资料标签
  - 主题色
  - 图片任务信息
  - 发布状态

### 4. 技能中心与发布入口同步补齐

- 后台技能中心和前台技能中心当前已补入两个公众号技能叶子项：
  - `公众号-创作文章`
  - `公众号-制作图片`
- 对应技能 slug：
  - `wechat-article-composer`
  - `wechat-image-designer`
- 前端发布服务新增：
  - `publishWechatArticleToOfficialAccount`
- 后端发布接口新增：
  - `POST /publishing/brands/:brandId/wechat/articles/:draftId/publish`
- 发布执行当前通过 `PublishingModule -> WorksModule.publishWechatArticleDraft()` 统一处理：
  - 配置校验
  - 发布任务创建
  - 草稿状态回写为 `PUBLISHED`

### 5. 正式文档体系同步补齐

- 本轮已更新：
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`
- 目的：
  - 把公众号从“未独立落地”修正为“已独立落地正式工作台”
  - 把 `/wechat` 的页面结构、service/API 关系和发布链路补入正式地图

### 6. 权限与创作参数补充修正

- 公众号接口最初误复用了 `personalCenter.works` 权限，导致部分品牌成员进入 `/wechat` 后会提示无权限。
- 本次已新增独立公众号品牌权限：
  - `wechat.config`
  - `wechat.original`
- 当前公众号配置、草稿列表、草稿生成、草稿更新和一键发布分别改为走对应的公众号权限，不再借道“我的作品”权限。
- 原创创作弹窗中的“产品信息”当前已补充 `不植入产品` 选项：
  - 选中后会按“无具体产品植入”生成文章内容
  - 作品卡片也会明确显示 `不植入产品`
- 发布接口补权限校验后，`PublishingController` 新增了 `AuthService` 依赖；本次同步修正 `PublishingModule` 的模块导入，补齐 `AuthModule`，避免生产环境启动时报 `Nest can't resolve dependencies of the PublishingController`。
- 公众号工作台初始加载曾先用默认 `DEMO_BRAND_ID` 发起一次请求，再切换到当前品牌重新加载，导致旧请求失败后把“当前账号无权访问该品牌”残留到页面顶部；本次已改为直接用登录态当前品牌初始化，并在加载 effect 中增加过期请求保护。
- 公众号配置页当前不会再因为品牌档案或小红书营销日历这些辅助数据读取失败而阻塞主页面配置加载。

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/wechat/page.tsx`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/services/publishing.ts`
  - `apps/web/src/services/brand-growth.ts`
  - `apps/web/src/app/(dashboard)/layout.tsx`
  - `apps/web/src/app/(dashboard)/skill-center-config.ts`
- 后端：
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/publishing/publishing.controller.ts`
  - `apps/server/src/modules/publishing/publishing.module.ts`
  - `apps/server/src/modules/publishing/publishing.service.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `packages/shared/src/brand-permissions.ts`
- 文档：
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`
  - 本文档

## 验证

- 已核对真实代码入口与接口：
  - `apps/web/src/app/(dashboard)/wechat/page.tsx`
  - `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - `apps/web/src/services/works.ts`
  - `apps/web/src/services/publishing.ts`
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/publishing/publishing.controller.ts`
  - `apps/server/src/modules/publishing/publishing.service.ts`
- 已核对正式文档基线：
  - `AGENTS.md`
  - `docs/development-delivery-checklist.md`
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
- 本轮为文档补更，不涉及新增代码编译验证；代码编译通过状态沿用上一轮公众号代码提交时的前后端 TypeScript 校验结果。

## 后续关注

- 当前公众号工作台、配置保存、草稿生成和一键发布入口已经落地，但发布内部仍是站内状态流转骨架。
- 若后续继续推进公众号正式发布，需要把当前 `publishWechatArticleDraft()` 内部执行替换为真实公众号官方 API。
- 若公众号后续新增更多板块，如素材管理、草稿箱同步、历史群发记录，还需继续同步更新 `docs/site-map*` 与新的 `docs/changes/*.md`。

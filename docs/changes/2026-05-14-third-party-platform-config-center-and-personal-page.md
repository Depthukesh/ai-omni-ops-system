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

## 6. 2026-05-14 补充修正

- 个人中心“第三方接口配置”页修正了搜索态交互
  - 搜索框增加关闭自动填充，避免浏览器把账号或手机号误填进搜索框后把平台列表过滤成 0 条
  - 当搜索结果为空时，不再把当前选中平台直接清空，避免出现“刚进入页面就整块内容消失”的假空白
  - 页面增加“清空搜索”，便于快速恢复完整平台列表
- 个人中心平台详情不再直接裸露展示 Base URL
  - 顶部摘要去掉 `OPENAI · https://...` 这类长链接文案
  - “第三方平台链接”改为按钮式跳转，不再直接把原始链接文字铺在卡片里
- 后台“接口供应商”平台页补了一轮排版收口
  - 左侧拆成两张卡：`新增平台基线` 与 `平台列表`
  - 原先一整张超长左侧卡片已拆开，避免把右侧详情区挤压得过窄
  - 平台配置表单改为单列字段布局，筛选区也改为单列，降低长表单墙和字段错位问题
  - 右侧详情头部去掉原始 Base URL 长文案，改成更紧凑的更新时间摘要，并补上“第三方平台链接”快捷跳转按钮

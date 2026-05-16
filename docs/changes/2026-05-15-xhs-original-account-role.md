# 小红书原创笔记补充账号角色字段

## 1. 变更背景

- 用户要求在“小红书 -> 原创笔记”的创建弹窗中增加“账号角色”选项，区分 `品牌号 / 员工号 / 达人号`。
- 角色限制需要跟当前团队协作身份联动：管理员可选全部，员工只能选员工号，达人只能选达人号。
- 创作完成后的作品卡片左上角需要直接标注该作品对应的账号角色，避免团队内混淆发布主体。

## 2. 变更目标

- 为原创笔记创建弹窗增加账号角色选择项。
- 让前端可选项与当前团队角色联动收口。
- 将账号角色持久化进原创作品元数据，并回传给前端列表。
- 在原创作品卡片左上角显示 `品牌号 / 员工号 / 达人号` 标记。
- 让原创文案和配图提示词生成也感知账号角色，避免只显示标签而内容人设不匹配。

## 3. 修改内容

### 3.1 前端

- `apps/web/src/app/(dashboard)/xiaohongshu/use-note-composer-forms.ts`
  - 原创笔记表单新增 `originalAccountRoleValue` 状态。
  - 当当前品牌角色变化时，若原选择不再合法，会自动回落到当前允许的默认选项。
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - 根据当前品牌角色生成原创笔记账号角色可选项：
    - `ADMIN -> 品牌号 / 员工号 / 达人号`
    - `STAFF -> 员工号`
    - `TALENT -> 达人号`
  - 将账号角色选项和当前值透传给原创笔记创建弹窗与创作动作。
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - 原创笔记创建弹窗新增“账号角色”下拉框。
- `apps/web/src/app/(dashboard)/xiaohongshu/work-card-grids.tsx`
  - 原创作品卡片左上角新增账号角色徽标，继续保留右上角“原创”标签。
- `apps/web/src/styles/globals.css`
  - 为原创作品卡片补充左上角徽标样式。
- `apps/web/src/services/works.ts`
  - 新增原创账号角色类型与中文格式化方法。
  - 原创生成接口新增 `accountRole` 入参，原创作品返回结构新增 `accountRole` 字段。

### 3.2 后端

- `apps/server/src/modules/works/works.controller.ts`
  - 原创笔记生成接口在完成小红书原创板块权限校验后，把当前品牌协作角色传给 `WorksService`，用于服务端二次约束账号角色选择范围。
- `apps/server/src/modules/works/works.service.ts`
  - `GenerateXiaohongshuOriginalNotePayload` 新增 `accountRole`。
  - `OriginalWorkAssetMeta` 与原创作品返回结构新增 `accountRole`。
  - 新增服务端账号角色收口规则：
    - 管理员默认 `品牌号`，也可显式选择员工号或达人号。
    - 员工若传入非员工号会直接报错。
    - 达人若传入非达人号会直接报错。
  - 原创文案与配图提示词生成输入中新增账号角色上下文，生成链路会按 `品牌号 / 员工号 / 达人号` 调整人设与表达。
  - 历史未带 `accountRole` 的原创作品读取时默认回落为 `品牌号`，避免旧数据直接读失败。

## 4. 影响范围

- 影响页面
  - `/xiaohongshu`
- 影响接口
  - `POST /api/works/brands/:brandId/xiaohongshu/original/generate`
  - `GET /api/works/brands/:brandId/xiaohongshu/original`
- 影响持久化
  - 原创作品 `MediaAsset.metadataJson.kind = XHS_ORIGINAL_NOTE` 结构新增 `accountRole`

## 5. 验证方式

- 诊断验证
  - `GetDiagnostics` 已检查本次核心前后端文件，无新增诊断错误。
- 编译验证
  - `npm run build:web` 通过。
  - `npm run build:server` 通过。
- 手工链路
  - 当前已完成代码链路接入与构建验证。
  - 线上/本地人工复测重点：
    - 管理员打开原创笔记弹窗时可选择品牌号、员工号、达人号。
    - 员工打开原创笔记弹窗时只可选择员工号。
    - 达人打开原创笔记弹窗时只可选择达人号。
    - 创作完成后原创作品卡片左上角显示对应账号角色标记。

## 6. 风险与后续

- 当前账号角色字段先只接入原创笔记；若后续二创笔记、视频笔记也要区分发布主体，需要沿同一元数据结构继续扩展。
- 旧原创作品缺少账号角色字段，当前读取时统一回落为 `品牌号`；若后续需要精确追溯历史发布主体，需要另行补历史数据回填方案。

## 7. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-note-composer-forms.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-work-composer-actions.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/work-card-grids.tsx`
- `apps/web/src/services/works.ts`
- `apps/web/src/styles/globals.css`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/works/works.service.ts`

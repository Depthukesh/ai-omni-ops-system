# 小红书原创/二创笔记营销策划方案植入开关

## 背景

- 小红书 `视频笔记` 创建弹窗已经支持 `植入营销策划方案：是/否`。
- `原创笔记` 和 `二创笔记` 创建弹窗此前没有同类开关，且后端生成链路默认总会注入 `marketingPlanMarkdown`。
- 用户要求在原创和二创的添加笔记界面补齐该选项，选择 `是` 时植入，选择 `否` 时不植入。

## 本次改动

### 1. 前端创建弹窗补齐开关

- `原创笔记` 创建弹窗新增 `植入营销策划方案` 下拉框，取值为 `是/否`。
- `二创笔记` 创建弹窗新增 `植入营销策划方案` 下拉框，取值为 `是/否`。
- 表单默认值统一为 `yes`，保持与 `视频笔记` 现有行为一致。

### 2. 前端提交链路透传 includeMarketingPlan

- `use-note-composer-forms.ts` 新增原创/二创表单状态：
  - `originalInjectMarketingPlanValue`
  - `rewriteInjectMarketingPlanValue`
- `page.tsx`、`note-workspaces.tsx`、`note-create-modals.tsx`、`use-work-composer-actions.ts` 全链路透传该字段。
- 提交请求时把 UI 值 `yes/no` 转换为后端布尔值 `includeMarketingPlan: boolean`。
- `apps/web/src/services/works.ts` 为原创/二创生成接口类型补齐 `includeMarketingPlan` 字段，并把该值写入请求体。

### 3. 后端生成链路按开关控制营销策划方案注入

- `WorksService` 为原创/二创生成 payload 补齐 `includeMarketingPlan?: boolean`。
- 原创文案、原创配图、二创文案、二创配图四条提示词链路统一接收 `includeMarketingPlan`。
- 当 `includeMarketingPlan === false` 时：
  - 不再向提示词传入营销策划方案正文
  - 系统提示词显式约束模型不得吸收营销策划方案中的卖点矩阵、价格、门店、促销、投放口径
- 当 `includeMarketingPlan !== false` 时：
  - 仍允许有限参考营销策划方案
  - 但继续限制不要把价格、促销、门店等口径直接翻写进正文或画面文案

### 4. 关闭植入时放宽营销策划方案前置依赖

- 原创/二创此前无论是否需要植入，都会强制要求先存在 `小红书营销策划方案`。
- 现在仅当用户明确选择 `是` 时，才要求先生成营销策划方案。
- 用户选择 `否` 时，原创/二创可直接基于营销日历、素材库、产品信息、参考图和用户要求继续生成。

### 5. 作品元数据与列表返回补齐

- 原创/二创作品 metadata 已保存 `includeMarketingPlan`，本次补齐读取映射。
- 作品列表返回值现在会明确带出 `includeMarketingPlan`，与 `视频笔记` 保持一致。

## 影响范围

- 页面：`/xiaohongshu`
- 前端文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/use-note-composer-forms.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/use-work-composer-actions.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - `apps/web/src/services/works.ts`
- 后端文件：
  - `apps/server/src/modules/works/works.service.ts`

## 验证

- `GetDiagnostics`:
  - `apps/server/src/modules/works/works.service.ts` 通过
  - `apps/web/src/services/works.ts` 通过
- `npm run build:server` 通过
- `npm run build:web` 通过

## 风险与后续

- 当前仅放宽了原创/二创在 `不植入营销策划方案` 时的前置依赖；营销日历、自定义选题、素材库作品等原有校验保持不变。
- 若后续需要在作品详情页显式展示“本次是否植入营销策划方案”，可直接复用本次已补齐的 `includeMarketingPlan` 返回字段。

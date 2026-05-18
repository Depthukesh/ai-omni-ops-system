# 2026-05-19 小红书原创创建弹窗参考图字段拆分

## 1. 变更背景

- 在完成原创/二创模态挂载层拆分后，`note-create-modals.tsx` 中最厚的局部块变成了原创创建弹窗里的参考图区域
- 这一段同时承接封面模板选择、配图模板多选、本地上传、模板下载应用和错误提示，继续留在 `OriginalCreateModal` 内部会让创建弹窗本体承担过多细节

## 2. 变更目标

- 不改 `OriginalCreateModalProps` 协议，不改原创创建弹窗交互行为
- 只把原创创建弹窗里的“参考模板/本地上传”局部块抽成独立子组件
- 继续减薄 `note-create-modals.tsx`，让它更聚焦原创/二创/视频三类创建弹窗的顶层编排

## 3. 修改内容

### 3.1 新增原创参考图字段子组件

- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-reference-fields.tsx`
  - 新增 `OriginalCreateReferenceFields`
  - 组件内部承接封面参考图与配图参考图的上传区
  - 组件内部承接模板选择器打开状态、模板下载应用和错误提示
  - 继续复用现有 `OriginalReferenceTemplatePicker`

### 3.2 收口原创创建弹窗本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `OriginalCreateModal` 不再直接维护模板选择器相关本地状态
  - 原创创建弹窗中两段参考图上传区改为挂载 `OriginalCreateReferenceFields`
  - `RewriteCreateModal` 与 `VideoCreateModal` 保持原样，不改协议、不改行为

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - `note-create-modals.tsx`
  - `OriginalCreateModal`
  - 内联参考图上传区 + 模板选择器状态
- 进一步推进为：
  - `note-create-modals.tsx`
  - `OriginalCreateModal`
  - `original-create-reference-fields.tsx`
  - `original-reference-template-picker.tsx`

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/original-create-reference-fields.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创创建弹窗的模板选择、本地上传和一键创作行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-create-modals.tsx` 与 `original-create-reference-fields.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前原创创建弹窗里的参考图局部块已拆出，但 `note-create-modals.tsx` 仍同时承接原创、二创、视频三类创建弹窗
- 下一步更合适的方向：
  - 继续进入 `note-create-modals.tsx` 内部拆视频创建弹窗的 provider / 素材局部块
  - 或进入 `note-edit-modals.tsx` 收口原创/二创共用的文本编辑结构

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-reference-fields.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-reference-template-picker.tsx`

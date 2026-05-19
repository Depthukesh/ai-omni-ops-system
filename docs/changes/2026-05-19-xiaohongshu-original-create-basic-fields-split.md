# 2026-05-19 小红书原创创建弹窗头部字段拆分

## 1. 变更背景

- 在完成原创创建弹窗参考图字段拆分后，`note-create-modals.tsx` 中 `OriginalCreateModal` 剩余的主要内联结构变成了头部基础字段区
- 这一段承接营销日历、产品、账号角色和自定义选题输入，继续留在弹窗本体里会让 `OriginalCreateModal` 同时承担壳层职责和字段编排细节
- 若继续沿“小步拆壳”的低风险路线推进，更合适的下一刀就是把这组基础字段也抽成独立子组件

## 2. 变更目标

- 不改 `OriginalCreateModalProps` 协议，不改原创笔记创建流程
- 只把原创创建弹窗里的“头部基础字段区”抽成独立子组件
- 继续减薄 `note-create-modals.tsx`，让 `OriginalCreateModal` 更聚焦弹窗壳层与字段块挂载

## 3. 修改内容

### 3.1 新增原创头部字段子组件

- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-basic-fields.tsx`
  - 新增 `OriginalCreateBasicFields`
  - 组件内部承接营销日历、产品、账号角色和自定义选题字段
  - 继续复用现有 `OriginalCreateModalProps` 中的状态值和事件处理函数

### 3.2 收口原创创建弹窗本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `OriginalCreateModal` 不再直接内联头部基础字段
  - 改为组合 `OriginalCreateBasicFields` 与 `OriginalCreateReferenceFields`
  - 弹窗头部描述、底部动作区和创建行为保持不变

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - `note-create-modals.tsx`
  - `OriginalCreateModal`
  - 头部基础字段 + 参考图字段
- 推进为：
  - `note-create-modals.tsx`
  - `OriginalCreateModal`
  - `original-create-basic-fields.tsx`
  - `original-create-reference-fields.tsx`

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/original-create-basic-fields.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创创建弹窗的字段交互、创建入参与一键创作行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-create-modals.tsx` 与 `original-create-basic-fields.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前原创创建弹窗的头部基础字段区和参考图字段区都已拆出，`note-create-modals.tsx` 进一步向顶层编排壳层收敛
- 下一步更合适的方向：
  - 继续把原创创建弹窗的“配图数量 / 营销策划 / 用户要求”尾部字段再收为局部字段块
  - 或返回其他 workspace 容器层继续推进薄壳化

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-basic-fields.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-reference-fields.tsx`

# 2026-05-19 小红书二创创建弹窗字段拆分

## 1. 变更背景

- 在原创和视频创建弹窗分别完成字段块拆分后，`note-create-modals.tsx` 中剩余最完整的内联创建表单变成了 `RewriteCreateModal`
- 这一段同时承接素材库、产品、账号角色、营销策划方案和用户要求输入，继续留在弹窗本体里会让 `RewriteCreateModal` 同时承担壳层与字段编排职责
- 若继续沿“小步拆壳”的低风险路线推进，更合适的下一刀就是把二创创建弹窗也拆成清晰的字段块

## 2. 变更目标

- 不改 `RewriteCreateModalProps` 协议，不改二创笔记创建流程
- 把二创创建弹窗中的表单字段拆成独立子组件
- 继续减薄 `note-create-modals.tsx`，让 `RewriteCreateModal` 更聚焦弹窗壳层与字段块挂载

## 3. 修改内容

### 3.1 新增二创基础字段子组件

- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-basic-fields.tsx`
  - 新增 `RewriteCreateBasicFields`
  - 组件内部承接素材库、产品和账号角色字段
  - 继续复用现有 `RewriteCreateModalProps` 中的状态值和事件处理函数

### 3.2 新增二创尾部字段子组件

- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-tail-fields.tsx`
  - 新增 `RewriteCreateTailFields`
  - 组件内部承接植入营销策划方案和用户要求字段
  - 继续复用现有 `RewriteCreateModalProps` 中的状态值和事件处理函数

### 3.3 收口二创创建弹窗本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `RewriteCreateModal` 不再直接内联表单字段
  - 改为组合 `RewriteCreateBasicFields` 与 `RewriteCreateTailFields`
  - 弹窗头部描述、底部动作区和创建行为保持不变

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - `note-create-modals.tsx`
  - `RewriteCreateModal`
  - 内联创建字段
- 推进为：
  - `note-create-modals.tsx`
  - `RewriteCreateModal`
  - `rewrite-create-basic-fields.tsx`
  - `rewrite-create-tail-fields.tsx`

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-basic-fields.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-tail-fields.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变二创创建弹窗的字段交互、创建入参与一键创作行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-create-modals.tsx`、`rewrite-create-basic-fields.tsx`、`rewrite-create-tail-fields.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前 `note-create-modals.tsx` 中原创、二创、视频三类创建弹窗都已开始分块收口，文件职责进一步向“顶层编排”收敛
- 下一步更合适的方向：
  - 继续抽 `RewriteCreateModal` 的壳层或与其他创建弹窗对齐更统一的组合结构
  - 或返回 workspace 容器层继续推进薄壳化

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-basic-fields.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-tail-fields.tsx`

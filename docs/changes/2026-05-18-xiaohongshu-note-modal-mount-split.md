# 2026-05-18 小红书原创与二创模态挂载层拆分

## 1. 变更背景

- 在完成 `VideoWorkspace` 模态挂载层拆分后，`note-workspaces.tsx` 中剩余最明显的重复编排变成原创与二创两类模态挂载
- 这两段虽然各自协议不同，但模式一致，继续保留在面板本体里会让原创和二创面板尾部保持较高的参数透传密度

## 2. 变更目标

- 不改 `OriginalEditModal` / `OriginalCreateModal` / `RewriteEditModal` / `RewriteCreateModal` 协议，不改交互行为，只抽离挂载层
- 让原创、二创、视频三类面板的模态挂载模式进一步统一
- 继续减薄 `note-workspaces.tsx`，让它更聚焦列表、状态面板与一级分支编排

## 3. 修改内容

### 3.1 新增原创与二创模态挂载组件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modals.tsx`
  - 新增 `OriginalWorkspaceModals`
  - 新增 `RewriteWorkspaceModals`
  - 通过 `editModalProps` 与 `createModalProps` 收口原创、二创模态挂载参数

### 3.2 收口原创与二创面板尾部编排

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - 原创面板不再直接内联挂载 `OriginalEditModal` 与 `OriginalCreateModal`
  - 二创面板不再直接内联挂载 `RewriteEditModal` 与 `RewriteCreateModal`
  - 改为统一挂载 `OriginalWorkspaceModals` 与 `RewriteWorkspaceModals`

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - note 面板
  - 原创/二创模态挂载层内联
  - 视频模态挂载组件
- 进一步推进为：
  - note 面板
  - 原创/二创模态挂载组件
  - 视频模态挂载组件

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modals.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创工作区现有模态交互和任务行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-workspaces.tsx` 与 `note-workspace-modals.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前已把原创、二创、视频三类模态挂载层都抽出，但模态本体仍集中在 `note-create-modals.tsx` 与 `note-edit-modals.tsx`
- 下一步更合适的方向：
  - 进入 `note-edit-modals.tsx` / `note-create-modals.tsx` 内部继续拆视频或原创模板相关局部块
  - 或转向更外围的共享类型与 helper 收敛

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modals.tsx`

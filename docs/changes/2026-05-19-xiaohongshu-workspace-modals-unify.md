# 2026-05-19 小红书工作区模态挂载层统一收口

## 1. 变更背景

- `note-workspace-modals.tsx` 当前承接原创与二创面板的编辑弹窗、创建弹窗挂载
- `video-workspace-modals.tsx` 当前单独承接视频面板的编辑弹窗、创建弹窗挂载
- 三类 `WorkspaceModals` 的实现形态已经完全一致，但仍分散在两个文件中维护，结构上还可以继续向“统一挂载层 + 兼容导出层”收敛

## 2. 变更目标

- 不改 `OriginalWorkspaceModalsProps`、`RewriteWorkspaceModalsProps`、`VideoWorkspaceModalsProps` 协议
- 不改 `note-workspaces.tsx` 中三类面板的接线方式
- 把三类 `WorkspaceModals` 的真实挂载实现统一收口到一个文件，保留旧导入面不变

## 3. 修改内容

### 3.1 统一三类模态挂载实现

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modals.tsx`
  - 新增泛型 `WorkspaceModalMount`
  - 统一承接 `OriginalWorkspaceModals`
  - 统一承接 `RewriteWorkspaceModals`
  - 新增承接 `VideoWorkspaceModals`

### 3.2 收口视频模态挂载文件

- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-modals.tsx`
  - 不再直接定义 `VideoWorkspaceModals`
  - 改为从 `note-workspace-modals.tsx` re-export `VideoWorkspaceModals` 与对应类型
  - 外部调用点继续维持原有导入路径，不需要同步修改

## 4. 修改意图

- 这一步继续沿“薄壳化 + 收口导出层”的低风险路线推进
- 让三类 note 面板的模态挂载实现真正落到同一处维护
- 同时保留原来的视频导入路径，避免把这一步重构扩散到调用层

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modals.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-modals.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创、视频三类面板的弹窗显示与交互流程

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-workspace-modals.tsx`、`video-workspace-modals.tsx`
- `npm run build:web`
  - 确认前端构建通过，统一挂载层未引入编译回归

## 7. 风险与后续

- 当前三类 `WorkspaceModals` 已统一到同一实现文件，`video-workspace-modals.tsx` 已收敛为兼容导出层
- 下一步更自然的方向：
  - 继续回到 `note-workspaces.tsx`，收口三段 `editModalProps/createModalProps` 的参数装配
  - 或继续向更细粒度的 modal props builder 拆分

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-modals.tsx`

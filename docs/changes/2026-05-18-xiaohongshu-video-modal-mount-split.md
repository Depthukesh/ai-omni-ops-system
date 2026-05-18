# 2026-05-18 小红书视频模态挂载层拆分

## 1. 变更背景

- 在完成 `VideoWorkspace` 详情区拆分后，`note-workspaces.tsx` 中剩余较明显的一段重复编排是视频编辑弹窗与视频创建弹窗的挂载层
- 这部分虽然没有继续堆表单实现，但仍然让 `VideoWorkspace` 在面板尾部保留了一大段 props 传递代码

## 2. 变更目标

- 不改 `VideoEditModal` / `VideoCreateModal` 协议、不改交互行为，只把视频模态挂载层继续抽到独立组件
- 让 `VideoWorkspace` 更聚焦列表、详情区和一级显示判断
- 为后续继续处理原创/二创模态挂载层，或进一步统一 note 面板局部编排保留稳定范式

## 3. 修改内容

### 3.1 新增视频模态挂载组件

- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-modals.tsx`
  - 承接 `VideoEditModal`
  - 承接 `VideoCreateModal`
  - 通过 `editModalProps` 与 `createModalProps` 收口视频模态挂载参数

### 3.2 收口 VideoWorkspace 尾部编排

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - 不再直接内联挂载 `VideoEditModal` 与 `VideoCreateModal`
  - 改为挂载 `VideoWorkspaceModals`

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - 叶子 container
  - note 面板
  - 视频详情子组件
  - 视频模态挂载层内联
- 进一步推进为：
  - 叶子 container
  - note 面板
  - 视频详情子组件
  - 视频模态挂载组件

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-modals.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变视频工作区现有模态交互和任务行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-workspaces.tsx` 与 `video-workspace-modals.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前只收口了视频模态挂载层，原创/二创模态挂载仍在 `note-workspaces.tsx` 内
- 下一步更合适的方向：
  - 继续统一原创/二创模态挂载层
  - 或进入 `note-edit-modals.tsx` / `note-create-modals.tsx` 内部，对视频模态本体做局部拆分

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-modals.tsx`

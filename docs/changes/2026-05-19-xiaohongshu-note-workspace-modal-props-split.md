# 2026-05-19 小红书工作区模态参数装配拆分

## 1. 变更背景

- `note-workspaces.tsx` 当前已经把模态挂载实现收口到 `note-workspace-modals.tsx`
- 但原创、二创、视频三个面板里仍然分别内联维护大段 `editModalProps` / `createModalProps` 对象装配
- 这些参数装配本身属于纯映射逻辑，继续留在面板组件里会稀释工作区本体的展示与编排职责

## 2. 变更目标

- 不改三类 `WorkspaceProps` 协议
- 不改 `OriginalWorkspaceModals`、`RewriteWorkspaceModals`、`VideoWorkspaceModals` 的 props 协议
- 把三类模态参数装配抽到独立 builder 文件，让 `note-workspaces.tsx` 更聚焦工作区视图编排

## 3. 修改内容

### 3.1 新增模态参数装配 builder

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modal-props.ts`
  - 新增 `buildOriginalWorkspaceModalProps()`
  - 新增 `buildRewriteWorkspaceModalProps()`
  - 新增 `buildVideoWorkspaceModalProps()`
  - 统一承接三类工作区到模态挂载层的 props 映射

### 3.2 收口工作区面板本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - 不再内联三类模态的超长对象字面量
  - 改为调用对应 builder 并透传给 `OriginalWorkspaceModals`、`RewriteWorkspaceModals`、`VideoWorkspaceModals`

## 4. 修改意图

- 继续沿“小步快跑、纯映射外移”的低风险路线推进
- 让 `note-workspaces.tsx` 更聚焦头部、状态区、列表区和详情区编排
- 把可复用、可单测、可独立阅读的 modal props 映射逻辑沉降到专门文件

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modal-props.ts`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创、视频三类工作区的模态打开、关闭、编辑和创作流程

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-workspaces.tsx`、`note-workspace-modal-props.ts`
- `npm run build:web`
  - 确认前端构建通过，参数装配拆分未引入编译回归

## 7. 风险与后续

- 当前工作区面板已经不再直接承担三类模态 props 细节装配
- 下一步更自然的方向：
  - 继续拆 `VideoWorkspace` 里的阶段按钮可用性派生
  - 或继续把工作区列表/空态差异逻辑向更细粒度展示层沉降

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-modal-props.ts`

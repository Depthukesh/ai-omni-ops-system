# 2026-05-19 小红书视频工作区详情区参数装配拆分

## 1. 变更背景

- `VideoWorkspace` 当前已经把阶段按钮可用性派生抽到 `video-workspace-stage-flags.ts`
- 但 `note-workspaces.tsx` 中仍然内联维护 `VideoWorkspaceDetailPanel` 的整段 props 装配
- 这段装配本身属于纯映射逻辑，继续放在工作区组件里会让面板本体承担过多细节

## 2. 变更目标

- 不改 `VideoWorkspaceProps` 协议
- 不改 `VideoWorkspaceDetailPanelProps` 协议
- 把视频详情区 props 装配抽到独立 builder，让 `VideoWorkspace` 更聚焦列表、详情挂载和模态编排

## 3. 修改内容

### 3.1 新增详情区参数装配 builder

- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-props.ts`
  - 新增 `buildVideoWorkspaceDetailPanelProps()`
  - 统一承接 `VideoWorkspace` 到 `VideoWorkspaceDetailPanel` 的 props 映射

### 3.2 收口视频工作区面板本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - 不再内联维护 `VideoWorkspaceDetailPanel` 的大段 props 透传
  - 改为调用 `buildVideoWorkspaceDetailPanelProps()` 完成详情区挂载

## 4. 修改意图

- 继续沿“纯装配逻辑外移”的低风险路线推进
- 让 `VideoWorkspace` 更聚焦选择态、列表态与详情区的顶层编排
- 把详情区参数映射规则集中到单独文件，便于后续继续减薄工作区面板

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-props.ts`
- 不影响接口协议
- 不影响数据库结构
- 不改变视频详情区展示、按钮行为与预览链路

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-workspaces.tsx`、`video-workspace-detail-props.ts`
- `npm run build:web`
  - 确认前端构建通过，详情区 props 装配拆分未引入编译回归

## 7. 风险与后续

- 当前 `VideoWorkspace` 已不再直接承担详情区 props 细节装配
- 下一步更自然的方向：
  - 继续收口 `VideoWorkspace` 的详情区挂载判断
  - 或回到原创/二创工作区，继续抽离空态与列表态差异展示

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-props.ts`

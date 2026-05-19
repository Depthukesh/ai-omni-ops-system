# 2026-05-19 小红书视频工作区阶段按钮派生拆分

## 1. 变更背景

- `note-workspaces.tsx` 中的 `VideoWorkspace` 当前已经把详情展示区和模态参数装配分别拆到独立文件
- 但视频详情区仍在面板本体内联维护 `canRegenerateStoryboard`、`canGenerateVideo`、`canRecoverVideo` 三个阶段按钮可用性派生
- 这组派生属于纯前端状态判断逻辑，继续留在工作区组件里会让 `VideoWorkspace` 承担过多细节

## 2. 变更目标

- 不改 `VideoWorkspaceProps` 协议
- 不改 `VideoWorkspaceDetailPanel` 的 props 协议
- 把视频详情区阶段按钮可用性派生抽到独立 helper，让 `VideoWorkspace` 更聚焦视图编排

## 3. 修改内容

### 3.1 新增阶段派生 helper

- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-stage-flags.ts`
  - 新增 `getVideoWorkspaceStageFlags()`
  - 统一承接 `canRegenerateStoryboard`
  - 统一承接 `canGenerateVideo`
  - 统一承接 `canRecoverVideo`

### 3.2 收口视频工作区面板本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - 不再内联三段视频阶段按钮可用性判断
  - 改为调用 `getVideoWorkspaceStageFlags(selectedItem)` 并把返回值透传给详情区

## 4. 修改意图

- 继续沿“纯派生逻辑外移”的低风险路线推进
- 让 `VideoWorkspace` 更聚焦列表、详情和模态三块编排
- 把视频阶段按钮可用性规则集中到一个更易阅读和后续维护的位置

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-stage-flags.ts`
- 不影响接口协议
- 不影响数据库结构
- 不改变视频笔记详情区“修改故事板 / 生成短视频 / 找回视频结果”按钮的启用规则

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-workspaces.tsx`、`video-workspace-stage-flags.ts`
- `npm run build:web`
  - 确认前端构建通过，阶段派生拆分未引入编译回归

## 7. 风险与后续

- 当前视频工作区的阶段按钮可用性派生已经不再内联写在面板组件中
- 下一步更自然的方向：
  - 继续收口 `VideoWorkspace` 的详情区 props 装配
  - 或继续向空态/列表态展示层做更细粒度拆分

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-stage-flags.ts`

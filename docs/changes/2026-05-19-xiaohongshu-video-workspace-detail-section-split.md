# 2026-05-19 小红书视频工作区详情区挂载层拆分

## 1. 变更背景

- `VideoWorkspace` 当前已经把阶段按钮可用性派生与详情区 props 装配分别拆到独立文件
- 但 `note-workspaces.tsx` 中仍然保留 `selectedItem ? <VideoWorkspaceDetailPanel ... /> : null` 这一段详情区挂载判断
- 这块逻辑虽然不复杂，但依然把“选择态判断 + 详情区挂载”留在工作区本体里，仍有继续减薄空间

## 2. 变更目标

- 不改 `VideoWorkspaceProps` 协议
- 不改 `VideoWorkspaceDetailPanelProps` 协议
- 把视频详情区的挂载判断与内部装配再抽一层，让 `note-workspaces.tsx` 更聚焦工作区主布局编排

## 3. 修改内容

### 3.1 新增详情区挂载组件

- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-section.tsx`
  - 新增 `VideoWorkspaceDetailSection`
  - 内部承接 `selectedWork` 判空
  - 内部调用 `getVideoWorkspaceStageFlags()`
  - 内部调用 `buildVideoWorkspaceDetailPanelProps()`
  - 最终统一挂载 `VideoWorkspaceDetailPanel`

### 3.2 收口视频工作区面板本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - 不再内联维护视频详情区的判空与挂载逻辑
  - 改为直接挂载 `VideoWorkspaceDetailSection`

## 4. 修改意图

- 继续沿“逐层减薄工作区面板本体”的低风险路线推进
- 让 `VideoWorkspace` 更聚焦状态面板、列表区和模态区的一级编排
- 把视频详情区的选择态判断、阶段派生和详情区装配集中到更内聚的模块中

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-section.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变视频工作区详情面板的展示和交互行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-workspaces.tsx`、`video-workspace-detail-section.tsx`
- `npm run build:web`
  - 确认前端构建通过，详情区挂载拆分未引入编译回归

## 7. 风险与后续

- 当前 `VideoWorkspace` 已经不再直接承担详情区判空与挂载细节
- 下一步更自然的方向：
  - 回到原创/二创工作区，继续拆空态和列表态展示差异
  - 或继续向更统一的 note workspace 子区块组件收口

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-section.tsx`

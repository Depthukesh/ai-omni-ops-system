# 2026-05-18 小红书视频详情面板拆分

## 1. 变更背景

- 在完成 `note-workspaces.tsx` 共享展示块拆分后，原创和二创面板已经明显收薄，但 `VideoWorkspace` 内部仍然保留一整段偏厚的详情区
- 这段详情区同时承接视频阶段状态、故事板提示词编辑、故事板图片、最终短视频、修改记录和动作按钮，继续堆在 `note-workspaces.tsx` 中会抬高阅读和维护成本

## 2. 变更目标

- 不改 `VideoWorkspace` props 协议、不改现有交互行为，只把视频详情区继续拆成独立子组件
- 让 `note-workspaces.tsx` 更聚焦原创、二创、视频三个面板的一级编排
- 为后续继续拆视频阶段区域或抽离共性媒体展示块保留更清晰边界

## 3. 修改内容

### 3.1 新增视频详情子组件

- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-panel.tsx`
  - 承接视频详情区头部状态
  - 承接进度步骤卡片
  - 承接创意剧本、故事板提示词、故事板图片、最终短视频展示
  - 承接故事板修改记录与动作按钮
  - 收口仅在详情区内部使用的阶段文案与状态 helper

### 3.2 收口 VideoWorkspace 一级编排

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `VideoWorkspace` 中只保留详情区的显示判断与子组件挂载
  - 不再内联整段视频详情区 JSX 与本地 helper

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - 叶子 container
  - note 面板
  - 视频详情区内联实现
- 进一步推进为：
  - 叶子 container
  - note 面板
  - 视频详情子组件

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-panel.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变视频工作区现有交互、阶段状态和任务行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-workspaces.tsx` 与 `video-workspace-detail-panel.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前视频详情区已经独立，但视频卡片区和视频编辑弹窗仍然与 `note-workspaces.tsx` 同文件维护
- 下一步更合适的方向：
  - 继续拆 `VideoEditModal` / `VideoCreateModal` 周边编排
  - 或把原创、二创、视频三类面板剩余差异结构进一步细分到更稳定的局部组件

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-detail-panel.tsx`

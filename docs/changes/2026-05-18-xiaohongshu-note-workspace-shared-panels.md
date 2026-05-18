# 2026-05-18 小红书笔记面板共享展示块拆分

## 1. 变更背景

- 在完成原创、二创、视频三个叶子 `SectionContainer` 拆分后，`note-workspaces.tsx` 虽然不再承担外层装配职责，但文件内部仍然保留了大量重复的展示结构
- 其中最明显的是三类工作区重复出现的顶部工具栏、创作任务状态面板，以及原创/二创共用的发布状态面板

## 2. 变更目标

- 不改面板 props 协议、不改交互行为，只抽离 `note-workspaces.tsx` 中重复的展示块
- 继续减薄 note 面板本体，让原创、二创、视频三个工作区更聚焦各自差异化内容
- 为后续继续拆 `VideoWorkspace` 详情区或统一卡片/模态编排保留更清晰的结构边界

## 3. 修改内容

### 3.1 新增共享展示组件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-shared-panels.tsx`
  - 新增 `WorkspaceSectionHeader`
  - 新增 `ComposeTaskStatusPanel`
  - 新增 `PublishTaskStatusPanel`

### 3.2 收口 note 面板重复结构

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - 原创、二创、视频三个工作区统一改为复用共享头部组件
  - 原创、二创、视频三个工作区统一改为复用创作任务状态面板
  - 原创、二创两个工作区统一改为复用发布状态面板
  - 三类工作区仍保留各自列表、详情区、编辑弹窗和创建弹窗的差异化部分

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - 叶子 container
  - note 面板
- 进一步推进为：
  - 叶子 container
  - note 面板共享展示块
  - 原创/二创/视频差异化内容

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-shared-panels.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创、视频工作区现有交互和任务行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查共享展示组件与 `note-workspaces.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前只收口了最明显的重复展示块，`VideoWorkspace` 中的详情面板、阶段状态展示和故事板区域仍然偏厚
- 下一步更合适的方向：
  - 继续拆 `VideoWorkspace` 详情区为独立子组件
  - 或把原创/二创/视频卡片区和模态区再进一步下沉到更细粒度组件

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-shared-panels.tsx`

# 2026-05-18 小红书笔记 Section 路由与集合出口拆分

## 1. 变更背景

- 在完成 `note-workspace-section-props.ts` 后，`workspace-shell.tsx` 虽然已经不再内联三大段超长 props 拼装，但仍保留：
  - 原创/二创/视频三类 section props 的集合出口
  - note section 的路由判断
- 这使得壳层仍然要直接关心“哪个 note section 用哪个面板组件”，还没有完全退回到“顶层编排壳”的职责边界

## 2. 变更目标

- 不改面板组件协议、不改交互行为，只把 note section 的集合出口与路由判断继续搬出 `workspace-shell.tsx`
- 让壳层更接近“营销策划 / 素材库 / 营销日历 / 笔记 section 容器”的一级装配
- 为后续继续抽原创、二创、视频各自的独立 section container 保留更清晰的落点

## 3. 修改内容

### 3.1 扩展笔记 section props helper

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
  - 新增 `buildNoteWorkspaceSectionsProps()`
  - 统一返回：
    - `originalWorkspaceProps`
    - `rewriteWorkspaceProps`
    - `videoWorkspaceProps`

### 3.2 新增笔记 section 路由层

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-sections.tsx`
  - 新增 `NoteWorkspaceSections`
  - 统一承接原创、二创、视频三类面板的分发渲染

### 3.3 继续精简工作区壳层

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - 改为通过 `buildNoteWorkspaceSectionsProps()` 统一拿到三类 note section props
  - `renderSectionCard()` 中不再直接写原创/二创/视频三个分支，而是交给 `NoteWorkspaceSections`

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的策略
- 壳层减少直接依赖 `OriginalWorkspace / RewriteWorkspace / VideoWorkspace` 的细节，有利于下一步把 note section 真正推进到独立 container
- 也让小红书工作区更接近“顶层壳 + 子工作区容器”的分层模型

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-sections.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创、视频工作区现有交互和任务行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查壳层、section props helper 与新 section 路由层
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前只是把 note section 的集合出口与路由判断继续搬出壳层，还没有触碰 `note-workspaces.tsx` 本体
- 下一步更合适的方向：
  - 继续把原创/二创/视频各自的动作包装和局部联动收口到独立 section container
  - 再评估营销策划 / 营销日历是否也补同类的二级 section 路由与 props 集合层

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-sections.tsx`

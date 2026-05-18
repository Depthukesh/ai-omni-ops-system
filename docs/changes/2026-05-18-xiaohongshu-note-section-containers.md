# 2026-05-18 小红书笔记 Section Container 拆分

## 1. 变更背景

- 在完成 `note-workspace-section-props.ts` 和 `note-workspace-sections.tsx` 后，`workspace-shell.tsx` 虽然已经不再直接维护 note section 的分支渲染，但仍然保留了大量原创、二创、视频三类 section 的状态装配、动作包装和 props 集合出口
- 这意味着壳层仍在深度感知 note section 的局部实现细节，还没有真正退回到“顶层工作区编排壳”

## 2. 变更目标

- 不改面板组件协议、不改交互行为，只把原创、二创、视频三类笔记 section 的 container 层继续从 `workspace-shell.tsx` 搬出
- 让壳层只负责把当前 section、全局共享状态和 grouped hooks 交给 note section 容器
- 为后续进一步抽 `OriginalWorkspaceSectionContainer`、`RewriteWorkspaceSectionContainer`、`VideoWorkspaceSectionContainer` 预留稳定边界

## 3. 修改内容

### 3.1 新增 note section container 层

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-containers.tsx`
  - 新增 `NoteWorkspaceSectionContainers`
  - 统一承接原创、二创、视频三类 section 的：
    - 局部选中态派生
    - 打开弹窗与编辑动作包装
    - section props 组装
    - 二级路由分发到 `NoteWorkspaceSections`

### 3.2 精简工作区壳层

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - 保留 `composerForms`、`workEditors`、`workComposerActions`、`workspaceTasks`、`workMutationActions` 作为 grouped hooks 输出
  - 不再在壳层里内联三类 note section 的超长 props 集合出口
  - `renderSectionCard()` 中改为把 grouped hooks 和少量共享数据交给 `NoteWorkspaceSectionContainers`

## 4. 修改意图

- 这一步继续遵循“小步拆壳、保持协议稳定”的策略
- 壳层减少对 note section 局部交互细节的直接感知，页面结构更接近：
  - 顶层壳
  - 板块级 container
  - 面板组件
- 也为后续继续把 note section 内部动作或状态再做细分提供稳定中间层

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-containers.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创、视频工作区现有交互和任务行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查壳层与新 note section container 文件
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前只是把 note section 的 container 层搬出壳层，`note-workspaces.tsx` 本体与内部面板结构仍保持不变
- 下一步更合适的方向：
  - 继续把原创、二创、视频三类面板各自拆成独立 `Original/Rewrite/VideoWorkspaceSectionContainer`
  - 或转入 `brand-growth/workspace.tsx`，按同样套路开始第二个重工作区拆壳

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-containers.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-sections.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`

# 2026-05-18 小红书原创/二创/视频 Section Props 装配拆分

## 1. 变更背景

- 小红书工作区完成薄入口、加载编排 Hook 和任务轮询 Hook 拆分后，`workspace-shell.tsx` 里仍保留三大段原创、二创、视频 section 的超长 props 装配
- 虽然 `OriginalWorkspace`、`RewriteWorkspace`、`VideoWorkspace` 已经是独立面板，但壳层仍承担了大量 section 级参数拼装和动作包装
- 这会继续拖高 `renderSectionCard()` 的阅读和维护成本，不利于下一步继续拆 section 容器

## 2. 变更目标

- 不改面板组件协议、不改交互行为，只把原创/二创/视频 section 的 props 装配从壳层抽到独立 helper 文件
- 让 `workspace-shell.tsx` 里的 `renderSectionCard()` 更接近“路由到哪个 section 就渲染哪个 section”
- 为后续继续拆原创、二创、视频各自的局部状态或 feature 容器预留更清晰边界

## 3. 修改内容

### 3.1 新增 section props builder

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
  - 新增 `buildOriginalWorkspaceProps()`
  - 新增 `buildRewriteWorkspaceProps()`
  - 新增 `buildVideoWorkspaceProps()`
  - 统一承接原创/二创/视频三类面板的 props 拼装、发布弹窗参数包装、取消任务动作绑定以及视频面板的局部字段联动

### 3.2 精简工作区壳层

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - 删除 `renderSectionCard()` 内三大段原创、二创、视频面板的内联 props 组装
  - 改为先构造 `originalWorkspaceProps / rewriteWorkspaceProps / videoWorkspaceProps`
  - `renderSectionCard()` 中仅保留 `<OriginalWorkspace {...originalWorkspaceProps} />` 这类薄渲染入口

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不改协议”的低风险重构方式
- 当前先拆 section props 装配层，比直接改动面板组件本体或创作动作链路风险更低
- 后续若要继续抽 `OriginalWorkspaceSectionContainer`、`RewriteWorkspaceSectionContainer`、`VideoWorkspaceSectionContainer`，可以直接在这一步的边界上继续收敛

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创、视频工作区的现有交互和任务行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查壳层和新的 section props helper 文件
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前只是把三大笔记 section 的 props 装配搬离壳层，section 自身面板组件与局部交互还没有继续 feature 化
- 下一步更合适的方向：
  - 继续把原创/二创/视频面板各自的动作包装和本地联动拆成更细的 section container
  - 评估是否把营销策划/营销日历也按类似方式补上独立 section props builder

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`

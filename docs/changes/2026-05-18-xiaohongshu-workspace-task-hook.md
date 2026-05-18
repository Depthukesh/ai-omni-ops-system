# 2026-05-18 小红书工作区任务轮询与状态派生 Hook 拆分

## 1. 变更背景

- 小红书工作区在完成薄入口和加载编排拆分后，`workspace-shell.tsx` 里仍保留一大段“任务轮询 + 任务状态派生”逻辑
- 这部分同时混着营销策划方案、营销日历、原创、二创、视频和发布任务的最新状态判断，不利于继续拆 section 容器
- 按 `docs/system-refactor-roadmap.md` 的阶段 B，这一层更适合继续下沉为独立 hook

## 2. 变更目标

- 不改业务协议、不改任务状态语义，只把任务轮询与状态拼装从壳层抽离
- 让 `workspace-shell.tsx` 更专注于 section 装配、事件分发和局部交互
- 为后续继续抽 `useWorkspaceAsyncState` 或更细的 feature 容器保留更稳定的边界

## 3. 修改内容

### 3.1 新增任务编排 Hook

- `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-tasks.ts`
  - 统一承接营销策划方案、营销日历、原创、二创、视频和发布任务的最新记录派生
  - 统一承接 `isTaskActive`、失败内联错误、状态文案、取消中态和发布任务映射
  - 统一在 hook 内触发营销策划方案、营销日历与作品任务的延迟轮询刷新

### 3.2 精简工作区壳层

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - 删除壳层内联的 `findLatestTaskByTypes + useDelayedTaskPolling + 状态文本拼装` 代码
  - 改为消费 `useXiaohongshuWorkspaceTasks()` 的派生结果
  - 保持现有 section props 结构基本不变，不调整页面交互和后端接口

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险重构策略
- 把任务相关编排集中后，后续再拆原创、二创、视频 section 时不需要重复搬运轮询逻辑
- 也让通用任务轮询 hook 的收口路径更明确：`task-polling.ts` 继续提供底层能力，页面专属 hook 负责业务派生

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-tasks.ts`
- 不影响接口协议
- 不影响数据库结构
- 不改变现有任务状态展示、自动刷新和取消任务行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查壳层和新 hook 的 TypeScript 诊断
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前只是把任务相关编排抽出，壳层中仍保留较多 section 级本地状态和交互处理
- 下一步更合适的方向：
  - 继续按原创/二创/视频拆 section 容器或局部状态 hook
  - 评估把品牌增长工作区的同类任务派生也收口成对应 hook

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-loader.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-tasks.ts`

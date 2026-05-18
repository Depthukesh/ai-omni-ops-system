# 2026-05-18 小红书工作区加载编排 Hook 拆分

## 1. 变更背景

- 上一步已经把 `/xiaohongshu` 路由入口收成薄文件，但 `workspace-shell.tsx` 里仍然堆着品牌上下文校正、权限门卫、聚合加载和局部刷新逻辑
- 这几段异步编排已经成为壳层里最重、最不利于继续拆 section 容器的部分
- 按 `docs/system-refactor-roadmap.md` 的阶段 B，下一步应继续把副作用和加载逻辑下沉到独立 hook

## 2. 变更目标

- 不改业务协议、不改页面交互，只把工作区加载 orchestration 从壳层中抽离
- 让 `workspace-shell.tsx` 更聚焦视图装配、状态组合和事件分发
- 为后续继续抽 `useBrandContextGate`、通用任务轮询和更细 feature 容器保留稳定边界

## 3. 修改内容

### 3.1 新增加载编排 Hook

- `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-loader.ts`
  - 抽出 `resolveActiveBrandId`
  - 抽出 `loadWorkspace`
  - 抽出 `reloadOriginalReferenceTemplates`
  - 抽出 `refreshMarketingPlanWorkspace`
  - 抽出 `refreshCalendarWorkspace`
  - 统一承接品牌上下文校正、权限读取、聚合请求、错误消息与局部刷新逻辑

### 3.2 精简工作区壳层

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - 删除壳层内联的大段加载函数
  - 改为消费 `useXiaohongshuWorkspaceLoader()` 返回的动作
  - 保留现有 state、section 渲染、创建/编辑/发布等业务装配，不改变外部行为

## 4. 修改意图

- 这一步仍然属于低风险结构收口，不调整已有 service 协议和页面状态语义
- 先把“工作区加载逻辑”独立出来，后续再拆 section 容器和更细的状态 hook 时，会明显更稳
- 把壳层从“既管视图又管所有异步流程”收口为“视图装配 + 状态消费”，符合前端页面只做入口编排的规则

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-loader.ts`
- 不影响接口协议
- 不影响数据库结构
- 不改变现有权限拦截、工作区加载和局部刷新行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `workspace-shell.tsx` 与新 hook 文件的 TypeScript 诊断
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前只是把加载编排抽出，尚未把大量 `useState` 和 section 级衍生数据进一步收口
- `workspace-shell.tsx` 仍然保留较多本地状态和派生计算，后续还可继续拆：
  - `useWorkspaceAsyncState`
  - `useBrandContextGate`
  - section 级 feature 容器
- 下一步更合适的方向：
  - 继续抽任务轮询和任务状态映射
  - 再推进 `brand-growth/workspace.tsx` 的同类加载 hook 收口

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-xiaohongshu-workspace-loader.ts`
- `docs/changes/2026-05-18-xiaohongshu-workspace-shell-split.md`

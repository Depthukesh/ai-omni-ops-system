# 2026-05-18 小红书工作台薄入口拆壳

## 1. 变更背景

- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx` 长期同时承载工作区初始化、权限闸门、任务轮询、作品编排和弹窗挂载
- 该文件已经是 `docs/engineering-standards.md` 与 `docs/system-refactor-roadmap.md` 明确标记的 P1 拆分对象
- 在继续拆分小红书各子工作区之前，需要先把路由入口和实际编排层分开，降低后续结构演进的改动半径

## 2. 变更目标

- 先完成阶段 B 的第一步：把 `/xiaohongshu` 路由入口收成薄文件
- 在不改业务协议、不改交互逻辑的前提下，把原页面编排逻辑整体下沉到独立壳层文件
- 为后续继续拆 `useTaskPolling`、权限闸门和各 section feature 容器预留稳定落点

## 3. 修改内容

### 3.1 路由入口薄化

- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - 不再直接承载整页业务状态与 JSX 编排
  - 当前仅负责引入并返回 `XiaohongshuWorkspaceShell`

### 3.2 新增工作区壳层

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - 承接原 `page.tsx` 的完整客户端编排逻辑
  - 保留现有品牌上下文校正、权限拦截、工作区聚合加载、轮询、副作用、弹窗和各 section 装配
  - 本次仅做结构迁移，不调整现有业务行为和接口调用

## 4. 修改意图

- 先做“机械拆壳”，避免在同一次改动中同时引入逻辑重组风险
- 让 `/xiaohongshu` 后续继续拆 section 容器、公共 hook 和共享能力时，不再反复改动路由入口文件
- 把“入口层”和“编排层”边界先固定下来，后续再继续推进 feature 化

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变现有小红书工作台交互和权限逻辑

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `page.tsx` 与 `workspace-shell.tsx` 的 TypeScript 诊断
- `npm run build:web`
  - 确认拆壳后前端构建仍通过

## 7. 风险与后续

- 当前只是“壳层拆分”，并未继续把任务轮询、权限门卫和 section 容器再下沉到更细粒度 hook / feature 目录
- `workspace-shell.tsx` 仍然偏大，后续应继续沿路线图拆出：
  - `useBrandContextGate`
  - `useWorkspaceAsyncState`
  - 小红书各 section 独立容器
- 下一步更合适的方向：
  - 继续拆小红书壳层内部的轮询与加载编排
  - 再推进 `brand-growth/workspace.tsx` 的同类拆壳

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
- `docs/system-refactor-roadmap.md`

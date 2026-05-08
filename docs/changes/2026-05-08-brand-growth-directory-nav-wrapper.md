# 2026-05-08 品牌增长页目录导航结构收口

## 1. 变更背景

- `brand-growth/workspace.tsx` 左侧一级导航和三级导航虽然已经切到目录式视觉语言，但按钮节点仍直接平铺在 `aside` 下
- 为了让目录式导航结构和样式挂载点更稳定，需要补一层统一的按钮列表容器

## 2. 变更目标

- 收口品牌增长页左侧目录导航的 DOM 结构
- 为目录式导航样式提供更稳定的包裹层，不改动现有页面切换逻辑

## 3. 修改内容

- 更新 `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- 为一级目录和三级目录都补上 `strategy-level-button-list` 容器
- 为对应 `aside` 补上 `strategy-level-panel--directory` 类名
- 保留现有 `switchSection`、`switchPage` 和激活态逻辑不变

## 4. 影响范围

- 仅影响 `/brand-growth` 左侧目录导航的 DOM 包裹结构与样式挂载点
- 不影响品牌资料库、收集数据、品牌增长报告三个板块的业务数据与交互逻辑

## 5. 验证方式

- `GetDiagnostics` 检查 `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- 人工核对 diff，确认仅为目录导航包裹结构调整，没有引入业务逻辑变更

## 6. 风险与后续

- 当前改动仅收口结构层，若后续继续调整目录导航样式，可直接复用新的列表容器
- 若后续品牌增长页继续做导航视觉优化，可把样式规则统一下沉到共享壳层

# 2026-05-06 开发规范与代码收敛基线

## 1. 变更背景

- 随着小红书原创、二创、视频笔记、电脑端发布、手机接力等链路持续增加，代码规模已经明显上升
- 当前代码里已经出现超大页面、超大 service、扩展协议重复、环境变量散读、资源外链失效等问题
- 如果不尽快建立规范，后续越开发越容易偏离既有边界，导致可维护性下降和错误增多

## 2. 变更目标

- 输出一份后续开发可直接执行的工程规范文档
- 基于当前代码现状，明确哪些能力需要收敛、抽象、复用与限制
- 为后续重构和新功能开发建立统一基线

## 3. 修改内容

### 3.1 文档

- 新增 `docs/engineering-standards.md`
- 将当前前端、后端、扩展、资源、文档与 Git 规则统一沉淀为规范

### 3.2 第一轮代码收敛

- 新增后端全局 `AppConfigModule` 与 `AppConfigService`
- 将 `publishing.service.ts` 和 `works.service.ts` 中分散的 URL、端口、Web/API 基地址解析收口到统一配置服务
- 同步补齐 `.env.example` 中当前发布链路与飞书授权链路常用但未显式列出的环境变量

### 3.3 第二轮代码收敛

- 将小红书工作台中“电脑端发布桥接”相关的协议探测、消息监听、启动发布逻辑抽离为独立 `desktop-publish-bridge.ts`
- 页面文件继续保留业务编排，但不再直接承载整段扩展桥接细节

### 3.4 第三轮代码收敛

- 新增通用 `task-polling.ts`
- 将小红书工作台中营销方案、营销日历、原创笔记、二创笔记、视频笔记、发布任务的重复轮询逻辑统一收口
- 页面内不再保留 6 段重复的 `useEffect + setTimeout + taskStatus` 轮询模板

### 3.5 第四轮代码收敛

- 新增 `use-publish-flow.ts`
- 将小红书工作台中的发布弹窗状态、电脑端发布、手机接力二维码、发布完成回写等逻辑抽为独立 hook
- 新增 `publish-types.ts`，把发布目标类型从页面文件中独立出来

### 3.6 第五轮代码收敛

- 新增 `use-note-composer-forms.ts`
- 将原创、二创、视频三套创作表单的状态、重置逻辑、打开关闭逻辑从页面文件中抽为统一 hook
- 页面文件继续保留创作提交编排，但不再直接承载大段表单状态初始化代码

### 3.7 第六轮代码收敛

- 新增 `use-work-editors.ts`
- 将原创、二创、视频三套作品编辑弹窗的状态、开始编辑、取消编辑等逻辑从页面文件中抽为统一 hook
- 页面文件继续保留保存接口调用与作品列表更新，但不再直接承载大段编辑状态初始化逻辑

### 3.8 第七轮代码收敛

- 新增 `use-work-composer-actions.ts`
- 将原创、二创、视频三套作品创建时的参数校验、接口调用、提交中状态、列表回写、编辑态清理与提示文案从页面文件中抽为统一 hook
- 页面文件继续保留弹窗展示与卡片渲染，但不再直接承载三大段创作提交流程

### 3.9 本次评估纳入的重点范围

- 前端页面与 service
- 浏览器扩展工作台桥接与创作者页自动化
- 后端 controller、service、配置读取、异常处理
- 作品资源保存与发布链路

## 4. 修改意图

- 当前最需要的不是继续堆功能，而是把“如何写、写到哪、什么时候抽、什么时候记文档”固定下来
- 规范文档既是新开发的边界说明，也是后续重构的优先级清单
- 通过文档先统一规则，再逐步做代码收敛，比零散修补更稳

## 5. 影响范围

- 影响后续所有前端、后端、扩展相关开发
- 影响 `publishing`、`works` 两个热点模块的配置读取方式
- 影响小红书工作台中桌面发布桥接逻辑的组织方式
- 影响小红书工作台中任务轮询逻辑的组织方式
- 影响小红书工作台中发布弹窗状态与发布动作的组织方式
- 影响小红书工作台中原创/二创/视频创作表单状态的组织方式
- 影响小红书工作台中原创/二创/视频创作提交流程的组织方式
- 影响小红书工作台中原创/二创/视频编辑弹窗状态的组织方式
- 不直接修改线上业务逻辑，但会影响后续开发时的默认落点和审查标准
- 不影响已有数据库数据

## 6. 验证方式

- 人工复核当前代码热点
- 按前端与后端两个方向分别做结构评估
- 将评估结果转化为稳定规则并落入 `docs/`
- `GetDiagnostics` 检查新增配置模块与已改服务文件
- `npm run build:server` 通过
- `GetDiagnostics` 检查 `desktop-publish-bridge.ts` 与 `xiaohongshu/page.tsx`
- `npm run build:web` 通过
- `GetDiagnostics` 检查 `task-polling.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `use-publish-flow.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `use-note-composer-forms.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `use-work-editors.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过
- `GetDiagnostics` 检查 `use-work-composer-actions.ts` 与 `xiaohongshu/page.tsx`
- 再次执行 `npm run build:web` 通过

## 7. 风险与后续

- 规范文档已经落地，但代码本身仍需要分阶段按 P0/P1/P2 逐步整改
- 若后续开发不按文档执行，仍可能继续产生重复实现和结构膨胀
- 下一阶段建议优先处理配置收口、共享协议、资源本站缓存和页面拆分
- 当前只先收口了 `publishing` 与 `works` 的配置读取，其他模块仍需继续迁移
- `xiaohongshu/page.tsx` 体量仍然很大，本次只先切出了发布桥接热点，后续还需继续拆任务轮询、作品弹窗和表单状态
- 当前虽然已抽出发布桥接、任务轮询、发布状态机、创作表单状态、创作提交流程和编辑弹窗状态，但页面仍保留大量卡片渲染与分区视图逻辑，后续应继续按“卡片渲染分区、营销方案工作区子组件”两个方向拆分

## 8. 相关文件

- `docs/engineering-standards.md`
- `docs/README.md`
- `apps/server/src/config/app-config.module.ts`
- `apps/server/src/config/app-config.service.ts`
- `apps/server/src/modules/publishing/publishing.service.ts`
- `apps/server/src/modules/works/works.service.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/desktop-publish-bridge.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/publish-types.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-publish-flow.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/task-polling.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-note-composer-forms.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-work-composer-actions.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-work-editors.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `.env.example`

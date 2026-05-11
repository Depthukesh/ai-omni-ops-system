# 2026-05-11 后台接口供应商配置中心补齐

## 1. 背景

- 后台 `接口供应商` 页面原先只支持维护 `名称 / 类型 / Base URL / 模型白名单 / 密钥占位`
- 用户希望把所有第三方接口设置统一放到这里，至少能维护：
  - 名称
  - API 接口链接
  - 教程文档链接
  - API Key
  - 相关真实参数
- 原后端 `admin/api-providers` 仍主要依赖 `mock-data`，无法保证配置真正持久化

## 2. 本次处理

- 扩展后台接口供应商配置字段：
  - `tutorialUrl`
  - `apiKey`
  - `defaultModel`
  - `organization`
  - `project`
  - `timeoutMs`
  - `streamEnabled`
  - `customHeaders`
  - `extraParams`
  - `remark`
- 将后台接口供应商页的创建表单和编辑表单同步补齐为真实配置项
- 后端 `ApiProvidersService` 改为“数据库优先、mock 兜底”：
  - 数据库可用时自动创建 `ApiProviderConfig` 表
  - 首次命中时自动把 `mock-data` 中的默认 Provider 回填进表
  - 数据库不可用时仍回退到内存演示数据
- 前端对 `自定义 Headers` 和 `扩展参数` 增加 JSON 对象校验，避免保存非法结构
- 保留原有的状态、模型白名单、调用量、成功率、成本等运营观察信息
- 新增统一系统 Provider catalog，将用户提供的第三方接口资料结构化为系统默认种子，并作为后台初始化真源
- `ApiProvidersService` 新增运行时读取能力：
  - 按 `runtimeKey` 查询激活中的 Provider
  - 读取多 Base URL、多 API Key、运行时标签、扩展参数
  - 首次初始化时清理旧的 legacy demo provider，改写为真实第三方模型配置
- `ReportsService` 生成链路已切到后台 Provider 真源，不再继续依赖旧 demo provider
- `WorksService` 以下链路已切到后台 Provider 真源：
  - 原创笔记文案
  - 原创笔记配图提示词
  - 二创笔记文案
  - 二创笔记配图提示词
  - 参考图分析
  - 图像生成
  - 视频笔记文案
  - 视频提示词
  - 视频成片生成
- 新增视频 Provider 选项接口，前端小红书视频创作弹窗改为动态读取后台当前启用的视频模型列表，不再写死 `hailuo / kling / veo / wan / seedance2.0`
- 补齐本地稳定前端 `3001` 的 `/api` rewrite，保证浏览器端同域 `/api/*` 请求可正确转发到 `3011`
- 修复 mock fallback 模式下的权限错误：演示账号原本在 `mock-data` 中是 `SUPER_ADMIN`，但登录返回与请求鉴权被错误降级成 `USER`，现已改为沿用用户真实 `systemRole`
- 本地联调已额外验证一轮：后台更新视频 Provider 的 `extraParams.displayLabel` 后，`/works/.../video/providers` 与前端视频弹窗下拉会同步变化
- GitHub Actions 的 `Deploy To Aliyun ECS` 在本轮推送后失败于 `Deploy via SSH`，已对 `.github/workflows/deploy.yml` 补充更细粒度的部署日志与失败诊断：
  - 每个远端步骤单独输出时间戳和命令名
  - 失败时自动回显监听端口、`pm2 status`、最近 `pm2 logs`
  - 健康检查失败时额外打印 `curl -i` 响应，便于判断是服务未启动、反向代理异常还是接口返回 5xx
- 基于增强日志继续定位后，确认 `127.0.0.1:3011/api/health` 已通过，真正不稳定的是前端 `3001` 根页面探活；已新增前端独立健康检查路由 `/health`，并将部署探活切换到 `http://127.0.0.1:3001/health`
- 为进一步缩短故障尾部日志，部署脚本再次减噪：
  - `pm2 logs` 仅保留最近 40 行
  - `wait_for_http` 只在最终失败时打印一次完整 `curl -i` 响应
  - 在前后端探活前增加明确的步骤标记，方便直接判断卡在 `3011` 还是 `3001/health`
- 继续抓取 Run 20 原始日志后，确认自动部署的真实阻塞点不是探活，而是 `npm run prisma:db:push`：
  - 远端 Prisma 报告将删除非空表 `ApiProviderConfig`（3 行），因此拒绝继续执行
  - 根因是 `prisma/schema.prisma` 尚未声明 `ApiProviderConfig`，`db push` 将其误判为应清理的未知表
  - 已将 `ApiProviderConfig` 补入 Prisma schema，避免后续部署把运行时 Provider 真源当成待删除表
- 后台 `接口供应商` 页继续做了第二轮交互整理，避免 Provider 数量增加后再次变成长表单墙：
  - 新增供应商搜索框，可按名称、模型、Base URL、备注收敛列表
  - 新增状态筛选与类型筛选，并显示当前结果数与状态分布
  - API Key 默认遮挡显示，创建表单和编辑卡片都支持单独切换“显示 / 隐藏”
  - `自定义 Headers` / `扩展参数` 默认折叠为摘要，按需展开编辑 JSON
  - 空结果时提供明确提示，避免筛选后出现“空白但不知道原因”

## 3. 影响文件

- `apps/server/src/common/api-provider-catalog.ts`
- `apps/web/src/app/(dashboard)/admin/page.tsx`
- `apps/web/src/styles/globals.css`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-note-composer-forms.ts`
- `apps/web/src/services/admin.ts`
- `apps/web/src/services/works.ts`
- `apps/server/src/modules/admin/api-providers.module.ts`
- `apps/server/src/modules/admin/api-providers.service.ts`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/common/mock-data.ts`
- `apps/server/src/modules/reports/reports.module.ts`
- `apps/server/src/modules/reports/reports.service.ts`
- `apps/server/src/modules/works/works.controller.ts`
- `apps/server/src/modules/works/works.module.ts`
- `apps/server/src/modules/works/works.service.ts`
- `apps/web/next.config.ts`
- `apps/web/src/app/health/route.ts`
- `.github/workflows/deploy.yml`
- `prisma/schema.prisma`

## 4. 验证结果

- `npm --workspace apps/server run build` 通过
- `npm --workspace apps/web run build` 通过
- `npm run build:server` 通过
- `GetDiagnostics` 检查本次改动文件，无新增诊断报错
- 本轮后台 `接口供应商` 页面二次改造后，再次执行 `npm --workspace apps/web run build` 通过
- `npm run prisma:generate` 本地未完成：Windows 下 `node_modules/.prisma/client/query_engine-windows.dll.node` 重命名遇到 `EPERM` 文件锁，未发现 schema 语法错误
- 本地联调验证通过：
  - `http://127.0.0.1:3001/api/works/brands/br_demo_001/xiaohongshu/video/providers` 可正确代理到 `3011`
  - 后台更新 `provider_runtime_video_hailuo` 的展示标签后，接口返回值随即同步变化；回滚后恢复正常
- GitHub 推送已成功到 `origin/main`，但本轮自动部署失败在 `Deploy via SSH`；现已定位到真实故障点为 `prisma db push` 误删 `ApiProviderConfig` 的数据丢失保护

## 5. 当前边界

- 后台 `接口供应商` 现已不仅是展示配置页，而是报告链路与小红书创作链路的统一运行时真源
- 当前前端动态同步仅补到“小红书视频笔记的视频模型选项”；若后续还要把原创/二创/报告页也暴露成可选模型 UI，可继续在相同模式上扩展
- 历史任务统计与 `model-usage` 仍以任务记录聚合为主，不等同于“代码中全部可调用模型清单”；如需单独做“模型使用总览页”，后续可基于 runtimeKey 再补一层展示
- 当前本地环境仍未连接 `127.0.0.1:5432` PostgreSQL，联调主要基于 `mock-data` 回退模式完成；但本轮已确保 mock 模式下后台权限与 Provider 同步链路可正常验证
- 线上 `17ai.site` 当前仍停留在上一版；需待后续部署成功后，再复验后台 Provider 与前端视频模型同步是否已在线上生效

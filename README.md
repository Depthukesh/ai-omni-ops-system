# AI全域运营系统

## 项目结构

- `apps/web`: 用户前台与管理后台前端
- `apps/server`: NestJS 风格后端服务
- `packages/shared`: 前后端共享类型与常量
- `packages/prompt-runtime`: 技能与提示词运行时
- `packages/ui`: 可复用 UI 组件预留
- `prisma`: 数据库模型与迁移
- `docs`: 项目补充文档
- `infra`: 部署与基础设施配置预留

## 当前状态

当前仓库已完成第一版 monorepo 项目骨架初始化，后续将按规划文档继续补充：

1. Prisma 正式 schema
2. 前端路由与页面骨架
3. 后端模块、DTO、Service、Controller
4. 任务队列与模型网关

## 数据库初始化

1. 复制 `.env.example` 为 `.env`，补上 `DATABASE_URL`
2. 生成 Prisma Client:
   - `npm run prisma:generate`
3. 推送数据库结构:
   - `npm run prisma:db:push`
4. 写入演示数据:
   - `npm run prisma:seed`

如果想一步完成，可直接执行：

- `npm run db:init`

## 当前 demo 数据

- 演示账号手机号: `13800000000`
- 演示品牌: `武汉仟吉`
- 已写入品牌背景、产品资料、品牌调研、品牌账号、竞品账号、行业资料、经营资料

## 本地前端稳定启动

- 常规启动: `npm run dev:web`
- 稳定启动: `npm run dev:web:stable`
- `dev:web:stable` 会直接使用 `node + next bin` 拉起 `3001`，避免 `npx` 偶发退出
- 启动成功后会输出页面地址 `http://localhost:3001/brand-growth`
- 日志写入 `.runtime/web-3001.out.log` 和 `.runtime/web-3001.err.log`

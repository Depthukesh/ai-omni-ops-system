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

当前仓库已经不是“第一版骨架”，而是一个已接通前后台主链路的业务系统，当前已落地的核心能力包括：

1. 邀请码注册、登录、品牌切换与多用户协作基础能力
2. 品牌增长策略工作台：品牌资料库、收集数据、品牌增长报告、半年营销规划、营销日历
3. 小红书工作台：营销策划方案、素材库、原创笔记、二创笔记、视频笔记
4. 抖音工作台：营销策划方案、素材库、热点找选题、选题库、原创文案、二创文案、AI生视频（故事板）
5. 后台与前台技能中心、提示词注册表、品牌级共享覆盖
6. 任务中心、作品中心、第三方平台配置与 OSS 资源持久化

更完整的页面、模块和主链路说明请查看：

- `docs/site-map.md`
- `docs/README.md`

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

# 2026-08-23 Docker 标准运行态首启 db-init 与默认演示品牌收口

## 1. 背景

在另一台新笔记本按 README 直接执行：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml up -d --build postgres server web
```

后，登录页可以打开，但提交 `13800000000 / 123456` 会返回 `500 Internal server error`。

进一步排查发现：

- `web -> server` 容器网络是通的
- `/api/health` 正常
- `/api/auth/login` 在后端内部抛错
- 日志明确提示 `public.User`、`public.MediaAsset`、`public.BusinessAsset` 等表不存在

这说明原有 Docker 标准运行态安装说明只负责“把容器拉起来”，但没有把首次安装必须完成的数据库初始化收进主链。

## 2. 真实原因

原先的 compose 启动链只有：

- `postgres`
- `server`
- `web`

缺少以下步骤：

1. `prisma generate`
2. `prisma db push`
3. 注册邀请码同步
4. 最小演示账号与默认品牌补齐

因此新机器第一次启动时，`server` 已经开始提供登录接口，但底层表结构根本还没创建，最终表现为登录即 500。

## 3. 本次收口

### 3.1 新增标准运行态专用初始化脚本

新增：

- `scripts/seed-standard-runtime.cjs`

职责：

- 只为 Docker 标准运行态补最小可用数据
- 同步注册邀请码
- 缺失时创建演示账号 `13800000000 / 123456`
- 缺失时创建默认演示品牌
- 已存在数据时只补缺，不重置用户业务数据

配套根脚本：

- `package.json`
  - `prisma:seed:standard`
  - `db:init:standard`

### 3.2 compose 主链补 one-shot `db-init`

更新：

- `docker/docker-compose.local-postgres.yml`

新增 `db-init` one-shot 服务，并让 `server` 显式依赖：

- `postgres: service_healthy`
- `db-init: service_completed_successfully`

这样首启命令仍然保持不变：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml up -d --build postgres server web
```

但执行路径已经变成：

1. PostgreSQL 健康
2. `db-init` 建表 + 补最小数据
3. `server` 再启动
4. `web` 再接入代理

### 3.3 默认演示品牌改为通用口径

更新：

- `scripts/seed-demo.cjs`
- `apps/server/src/common/mock-data.ts`
- `README.md`

把原先写死的具体品牌名 `武汉仟吉` 收口为：

- `默认演示品牌`

同时把演示品牌账号文案改成通用表达，避免新安装环境一上来就带具体商家口径。

## 4. 影响范围

### 4.1 影响到的链路

- Docker 标准运行态首次安装
- 演示账号首次登录
- fallback/mock 数据里的默认品牌展示

### 4.2 这次刻意避免的副作用

- 没有把破坏性 `seed-demo` 塞进 `server` 每次启动链
- 没有让每次重启都重置品牌背景或演示账号密码
- 没有改动 local-single-user 的默认品牌逻辑

## 5. 验证建议

至少验证：

1. 新机器空 PostgreSQL 数据目录下，直接执行 README 的 compose 命令
2. 等待 `db-init` 成功后访问 `/login`
3. 使用 `13800000000 / 123456` 登录成功
4. 再次执行 `docker compose up -d postgres server web`，确认不会把已有品牌资料重置回默认演示品牌

## 6. 后续建议

- 如果标准运行态后续不再需要任何演示账号，可把 `db-init` 继续收口为“只建表 + 引导注册”
- 如果仍保留演示账号，后续推荐把账号口径、默认品牌口径和 README 说明统一抽成共享常量，避免 mock / seed / 文档再次分叉
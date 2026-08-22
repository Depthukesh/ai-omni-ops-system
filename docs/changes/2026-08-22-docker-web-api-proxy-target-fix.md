# 2026-08-22 Docker web API 代理目标修复

## 背景

在 Docker 本地部署场景下，`ai-omni-web` 虽然能正常打开 `http://127.0.0.1:13001/login`，但登录提交时会返回：

- `上游服务暂时不可用（API 代理失败）：fetch failed`

排查确认：

- `ai-omni-server` 实际健康可用，`http://127.0.0.1:13011/api/health` 返回 `200`
- 问题不在后端挂掉，而在 `apps/web/src/app/api/[...path]/route.ts` 的代理基址解析逻辑
- 当 `INTERNAL_API_BASE_URL` / `API_PROXY_TARGET` 未显式配置时，Next 代理会回退到 `http://127.0.0.1:3011/api`
- 该地址在 `web` 容器内部实际指向的是 `web` 容器自己，而不是 `server` 容器，所以所有站内 API 代理都会失败

## 本次改动

### 1. 给 Docker web 容器显式注入内部 API 代理目标

- `docker/docker-compose.local-postgres-mixedcut.yml`
  - 为 `web` 服务新增：
    - `INTERNAL_API_BASE_URL=http://server:3011/api`
    - `API_PROXY_TARGET=http://server:3011/api`

### 2. 给 Docker 环境模板补默认值

- `.env.docker.example`
  - 新增：
    - `INTERNAL_API_BASE_URL=http://server:3011/api`
    - `API_PROXY_TARGET=http://server:3011/api`

## 影响范围

- Docker 本地部署下的主站登录与所有 `/api/*` 代理请求
- `13001 -> web -> server` 容器内转发链路

本次没有修改：

- 业务 API 协议
- 数据库结构
- mixedcut 模型同步逻辑

## 验证

- `http://127.0.0.1:13011/api/health` 返回 `200`
- 确认 `apps/web/src/app/api/[...path]/route.ts` 代理逻辑优先读取 `INTERNAL_API_BASE_URL / API_PROXY_TARGET`
- 重建 `ai-omni-web` 后，应重新验证：
  - `http://127.0.0.1:13001/login`
  - 登录提交是否仍返回 `API 代理失败`
  - 登录后是否能进入工作台并打开个人中心第三方接口配置

## 当前边界

- 这次先修 Docker 容器内代理目标，目的是恢复主站登录与第三方接口配置入口
- 若登录后仍有业务接口异常，再继续按具体接口排查品牌、鉴权或种子数据问题

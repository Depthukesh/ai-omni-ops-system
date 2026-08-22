# 2026-08-22 mixedcut 容器模板兜底与健康检查修复

## 背景

在 Docker + PostgreSQL + mixedcut 本地部署推进到运行态联调时，`ai-omni-mixedcut` 容器虽然已经成功构建并启动，但根路由 `/` 持续返回 `500`，容器健康检查也因此一直处于 `unhealthy`。

现场日志确认根因不是挂载或配置同步，而是 mixedcut 样本前端模板不完整：

- `frontend/app.py` 根路由仍尝试渲染 `home.html`
- 404/500 错误处理仍尝试渲染 `404.html` / `500.html`
- 当前仓库实际只带了 `frontend/templates/remix.html`

这会导致：

1. 用户直接访问 mixedcut 服务地址时报 `500`
2. Docker `HEALTHCHECK` 命中 `/` 时持续失败
3. 错误处理器本身也依赖缺失模板，异常页无法兜底

## 本次改动

### 1. 把 mixedcut 根路由收口到现有可用的混剪页面

- `workspace-notes/mixedcut_integration_bundle/frontend/app.py`
  - 将 `/` 从渲染不存在的 `home.html` 改为直接跳转 `/remix`

### 2. 让 404 / 500 不再依赖缺失模板

- `workspace-notes/mixedcut_integration_bundle/frontend/app.py`
  - 404 错误处理改为返回内联 HTML
  - 500 错误处理改为返回内联 HTML

这样即使后续再命中缺失页面模板，也不会因为错误页模板本身缺失而再次把异常放大。

### 3. 把 Docker 健康检查切到稳定接口

- `workspace-notes/mixedcut_integration_bundle/Dockerfile`
  - `HEALTHCHECK` 从 `GET /` 改为 `GET /api/health`

这样容器健康判断不再依赖页面模板，而是依赖 mixedcut 已存在且稳定的 API 健康端点。

## 影响范围

- mixedcut Docker 运行态
- mixedcut 容器健康检查策略
- mixedcut 根入口访问体验

本次没有修改：

- 主站前后端 API 协议
- mixedcut 模型同步协议
- PostgreSQL / Prisma 结构

## 验证

- `python -m py_compile workspace-notes/mixedcut_integration_bundle/frontend/app.py`
- `docker compose --env-file ".env.docker.example" -f "docker/docker-compose.local-postgres-mixedcut.yml" up -d --build mixedcut`
- 访问 `http://127.0.0.1:15000/`
  - 当前已能正常跳转并返回 `200`
- 访问 `http://127.0.0.1:15000/api/health`
  - 返回 `200` 与 `{"status":"ok", ...}`
- `docker inspect ai-omni-mixedcut --format "{{json .State.Health}}"`
  - 当前已变为 `healthy`

## 当前边界

- mixedcut 样本仓库当前仍只有 `remix.html` 一个实际模板页面，`editor / projects / materials / settings` 等旧路由仍可能命中缺失模板
- 本次先优先修复用户直达入口和 Docker 健康检查，保证 mixedcut 容器可用、可验活
- 如果后续要继续把 mixedcut 作为完整 Web 工具长期维护，建议再做一轮页面入口收口，统一到真实存在的模板集合

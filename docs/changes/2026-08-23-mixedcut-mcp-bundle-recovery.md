# 2026-08-23 mixedcut-mcp 仓库构建链恢复

## 1. 背景

另一台新机器已经拉到新的 `mixedcut_integration_bundle/` 路径后，再执行：

```powershell
docker compose -f docker/docker-compose.local-postgres-mixedcut.yml --profile mixedcut build mixedcut mixedcut-mcp
```

`mixedcut` 主服务可以进入构建，但 `mixedcut-mcp` 会直接失败：

```text
failed to read dockerfile: open Dockerfile.mcp: no such file or directory
```

## 2. 真实原因

这次已经不是 `workspace-notes` 私有路径问题，而是仓库里的 `mixedcut_integration_bundle/` 仍然缺少 `mixedcut-mcp` 自身的最小运行文件：

- `Dockerfile.mcp`
- 独立 MCP 运行入口
- 与主应用隔离的 MCP 依赖清单

结果是：

- `docker/docker-compose.local-postgres-mixedcut.yml` 已经引用了 `Dockerfile.mcp`
- 但仓库里实际没有这个文件
- 新机器 `git clone` 后自然无法构建 `mixedcut-mcp`

## 3. 本次收口

### 3.1 补回独立的 MCP 运行文件

在 `mixedcut_integration_bundle/` 新增：

- `mcp_server.py`
- `requirements-mcp.txt`
- `Dockerfile.mcp`

其中 `mcp_server.py` 当前提供一层最小 HTTP MCP bridge，直接代理 mixedcut 主服务现有 API，至少补齐：

- `get_service_health`
- `list_projects`
- `upload_video_file`
- `create_remix_task`
- `get_task_progress`

### 3.2 维持双容器依赖隔离

`mixedcut-mcp` 继续作为独立容器运行，不再复用主应用的整包 Python 依赖，避免把：

- `zhipuai`
- `mcp`

这类先前已经明确存在版本耦合风险的依赖重新绑回同一个镜像里。

### 3.3 文档口径同步

同步更新：

- `README.md`
- `docs/README.md`
- `docs/docker-postgresql-mixedcut-local-deployment-plan.md`
- `mixedcut_integration_bundle/README.md`

明确当前仓库自带的是“可直接构建的 HTTP MCP bridge”，不再让安装说明继续引用仓库里并不存在的 Docker 运行文件。

## 4. 影响范围

- `mixedcut_integration_bundle/`
- `docker/docker-compose.local-postgres-mixedcut.yml`
- Docker 标准运行态 mixedcut 扩展安装
- 仓库 mixedcut 交付文档

## 5. 验证建议

至少验证：

1. `python -m py_compile mixedcut_integration_bundle/mcp_server.py`
2. `docker compose -f docker/docker-compose.local-postgres-mixedcut.yml --profile mixedcut build mixedcut-mcp`
3. `docker compose -f docker/docker-compose.local-postgres-mixedcut.yml --profile mixedcut up -d --no-build mixedcut mixedcut-mcp`
4. 访问 `http://127.0.0.1:15501/mcp` 进行 MCP 客户端握手

## 6. 后续建议

- 如果后续确实要恢复 mixedcut 自带的“安装令牌 + JSON 配置生成”完整体验，应把对应设置页模板与鉴权逻辑一起收回仓库，而不是只保留 README 说明。
- 当前这次收口优先解决的是“公开仓库 clone 后，mixedcut-mcp 至少可以被真实构建和启动”。

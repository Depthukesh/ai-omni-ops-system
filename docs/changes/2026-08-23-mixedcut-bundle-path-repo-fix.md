# 2026-08-23 mixedcut 构建源码从 workspace-notes 收口到仓库正式目录

## 1. 背景

在另一台新机器上按 README 执行：

```powershell
docker compose -f docker/docker-compose.local-postgres-mixedcut.yml --profile mixedcut up -d --build mixedcut mixedcut-mcp
```

会直接报错：

```text
unable to prepare context: path "D:\\ai-omni-ops-system\\workspace-notes\\mixedcut_integration_bundle" not found
```

## 2. 真实原因

`docker/docker-compose.local-postgres-mixedcut.yml` 里的 mixedcut / mixedcut-mcp 构建上下文仍然指向：

- `workspace-notes/mixedcut_integration_bundle`

但：

- `workspace-notes/` 已被 `.gitignore` 整体排除
- GitHub 公开仓库不会带上这段目录
- 新机器 `git clone` 后当然就找不到 mixedcut 构建源码

所以这不是 mixedcut 服务本身的运行时错误，而是仓库安装链的构建真源放错了位置。

## 3. 本次收口

### 3.1 构建真源迁回仓库正式目录

将 mixedcut 构建源码补齐到仓库内正式目录：

- `mixedcut_integration_bundle/`

该目录现在既承接：

- mixedcut 镜像构建源码
- mixedcut MCP 镜像构建源码
- mixedcut 运行时配置目录 `config/`

### 3.2 compose 改为引用正式目录

更新：

- `docker/docker-compose.local-postgres-mixedcut.yml`

把 mixedcut 与 mixedcut-mcp 的 `build.context` 从：

- `../workspace-notes/mixedcut_integration_bundle`

改成：

- `../mixedcut_integration_bundle`

### 3.3 README 与部署方案文档同步

更新：

- `README.md`
- `docs/docker-postgresql-mixedcut-local-deployment-plan.md`

明确说明：

- 新机器 `git clone` 后即可直接构建 mixedcut
- 不再依赖当前开发机的私有 `workspace-notes` 样本目录

## 4. 影响范围

- Docker 标准运行态 mixedcut 首次安装
- mixedcut MCP 首次安装
- README 的 mixedcut 安装口径

## 5. 验证建议

至少验证：

1. `git clone` 到一台不带 `workspace-notes/` 历史现场的新机器
2. 执行：

```powershell
docker compose -f docker/docker-compose.local-postgres-mixedcut.yml --profile mixedcut up -d --build mixedcut mixedcut-mcp
```

3. 确认不再出现 `workspace-notes/mixedcut_integration_bundle not found`

## 6. 后续建议

- mixedcut 若继续在主仓库长期维护，后续可以进一步把目录命名从 `mixedcut_integration_bundle` 收口成更明确的 `apps/mixedcut` 或 `services/mixedcut`
- 历史 `workspace-notes` 中的 mixedcut 说明稿后续只保留分析用途，不再作为 Docker 构建真源
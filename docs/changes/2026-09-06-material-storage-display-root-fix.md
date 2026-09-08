# 2026-09-06 素材存储展示路径修正

## 背景

在 `standard + Docker + STORAGE_PROVIDER_MODE=local` 口径下，素材真实会写到容器内：

- `MATERIAL_LIBRARY_BASE_ROOT`
- `MANAGED_STORAGE_ROOT`

再通过宿主机 bind mount 映射到本地目录。

但页面里展示“存储位置”时，当前默认展示根目录仍写死成：

- `D:\AiOmniOpsData\materials`
- `D:\AiOmniOpsData\storage`

这会带来两个问题：

1. 对当前 Docker 本地标准运行态来说，这两个 Windows 路径默认并不一定真实存在
2. 当服务端运行在 Linux 容器里时，Node 的 `path.resolve()` 会把 `D:\...` 当成相对路径，最终错误显示成 `/app/D:\AiOmniOpsData\...`

## 本次改动

### 1. 修正展示路径解析

更新：

- `apps/server/src/config/app-config.service.ts`
- `apps/server/src/storage/oss-storage.service.ts`

处理规则调整为：

- 对真实写盘根目录，仍按当前运行环境做标准绝对路径解析
- 对仅用于页面展示的 Windows 绝对路径字面量，不再在 Linux 容器里错误 `resolve` 成 `/app/D:\...`
- 展示路径拼接改为保留用户可读的宿主机路径格式，而不是复用真实文件系统解析逻辑

### 2. 修正 Docker 本地标准运行态的默认展示根目录

更新：

- `docker/docker-compose.local-postgres.yml`

把默认展示路径从：

- `D:\AiOmniOpsData\materials`
- `D:\AiOmniOpsData\storage`

改成当前仓库默认 Docker bind mount 实际对应的相对目录：

- `docker/local-data/materials`
- `docker/local-data/storage`

这样在未额外配置自定义展示根目录时，页面展示会和当前仓库默认宿主机目录保持一致。

## 当前这台机器的真实落点

本次核查到当前运行容器 `ai-omni-server` 的实际挂载关系为：

- 容器内 `/data`
- 宿主机 `D:\王笑东\aiproject\AI全域运营\AI全域智能体\local-ai-omni-ops-system\docker\local-data`

因此当前素材真实主要落在：

- `docker/local-data/storage/...`
- `docker/local-data/materials/...`

其中截图里那类作品记录：

- `works/<brandId>/openclaw/creative-materials/...`

实际位于宿主机：

- `docker/local-data/storage/works/<brandId>/openclaw/creative-materials/...`

## 验证

- `docker inspect ai-omni-server`
- 检查宿主机目录 `docker/local-data/storage`
- `pnpm --filter server build`

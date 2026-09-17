# 2026-09-17 标准 Docker 首装改为可选本地 ASR 依赖

## 背景

在新机器执行标准安装命令时：

```powershell
docker compose -f "docker/docker-compose.local-postgres.yml" up -d --build --force-recreate db-init server web
```

`server` 镜像会在构建阶段安装本地 ASR 的 Python 重依赖：

- `torch`
- `torchaudio`
- `funasr`
- `modelscope`
- `faster-whisper`

部分机器到 `PyPI / 清华镜像 / download.pytorch.org` 的 TLS 连接不稳定，日志会长时间停在：

```text
python3 -m pip install ...
WARNING: Retrying ... SSLError(SSLZeroReturnError ...)
```

这会带来两个问题：

1. 首次安装非常慢
2. 本地 ASR 依赖失败会直接把整个标准 Docker 首装卡死，即使用户当前只是想先把主系统装起来

## 本次修正

### 1. 标准 Docker 首装默认不再预装本地 ASR 运行时

更新：

- `docker/server.Dockerfile`
- `docker/docker-compose.local-postgres.yml`
- `.env.docker.example`

当前通过 `INSTALL_LOCAL_ASR` 显式控制是否安装本地 ASR Python 依赖：

- 默认：`INSTALL_LOCAL_ASR=0`
- 需要视频文案提取时：`INSTALL_LOCAL_ASR=1`

这样标准首装会优先保证：

- `db-init`
- `server`
- `web`

能够先成功拉起，不再被本地 ASR 重依赖阻塞。

### 2. 本地 ASR 未准备好时返回更直白的错误

更新：

- `apps/server/src/modules/third-party-platforms/local-asr.service.ts`

当标准 Docker 首装未安装 Python / ASR 运行时，而用户又触发视频文案提取时，服务端会明确提示：

- 当前环境未安装本地 ASR Python 运行时
- 标准 Docker 首装默认不会预装该重依赖
- 如需视频文案提取，请设置 `INSTALL_LOCAL_ASR=1` 后重建 `server / db-init`

### 3. 安装与更新文案同步改口

更新：

- `README.md`
- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
- `apps/server/src/modules/system-update/system-update.service.ts`
- `docs/engineering-standards.md`
- `docs/site-map.md`

现在标准运行态的安装、更新、版本页提示都会明确：

- 主系统安装不依赖本地 ASR 预装
- 若后续需要视频文案提取，再单独启用 ASR

## 启用本地 ASR 的方式

需要视频文案提取时，编辑 `.env`：

```env
INSTALL_LOCAL_ASR=1
```

然后重建：

```powershell
docker compose -f docker/docker-compose.local-postgres.yml up -d --build --force-recreate db-init server
```

## 影响范围

- `docker/server.Dockerfile`
- `docker/docker-compose.local-postgres.yml`
- `.env.docker.example`
- `apps/server/src/modules/third-party-platforms/local-asr.service.ts`
- 标准运行态安装/更新文案

## 验证

- `npm run build:server`
- 标准 Docker 首装路径不再要求先成功下载本地 ASR Python 重依赖
- 本地 ASR 未准备好时，视频文案提取应返回受控错误，而不是把主安装链卡死

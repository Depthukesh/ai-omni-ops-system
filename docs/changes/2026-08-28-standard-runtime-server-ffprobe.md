# 2026-08-28 标准运行态 server 镜像补 ffprobe 依赖

## 背景

IP 资料库语音上传链路会在服务端使用 `ffprobe` 校验：

- 文件是否为 `.mp3`
- 音频时长是否大于 30 秒

在标准 Docker 运行态下，页面会提示：

- `IP 语音上传失败：服务端缺少 ffprobe，暂时无法校验 IP 语音时长`

这说明并不是上传文件本身有问题，而是标准运行态默认依赖宿主机或容器环境里已有 `ffprobe`，环境一旦不完整就会直接失败。

## 根因

当前服务端代码读取 `FFPROBE_BINARY` 时，默认会直接回退到：

- `ffprobe`

因此：

- 本地开发环境如果宿主机装了 ffmpeg / ffprobe，功能可能正常
- 标准 Docker 运行态或其他新机器如果环境里没有 `ffprobe`，就会直接报缺少依赖

如果继续走 Dockerfile 里额外 `apt install ffmpeg` 的方案，又会把标准运行态安装稳定性绑定到用户现场的 Debian 源网络，不够稳。

## 本次改动

更新：

- `apps/server/package.json`
- `apps/server/src/modules/brands/brands.service.ts`
- `apps/server/src/modules/works/works.service.ts`
- `package.json`

改动：

- 新增 `ffprobe-static` 依赖
- 把 `ffprobe` 的默认解析逻辑改成：
  1. 优先使用 `FFPROBE_BINARY`
  2. 否则使用 `ffprobe-static` 随包二进制
  3. 最后才回退到系统里的 `ffprobe`
- 根目录 `onlyBuiltDependencies` 同步加入 `ffprobe-static`

## 影响范围

- 标准 Docker 运行态 `server` 镜像
- 本地开发环境与其他非 Docker 环境
- IP 资料库语音上传时长校验
- 其他依赖 `ffprobe` 的服务端媒体元数据读取链路

## 验证建议

```powershell
pnpm install
npm --workspace apps/server run build
docker compose -f docker/docker-compose.local-postgres.yml build --no-cache server
docker compose -f docker/docker-compose.local-postgres.yml up -d server
```

预期结果：

- `apps/server` 可正常构建
- `server` 镜像构建时不再额外依赖安装系统级 `ffprobe`
- IP 资料库上传 `.mp3` 语音时不再提示“服务端缺少 ffprobe”

## 结果

这次修复后，标准 Docker 运行态与本地开发环境在语音时长校验依赖上保持一致，避免用户在一台机器可用、另一台机器直接报缺少 `ffprobe` 的环境差异，同时也减少了安装链路对用户现场 apt 源网络质量的依赖。

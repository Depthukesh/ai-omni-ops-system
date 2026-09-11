# 2026-09-11 Server Docker ASR 依赖缓存层修复

## 背景

标准 Docker 运行态下，用户每次执行：

```powershell
docker compose -f "docker/docker-compose.local-postgres.yml" up -d --build server web
```

都会在 `server` 镜像构建阶段重新下载一次本地 ASR 依赖里的 `torch` CPU 包，日志里长期出现约 `196 MB` 的重复下载。

根因不是 `torch` 不能缓存，而是 `docker/server.Dockerfile` 之前采用了：

1. `COPY . .`
2. 再执行 `pip install torch torchaudio ...`

只要业务源码有任意变动，`COPY . .` 这一层就会变化，后面的 Python ASR 安装层缓存也会一起失效，导致普通前后端代码更新也重新下载大包。

## 本次修正

### 1. 把本地 ASR 依赖文件单独前置复制

- 新增先复制：
  - `docker/local-asr-requirements.txt`

### 2. 把重依赖安装层前移

- 将下面这组安装动作移到 `COPY . .` 之前：
  - `pip setuptools wheel`
  - `torch`
  - `torchaudio`
  - `docker/local-asr-requirements.txt` 中的 `funasr / modelscope / faster-whisper`

### 3. 收口缓存边界

调整后，这层只受以下因素影响：

- `docker/server.Dockerfile`
- `docker/local-asr-requirements.txt`
- Python 基础镜像和前置系统依赖

普通业务源码、前端页面、Nest service、文档、工作区组件等改动，不会再把这层缓存打掉。

## 影响范围

- `docker/server.Dockerfile`
- 标准 Docker 运行态的 `server` / `db-init` 共用构建链路

## 预期效果

- 首次构建仍然需要下载本地 ASR 重依赖
- 后续普通代码更新即使继续使用 `--build`，也不会再反复下载 `196 MB` 的 `torch` CPU 包
- 只有当：
  - Dockerfile 变化
  - `local-asr-requirements.txt` 变化
  - 基础镜像变化
  才会重新安装这一层

## 验证

- 需要执行一次 `docker compose ... build server`
- 最好再紧接着执行第二次同命令，确认 `torch / torchaudio / local-asr` 安装层已命中缓存

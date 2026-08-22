# 2026-08-22 视频混剪站内视频直送 mixedcut

## 背景

用户继续追问：网站里的视频素材能不能直接送到 mixedcut 做混剪，而不是只停留在“mixedcut 设置页”和模型同步说明。

此前系统已经完成两件事：

1. `内容获客 -> 视频混剪` 直接承载 mixedcut `/remix`
2. mixedcut 的模型配置改由主站第三方模型统一同步到 `config/ai_config.json`

但站内视频资产和 mixedcut 之间还缺一条真实可用的桥接链路。

## 本次改动

### 1. 后端新增 mixedcut 素材桥接接口

文件：

- `apps/server/src/modules/third-party-platforms/third-party-platforms.controller.ts`
- `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`

新增能力：

- `GET /third-party-platforms/mixedcut/media-assets`
  - 返回当前品牌可用于 mixedcut 的站内视频素材列表
- `POST /third-party-platforms/mixedcut/remix-task`
  - 接收前端勾选的 `mediaAssetIds`
  - 主站后端读取站内视频文件
  - 上传到 mixedcut `POST /api/upload/video`
  - 再调用 mixedcut `POST /api/remix/generate`
  - 返回 `taskId / projectId / uploadedVideos`
- `GET /third-party-platforms/mixedcut/remix-task/:taskId`
  - 代理 mixedcut `GET /api/remix/progress/{task_id}`
  - 返回前端可直接展示的任务进度与结果

### 2. 视频混剪工作区补站内素材选择与任务轮询

文件：

- `apps/web/src/app/(dashboard)/douyin/video-remix-workspace.tsx`
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
- `apps/web/src/services/personal-center.ts`

新增体验：

- 在 mixedcut iframe 上方直接展示站内视频素材列表
- 支持勾选多条素材
- 支持填写任务名、目标时长、混剪风格
- 一键把所选素材送到 mixedcut 开始混剪
- 自动轮询任务进度
- 完成后可直接打开 mixedcut 成片地址

### 3. Docker server 显式补 mixedcut 容器内访问地址

文件：

- `.env.docker.example`
- `docker/docker-compose.local-postgres-mixedcut.yml`

新增：

- `MIXEDCUT_INTERNAL_BASE_URL=http://mixedcut:5000`

目的：

- 避免 Docker 下 `server` 容器错误使用宿主机浏览器地址 `127.0.0.1:15000`
- 让主站后端在容器内稳定调用 mixedcut HTTP 服务

## 当前边界

这次补的是“手动桥接”，不是“素材库自动同步”：

- 已支持：
  - 手动勾选站内视频
  - 主站后端上传到 mixedcut
  - 主站后端直接创建 mixedcut 任务
  - 页面轮询 mixedcut 进度
- 还未支持：
  - mixedcut 自动感知主站素材库全部变更
  - 站内素材与 mixedcut 双向同步
  - 站内 BGM / 音频一并桥接到音乐卡点模式

## 验证

- `pnpm build:server`
- `pnpm build:web`

说明：

- 本次已完成前后端编译通过
- 尚未在本条变更记录内补充新的 Docker 容器重建结果；若需要让当前运行中的 Docker 主站立即吃到这次改动，还需重建 `server` 与 `web`

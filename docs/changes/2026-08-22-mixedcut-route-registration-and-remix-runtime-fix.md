# 2026-08-22 mixedcut 路由注册恢复与混剪运行时修复

## 背景

站内视频直送 mixedcut 的主站桥接代码已经完成，但真实联调时发现 mixedcut 容器只暴露了 `/api/health`，而以下关键接口全部返回 `404`：

- `POST /api/upload/video`
- `POST /api/remix/generate`
- `GET /api/projects`

继续排查后确认，这不是主站桥接失败，而是 mixedcut 容器启动时错误退回到了“内置精简模式”。

## 根因

### 1. mixedcut bundle 的入口仍按完整版依赖导入

文件：

- `workspace-notes/mixedcut_integration_bundle/frontend/app.py`

启动时会一次性导入：

- `CommentaryService`
- `VoiceoverService`
- `register_video_routes`
- `register_ai_routes`
- `register_commentary_routes`
- `register_voiceover_routes`
- 以及其它当前 bundle 中并不存在的 API 模块

### 2. 当前 bundle 实际只保留了 mixedcut 核心模块

实际存在的核心文件只有：

- `backend/services/task_service.py`
- `backend/services/remix_service.py`
- `backend/api/project_api.py`
- `backend/api/task_api.py`
- `backend/api/remix_api.py`
- `backend/api/upload_routes.py`

因此入口导入在最前面就因缺少 `backend.services.commentary_service` 失败，导致 `BACKEND_AVAILABLE=False`，后续增强路由整组不注册。

### 3. 真实混剪运行时还存在空云视觉分数处理 bug

当 mixedcut 未配置云视觉能力时，候选片段里的 `cloud_vision_score` 可能为 `None`。`remix_service.py` 在归一化候选片段时直接执行：

```py
item.get('cloud_vision_score', 50.0) / 100.0
```

会触发：

```text
TypeError: unsupported operand type(s) for /: 'NoneType' and 'float'
```

## 本次改动

### 1. mixedcut 入口改为按当前 bundle 的真实模块最小注册

文件：

- `workspace-notes/mixedcut_integration_bundle/frontend/app.py`
- `workspace-notes/mixedcut_integration_bundle/backend/api/__init__.py`
- `workspace-notes/mixedcut_integration_bundle/backend/services/__init__.py`

调整后：

- `backend/services/__init__.py` 只导出 `TaskService`、`RemixService`
- `backend/api/__init__.py` 只导出 `register_project_routes`、`register_task_routes`、`register_remix_routes`、`register_upload_routes`
- `frontend/app.py` 启动时只加载并注册 mixedcut 当前真实存在的核心后端增强模块

当前 mixedcut 容器恢复后的最小可用增强接口为：

- `/api/projects`
- `/api/tasks`
- `/api/remix/*`
- `/api/upload/*`

### 2. 修复候选片段分数归一化时对 `None` 的除法错误

文件：

- `workspace-notes/mixedcut_integration_bundle/backend/services/remix_service.py`

处理方式：

- 先用 `_safe_float(item.get('cloud_vision_score'), 50.0)` 归一化
- 再换算成 `0-1` 区间默认分数

这样在未配置云视觉模型时，会安全回退到默认分值，而不是直接抛异常。

## 运行态验证

### 1. mixedcut 容器重建

执行：

- `docker compose --env-file .env.docker.example -f docker/docker-compose.local-postgres-mixedcut.yml up -d --build mixedcut`

### 2. 路由恢复验证

确认以下结果：

- `GET /api/health` -> `200`
- `GET /api/projects?type=remix&limit=1` -> `200`
- `GET /api/remix/detect-jianying-draft-dir` -> `200`
- `GET /api/upload/video` -> `405`
- `GET /api/remix/generate` -> `405`

这里的 `405` 说明路由已经存在，只是请求方法不匹配，不再是之前的 `404` 未注册状态。

### 3. 主站桥接真实联调

使用主站品牌 `br_demo_001` 下的测试素材：

- `MediaAsset.id = cmt3ec8p8000bpr019r7z1kcs`
- 标题：`临时桥接验证视频`

真实跑通链路：

1. `GET /third-party-platforms/mixedcut/media-assets`
2. `POST /third-party-platforms/mixedcut/remix-task`
3. `GET /third-party-platforms/mixedcut/remix-task/:taskId`

本次成功结果：

- `taskId = d5a6cbb0-c625-4a2e-b970-afeca25a3a66`
- `projectId = da1d44bb-c9ca-4331-96d9-fa6ed6436851`
- 状态：`completed`
- `videoUrl = /output/remix/d5a6cbb0-c625-4a2e-b970-afeca25a3a66_clips_merged.mp4`
- `actualDurationSeconds = 8`
- `durationWithinTolerance = true`

说明当前已经真实跑通：

- 站内素材读取
- 主站后端上传到 mixedcut
- mixedcut 创建混剪任务
- 主站代理轮询任务进度
- mixedcut 返回成片地址与时长信息

## 当前边界

- 这次验证使用的是单条测试视频素材，目标时长收敛为 `8s`
- 若目标时长大于可用素材总时长，mixedcut 仍会按现有严格规则拒绝“硬补齐”
- mixedcut 的云视觉增强当前仍未配置真实模型能力，日志里会回退到本地分析路径

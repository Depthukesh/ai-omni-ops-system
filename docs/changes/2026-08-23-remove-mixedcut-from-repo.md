# 2026-08-23 仓库级下线 mixedcut

## 背景

当前项目已经不再继续维护 mixedcut 集成链路。用户明确要求把 mixedcut 从本地与 GitHub 仓库里一起删除，避免后续部署、升级、OpenClaw 安装说明和仓库文档继续暴露一个已经废弃的能力。

## 本次处理

### 1. 删除主站与 OpenClaw 中的 mixedcut 代码入口

- 删除主站后端 mixedcut 相关接口、服务实现和 OpenClaw 工具入口
- 删除 MCP 桥接脚本中针对 `create_mixedcut_remix_task` 的参数归一化逻辑
- 删除 OpenClaw 安装中心、Skill 配套文档和对接说明中的 mixedcut 任务路由与工具说明

### 2. 删除 Docker 与仓库资产

- 新增标准运行态 compose：`docker/docker-compose.local-postgres.yml`
- 删除旧的 `docker/docker-compose.local-postgres-mixedcut.yml`
- 删除 `mixedcut_integration_bundle/`
- 删除仓库中已跟踪的 mixedcut 本地运行资产与相关历史文档

### 3. 收口对外文档口径

- 更新根目录 `README.md`
- 更新 `docs/README.md`
- 更新 `docs/site-map.md`
- 更新 `docs/site-map-mermaid.md`
- 删除 mixedcut 相关历史专题文档与变更记录，避免继续把它当成当前能力

## 影响面与保护

- 这次调整会让仓库不再提供 mixedcut 的安装、运行、升级或 OpenClaw 调用能力
- 为避免误导，版本升级页、示例 manifest、OpenClaw 安装中心和文档总索引都同步删掉了 mixedcut 口径
- `seedance20-viral-video-remix` 这类 RunningHub 应用名仍然保留，因为它属于现有 RunningHub 能力，不等同于 mixedcut 集成

## 验证

- 关键代码与文档文件执行 `rg` 复查，确认 mixedcut 专用工具、升级提示和站点地图主口径已被清理
- 通过 `git status` 复核待删除的 mixedcut 仓库资产已进入本次变更范围

## 后续说明

- 之后若要重新接入混剪能力，建议以全新集成方案重新设计，不直接恢复这次下线的 mixedcut 历史实现

# 2026-08-22 视频混剪直达 mixedcut 与设置页拆分

## 背景

用户明确提出两点调整：

1. `内容获客 -> 某音/某号 -> 视频混剪` 应该直接进入 mixedcut 混剪页面，而不是继续停留在“模型同步 / 配置下发”的设置面板
2. mixedcut 相关设置应收口到 `个人中心 -> 第三方接口配置` 体系下，并单独提供一个 `视频混剪设置` 页面

此前第一阶段接入为了先打通 mixedcut 模型同步链，把“混剪入口”和“配置入口”临时合并在同一个工作区里，导致内容获客主链不够直接。

## 本次改动

### 1. 内容获客的视频混剪入口改为直接承载 mixedcut 主界面

- `apps/web/src/app/(dashboard)/douyin/video-remix-workspace.tsx`
  - 原先的视频混剪设置面板改为直接嵌入 mixedcut `/remix`
  - 顶部保留：
    - `打开视频混剪设置`
    - `新窗口打开`
    - `刷新混剪页`
  - mixedcut 浏览器入口默认优先读取 `NEXT_PUBLIC_MIXEDCUT_BASE_URL`
  - 若未显式配置，则在 Docker 本地部署下回退到当前主机 `:15000/remix`

### 2. 新增个人中心独立 `视频混剪设置` 页面

- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/video-remix/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/video-remix-settings-panel.tsx`

该页面承接原先视频混剪工作区中的设置能力：

- mixedcut `ai_config.json` 预览
- `LLM + 视觉 + 生图` 同步状态
- 一键同步到 mixedcut
- mixedcut 安装根目录与配置文件路径说明

### 3. 第三方接口配置页补独立入口

- `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
  - 在顶部工具按钮中新增 `视频混剪设置`

### 4. Docker web 运行态补 mixedcut 浏览器地址环境变量

- `.env.docker.example`
- `docker/docker-compose.local-postgres-mixedcut.yml`

新增：

- `NEXT_PUBLIC_MIXEDCUT_BASE_URL`

默认值为：

- `http://127.0.0.1:15000`

用于让主站前端在 Docker 本地部署下直接打开 mixedcut 浏览器入口。

## 影响范围

- 内容获客 `视频混剪` 板块的入口行为
- 个人中心 `第三方接口配置` 下的 mixedcut 设置入口
- Docker web 运行态的 mixedcut 浏览器地址配置

本次没有修改：

- mixedcut 模型同步协议
- mixedcut `ai_config.json` 生成逻辑
- 站内素材与 mixedcut 的真实上传/任务代理接口

## 验证

- `pnpm build:web`
- 重建 Docker `ai-omni-web`
- 打开 `http://127.0.0.1:13001/xiaohongshu`
  - `某音/某号 -> 视频混剪` 当前应直接看到 mixedcut 混剪页
- 打开 `http://127.0.0.1:13001/personal-center/third-party-platforms/video-remix`
  - 当前应看到 mixedcut 模型同步与配置下发设置页

## 当前边界

- 这次只收口“入口职责”：
  - 内容获客负责进入 mixedcut 主界面
  - 个人中心负责 mixedcut 设置
- 站内素材目前仍未直接代理到 mixedcut 的上传/生成接口；后续若要打通“从素材库直接送 mixedcut 生成视频”，需要再补后端网关与 `assetId/materialId` 协议桥接

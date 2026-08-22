# 2026-08-21 mixedcut 改为复用第三方大模型配置

## 背景

在首轮把 `视频混剪` 挂进 `内容获客 -> 某音/某号` 后，个人中心里曾额外挂出一个 `视频混剪服务` 平台，按 `服务地址 + 可选 API Key` 维护 mixedcut HTTP 入口。

用户随后明确要求：

1. 不需要单独维护一个 `视频混剪服务` API 配置项
2. 需要把 `个人中心 -> 第三方接口配置` 里已经配置好的第三方大模型，同步给 mixedcut 使用
3. 首轮只覆盖 `LLM + 视觉 + 生图`
4. mixedcut 按同机目录部署，直接写入安装目录下的 `config/ai_config.json`

## 本次收口

### 1. 视频混剪改为“模型同步”而不是“服务地址配置”

- `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
  - 新增 mixedcut 配置预览与同步能力
  - 按品牌当前已保存的第三方模型配置，生成 mixedcut 需要的 `llm / vision / image` 配置
  - 同步时自动创建 `config` 目录并写入 `ai_config.json`
- `apps/server/src/modules/third-party-platforms/third-party-platforms.controller.ts`
  - 新增：
    - `GET /third-party-platforms/mixedcut-ai-config`
    - `POST /third-party-platforms/mixedcut-ai-config/sync`
- `apps/web/src/app/(dashboard)/douyin/video-remix-workspace.tsx`
  - 页面从“服务接入说明”改成“模型同步工作区”
  - 展示安装目录、配置文件路径、来源 provider、预览 JSON 和一键同步按钮

### 2. 个人中心不再保留多余的“视频混剪服务”平台种子

- `apps/server/src/common/third-party-platform-catalog.ts`
  - 移除 `视频混剪服务` 平台种子
  - 把该历史平台 ID 标记为 decommissioned，避免继续出现在个人中心第三方接口配置中

### 3. 内容获客与文档口径同步收口

- `apps/web/src/app/(dashboard)/xiaohongshu/content-acquisition-workspace.tsx`
- `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
- `docs/README.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`

统一改为：

- 视频混剪复用品牌现有第三方大模型配置
- 不再强调维护 mixedcut HTTP 服务地址
- 当前目标是把品牌侧模型配置同步到 mixedcut 的 `ai_config.json`

## 影响范围

- 某音/某号 -> 视频混剪
- 个人中心 -> 第三方接口配置
- 第三方模型配置到 mixedcut 的桥接逻辑
- mixedcut 本地安装目录下的 `config/ai_config.json`

## 验证

- `pnpm build:server`
  - 通过
- `pnpm build:web`
  - 通过

## 当前边界

- 本次仍未接入 mixedcut 的真实上传、任务发起和进度轮询代理
- 本次只同步 `LLM + 视觉 + 生图`
- `TTS` 暂不在首轮范围内

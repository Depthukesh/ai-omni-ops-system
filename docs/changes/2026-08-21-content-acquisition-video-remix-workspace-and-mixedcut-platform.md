# 2026-08-21 内容获客视频混剪入口与 mixedcut 平台接入

## 背景

用户要求在 `内容获客 -> 某音/某号` 下，把 `视频混剪` 作为 `RunningHub应用` 下方的独立左侧菜单板块挂出来，同时评估 `workspace-notes/mixedcut_integration_bundle` 的安装方式，并把第三方接口相关配置收口进当前系统。

本次先做低风险第一阶段接入：

1. 在内容获客里新增独立 `视频混剪` 入口
2. 把 mixedcut 作为独立 HTTP 服务接入，而不是直接拆进现有 Nest 主链
3. 复用个人中心 `第三方接口配置` 作为品牌共享配置真源

## 影响范围

- 前端内容获客导航：
  - `apps/web/src/app/(dashboard)/xiaohongshu/content-acquisition-workspace.tsx`
- 抖音工作区壳层：
  - `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  - `apps/web/src/app/(dashboard)/douyin/video-remix-workspace.tsx`
- 第三方平台目录与配置页：
  - `apps/server/src/common/third-party-platform-catalog.ts`
  - `apps/web/src/app/(dashboard)/personal-center/third-party-platforms/page.tsx`
- 文档：
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/README.md`

## 方案选择

### 为什么不直接源码嵌入

`mixedcut_integration_bundle` 的真实边界是独立 Python / Flask / SocketIO / SQLite / FFmpeg 服务，并且强依赖本地文件路径、上传目录和后台任务。

如果首轮直接拆进现有 Nest 主链，会同时引入：

- Python 运行时依赖
- FFmpeg / ffprobe 环境依赖
- 本地文件目录约束
- SQLite / 任务系统 / 上传目录耦合

这会把原本局部功能接入放大成跨运行时改造。

### 当前采用的接法

第一阶段统一按“独立 HTTP 服务接入”落地：

1. mixedcut 单独部署
2. 当前系统只负责展示安装方式、服务入口与接口边界
3. 品牌共享配置统一放到个人中心 `第三方接口配置`

## 本次实际改动

### 1. 内容获客新增独立视频混剪入口

在 `某音/某号` 组下新增 `视频混剪` page，并接到新的 `videoRemix` section。

### 2. 抖音工作区新增视频混剪面板

新增 `DouyinVideoRemixWorkspace`，当前面板承载：

- mixedcut 推荐安装方式
- 当前品牌服务地址与可选 API Key 状态
- 推荐 HTTP 接口列表
- 关键业务约束说明

### 3. 第三方接口配置新增视频混剪服务种子

在平台目录里新增 `视频混剪服务` 平台，默认基线地址是：

- `http://127.0.0.1:5000`

该地址代表 mixedcut 推荐的本地 / Docker HTTP 入口。

### 4. 个人中心第三方接口页新增平台专属表单

`视频混剪服务` 不再复用单一 `API Key` 输入框，而是改成：

- `服务地址`
- `API Key（可选）`

当前仍复用原有后端 secret 字段存储，但前端会按 JSON 结构读写：

```json
{
  "baseUrl": "http://127.0.0.1:5000",
  "apiKey": ""
}
```

这样可以在不增加新表结构的前提下，把 mixedcut 的连接配置纳入当前品牌共享配置体系。

## mixedcut 安装评估结论

结合 `workspace-notes/mixedcut_integration_bundle` 的 README、Dockerfile、docker-compose 和对接文档，当前建议如下：

### 推荐安装方式

优先使用 Docker 双容器：

- `videoautocut` 暴露 `5000`
- `videoautocut-mcp` 暴露 `5501`

原因：

- 更容易隔离 Python / FFmpeg 依赖
- 更适合挂载 `uploads / output / temp / database / logs`
- 对当前 Node / Nest 主链影响最小

### 备选安装方式

如果不使用 Docker，则需要自行准备：

- Python 运行时
- `ffmpeg` / `ffprobe`
- `librosa`
- `opencv-python`
- 对 `uploads / output / temp / database / logs` 的本地读写权限

### 接入边界

当前推荐的最小对接闭环是：

1. `POST /api/upload/video`
2. `POST /api/upload/audio`
3. `POST /api/remix/generate`
4. `GET /api/remix/progress/{task_id}`
5. `POST /api/remix/export-jianying-draft`

## 验证

- `pnpm build:web`
  - 通过

## 风险与后续

### 本次有意不做

- 不把 mixedcut 的 Python 引擎直接嵌入现有后端
- 不新增视频混剪任务代理接口
- 不做真实素材上传、混剪任务发起和进度轮询联调

### 下一步建议

如果要继续推进到可执行业务链，下一阶段应新增后端网关：

1. 从品牌共享配置中读取 mixedcut `baseUrl + apiKey`
2. 代理上传素材
3. 代理发起 `/api/remix/generate`
4. 代理查询 `/api/remix/progress/{task_id}`
5. 把成片和草稿结果纳入站内任务 / 作品体系

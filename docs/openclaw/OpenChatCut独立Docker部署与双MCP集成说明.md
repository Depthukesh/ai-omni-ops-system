# OpenChatCut 独立 Docker 部署与双 MCP 集成说明

## 1. 目标

这份文档只解决一件事：

- 如何把 OpenChatCut 作为独立 Docker 服务部署
- 如何把 OpenChatCut 本体收口到“受控 fork / 受控镜像”，而不是每台电脑手工改官方源码
- 如何让 OpenClaw 同时连接本站 MCP 与 OpenChatCut MCP
- 如何形成“本站产素材 -> OpenChatCut 剪辑导出”的闭环

当前不建议把 OpenChatCut 并入本站主 `server/web/postgres` compose。

## 2. 当前推荐架构

推荐按三套角色拆开：

1. 本站
   - 品牌、权限、任务、素材、作品、OpenClaw MCP
2. OpenChatCut
   - 工程、时间线、导入素材、时间线编辑、导出
3. OpenClaw
   - 编排层，同时调用两套 MCP

对应链路：

1. OpenClaw 先调用本站 MCP
2. 本站生成图片、视频、音频、字幕、BGM、音效等素材
3. 素材落到本站受控目录或可访问副本
4. OpenClaw 再调用 OpenChatCut MCP
5. OpenChatCut 创建工程、导入素材、排时间线、导出成片

## 3. 为什么要独立部署

原因很直接：

- OpenChatCut 当前定位是 `local-first`、工程型、单用户倾向的视频编辑器
- 上游 README 公开写法主要是源码运行和桌面包，不是官方 Docker 标准发布链
- 剪辑、预览、导出、FFmpeg、GPU 与本站品牌后台是两类完全不同的运行时负载
- 如果强行并进本站主 compose，后续容易把媒体目录、权限、端口、资源占用和排障边界全部搅在一起

所以当前建议是：

- 独立容器
- 独立端口
- 独立持久化目录
- 独立反向代理/内网访问控制

## 3.1 为什么还要受控 fork

这一步不是“为了方便”，而是为了让后续安装具备可复制性。

如果某个修复必须改 OpenChatCut 本体，但只是我在本机源码目录里手工改一下，会有三个直接问题：

1. 别人的电脑重新安装后，问题会原样复现
2. 无法判断哪些变更属于官方、哪些属于我们自己的实施补丁
3. 后续接收 upstream 更新时，很容易丢 patch 或冲突失控

因此当前正式口径是：

- 本站主仓库只保留接入层：
  - Docker 样板
  - 网关
  - 安装中心
  - 文档
- OpenChatCut 本体单独维护为一份受控 fork 或受控镜像
- 不把整份 OpenChatCut 源码复制进本站主仓库
- 不走“每台电脑手工改官方源码”

## 3.2 受控 fork 与 upstream 的关系

受控 fork 不是和官方断开，而是按下面这组关系长期维护：

```text
官方 OpenChatCut 仓库 = upstream
我们的 OpenChatCut fork = origin
```

后续策略：

1. 先把 Docker 必需修复、本站对接修复收口到 fork
2. 再按小步方式持续同步 upstream 更新
3. 能回提官方的 patch，尽量回提官方

也就是说，fork 的目标不是长期魔改，而是先有一个可安装、可复制、可更新的受控版本。

## 4. 部署边界

### 4.1 本站负责什么

- 品牌上下文
- OpenClaw 安装中心
- OpenClaw MCP
- 各类素材生成
- 素材副本与受控存储
- 任务编排和结果沉淀

### 4.2 OpenChatCut 负责什么

- 工程管理
- 素材导入
- 时间线编辑
- 字幕、转场、配乐、特效
- 导出成片

### 4.3 OpenClaw 负责什么

- 理解用户需求
- 决定先调本站 MCP 还是 OpenChatCut MCP
- 把本站产出的素材继续送进 OpenChatCut
- 跟踪剪辑会话和导出状态

## 5. 当前推荐目录

建议在宿主机上至少准备这几类目录：

- `OpenChatCut` 源码目录
- `docker/local-data/openchatcut/home`
- `docker/local-data/openchatcut/media`

推荐语义：

- `home`
  - 承接容器内 `HOME`
  - `~/.openchatcut` 会落在这里
- `media`
  - 承接 OpenChatCut 素材目录
  - 供本站导出的图片、视频、音频副本进入剪辑链

## 6. Docker 样板

仓库内已补充：

- `docker/docker-compose.openchatcut.yml`
- `docker/openchatcut.env.example`

这是当前推荐的第一阶段样板，重点是：

- 用自定义启动镜像跑 OpenChatCut 开发态
- 用独立端口 `15199 -> 5199`
- 用 `HOME` 承接 OpenChatCut 本地工程库
- 用 `MEDIA_DIR` 承接素材目录
- 用 `OPENCHATCUT_MCP_TOKEN` 保护外部 MCP
- 用独立 `node_modules` 卷避免容器重启后全量重装依赖

### 启动前准备

1. 在本站仓库平级或固定目录检出 OpenChatCut 受控 fork 源码
2. 复制 `docker/openchatcut.env.example` 为 `docker/openchatcut.env`
3. 把 `OPENCHATCUT_SOURCE_DIR` 改成真实源码目录
4. 按实际环境修改端口、目录和 Token

### 重要提醒：容器里的 127.0.0.1 不是宿主机

如果 OpenChatCut 自己跑在 Docker 容器里，但你自己的主系统跑在宿主机上，那么 OpenChatCut 设置页里填写自定义模型接口时：

- `http://127.0.0.1:13011/...`
- `http://localhost:13011/...`

这类地址对浏览器来说可能能打开，但对 OpenChatCut 容器里的服务端测试请求来说，默认指向的是容器自己，不是宿主机上的主系统。

因此这类场景应改成：

```text
http://host.docker.internal:13011/api/openclaw/openchatcut-gateway/v1
```

当前 compose 样板已补：

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

用于把容器内的 `host.docker.internal` 解析到宿主机。

### 安装边界提醒

- `OPENCHATCUT_SOURCE_DIR` 应指向受控 fork 检出目录，而不是要求每台电脑都先拉官方仓库再手工改源码
- 本站主仓库不承接 OpenChatCut 整仓源码；这里只承接接入方式和部署方式
- 如果后续要新增 OpenChatCut 本体修复，应先进入 fork，再反向同步安装说明

### 启动命令

```powershell
docker compose --env-file "docker/openchatcut.env" -f "docker/docker-compose.openchatcut.yml" up -d --build
```

### 首次启动说明

首次启动明显比普通 `docker compose up` 更慢，这是预期行为。当前启动镜像会先做这些事：

1. `npm install --ignore-scripts --package-lock=false`
2. `node scripts/sync-mediapipe.mjs`
3. `node scripts/sync-whisper-cli.mjs`
4. `npx tsx server/agent-runs/generate-tool-catalog.mts --check`
5. `node scripts/dev-profile.mjs --host 0.0.0.0 --port 5199 --open false`

这样处理的原因是：

- 直接 `npm install && npm run dev` 在 Linux Docker 开发态下会被 `onnxruntime-node` 的原生安装链卡住
- `dev-profile` 会依赖容器里存在 `git`
- `sync-whisper-cli` 依赖容器里存在 `unzip`

因此当前 Docker 样板专门补了：

- `git`
- `unzip`
- 独立 `openchatcut_node_modules` 卷

### compose 样板

```yaml
services:
  openchatcut:
    build:
      context: ..
      dockerfile: docker/openchatcut.Dockerfile
    image: local/openchatcut-dev:latest
    container_name: openchatcut
    working_dir: /workspace
    init: true
    ports:
      - "${OPENCHATCUT_HTTP_PORT:-15199}:5199"
    environment:
      HOME: /data/home
      MEDIA_DIR: /data/media
      OPENCHATCUT_MCP_TOKEN: ${OPENCHATCUT_MCP_TOKEN:-change-me}
      OPENCHATCUT_TRUST_DOCKER_LOCALHOST: ${OPENCHATCUT_TRUST_DOCKER_LOCALHOST:-1}
      OPENCHATCUT_EDITOR_URL: ${OPENCHATCUT_EDITOR_URL:-http://localhost:15199}
      RESOURCE_PREVIEW_TOKEN: ${RESOURCE_PREVIEW_TOKEN:-change-me}
      BROWSER: none
      VITE_CONFIG_NATIVE_IGNORE_WARNING: "true"
    volumes:
      - ${OPENCHATCUT_SOURCE_DIR:-../OpenChatCut}:/workspace
      - openchatcut_node_modules:/workspace/node_modules
      - ${OPENCHATCUT_HOME_DIR:-./local-data/openchatcut/home}:/data/home
      - ${OPENCHATCUT_MEDIA_DIR:-./local-data/openchatcut/media}:/data/media
    restart: unless-stopped

volumes:
  openchatcut_node_modules:
```

### 自定义启动镜像

仓库内新增：

- `docker/openchatcut.Dockerfile`
- `docker/openchatcut-start.sh`

当前职责：

- 补齐 `git`、`unzip`
- 在容器内走 Docker 友好的 OpenChatCut 启动顺序
- 避免第一次就因为原生依赖脚本失败，导致容器持续重启
- 通过 `OPENCHATCUT_TRUST_DOCKER_LOCALHOST=1` 兼容 Docker 端口发布场景下的本地浏览器写请求

### 当前已确认的 Docker 边界

当前样板已经解决的是：

- OpenChatCut 在 Docker 里可启动
- `15199` 页面可打开
- 外部 MCP 地址可继续对接

当前样板还没有自动解决的是：

- OpenChatCut 官方源码在 Docker 端口发布场景下，设置页部分写请求会触发它自己的 request-origin 校验
- 也就是说，“页面能打开”不等于“设置页里所有写操作都天然可用”

因此这类修复后续必须沉淀到受控 fork，而不是继续写成“本机临时调通步骤”。

### Docker 发布端口下的 request-origin 修复

当前受控 fork 已补一项显式环境变量：

```text
OPENCHATCUT_TRUST_DOCKER_LOCALHOST=1
```

作用：

- 当 OpenChatCut 跑在 Docker 容器内，但浏览器是通过宿主机 `localhost:15199` 或 `127.0.0.1:15199` 访问时
- 允许这类本地浏览器请求绕过“容器内 socket 远端地址不是 loopback”这一条限制
- 从而解决设置页里“测试并读取模型”常见的：

```text
invalid request origin
```

注意边界：

- 这不是全局放开来源
- 只在显式设置该环境变量后生效
- 仍然要求 `Host/Origin` 是本地 `localhost/127.0.0.1`
- 仍然要求浏览器请求满足同源限制

## 7. MCP 接入方式

### 7.1 本站 MCP

继续使用安装中心生成的配置：

- `https://你的域名/api/openclaw/mcp`
- `Authorization: Bearer ocp_xxx`
- `x-brand-id: br_xxx`

### 7.2 OpenChatCut MCP

按上游 README，默认 MCP 地址是：

```text
http://127.0.0.1:5199/api/external-mcp/mcp
```

容器化后建议改成你实际对内地址，例如：

```text
http://openchatcut:5199/api/external-mcp/mcp
```

或宿主机反向代理后的受控地址。

如果 MCP 要离开本机范围使用，应同时启用：

- `OPENCHATCUT_MCP_TOKEN`
- 反向代理或内网访问控制

### 7.3 OpenChatCut 自定义模型接口统一走本站

如果希望 OpenChatCut 的 Agent、图片、音频、视频、音乐能力都统一走本站，而不是在 OpenChatCut 内分别保存各家模型平台 Key，当前推荐直接接本站新增的 OpenChatCut 专用网关：

```text
https://你的域名/api/openclaw/openchatcut-gateway/v1
```

统一请求头继续使用 OpenClaw 安装中心导出的品牌安装令牌：

```text
Authorization: Bearer ocp_xxx
x-brand-id: br_xxx
```

当前已暴露的路径包括：

- 文本 / Agent
  - `GET /v1/models`
  - `POST /v1/chat/completions`
  - `POST /v1/responses`
  - `POST /v1/messages`
- 图片 / 音频
  - `POST /v1/images/generations`
  - `POST /v1/audio/speech`
  - `POST /v1/audio/transcriptions`
  - `POST /v1/audio/translations`
- 视频 / 音乐
  - `POST /v1/videos`
  - `GET /v1/videos/:taskId`
  - `POST /suno/submit/:action`
  - `GET /suno/fetch`
  - `GET /suno/fetch/:taskId`

这层网关背后默认会：

1. 先校验 OpenClaw 安装令牌和品牌一致性
2. 再读取该品牌在“个人中心 -> 第三方平台”里配置的多元探索共享 Key
3. 最后由服务端代 OpenChatCut 转发给多元探索

也就是说，OpenChatCut 不再需要直接保存品牌级多元探索明文 Key。

### 7.4 OpenChatCut 里怎么填

推荐优先按下面四组口径填写：

#### A 类：Agent 大脑

页面：

- `设置 -> API 密钥 -> Agent 模型 -> OpenAI`

填写建议：

- `API URL = https://你的域名/api/openclaw/openchatcut-gateway/v1`
- `API Key = OpenClaw 安装令牌（ocp_ 开头）`
- `接口格式 = Chat Completions API`
- `模型 = gpt-5.5`

如需换模型，也可以直接填多元探索已支持的文本模型，例如：

- `claude-sonnet-5`
- `gemini-3.7-flash`
- `deepseek-v4-pro`
- `qwen3.7-plus`

#### B1 类：生图 / 图生图

页面：

- `设置 -> API 密钥 -> AI 生成 -> 生图 -> OpenAI`

填写建议：

- `Base URL = https://你的域名/api/openclaw/openchatcut-gateway`
- `API Key = OpenClaw 安装令牌（ocp_ 开头）`
- `生图模型 = gpt-image-2`

可替换模型示例：

- `gemini-3.1-flash-image-preview`
- `jimeng-4.5`
- `doubao-seedream-4-5-251128`

#### B2 类：配音 / TTS 与转写

当前 OpenChatCut 配音、转写页默认按厂商字段拆开。第一阶段建议先统一指向 OpenAI 兼容页，底层仍由本站网关转多元探索：

- 配音
  - `Base URL = https://你的域名/api/openclaw/openchatcut-gateway`
  - `API Key = OpenClaw 安装令牌（ocp_ 开头）`
  - `模型 = tts-1` 或 `tts-1-hd`
- 转写
  - `Base URL = https://你的域名/api/openclaw/openchatcut-gateway`
  - `API Key = OpenClaw 安装令牌（ocp_ 开头）`
  - `模型 = whisper-1`

#### C 类：生视频 / 生音乐

视频和音乐当前仍保留多元探索原生任务路径：

- 视频
  - `Base URL = https://你的域名/api/openclaw/openchatcut-gateway`
  - `API Key = OpenClaw 安装令牌（ocp_ 开头）`
  - `模型 = omni-fast`
- 音乐
  - `Base URL = https://你的域名/api/openclaw/openchatcut-gateway`
  - `API Key = OpenClaw 安装令牌（ocp_ 开头）`
  - `模型 = chirp-v4`

可替换视频模型示例：

- `Kling-3.0-Omni`
- `Hailuo-2.3`
- `doubao-seedance-2-0-260128`

### 7.5 先别直接进 OpenChatCut，先打 curl

建议先用安装令牌验证两条最小命令：

```bash
curl -X GET "https://你的域名/api/openclaw/openchatcut-gateway/v1/models" \
  -H "Authorization: Bearer ocp_xxx" \
  -H "x-brand-id: br_xxx"
```

```bash
curl -X POST "https://你的域名/api/openclaw/openchatcut-gateway/v1/chat/completions" \
  -H "Authorization: Bearer ocp_xxx" \
  -H "x-brand-id: br_xxx" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"gpt-4o\",\"messages\":[{\"role\":\"user\",\"content\":\"你好，请返回一个 ok\"}]}"
```

如果这两条都通过，再回到 OpenChatCut 填页面，定位会快很多。

### 7.6 WorkBuddy 双 MCP 怎么配

如果要在 WorkBuddy 里同时挂本站 MCP 和 OpenChatCut MCP，当前推荐直接按安装中心里给出的双 MCP 教程配置。

最关键的区别只有一条：

- 本站 MCP
  - `Authorization` 继续使用 OpenClaw 安装令牌
- OpenChatCut MCP
  - `Authorization` 必须使用 `docker/openchatcut.env` 里的 `OPENCHATCUT_MCP_TOKEN`
  - 不是宿主机 `~/.openchatcut/mcp-token`

也就是说，OpenChatCut 这条 MCP 配置不是“无 header 裸连”，而是必须显式带：

```text
Authorization: Bearer <OPENCHATCUT_MCP_TOKEN>
```

### 7.7 完整安装配置流程现在优先看哪里

当前最推荐的入口已经不是单独翻文档，而是直接去：

- `个人中心 -> OpenClaw -> 安装中心`

该页面现在已经把下面几段都做成了可直接复制的后台教程：

1. 拉取 OpenChatCut 受控 fork 源码并准备目录
2. 生成随机 Token 并填写 `docker/openchatcut.env`
3. 首次启动、查看日志、源码更新与 Docker 重建命令
4. WorkBuddy 双 MCP 的完整 `mcp.json`
5. OpenChatCut 页面里 A/B/C 三类能力的填写顺序
6. 从 curl 到页面再到双 MCP 的验证顺序

安装中心里的地址口径当前也已经拆开：

- `统一网关地址`
  - 默认给 OpenChatCut Docker 页面直接填写
  - 如果主系统当前跑在宿主机本机，会优先显示 `host.docker.internal` 这类容器可达地址
- `宿主机调试地址`
  - 给浏览器 / PowerShell 本机手打 curl 用
  - 不建议直接原样抄到 OpenChatCut Docker 页面里

所以实际交付时，建议按下面顺序走：

1. 先在后台安装中心复制教程和配置
2. 再启动 OpenChatCut Docker
3. 再验证统一网关 curl
4. 再填 OpenChatCut 页面
5. 最后再把 WorkBuddy 双 MCP 一起挂上

## 8. OpenClaw 的双 MCP 编排口径

后续给 OpenClaw 的正式口径应是：

1. 先调用本站 MCP 创建素材
2. 再调用 OpenChatCut MCP 组织时间线

## 9. 后续维护策略

后续推荐按下面方式维护：

1. OpenChatCut 受控 fork 单独建仓
2. 当前主仓库继续只保留：
   - `docker/docker-compose.openchatcut.yml`
   - `docker/openchatcut.env.example`
   - `docker/openchatcut.Dockerfile`
   - `docker/openchatcut-start.sh`
   - 安装中心与统一网关
   - 文档与变更记录
3. 每次 OpenChatCut 本体发生修复时：
   - 先进 fork
   - 再回本站同步部署文档和安装口径
4. 每次需要跟官方版本同步时：
   - 先拉 upstream
   - 再把我们自己的差异小步合并
   - 再验证 Docker 启动、设置页写请求和双 MCP 链路
3. 不把视频剪辑逻辑塞回本站业务系统

建议把高频任务拆成三段：

### 8.1 产素材

通过本站 MCP：

- 生图
- 生成 BGM
- 生成音效
- 生成配音
- 生成字幕稿
- 保存视频片段或参考素材

### 8.2 组时间线

通过 OpenChatCut MCP：

- 创建或选择工程
- 导入本站产出的素材
- 放到时间线
- 做切分、删减、配乐、字幕、转场、特效

### 8.3 导出与回传

- 导出成片
- 回写本站作品中心或 OpenClaw 工作区
- 记录工程地址、导出文件地址和回看链接

## 9. 第一阶段验证清单

不要一上来就追求全自动长链闭环，先验证最小链路：

1. OpenChatCut 独立容器能启动
2. `15199` 页面可打开
3. OpenChatCut MCP 可连通
4. OpenClaw 可同时挂本站 MCP 与 OpenChatCut MCP
5. 本站生成的一张图、一个音频、一个视频片段，能被 OpenChatCut 导入
6. OpenChatCut 可完成一次最小时间线编辑
7. OpenChatCut 可导出测试成片

## 10. 当前边界提醒

当前要明确三件事：

1. 上游 README 公开强调的是源码运行和桌面包，不是官方标准 Docker 发布物  
   所以这里是本站的实施样板，不是 upstream 官方生产模板。

2. OpenChatCut 当前更像单用户剪辑执行器，不适合直接定义成多租户共享 SaaS  
   第一阶段先按单用户 / 单工作区验证。

3. OpenChatCut 的外部 MCP 更偏工程读取与时间线编辑  
   导出、删除工程等立即产生副作用的动作，联调时要单独确认工具面与审批策略，不能先假设所有工具都已无门槛开放。

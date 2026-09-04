# OpenChatCut 独立 Docker 部署与双 MCP 集成说明

## 1. 目标

这份文档只解决一件事：

- 如何把 OpenChatCut 作为独立 Docker 服务部署
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

- 用独立容器跑 OpenChatCut
- 用独立端口 `15199 -> 5199`
- 用 `HOME` 承接 OpenChatCut 本地工程库
- 用 `MEDIA_DIR` 承接素材目录
- 用 `OPENCHATCUT_MCP_TOKEN` 保护外部 MCP

### 启动前准备

1. 在本站仓库平级或固定目录检出 OpenChatCut 源码
2. 复制 `docker/openchatcut.env.example` 为你的环境文件
3. 把 `OPENCHATCUT_SOURCE_DIR` 改成真实源码目录
4. 按实际环境修改端口、目录和 Token

### 启动命令

```powershell
docker compose --env-file "docker/openchatcut.env.example" -f "docker/docker-compose.openchatcut.yml" up -d
```

### compose 样板

```yaml
services:
  openchatcut:
    image: node:24-bookworm-slim
    container_name: openchatcut
    working_dir: /workspace
    init: true
    command: >
      sh -lc "test -f .env.local || cp .env.example .env.local; npm install; npm run dev"
    ports:
      - "${OPENCHATCUT_HTTP_PORT:-15199}:5199"
    environment:
      HOME: /data/home
      MEDIA_DIR: /data/media
      OPENCHATCUT_MCP_TOKEN: ${OPENCHATCUT_MCP_TOKEN:-change-me}
      OPENCHATCUT_EDITOR_URL: ${OPENCHATCUT_EDITOR_URL:-http://127.0.0.1:15199}
      RESOURCE_PREVIEW_TOKEN: ${RESOURCE_PREVIEW_TOKEN:-change-me}
    volumes:
      - ${OPENCHATCUT_SOURCE_DIR:-../OpenChatCut}:/workspace
      - ${OPENCHATCUT_HOME_DIR:-./local-data/openchatcut/home}:/data/home
      - ${OPENCHATCUT_MEDIA_DIR:-./local-data/openchatcut/media}:/data/media
    restart: unless-stopped
```

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

## 8. OpenClaw 的双 MCP 编排口径

后续给 OpenClaw 的正式口径应是：

1. 先调用本站 MCP 创建素材
2. 再调用 OpenChatCut MCP 组织时间线
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

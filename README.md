# AI全域运营系统

## 项目结构

- `apps/web`: 用户前台与管理后台前端
- `apps/server`: NestJS 风格后端服务
- `packages/shared`: 前后端共享类型与常量
- `packages/prompt-runtime`: 技能与提示词运行时
- `packages/ui`: 可复用 UI 组件预留
- `prisma`: 数据库模型与迁移
- `docs`: 项目补充文档
- `infra`: 部署与基础设施配置预留

## 当前状态

当前仓库已经不是“第一版骨架”，而是一个已接通前后台主链路的业务系统，当前已落地的核心能力包括：

1. 邀请码注册、登录、品牌切换与多用户协作基础能力
2. 品牌增长策略工作台：品牌资料库、收集数据、品牌增长报告、半年营销规划、营销日历
3. 小红书工作台：营销策划方案、素材库、原创笔记、二创笔记、视频笔记
4. 抖音工作台：营销策划方案、素材库、热点找选题、选题库、原创文案、二创文案、复刻短视频、AI生视频（故事板）、AI生视频、数字人、广告预审
5. 后台与前台技能中心、提示词注册表、品牌级共享覆盖
6. 任务中心、作品中心、第三方平台配置与 OSS 资源持久化

其中抖音“复刻短视频”当前已经独立为单独板块：创建时优先从抖音素材库选择带视频链接的素材，第一阶段按每 15 秒一段输出复刻分析、角色卡、分镜脚本、角色图和分镜图，第二阶段逐段生成视频并自动拼接完整成片。

更完整的页面、模块和主链路说明请查看：

- `docs/site-map.md`
- `docs/README.md`

## 数据库初始化

1. 复制 `.env.example` 为 `.env`，补上 `DATABASE_URL`
2. 生成 Prisma Client:
   - `npm run prisma:generate`
3. 推送数据库结构:
   - `npm run prisma:db:push`
4. 写入演示数据:
   - `npm run prisma:seed`

如果想一步完成，可直接执行：

- `npm run db:init`

## 当前 demo 数据

- 演示账号手机号: `13800000000`
- 演示品牌: `武汉仟吉`
- 已写入品牌背景、产品资料、品牌调研、品牌账号、竞品账号、行业资料、经营资料

## 本地前端稳定启动

- 常规启动: `npm run dev:web`
- 稳定启动: `npm run dev:web:stable`
- `dev:web:stable` 会直接使用 `node + next bin` 拉起 `3001`，避免 `npx` 偶发退出
- 启动成功后会输出页面地址 `http://localhost:3001/brand-growth`
- 日志写入 `.runtime/web-3001.out.log` 和 `.runtime/web-3001.err.log`

## 当前交付形态

也就是说，**当前是“zip + cmd 安装入口”交付，不是“仓库内直接放 exe”**。  
如果后面要做真正的 `.exe` 安装器，需要再补一层 NSIS / Inno Setup / WiX 之类的打包流程；当前仓库基线里还没有这一步。

### 2. 最推荐怎么用

如果你是要给别人安装，优先走：

1. 在源码仓库里生成 release 包
2. 拿 `.release/artifacts/AiOmniOps-local-single-user-win-x64.zip`
3. 解压后运行 `install-local-single-user.cmd`

如果你是开发或调试，直接走源码启动。

## 环境要求

### 源码运行 / 打包

- Windows
- Node.js 20
- npm

### 本地单机安装包使用

- Windows
- 不要求用户机器预装 Node

## 安装教程

### 方式 A：生成本地单机安装包并安装

这是当前最接近“交付给用户”的方式。

1. 安装依赖

```powershell
npm ci
```

2. 生成 release 分发包

```powershell
npm run local:release:package
```

3. 生成完成后，拿这个文件：

```text
.release/artifacts/AiOmniOps-local-single-user-win-x64.zip
```

4. 解压 zip

5. 运行解压目录里的：

```text
install-local-single-user.cmd
```

6. 安装完成后，可通过下面任一方式启动：

- 桌面快捷方式
- 安装目录里的 `start-local-single-user.cmd`

7. 进入系统后，如需升级新版本，优先在个人中心里的 `版本与升级` 页面执行：

- `检查更新`
- `预下载安装包`
- `立即升级`

默认安装目录：

```text
%LOCALAPPDATA%\Programs\AiOmniOps
```

### 方式 B：直接从源码运行

适合开发、联调、排障。

1. 安装依赖

```powershell
npm ci
```

2. 如果是正式数据库链路，先准备 `.env`

```powershell
Copy-Item .env.example .env
```

3. 初始化数据库

```powershell
npm run db:init
```

4. 启动本地单机模式

```powershell
npm run local:launcher
```

或者只开前端 / 后端开发链路：

```powershell
npm run dev:web:stable
npm run dev:server:stable
```

## 使用教程

### 本地单机模式启动后做什么

1. 打开本地工作台
2. 进入：
   - `/brand-growth`
   - `/xiaohongshu`
   - `/douyin`
   - `/wechat`
   - `/more-features/design`
   - `/personal-center`
3. 按需要继续做内容生成、工作流验证或后台配置
4. 安装态升级优先走个人中心 `版本与升级`，不再要求每次手工回 GitHub 解压覆盖

### 常用命令

```powershell
# 本地单机启动
npm run local:launcher

# 生成 release 目录
npm run local:release:build

# 生成可分发 zip
npm run local:release:package

# 安装开机自启动
npm run local:autostart:install

# 移除开机自启动
npm run local:autostart:remove

# 查看开机自启动状态
npm run local:autostart:status
```

## 目录说明

- `apps/web`：前端站点
- `apps/server`：后端 API
- `packages/*`：共享能力
- `prisma`：数据库 schema
- `scripts/local-single-user-*.cjs`：本地单机启动链
- `scripts/build-local-single-user-release.cjs`：生成 release 目录
- `scripts/package-local-single-user-release.cjs`：生成 zip 分发包
- `docs`：系统基线、专题方案和变更记录

## 常见问题

### 1. 我已经克隆仓库了，为什么还是没有安装包

因为安装包不会直接提交进源码仓库。  
需要你自己执行：

```powershell
npm run local:release:package
```

### 2. 为什么不是直接双击一个 exe

当前仓库的交付基线是：

- `zip`
- `install-local-single-user.cmd`
- `start-local-single-user.cmd`
- 随包 `node.exe`

还没有额外做 `.exe` 安装器封装。

### 3. release 包生成后在哪里

```text
.release/artifacts/AiOmniOps-local-single-user-win-x64.zip
```

### 4. 更多系统结构和变更记录去哪里看

- `docs/README.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/changes/*.md`

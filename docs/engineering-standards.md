# AI全域运营系统开发规范

## 1. 目标

- 让后续开发始终围绕当前真实产品结构推进
- 降低页面继续膨胀、业务链路错绑、文档与代码脱节的概率
- 把已经验证过的通用规则固定下来，避免重复返工

## 2. 适用范围

- `apps/web`
- `apps/server`
- `packages/config`
- `packages/prompt-runtime`
- `packages/shared`
- `packages/ui`
- `apps/web/public/extensions/*`
- `docs`

## 3. 当前系统事实

### 3.1 入口事实

- `/` 是官网首页，不再承担登录入口职责
- `/login`、`/register` 是前台账号入口
- `/admin/login` 是后台管理员入口
- `/brand-growth`、`/xiaohongshu`、`/douyin`、`/wechat`、`/more-features/design`、`/personal-center/*` 是受保护页面，未登录统一跳转 `/login?next=...`
- `/admin` 只允许后台角色进入

### 3.2 当前业务工作台

- 品牌增长策略：品牌资料、采集、品牌增长报告、半年营销规划、营销日历
- 小红书工作台：素材库、原创、二创、视频、发布
- 抖音工作台：热点、选题、原创、二创、AI 生视频、数字人、发布
- 公众号工作台：配置、原创创作、HTML 草稿、一键发布
- 设计工作台：图片、HTML、PPT、视频等设计任务
- 个人中心：概览、任务、订单、作品、技能、第三方接口、OpenClaw、安全、团队、邀请
- `local-single-user` 安装态个人中心已开始承接“版本与升级”，默认通过 GitHub Releases 检查新包，并由后端受控触发独立 updater 执行本地替换；网站版或源码运行态个人中心默认不展示该入口
- 后台：用户管理、接口供应商、知识库、技能中心、能力包、模块注册中心、模型用量、计费规则

### 3.3 当前技术选择

- 前端：Next.js App Router
- 后端：NestJS 风格模块化服务
- 数据：Prisma + 正式表结构
- 资源：OSS 为正式真源，本地仅允许受控回退
- 长任务：任务中心异步执行，不再依赖同步长请求等待完整产物
- 当前协作模式：单 Agent 收口

## 4. 前端规范

### 4.1 页面入口做薄

- `page.tsx` 和 `layout.tsx` 只做入口装配、权限门卫和页面布局
- 工作区聚合逻辑下沉到 `workspace-shell.tsx`、hooks 或 service
- 单页面同时承载“工作区 + 弹窗 + 发布 + 轮询 + 列表详情”时，优先拆分
- 凡是只属于 `local-single-user` 安装态的能力，默认不得直接暴露到网站版或源码运行态；至少同时检查并门禁：
  - 二级导航 / tab
  - 概览卡片、workspaceLinks、快捷入口
  - 直接输入 URL 的页面路由
  - 页面里任何“检查更新 / 一键升级 / 本地安装目录”类说明文案
- 如果后端已经通过 `supported`、`canApplyUpdate` 之类运行时状态区分安装态与网页态，前端所有入口必须复用同一份判断，不能各页面各写一套，也不能只拦一个入口而放过其他入口

### 4.2 品牌上下文必须真实

- 品牌域页面首次加载前，优先通过 `/auth/me` 或等价真实接口校正当前品牌
- 不允许继续依赖浏览器残留的 demo brand 或旧 brand 直接发请求
- 二级媒体代理、附件下载、灯箱预览也必须透传当前真实 `brandId`

### 4.3 Service 只做请求层

- `apps/web/src/services/*.ts` 只负责 HTTP 请求、参数整理、响应类型
- 不在 service 中写 DOM、弹窗、页面状态和轮询编排
- 可选模型、可选 Provider 必须由后端动态下发，不再在前端写死枚举

### 4.4 工作台与列表交互

- 主工作台优先使用统一壳层和统一操作区
- 同一列表中的主按钮保持统一视觉语言
- 危险操作必须二次确认
- 配置中心类页面默认支持搜索、筛选、敏感字段遮挡和长 JSON 折叠

### 4.5 扩展与发布

- 浏览器扩展只通过统一协议与站内页面通信
- 发布页面必须提供下载入口、安装说明和失败排查提示
- 当前已存在的扩展包括 `xhs-draft-publisher`、`omni-publisher`、`douyin-publisher`、`wechat-channel-publisher`

### 4.6 local-single-user 启动链

- `scripts/local-single-user-launcher.cjs` 是本地单机模式的标准入口
- launcher 构建 Web 时，如果存在 standalone 产物，必须优先以 standalone `server.js` 拉起，而不是继续固定使用 `next start`
- standalone 运行前必须同步 `.next/static` 与 `public/`，否则会出现 HTML 可访问但客户端 chunk / CSS 缺失
- launcher 拉起 Web 时，不能让运行中的站点继续直接吃源码目录 `apps/web/.next/standalone`；必须先把 standalone 产物整体分发到 `LOCAL_APP_DATA_ROOT/runtime` 下的独立运行包，再在该运行包内同步 `.next/static` 与 `public/`
- 当主 `local-single-user` runtime 仍在服务用户时，不允许再对同一份 live `.next` 目录直接做 fresh `next build` 作为日常验证手段；要么先停站重建，要么使用隔离的构建/预览路径
- 面向用户交付 `local-single-user` 时，默认不能要求用户机器预装 Node；发布物至少要提供随包 `node.exe`、可双击启动的 `.cmd` 入口，以及与 launcher 相匹配的 `app/` 运行目录
- 面向用户分发 `local-single-user` 时，不能只停留在裸 `.release/local-single-user-win-x64` 目录；至少还要提供安装入口和可校验的压缩包产物，例如 `install-local-single-user.cmd`、`.zip` 与配套 `.sha256`
- `local-single-user` 的“检查更新 / 立即升级”入口默认放在个人中心，由后端统一检查 GitHub Releases；前端只负责展示版本状态和触发动作，不在浏览器里直接替换安装目录
- “版本与升级”这类安装态专属入口，不允许再串回网站版个人中心；后续新增相关入口时，必须同步覆盖概览页、导航和直达路由的三层门禁
- 自动升级必须通过独立 updater 在安装目录外执行；升级前必须先校验 `.zip` 对应的 `.sha256`，升级时只替换程序目录，不动 `LOCAL_APP_DATA_ROOT` 下的 `data/`、`storage/`、`logs/`、`cache/`、`backup/`、`updates/`
- 凡是 `local-single-user` 交付链里会被 Windows PowerShell 5 直接执行的 `.ps1`，包括独立 updater 和安装脚本，都必须以 `UTF-8 BOM` 写入；Node 侧生成或复制脚本时不能只落无 BOM 的 `utf8` 文本
- 如果 `local-single-user` 的独立 updater 要在安装前整体移动或替换安装根，停机阶段不能只杀 runtime metadata 中记录的 launcher / server / worker / web PID；还必须额外清理命令行仍引用 `start-local-single-user.cmd` 的 `cmd.exe` wrapper 进程，否则 `Move-Item` 会因为文件占用留下“半替换”安装根
- 如果 `local-single-user` 升级链里存在由 PowerShell 写出的本地 JSON（例如 `system-update-status.json`），Node 侧读取时必须先剥掉 UTF-8 BOM 再做 `JSON.parse`，不能假设持久化状态文件一定是纯无 BOM 文本
- Windows 下构建 `local-single-user` 发布物时，大目录复制优先走 `robocopy` 这类系统级工具，不要继续直接依赖 Node `fs.cpSync()` 去整包复制 `node_modules`、standalone 等大目录；否则既可能把进程直接打崩，也没有足够的进度日志可用于排障
- 如果 launcher 在安装态仍会调用 `npm-cli.js`、并且仍可能依据源码指纹决定是否重跑 `server build` / `web build`，那么发布物就不能只带 `node.exe + dist/standalone`；还必须随包带上 launcher 真正依赖的 npm 运行时和对应源码输入，至少覆盖 `bin/node_modules/npm`、`apps/server/src` 这类安装态首启会命中的输入
- 面向用户分发的正式 `local-single-user` 发布物，默认应开启 `LOCAL_SINGLE_USER_PREBUILT_ONLY=true` 并按预构建运行时模式启动；除非明确要支持安装态现场重编诊断，否则不要再把 `apps/server/src`、`apps/web/src`、顶层 `next/@next/react` 等仅服务构建兜底的大体积输入继续打进升级包
- launcher 中 `Prisma db push`、`server build`、`web build` 这类长耗时步骤不能只打印开始和结束；至少要有周期性报活日志，避免把正常慢构建误判为卡死
- launcher 重启时，像 `Web build` 这种重步骤不能默认每次都全量重跑；如果源码与依赖输入未变化，必须优先复用已有产物并显式打印 `skip`，把本地启动时间从重复构建转成复用启动
- `apps/web` 的 SWC / wasm 口径默认走“兼容优先”：真实本地机器不要一刀切强制 `useWasmBinary`；但在已知原生 SWC DLL 异常的沙箱环境里，可以自动强制 wasm，避免先尝试 native 再失败回退带来的额外耗时
- Windows 下如果 launcher 依赖 `next build`，且现场已知存在 `@next/swc-win32-x64-msvc` 这类原生 SWC 包，启动前应优先做一次最小原生加载探测；若直接 `require()` 已失败，则应只对当前 launcher 运行受控注入 `NEXT_FORCE_WASM_BINARY=1`，避免每次都重复踩“先 native 失败再 fallback”的慢路径
- 这类原生预检本身不能成为新的阻塞点；像 SWC `.node` 探测这类启动前探测必须带超时，并在超时后按“探测失败 -> 走兼容兜底”处理，不能让 launcher 卡死在探测阶段
- 对原生 SWC 的环境判断要先排除低级干扰项再下结论：至少区分“中文路径/仓库路径问题”“VC runtime 缺失”“当前环境全面禁止 native addon”与“Next SWC 二进制专项兼容问题”；如果像 `sharp` 这类其它 `.node` 模块可正常加载，就不要再把问题笼统归因为“沙箱不支持所有原生模块”
- 本地单机验证默认至少覆盖：`/brand-growth`、`/xiaohongshu`、`/douyin`、`/wechat`、`/more-features/design`、`/personal-center`
- 前端排障埋点如果需要浏览器上报，统一走 `apps/web/src/lib/runtime-debug.ts` 这类受控 helper，默认关闭
- 不允许继续在页面、工作区或 service 中硬编码 `http://127.0.0.1:*` 的调试上报地址，避免把开发期调试端口带进本地正式链路
## 5. 后端规范


### 5.1 Controller 与 Service 分层

- Controller 只做参数接收、权限门卫和返回包装
- 复杂业务逻辑下沉到 service、gateway、repository、mapper
- 外部集成调用不允许散落在 controller 和页面层

### 5.2 配置与依赖注入

- 环境变量统一收口到配置模块
- 不允许在业务 service 中继续散读 `process.env`
- 不允许继续手工 `new AppConfigService()` 绕开 DI

### 5.3 品牌与权限校验

- 所有按 `brandId` 读取或写入数据的接口，都必须校验当前用户对该品牌的访问权限
- 不能只信任前端传入的 `brandId`
- 后台权限、会员等级、品牌协作权限要分层建模，不混用一个字段表达

### 5.4 长耗时任务

- 报告生成、内容生成、视频生成等长链路统一走任务中心
- 页面只负责创建任务、轮询状态和读取结果
- 任务必须具备超时归一化、失败提示和必要的恢复入口

### 5.5 外部模型与 Provider

- 运行时 Provider 以后台配置为真源
- 文本、图像、视频链路都必须校验 `runtimeKey` 兼容性
- 技能配置如指定首选 Provider 或模型，运行时必须先严格尝试，再 fallback
- 报错必须说明失败阶段、尝试顺序、最终原因和是否可重试
- 接入统一网关类新平台时，必须同时补：
  - `api-provider-catalog.ts` 的系统 Provider 种子
  - `third-party-platform-catalog.ts` 的平台聚合映射
  - 前台品牌共享 Key 的说明文案
- 如果新平台复用已有 `runtimeKey`，但暂时不希望直接抢占现有默认路由，默认先以 `DRAFT` 预装，再由后台确认后启用

### 5.6 技能与 Prompt 落库

- 当需求涉及“新增技能”“拆分技能”“新增提示词”“调整技能中心配置”时，默认交付物不是只改前端展示或只改代码枚举，而是要一次性打通：
  - `SkillConfig`
  - `PromptTemplate`
  - `SkillPromptBinding`
  - 前端真实入口或真实调用链
- 默认要求是：服务启动后在数据库可用时自动同步缺失的技能、Prompt 和绑定，不能只依赖内存种子或仓库外临时文件。
- 如果当前执行环境数据库不可达，必须明确告知“本地未能完成真实写库验证”，并补齐自动落库机制、同步脚本或上线后可立即生效的同步路径，不能把“之后手动补库”留给用户猜。
- 技能相关改动完成后，必须同时检查：
  - 后台技能中心是否可见并可编辑
  - 个人中心是否可见并可覆盖
  - 前端业务入口是否真的命中新技能
  - 数据库中是否已有对应记录，或是否具备数据库恢复后自动入库能力

## 6. 知识库与 OpenClaw 规范

### 6.1 知识库

- 前台默认以“知识库”作为用户可理解的主概念，不暴露后台内部容器术语
- 知识绑定一旦进入运行时，必须在文档中明确生效入口、继承链和失败策略
- 当前知识绑定已经进入报告、营销策划、公众号、设计工作台和多条内容生成链路

### 6.2 OpenClaw

- OpenClaw 通过受控 API / MCP / 安装令牌接入当前系统
- 完整令牌不作为服务端明文长期存储
- 品牌上下文、用户身份、权限校验和审计是 OpenClaw 链路的默认要求

## 7. 资源与存储规范

- OSS 是正式资源真源，`.runtime` 仅用于本地开发回退
- 对第三方平台返回的短时效媒体直链，不允许直接作为长期资源真源
- 报告 HTML、作品图、视频、品牌附件都应落受控副本
- 受保护媒体在前端以鉴权拉取 blob 或站内受控接口方式访问，不直接裸链暴露

## 8. 文档与 Git 规范

- 开发前默认先读：`engineering-standards.md`、`site-map.md`、`site-map-mermaid.md`、`development-delivery-checklist.md` 和最近变更记录
- 代码改动后默认补 `docs/changes/*.md`
- 结构变化同步更新 `site-map.md`
- 结构关系变化同步更新 `site-map-mermaid.md`
- 数据边界变化同步更新 `database-archive.md`
- Git 边界、提交拆分和快照备份遵循 `docs/git-workflow.md`
- 如果本次任务暴露出新的交付口径，比如“技能必须落数据库并接前端”，必须把它升级为文档规则，而不是只在当次对话里说明。

## 9. 当前优先级

### P0

- 保持首页、认证、工作台、个人中心、后台和 OpenClaw 口径一致
- 继续压缩超大页面和超大 service
- 保证文档只反映当前事实，不再让历史草案混入基线

### P1

- 持续把共享能力收口到 `packages/*` 或前后端共享层
- 继续把工作区状态、轮询、发布和媒体处理抽成稳定能力
- 减少文档中的重复方案、展示镜像和已放弃路线

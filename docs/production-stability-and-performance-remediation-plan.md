# 生产稳定性与性能治理方案

## 目标

解决以下两个反复出现的问题：

1. 服务器重启、部署或短时负载抖动后，网站偶发不可达、SSH 不稳定、服务像“挂了”
2. 网站平时访问偏卡，尤其是大工作台首屏和依赖第三方链路的页面

这份文档只讨论当前系统的真实问题、真实根因和真实收口动作，不写抽象口号。

## 现状结论

当前线上问题不是单点故障，而是以下几类问题叠加：

1. 单台 ECS 同时承担 `Nginx + Next.js + NestJS + PM2 + 生产构建 + 第三方慢接口调用`
2. GitHub Actions 仍在生产机原地执行 `npm ci + build`
3. 前端部分大页面首屏并发请求过重
4. 部分慢三方调用仍在同步请求链路中兜底重试
5. 生产环境残留调试上报、`.dbg` 文件写入和临时排障逻辑
6. 健康检查过浅，只能证明“进程活着”，不能证明“系统健康”
7. 重启后的应用拉起仍偏依赖人工排查，系统级自启动兜底不够硬

## 第一性原理根因

### 1. 资源竞争

当生产机一边对外提供服务，一边还要构建、装依赖、生成 Prisma、拉第三方资源时：

- CPU 会被编译和压缩占用
- 内存会被 Node、Next、Nest、npm、Prisma 同时争抢
- 磁盘会被 `node_modules` 解压和构建产物写入打满
- 网络会同时承担线上流量和依赖下载

只要其中一个资源接近瓶颈，用户体感就会变成“网站卡”“部署卡”“SSH 也变慢”。

### 2. 请求链路过长

当前浏览器请求很多先到 Next 代理，再转发到 Nest，再调用第三方服务。链路层级过多时：

- 每一跳都增加延迟
- 每一跳都增加失败面
- 任意一个上游慢，都可能把页面拖成“像坏了一样”

### 3. 首屏职责过重

部分工作台首屏会并发拉取太多数据，即使用户只想用一个分区，也会先把其他区块的数据预热出来。单机环境下，这会把平时的“慢”放大成“整站发闷”。

### 4. 调试逻辑污染生产

历史排障期间加过不少运行时 debug 事件、临时上报和 `.dbg` 文件写入逻辑。它们在定位问题时有价值，但如果常驻生产：

- 会增加额外的 HTTP 请求和 IO
- 会让本来已经慢的链路更慢
- 会让部署、日志和故障面更复杂

## 治理原则

1. 先保可用，再做性能优化
2. 先删生产负担，再谈体验提升
3. 先收系统边界，再处理局部页面卡顿
4. 所有治理动作必须能被验证，而不是只靠感觉

## 分阶段方案

## Phase 0：可用性兜底

目标：先让“服务器一抖就整站挂”的概率明显下降。

### 动作

1. 为 `aiops` 用户补齐系统级开机自启动
   - 使用 `systemd + pm2 startup + pm2 save`
   - 确保服务器重启后 `3001/3011` 自动恢复
2. 完整梳理生产恢复手册
   - 固化 `sshd / pm2 / nginx / 本机 curl / 外网 curl` 检查顺序
3. 把当前生产调试残留默认关闭
   - 所有运行时 debug 上报必须显式开启
   - 默认不再向临时调试端口发送事件

### 验收

1. 服务器重启后 5 分钟内无需人工手动拉服务
2. `https://17ai.site/`、`/login`、`/api/health` 可恢复访问
3. 日常访问不再持续产生调试写入和调试请求

## Phase 1：部署链降压

目标：让部署不再和线上流量争抢生产机资源。

### 动作

1. 将 `npm ci + prisma generate + build` 前移到 GitHub Actions 构建阶段
2. 服务器仅负责接收构建产物、切换版本、重载进程
3. 部署脚本增加明确的阶段日志、超时、失败定位
4. 对 release 目录、缓存目录、日志目录做边界约束

### 验收

1. 部署期间首页和 API 仍能稳定访问
2. 生产机不再长时间卡在 `npm ci`
3. 部署失败时能明确分辨是网络、依赖、构建还是切换阶段

## Phase 2：首屏性能收口

目标：解决“网站平时就卡”的主要来源。

### 动作

1. 抖音工作台首屏只加载当前分区必需数据
2. 品牌增长工作台继续压缩首屏并发请求
3. 将可延后加载的数据改为进入子模块后再取
4. 为高频接口补缓存、分页或懒加载
5. 对 OpenClaw MCP 这类 AI 客户端入口，区分“正常多轮 RPC”与“可避免的重复初始化 / 重复鉴权 / 重复写库”

### 验收

1. 登录后进入主要工作台的首屏请求数明显下降
2. 首屏渲染时间、接口等待时间肉眼可感变快
3. 服务器 CPU 和内存波动收敛
4. OpenClaw MCP 正常调用不再把后端 CPU 持续抬高

## Phase 3：慢任务异步化与健康检查升级

目标：解决“接口偶发很慢，把整页拖死”的结构性问题。

### 动作

1. 将慢三方调用从同步请求链路迁到异步任务
2. 页面优先展示任务状态和最近结果，而不是阻塞等待
3. 扩展健康检查：
   - 进程存活
   - 数据库连通
   - 关键依赖可用性
   - 最近构建版本
   - 队列或任务堆积

### 验收

1. 单个第三方服务变慢时，不再拖垮整个页面
2. `/api/health` 能区分“活着”和“真正健康”
3. 问题定位从“靠猜”变成“看指标和状态”

## 当前执行顺序

### 已完成

1. 问题根因梳理与证据定位
2. 部署日志诊断增强
3. 这份治理方案文档落地
4. `pm2-aiops` 开机自启动脚本与恢复手册落地
5. 生产运行时 debug 上报默认关闭
6. `npm ci + build` 已前移到 GitHub Runner，并在 `报错信息/44` 这轮日志中完成闭环验证
7. 前端 `Next standalone` 交付、端口修正、发布包误排除修正、服务器工作区假脏修正均已验证通过
8. `@nestjs/platform-express` 已升级到 `10.4.20`，`multer 1.x` 告警已收口
9. GitHub Actions 已切到 `actions/checkout@v5` 与 `actions/setup-node@v5`，`Node.js 20 actions are deprecated` 告警已收口
10. 抖音工作台首屏已完成第一轮按需加载收口：
   - 首屏只拉共享基础数据与当前板块
   - 未打开过的板块切换时只补该板块数据
   - `growthReport / annualPlan / opportunityInsight` 已从非 `plan` 板块首屏移出
   - 数字人板块的模板库、语音库、脚本模板、试听任务等编辑资源已改为进入对应 tab 后再拉

### 正在执行

1. 继续收缩 release archive 体积与运行时依赖边界
2. 继续观察抖音工作台按需加载上线后的真实体感和接口分布，决定是否继续拆子面板内部加载
3. 调查 `OpenClaw MCP` 请求量异常偏高的根因，并准备做不影响效果的降载收口

### 下一步

1. 连续观察后续多轮部署日志，确认新的部署链不再回退
2. 继续收缩 release archive 体积与运行时依赖边界
3. 基于线上埋点确认 `OpenClaw MCP` 的高请求来源，区分：
   - `initialize / tools/list` 初始化流量
   - 高频重复的 `tools/call`
   - token 鉴权与 `lastUsedAt` 写库造成的额外放大
4. 在确认根因后，优先评估以下降载动作：
   - 安装令牌解析短时缓存
   - `lastUsedAt` 写入节流
   - 只读工具短 TTL 缓存
   - 引导客户端优先走高层组合工具，减少一次意图拆成多个底层调用
5. 评估更深一层的健康检查，减少“进程刚启动时短暂拒绝连接”带来的误判

## 2026-07-15 最新进展补充

### 抖音工作台性能

这一轮已经完成了首屏性能的第一阶段收口，核心不是“再微调一个接口”，而是把 `workspace-shell` 从“挂载就把大半工作台都拉一遍”改成“共享数据和当前板块分开拉”。

目前已落地并上线验证的点包括：

1. 首次进入抖音工作台时，只完整拉共享基础数据和当前板块数据
2. 切换到未打开过的板块时，只补对应板块自己的数据
3. 手动刷新时，才强制完整刷新共享数据和当前板块
4. `growthReport / annualPlan / opportunityInsight` 已从首屏共享加载中拆出，只在 `plan` 板块实际需要时加载
5. 数字人板块进入时，先只拉首页真正需要的骨架数据；模板库、收藏模板、脚本模板、公共声音、我的声音、试听任务等编辑资源改为进入对应 tab 后再取

当前判断：

- 抖音工作台“首屏一上来拉太多板块”的主问题已经被明显压下去
- 下一步不再优先拆 `workspace-shell` 外层，而是根据线上真实请求分布，看是否还有某个子面板在 mount 时继续拉全量列表

### OpenClaw MCP 高请求调查

这轮新的 CPU 排查，已经把焦点从“整站都慢”收窄到 `POST /api/openclaw/mcp`。

当前已确认的事实：

1. `/api/openclaw/mcp` 是 MCP 总入口，`initialize`、`ping`、`tools/list`、`tools/call` 都汇总到这里
2. 线上 access log 中，它已经高于其他业务 API，说明后端压力有一大块来自 OpenClaw 客户端链路
3. 当前安装令牌解析链路里，`resolveInstallToken()` 每次请求都会执行：
   - token hash 查库
   - 品牌权限校验
   - `touchToken()` 更新 `lastUsedAt`
4. 这意味着即便请求本身是“正常的 MCP 多轮调用”，当前实现也会额外放大数据库读写和鉴权开销

为了继续确认是“初始化过多”还是“某几个工具在重复打”，已经上线一版只做证据采集的入口埋点：

1. 文件：`apps/server/src/modules/openclaw/openclaw.controller.ts`
2. 调试记录：`debug-openclaw-mcp-load.md`
3. 线上日志目标：`.dbg/trae-debug-log-openclaw-mcp-load.ndjson`

这版埋点会记录：

- `method`
- `toolName`
- `authSource`
- 来源 IP
- `user-agent`
- `durationMs`
- `isError`

当前结论是：

- OpenClaw MCP 的高请求里，必然包含“正常的多轮 RPC”
- 但当前服务端实现也存在明显可收口的重复成本，尤其是“每次请求都查 token + 校验权限 + 写 `lastUsedAt`”
- 下一步应以“保留功能效果、降低重复成本”为目标，而不是简单粗暴砍掉入口

## 2026-07-18 最新补充：系统资源风险评估

### 一、这次后端挂掉的直接原因

这轮线上后端无法启动，不是服务器本身先扛不住，而是新健康检查代码引入了运行时路径错误：

1. `app.service.ts` 曾通过相对路径 `require("../package.json")` 读取版本号
2. 编译后运行位置变为 `dist/apps/server/src/app.service.js`
3. 运行时找不到对应的 `package.json`
4. 最终导致 `ai-omni-server` 反复重启，`3011` 无法监听

当前该问题已通过热修复收口：改为基于 `process.cwd()` 安全读取 `package.json`，避免再因为编译产物路径变化把后端直接打挂。

### 二、当前最容易拖垮整机的板块

下面不是“功能多就算危险”，而是按对 `2c4g ECS` 这类单机部署的真实压力排序。

#### P0：极高风险，最容易把整机拖慢甚至拖挂

1. `CollectorsService` 采集链路
   - 包含：抖音/小红书账号采集、作品同步、评论抓取、热点抓取、视频缓存、文案提取、启动补跑
   - 风险原因：
     - 启动时可能恢复待处理视频缓存与转写任务
     - 多处批量接口直接 `Promise.all/Promise.allSettled` 并发打第三方
     - 涉及数据库、TikHub、远程媒体下载、OSS 上传四类压力叠加
   - 结论：这是当前全系统第一大资源放大器，尤其在“部署后冷启动 + 历史积压任务”场景下最危险

2. `WorksService` 生成链路
   - 包含：抖音视频生成、RunningHub、数字人、公众号图文、复刻视频、各类素材回写
   - 风险原因：
     - 一个超大服务里同时承载图片、视频、任务状态刷新、媒体下载与上传
     - 存在后台继续生成、恢复任务、状态轮询和外部结果回填
     - 部分链路会继续触发视频下载、封面下载、OSS 回写
   - 结论：这是第二大资源放大器，平时不一定立刻把机器打挂，但会持续抬高 CPU、内存、网络和磁盘 IO

#### P1：高风险，会明显放大后端压力

1. OpenClaw MCP 入口
   - 风险原因：
     - `initialize / ping / tools/list / tools/call` 全走统一入口
     - 频繁调用时会叠加 token 解析、品牌权限校验、访问记录写入
     - 即使请求本身合理，服务端也可能被重复鉴权和重复写库放大
   - 结论：它不一定单独拖垮整机，但会长期抬高 API 压力，是后台“持续发热”的来源之一

2. 报告/营销策划生成链路
   - 风险原因：
     - 超时长、重试层级深
     - provider、baseUrl、apiKey、model 多层 fallback 叠加时，失败一次可能变成连续多次昂贵调用
     - 如绑定知识库，还会在生成前增加额外检索与数据库压力
   - 结论：更像“持续烧资源”的后台模块，适合放到异步任务，不适合长期停留在同步接口链路

3. 数字人训练与大文件上传
   - 风险原因：
     - 单文件大、写临时目录、再上传第三方
     - 多人并发时会直接吃磁盘、网络和文件句柄
   - 结论：属于少量请求就可能明显抬高机器负载的类型

4. ffmpeg 相关视频处理
   - 风险原因：
     - 视频复刻、拼接、导出都属于 CPU 和磁盘 IO 重任务
   - 结论：单任务就重，多任务并发时尤其危险

#### P2：中高风险，本身未必致命，但会放大主问题

1. 前端多轮询工作台
   - 包括：抖音工作台多个分区轮询、品牌增长工作区轮询、RunningHub 状态轮询
   - 风险原因：
     - 页面一旦长期打开，会把后端聚合接口持续拉高
     - 如果后端刚好在跑采集或生成任务，就会形成“前端轮询 + 后端重任务”双重放大

2. `/api/health` 当前实现
   - 风险原因：
     - 当前会先做一次 `canUseDatabase()`，后续 `getSchemaSummary()` 又会再做一次数据库可用性检查
     - 启动脚本或部署脚本高频探活时，会把数据库探针流量放大
   - 结论：它不是当前最大的资源来源，但属于应该继续收口的小放大器

### 三、如果要临时减负，哪些板块最值得优先限制或下线

如果线上再次出现明显资源吃紧，不建议先砍基础页面，而是按下面顺序做“限流 / 暂停 / 降级”：

1. 第一优先：暂停 `CollectorsService` 的启动补跑、每日热点补跑、视频缓存恢复、转写恢复
   - 收益最大
   - 对基础页面可用性影响最小
   - 已经证明这是部署后最容易触发雪崩的链路

2. 第二优先：限制品牌增长里的全量采集和评论深翻页
   - 保留核心查询和查看能力
   - 暂时降低全量同步、批量评论抓取、批量账号同步的并发
   - 对用户的影响小于“整站挂掉”

3. 第三优先：限制视频复刻、数字人训练、RunningHub、长视频生成等重媒体任务
   - 这些功能价值高，但最吃机器
   - 更适合做单独任务队列、单独 worker，或者直接迁出主业务机

4. 第四优先：限制 OpenClaw MCP 的高频工具调用
   - 不是完全关闭，而是优先做短 TTL 缓存、只读工具缓存、写入节流、调用限速
   - 避免一个 AI 客户端把单机后端持续拖热

5. 第五优先：限制报告/营销策划的大模型 fallback 深度
   - 保留成功率，但避免失败时自动连打多轮昂贵调用

### 四、如果只能做少数优化，最值钱的是哪些

#### 第一梯队：做了系统就会明显稳很多

1. 继续把 `CollectorsService` 变成“受控后台任务”，而不是应用启动后随时自动补跑
2. 给所有批量采集入口补并发上限，杜绝裸 `Promise.all`
3. 把视频生成、ffmpeg、数字人训练、RunningHub 迁出主业务进程
4. 将重媒体任务和普通页面/API 请求彻底隔离

#### 第二梯队：做了系统会持续降温

1. 统一收口前端多轮询，改成单轮询入口或更长轮询间隔
2. 继续优化 OpenClaw MCP 的 token 解析、权限校验和只读结果缓存
3. 将报告、营销策划等大模型任务改成异步任务态，而不是同步等待
4. 收口 `/api/health` 的重复数据库探测，避免探针把冷启动压力继续放大

#### 第三梯队：可以保留，但要明确边界

1. 大文件上传继续保留，但要限制并发和临时文件生命周期
2. 媒体 OSS 上传继续保留，但不能再默认和其他重任务叠加并发
3. 调试日志与 `.dbg` 继续只在排障时显式开启，生产默认关闭

### 五、当前建议的系统取舍

对当前这套系统，不建议优先删除的板块：

1. 登录、个人中心、基础品牌信息、普通 CRUD 页面
2. 轻量查询类接口
3. 已经做过按需加载收口的常规工作台基础页

真正应该优先“限制、拆分、迁出或异步化”的板块：

1. 采集链
2. 重媒体生成链
3. OpenClaw MCP 高频工具调用链
4. 报告与营销策划的大模型重试链
5. 前端高频轮询触发链

一句话判断：

- 真正会拖垮系统的，不是静态页面，也不是普通后台管理页
- 真正危险的是“采集 + 媒体 + 轮询 + 重试 + 启动补跑”几类能力叠加在同一台业务机上
- 后续如果只能优先保一件事，应该优先保“主站可用”，把重采集和重媒体任务做成可暂停、可限流、可迁出的受控能力

### 六、下一步治理顺序补充

1. 先继续观察 `CollectorsService` 相关开关在生产上的真实效果，确保部署后不再自动补跑重任务
2. 再给批量采集、评论抓取、热点抓取补统一并发控制
3. 然后优先拆出重媒体任务：数字人、视频复刻、RunningHub、长视频生成
4. 再处理 OpenClaw MCP 和前端轮询的“持续发热”问题
5. 最后收口 `/api/health` 的重复数据库探针和其他小型放大点

### 七、2026-07-18 已落地第一批优化

这一轮已经不是只停留在评估，而是先把最容易落地、收益最高的一批保护措施真正加进代码。

1. `CollectorsService` 采集链统一增加并发闸门
   - 涉及：品牌账号同步、竞品账号同步、品牌作品同步、抖音作品同步、评论采集、每日热点同步、对标作品同步、目标用户同步
   - 当前默认策略：
     - `COLLECTORS_SYNC_CONCURRENCY=2`
     - `COLLECTORS_SYNC_BATCH_LIMIT=10`
     - `COLLECTORS_COMMENT_PAGE_REQUEST_LIMIT=8`
     - `COLLECTORS_DAILY_HOTSPOT_PLATFORM_CONCURRENCY=2`
     - `COLLECTORS_DAILY_HOTSPOT_BRAND_CONCURRENCY=1`
   - 作用：避免批量采集继续通过裸 `Promise.all` 瞬时打满第三方接口、数据库与 OSS

2. 评论采集增加单次请求硬上限
   - 涉及：抖音评论采集、小红书评论采集
   - 当前策略：单次提交的评论分页请求数量会被硬限制，超过上限会截断并记日志
   - 作用：避免“评论深翻页”在单次操作里持续放大压力

3. 每日热点定时采集改为受控并发
   - 涉及：品牌维度并发、平台维度并发
   - 当前策略：品牌之间默认串行，单品牌平台采集为小并发
   - 作用：降低定时任务在单机环境下一次性扫全品牌时的瞬时冲击

4. `/api/health` 去掉重复数据库探测
   - 当前策略：单次健康检查只探测一次数据库可用性，再把结果复用到 `schema summary`
   - 作用：减少探针、部署脚本、启动脚本对数据库的重复放大

5. 当前状态判断
   - 已完成：S 级中的“批量采集并发限制”“评论请求限量”“健康检查去重”
   - 已完成且此前已上线：生产环境默认关闭重型启动补跑
   - 已完成：A 级中的“前端多轮询第一轮收口”“OpenClaw MCP 第一轮降载”“重媒体列表轮询与后台刷新第一轮收口”“重媒体 detached 后台任务并发闸门”
   - 下一步继续做：重媒体任务隔离

6. 前端多轮询已完成第一轮收口
   - 涉及：抖音工作台、品牌增长工作台中的抖音采集轮询
   - 当前策略：
     - 抖音工作台原本多个独立 `setInterval` 已合并为单调度器
     - 轮询改为“本轮完成后再排下一轮”，避免请求重叠
     - 页面在隐藏标签页时跳过轮询，避免后台空转
   - 作用：减少页面长开时对后端的持续放大，降低多个工作区并行轮询带来的常驻压力

7. OpenClaw MCP 已完成第一轮降载
   - 涉及：`/openclaw/mcp` 入口调试写盘、只读工具调用缓存、写操作后缓存失效
   - 当前策略：
     - 生产环境默认不再常驻开启 `ENABLE_OPENCLAW_MCP_LOAD_DEBUG`
     - `get_*`、`list_*`、`check_*`、`route_*` 以及只读 `manage_*` 动作增加短 TTL 内存缓存
     - `create_*`、`update_*`、`delete_*`、`sync_*`、`generate_*`、`publish_*` 等写操作完成后按当前调用作用域主动清缓存
     - 缓存按 `authorization`、`cookie`、`x-brand-id`、`x-session-id` 组合隔离，避免跨品牌串数据
   - 默认参数：
     - `OPENCLAW_READONLY_TOOL_CACHE_TTL_MS=2000`
     - `OPENCLAW_READONLY_TOOL_CACHE_MAX_ENTRIES=200`
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：减少 MCP 客户端高频只读 RPC 对服务端重复鉴权、重复查数和重复写盘带来的常驻热度

8. 重媒体列表轮询与后台刷新已完成第一轮收口
   - 涉及：`RunningHub` 工作台轮询、重媒体作品列表返回时的后台快照刷新
   - 当前策略：
     - `RunningHub` 工作台由固定 `setInterval` 改为“本轮结束后再排下一轮”
     - 页面处于隐藏标签页时跳过轮询，避免后台空转
     - 重媒体列表的后台快照刷新上限由写死常量改为环境变量控制
     - 默认只并发刷新少量进行中的重媒体任务，避免列表接口顺手带起一批第三方状态查询
   - 默认参数：
     - `WORKS_LIST_SNAPSHOT_BACKGROUND_REFRESH_LIMIT=2`
   - 验证结果：`apps/server`、`apps/web` 已通过构建
   - 作用：减少数字人、对口型、RunningHub 等长任务在“列表页长开 + 后台同步”场景下对主业务机的持续占用

9. 重媒体 detached 后台任务已加第一轮并发闸门
   - 涉及：抖音口型驱动、AI 生视频、复刻短视频、直出视频、数字人视频、数字人完整视频、RunningHub 应用、数字人训练
   - 当前策略：
     - 原本创建任务后通过 `setTimeout(..., 0)` 立即放出的后台重任务，改为统一进入 `WorksService` 内存队列
     - 队列按全局并发上限逐个放行，避免短时间连续创建多个重媒体任务时一起抢占 CPU、内存、第三方配额和网络连接
     - 任务创建接口仍可快速返回，但真正的重计算/重上传/重轮询只会按闸门受控启动
   - 默认参数：
     - `WORKS_HEAVY_BACKGROUND_TASK_CONCURRENCY=1`
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：进一步降低“同一时刻多条视频链同时起跑”导致主站接口抖动、任务互相拖慢和单机资源瞬时打满的风险

10. 重媒体结果恢复轮询已加第一轮自愈守护
   - 涉及：口型驱动、数字人视频、RunningHub 已提交第三方任务后的结果恢复
   - 当前策略：
     - `WorksService` 在模块启动后可按固定间隔轮询扫描可恢复的重媒体 HTML 作品
     - 仅扫描带有第三方 `providerTaskId` 且尚未成功/失败的记录，不做全量无差别刷新
     - 扫描到的恢复任务继续进入同一套重任务并发闸门，避免“恢复线程”反过来把机器打热
     - 即使服务重启，也不必等用户重新打开作品列表才能继续刷新第三方结果
   - 默认参数：
     - `WORKS_HEAVY_RECOVERY_POLLING_ENABLED=true`
     - `WORKS_HEAVY_RECOVERY_POLLING_INTERVAL_MS=30000`
     - `WORKS_HEAVY_RECOVERY_POLLING_BATCH_LIMIT=2`
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：降低重启、发版或短时故障后“第三方任务仍在跑，但站内状态没人继续拉取”导致的僵尸任务和人工找回成本

11. 已补最小可落地的重媒体 worker 独立进程模式
   - 涉及：`apps/server/src/main.ts`、`ecosystem.config.cjs`
   - 当前策略：
     - `SERVER_BOOT_MODE=api` 时继续作为主 API 进程对外监听 `3011`
     - `SERVER_BOOT_MODE=worker` 时仅启动 Nest 上下文和后台守护，不监听 HTTP 端口
     - PM2 新增 `ai-omni-server-worker`，专门承担重媒体恢复轮询与受控后台任务
     - 主 API 进程显式关闭 `WORKS_HEAVY_RECOVERY_POLLING_ENABLED`，避免与 worker 重复轮询
   - 默认参数：
     - 主 API：`SERVER_BOOT_MODE=api`、`WORKS_HEAVY_RECOVERY_POLLING_ENABLED=false`
     - Worker：`SERVER_BOOT_MODE=worker`、`WORKS_HEAVY_RECOVERY_POLLING_ENABLED=true`
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：把“持续恢复第三方重媒体结果”的后台守护从主站 HTTP 进程中拆出去，进一步降低主 API 进程被后台轮询链路拖慢的概率

12. 第一批重媒体提交链路已支持下沉到 worker
   - 涉及：抖音数字人视频、RunningHub 应用提交
   - 当前策略：
     - `WORKS_HEAVY_SUBMISSION_WORKER_ENABLED=true` 时，主 API 仅负责创建任务与作品记录，不再在请求内直接启动这两类重任务
     - worker 进程通过已有的重媒体轮询守护识别“未提交但可重建输入”的作品，再受控启动第三方提交
     - 当前仅放开已经具备完整持久化输入的两条链：`DOUYIN_DIGITAL_HUMAN_VIDEO`、`DOUYIN_RUNNINGHUB_APP`
     - 当时尚未下沉的数字人训练、完整数字人视频、脚本/分镜视频链路，已在后续批次继续补齐
   - 默认参数：
     - 主 API：`WORKS_HEAVY_SUBMISSION_WORKER_ENABLED=true`
     - Worker：`WORKS_HEAVY_SUBMISSION_WORKER_ENABLED=true`
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：进一步缩短主 API 在“创建重媒体任务”请求中的驻留时间，把可下沉的第三方提交动作转移到 worker 进程处理

13. 口型驱动已补输入持久化并支持 worker 重建提交
   - 涉及：`DOUYIN_LIP_SYNC_VIDEO`
   - 当前策略：
     - 创建口型驱动任务时，源视频与驱动音频会先持久化到站内对象存储，再把 `storageKey / url / contentType / sizeBytes` 写入作品 metadata
     - `WORKS_HEAVY_SUBMISSION_WORKER_ENABLED=true` 时，主 API 只创建任务和 HTML 作品，不再在请求链里直接上传蝉镜文件与创建第三方任务
     - worker 轮询到“未提交且可重建输入”的口型驱动作品后，会从站内存储读回原始文件，重建 `UploadFilePayload`，然后复用原有蝉镜提交流程
     - 已提交且带 `providerTaskId` 的口型驱动作品，仍沿用已有恢复轮询逻辑继续查询结果
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：把口型驱动这条“文件上传 + 三方建任务”的重链路从主 API 请求中移出，同时保留服务重启后的可恢复性

14. 数字人训练已补训练视频持久化并纳入 worker 恢复闭环
   - 涉及：`DOUYIN_DIGITAL_HUMAN_CUSTOM`
   - 当前策略：
     - 创建定制数字人任务时，训练视频会先持久化到站内对象存储，再把 `storageKey / url / contentType / sizeBytes` 写入作品 metadata
     - `WORKS_HEAVY_SUBMISSION_WORKER_ENABLED=true` 时，主 API 仅创建任务与 HTML 作品，不再在请求链中直接上传训练视频和发起蝉镜训练
     - worker 轮询到“未提交且可重建输入”的定制数字人作品后，会回读训练视频并复用原有训练提交流程
     - 当定制数字人已经拿到 `personId` 但仍处于 `RUNNING` 状态时，worker 也会继续轮询同步训练结果，避免服务重启后状态停在半途
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：进一步把定制数字人这条“上传大视频 + 长时间训练等待”的重链路从主 API 请求中移出，并补上训练中断后的恢复能力

15. 完整数字人视频已补分段输入持久化并支持 worker 重建执行
   - 涉及：`DOUYIN_DIGITAL_HUMAN_COMPLETE_VIDEO`
   - 当前策略：
     - 创建完整数字人视频时，会把每个 segment 的人物、脚本、背景、字幕等生成参数整体写入作品 metadata
     - `WORKS_HEAVY_SUBMISSION_WORKER_ENABLED=true` 时，主 API 只创建任务和 HTML 作品，不再在请求链中直接串行生成各段视频并做 ffmpeg 拼接
     - worker 轮询到 `compositeMode=SEGMENT_MERGE` 且带有持久化 `segments` 的作品后，会重建完整 payload，复用原有串行生成与拼接流程
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：把“多段生成 + 最终拼接”这条持续占用 CPU、网络和 ffmpeg 的长链路进一步从主 API 进程中移出

16. 脚本/分镜视频工作流初始阶段已支持 worker 重建执行
   - 涉及：`XHS_VIDEO_NOTE`、`DOUYIN_VIDEO_NOTE`、`DOUYIN_DIRECT_VIDEO`、`DOUYIN_REMIX_SHORT_VIDEO`
   - 当前策略：
     - worker 已纳入这 4 类视频作品的 `QUEUED` 初始阶段扫描；若作品尚未生成故事板、视频提示词或第三方任务，则会按 metadata 重建执行上下文
     - 重建时优先通过 `calendarItemId / productId / materialId` 回查营销日历、产品档案与统一素材库；营销策划方案按作品类型回查小红书或抖音方案工作区
     - 普通视频笔记与抖音 AI 生视频会复用原有脚本生成 + 分镜图生成流程；抖音直出视频会复用提示词生成流程；抖音复刻短视频会复用原有拉片分析与角色卡/分镜图生成流程
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：进一步把“脚本生成 / 分镜图生成 / 复刻分析”这类高时延、重模型调用阶段从主 API 请求链中剥离到 worker

17. 视频工作流后半段提交与恢复已支持 worker 接管
   - 涉及：`XHS_VIDEO_NOTE`、`DOUYIN_VIDEO_NOTE`、`DOUYIN_DIRECT_VIDEO`、`DOUYIN_REMIX_SHORT_VIDEO`
   - 当前策略：
     - 用户点击“继续生成视频”后，主 API 在 `WORKS_HEAVY_SUBMISSION_WORKER_ENABLED=true` 模式下只负责创建任务与写入 `GENERATING_VIDEO` 状态，不再在请求内直接启动第三方视频生成
     - worker 会扫描 `GENERATING_VIDEO` 且尚未真正提交的视频作品，并复用原有 `runContinueVideoGenerationTask / runContinueRemixShortVideoGenerationTask` 执行后半段提交
     - 对已拿到 `providerTaskId` 但视频仍未回存的视频笔记，worker 也会继续调用既有恢复逻辑查询第三方状态，减少“提交成功但主进程重启后停在半途”的情况
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：把视频工作流中最容易拉长 HTTP 请求和占用主进程线程的“提交第三方任务 / 轮询回收结果”阶段也迁移到 worker

18. 复刻短视频已补 segment 级断点续跑
   - 涉及：`DOUYIN_REMIX_SHORT_VIDEO`
   - 当前策略：
     - `runContinueRemixShortVideoGenerationTask` 在续跑时会优先检查每个 `remixSegment` 是否已经持久化 `videoUrl`
     - 已完成的视频分段不会重复调用第三方视频生成，而是直接补齐或更新本站 `videoAsset` 记录后进入下一段
     - 仅对缺少 `videoUrl` 的分段继续生成；全部分段齐备后再执行最终 ffmpeg 拼接
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：降低服务重启、worker 中断或部分分段已完成时的重复生成浪费，进一步减少复刻短视频链路的额外 CPU / 外部模型调用开销

19. 复刻短视频已补单段 provider 任务持久化与恢复
   - 涉及：`DOUYIN_REMIX_SHORT_VIDEO`
   - 当前策略：
     - 每个分段在创建第三方视频任务后，会立即把 `videoProviderTaskId` 持久化回 `remixSegments`
     - 若 worker 或服务在单段视频生成过程中重启，续跑时会优先根据已保存的 `videoProviderTaskId` 查询第三方结果，而不是直接重发该段生成任务
     - 查询成功后会补齐本站缓存视频、封面和 `videoAsset` 记录，再继续剩余分段与最终拼接
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：进一步压低复刻短视频在“第三方已接单但本地未回填”场景下的重复任务率，减少外部模型调用浪费和恢复抖动

20. 视频恢复查询已补 providerTaskId 去重与短 TTL 结果复用
   - 涉及：普通视频恢复、复刻短视频分段恢复使用的底层 `queryVideoGenerationSnapshotWithTargets`
   - 当前策略：
     - 同一组 `backend + providerTaskId + queryPath + queryMethod` 查询会先经过 in-flight 复用，避免同一时刻重复打到第三方查询接口
     - 最近一次查询结果会进入短 TTL 内存缓存，默认参数：
       - `WORKS_VIDEO_QUERY_DEDUP_TTL_MS=2000`
       - `WORKS_VIDEO_QUERY_DEDUP_MAX_ENTRIES=300`
     - 普通视频恢复和复刻短视频分段恢复都会共用这套查询去重层，因此 worker 同一轮扫描里遇到同一个任务时会直接复用结果
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：降低恢复轮询阶段对第三方视频平台的重复查询频率，减少 worker 恢复周期里的无效网络开销和状态抖动

21. 视频恢复查询失败已补短期回退节流
   - 涉及：同样作用于 `queryVideoGenerationSnapshotWithTargets` 的第三方状态查询失败场景
   - 当前策略：
     - 当同一个查询 key 刚刚因为第三方超时、网络错误或接口异常而失败时，会在短期内直接复用最近一次错误结果，而不是立刻再次请求第三方
     - 默认参数：
       - `WORKS_VIDEO_QUERY_ERROR_BACKOFF_MS=5000`
     - 成功查询结果会清掉同 key 的错误回退缓存，避免成功后继续命中旧错误
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：减少第三方视频查询接口抖动期间的重复失败请求，进一步给 worker 恢复轮询降噪

22. 蝉镜口型驱动与数字人视频查询已补共享去重层
   - 涉及：`queryDouyinLipSyncSnapshot`、`queryDigitalHumanVideoSnapshot`
   - 当前策略：
     - 同一 `brandId + providerTaskId` 的蝉镜查询会先经过 in-flight 复用，避免提交后轮询与恢复轮询同时命中时重复请求第三方
     - 最近一次成功结果会进入短 TTL 缓存，查询失败则进入短期错误回退缓存；默认参数：
       - `WORKS_CHANJING_QUERY_DEDUP_TTL_MS=2000`
       - `WORKS_CHANJING_QUERY_ERROR_BACKOFF_MS=5000`
       - `WORKS_CHANJING_QUERY_DEDUP_MAX_ENTRIES=300`
     - 口型驱动和数字人视频都共用这套去重层，因此 worker 恢复与提交后等待阶段会共享同一查询结果
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：继续压低蝉镜第三方状态查询的重复频率，减少服务重启或恢复扫描时的额外外部请求

23. TikHub 每日热搜已按真实使用品牌收口
   - 涉及：`/api/v1/douyin/app/v3/fetch_hot_search_list`
   - 根因回溯：
     - 每日热搜此前除了手动单品牌接口外，还保留了一个全局 4:00 定时任务；只要生产环境配置了 `TIKHUB_API_KEY`，服务就会按品牌批量执行 `syncDailyHotspots()`
     - 这意味着品牌 `A` 的热搜并不是“只因 A 自己触发而跑一次”，而是可能在全局任务里和 `B/C/D` 一起被批量带出来
   - 当前策略：
     - 默认关闭全局每日热搜定时任务：`COLLECTORS_GLOBAL_DAILY_HOTSPOT_SYNC_ENABLED=false`
     - 当前默认只保留 `syncDailyHotspots(brandId, platformTitles)` 这条单品牌同步入口，由调用方按品牌自己触发自己的每日热搜
   - 验证结果：`apps/server` 已通过 `npm run build`
   - 作用：确保品牌 `A` 的每日热搜只和 `A` 自己有关，不会再因为系统里还有其他品牌而被批量顺带执行

## 验证清单

每完成一个阶段，都至少验证以下项目：

1. 服务器重启后是否自动恢复
2. 部署是否仍会明显拖慢站点
3. 首页、登录页、个人中心、抖音页、`/api/health` 是否正常
4. PM2 是否稳定在线
5. 生产环境是否仍在生成不必要的 debug 请求和 `.dbg` 写入
6. release archive 是否仍混入 `.runtime`、`.tmp*`、`.dbg` 等本地运行时垃圾
7. 线上工作区在一次完整部署后是否仍保持干净，不再因为丢失 `.gitignore` 一类基础文件而误报脏状态
8. 前端是否已优先通过 standalone 启动，且 `/health` 与首页可正常返回
9. 部署日志里是否已经不再出现 `multer 1.4.4-lts.1` 与 `Node.js 20 actions are deprecated` 这两类已知告警

## 2026-07-19 RunningHub 恢复补充

### 现象回放

- `OpenClaw -> RunningHub` 新建任务一度长期停在“排队中”，RunningHub 后台没有对应新任务
- 在把 worker 提交、恢复轮询、失败回写和日志补全后，问题继续收敛为两类显式报错：
  - `RunningHub 图片节点 LoadImage 未收到真实上传文件`
  - `RunningHub 未返回任务 ID`

### 最终根因

- 真正导致 RunningHub 无法恢复的核心问题，不是 worker 没启动，也不是调度没命中，而是 worker 模式下恢复提交时把上传文件信息丢了：
  - 创建 RunningHub 任务时，服务端会先把 `nodeInfoList` 标准化
  - 但写入作品 metadata 时，历史实现把节点里的 `upload` 字段剥掉了，只保留普通节点字段
  - 后续 worker 从 metadata 重建 `nodeInfoList` 并重新提交 RunningHub 时，图片节点已经拿不到真实上传内容，只剩模板占位值
  - 因此 `LoadImage` 节点会被 RunningHub 判定为未收到真实文件

### 本轮修复

- `RunningHubWorkAssetMeta.nodeInfoList` 改为持久化完整的 `RunningHubNodeSubmissionEntry`，不再剥离 `upload`
- `readRunningHubWorkMeta()` 在 worker 恢复时会把 `upload.fileName / contentType / dataBase64 / tempFilePath / sizeBytes` 一并恢复
- 这样 worker 再次提交 RunningHub 时，上传节点能真正拿回原始文件信息，而不是退回模板占位值

### 结论

- 这次恢复说明：凡是“创建请求阶段带文件、worker 异步阶段还要再次提交第三方”的重媒体链路，都不能只持久化普通字段，必须连同上传负载一起保留，才能支持服务重启后的真实恢复

## 2026-07-22 RunningHub 夜间拖挂修复

### 现象

- 线上夜间再次出现整机重启，重启前的 `worker` 日志持续出现 `prioritized-runninghub-submissions`
- 同一时间段内，`RunningHubSubmissionBootstrap / Process / SubmitResponse` 长时间连续出现，说明后台守护一直在处理 RunningHub 提交链
- 历史 `worker` 错误日志中还能看到 `Killed` 与 `npm error code 137`，说明这条链曾经触发过系统级强杀

### 根因

- 本轮排查确认，问题不只是“RunningHub 任务多”，更在于 `worker` 的处理方式本身会长期占住重媒体后台队列：
  - `processDouyinRunningHubWorkCreation()` 在提交 RunningHub 后，会继续调用 `monitorRunningHubWorkUntilSettled()`
  - 这个轮询最长可持续 2 小时，期间每 15 秒查询一次第三方状态
  - 也就是说，一次 RunningHub 提交不只是“提交任务”，而是会把同一个 `worker` 槽位长时间绑定在第三方轮询上
- 在夜间存在多条 RunningHub 任务时，后台会同时承受：
  - RunningHub 提交前的文件准备与上传
  - 提交后的长轮询查询
  - 恢复扫描守护本身的周期性扫描
- 这会把本应“短驻留”的后台提交任务，变成持续数十分钟甚至数小时的常驻重任务，放大单机资源风险

### 修复

- 已将 RunningHub 的“任务提交”和“结果轮询”彻底解耦：
  - `worker` 在拿到 `providerTaskId` 并写回 metadata / task 输出后立即释放后台队列槽位
  - 不再在同一条后台任务里调用 `monitorRunningHubWorkUntilSettled()` 挂着轮询 2 小时
  - RunningHub 结果继续由现有的重媒体恢复轮询统一同步
- 这样做之后：
  - `worker` 提交动作恢复为短任务
  - 第三方长轮询不再独占重媒体后台并发槽位
  - 夜间多任务时不会再因为单条 RunningHub 任务长时间轮询而把后台守护拖成常驻高压

### 结论

- 这次问题说明：重媒体 `worker` 的核心职责应该是“提交”和“状态推进”，而不是在单个后台任务里长期等待第三方最终完成
- 对 RunningHub 这类第三方长任务，必须坚持：
  - 提交动作短驻留
  - 结果同步统一交给恢复轮询
  - 后台并发槽位只服务真正的推进动作，不服务长时间等待

## 2026-07-23 RunningHub 421 / 137 结构修复

### 现象

- 线上再次出现 `Killed` 与 `npm error code 137`，说明 `worker` 在资源受限机器上又一次被系统强杀
- 同一时间段内，`RunningHubSubmissionProcess / SubmitResponse` 持续出现，且集中在 `ltx23-digital-human-lip-sync`
- 失败日志不只是普通业务失败，还包括：
  - `errorCode=421 | api queue limit reached`
  - `RunningHub 未返回任务 ID`
  - `LoadImage 未收到真实上传文件`
  - `下载 RunningHub 音频源失败：404`

### 根因

- `07-22` 的“提交即释放、结果由恢复轮询推进”已经解决了单条任务长轮询占槽位的问题，但并没有处理 `RunningHub` 提交阶段的拥塞失败：
  - 当 RunningHub 返回 `421 queue limit reached` 时，任务会快速重新进入待提交链
  - 在 `heavyRecoveryPolling` 持续扫描下，多条 `PENDING` 任务会反复争抢同一条重媒体提交通道
  - 对 `2C4G` 主机来说，这会继续放大 `worker` 的 CPU / 内存 / 网络压力
- 同时，输入不完整的任务虽然已经能在服务端失败，但失败发生在进入重媒体提交流程之后，仍然会占用最贵的 `RunningHub` 提交链

### 本轮修复

- `RunningHub` 待提交任务新增“提交就绪判断”：
  - 只有 `nextSubmissionRetryAt` 到期后，恢复轮询才会再次放行提交
  - 避免 `421` 后在每轮轮询中立即重提
- `RunningHub` 提交失败新增分类处理：
  - `421 / queue limit` 归类为可重试拥塞失败
  - 瞬时网络错误归类为可重试瞬时失败
  - 其余错误仍按硬失败处理
- `ltx23-digital-human-lip-sync` 这类高压应用在 `421` 场景下使用更长的指数退避窗口，默认从 `10 分钟` 起步
- `421` 连续退避超过上限后，任务直接判失败，不允许永久卡在 `PENDING`
- 同步清理了 `works.service.ts` 中遗留的 `runninghub-wrong-image` 远端调试打点，避免把临时诊断逻辑继续带在线上

### 结果

- `RunningHub` 拥塞时不再以 `30s` 轮询节奏持续重提同一批重媒体任务
- 重媒体 worker 会把算力优先留给真正具备提交条件的任务，而不是反复撞 `421`
- 输入无效任务仍然会失败，但不会再和“队列拥塞重提”叠加成持续高压

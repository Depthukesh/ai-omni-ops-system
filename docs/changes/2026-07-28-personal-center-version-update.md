# 2026-07-28 个人中心新增版本与升级页

## 为什么改

- 当前 `local-single-user` 已经有 GitHub Release 和标准安装包，但升级体验仍停留在“先去下载 zip，再手工解压覆盖”的交付基线。
- 用户明确希望把升级入口产品化到个人中心，而不是继续依赖手工替换。
- 这次先做低风险闭环：检查最新 Release、预下载并校验安装包、由独立 updater 执行本地替换与重启。

## 本次范围

- `apps/server/src/modules/system-update/*`
- `apps/server/src/app.module.ts`
- `apps/web/src/services/personal-center.ts`
- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
- `scripts/local-single-user-updater.ps1`
- `scripts/build-local-single-user-release.cjs`
- `docs/engineering-standards.md`
- `docs/README.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `README.md`

## 这次改了什么

### 1. 服务端新增 `system-update` 模块

- 新增：
  - `GET /system/update/status`
  - `POST /system/update/check`
  - `POST /system/update/download`
  - `POST /system/update/apply`
- 默认从 GitHub Releases 读取最新发布，并识别：
  - `AiOmniOps-local-single-user-win-x64.zip`
  - `AiOmniOps-local-single-user-win-x64.zip.sha256`
- `status` 会同时返回：
  - 当前运行模式
  - 当前安装态 release manifest 信息
  - 最新 Release 信息
  - 是否允许一键升级
  - 当前升级阶段与提示文案

### 2. 安装态升级改为独立 updater 执行

- 新增 `scripts/local-single-user-updater.ps1`
- 升级时不让正在运行的 API / Web / worker 直接覆盖自己
- 后端只负责：
  - 检查更新
  - 下载 zip
  - 校验 SHA256
  - 把升级状态写到 `LOCAL_APP_DATA_ROOT/updates/system-update-status.json`
  - 复制 updater 到独立运行目录并后台拉起
- updater 负责：
  - 停止当前 launcher / API / worker / Web
  - 解压升级包
  - 调用安装脚本覆盖安装目录
  - 自动重新启动 `start-local-single-user.cmd`

### 3. 个人中心新增“版本与升级”页

- 新增 `/personal-center/version`
- 页面统一展示：
  - 当前版本与构建时间
  - 最新 Release
  - 安装包大小与 SHA256
  - 当前是否满足一键升级条件
  - 升级阶段和操作按钮
- 源码运行态也可以查看最新 Release，但会明确提示“当前不是安装态发布包，暂不支持一键升级”

### 4. release bundle 补带 updater 脚本

- `build-local-single-user-release.cjs` 现在会把 `scripts/local-single-user-updater.ps1` 一并带进发布物 `app/scripts/`
- 这样安装态服务端可以在升级时复制出独立 updater，而不是依赖仓库外脚本

### 5. 补强安装包下载阶段的真实运行时表现

- `system-update` 服务原先把所有远程请求都走同一条 `15s` 超时策略
- 在真实下载 `AiOmniOps-local-single-user-win-x64.zip` 这类数百 MB 安装包时，会直接在下载阶段被 `AbortController` 中断
- 这次已补：
  - zip 下载单独放宽为长超时窗口
  - 下载失败时把状态明确落到 `FAILED`
  - `status` 查询会真实返回 `DOWNLOADING`
- 这样前端和后端都能更准确地反映“正在下载”“下载失败”与“可开始升级”的阶段，而不是只看到通用报错

### 6. 放宽 release bundle 对 Web 构建状态文件的依赖

- `build-local-single-user-release.cjs` 原先把 `apps/web/.next/local-launcher-web-build-state.json` 当成必需输入
- 但这个文件只会在特定 launcher 构建路径下生成；如果当前现场已经有 `standalone + static`，却没有这份状态文件，release 构建会被错误拦住
- 这次已改为：
  - `standalone` 与 `static` 仍保持强依赖
  - `local-launcher-web-build-state.json` 改为“存在就带上，不存在不阻塞 release 构建”
- 这样打包链对真实现场更稳，也不会因为一份辅助状态文件缺失就中断发布

## 影响范围与防副作用说明

- 这次没有改数据库 schema
- 没有改现有主业务工作流、Provider、Prompt 或旧接口协议
- 升级能力默认只在 `local-single-user` 模式下生效
- 即使前端进入“版本与升级”页，真正替换安装目录也只能在安装态发布包中执行；源码态只展示状态，不会误触本地仓库目录

## 验证

- `npm run build:server`
  - 通过
- `npm --workspace apps/web exec tsc --noEmit`
  - 通过
- 页面联调：
  - `GET http://127.0.0.1:3001/personal-center/version`
  - 结果确认：
    - 页面已进入当前 live Web 产物
    - 新版本页可正常返回 `200 OK`
- 临时端口烟测：
  - `GET http://127.0.0.1:3911/api/health`
  - `GET http://127.0.0.1:3911/api/system/update/status`
  - 结果确认：
    - 新接口已接入
    - 能真实读取 GitHub 最新 Release、zip 和 sha256
    - 能在源码运行态正确返回“当前运行环境不是已安装的 local-single-user 发布包”
- `local-single-user` 受控 smoke root 验证：
  - 先执行：
    - `node scripts/generate-local-prisma-schema.cjs`
    - `DATABASE_URL=file:.../.runtime/local-single-user-smoke/db/local-single-user.sqlite`
    - `npx prisma db push --schema prisma/schema.local.prisma --skip-generate --accept-data-loss`
  - 再以 `APP_RUNTIME_MODE=local-single-user` 和 `LOCAL_APP_DATA_ROOT=.runtime/local-single-user-smoke` 拉起 `3011`
  - 结果确认：
    - `GET http://127.0.0.1:3011/api/health` 返回 `database-ready`
    - `GET http://127.0.0.1:3011/api/system/update/status` 返回 `supported: true`
    - `POST http://127.0.0.1:3011/api/system/update/check` 返回 `phase: AVAILABLE`
    - 当前 smoke 运行态已经能按 `local-single-user` 口径识别 GitHub Release
    - 由于 smoke root 不是安装态发布包，`canApplyUpdate` 仍为 `false`
    - `POST http://127.0.0.1:3011/api/system/update/download` 返回 `400 Bad Request`
    - `POST http://127.0.0.1:3011/api/system/update/apply` 返回 `400 Bad Request`
    - 返回文案明确为：`当前运行环境不是已安装的 local-single-user 发布包。`
- `.release/local-single-user-win-x64` 伪安装态验证：
  - 以发布物自带 `bin/node.exe` + `app/apps/server/dist/...` 在工作区内启动 `3013`
  - `GET http://127.0.0.1:3013/api/system/update/status` 返回：
    - `generatedAt` 为 release manifest 时间
    - `installRoot` 指向 `.release/local-single-user-win-x64`
    - `canApplyUpdate=true`
  - 首次触发 `POST /api/system/update/download` 时，定位到真实问题：
    - 大包下载会被服务端统一 `15s` 超时中断
  - 修复后再次触发 `POST /api/system/update/download`：
    - `status` 已能真实返回 `phase: DOWNLOADING`
    - `updates/system-update-status.json` 已落 `DOWNLOADING`
    - `updates/downloads/.../AiOmniOps-local-single-user-win-x64.zip` 已开始实际写入
    - 截至本次记录，下载请求仍在后台执行，尚未等到完整 `READY_TO_APPLY`
  - release bundle 重建验证：
    - 原先会因缺少 `apps/web/.next/local-launcher-web-build-state.json` 直接失败
    - 修复后已允许在缺少该辅助状态文件时继续构建
    - 已再次执行 `node scripts/build-local-single-user-release.cjs`，release bundle 可成功重建

## 未完成与下一步

- 这次还没有在真实安装态机器上执行整条“下载 -> apply -> 自动重启”升级闭环
- 当前 `local-single-user` smoke 验证已证明接口、运行模式识别和 Release 检查链可用；剩余边界主要在“安装态目录可写 + installRoot 可识别”的真实覆盖演练
- 当前 `.release` 伪安装态已证明安装态识别、下载阶段状态持久化和大包下载超时修复方向正确；后续还需要等下载完整结束后，再继续验证 `READY_TO_APPLY -> APPLYING`
- 下一步优先做：
  1. 用已安装的 `local-single-user` 包做一次真实升级演练
  2. 如果需要，再补升级前程序目录备份可视化提示和回滚入口

## 继续验证补充（2026-07-28 10:30）

### 1. 修复 release-smoke-2 启动时的 SQLite 兼容性阻塞

- fresh 伪安装态 `release-smoke-2` 原先会在 `apps/server/src/modules/admin/skills-prompts.service.ts` 的 registry bootstrap 阶段崩溃：
  - `P2010`
  - `near "EXISTS": syntax error`
- 已把这条链路改成：
  - PostgreSQL 运行态继续保留原有 raw SQL 路径
  - SQLite 运行态改走 Prisma ORM 做技能 / Prompt / 绑定种子同步与回填
- 同时补掉了 SQLite 不支持的几类语法：
  - `JSONB`
  - `TIMESTAMPTZ`
  - `ANY(...::text[])`
  - `IS DISTINCT FROM`
  - `BTRIM(...)`
- 结果：
  - `release-smoke-2` 现已能稳定启动 `3013`
  - `/api/health` 返回 `status=ok`

### 2. 修复 release 进程对安装态根目录的识别方式

- 同一套 release bundle 若从仓库根目录启动，`SystemUpdateService.getCurrentBuildInfo()` 会把：
  - `projectRoot`
  - `installRoot`
  识别错位，导致：
  - `canApplyUpdate=false`
  - `applyBlockedReason=当前运行环境不是已安装的 local-single-user 发布包`
- 这次验证确认：
  - 必须以 `.release/local-single-user-win-x64/app/apps/server` 作为进程工作目录启动
- 修正启动方式后：
  - `installRoot` 正确指向 `.release/local-single-user-win-x64`
  - `canApplyUpdate=true`

### 3. 修复 GitHub Release 资产链路的瞬时网络抖动

- 伪安装态下 `system-update` 读取最新 Release 时，`releases/latest` 主接口可通，但继续读取 `.sha256` 资产会偶发：
  - `fetch failed`
  - `ECONNRESET`
  - `This operation was aborted`
- 已在 `apps/server/src/modules/system-update/system-update.service.ts` 补：
  - 默认远程超时窗口由 `15s` 放宽到 `60s`
  - 对 `ECONNRESET` 和 `AbortError` 增加轻量重试
- 结果：
  - `POST /api/system/update/check` 已能在 release-smoke-2 下稳定拿到：
    - latest release
    - zip asset
    - checksum asset
    - checksum value

### 4. release-smoke-2 当前最新验证结论

- `GET http://127.0.0.1:3013/api/health`
  - 通过
- `POST http://127.0.0.1:3013/api/system/update/check`
  - 通过
  - 已返回最新 release 与 SHA256
- `POST http://127.0.0.1:3013/api/system/update/download`
  - 已真实进入 `DOWNLOADING`
  - `updates/system-update-status.json` 已落：
    - `phase: DOWNLOADING`
    - `message: 正在下载最新安装包并校验完整性。`
  - `updates/downloads/local-single-user-win-x64-2026-07-27/AiOmniOps-local-single-user-win-x64.zip`
    已持续增长，说明 release-like 安装态下的真实下载链已重新打通

### 5. 当前仍未闭环的部分

- 截至本次记录，下载仍在后台进行中，尚未自然推进到：
  - `READY_TO_APPLY`
  - `APPLYING`
- 因此这次还没有继续触发 `apply` 演练

## 继续验证补充（2026-07-28 10:50）

### 1. 针对 release-like 大包下载中途 `terminated`，切换为 Windows 原生下载链

- 继续验证 `release-smoke-2` 时发现：
  - `POST /api/system/update/check` 已稳定
  - 但 `POST /api/system/update/download` 在 GitHub 大 zip 资产流式传输阶段仍会偶发：
    - `terminated`
    - 半截 zip 残留
- 根因上更像是 Node `fetch/undici` 在超大 GitHub 资产传输时被远端中途断流，而不是：
  - 安装态目录不可写
  - Release 元信息不可达
  - SHA256 校验逻辑错误
- 已在 `apps/server/src/modules/system-update/system-update.service.ts` 改成：
  - Windows 安装态优先走 PowerShell `Invoke-WebRequest` 原生下载
  - 每次失败后删除半截文件，再做最多 3 次重试
  - 非 Windows 路径仍保留现有 `fetch + pipeline` 回退逻辑

### 2. 本次补丁的目标

- 不改升级协议
- 不改 apply 逻辑
- 只聚焦提升 Windows release-like 验证场景下的下载稳定性
- 后续将继续以：
  - `DOWNLOADING`
  - `READY_TO_APPLY`
  - `APPLYING`
  为顺序继续验证真实升级闭环

## 继续验证补充（2026-07-28 12:56）

### 1. release metadata 改为优先从 release 正文提取 SHA256

- 继续联调时确认：
  - `https://api.github.com/repos/allentry/local-ai-omni-ops-system/releases/latest` 可正常返回
  - 更容易抖动的是 `.sha256` 资产直链
- 因此在 `apps/server/src/modules/system-update/system-update.service.ts` 中补充：
  - 先从 GitHub release body 提取 64 位 SHA256
  - 只有正文里没有 checksum 时，才回退下载 `.sha256` 资产
- 结果：
  - `POST /api/system/update/check` 已恢复稳定
  - 不再被 `.sha256` 资产的瞬时连通性拖垮

### 2. Windows 原生下载链已在 release-smoke-2 进入真实持续下载

- `system-update` 下载实现现已改为：
  - Windows 下优先调用 PowerShell `Invoke-WebRequest`
  - 失败时删除半截 zip 后重试
  - 非 Windows 仍保留 Node `fetch + pipeline` 回退
- 当前 `release-smoke-2` 现场已确认：
  - `POST /api/system/update/download` 返回后，状态文件进入 `DOWNLOADING`
  - `AiOmniOps-local-single-user-win-x64.zip` 已持续增长
- 本次观测样本：
  - 首次确认文件已创建：约 `848183` bytes
  - 20 秒后继续增长到：约 `1667383` bytes
- 这说明：
  - 现在已经不再是“请求一进入就被 `terminated` 打断”
  - release-like 安装态下的真实大包下载链已重新打通

### 3. 当前待继续观察的点

- 由于 release zip 体积较大（约 `392560443` bytes），本次记录时仍在下载中
- 还没有自然推进到：
  - `READY_TO_APPLY`
  - `APPLYING`
- 下一步继续以状态文件与 zip 增长为准，确认其是否完整跑到 `READY_TO_APPLY`

## 继续验证补充（2026-07-28 14:12）

### 1. 补上“下载成功必须校验文件大小”的防线

- 继续观察后发现：
  - PowerShell 原生下载链虽然已经能持续写入 zip
  - 但在网络中断时，可能出现“命令退出成功、文件却只是半截 zip”的情况
  - 之前这类情况会一路拖到最终 SHA256 校验阶段才暴露
- 已在 `apps/server/src/modules/system-update/system-update.service.ts` 增加：
  - 下载完成后先检查本地文件大小是否等于 release asset 声明大小
  - 若大小不一致，直接判为下载不完整并走自动重试
  - 下载重试次数从 `3` 提高到 `5`
- 这样现在的下载链会更早识别：
  - `downloaded file size mismatch: expected ... got ...`
  而不是把半截文件误判成“下载成功”

### 2. 当前 release-smoke-2 现场状态

- 最新这轮 `POST /api/system/update/download` 仍在持续运行
- 当前状态文件保持：

## 继续验证补充（2026-07-29 18:10）

### 1. Windows 安装态把 GitHub Release 元数据读取改成 `curl` 优先、`fetch` 兜底

- 继续验证 `hotfix-2` 真实远端升级时，安装态一度出现：
  - `检查 GitHub Release 失败：fetch failed`
  - 随后又出现：
  - `curl fetch failed: Failed to connect to github.com:443`
- 这说明当前网络环境下，不是单纯某一条 HTTP 栈稳定，而是：
  - Node `fetch` 有时会超时
  - `curl.exe` 直连 GitHub 元数据接口也会偶发失败
- 因此这轮把 `system-update.service` 的 Windows 元数据读取策略调整为：
  - 先尝试 `curl.exe`
  - 若 `curl` 拉取 release JSON 或 `.sha256` 文本失败，再回退到原有 `fetch` 重试链
- 同时保留 Windows 下 `resolveDirectAssetDownloadUrl()` 直接返回原始 release asset URL，避免再额外依赖一条容易抖动的 `HEAD` 跳转解析。

### 2. 下载链已进入 `curl --range` 分块模式，并确认首块会真实增长

- 这轮继续把下载链压到真实安装态 `.release/local-single-user-win-x64` 运行根验证。
- 已确认当前安装态 `POST /api/system/update/check` 可以稳定返回：
  - `local-single-user-win-x64-2026-07-29-hotfix-2`
  - `AiOmniOps-local-single-user-win-x64.zip`
  - 对应 SHA256
- 在下载侧，已经抓到安装态真实拉起：
  - `curl.exe --range ... --output ...part-0000.bin`
- 为了避免多连接在当前弱网环境下同时僵死，这轮又把分块下载并发从 `4` 收窄成 `1`，改为：
  - 顺序 chunk 下载
  - 单 chunk 失败自动重试
- 最新现场采样已经确认：
  - `part-0000.bin` 会从 `0` 增长到 `274432`
  - 一次低速停滞后，curl 子进程重启
  - 随后首块继续增长到 `405504`
- 这说明当前链路已经不是“完全无字节卡死”，而是：
  - 元数据可获取
  - 首块 range 下载可真实起量
  - 低速卡住后可自动重试并继续前进

### 3. 当前仍未闭环的真实阻塞点

- 截至本次记录，升级链仍未推进到：
  - `READY_TO_APPLY`
  - `APPLYING`
  - `SUCCEEDED`
- 当前最新阻塞点已经进一步压缩为：
  - GitHub Release 大文件在当前 Windows 网络环境下吞吐极低
  - `curl --range` 首块虽然可增长，但速度仍然偏慢，需要继续观察是否能稳定完成单块并串行跑完整包
- 因此本轮的结论不是“升级闭环已完成”，而是：
  - `check` 阶段的 Windows 元数据不稳定问题已被压下去
  - `download` 阶段已经收口到“真实弱网吞吐”这一单一主瓶颈

## 继续验证补充（2026-07-29 18:30）

### 1. 补上 `curl` 分块下载的“无增量 watchdog”

- 继续盯安装态 `curl --range` 下载时确认：
  - `curl.exe` 进程有时会继续存活
  - 但 `part-0000.bin` 可以连续 60 秒完全不增长
  - 同时又不会自行退出，导致状态长期停在 `DOWNLOADING`
- 为了把这类“假活跃”收口成可重试失败，这轮在 `runWindowsCurlCommand()` 增加了文件增量 watchdog：
  - 如果进度文件 `45s` 内没有任何字节增长
  - 就主动 `kill` 当前 `curl` 子进程
  - 让现有 chunk 级重试机制接管
- 这次保护已经同步到：
  - 源码 `apps/server/src/modules/system-update/system-update.service.ts`
  - workspace dist
  - release dist

### 2. `download/apply` 不再强制二次刷新 GitHub 元数据

- 继续复盘现场后发现，安装态最常见的一种无谓失败是：
  1. `POST /api/system/update/check` 已经刚拿到最新 release
  2. `POST /api/system/update/download` 又强制重新请求一次 GitHub Release 元数据
  3. 第二次请求刚好网络抖动，直接报：
     - `检查 GitHub Release 失败：fetch failed`
- 这轮把：
  - `downloadLatestUpdate()`
  - `applyLatestUpdate()`
 里的 `getLatestRelease({ force: true })`
 统一改成：
  - 优先复用刚刚 `check` 写进内存缓存的最新 release
  - 只有缓存没有命中时，才走远端拉取
- 这样用户从“检查更新”紧接着点“立即下载/立即升级”时，不会因为一次多余的 GitHub 元数据刷新把刚拿到的结果又打断。

### 3. 最新现场进展

- 加上缓存复用后，这轮 `download` 不再立刻返回 GitHub 元数据 `502`
- 安装态已经重新拉起新的顺序 chunk 下载进程，并确认：
  - 新 `curl` PID 重新出现
  - `part-0000.bin` 从 `0` 开始恢复增长
  - 最新采样已从：
    - `1,683,456`
    - `1,765,376`
    - `1,896,448`
    - `1,994,752`
    - `2,093,056`
    - `2,224,128`
    - `2,387,968`
    - `2,519,040`
    持续向前推进
- 这说明当前链路已经进一步收口为：
  - 元数据缓存复用可用
  - watchdog 可避免长时间无增量挂住
  - 顺序 chunk 下载在当前弱网环境下至少还能持续前进

### 4. 截至本次记录仍未完成的部分

- 仍未推进到：
  - `READY_TO_APPLY`
  - `APPLYING`
  - `SUCCEEDED`
- 当前仍需继续观察：
  - `part-0000.bin` 能否顺利跑满 `16 MiB`
  - 是否能自动切到下一块 `part-0001.bin`
  - 整包最终能否收口到 SHA256 校验通过

## 继续验证补充（2026-07-29 19:11）

### 1. 顺序 chunk 继续推进后，再把单块从 `16 MiB` 收窄到 `4 MiB`

- 继续观察顺序 `curl --range` 下载后确认：
  - `16 MiB` 单块在弱网环境下虽然能持续增长
  - 但跑满首块所需时间仍然过长
  - 一旦中途重试，单次损失窗口也偏大
- 因此这轮继续把：
  - `chunkSize`
  从：
  - `16 * 1024 * 1024`
  调整为：
  - `4 * 1024 * 1024`
- 目标不是追求并发，而是让安装态更快完成一个完整 chunk，并更早验证：
  - `part-0000.bin` 完成
  - 自动切换到 `part-0001.bin`

### 2. 现场确认 `taskkill /PID /T /F` 可以真实切掉卡死的 `curl`

- 这轮为了验证 watchdog 的“硬杀”是否真的可用，现场直接对卡住的 `curl` PID 执行：
  - `taskkill /PID <pid> /T /F`
- 实际结果确认：
  - 目标 `curl.exe` 被成功终止
  - 其子进程也一起被回收
  - 安装态下载链随后自动拉起新的 `curl` PID 并继续重试
- 这说明：
  - Windows 下依赖 `taskkill` 做进程树硬终止是可行的
  - 下载链在当前实现下具备“被切断后继续重试”的恢复能力

### 3. 最新 `4 MiB` 分块现场进展

- 切到 `4 MiB` 之后，安装态已经真实拉起：
  - `curl.exe --range 0-4194303 --output ...part-0000.bin`
- 一次 `0 byte` 起步卡住后，现场手动 `taskkill` 验证通过；随后下载链自动拉起新的 `curl` PID，`part-0000.bin` 重新恢复增长。
- 当前最新采样已经确认：
  - `65,536`
  - `180,224`
  - `294,912`
  - `344,064`
  - `442,368`
  - `524,288`
  - `614,400`
  - `679,936`
  - `696,320`
  - `761,856`
  - `892,928`
  - `942,080`
  持续向前增长
- 这说明当前 `4 MiB` 首块并没有再次陷入“完全无字节”的死锁，而是已经重新进入有效下载。

### 4. 当前结论

- 截至本次记录，升级链仍未进入：
  - `READY_TO_APPLY`
  - `APPLYING`
  - `SUCCEEDED`
- 但当前安装态升级下载已经被收口到更具体的状态：
  - 元数据复用缓存，避免 `check -> download` 之间再次强刷 GitHub Release
  - 分块下载使用顺序 `curl --range`
  - Windows 可通过 `taskkill` 硬切卡死 `curl`
  - 首块在 `4 MiB` 口径下已重新恢复增长

## 继续验证补充（2026-07-29 19:38）

### 1. 下载前先解析一次最终直链，避免每个 chunk 反复命中 `github.com/releases/download`

- 继续排查后确认，之前 chunk 失败的高频错误是：
  - `curl chunk download failed: curl: (28) Failed to connect to github.com:443`
- 根因不是分块本身，而是：
  - 每个 `curl --range` chunk 都还在使用 `github.com/.../releases/download/...`
  - 每次 chunk 启动都要重新走一次 GitHub 跳转
- 这轮将 Windows 下的 `resolveDirectAssetDownloadUrl()` 改为：
  - 下载开始前只用 `curl` 解析一次最终资产直链
  - 后续所有 chunk 都直接打最终资产域名
- 当前安装态现场已经确认：
  - `curl.exe --range 0-4194303 ... https://release-assets.githubusercontent.com/...`
  - 不再是 `https://github.com/.../releases/download/...`

### 2. 最新现场验证结果

- 新链路生效后，`part-0000.bin` 的最新实测采样为：
  - `61,440`
  - `356,352`
  - `434,176`
  - `499,712`
  - `548,864`
  - `630,784`
  - `720,896`
  - `831,488`
  - `897,024`
  - `978,944`
  - `1,028,096`
  - `1,093,632`
  - `1,175,552`
  - `1,241,088`
- 整个 80 秒采样期间：
  - `curl` PID 在首次切换后稳定保持为同一进程
  - 文件字节数持续增长
  - 没有再次出现“反复打 github.com 但连不上”的旧错误

### 3. 当前结论

- 到目前为止，升级链仍未推进到：
  - `READY_TO_APPLY`
  - `APPLYING`
  - `SUCCEEDED`
- 但新的主瓶颈已经进一步收口为：
  - 通过 `release-assets.githubusercontent.com` 直链下载时，吞吐仍然偏慢
  - 不再是每个 chunk 都会被 `github.com` 连接失败打断

## 继续修正补充（2026-07-29 19:50）

### 1. 个人中心“版本与升级”入口只在安装态显示

- 继续联调时发现，前端把 `/personal-center/version` 直接挂进了个人中心固定二级导航，导致：
  - 网站版个人中心也会出现“版本与升级” tab
  - 用户即使不在安装态，也能直接进入版本页，再看到“当前环境不支持”
- 这次前端已改为：
  - 个人中心 layout 在加载账号信息时，同时读取 `GET /system/update/status`
  - 只有当后端返回：
    - `supported=true`
    - `current.canApplyUpdate=true`
    时，才显示“版本与升级”入口
- 同时，`/personal-center/version` 页面本身也加了一层前端保护：
  - 如果当前不是 `local-single-user` 安装态
  - 页面会直接回到 `/personal-center`
  - 不再让网站版或源码运行态继续停留在升级页

### 2. 本次影响范围

- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`
- `docs/engineering-standards.md`
- `docs/site-map.md`

### 3. 当前结论

- “版本与升级”仍然属于 `local-single-user` 个人中心的一部分
- 但它现在已经从网站版个人中心默认入口里收回，不再作为通用网站版功能暴露

## CI 修复补充（2026-07-29 23:58）

### 1. 修复 `LocalSingleUserBootstrapService` 源码缺失导致的 server build 失败

- 线上构建继续暴露出一处更基础的问题：
  - `apps/server/src/app.module.ts` 已经引入 `./local-single-user/local-single-user-bootstrap.service`
  - 但 `apps/server/src/local-single-user/` 目录里的源码文件并没有进入仓库
- 结果就是：
  - 本地 `dist` 中虽然已有编译产物
  - CI 在 runner 上重新执行 `tsc -p tsconfig.json` 时仍会报：
    - `TS2307: Cannot find module './local-single-user/local-single-user-bootstrap.service'`
- 这次已将缺失的源码文件补回 `apps/server/src/local-single-user/local-single-user-bootstrap.service.ts`，使源码与既有 dist 行为重新对齐。

### 2. 本次影响范围

- `apps/server/src/local-single-user/local-single-user-bootstrap.service.ts`
- `apps/server/src/modules/system-update/system-update.service.ts`
- `docs/changes/2026-07-28-personal-center-version-update.md`

### 3. 补充修正

- 在继续重跑 `server build` 时，又暴露出 `apps/server/src/modules/system-update/system-update.service.ts` 结尾少了一个类闭合括号，导致 `sanitizeFileName()` 落到类体外并触发 `TS1068`。
- 这次已同步补回缺失的 `}`，让源码结构重新与现有 dist 对齐。
  - `phase: DOWNLOADING`
  - `message: 正在下载最新安装包并校验完整性。`
- 当前 zip 文件继续增长样本：
  - 约 `717111` bytes
  - 约 `1470775` bytes
  - 约 `2732343` bytes
- 说明：
  - 新补丁没有把下载链卡死
  - release-like 伪安装态下的大包下载仍在持续推进
  - 后续仍需继续观察是否会在某次重试后完整进入 `READY_TO_APPLY`

## CI 修复补充（2026-07-30 00:20）

### 1. 清理 Prisma `skipDuplicates` 与当前 client 类型不兼容的问题

- 继续重跑 `npm --workspace apps/server run build` 后，又暴露出多处：
  - `TS2322: Type 'boolean' is not assignable to type 'never'`
- 根因不是业务字段错误，而是当前 Prisma Client 生成类型下，若干 `createMany()` 调用已经不再接受 `skipDuplicates: true`。
- 这轮按实际 seed 语义分别收口：
  - 已有 `count > 0` 门槛的启动期 seed，直接去掉 `skipDuplicates`
  - 原先没有门槛、但本质仍是初始化种子写入的模块，补上最小 `count === 0` 保护，再执行 `createMany`
- 影响文件：
  - `apps/server/src/modules/admin/knowledge-bases.service.ts`
  - `apps/server/src/modules/admin/module-definitions.service.ts`
  - `apps/server/src/modules/admin/skill-package-knowledge-spaces.service.ts`
  - `apps/server/src/modules/admin/skill-package-modules.service.ts`
  - `apps/server/src/modules/admin/skill-package-skills.service.ts`
  - `apps/server/src/modules/admin/skill-packages.service.ts`

### 2. 修正用户搜索过滤里不兼容的 `mode: "insensitive"`

- `apps/server/src/modules/admin/users-admin.service.ts` 中的用户关键词搜索使用了：
  - `contains + mode: "insensitive"`
- 当前 `User` 对应 Prisma filter 类型不接受该字段，触发：
  - `TS2353: 'mode' does not exist in type ...`
- 这轮改成当前 client 可接受的 `contains` 过滤，先保证构建恢复；没有额外扩大搜索逻辑或改动查询结构。

### 3. 补齐 `reports.controller` 已暴露但 `reports.service` 缺失的单项保存接口

- `reports.controller.ts` 已经对外暴露：
  - `PATCH /reports/brands/:brandId/xiaohongshu-marketing-calendar/:reportId/items/:date`
- 但 `reports.service.ts` 之前既没有：
  - `UpsertXiaohongshuMarketingCalendarItemPayload`
  - 也没有：
  - `upsertXiaohongshuMarketingCalendarItem()`
- 这轮已补：
  - 导出的 payload 类型
  - 读取当前营销日历后按 `date/id` 定位并更新单项，再复用原有 `updateXiaohongshuMarketingCalendar()` 持久化
- 这样前端已有的“单日营销日历保存”调用和后端 service 终于重新对齐，不再只停留在 controller 壳层。

### 4. 本轮验证结果

- `npm --workspace apps/server run build`
  - 通过
- 当前结论：
  - 用户本次贴出的 CI `build:server` 阻塞点，已在本地源码层全部清掉
  - 这次修复没有去改数据库 schema、升级协议或业务主流程，只把漏提交源码、类型漂移和 service 接口缺口补齐

## CI 修复补充（2026-07-30 04:55）

### 1. 补回 `apps/web/src/lib/runtime-mode.ts`，修复 web build 缺失模块

- 在 `build:server` 通过后，GitHub Actions 继续跑到：
  - `npm run build:web`
- 新暴露的真实阻塞点是：
  - `apps/web/src/services/http.ts`
  - `Module not found: Can't resolve '../lib/runtime-mode'`
- 继续核对后确认：
  - `http.ts` 仍在引用 `getRuntimeMode()`
  - 但 `apps/web/src/lib/` 目录下只剩 `runtime-debug.ts`
  - `runtime-mode.ts` 本身没有进入仓库
- 这次已补回一个最小实现：
  - 统一读取 `NEXT_PUBLIC_APP_RUNTIME_MODE`
  - 仅返回：
    - `standard`
    - `local-single-user`
- 这样前端 HTTP 基础层在浏览器侧判断：
  - `local-single-user` 走 `window.location.origin + /api`
  - 其他模式继续走现有 `NEXT_PUBLIC_API_BASE_URL` / 默认 API 口径

### 2. 本轮影响范围

- `apps/web/src/lib/runtime-mode.ts`
- `docs/changes/2026-07-28-personal-center-version-update.md`

### 3. 本轮验证结果

- `npm run build:web`
  - 通过
- 当前结论：
  - 这次 GitHub Actions 的新失败并不是 Next 构建配置损坏
  - 而是一个前端 runtime helper 漏进仓库
  - 补回 helper 后，web 生产构建已重新恢复

## 继续验证补充（2026-07-28 17:50）

### 1. GitHub `releases/latest` 在当前网络下存在额外抖动，已补回退链

- 继续验证 `release-smoke-2` 时再次遇到：
  - `GET /api/system/update/status`
  - `POST /api/system/update/check`
  返回：
  - `检查 GitHub Release 失败：504 Gateway Timeout`
- 现场对比确认：
  - 直接请求 `https://api.github.com/repos/allentry/local-ai-omni-ops-system/releases/latest`
    在当前机器上会偶发 `504`
  - 同仓库的 `https://api.github.com/repos/allentry/local-ai-omni-ops-system/releases?per_page=1`
    可正常返回 `200`
- 因此已在 `apps/server/src/modules/system-update/system-update.service.ts` 补充：
  - 先走 `releases/latest`
  - 若失败则自动回退到 `releases?per_page=1`
  - 同时把 `408`、`429` 和 `5xx` HTTP 状态纳入 fetch 级别重试
- 结果：
  - `release-smoke-2` 在 `3013` 的安装态验证环境下，`status/check` 已再次恢复
  - 最新 release、zip 资产和 SHA256 都能重新稳定返回

### 2. 断点续传版下载已重新接管现场

- 在把新补丁重新注入 release bundle 并以：
  - `APP_RUNTIME_MODE=local-single-user`
  - `LOCAL_APP_DATA_ROOT=.runtime/local-single-user-release-smoke-2`
  - `PORT=3013`
  重新拉起后，当前验证结论为：
  - `GET http://127.0.0.1:3013/api/health`
    - 通过
  - `GET http://127.0.0.1:3013/api/system/update/status`
    - 通过
    - `supported=true`
    - `canApplyUpdate=true`
  - `POST http://127.0.0.1:3013/api/system/update/download`
    - 已再次进入 `DOWNLOADING`
- 当前重新观测到的 zip 增长样本：
  - 约 `94519` bytes
  - 约 `373047` bytes
  - 约 `586039` bytes
- 说明：
  - 这轮不再被 `releases/latest` 的 `504` 挡在下载前置阶段
  - 新的 release metadata 回退逻辑已生效
  - 断点续传版下载链正在继续推进，下一步仍需继续观察是否最终进入 `READY_TO_APPLY`

## 继续验证补充（2026-07-29 02:20）

### 1. updater 在 Windows PowerShell 5 下的真实阻塞点已定位并修复

- `release-smoke-2` 首次进入 `READY_TO_APPLY -> APPLYING` 后，后台 updater 一直没有改写状态文件。
- 前台复跑 `local-single-user-updater.ps1` 后确认，根因不是下载链，也不是脚本逻辑缺失，而是：
  - PowerShell 5 直接执行无 BOM UTF-8 的 updater 脚本时会在解析阶段失败
  - 即使脚本修成 BOM，如果同一轮 `apply` 生成的 `local-single-user-updater.config.json` 仍是无 BOM UTF-8，在当前中文路径环境下也会被 `ConvertFrom-Json` 读坏
- 因此这轮已补：
  - `apps/server/src/modules/system-update/system-update.service.ts`
    - 生成 `updater.ps1` 和 `updater.config.json` 时统一写成单个 `UTF-8 BOM`
    - 生成前先去重已有 BOM，避免出现 `EF BB BF EF BB BF`
  - `scripts/build-local-single-user-release.cjs`
    - release bundle 内所有 `.ps1` 统一按单个 `UTF-8 BOM` 写入
  - `scripts/local-single-user-updater.ps1`
    - 保持源码脚本本身也是 BOM 友好口径

### 2. 当 runtime metadata 缺失时，updater 现已具备最小停机兜底

- 继续验证时又确认了第二个真实阻塞点：
  - 当前 smoke 环境没有 `runtime/local-single-user-runtime.json`
  - updater 原先只依赖这份 metadata 停机
  - 导致安装脚本移动安装目录时，被仍在运行的 `apps/server` 进程锁住
- 因此这轮又补：
  - `system-update.service.ts` 在生成 updater config 时附带 `fallbackStopPids: [process.pid]`
  - `local-single-user-updater.ps1` 的 `Stop-RuntimeFromMetadata` 在 metadata 缺失或损坏时，会回退按 `fallbackStopPids` 停掉当前 API 进程

### 3. 当前最新验证结论

- `release-smoke-2` 已真实跑到：
  - `phase: SUCCEEDED`
  - `message: 升级安装完成，正在重新启动本地工作台。`
- 前台复跑最新版 updater 时，已看到安装脚本完整输出：
  - `Install completed.`
  - `Launch: ...start-local-single-user.cmd`
- 说明：
  - `download`
  - `READY_TO_APPLY`
  - `APPLYING`
  - 安装目录替换
  - `SUCCEEDED`
  这一整段现在已经能在 smoke 环境里跑通

### 4. 自动重启的现阶段结论

- 在 updater 把状态写成 `SUCCEEDED` 后，当前 smoke 现场还没有直接观察到同一轮后台 `Start-Process` 自己把服务重新拉起。
- 但对同一个安装根手工执行同一条 `start-local-single-user.cmd` 后，已经确认：
  - launcher 可正常拉起
  - `3001` Web 首页返回 `200`
  - `3011` API `health` 返回 `database-ready`
- 因此当前边界已经从“升级失败”收缩为：
  - **自动重启命令本身是可用的**
  - **还需要再做一次纯后台、无人工补启动的观察，确认 updater 内部的 `Start-Process` 是否存在时序或环境继承差异**

## 继续验证补充（2026-07-29 03:55）

### 1. 当前自动升级链的残余阻塞已进一步压缩到 release payload 过旧

- 本轮继续做真实闭环时，已确认：
  - `system-update-status.json` 能落到 `SUCCEEDED`
  - runtime metadata 也能刷新回新的 `3001/3011`
  - `GET http://127.0.0.1:3011/api/health` 返回 `sqlite + status=ok`
- 但升级完成后的安装根再次出现：
  - `GET /api/system/update/status` 返回 `404`
  - 安装根 `app/apps/server/dist/apps/server/src/app.module.js` 中不再包含 `SystemUpdateModule`
  - `app/apps/server/dist/apps/server/src/modules/` 目录下也缺少 `system-update/`
- 这说明当前剩余阻塞已不是：
  - updater 停机失败
  - updater 覆盖失败
  - 自动重启失败
- 而是：
  - **被安装回来的 zip payload 本身仍是旧构建，覆盖后把 `system-update` 模块整体回退掉了**

### 2. 旧 payload 的来源已定位到打包默认行为会复用旧 release 目录

- 进一步核对后确认：
  - 工作区 `apps/server/dist/apps/server/src/app.module.js` 已包含 `SystemUpdateModule`
  - 但 `.release/local-single-user-win-x64` 的 manifest 生成时间仍停留在较早时间点
  - 且其中同样缺少 `system-update` 相关 dist 文件
- 根因是：
  - `scripts/package-local-single-user-release.cjs` 之前只有在 `.release/local-single-user-win-x64` 不存在时才会重建 release bundle
  - 一旦本地已有旧的 release 目录，再次打 zip 时就会直接把旧目录重新压缩，导致：
    - 工作区源码 / dist 已更新
    - GitHub Release 资产却仍可能是旧 payload

### 3. 本轮已补的修复

- `scripts/package-local-single-user-release.cjs`
  - 现在改为：
    - **默认先执行 `build-local-single-user-release.cjs` 重建 release bundle**
    - 只有显式传入 `--skip-rebuild` 时，才允许复用当前 `.release/local-single-user-win-x64`
- 这样可以直接堵住一类很隐蔽的回退问题：
  - 本地已经改完 `apps/server/dist`
  - 但重新打包时却仍把旧 release 目录上传为新资产

### 4. 当前闭环状态

- 目前已经能明确区分两条链：
  - 代码与 updater 链：
    - `APPLYING -> SUCCEEDED -> 自动重启恢复 3001/3011`
    - 已基本打通
  - 发布资产链：
    - 旧 zip 会把已修好的 `system-update` 模块覆盖回去
    - 这是当前阻止“升级后仍保持新能力”的最后主阻塞
- 下一步应基于新的默认重建打包策略，重新生成最新 zip，再继续验证真实 `check/download/apply` 闭环。

## 继续验证补充（2026-07-29 04:05）

### 1. fresh install 首次启动又暴露出 launcher 对过期 build state 的误判

- 在基于新 zip 安装出全新的伪安装根后，首次启动没有直接复用随包 `dist`，而是进入：
  - `Local Prisma generate`
  - `Local Prisma db push`
  - `Server build`
- 随后在 `Server build` 阶段被当前源码现场里已有的 TypeScript 编译问题挡住。
- 继续核对后确认：
  - release 包里已经带有 `apps/server/dist`
  - 但 `apps/server/dist/local-launcher-server-build-state.json` 的 fingerprint 仍是较早版本
  - `apps/web/.next/local-launcher-web-build-state.json` 也没有稳定随包生成
- 因此当前 fresh install 的真实问题不是“没有 dist”，而是：
  - **launcher 误判 bundled dist 已过期，转而在安装态首启去重编译源码**

### 2. 本轮已补的修复

- `scripts/build-local-single-user-release.cjs`
  - 在生成 release bundle 时，新增一段显式 build-state 写入：
    - `apps/server/dist/local-launcher-server-build-state.json`
    - `apps/web/.next/local-launcher-web-build-state.json`
  - fingerprint 基于 release 内实际拷贝后的：
    - `package.json`
    - `package-lock.json`
    - `tsconfig`
    - `src`
    - `public`
    - `packages`
    等输入重新计算
- 这样 fresh install 首启时，launcher 会直接把随包的 server/web 产物视为当前有效状态，而不是因为旧 fingerprint 或缺失 state 又去跑一次源码构建。

### 3. 当前结论进一步收口

- 到目前为止，已经把升级链的两个关键“假回退”入口都堵上了：
  - 打包阶段：
    - 默认重建 release bundle，避免把旧 `.release/local-single-user-win-x64` 再次压成新 zip
  - 首次启动阶段：
    - release 内写入新的 launcher build state，避免 fresh install 首启误触源码重编
- 剩余要做的是基于这两处修复重新生成并复测 fresh install / 自动升级闭环，确认新的发布资产既不会回退 `system-update` 模块，也不会在首启时重新掉回源码构建路径。

## 继续验证补充（2026-07-29 07:00）

### 1. `/api/health` 的 datasource 误报已定位到 `PrismaService` 自身口径过旧

- 继续联调 fresh install 的 `smoke-4` 时，现场出现了一个容易误导判断的现象：
  - launcher runtime metadata 已明确写出：
    - `databaseUrl=file:...local-single-user.sqlite`
  - `LOCAL_APP_DATA_ROOT` 也已落在 `smoke-4`
  - 但 `GET /api/health` 仍返回：
    - `database.datasource = postgresql`
- 继续读代码后确认，根因不是本地单机运行时真的连回了 PostgreSQL，而是：
  - `apps/server/src/prisma/prisma.service.ts`
  - `getSchemaSummary()` 里把 `datasource` 直接写死成了 `"postgresql"`

### 2. 本轮已补的修复

- `apps/server/src/prisma/prisma.service.ts`
  - 新增并统一了：
    - `readDatabaseUrl()`
    - `isLocalSqliteMode()`
    - `isPostgresMode()`
    - `getDatasourceKind()`
    - `tableExists()`
    - `hasTableColumn()`
    - `ensureTableColumns()`
    - `jsonValueSql()`
  - `getSchemaSummary()` 改为根据当前 `DATABASE_URL` 真实返回：
    - `sqlite`
    - `postgresql`
    - 或 `mock`
- 同步补到了：
  - `apps/server/dist/apps/server/src/prisma/prisma.service.js`
  - 当前正在验证的安装根：
    - `.release/AiOmniOps-rebuilt-20260729-1958/app/apps/server/dist/apps/server/src/prisma/prisma.service.js`

### 3. 当前验证结果

- 重启 `smoke-4` 后再次确认：
  - `GET http://127.0.0.1:3012/api/health`
    - 已返回 `database.datasource = sqlite`
  - `GET http://127.0.0.1:3012/api/system/update/status`
    - 仍返回 `200`
    - `supported=true`
    - `canApplyUpdate=true`
- 同时再次确认：
  - runtime metadata 已刷新到新的 launcher / server / worker / web pid
  - `Server build` 与 `Web build` 仍保持 `skip`

### 4. 当前结论

- 到这一步，本地最新 release 资产已经同时满足：
  - 不会复用旧 release 目录打包
  - fresh install 首启不会误触源码重编
  - 安装态 `system-update` 模块仍在
  - `health` 对 sqlite / postgresql 的运行态判定不再误报
- 当前真正还没完成的只剩一件事：
  - **把这份新 zip 发布成新的 GitHub Release，再从安装态跑一轮真实远端 `check/download/apply` 闭环**

## 继续验证补充（2026-07-29 07:20）

### 1. 真实远端 release 链已重新打通

- 本轮已把最新本地单机包发布到正确仓库：
  - `allentry/local-ai-omni-ops-system`
- 新 release：
  - `local-single-user-win-x64-2026-07-29`
- `smoke-4` 安装态已再次确认：
  - `GET /api/system/update/status`
    - `latest.tagName = local-single-user-win-x64-2026-07-29`
    - `phase = AVAILABLE`
    - `updateAvailable = true`
  - `POST /api/system/update/download`
    - 已真实落到 `READY_TO_APPLY`

### 2. `apply` 仍卡在初始 `APPLYING` 的剩余根因进一步压缩

- 纯 API `POST /api/system/update/apply` 已返回：
  - `accepted = true`
  - `phase = APPLYING`
- 但本轮继续抓现场后确认：
  - `system-update-status.json` 一直停留在最初的：
    - `升级进程已启动，正在准备替换到 ...`
  - `3002 / 3012` 没有掉
  - updater config 已正确生成
  - 运行中的安装根 `system-update.service.js` 也已包含 `cmd.exe /c start ...` 路径
- 新证据表明：
  - API 进程确实拉起了外层 `cmd.exe`
  - 但没有看到对应的 updater PowerShell 子进程继续执行
- 因此当前问题已从“接口没启动后台升级”压缩到：
  - **`cmd /c start` 在 API 的无控制台后台场景下没有把 updater PowerShell 真正接起来**

### 3. 本轮已补的新修正

- `apps/server/src/modules/system-update/system-update.service.ts`
- `apps/server/dist/apps/server/src/modules/system-update/system-update.service.js`
- 当前验证安装根对应 dist

- 已把 updater 拉起命令从：
  - `start "" /b powershell.exe ...`
- 调整为：
  - `start "" powershell.exe -WindowStyle Hidden ...`

- 这次调整的目的很单纯：
  - 避开 `/b` 在无控制台后台场景下的挂起风险
  - 让 updater 改走真正独立的新进程窗口上下文，同时仍保持隐藏启动

## 继续验证补充（2026-07-29 08:00）

### 1. `apply` 假启动的真实根因已继续拆开

- 先用隔离 marker 验证了多种 Windows 后台拉起方式：
  - `Node -> detached powershell.exe`
    - 在当前安装态环境里不会真正落地执行
  - `Node -> detached cmd.exe -> .cmd wrapper -> powershell.exe`
    - 可以真实拉起 PowerShell
- 因此 `system-update.service` 已改为：
  - 不再直接 `spawn(powershell.exe, ...)`
  - 改为为每次 apply 生成：
    - `run-local-single-user-updater.cmd`
  - 再由 API 进程用：
    - `cmd.exe /d /c run-local-single-user-updater.cmd`
    - 去后台拉起 updater

### 2. wrapper 链又继续暴露出两个真实 Windows 兼容问题

- 第一层问题：
  - wrapper 初版把带中文工作区路径的绝对路径直接写进 `.cmd`
  - `updater-launcher.stderr.log` 抓到：
    - `系统找不到指定的路径`
- 已改为：
  - wrapper 统一使用 `%~dp0local-single-user-updater.ps1`
  - `%~dp0local-single-user-updater.config.json`
  - `%~dp0...stdout.log / stderr.log`
  - 避开 `cmd` 解析中文绝对路径时的编码问题

- 第二层问题：
  - 手工直接执行最新 wrapper 后，`local-single-user-updater.stderr.log` 抓到：
    - `﻿param : The term '﻿param' is not recognized ...`
  - 说明 apply 目录里动态生成的 `local-single-user-updater.ps1` 被写成了带 BOM 的 UTF-8
  - PowerShell 在当前执行路径下把 BOM 当成了字面字符，脚本从第一行就没真正开始
- 已改为：
  - updater `.ps1` 不再用 BOM 写入
  - 改成普通 `utf8` 写入

### 3. 真实远端 `apply` 主链已推进到安装完成

- 在以上两层修正后，再次从 `smoke-4` 安装态执行：
  - `POST /api/system/update/download`
  - `POST /api/system/update/apply`
- 本轮终于确认不再停留在最初的“准备替换”假状态，而是进入了真实 updater 主流程：
  - 状态先推进到：
    - `正在解压升级包。`
  - 期间：
    - `3002 / 3012` 已真实掉线
    - `cmd.exe -> powershell.exe` 后台升级进程持续存在并消耗 CPU
    - `updates/extract-*` 解压目录内容持续增长
- 随后状态进一步推进到：
  - `phase = SUCCEEDED`
  - `message = 升级安装完成，正在重新启动本地工作台。`
  - `appliedAt` 已写入时间戳

### 4. 当前剩余唯一未闭环点

- 到这一步，真实远端 upgrade 闭环里以下部分已经被验证通过：
  - `check`
  - `download`
  - `apply` 真实启动
  - 停机
  - 校验包
  - 解压
  - 覆盖安装
  - 状态推进到 `SUCCEEDED`
- 当前仍未完全闭环的只剩最后一段：
  - **自动重启命令已执行，但 `3002 / 3012` 还没有恢复对外提供服务**
- 现场证据：
  - `system-update-status.json`
    - 已稳定写成 `SUCCEEDED`
  - `runtime/local-single-user-runtime.json`
    - 已写入新的 launcher / server / worker / web pid
  - 但之后再次探测：
    - `http://127.0.0.1:3012/api/health`
    - `http://127.0.0.1:3002`
    - 仍无法连接
- 因此当前最后一个剩余问题已压缩为：
  - **“升级成功后的自动重启已触发，但新拉起进程没有真正恢复到可访问监听态”**

## 继续验证补充（2026-07-29 12:10）

### 1. 自动重启后未恢复监听的真实根因已定位

- 继续追自动重启后的 launcher 现场，最终抓到：
  - 重启命令本身已经执行
  - 但 launcher 误判为需要重新编译源码
  - 随后在 `Server build` 阶段因为当前安装态源码并不满足完整 TypeScript 构建条件而退出
- 关键证据来自重启任务输出：
  - `[step] Server build...`
  - `Server build失败，退出码=2`
  - 并伴随：
    - `Cannot find module './local-single-user/local-single-user-bootstrap.service'`
    - 多处现有 TS 类型漂移报错

### 2. 为什么会误触发重编

- 继续核对安装根与解压目录后确认：
  - `local-launcher-server-build-state.json`
  - `local-launcher-web-build-state.json`
  - 两份文件其实都在 release 包里，也成功进入了解压目录与安装根
- 但进一步对比发现：
  - launcher 当前计算出来的 build fingerprint
  - 与打包时写入 state 文件中的 fingerprint
  - 完全不一致
- 继续追到根因后确认：
  - 旧 fingerprint 算法把文件 `mtime` 也算进了指纹
  - 而升级安装 / 解压 / 覆盖会天然改写大量文件时间戳
  - 所以即使文件内容完全没变，安装后 launcher 也会误判成“源码已变化，需要重编”

### 3. 本轮已补的新修正

- `scripts/local-single-user-launcher.cjs`
- `scripts/build-local-single-user-release.cjs`
- 当前验证安装根：
  - `.release/AiOmniOps-rebuilt-20260729-1958/app/scripts/local-single-user-launcher.cjs`

- 已把 build fingerprint 从：
  - `relativePath + size + mtime`
- 改为：
  - `relativePath + size + file content sha1`

- 这样可以保证：
  - 解压 / 覆盖安装改变时间戳时不会误触发重编
  - 真正的源码内容变化仍然会让 launcher 感知到

### 4. 当前安装根已验证恢复正常重启

- 在给当前安装根重写新算法 fingerprint 后，再次执行与 updater 相同的重启命令，已确认：
  - `skip Server build`
  - `skip Web build`
  - 运行时重新拉起成功
  - 新 runtime metadata 已刷新到：
    - `apiPort = 3011`
    - `webPort = 3001`
- 实测：
  - `GET http://127.0.0.1:3011/api/health`
    - 已恢复 `200`
  - `3001 / 3011`
    - 已恢复监听

### 5. 当前剩余事项

- 到这一步，本地代码层面的真实根因已经全部压实：
  - updater 假启动
  - wrapper 中文路径
  - updater ps1 BOM
  - 自动重启后误触发重编
- 当前剩余工作已缩小为：
  - **把这组修正重新打进新的 remote release，再从安装态跑一轮最终真实远端升级闭环**

## 继续验证补充（2026-07-29 16:00）

### 1. 当前真实阻塞点已从“下载器实现”收缩为“发布包体积过大”

- 继续在真实安装态跟远端 `download` 链时，确认当前活跃更新目录已经不是工作区 `.runtime/.../updates`，而是：
  - `C:\Users\Administrator\AppData\Roaming\AiOmniOps\updates`
- 继续盯住这条真实签名直链后，发现问题已经不只是 Node / PowerShell 某一种实现不稳定：
  - 独立对 `release-assets.githubusercontent.com` 直链做 `curl --range` 取样
  - 仅下载 `1 MB` 片段也耗时约 `135940 ms`
- 这说明当前剩余主阻塞已经进一步压缩为：
  - **GitHub 远端升级包体积过大，在当前真实链路上吞吐过低**
  - 继续单纯微调单连接下载器，收益已经明显低于先把升级包瘦下来

### 2. 发布物已切到“预构建运行时模式”

- 本轮继续收口：
  - `scripts/local-single-user-launcher.cjs`
  - `scripts/build-local-single-user-release.cjs`
- 新口径改为：
  - 发布物启动时默认注入 `LOCAL_SINGLE_USER_PREBUILT_ONLY=true`
  - launcher 在该模式下不再尝试源码兜底 `server build` / `web build`
  - 若预构建 `apps/server/dist` 或 `apps/web/.next/standalone` 缺失，则直接明确失败，而不是重新走构建链
- 同时 release builder 不再继续把以下源码兜底输入打进发布包：
  - `package-lock.json`
  - `tsconfig.base.json`
  - `apps/server/src`
  - `apps/web/src`
  - `packages`
  - `apps/server/package.json`
  - `apps/server/tsconfig.json`
  - `apps/web/package.json`
  - `apps/web/tsconfig.json`
  - `apps/web/next.config.ts`

### 3. 发布物瘦身结果

- release builder 继续保留：
  - `apps/server/dist`
  - `apps/web/public`
  - `apps/web/.next/standalone`
  - `apps/web/.next/static`
  - Prisma schema
  - launcher / runtime / updater / autostart scripts
  - 必要的运行时 `node_modules`
- 但会主动裁掉一批仅服务前端源码构建或开发检查的大体积依赖，例如：
  - `node_modules/next`
  - `node_modules/@next`
  - `node_modules/@img`
  - `node_modules/react`
  - `node_modules/react-dom`
  - `node_modules/lucide-react`
  - `node_modules/typescript`
  - `node_modules/@types`
  - `node_modules/.cache`
- 本轮实测结果：
  - 新 release app 目录中 `node_modules` 已从约 `968.67 MB` 降到约 `509.30 MB`
  - 新 zip 产物：
    - `.release/artifacts/AiOmniOps-local-single-user-win-x64.zip`
  - 体积已从此前约 `392657679` bytes 降到：
    - `252669050` bytes
  - 减少约 `35.7%`

### 4. 新 release root 已完成启动验证

- 继续直接以新的：
  - `.release/local-single-user-win-x64/start-local-single-user.cmd`
  启动安装态口径 runtime
- 已确认 AppData 运行元数据中的：
  - `webRuntime.sourceStandaloneServer`
  已切到：
  - `.release/local-single-user-win-x64/app/apps/web/.next/standalone/apps/web/server.js`
- 同时进程命令行也已确认：
  - launcher / server / worker 都来自新的 `.release/local-single-user-win-x64`
- 实测：
  - `GET http://127.0.0.1:3011/api/health`
    - 返回 `200`
- 这说明：
  - **预构建运行时模式没有破坏现有安装态启动闭环**

### 5. 当前下一步

- 到这一步，当前最高收益的后续动作已经收敛为：
  1. 把新的瘦身 zip 发成新的 remote release
  2. 再从安装态重跑真实：
     - `check`
     - `download`
     - `apply`
     - 自动重启恢复监听
- 当前尚未完成的是：
  - **基于这份更小的新发布资产，重新验证最终真实远端升级闭环**

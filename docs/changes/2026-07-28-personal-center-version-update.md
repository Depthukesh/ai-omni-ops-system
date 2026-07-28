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

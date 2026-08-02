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

## 继续验证补充（2026-07-31 08:30）

### 1. 定位“重启电脑后页面打不开”的真实原因

- 这次现场确认，问题不是页面路由或页面渲染崩溃，而是机器重启后 `local-single-user` 根本没有自动启动：
  - `3001` / `3011` 未监听
  - `local-single-user-runtime.json` 里仍残留旧 PID
  - 安装目录里虽然有 `install-autostart.cmd`，但当前机器既没有已安装的计划任务，也没有 Startup 启动项
- 这说明此前交付基线实际上要求用户“安装后还得自己再手工点一次 `install-autostart.cmd`”，这和产品级交付预期不一致。

### 2. 这次补的修正

- 调整 `scripts/build-local-single-user-release.cjs` 生成的 `install-local-single-user.ps1`：
  - 安装时在复制完发布物后，默认自动执行安装目录内的 `install-autostart.cmd`
  - 只有自启动真正安装成功后，安装流程才继续完成
- 同步把 release README 和仓库根 README 改成当前事实：
  - 新用户执行 `install-local-single-user.cmd` 后，会默认获得当前用户开机自启动
  - 如需查看或关闭，再执行 `status-autostart.cmd` / `remove-autostart.cmd`

### 3. 影响范围与收益

- 这次没有改业务接口、数据库或升级协议
- 只影响 `local-single-user` 的安装交付链
- 直接收益是：
  - 新用户安装后，不再因为漏执行 `install-autostart.cmd` 导致“每次重启电脑后页面打不开”
  - 安装说明与实际产品行为重新一致

## 继续修正补充（2026-07-31 22:30）

### 1. 定位“安装完成后立刻打不开页面”的真实原因

- 这轮重新按新用户路径验证时，确认 `install-local-single-user.cmd` 只是执行安装 PowerShell：
  - 复制 `app/bin/meta`
  - 配置当前用户开机自启动
  - 打印 `Launch: ...start-local-single-user.cmd`
- 但安装脚本本身并不会真正调用 `start-local-single-user.cmd`。
- 现场 pre-fix 调试日志已经确认：
  - 安装脚本完整执行到了退出
  - `3001 / 3011` 仍未监听
  - 没有任何“启动脚本已进入”的证据
- 因此用户看到的现象就是：
  - 双击安装器后窗口运行一会儿消失
  - 紧接着访问 `http://127.0.0.1:3001` 仍然 `ERR_CONNECTION_REFUSED`

### 2. 这次补的修正

- 调整 `scripts/build-local-single-user-release.cjs` 生成的 `install-local-single-user.ps1`：
  - 安装成功后，先校验安装目录里的 `start-local-single-user.cmd` 存在
  - 然后直接 `Start-Process` 无窗口拉起本地工作台
- 同步把 README / release README 说明改成当前事实：
  - 新用户安装完成后会自动启动本地工作台
  - 如需后续手动再开，仍可通过桌面快捷方式或 `start-local-single-user.cmd`

### 3. 影响范围与收益

- 这次没有改数据库、升级协议或 launcher 主逻辑
- 只影响 `local-single-user` 的安装完成收尾动作
- 直接收益是：
  - 新用户安装完成后，不再需要自己猜还要不要手动运行 `start-local-single-user.cmd`
  - “安装成功但页面仍打不开”的第一印象问题被收口到安装脚本内直接解决

## 继续修正补充（2026-07-31 22:50）

### 1. 另一台机器重装时暴露出第二层问题

- 在另一台测试机上，即使删除了解压目录并重新下载安装包，重新执行安装仍会停在：
  - `Existing install detected; moving to backup: ...`
- 这说明用户删除的是下载出来的目录，但：
  - `%LOCALAPPDATA%\\Programs\\AiOmniOps`
  里的旧安装仍然存在
- 更关键的是，旧实例可能仍在运行或有残留 `cmd/node/powershell` 进程占用安装目录，导致 `Move-Item $InstallRoot -> backup` 这一步容易卡住

### 2. 这次补的修正

- 调整 `install-local-single-user.ps1` 生成逻辑：
  - 当检测到旧安装目录存在时，先读取：
    - `%APPDATA%\\AiOmniOps\\runtime\\local-single-user-runtime.json`
  - 尝试终止旧的：
    - launcher / server / worker / web PID
  - 再补充扫描命令行里引用当前 `AiOmniOps` 安装目录的进程
  - 确认停机后再执行：
    - `Move-Item -LiteralPath $InstallRoot -Destination $backupRoot`

### 3. 影响范围与收益

- 这次依然没有改数据库、升级协议或业务接口
- 只影响：
  - 本地安装包的“重装 / 覆盖安装”路径
- 直接收益是：
  - 用户在另一台机器重复安装时，不需要先自己手动清理旧进程
  - 安装器能更稳地处理“已有旧安装目录”的现场

## 继续修正补充（2026-07-31 23:05）

### 1. 另一台机器仍然出现“窗口闪一下就消失”

- 这次现象说明安装入口 `install-local-single-user.cmd` 仍然存在一个交付体验问题：
  - 如果 PowerShell 安装脚本返回非 0
  - `cmd` 窗口会直接退出
  - 用户拿不到真实错误，也不知道该去哪里看日志

### 2. 这次补的修正

- 调整 `install-local-single-user.cmd` 生成逻辑：
  - 每次安装都会把 stdout / stderr 固定写到：
    - `%LOCALAPPDATA%\\AiOmniOps\\logs\\install-local-single-user.log`
  - 若安装失败：
    - 直接在窗口里打印 `Install failed`
    - 展示日志路径
    - 回显日志内容
    - `pause` 保持窗口不自动关闭

### 3. 影响范围与收益

- 这次不改业务运行逻辑，只改安装失败时的可观测性
- 直接收益是：
  - 另一台机器即使再次安装失败，也能第一时间看到真实报错
  - 后续排障不再依赖“窗口一闪而过”的模糊现象

## 继续修正补充（2026-08-02 10:20）

### 1. 用户安装时仍然不知道该去哪里看进度

- 之前的安装入口虽然已经会把日志固定写到：
  - `%LOCALAPPDATA%\\AiOmniOps\\logs\\install-local-single-user.log`
- 但对普通用户来说，这仍然有一个体验断层：
  - 安装窗口里看不到实时进度
  - 只有知道日志路径的人，才知道安装到底做到哪一步

### 2. 这次补的修正

- 调整 `scripts/build-local-single-user-release.cjs` 里的 `install-local-single-user.cmd` 生成逻辑：
  - 安装 PowerShell 的输出改为直接在窗口中实时显示
  - 同一份输出继续通过 `Tee-Object` 追加写入：
    - `%LOCALAPPDATA%\\AiOmniOps\\logs\\install-local-single-user.log`
  - 安装窗口启动时也会先提示：
    - 当前输出正在实时显示
    - 同时日志会继续落盘

### 3. 影响范围与收益

- 这次不改安装目标路径、不改启动逻辑，也不改数据保留策略
- 只补安装期的可见性
- 直接收益是：
  - 普通用户双击安装后，能在当前窗口里直接看到进度
  - 即使安装失败，仍然保留完整日志文件给后续排查

## 继续修正补充（2026-08-02 10:40）

### 1. 已经是最新版本时，残留升级状态仍可能误放开“立即升级”

- 现场现象：
  - 当前安装态已经和 `hotfix-8` 对齐
  - 页面仍可能显示“升级进行中”或保留旧的“已准备安装”语义
  - 用户再次点击“立即升级”后，会触发一次对同版本的重复 apply，随后站点短时停机重启，页面表现为又打不开

### 2. 根因

- 后端 `system-update.service.ts` 之前只在残留状态为 `APPLYING` 时，才会把“当前版本已对齐最新版本”的状态折叠成 `SUCCEEDED`
- 如果残留的是 `READY_TO_APPLY`、`DOWNLOADING` 或其它旧状态，页面仍可能延续旧语义
- 同时 `applyLatestUpdate()` / `downloadLatestUpdate()` 缺少“当前已经是最新版本”的硬拦截

### 3. 这次修正

- 后端：
  - 只要检测到“当前安装版本已经和最新版本对齐，且 `updateAvailable=false`”，统一把页面阶段折叠成 `SUCCEEDED`
  - `downloadLatestUpdate()` 在已是最新版时直接拒绝重复预下载
  - `applyLatestUpdate()` 在已是最新版时直接拒绝重复升级
- 前端：
  - 按钮状态额外判断“当前是否已和最新版本对齐”
  - 已对齐时，不再因为旧的 `downloadedReleaseTag` 或旧阶段残留而继续放开“预下载安装包 / 立即升级”

### 4. 直接收益

- 不会再因为同版本重复 apply 把当前工作台无意义停掉
- 用户看到“当前已对齐最新版”时，页面语义和按钮行为终于一致

## 继续修正补充（2026-07-31 23:20）

### 1. 新日志确认卡点落在“旧安装 backup 前”

- 用户在另一台机器上反馈的最新日志只停留在：
  - `Existing install detected; moving to backup: ...`
- 这说明新的“失败留窗 + 固定日志”已经生效，同时也把卡点进一步收缩到了：
  - 旧安装目录处理阶段
- 当前最可疑的点不再是 PowerShell 直接退出，而是：
  - 安装器里的旧进程扫描 / 停机逻辑
  - 或 `Move-Item $InstallRoot -> backup` 本身

### 2. 这次补的修正

- 继续调整 `install-local-single-user.ps1` 生成逻辑：
  - 去掉此前最可疑的全量 `Get-CimInstance Win32_Process` 枚举
  - 改成只读取 runtime metadata 里的 PID
  - 对这些 PID 使用：
    - `taskkill /PID <pid> /T /F`
    - 再辅以 `Stop-Process`
  - 同时新增更明确的阶段日志：
    - `Stopping existing runtime PIDs: ...`
    - `Creating backup from existing install...`
  - 若 `Move-Item` 失败，直接把安装根、backup 根和真实异常信息写进日志

### 3. 影响范围与收益

- 这次仍然只影响安装器
- 直接收益是：
  - 把“旧安装处理阶段”从黑盒卡住变成可观察、可定位
  - 避免因为全量 WMI 进程枚举导致安装器在某些机器上卡死

## 继续修正补充（2026-07-31 23:45）

### 1. 另一台机器确认“安装完成但启动链无日志”

- 用户在另一台机器上使用 `hotfix-4` 安装后，`install-local-single-user.log` 已显示：
  - `Install completed.`
  - `Starting local workspace...`
- 但 `%APPDATA%\\AiOmniOps\\logs` 为空，`runtime` 下也没有 `local-single-user-runtime.json`
- 这说明问题已不在安装链，而是收缩为：
  - launcher 在写出 server/web 日志和 runtime metadata 之前就提前退出

### 2. 这次补的修正

- 在 `scripts/local-single-user-launcher.cjs` 中新增最早期 bootstrap 日志：
  - 固定写入 `%APPDATA%\\AiOmniOps\\logs\\launcher.log`
- 记录的关键阶段包括：
  - Launcher start
  - 端口分配
  - Prisma generate / db push 是否执行
  - server / worker / web 是否已 spawn
  - runtime metadata 是否成功写出
  - `main.catch` / `uncaughtException` / `unhandledRejection`

### 3. 影响范围与收益

- 不改业务逻辑，只增强启动链首阶段的可观测性
- 直接收益是：
  - 即使 `server.log` / `web.log` 尚未来得及生成，也能通过 `launcher.log` 知道启动到底卡在哪一步
  - 为顺序继续验证真实升级闭环

### 4. 再往前补一层 `cmd` 级启动日志

- 继续收口后确认，仅有 `launcher.log` 仍然不够：
  - 如果 `start-local-single-user.cmd` 在调用 `node.exe` 前就失败，`launcher.log` 依旧不会出现
- 因此又在 `scripts/build-local-single-user-release.cjs` 生成的启动入口中补了：
  - 固定写入 `%APPDATA%\\AiOmniOps\\logs\\start-local-single-user.log`
  - 记录 `SCRIPT_DIR`、`APP_DIR`、`NODE_SOURCE`、`NODE_EXE`
  - 记录是否缺少 `scripts\\local-single-user-launcher.cjs`
  - 记录 `pushd` 是否成功
  - 记录 launcher 进程退出码
- 这样下一轮即使 `node.exe`、工作目录或启动入口本身异常，也能直接看到更早期的失败点

### 5. OSS 发布补一条固定上传链

- 为了避免每次热修都手工拼对象路径和 `latest.json`，新增：
  - `scripts/upload-local-single-user-release-to-oss.cjs`
  - `npm run local:release:upload:oss -- --version <version>`
- 这条链会固定上传：
  - `.release/artifacts/AiOmniOps-local-single-user-win-x64.zip`
  - `.release/artifacts/AiOmniOps-local-single-user-win-x64.zip.sha256`
  - `.release/artifacts/latest.json`
- 并统一写入：
  - `ai-omni-ops/local-single-user/win-x64/<version>/...`
  - `ai-omni-ops/local-single-user/win-x64/latest.json`
- 这样本次新测试包和后续小热修都可以走同一条 OSS 分发口径，减少手工发布误差

### 6. 修复发布包误删 `fast-check` 导致首启失败

- 用户在真实测试机重新安装后，`install-local-single-user.log` 已显示安装完成，但页面仍打不开
- 新增的 `start-local-single-user.log` 和 `launcher.log` 明确收敛出真实根因：
  - launcher 在 `Local Prisma generate` 阶段退出
  - Prisma CLI 通过 `@prisma/config -> effect` 间接加载 `fast-check`
  - 当前 release 裁剪步骤把 `node_modules\\fast-check` 当成“可删包”移除了，导致首启直接 `MODULE_NOT_FOUND`
- 这次修复只收口一处：
  - `scripts/build-local-single-user-release.cjs` 不再从发布包里裁掉 `node_modules\\fast-check`
- 影响与收益：
  - 不改 launcher 启动策略
  - 不改数据库逻辑
  - 只修正发布物瘦身规则里的误删项
  - 让安装态首启可以继续跑完 `Local Prisma generate -> db push -> server/web 拉起`

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

## 继续修正补充（2026-07-30 05:30）

### 1. 把“安装态专属能力不得串到网页版本”升级为长期规则

- 这次继续把规则补进：
  - `docs/engineering-standards.md`
  - `docs/development-delivery-checklist.md`
- 新规则明确要求：
  - 任何只属于 `local-single-user` 安装态的入口，不能只在单一点位做门禁
  - 至少同时检查导航、概览卡片 / workspaceLinks、以及手输 URL 直达页
  - 前端必须复用同一份运行时判断，不能让不同页面各写一套口径

### 2. 个人中心概览页同步接入版本入口门禁

- 继续回看个人中心概览页时，发现 `apps/web/src/app/(dashboard)/personal-center/page.tsx` 里仍保留了：
  - `/personal-center/version`
  - `版本与升级`
  这组 workspaceLinks 入口定义
- 虽然当前页面主视图未直接渲染这组数据，但它本身仍然是一个潜在回流点；后续一旦恢复对应渲染，网站版又可能重新露出安装态入口
- 这次已把概览页也接到与导航、升级页相同的 `shouldShowVersionWorkspace()` 判断：
  - 非安装态默认过滤 `/personal-center/version`
  - 安装态继续保留该入口

### 3. 本轮影响范围

- `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- `docs/engineering-standards.md`
- `docs/development-delivery-checklist.md`
- `docs/changes/2026-07-28-personal-center-version-update.md`

### 4. 本轮验证结果

- 代码层已补齐：
  - 导航门禁
  - 升级页直达门禁
  - 概览页 workspaceLinks 门禁
- 这次改动不涉及后端协议、数据库结构和升级执行逻辑

## 继续修正补充（2026-07-30 06:10）

### 1. 处理弱网长下载下直链过期导致的 `403`

- 继续回看 `system-update` 下载链后确认，当前 Windows 安装态已经采用：
  - 下载前先解析一次 `release-assets.githubusercontent.com` 最终直链
  - 后续所有 `curl --range` chunk 都直接命中该 signed URL
- 这能避开每个 chunk 都反复打 `github.com/releases/download/...` 的旧问题，但也引入了一个新的长下载风险：
  - 在弱网环境下，整包下载耗时很长
  - 如果前面若干 chunk 已经跑了较久，后续 chunk 可能在 signed URL 过期后直接返回 `401/403`
  - 这样现场就会表现成：
    - 首块或前几块能下载
    - 之后某一块突然 `curl chunk download failed: ... 403`

### 2. 本轮修正

- `apps/server/src/modules/system-update/system-update.service.ts`
  - 在下载开始时，继续保留“先解析一次最终直链”的策略
  - 但在 chunk 级重试里新增一层：
    - 如果当前 chunk 命中 `401/403`
    - 就自动再对原始 `browser_download_url` 重新解析一次新的最终直链
    - 再继续当前 chunk 和后续 chunk 的串行下载
  - 如果这次“重新解析”本身也失败，则不再死守已经过期的旧直链，而是退回原始 `browser_download_url`，交给 `curl --location` 重新走一次 GitHub 跳转
- 这样现在的下载链不再把首次解析出来的 signed URL 视为整包下载期间永久有效，而是允许在长下载过程中受控刷新。

### 3. 本轮验证结果

- `npm --workspace apps/server run build`
  - 通过
- 当前结论：
  - 这次修复没有改升级状态机、apply 流程和 GitHub release 元数据读取口径
  - 只补了一个更贴近当前现场的下载容错：
    - **signed 直链过期后可自动刷新并继续分块下载**

## 继续修正补充（2026-07-30 08:50）

### 1. 处理“零字节首块”场景下 watchdog 没有真正终止 `curl`

- 继续把最新 `system-update` 代码同步进当前 release 运行根并重启安装态后，重新触发了一次真实：
  - `POST /api/system/update/download`
- 新现场确认：
  - 状态文件会切到 `DOWNLOADING`
  - `curl.exe --range 0-4194303 --output ...part-0000.bin` 会真实拉起
  - 但 `part-0000.bin` 可以长时间保持 `0 byte`
  - 且同一个 `curl` PID 超过原来的 `45s` watchdog 窗口后仍未被终止
- 这说明当前问题已经不是 signed URL `403`，而是：
  - **零字节首块卡死时，现有 watchdog 没有真正把子进程切掉**

### 2. 本轮修正

- `apps/server/src/modules/system-update/system-update.service.ts`
  - 在 `runWindowsCurlCommand()` 里补了更硬的终止策略：
    - 先直接对当前 `child` 执行 `child.kill()`
    - 再继续走已有的 `taskkill /PID /T /F`
  - 这样当：
    - 总超时命中
    - 或 watchdog 判断 `45s` 无增量
    时，不再只依赖外层 `taskkill`，而是先对当前 `curl` 子进程发本地终止信号，再补一层进程树清理

### 3. 本轮验证结果

- `npm --workspace apps/server run build`
  - 通过
- 当前结论：
  - 新的真实断点已经被压缩为“零字节首块卡死”
  - 本轮补丁就是针对这一点做更强的子进程终止兜底，便于后续继续观察它是否能自动切换到下一次 chunk 重试

## 继续修正补充（2026-07-30 09:10）

### 1. 给单个 `4 MiB` chunk 增加更紧的执行上限

- 在继续真实观察时，又确认了更细的一层现象：
  - 第二块 `part-0001.bin` 仍可能长时间保持 `0 byte`
  - 即使 `curl` PID 已经换过一次，之后仍可能卡在同一个 PID 上不再退出
  - 这说明仅靠当前 watchdog，不足以保证“零字节分块一定会被及时切走”

### 2. 本轮修正

- `apps/server/src/modules/system-update/system-update.service.ts`
  - 为单个 chunk 新增更紧的命令执行上限：
    - `commandTimeoutMs = min(timeoutMs, 90_000)`
  - 同时把 `curl --max-time` 与 `runWindowsCurlCommand()` 的超时窗口都对齐到这条更紧的单块上限
- 这样就算 watchdog 再次失手，单个 `4 MiB` chunk 也不会继续无限期挂住，而是最多在当前块窗口内被强制结束并进入下一次 chunk 级重试。

### 3. 本轮验证结果

- `npm --workspace apps/server run build`
  - 通过
- 当前结论：
  - 下载链现在不再只依赖“有无文件增长”这一条保护
  - 即使出现零字节分块卡死，也多了一层按 chunk 粒度收口的硬上限

## 继续修正补充（2026-07-30 09:25）

### 1. 非 `401/403` 的卡死重试也回退到原始 `browser_download_url`

- 继续盯这轮真实安装态下载后又确认了一个很细的现场事实：
  - 首块或某一块 `curl` 会真实连到 `release-assets.githubusercontent.com:443`
  - TCP 连接处于 `Established`
  - 但分块文件仍可能长时间保持 `0 byte`
- 这说明在一部分现场里，问题不一定是：
  - signed URL 过期
  - 也不一定是连接直接被拒绝
- 还可能是：
  - 已经连上当前 signed 直链
  - 但这个直链本身长时间不返回有效字节

### 2. 本轮修正

- `apps/server/src/modules/system-update/system-update.service.ts`
  - 之前只有在命中 `401/403` 时，才会：
    - 刷新 signed 直链
    - 或回退到原始 `browser_download_url`
  - 现在进一步扩大到：
    - **只要当前是 signed 直链，且这次失败属于可重试下载错误**
    - 下一次 chunk 重试就允许先退回原始 `browser_download_url`
    - 让 `curl --location` 再重新走一遍 GitHub 跳转
- 这样即使当前 signed 直链不是“过期”，而是“已连上但长期不出字节”，后续重试也不会一直死磕同一条直链。

### 3. 本轮验证结果

- `npm --workspace apps/server run build`
  - 通过
- 当前结论：
  - 这次修正不是替换原有 `401/403` 刷新逻辑
  - 而是把“原始下载 URL 重新跳转一次”扩展成更通用的重试分支，继续压缩弱网下零字节分块的卡死面

## 继续修正补充（2026-07-30 10:20）

### 1. Windows 分块下载改为默认从原始 `browser_download_url` 起步

- 继续盯真实安装态下载现场后确认：
  - `downloadRelease()` 之前会先把 `browser_download_url` 解析成一次 signed 直链
  - 然后再把这条直链交给 Windows 的顺序分块下载
  - 结果就是首块下载即使最终具备“失败后回退原始 URL”的逻辑，也仍然会先撞一次最不稳定的 signed 直链
- 现场表现为：
  - `part-0000.bin` 可先被创建为 `0 byte`
  - 活跃 `curl` 长时间停在 `release-assets.githubusercontent.com`
  - 必须等 watchdog 或超时切走以后，后续重试才有机会退回原始 release URL

### 2. 本轮修正

- `apps/server/src/modules/system-update/system-update.service.ts`
  - Windows 平台下载 zip 时：
    - 不再先解析 signed 直链作为初始下载地址
    - 改为直接使用 GitHub Release 的原始 `browser_download_url`
    - 继续依赖 `curl --location` 为每个 chunk 获取当次有效跳转
  - 非 Windows 平台维持原有逻辑，仍可先解析直链再下载
- 这样做的目标不是提速，而是减少：
  - 首块先命中过期 / 发呆 / 长时间不回字节的 signed URL
  - 导致整个下载链一开始就进入等待 watchdog 的被动态

### 3. 预期收益

- Windows 安装态分块下载从第一块开始就更接近“每次重试都重新走一次官方跳转”
- 现有的：
  - `401/403` 直链刷新
  - 非 `401/403` 可重试错误回退原始 URL
  - watchdog 零字节保护
  - chunk 级超时上限
  仍然全部保留，作为后续兜底

## 继续修正补充（2026-07-30 10:30）

### 1. 去掉过于激进的 `curl --speed-limit` 保护

- 改完“原始 release URL 起步”后继续盯现场，又看到新的真实表现：
  - `curl` 已经不再先打 signed 直链
  - 但首块仍会反复重启
  - 分块文件经常还没来得及稳定落地
- 结合前面历史报错：
  - `curl: (28) Operation too slow. Less than 10240 bytes/sec transferred the last 30 seconds`
- 说明当前这层保护对弱网环境太激进：
  - 只要 30 秒内平均速率低于 `10 KB/s`
  - `curl` 就会主动判失败
  - 即使连接本身未死、后续本来还有机会慢慢出字节

### 2. 本轮修正

- `apps/server/src/modules/system-update/system-update.service.ts`
  - 对 Windows `curl` 整包下载与 chunk 下载，去掉：
    - `--speed-time 30`
    - `--speed-limit 10240`
- 保留的保护仍包括：
  - `--connect-timeout 30`
  - chunk 级 `--max-time`
  - 文件大小校验
  - watchdog 零字节/无增长终止
  - 下载错误重试

### 3. 修正意图

- 把“慢连接”与“死连接”重新区分开：
  - 死连接继续交给 watchdog 和 chunk 超时去清理
  - 慢连接不再被 `curl` 的固定速率阈值过早判死

## 继续修正补充（2026-07-30 10:45）

### 1. 基于现场证据，Windows 默认下载策略从分块切回整包续传

- 继续排查时补做了三组手工 `curl` 对照：
  - `--range 0-1023`
    - 可快速拿到 `1024 bytes`
  - `--range 0-4194303`
    - `90s` 内只拿到约 `1.1 MB`
  - `--continue-at -`
    - `120s` 内已稳定写入约 `1.59 MB`
- 这说明在当前弱网现场里：
  - GitHub release 本身不是完全不可达
  - 真正的问题更偏向“顺序分块下载每一块都要重新建立一次慢连接”
  - 对这种极慢链路，整包单连接续传反而比 `Range` 分块更稳

### 2. 本轮修正

- `apps/server/src/modules/system-update/system-update.service.ts`
  - Windows 下如果可用 `curl.exe`：
    - 默认改回整包 `curl --continue-at -` 续传
    - 初始 URL 直接使用原始 `browser_download_url`
    - 每轮失败后依旧依赖外层重试与最终文件大小校验收口
- 保留的保护包括：
  - `--connect-timeout`
  - 长窗口 `--max-time`
  - 文件大小校验
  - 外层下载重试

### 3. 这次策略切换的原因

- 当前目标已经从“理论上最细粒度的分块控制”切换为“真实弱网下先把下载跑通”
- 既然手工实测已经证明：
  - 单连接续传 > 顺序 range 分块
- 那默认策略就应该优先选择现场更稳的方案，而不是继续保留更复杂但更脆弱的下载形态

## 继续修正补充（2026-07-30 15:20）

### 1. 失败后的重新点击下载，不能再把已下载部分清空

- 继续验证整包续传后，真实现场已经能把 zip 拉到约 `71.7 MB`
- 但随后仍可能被网络层打断，例如：
  - `curl: (56) Recv failure: Connection was reset`
- 这时又暴露出一个新的恢复性问题：
  - 单次请求内部虽然会用 `curl --continue-at -` 续传
  - 但一旦本次请求最终落成 `FAILED`
  - 下次重新点击“下载更新”时，`downloadRelease()` 会先把当前 tag 对应的 `downloads/<tag>/` 目录整个删掉
  - 结果就是前面已经积累下来的几十 MB 直接归零

### 2. 本轮修正

- `apps/server/src/modules/system-update/system-update.service.ts`
  - 下载同一 release tag 时，不再在入口处先删整个 `releaseRoot`
  - 改为：
    - 保留已存在的目标目录
    - 让 `zip` 文件继续走 `readExistingDownloadSize + curl --continue-at -`
    - 只有当本地文件尺寸异常大于预期时，才按原有逻辑清掉单文件重来
- 同时把 Windows 下载外层重试次数从 `5` 提高到 `20`
  - 让弱网下多次 `Recv failure / timeout` 后，仍然有更多自动续传机会

### 3. 本轮验证目标

- 本轮不是验证“从 0 开始能不能起步”
- 而是验证：
  - 已经失败并残留部分 zip 后
  - 再次触发下载时，是否会从已有体积继续增长，而不是被清零重下

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

## 继续修正补充（安装态 apply 收口）

### 1. 真实下载链已跑通到 `READY_TO_APPLY`

- 这轮继续在真实安装态下长时间观察后，已确认：
  - 整包 `curl --continue-at -` 续传可以跨多轮超时和断线持续推进
  - 安装包最终完整落盘到：
    - `252669050` bytes
  - `status` 已真实进入：
    - `READY_TO_APPLY`
- 这说明此前的下载链问题已经从“无法完成下载”收口到：
  - **下载完成后，`apply` 阶段没有真正继续执行**

### 2. `apply` 卡死的真实根因是 updater 脚本 BOM

- 在 `READY_TO_APPLY` 后自动触发 `apply`，状态文件进入了：
  - `APPLYING`
- 但进一步检查发现：
  - `apply-runs/.../local-single-user-updater.stdout.log`
  - `apply-runs/.../local-single-user-updater.stderr.log`
  始终为空
  - 解压目录也没有创建
- 手动执行生成出来的 updater 脚本后，拿到了真实报错：
  - `The term '﻿param' is not recognized`
- 这说明生成的：
  - `local-single-user-updater.ps1`
  在写出时把文件头 BOM 当成了普通文本字符带进了脚本内容
  - PowerShell 把首行识别成了：
    - `﻿param`
    而不是正常的 `param`
- 结果就是：
  - updater 根本没有真正进入校验 / 停机 / 解压 / 替换 / 重启流程
  - 但外层状态已经先写成了 `APPLYING`
  - 从而表现为“升级一直卡在 APPLYING”

### 3. 本轮代码修正

- 在：
  - `apps/server/src/modules/system-update/system-update.service.ts`
  中调整 apply-run 脚本生成逻辑：
- 读取源 `local-single-user-updater.ps1` 后，先剥掉脚本文本里的首字符 BOM
  - 再以真正的 UTF-8 BOM 文件形式写入 `apply-runs/.../local-single-user-updater.ps1`
- 这样可以保证：
  - 不会再把 `﻿param` 这种非法首字符写进脚本文本
  - 同时 Windows PowerShell 仍能按 UTF-8 正确解析脚本里的中文字符串

### 4. 当前下一步

- 重新 build server
- 同步新的 `system-update.service.js` 到当前安装态 release root
- 重新触发真实 `apply`
- 继续验证是否能从：
  - `APPLYING`
  真正推进到：
  - `SUCCEEDED`

## 继续修正补充（安装根自检回归）

### 1. 真实升级链已经跑到 `SUCCEEDED`

- 这轮在修正 apply-run updater 编码问题后，真实链路已继续推进到：
  - `正在解压升级包`
  - `SUCCEEDED`
- 同时 runtime metadata 也已经刷新到了新的一组进程 PID，说明升级后的重启确实发生了。

### 2. 但升级后安装根出现了“半替换”残留

- 继续核查安装根后发现：
  - `.release/local-single-user-win-x64/start-local-single-user.cmd`
    - 丢失
  - `.release/local-single-user-win-x64/app/package.json`
    - 丢失
- `system-update-status.json` 仍然保留的是：
  - `SUCCEEDED`
- 但 `/api/system/update/status` 里新的 runtime 已经把自己识别成：
  - `当前运行环境不是已安装的 local-single-user 发布包`
- 这说明：
  - **升级重启虽然完成了，但安装目录替换过程出现了一次“半替换”**

### 3. 半替换的真实根因

- 从 updater 实际运行输出中拿到了更准确的安装错误：
  - `Move-Item ... local-single-user-win-x64 ... The process cannot access the file ... because it is being used by another process`
- 进一步对照进程树确认：
  - 运行时虽然已经停止了 launcher / server / worker / web 的主 PID
  - 但仍有一个：
    - `cmd.exe /c ... start-local-single-user.cmd`
    包装进程还活着
- 这个 `cmd.exe` 继续占着安装根里的启动脚本或相关路径，导致：
  - 安装目录移动到 backup 时不是完整成功，也不是完整失败
  - 最终留下“旧目录部分被搬走，新目录部分被复制回来”的半残现场

### 4. 本轮代码修正

- 在：
  - `scripts/local-single-user-updater.ps1`
  中继续补强停机逻辑：
  - 除了 runtime metadata 里的 launcher / server / worker / web PID
  - 还会额外扫描并终止命令行中引用当前 `start-local-single-user.cmd` 的 `cmd.exe` wrapper 进程
- 目标是保证：
  - 后续再执行升级时，`Move-Item $InstallRoot -> backup` 能一次性完整完成
  - 不再留下“安装根自检失败但服务又能起来”的半替换状态

### 5. 成功升级后的状态回显也一并收口

- 继续核对升级后 `/api/system/update/status` 的真实返回时，又发现了两个收尾问题：
  1. `system-update-status.json` 是由 PowerShell 写出的 UTF-8 BOM 文件
     - Node 侧原先直接 `JSON.parse(readFileSync(..., "utf8"))`
     - 读取 persisted status 时会因为 BOM 导致解析失败
     - 表现为：
       - `downloadedReleaseTag / appliedAt / failedAt` 全部丢失
       - `phase` 回退成按远端重新计算的默认值
  2. 即使成功安装的是当前 latest 同一 `tag`，原逻辑也仍可能因为
     - `publishedAt > generatedAt`
     把它重新判成 `updateAvailable = true`

- 本轮在：
  - `apps/server/src/modules/system-update/system-update.service.ts`
  中补了两层修正：
  - 读取本地 JSON 时先剥掉 UTF-8 BOM
  - 如果 persisted state 已经指向当前 latest 同一 `tag`，且阶段是：
    - `READY_TO_APPLY`
    - `APPLYING`
    - `SUCCEEDED`
    则不再重复显示为可升级

- 这样可以保证：
  - 升级完成后的本地状态能稳定读回
  - 不会出现“明明刚升完，又立刻显示还有同一个更新”的假回归

## 继续验证补充（安装根现场修复与成功态回显）

### 1. 升级后的当前安装根曾短暂缺失 `app/apps/server`

- 继续把最新修复同步回当前 `.release/local-single-user-win-x64` 运行根时，现场确认：
  - `app/apps/server` 目录已经空掉
  - 导致 3011 API 无法重新启动
- 这说明当次升级后的运行根虽然已经被 updater 标记成：
  - `SUCCEEDED`
  但程序目录现场仍存在一次性损坏残留

### 2. 当前现场修复方式

- 先从本次升级解压目录补回完整的：
  - `app/apps/server`
- 再把当前仓库里最新 build 产物整体覆盖到运行根：
  - `apps/server/dist -> .release/local-single-user-win-x64/app/apps/server/dist`
- 同时把最新：
  - `scripts/local-single-user-updater.ps1`
  覆盖进当前运行根：
  - `.release/local-single-user-win-x64/app/scripts/local-single-user-updater.ps1`

### 3. 修复后重新启动验证

- 重新拉起：
  - `.release/local-single-user-win-x64/start-local-single-user.cmd`
- 实测：
  - `GET http://127.0.0.1:3011/api/health`
    - 返回 `200`
    - `status=ok`
  - `GET http://127.0.0.1:3001`
    - 返回 `200`
- 当前 runtime metadata 也已刷新为新的 PID，说明修复后的 launcher / server / worker / web 已重新稳定拉起。

### 4. 最终状态回显已恢复正确

- 在完成上述现场修复并重启后，再次请求：
  - `GET http://127.0.0.1:3011/api/system/update/status`
- 当前真实返回已经恢复为：
  - `phase = SUCCEEDED`
  - `updateAvailable = false`
  - `downloadedReleaseTag = local-single-user-win-x64-2026-07-29-hotfix-2`
  - `appliedAt` 为本次真实升级完成时间
- 这说明：
  - **真实升级链已经跑到 `SUCCEEDED`**
  - **升级后的状态持久化读取与同 tag 成功态回显已经闭环**

### 5. 当前剩余事项

- 当前源码里的修复已经验证有效，但这轮现场修复还没有再重新跑一遍全新的：
  - `check -> download -> apply -> restart -> succeeded`
- 因此后续如果要把这条链完全收口到“可重复演练”，下一步优先做：
  - 基于当前修复后的运行根，再重跑一轮完整升级演练

## 继续验证补充（launcher 与手工直启的环境差异）

### 1. 新现场说明 API 手工直启已可成功启动

- 用户在测试机上按我们给出的 PowerShell 命令，直接执行：
  - `bin/node.exe app/apps/server/dist/apps/server/src/main.js`
- 现场输出显示：
  - Nest 模块初始化完成
  - `/api/health` 路由已注册
  - `AI全域运营系统后端已启动: http://127.0.0.1:3011/api/health`

- 这说明当时机器上的阻塞点已经不再是：
  - `Prisma generate`
  - `Prisma db push`
  - 数据库路径
  - 后端 dist 缺失

### 2. 进一步收缩后，问题集中到 launcher 注入的运行时环境

- 同一台机器上：
  - 手工直启 API 可以成功
  - launcher 拉起 API 却在健康检查超时后判定失败
- 两条链路最关键的差异项是：
  - launcher 会给整个本地单机运行时默认注入 `NODE_ENV=production`
  - 手工直启命令当时并没有注入这项

- 结合当前服务端配置可确认：
  - `production` 下对本机回环地址会走不同的公共地址归一逻辑
  - 这类差异不应该反向影响本地安装态 API 的首启稳定性

### 3. 本轮修正

- 在：
  - `scripts/local-single-user-launcher.cjs`
  中调整本地单机 launcher 的环境注入策略：
  - API / worker 不再强制写入 `NODE_ENV=production`
  - Web 进程仍保留 `NODE_ENV=production`，保证 standalone/预构建运行时继续按正式前端模式启动

- 这次修正的目标不是放宽整个交付基线，而是让：
  - 本地安装态 API 启动环境尽量贴近已验证通过的手工直启现场
  - 避免 launcher 比真实 API 启动链额外多打一层生产态分支

### 4. 继续收缩后，API/worker 的工作目录也确认为高可疑差异项

- 用户回传的 `aiomniops-startup-report.txt` 显示：
  - `Prisma generate` / `db push` 已成功
  - launcher 仍在 `waitForUrl(api/health)` 阶段超时
  - `server.log` / `server.err.log` 都为空
  - 3001 / 3011 端口均未监听

- 与此同时，用户手工执行：
  - `bin/node.exe app/apps/server/dist/apps/server/src/main.js`
  却能够把 Nest API 正常拉起。

- 这说明问题已经进一步收缩为：
  - launcher 启动 API 子进程的方式，仍和手工直启现场存在关键差异

- 本轮继续在：
  - `scripts/local-single-user-launcher.cjs`
  中收紧：
  - API / worker 不再以 `apps/server` 为 `cwd`
  - 改为以安装包 `app` 根目录启动，尽量贴近已验证通过的手工直启链路

- 这次调整的目的，是避免服务端在安装态启动时因为 `process.cwd()` 指向偏深目录，命中不同的路径解析分支，导致首启既没监听端口，也没来得及留下有效日志。

## 继续验证补充（后台接口供应商在 SQLite 下回退到演示数据）

### 1. 现象已经收缩到后台初始化的单一失败接口

- 本地单机安装态重新可登录后，`/admin` 虽然能进入，但顶部仍出现红色提示：
  - `部分后台接口暂不可用，当前已回退到本地演示数据。`
- 顺着后台前端的 `Promise.allSettled(...)` 初始化链逐个排查后，确认并不是整套后台不可用，而是只有：
  - `/api/admin/api-providers`
  返回了 `500`
- 其它后台初始化接口，包括：
  - 计费规则
  - 用户管理
  - 模型用量
  - 技能中心
  - Prompt / 运营 Prompt / 生图 Prompt
  - 能力包
  - 模块注册
  - 知识库与知识文件
  - 第三方平台
  都已可正常返回

### 2. 根因是 `ApiProvidersService` 仍残留 PostgreSQL 方言假设

- 本地单机安装态跑的是 SQLite。
- 但 `apps/server/src/modules/admin/api-providers.service.ts` 里原先的 provider 治理与系统 seed 同步逻辑，仍然把多处数据库操作写成 PostgreSQL 专用语法，例如：
  - `JSONB`
  - `::jsonb`
  - `TIMESTAMPTZ`
  - `ANY (...::text[])`
- 这会导致后台首次拉取接口供应商列表时，SQLite 在 raw SQL 阶段直接报错，前端随后回退到本地演示数据。

### 3. 本轮修正

- 在：
  - `apps/server/src/modules/admin/api-providers.service.ts`
  中补齐 SQLite 分支，避免本地安装态继续走 PostgreSQL raw SQL：
  - provider 列表读取改为 Prisma ORM
  - 新建 / 更新 / 归档 / 删除 provider 改为 Prisma ORM
  - SQLite 下的 `ApiProviderConfig` 建表与补列改为 SQLite 兼容定义
  - 系统 provider seed 同步、废弃 provider 清理与 `Right Codes Codex` 默认值迁移，全部补齐 SQLite 路径
  - JSON 字段统一通过 `Prisma.InputJsonValue` 写入，避免本地模式下继续拼接 `::jsonb`

### 4. 影响范围与防副作用说明

- 这次修正只收口：
  - 后台 `接口供应商` 治理模块
- 没有改：
  - 数据库 schema
  - 前端后台初始化协议
  - 其它 admin 模块接口
  - 网站版 / PostgreSQL 模式下原有治理链路
- PostgreSQL 路径仍保留原有 raw SQL 行为；SQLite 仅在本地单机安装态切到兼容分支，避免局部修复扩大成全局行为变化。

### 5. 验证

- `npm exec tsc -- -p "d:\\王笑东\\aiproject\\AI全域运营\\AI全域智能体\\local-ai-omni-ops-system\\apps\\server\\tsconfig.json" --noEmit`
  - 通过
- 安装态真实运行根热补丁后验证：
  - `GET http://127.0.0.1:3011/api/health`
    - 返回 `200`
    - `status=ok`
- 本地默认管理员登录验证：
  - `POST http://127.0.0.1:3011/api/auth/login`
    - 返回 `200`
    - `systemRole=SUPER_ADMIN`
- 接口供应商接口验证：
  - `GET http://127.0.0.1:3011/api/admin/api-providers`
    - 返回 `200`
    - 已返回真实 provider 列表
- 通过 Web 代理再验后台初始化链：
  - `GET http://127.0.0.1:3001/api/admin/api-providers`
    - 返回 `200`
  - 后台初始化涉及的 20 个接口经管理员 token 逐个请求，现已全部返回 `200`

### 6. 当前结论

- 后台此前显示“回退到本地演示数据”的直接根因已经修掉：
  - `/api/admin/api-providers` 不再在 SQLite 下报错
- 按当前实测结果，`/admin` 重新刷新后应恢复使用真实后台数据，不再进入本地 seed 回退模式。

## 继续修正补充（版本升级页成功态文案归一）

### 1. 当前版本页的版本源判断本身是正确的

- 这次顺着“能不能直接通过版本升级修复后台问题”继续验证时，确认版本页当前仍然默认读取：
  - GitHub Releases
- 当前安装态的 `generatedAt` 已晚于最新 GitHub Release 的 `publishedAt`，所以：
  - `updateAvailable = false`
  的判断本身没有问题

### 2. 但成功态消息会残留上一次升级时的旧提示

- `system-update` 状态接口此前只要检测到持久化状态文件里还保留了：
  - `phase = SUCCEEDED`
  - `message = 升级安装完成，正在重新启动本地工作台。`
- 就会原样把这条旧消息继续回给前端，即使当前实际上已经稳定运行且没有新版本。
- 这会让版本页出现一种口径不一致：
  - 右侧显示“已是最新”
  - 但状态说明还像“系统仍在刚刚重启”

### 3. 本轮修正

- 在：
  - `apps/server/src/modules/system-update/system-update.service.ts`
  中把 `resolveMessage(...)` 的逻辑收紧为按当前阶段返回消息：
  - `DOWNLOADING` / `APPLYING` / `READY_TO_APPLY` / `FAILED`
    继续优先使用持久化状态里的实时消息
  - `SUCCEEDED + !updateAvailable`
    统一返回：
    - `当前已经是最新发布版本。`
- 这样“历史成功消息”不会再覆盖当前真实状态

### 4. 验证

- `npm exec tsc -- -p "d:\\王笑东\\aiproject\\AI全域运营\\AI全域智能体\\local-ai-omni-ops-system\\apps\\server\\tsconfig.json" --noEmit`
  - 通过
- 安装态运行根热补丁并重启后验证：
  - `GET http://127.0.0.1:3011/api/system/update/status`
  - 当前已返回：
    - `phase = SUCCEEDED`
    - `updateAvailable = false`
    - `message = 当前已经是最新发布版本。`

## 继续修正补充（升级重启窗口下的版本页容错）

### 1. 当前现象不是“版本号文件丢失”，而是刷新时卡在重启窗口

- 用户在版本页点击“立即升级”后，前端会先收到：
  - `APPLYING`
  - `升级进程已启动`
- 但如果此时用户过一会儿刷新页面，而本地 API 仍处于：
  - 停旧进程
  - 替换安装目录
  - 重新拉起
  的窗口期，`/system/update/status` 会短暂请求失败。
- 版本页此前一旦遇到这类失败，就直接把状态清空，导致页面看起来像：
  - `当前版本 = -`
  - `最新 Release = 未获取`
  - 顶部直接显示 `Failed to fetch`

### 2. 这次修正

- 在：
  - `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
  中补了版本页的本地状态保留与自动重试：
  - 每次成功拿到 `SystemUpdateStatus` 都写入浏览器本地缓存
  - 点击“立即升级”后，会先把 `APPLYING` 状态写入本地缓存
  - 如果刷新时遇到 API 暂时不可达，页面优先展示最近一次成功状态，而不是直接清空成 `-`
  - 当缓存状态处于 `APPLYING` / `DOWNLOADING` 时，页面会自动定时重试

### 3. 影响范围与收益

- 这次不改升级协议，不改 installer，也不改 updater 停机逻辑
- 只修正版本页在升级重启窗口中的前端体验
- 直接收益是：
  - 用户即使在升级后立即刷新，也不会误以为“版本号和 Release 信息都没了”
  - 页面会更明确地表达“正在重启 / 正在恢复”，并自动重试

### 4. 验证

- `npm --workspace apps/web exec tsc --noEmit`
  - 通过
- 本地安装态现场复查：
  - `meta/release-manifest.json`
  - `app/package.json`
  - `start-local-single-user.cmd`
  均存在，说明当前问题并不是安装根基础文件丢失
- `GET http://127.0.0.1:3001/api/health`
  - 当前返回 `200`
  - 说明重启后的服务可恢复

## 继续修正补充（测试机 SQLite 启动兼容与慢启动容错）

### 1. 测试机真实日志确认：旧包不是“没装上”，而是安装后运行链不稳定

- 从测试机导出的诊断目录可确认：
  - 安装目录和 `release-manifest.json` 已落盘
  - `local-single-user-runtime.json` 记录过 `launcher/server/worker/web` 的真实 PID
  - 但导出时 `ports.txt` 与 `node-processes.txt` 已为空
- 这说明问题不是“安装失败”，而是：
  - 启动后 Node 进程又退出了
  - 且测试机拿到的仍是较早一版旧包，不是后续已修热更版本

### 2. 测试机 server.err.log 暴露出两类残留问题

- 一类是旧包仍带着早期发布物问题：
  - `Local Prisma generate` 缺少 `fast-check`
- 另一类是本地单机 SQLite 模式下仍有残留 PostgreSQL 语法：
  - `unrecognized token: ":"`
  - `near "EXISTS": syntax error`
- 本轮把源码里真实命中的 OpenClaw 工作区模块一起收口，避免继续出现：
  - `TIMESTAMPTZ`
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
  这类 SQLite 不兼容语法

### 3. 本轮代码收口

- 在以下模块中补齐 SQLite 建表/补列分支：
  - `apps/server/src/modules/openclaw/openclaw-daily-plan.service.ts`
  - `apps/server/src/modules/openclaw/openclaw-lobster-diary.service.ts`
  - `apps/server/src/modules/openclaw/openclaw-geo-visibility-report.service.ts`
  - `apps/server/src/modules/openclaw/openclaw-creative-material.service.ts`
  - `apps/server/src/modules/openclaw/openclaw-video-work.service.ts`
- 统一策略为：
  - SQLite：`CREATE TABLE` 使用 `DATETIME`
  - SQLite：新增列改走 `prismaService.ensureTableColumns(...)`
  - PostgreSQL：保留现有 `TIMESTAMPTZ` 与 `ADD COLUMN IF NOT EXISTS` 行为
- 同时在：
  - `scripts/local-single-user-launcher.cjs`
  中把 URL 就绪等待窗口从 `45s` 提高到 `90s`
- 这样可以避免慢机器上：
  - API 实际快起来了
  - 但 launcher 因健康检查过早超时，提前判定失败并杀掉整套进程

### 4. 影响范围控制

- 本轮没有改 API 协议
- 没有改数据库 schema 定义文件
- 没有改业务页面入口
- 只修：
  - 本地单机 SQLite 运行态的建表/补列兼容
  - launcher 的启动等待容错

### 5. 验证

- `npm exec tsc -- -p "d:\\王笑东\\aiproject\\AI全域运营\\AI全域智能体\\local-ai-omni-ops-system\\apps\\server\\tsconfig.json" --noEmit`
  - 通过
- 代码回扫确认：
  - OpenClaw 模块的 PostgreSQL 语法仅保留在 PostgreSQL 分支
  - SQLite 分支已改为兼容写法

## 继续修正补充（安装态版本升级入口被误隐藏）

### 1. 现象

- 测试机安装新版可正常启动后，个人中心顶部二级导航里的：
  - `版本与升级`
  再次消失。
- 页面并不是被删除，而是前端会根据：
  - `system/update/status`
  返回的 `supported && current.canApplyUpdate`
  决定是否显示入口。

### 2. 根因

- 之前为修复本地单机启动，把 API / Worker 的 `cwd` 调整到了安装包的：
  - `app` 根目录
- 但 `apps/server/src/modules/system-update/system-update.service.ts`
  里仍然按旧假设使用：
  - `resolve(process.cwd(), "..", "..")`
  推导 `projectRoot`
- 在新的启动方式下，这会把安装态根目录算错，继而误判：
  - 当前不是已安装的 local-single-user 发布包
- 结果就是：
  - `canApplyUpdate = false`
  - 前端把 `版本与升级` 入口过滤掉

### 3. 修复

- 在：
  - `apps/server/src/modules/system-update/system-update.service.ts`
  增加 `findNearestPackageJsonRoot(startPath)`，
  改为从当前 `cwd` 向上就近定位真正的 `package.json` 根目录，而不是硬编码 `..\\..`
- 这样两种场景都能正确识别：
  - 安装态：`cwd = app`
  - 源码态：`cwd = repo` 或其他开发目录

### 4. 验证

- `npm exec tsc -- -p "d:\\王笑东\\aiproject\\AI全域运营\\AI全域智能体\\local-ai-omni-ops-system\\apps\\server\\tsconfig.json" --noEmit`
  - 通过
- 代码回读确认：
  - `getCurrentBuildInfo()` 已改为走 `findNearestPackageJsonRoot(process.cwd())`
  - 不再依赖固定层级推导安装根

## 继续修正补充（下载与应用内升级统一切到 OSS）

### 1. 背景

- GitHub Release 更适合做版本归档，但大安装包在当前网络环境下下载速度慢、稳定性也不够好。
- 用户已明确要求：
  - 手工下载安装走 OSS
  - 应用内“检查更新 / 预下载安装包 / 立即升级”也统一走 OSS

### 2. 本次收口

- `scripts/upload-local-single-user-release-to-oss.cjs`
  - 大文件改为分片上传，避免 60 秒单次上传超时
  - `latest.json` 补充：
    - `name`
    - `publishedAt`
    - `checksumValue`
    - `source=oss`
- `scripts/build-local-single-user-release.cjs`
  - `meta/release-manifest.json` 新增：
    - `releaseTag`
- `apps/server/src/modules/system-update/system-update.service.ts`
  - 安装态升级源改为默认读取 OSS `latest.json`
  - 不再以 GitHub Release 作为默认检查源
  - 当前安装包若已携带 `releaseTag`，则优先按 `releaseTag` 精确判断是否有更新
- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
  - 页面文案从 GitHub Release 改为 OSS 升级源
  - 下载按钮改为直达 OSS 安装包资源

### 3. 当前 OSS 升级源

- `latest.json`
  - `https://bucketwangxiaodong.oss-cn-beijing.aliyuncs.com/ai-omni-ops/local-single-user/win-x64/latest.json`

### 4. 风险与兼容

- 已安装的旧包如果 `release-manifest.json` 里还没有 `releaseTag`，仍会退回到 `generatedAt` 口径判断新旧。
- 从下一版开始，安装态会具备更稳定的版本判断能力，不再容易出现“明明装了新包，却被同名 zip 或旧元数据干扰”的问题。

## 继续修正补充（重启后打不开的自启动链分叉）

### 1. 现场现象

- 用户反馈：电脑重启后，`127.0.0.1:3001` 打不开。
- 现场日志显示：
  - 手工执行 `start-local-single-user.cmd` 时，`LOCAL_SINGLE_USER_PREBUILT_ONLY=true`，launcher 会跳过 `server build / web build`
  - 但开机后的自启动链里，`launcher.log` 出现了：
    - `Run server build`
    - `npm error No workspaces found: --workspace=apps/server`

### 2. 根因

- `install-autostart.cmd` 安装的是 `scripts/local-single-user-autostart.ps1`
- 旧版 `local-single-user-autostart.ps1` 直接调用：
  - `node scripts/local-single-user-launcher.cjs`
- 这条链**绕过了**安装目录顶层的 `start-local-single-user.cmd`
- 因而也绕过了 `start-local-single-user.cmd` 里统一注入的：
  - `LOCAL_SINGLE_USER_PREBUILT_ONLY=true`
  - 以及其它启动期受控环境
- 结果就是：
  - 手工启动能走预构建运行时
  - 开机自启动却错误进入“现场重编”分支
  - 而安装态发布物并不带 workspace 构建环境，所以重编必然失败

### 3. 修复

- `scripts/local-single-user-autostart.ps1`
  - 不再直接调用 `local-single-user-launcher.cjs`
  - 改为直接 `Start-Process` 启动安装根下的：
    - `start-local-single-user.cmd`
  - 同时继续保留：
    - `LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER=false`
- 这样开机自启动与用户手动双击启动入口完全复用同一条链，不再出现“手动能开、重启后打不开”的分叉行为

## 继续修正补充（版本页升级时报错与升级后状态残留）

### 1. 现场现象

- 用户在个人中心点击：
  - `立即升级`
- 页面会偶发直接报：
  - `Failed to fetch`
- 即使升级实际已经开始，刷新后也可能继续看到：
  - `升级进行中`
  - 或状态页短暂不可达

### 2. 根因

- `POST /system/update/apply` 会先后台拉起独立 updater，再由 updater 停掉当前 API / Web / worker。
- 原先 updater 在接管后停机太快，浏览器还没来得及稳定收到 JSON 响应，就先碰到了连接断开，于是前端把这次断连显示成了硬错误。
- 同时，若本地状态文件里还保留着旧的：
  - `phase = APPLYING`
  但当前安装包其实已经和最新版本对齐，状态页仍可能继续展示“升级中”，而不是自动回到成功态。

### 3. 这次修复

- `scripts/local-single-user-updater.ps1`
  - 在真正执行 `Stop-RuntimeFromMetadata` 前增加短暂延时：
    - `Start-Sleep -Seconds 3`
  - 给 `/system/update/apply` 这个请求留出响应窗口，减少“升级已启动但前端只看到 Failed to fetch”的误报。
- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
  - `handleApply()` 捕获到 `Failed to fetch` 时，不再直接显示“升级失败”
  - 而是按“升级进程可能已接管当前工作台”处理，并继续走状态轮询与页面提示
  - 页面在 `APPLYING` / `DOWNLOADING` 阶段保留最近一次成功状态并自动重试
- `apps/server/src/modules/system-update/system-update.service.ts`
  - 当当前安装包已经和最新版本对齐时，会把残留的 `APPLYING` 自动归并成：
    - `SUCCEEDED`
  - 避免用户手工装到最新版本后，版本页还长时间显示“升级进行中”

### 4. 影响范围

- 不改升级协议
- 不改安装包目录结构
- 不改用户数据目录
- 只收口：
  - 升级请求返回窗口
  - 升级状态页的前端容错
  - 已升级完成后的状态归一

### 5. 验证计划

- `npm --workspace apps/web exec tsc --noEmit`
- `npm exec tsc -- -p "d:\\王笑东\\aiproject\\AI全域运营\\AI全域智能体\\local-ai-omni-ops-system\\apps\\server\\tsconfig.json" --noEmit`
- 重新打包 `local-single-user`
- 上传 OSS 并用版本页再次执行：
  - 检查更新
  - 立即升级

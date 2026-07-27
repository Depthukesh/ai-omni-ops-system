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

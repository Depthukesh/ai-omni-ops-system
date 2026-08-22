# 2026-08-17 local-single-user 升级器 bootstrap 存活判定修复

## 1. 背景

`hotfix-71` 已经修复安装包覆盖安装时发布物缺少 `local-single-user-platform.cjs` 的问题，本机安装包验证已成功。

但笔记本电脑在网页里点击“立即升级”时，仍会直接提示：

- `升级器未成功启动，请检查 ...\apply-runs\... 下的日志。`

这说明当前剩余问题已经不在安装包内容本身，而在升级器 bootstrap 判定。

## 2. 根因

`SystemUpdateService.applyLatestUpdate()` 在成功 `spawn` PowerShell updater 之后，还会执行一次 `waitForUpdaterBootstrap()`。

旧逻辑要求在很短时间内至少满足下面一项，才认为升级器“已经成功启动”：

1. `system-update-status.json` 中 `APPLYING` 的 message 发生变化
2. `local-single-user-updater.trace.log` 非空
3. `local-single-user-updater.stdout.log` 非空

否则，即使：

- updater 进程实际上仍在运行
- 且当前没有任何 `stderr` 失败信号

也会被直接误判成：

- `升级器未成功启动`

这对慢机器、杀软扫描较重或首次 PowerShell 启动较慢的场景过于敏感。

## 3. 本次改动

修改文件：

- `apps/server/src/modules/system-update/system-update.service.ts`

具体修复：

1. 在 `spawn` updater 后保留 `updaterPid`
2. `waitForUpdaterBootstrap()` 新增 `updaterPid` 参数
3. 当 bootstrap 等待超时但同时满足：
   - updater 进程仍存活
   - 当前没有 `stderr` 失败信号

则把本轮结果视为：

- `started = true`

允许升级链继续进入后台 `APPLYING`，而不是在前端过早报死

## 4. 影响面检查

### 4.1 本次影响范围

- 个人中心“立即升级”入口的 bootstrap 判定
- 慢机器 / 首次 PowerShell 启动慢场景下的升级成功率

### 4.2 本次未改动范围

- 安装包内容
- updater 真正的安装 / 回滚逻辑
- 新版本 API / Web 验活逻辑

## 5. 验证

已执行：

- `npm --workspace apps/server run build`

同时已结合真实用户反馈确认：

- `hotfix-71` 后本机安装包覆盖安装成功
- 剩余失败场景已经收窄为升级器 bootstrap 误判

## 6. 当前结论

这次修复不是放宽真正的失败条件，而是修正“进程明明还活着，却因为首轮 trace/stdout 还没来得及落盘就被前端判死”的误判。

后续真实验证重点应变成：

1. 笔记本点击“立即升级”后，是否不再立即报“升级器未成功启动”
2. 升级状态是否能稳定停留在 `APPLYING`
3. 最终是否能切到新版本，或在失败时给出更真实的后续报错

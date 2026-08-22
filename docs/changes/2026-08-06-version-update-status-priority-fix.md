# 2026-08-06 版本与升级状态优先级修复

## 背景

- 在 `personal-center/version` 页面点击“检查更新”后，如果本机曾经有过一次升级失败记录，页面会继续显示：
  - `升级失败`
  - `升级失败，且自动回滚失败...`
- 但同时页面卡片里又已经正确显示：
  - 当前版本 `hotfix-21`
  - 最新版本 `hotfix-22`
  - 且“立即升级”按钮仍然可点

这说明不是本次检查更新真的失败，而是服务端状态解析把“上一次失败记录”优先级放得太高，压过了当前新的 `AVAILABLE` 状态。

## 本次调整

- `apps/server/src/modules/system-update/system-update.service.ts`
- `resolvePhase()` 和 `resolveMessage()` 调整为：
  - `DOWNLOADING` / `APPLYING` / `READY_TO_APPLY` 仍保持最高优先级
  - 只要当前已检测到 `updateAvailable=true`，就优先显示 `AVAILABLE`
  - 只有在当前没有新版本可升时，才继续展示残留的 `FAILED` 状态

## 影响范围

- 只影响“版本与升级”页面的状态文案与状态 pill
- 不改下载逻辑，不改升级逻辑，不改回滚逻辑

## 验证

- `npm run build:server`
- 静态核对：存在历史失败记录但当前已检测到新版本时，页面应显示“检测到新版本”，而不是继续显示“升级失败”

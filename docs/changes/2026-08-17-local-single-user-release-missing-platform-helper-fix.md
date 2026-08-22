# 2026-08-17 local-single-user 发布物缺失 platform helper 修复

## 1. 背景

在 `hotfix-70` 的真实验证中，同时出现了两类问题：

1. 一台机器使用安装包覆盖安装时，安装窗口停在：
   - `Local workspace did not become ready after install`
   - `lifecyclePhase=INSTALLING`
2. 另一台机器点击“立即升级”后长时间没有成功切到新版本

本轮没有继续按症状猜测，而是直接查看本机安装失败现场。

## 2. 真实根因

本机安装失败后的 `start-local-single-user-session-*.log` 明确报错：

```txt
Error: Cannot find module './local-single-user-platform.cjs'
Require stack:
- app/scripts/local-single-user-runtime.cjs
- app/scripts/local-single-user-launcher.cjs
```

进一步核对发现：

- `.release/local-single-user-win-x64/app/scripts`
- 安装后的 `C:\\Users\\...\\Programs\\AiOmniOps\\app\\scripts`

都缺少：

- `local-single-user-platform.cjs`

也就是说，阶段 1 新增的共享平台 helper 已经被 runtime/launcher 依赖，但发布物打包清单没有把它带进安装包，导致：

- 安装阶段启动新版本时，launcher 在最早期 `require()` 就直接崩溃
- lifecycle 只能停留在 installer 写下的 `INSTALLING`
- 升级链如果替换到这份包，也会因为新版本拉不起来而无法成功切版本

## 3. 本次改动

修改文件：

- `scripts/build-local-single-user-release.cjs`

具体修复：

- 将 `scripts\\local-single-user-platform.cjs` 加入 `requiredRelativePaths`

这样后续生成的 release bundle / zip 安装包都会包含该 helper。

## 4. 影响面检查

### 4.1 本次影响范围

- `local-single-user` 发布物打包清单
- 安装包首启
- 升级后新版本冷启动

### 4.2 本次未改动范围

- 数据库与业务数据
- 页面协议
- 安装器 ready 判定逻辑
- 升级状态机逻辑

## 5. 验证

已执行：

- 查看本机安装失败现场日志
- 对比 `.release` 与安装目录 `app/scripts` 列表
- `node --check scripts/build-local-single-user-release.cjs`
- 重建 release bundle
- 重新检查 `.release/local-single-user-win-x64/app/scripts`
- 使用发布物内置 `node.exe` 直接载入：
  - `app/scripts/local-single-user-runtime.cjs`

结果：

- 修复前发布物缺少 `local-single-user-platform.cjs`
- 修复后发布物已包含该文件
- `require('./app/scripts/local-single-user-runtime.cjs')` smoke test 通过

## 6. 当前结论

这次是明确的发布物回归，不是随机安装环境问题。

后续新的验证重点应变成：

1. 安装包覆盖安装是否恢复正常
2. 页面内“立即升级”是否能成功切到包含修复的新版本

如果这两项通过，就说明这轮“安装失败 + 升级不成功”的主根因已经收住。

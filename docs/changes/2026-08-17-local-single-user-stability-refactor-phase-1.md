# 2026-08-17 local-single-user 稳定性交付重构第一阶段

## 1. 背景

近期 `local-single-user` 连续暴露出安装、启动、自启、升级链上的多类问题。继续按单点故障补丁式处理，收益开始下降。

本次不再只针对某一条报错收局部修复，而是正式启动稳定性交付重构的第一阶段。

配套方案文档：

- `docs/local-single-user-stability-delivery-refactor-plan.md`

## 2. 第一阶段目标

第一阶段只做两个基础收口：

1. 统一宿主环境解析
2. 落第一版生命周期状态文件

控制目标：

- 不改数据库
- 不改业务协议
- 不推翻现有安装/启动/升级主链
- 先为后续阶段提供统一底座

## 3. 本次改动

### 3.1 新增统一平台 helper

新增文件：

- `scripts/local-single-user-platform.cjs`

统一收口：

- `resolvePowerShellExecutable`
- `resolveCmdExecutable`
- `resolveTaskkillExecutable`

这样后续 Node 主链脚本不再各自手写系统路径拼接。

### 3.2 runtime 层新增 lifecycle 状态能力

修改文件：

- `scripts/local-single-user-runtime.cjs`

新增：

- `getLifecycleStatePath`
- `readLifecycleState`
- `writeLifecycleState`

统一状态文件位置：

- `LOCAL_APP_DATA_ROOT\\runtime\\local-single-user-lifecycle.json`

### 3.3 launcher 开始写统一生命周期状态

修改文件：

- `scripts/local-single-user-launcher.cjs`

当前已落：

- 启动开始时写 `STARTING`
- 复用现有运行时时写 `READY`
- 正常拉起完成后写 `READY`
- 启动失败时写 `FAILED`
- 全局 `main().catch` 也会把最终失败写回 lifecycle 文件

### 3.4 主链脚本开始切到共享环境解析

已切换文件：

- `scripts/local-single-user-runtime.cjs`
- `scripts/local-single-user-autostart.cjs`
- `scripts/local-single-user-launcher.cjs`
- `scripts/package-local-single-user-release.cjs`

这一步的价值是：

- 后续再遇到 PowerShell / cmd / taskkill 相关环境问题，不再需要在多个脚本里重复修同一类问题

## 4. 影响面检查

### 4.1 本次影响范围

- Windows 本地运行时入口
- launcher 生命周期记录
- 本地发布打包脚本
- autostart Node 辅助脚本

### 4.2 本次没有改动的范围

- 数据库存储
- 品牌资料恢复逻辑
- 业务页面与 API 协议
- updater 主状态机

## 5. 验证要求

第一阶段至少要求通过：

- Node 脚本语法检查
- 本地构建脚本检查
- lifecycle 状态文件写入链路检查

后续阶段会再补安装/自启/升级真实链路验证矩阵。

## 6. 后续阶段

下一步进入第二阶段：

- 安装 / 自启主链收口
- 安装阶段开始直接消费统一 lifecycle 状态
- 进一步减少 fallback 分叉

这样可以在不拉长周期的前提下，先把“最容易反复出问题”的交付主链收稳。

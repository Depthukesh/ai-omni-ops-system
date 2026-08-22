# 2026-08-17 local-single-user 稳定性交付重构第二阶段（安装生命周期收口）

## 1. 背景

第一阶段已经完成：

- 宿主环境解析开始收口
- launcher 开始写统一 lifecycle 状态

但安装链仍然主要依赖：

- `runtime metadata`
- API / Web 健康检查
- 超时后的字符串报错

这意味着安装失败时，仍然容易只看到“未 ready”，却不知道 launcher 当时究竟已经：

- 进入 `STARTING`
- 进入 `READY`
- 还是已经明确 `FAILED`

因此，第二阶段优先把安装期 ready 判定收口到统一 lifecycle 状态。

## 2. 第二阶段目标

本次只做安装期主收益项：

1. 安装脚本直接消费 `local-single-user-lifecycle.json`
2. 安装脚本在首启前先写 `INSTALLING`
3. 安装失败时把 lifecycle 上下文直接带进错误信息

这一步仍然保持小步推进：

- 不改数据库
- 不改业务协议
- 不重写 launcher
- 不扩大到升级链

## 3. 本次改动

修改文件：

- `scripts/build-local-single-user-release.cjs`

### 3.1 安装脚本新增 lifecycle 读写能力

生成的 `install-local-single-user.ps1` 新增：

- `Read-LifecycleState`
- `Write-InstallLifecycleState`

安装器在启动本地工作台前，会先写：

- `phase = INSTALLING`
- `source = installer`

文件位置：

- `LOCAL_APP_DATA_ROOT\\runtime\\local-single-user-lifecycle.json`

### 3.2 安装期 ready 判定开始直接消费 lifecycle

`Wait-LocalWorkspaceReady` 现在会同时读取：

- `runtime\\local-single-user-runtime.json`
- `runtime\\local-single-user-lifecycle.json`

判定行为变为：

1. 若 lifecycle 已进入 `FAILED`
   - 直接提前返回失败，不再继续盲等到超时
2. 若 lifecycle 中已给出 `browserUrl / previewUrl / apiHealthUrl`
   - 优先使用这些地址参与验活
3. 若 API + Web 验活通过
   - 直接返回 `READY`

### 3.3 安装失败上下文更完整

安装报错现在会直接带出：

- `metadataSeen`
- `lifecycleSeen`
- `lifecyclePhase`
- `lifecycleError`
- `apiStatus`
- `webStatus`
- `apiHealthUrl`
- `previewUrl`
- `metadataPath`
- `lifecyclePath`

这样以后再遇到“安装后工作台未 ready”，可以直接看出：

- lifecycle 根本没写出来
- launcher 已经明确写成 `FAILED`
- 还是 launcher 在 `STARTING`，但 API / Web 没准备好

## 4. 影响面检查

### 4.1 本次影响范围

- 安装阶段首启 ready 判定
- 安装失败的可观测性
- 安装器与 launcher 的状态协同

### 4.2 本次没有改动的范围

- 自启注册方式
- 升级回滚逻辑
- SQLite 与业务数据链路
- 页面或 API 协议

## 5. 验证

已执行：

- `node --check scripts/build-local-single-user-release.cjs`
- 重新生成本地发布物
- PowerShell Parser 解析生成后的：
  - `.release/local-single-user-win-x64/install-local-single-user.ps1`

结果：

- 生成脚本通过
- 发布物重新构建通过
- 生成后的安装脚本语法通过

## 6. 当前阶段结论

第二阶段已经把安装期最关键的一步收口出来了：

- 安装不再只是“盲等 + 日志 + 超时”
- 安装器开始直接消费统一 lifecycle 状态

这为下一步继续推进：

- 自启恢复链路收口
- 安装 / 自启 / 启动统一状态口径

打下了更稳的基础。

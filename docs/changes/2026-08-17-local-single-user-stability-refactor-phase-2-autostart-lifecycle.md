# 2026-08-17 local-single-user 稳定性交付重构第二阶段（自启生命周期收口）

## 1. 背景

第二阶段前一刀已经让安装器开始直接消费统一 lifecycle 状态，但自启恢复链仍然主要靠：

- 固定健康检查地址
- helper 自己的本地日志
- 超时后重试一次

这会带来两个问题：

1. 自启 helper 与 launcher 仍然不在同一状态口径里
2. 一旦用户启用了自定义本地根目录，自启 helper 仍可能把日志和状态误写回默认 `%APPDATA%\\AiOmniOps`

因此，第二阶段继续推进自启恢复链的状态收口。

## 2. 本次目标

本次只处理自启链的两个关键点：

1. 自启 helper 先解析真实 `localAppRoot`
2. 自启 helper 开始写入并消费统一 lifecycle 状态

## 3. 本次改动

修改文件：

- `scripts/local-single-user-autostart.ps1`

### 3.1 自启 helper 改为先解析真实本地根目录

本次新增 `Resolve-EffectiveLocalAppRoot`，自启 helper 会优先通过：

- `installRoot\\bin\\node.exe`
- `app\\scripts\\local-single-user-launch-settings.cjs resolve-root`

解析当前真实 `localAppRoot`。

这样后续：

- `logs`
- `runtime metadata`
- `lifecycle`

都不再默认钉死到 `%APPDATA%\\AiOmniOps`。

### 3.2 自启 helper 新增 lifecycle 读写能力

新增：

- `Read-LifecycleState`
- `Write-AutostartLifecycleState`

统一状态文件仍写入：

- `LOCAL_APP_DATA_ROOT\\runtime\\local-single-user-lifecycle.json`

### 3.3 自启恢复链开始消费 lifecycle

`Test-WorkbenchReady` 与 `Wait-WorkbenchReady` 现在会：

- 优先读取 lifecycle 中的：
  - `apiHealthUrl`
  - `previewUrl`
  - `browserUrl`
- 如果 lifecycle 已进入 `FAILED`
  - 直接提前返回失败
- 将 `LifecyclePhase / LifecycleError` 带入重试与最终失败日志

### 3.4 自启恢复链开始写 lifecycle

自启 helper 现在会在关键点写回统一状态：

- 检测到已有健康实例：
  - `READY`
- 第一次自启前：
  - `STARTING`
- 第二次补启动前：
  - `STARTING`
- 两轮后仍失败：
  - `FAILED`

同时保留：

- `source = autostart-helper`
- `autostartAttempt`
- `installRoot`
- `localAppRoot`
- `runtimeMetadataPath`

## 4. 影响面检查

### 4.1 本次影响范围

- Windows 自启动恢复链
- 自定义本地根目录场景下的日志与状态路径
- 自启 helper 与 launcher 的状态协同

### 4.2 本次没有改动的范围

- 安装入口
- 升级入口
- 数据库与业务数据
- 前端业务页面

## 5. 验证

已执行：

- PowerShell Parser 解析：
  - `scripts/local-single-user-autostart.ps1`
- `node --check`：
  - `scripts/local-single-user-runtime.cjs`
  - `scripts/local-single-user-autostart.cjs`
  - `scripts/local-single-user-launcher.cjs`
- 重新生成本地发布物

结果：

- 自启 helper 语法通过
- 相关 Node 脚本语法通过
- 发布物重建通过

## 6. 当前阶段结论

到这一步，第二阶段已经完成了两块主收益收口：

1. 安装链开始直接消费 lifecycle
2. 自启恢复链开始直接消费并写入 lifecycle

这意味着：

- 安装、启动、自启三条主链已经开始进入同一状态口径
- 下一步可以更安心地转入升级链收口或进行一轮真实版本升级验证

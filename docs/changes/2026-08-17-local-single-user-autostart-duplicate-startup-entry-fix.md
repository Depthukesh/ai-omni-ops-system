# 2026-08-17 local-single-user 开机自启重复入口清理修复

## 1. 背景

用户继续反馈：

- 笔记本电脑重启后，页面还是一直打不开

结合现有重启日志继续排查后，这次问题已经不只是“机器慢”或“首轮启动偶发抖动”，而是启动入口本身出现了重复注册。

## 2. 现场证据

### 2.1 Startup 目录同时存在两个 AiOmniOps 自启入口

实际检查当前用户 Startup 目录时，发现同时存在：

- `AiOmniOps Local Single User.cmd`
- `AiOmniOps Local Single User.lnk`

其中：

- `.cmd` 指向当前正式安装目录：
  - `C:\Users\Administrator\AppData\Local\Programs\AiOmniOps\app\scripts\local-single-user-autostart.ps1`
- `.lnk` 仍指向历史临时安装目录：
  - `C:\Users\ADMINI~1\AppData\Local\Temp\AiOmniOps-install-fallback-test\app\scripts\local-single-user-autostart.ps1`

这说明早期安装 fallback 留下的 Startup 快捷方式，没有在后续正常自启注册成功时被回收。

### 2.2 启动日志与“双入口撞锁”现象一致

本机已有日志同时出现了两类信号：

- `Launcher lock already exists, waiting for active startup`
- `本地工作台正在启动中，请稍候再试。`
- `autostart-helper.log` 中首轮启动未恢复健康，随后二次补启动才成功

这与“开机时两个自启入口几乎同时拉起，第一路占锁，第二路撞上等待/超时，最终要等补启动或再次拉起才恢复”的行为完全一致。

## 3. 根因

`local-single-user` 之前有两条自启兜底演进路径：

1. 当前标准路径：
   - Startup 目录写入 `AiOmniOps Local Single User.cmd`
2. 历史 fallback 路径：
   - 安装器直接写入 `AiOmniOps Local Single User.lnk`

但后续自启重新安装、升级或 repair 时，没有先清理历史 `.lnk`。

结果就是：

- 旧 `.lnk` 继续保留
- 新 `.cmd` 也被写入
- 重启时 Windows 同时执行两条入口
- launcher 启动锁被双重竞争
- 用户看到“重启后页面打不开”或要过很久/第二次补启动才恢复

## 4. 本次改动

### 4.1 自启注册前统一清理旧启动入口

文件：

- `scripts/local-single-user-autostart.cjs`

本次把自启注册逻辑收紧为：

- 安装计划任务前，先清理 Startup 目录历史入口
- 写入 Startup `.cmd` 前，先清理：
  - `AiOmniOps Local Single User.cmd`
  - `AiOmniOps Local Single User.lnk`
- remove/status 逻辑也同步识别并处理旧 `.lnk`

这样后续无论是：

- 正常安装
- 升级后重装自启
- repair
- fallback

都不会再留下双入口并存。

### 4.2 安装器 fallback 不再继续写 `.lnk`

文件：

- `scripts/build-local-single-user-release.cjs`

安装器中的 `Install-StartupFolderAutostartFallback` 现在改为：

- 先删旧 `.cmd`
- 再删旧 `.lnk`
- 最终只写标准的 `AiOmniOps Local Single User.cmd`

不再继续生成历史 `.lnk` 变体，避免后续再次形成“双入口历史包袱”。

## 5. 影响面检查

### 5.1 受影响范围

- `local-single-user` 的 Windows 自启动注册
- 安装器 fallback 自启路径
- repair / remove / status 自启辅助命令

### 5.2 为避免副作用做的保护

- 没改 launcher 主启动逻辑
- 没改端口、数据库、升级状态或品牌资料链路
- 只收口自启入口的“去重和统一”
- 仍保持：
  - 计划任务优先
  - 权限受限时可 fallback 到 Startup 目录

## 6. 验证

已执行：

- `node --check scripts/local-single-user-autostart.cjs`
- `node --check scripts/build-local-single-user-release.cjs`
- 现场核对 Startup 目录与现有日志，确认根因链闭合

待用户现场继续验证：

1. 安装或升级到包含本修复的新版本
2. 重启笔记本电脑
3. 检查 Startup 目录是否只剩一个 `AiOmniOps Local Single User.cmd`
4. 验证 `http://127.0.0.1:3001` 是否能在开机后稳定恢复

## 7. 结论

这次问题的关键，不是单纯把启动等待时间再放长，而是把“历史 `.lnk` + 当前 `.cmd` 同时存在”的重复自启入口彻底清掉。

修复后，开机自启会重新回到单入口模型，避免再因为双重拉起而把 launcher 锁等待放大成“重启后页面打不开”。

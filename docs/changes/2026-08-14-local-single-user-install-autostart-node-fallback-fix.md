# 2026-08-14 local-single-user 安装阶段 autostart Node 包装层兜底修复

## 1. 背景

`hotfix-52` 安装时，现场在“Configuring autostart for current user...”这一步直接失败。

截图中的关键信号是：

- `install-autostart.cmd : node:internal/modules/cjs/loader:1386`
- 安装目录复制已经完成
- 整个安装却因为自启动配置阶段异常被判成失败

这说明问题不在主发布物复制，而是在安装脚本调用 `install-autostart.cmd` 时，Node 包装层报错后把整包安装链一起拖死。

## 2. 根因

### 2.1 安装脚本直接用 PowerShell `&` 调 native command

`install-local-single-user.ps1` 之前直接执行：

```powershell
& $autostartInstaller
```

在 Windows PowerShell 5 下，只要 native command 往 `stderr` 写内容，就会生成 `NativeCommandError`。
当前安装脚本又设置了：

```powershell
$ErrorActionPreference = "Stop"
```

于是自启动步骤里只要出现 Node 层报错或异常输出，整个安装就会立刻终止。

### 2.2 自启动步骤缺少安装器侧兜底

即使 `install-autostart.cmd` 真的失败，安装器此前也没有再降级到 Startup 文件夹快捷方式，而是直接抛错退出。

## 3. 本次改动

文件：`scripts/build-local-single-user-release.cjs`

### 3.1 安装器改为按退出码判断 autostart 结果

- 不再直接用 PowerShell `&` 执行 `install-autostart.cmd`
- 改为通过 `Start-Process ... -Wait -PassThru` 启动
- 用 `ExitCode` 判断是否成功，避免把对方 `stderr` 直接升级成安装失败

### 3.2 安装阶段新增 Startup 快捷方式兜底

当 `install-autostart.cmd` 退出非 0 或启动异常时：

- 安装器不再直接失败
- 自动在当前用户 Startup 目录写入 `AiOmniOps Local Single User.lnk`
- 该快捷方式直接调用：
  - `app/scripts/local-single-user-autostart.ps1`
- 从而继续满足“安装即默认配置开机自启”的交付基线

### 3.3 autostart 包装命令不再静默回退到 PATH 里的 `node`

`install-autostart.cmd` / `remove-autostart.cmd` / `status-autostart.cmd` 现在要求随包 `bin/node.exe` 必须存在：

- 若缺失，直接给出明确错误
- 不再偷偷回退到系统 PATH 里的 `node`

这样可以避免现场机器 PATH 上碰到旧 Node 或非预期 Node 版本，把真实问题掩盖成模糊的 loader 报错。

## 4. 影响面检查

### 4.1 影响范围

- `local-single-user` 安装脚本
- 安装阶段自启动注册
- `install-autostart.cmd` / `remove-autostart.cmd` / `status-autostart.cmd`

### 4.2 为避免副作用做的保护

- 没改 launcher 主启动链
- 没改 updater 升级链
- 没改资料目录、数据库或认证逻辑
- 计划任务正常可用时，仍优先走原有自启动注册逻辑
- 只有 autostart 包装层失败时，才由安装器自动改走 Startup 快捷方式兜底

## 5. 验证

- 本地执行 `cmd /d /c ".release\\local-single-user-win-x64\\install-autostart.cmd"`，确认当前发布物下自启动命令可执行
- 后续需重新打包新安装包，并验证：
  - 安装阶段即使自启动包装层报错，也不会把整包安装判死
  - Startup 快捷方式兜底可正常创建

## 6. 后续建议

- 基于这次修复重新打包并上传新的安装包
- 让出问题的机器直接安装新包，优先验证“安装不再卡死在 autostart”这一层
- 若现场仍出现 Node loader 报错，再继续拿安装日志确认是 bundled `node.exe` 缺失、被拦截，还是目标机额外环境问题

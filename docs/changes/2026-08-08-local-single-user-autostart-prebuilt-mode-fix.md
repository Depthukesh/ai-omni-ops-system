# 2026-08-08 local-single-user 重启后页面打不开修复

## 背景

用户反馈：

- 机器重启后页面打不开

现场排查发现：

- `3001 / 3011` 在重启后没有恢复监听
- `%APPDATA%\AiOmniOps\logs` 没有新的启动日志
- 通过开机自启同路径手动执行安装目录内的：
  - `app/scripts/local-single-user-autostart.ps1`
- 立即报错：
  - `Cannot find module 'next/dist/bin/next'`

## 根因

当前安装目录里的开机自启 helper 没有和手动双击：

- `start-local-single-user.cmd`

保持同一条启动口径。

手动启动入口会显式设置：

- `LOCAL_SINGLE_USER_PREBUILT_ONLY=true`

但开机自启 helper 直接调用 launcher 时没有带上这个环境变量，导致 launcher 在安装态重启路径里误命中 `next/dist/bin/next` 依赖。

由于正式安装包是 prebuilt-only 交付，不应再依赖该模块，因此开机自启会直接失败，最终表现为：

- 重启后页面打不开

## 本次修复

更新文件：

- `scripts/local-single-user-autostart.ps1`
- `scripts/repair-installed-local-single-user-autostart.ps1`

修复策略：

1. 开机自启 helper 显式设置：
   - `LOCAL_SINGLE_USER_PREBUILT_ONLY=true`
2. 开机自启 helper 必须走和用户手动启动一致的入口口径
3. 当前机器同时对安装目录内的：
   - `C:\Users\Administrator\AppData\Local\Programs\AiOmniOps\app\scripts\local-single-user-autostart.ps1`
   做了同口径修复，确保当前机器无需重新发包即可恢复
4. 为“另一台已经安装但还没拿到新包的机器”补了一份热修脚本：
   - `scripts/repair-installed-local-single-user-autostart.ps1`
   - 可直接把仓库内修好的 helper 覆盖到目标安装目录，并等待本地工作台恢复
5. 两份会被 Windows PowerShell 5 直接执行的脚本：
   - `scripts/local-single-user-autostart.ps1`
   - `scripts/repair-installed-local-single-user-autostart.ps1`
   统一改为 `UTF-8 BOM` 落盘，并把 repair 脚本的提示文案收口为 ASCII，避免另一台机器执行热修脚本时因为编码口径不同再次触发 parser error
6. repair 脚本不再只修 helper 文件本身；现在会额外执行安装目录内的：
   - `install-autostart.cmd`
   并输出：
   - `status-autostart.cmd`
   这样可同时覆盖“helper 已修好，但旧开机自启注册仍失效或仍指向旧入口”的场景

## 验证

本次已完成：

- 直接执行安装目录内自启 helper
- 直接执行 `scripts/repair-installed-local-single-user-autostart.ps1`
- 验证 repair 脚本会重新注册开机自启，并输出当前 autostart status
- 验证：
  - `http://127.0.0.1:3011/api/health` 返回 `200`
  - `http://127.0.0.1:3001/brand-growth` 返回 `200`
- 验证 `3001 / 3011` 已恢复监听
- 验证监听进程来自：
  - `C:\Users\Administrator\AppData\Local\Programs\AiOmniOps\bin\node.exe`
- 验证当前环境在计划任务安装被系统拒绝时，会回落为：
  - `C:\Users\Administrator\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\AiOmniOps Local Single User.cmd`

本次未做：

- 未执行真实 Windows 重启后的二次验证

## 结果

这次问题不是前端页面本身，而是开机自启路径丢失了 prebuilt-only 运行模式，导致 launcher 在安装态重启时走到了不该再命中的 `next` 依赖。

修复后，当前机器已经恢复可访问；后续正式代码也补上了同样的启动口径，避免再次出现“手动能起、重启打不开”的分叉。

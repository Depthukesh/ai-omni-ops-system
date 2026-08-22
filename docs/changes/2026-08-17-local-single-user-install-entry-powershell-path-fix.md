# 2026-08-17 local-single-user 安装入口 PowerShell 路径修复

## 1. 背景

两个用户安装 `local-single-user` 时出现了两类不同报错：

1. 安装入口第一跳直接提示：
   - `'powershell' 不是内部或外部命令，也不是可运行的程序或批处理文件`
2. 安装器已经进入首启阶段，但最终提示：
   - `Local workspace did not become ready after install`

这两类问题不在同一层。第一类发生在 `install-local-single-user.cmd` 入口层；第二类发生在安装 PowerShell 脚本已经启动之后的首启验活阶段。

## 2. 已确认根因

### 2.1 第一类入口报错

受控复现确认：

- 当前发布物里的 `install-local-single-user.cmd` 直接执行裸命令：
  - `powershell -NoProfile -ExecutionPolicy Bypass ...`
- 当目标机器的 PATH 中没有 `powershell` 命令别名时，安装入口会直接失败
- 受控复现得到与用户现场一致的错误：
  - `'powershell' is not recognized as an internal or external command`
  - 退出码 `9009`

因此，第一类问题的根因已经确认：

- 安装入口对 `powershell` 命令名存在不必要的 PATH 依赖

### 2.2 第二类 ready 超时

目前还不能把它和第一类混成同一根因。

它已经进入：

- `install-local-single-user.ps1`
- `Starting local workspace...`
- `Waiting for local workspace to become ready...`

说明安装入口本身已经跨过去了。第二类更可能属于：

- launcher / API / Web 首启确实没在时限内 ready
- 或安装器验活链拿到的 metadata / 健康状态不完整，最终误判超时

## 3. 本次改动

文件：

- `scripts/build-local-single-user-release.cjs`

### 3.1 安装入口不再依赖 PATH 里的 `powershell`

`install-local-single-user.cmd` 现在改为：

- 优先使用：
  - `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe`
- 若该路径不存在，再尝试：
  - `%ProgramFiles%\PowerShell\7\pwsh.exe`
- 若两者都不存在，明确记录缺失并返回 `9009`

这样即使用户机器 PATH 被精简或命令别名不可用，安装入口也不会再因为找不到 `powershell` 而第一跳失败。

### 3.2 安装期 ready 超时补充上下文

`install-local-single-user.ps1` 里，`Wait-LocalWorkspaceReady` 现在在超时时会保留最后一次验活上下文，并把这些信息带进最终报错：

- `localAppRoot`
- `metadataSeen`
- `apiStatus`
- `webStatus`
- `apiHealthUrl`
- `previewUrl`
- `metadataPath`

这样后续再遇到“安装后工作台未 ready”，不用只看到一句笼统超时，而能直接判断是：

- metadata 根本没出现
- API 没起来
- API 正常但 Web 没通过
- 还是 URL 本身不对

## 4. 影响面检查

### 4.1 受影响范围

- `local-single-user` 安装入口
- 安装阶段 PowerShell 启动方式
- 安装阶段首启 ready 超时报错信息

### 4.2 为避免副作用做的保护

- 没改 launcher 主启动逻辑
- 没改 autostart 注册主逻辑
- 没改 updater 升级链
- 没改数据库、品牌资料或版本状态链路
- 第一类问题只改“如何找到 PowerShell”，不改安装主流程
- 第二类问题当前只增强超时上下文，不在没有运行时证据前强改 ready 逻辑

## 5. 验证

已执行：

- `node --check scripts/build-local-single-user-release.cjs`
- 受控复现“PATH 中没有 `powershell` 命令别名”：
  - 修复前：稳定报 `'powershell' is not recognized...`
  - 修复后：安装器已能进入 `install-local-single-user.ps1`，不再卡死在入口层

说明：

- 修复后的受控复现继续停在“备份旧安装目录”步骤，是当前沙箱对 `%LOCALAPPDATA%\Programs\AiOmniOps` 的写权限限制，不是原始入口问题

## 6. 后续建议

1. 基于本次修复重新发新版安装包
2. 让第一类报错用户优先安装新包，验证入口问题是否消失
3. 若第二类用户仍提示 `Local workspace did not become ready after install`，请直接回传：
   - `install-local-single-user.log`
   - `start-local-single-user.log`
   - `launcher.log`

因为新版安装器已经把超时上下文补进错误信息，下一轮可以更快把第二类问题直接收口到具体启动阶段。

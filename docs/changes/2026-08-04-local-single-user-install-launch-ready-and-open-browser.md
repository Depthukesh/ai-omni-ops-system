# 2026-08-04 local-single-user 安装链补首启验活与明确打开页面

## 为什么改

- 用户在安装 `local-single-user` 新包时，安装窗口已经显示完成，但页面并没有自动打开。
- 旧安装链只做了“复制完成后后台启动 `start-local-single-user.cmd`”，然后安装脚本立即结束：
  - 如果本地工作台还在启动中，用户看不到明确进度
  - 如果浏览器没有被成功拉起，用户会误以为安装失败
  - 如果首启本身失败，也不会在安装阶段被直接暴露出来

## 本次范围

- `scripts/build-local-single-user-release.cjs`
- `docs/engineering-standards.md`
- `docs/README.md`

## 这次改了什么

### 1. 安装脚本会等待本地工作台真正就绪

- `install-local-single-user.ps1` 现在在复制完成后，不再只后台启动并立即退出
- 会先解析当前有效的本地资料目录
- 再等待 `runtime/local-single-user-runtime.json` 出现，并继续校验：
  - 本地 API 健康检查返回 `200`
  - 本地 Web 入口返回 `200 / 307 / 308`

### 2. 首启阶段由安装脚本自己明确打开页面

- 安装链现在会以 `LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER=false` 启动 launcher
- 避免 launcher 和安装脚本同时抢着打开浏览器
- 等待本地工作台通过验活后，再由安装脚本明确 `Start-Process` 打开页面

### 2.1 修正安装阶段的首启触发方式

- 首轮实现中曾通过 `cmd /c set LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER=false && call start-local-single-user.cmd` 间接触发 launcher
- 用户现场验证发现安装阶段卡在 “Waiting for local workspace to become ready...”，且连 `start-local-single-user.log` 都没有真正落下
- 现已改为由安装脚本直接 `Start-Process start-local-single-user.cmd`，同时只在当前安装进程里临时注入 `LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER=false`
- 这样既能保留“安装脚本统一打开页面”的职责，又不会因为额外包一层 `cmd` 导致首启入口没有真正执行

### 2.2 去掉 `cmd` 对资料目录的二次解析

- 继续排查后发现，`start-local-single-user.cmd` 里仍会调用 `local-single-user-launch-settings.cjs resolve-root`，再用 `set /p` 回读路径
- 在中文用户名 / 中文路径机器上，这一步容易把路径读坏，结果连最基础的 `start-local-single-user.log` 都落不下来
- 现已调整为：
  - 批处理入口不再负责解析资料目录
  - 只把最基础的启动日志先落到 `%APPDATA%\\AiOmniOps\\logs`
  - 实际资料目录解析统一下沉到 Node 侧 `local-single-user-runtime.cjs`
- 这样启动入口不再依赖 `cmd` 自己处理中文路径，避免首启刚进门就因为路径编码问题失效

### 3. 首启失败会在安装阶段直接暴露

- 如果受控时限内没有等到本地工作台真正就绪
- 安装脚本会直接报错并指向：
  - `start-local-single-user.log`
  - `launcher.log`
- 不再给用户留下“安装成功了，但页面没开，也不知道是浏览器没弹还是服务没起来”的模糊状态

## 影响范围与防副作用说明

- 这次没有改数据库结构、注册逻辑、版本页 UI 或升级协议
- 只收紧安装后的首启交付体验：
  - 安装完成 = 本地工作台真的可访问
  - 页面打开动作由安装脚本统一负责
  - 首启失败在安装窗口里直接可见

## 验证

- 重新生成 `local-single-user` 发布物
- 静态核对生成后的 `install-local-single-user.ps1`
- 代码级确认安装脚本已包含：
  - 有效资料目录解析
  - API / Web 验活等待
  - 安装阶段主动打开页面

## 下一步

- 基于本次修复重新打包并上传新的 OSS 安装包
- 在用户机器上重点验证：
  - 双击 `install-local-single-user.cmd` 后，页面是否会自动打开
  - 若首启失败，安装窗口是否能直接暴露原因

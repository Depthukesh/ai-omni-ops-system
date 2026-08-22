# 2026-08-16 local-single-user 开机自启验活与二次补启动修复

## 1. 背景

用户反馈另一台笔记本在系统重启后，页面再次出现打不开的情况。

这说明当前 `local-single-user` 的开机自启链虽然会触发启动入口，但对“本地工作台是否真的恢复健康”缺少闭环确认。只要重启现场出现一次瞬时抖动、启动过早或首轮启动失败，用户就仍然会看到：

- 重启后页面打不开
- 手动再双击一次 `start-local-single-user.cmd` 后才恢复

## 2. 根因

当前开机自启 helper：

- 已经继承了 `LOCAL_SINGLE_USER_PREBUILT_ONLY=true`
- 也会走和手动双击一致的 `start-local-single-user.cmd`

但它本质上仍然只是“点火”：

- 调一次 `Start-Process`
- 然后立即结束

它并不会继续确认：

- 本地 API 是否真的恢复健康
- 本地 Web 是否真的恢复可访问
- 如果首轮自启没有拉起来，是否应该再自动补一次启动

因此，一旦重启现场首轮自启碰到短时失败，用户侧仍然会直接落到“页面打不开”。

## 3. 本次改动

文件：

- `scripts/local-single-user-autostart.ps1`

### 3.1 自启前先看当前实例是否已经健康

开机自启 helper 现在会先检查：

- `http://127.0.0.1:3011/api/health`
- `http://127.0.0.1:3001/brand-growth`

如果当前实例已经健康，则直接退出，不重复拉起。

### 3.2 首轮自启后主动等待验活

首次执行：

- `start-local-single-user.cmd`

之后，不再立刻结束，而是受控等待：

- API 恢复健康
- Web 恢复可访问

默认等待 90 秒。

### 3.3 首轮未验活时自动补一次启动

如果首轮启动后仍未通过验活：

- helper 会自动再补一次隐藏启动
- 再继续等待 60 秒

这样可以覆盖“重启现场首轮启动没拉起来，但第二次即可恢复”的机器差异场景。

### 3.4 自启 helper 增加独立日志

新增日志：

- `%APPDATA%\\AiOmniOps\\logs\\autostart-helper.log`

用于记录：

- 当前是否检测到实例已健康
- 何时触发首轮启动
- 是否进入二次补启动
- 最终是否验活成功

## 4. 影响面检查

### 4.1 受影响范围

- `local-single-user` 开机自启路径
- 用户重启后的本地工作台恢复链

### 4.2 为避免副作用做的保护

- 没有改变手动双击启动入口
- 没有改变安装包结构
- 没有改变升级链、SQLite、品牌数据或运行端口
- 仍然保持开机自启时不自动弹浏览器
- 补启动次数是受控的一次，不会进入无限重试

## 5. 验证

已执行：

- `npm run build:server`
- `npm run build:web`
- `node --check scripts/local-single-user-autostart.cjs`

需用户现场继续验证：

1. 安装新版后重启笔记本
2. 登录系统后等待 1-2 分钟
3. 打开 `http://127.0.0.1:3001`
4. 如仍异常，优先查看：
   - `%APPDATA%\\AiOmniOps\\logs\\autostart-helper.log`
   - `%APPDATA%\\AiOmniOps\\logs\\start-local-single-user.log`
   - `%APPDATA%\\AiOmniOps\\logs\\launcher.log`

## 6. 结论

这次不是简单再改 launcher 主链，而是把“开机自启只点火、不验活”的缺口补上。

修复后，重启场景会从：

- 自启触发一次 -> 用户自己发现打不开 -> 再手动双击恢复

收口为：

- 自启触发 -> 主动验活 -> 首轮没起来则自动补一次启动

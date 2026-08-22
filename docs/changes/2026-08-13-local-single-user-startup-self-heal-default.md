# 2026-08-13 local-single-user 重启后默认自动自愈

## 1. 背景

用户反馈本地单机版在系统重启后偶发“页面打不开”。

这类问题的现象通常不是用户不会启动，而是：

- 开机自启已经拉起过一次，但本地 API / Web 没有真正恢复健康
- 或 runtime metadata、旧进程、runtime web bundle 等残留把本次启动卡在半途中
- 用户只能再次手动双击启动，甚至需要人工清锁、杀进程、看日志

本轮用户选择先做“方案 2：默认自动自愈”，目标是不再把排障动作留给用户。

## 2. 本次改动

### 2.1 launcher 启动失败自动进入自愈重试

- 文件：`scripts/local-single-user-launcher.cjs`
- 新增默认自愈重试次数：
  - 默认 `2` 轮
  - 可通过 `LOCAL_SINGLE_USER_SELF_HEAL_MAX_ATTEMPTS` 调整

当前行为改为：

1. 首次启动按原流程拉起 API / worker / Web
2. 只要任一关键阶段失败：
   - API 未就绪
   - worker 提前退出
   - Web 未就绪
3. launcher 不再直接退出，而是先进入一次受控自愈：
   - 停掉 runtime metadata 中残留进程
   - 扫描并清掉仍命中安装目录的残留进程
   - 删除旧 `runtime/local-single-user-runtime.json`
   - 删除 `runtime/web-standalone-current`
   - 清理历史升级残留与旧 `%LOCALAPPDATA%\\AiOmniOps` 痕迹
4. 然后自动再尝试启动一次

### 2.2 启动阶段子进程提前退出不再立刻把 launcher 打死

之前启动期如果某个子进程提前退出，launcher 的 exit handler 会直接 `process.exit(1)`，导致自动修复机会被打断。

现在改为：

- 启动阶段：
  - 只记录退出日志
  - 交由启动健康检查统一判定失败并触发自愈
- 启动成功后：
  - 仍保持原有逻辑
  - 任一核心子进程异常退出时，整套 runtime 仍会受控退出

## 3. 影响面检查

### 3.1 受影响范围

- `local-single-user` launcher
- 开机自启启动链
- 用户手动双击 `start-local-single-user.cmd` 的启动链

### 3.2 为避免副作用做的保护

- 没有取消现有健康检查
- 没有放开“失败后硬撑”的行为
- 自愈重试仍是受控、有限次数，不会无限循环
- 启动成功后的异常退出语义保持不变

## 4. 验证

- `node --check scripts/local-single-user-launcher.cjs`
- 代码静态核对：
  - 启动失败 -> 自愈清理 -> 第二轮启动
  - 启动阶段 child exit 不再直接短路退出

## 5. 后续建议

- 下一步可以继续把“启动成功后运行期子进程异常退出”也升级成同一条自动自愈链，而不是只在启动期兜底
- 如后续用户侧仍有极少数打不开案例，再补一个对外可见的“恢复模式”入口作为第三层兜底

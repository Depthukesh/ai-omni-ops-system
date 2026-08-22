# 2026-08-06 local-single-user 启动锁残留自动恢复

## 为什么改

- 现场 `launcher.log` 显示升级或重启过程中会出现：
  - `Launcher lock already exists, waiting for active startup`
  - 20 秒后直接报 `本地工作台正在启动中，请稍候再试。`
- 这说明 `local-single-user-launcher.lock` 在上一轮启动异常退出后可能残留，新的启动会话会把它当成仍在启动中的有效锁，导致升级链的重启阶段白等超时。

## 这次改了什么

- `scripts/local-single-user-launcher.cjs`
- 启动入口在抢锁时，若发现锁文件已存在，会先读取锁文件里的 `pid`
- 只要持锁进程已经不存活，launcher 就会自动清理残留锁并重新抢锁
- 如果等待 20 秒后仍没有复用到现有实例，也会再尝试一次抢锁，避免“上一轮刚好在等待窗口内退出”时还直接报错

## 影响范围

- 只影响 `local-single-user` 启动入口的锁恢复逻辑
- 不改启动成功后的实例复用逻辑，不改 API / Web 端口，不改升级协议

## 验证

- `node --check scripts/local-single-user-launcher.cjs`
- 静态核对：残留锁会被自动清理，活跃启动中的真实锁不会被误删

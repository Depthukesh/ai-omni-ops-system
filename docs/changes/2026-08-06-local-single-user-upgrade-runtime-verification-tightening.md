# 2026-08-06 本地单机版升级验活收紧与 Trace 补充

## 背景

- 应用内升级从 `hotfix-17` 升到 `hotfix-18` 时，前端会提示“升级后启动验证失败，本地 API / Web 未在 180 秒内恢复可用”。
- 现场回读显示升级失败后能够自动回滚到 `hotfix-17`，说明“失败回滚”已经生效，但“升级成功”的判定仍不够稳，缺少足够的运行时 trace。

## 本次调整

### 1. 升级验活不再只依赖 `runtime/local-single-user-runtime.json`

- 旧逻辑重点看：
  - `local-single-user-runtime.json` 是否在升级后刷新
  - 该文件中的 `apiHealthUrl` / `previewUrl` 是否返回成功
- 新逻辑改为同时校验：
  - 安装目录 `meta/release-manifest.json` 中的 `releaseTag` 是否已经切到目标版本
  - 本地 API 是否返回 `200`
  - 本地 Web 是否返回 `200/307/308`

这样即使运行时元数据没有及时刷新，也不会把“新版本已经实际启动成功”的场景误判成失败。

### 2. 升级器新增 trace 日志

- 升级运行目录新增：
  - `local-single-user-updater.trace.log`
- trace 记录包括：
  - 升级器启动
  - 压缩包校验
  - installer 执行
  - restart command 触发
  - 周期性 runtime ready probe
  - 成功 / 失败 / 回滚结论

这样后续再出现“应用内升级后未切到新版本”的问题时，不需要只依赖前端提示或零散截图。

### 3. 成功/失败状态附带更清晰的运行时信息

- 升级成功和回滚成功状态都会优先回填：
  - `browserUrl`
  - `previewUrl`
  - `apiHealthUrl`
- 如果运行时元数据对象为空，也会退回到升级器实际探测时使用的 URL，避免状态文件里缺少关键信息。

### 4. 回滚验活改按恢复版本判断

- 升级失败后自动回滚时，验活阶段不再继续拿“目标新版本 releaseTag”做成功条件
- 现在会优先读取 backup 自带的 `meta/release-manifest.json`，按恢复出来的上一版本 `releaseTag` 做验活
- 这样“上一版本已经恢复并重新可用”的场景不会再被二次误判成回滚失败

### 5. BOM 归一化改成收口为单个 UTF-8 BOM

- 发布构建脚本与后端动态生成 updater 运行目录时，都会先剥掉脚本前导的所有 BOM，再重新写成单个 UTF-8 BOM
- 避免仓库脚本一旦混入重复 BOM，继续被打进发布包或 apply-runs 目录里，给 PowerShell 5 留下隐蔽解析风险

## 影响范围

- 文件：
  - `scripts/local-single-user-updater.ps1`
- 本次只收紧本地单机版升级器的验活与日志链路，不改安装包格式、不改版本页协议、不改数据库结构。

## 验证

- 静态核对：
  - 升级成功判定改为“目标版本 releaseTag + API + Web”三重条件
  - 回滚成功判定改为“恢复版本 releaseTag + API + Web”三重条件
  - 升级失败信息补充“当前安装版本 / 目标版本”
  - 升级运行目录会额外生成 `local-single-user-updater.trace.log`

## 后续

- 基于新增的 trace 日志，继续复测 `hotfix-17 -> hotfix-18` 的应用内升级，定位为何首启验活阶段仍会触发回滚。

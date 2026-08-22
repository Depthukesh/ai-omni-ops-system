# 2026-08-13 local-single-user 版本入口 fallback 修复

## 1. 背景

用户反馈另一台电脑在安装修复包后，仍出现：

- `账号信息暂时未能从接口刷新`
- `版本与升级` 入口不显示

这说明现有修复虽然开始给认证链补 fallback，但个人中心入口可见性和资料返回链路仍不够稳。

## 2. 根因

### 2.1 版本入口隐藏过于激进

前端 `shouldShowVersionWorkspace()` 之前只允许：

- `supported = true`
- `current.canApplyUpdate = true`

只要升级状态接口暂时拿不到，`版本与升级` tab 就整个消失，用户失去自救入口。

### 2.2 认证 fallback 只停在鉴权层

`/auth/me` 即使已 fallback 到默认用户，后续：

- `getProfile()`
- `getBrands()`

仍可能继续打数据库，导致返回层再次失败，前端仍显示“本地登录态”。

## 3. 本次改动

### 3.1 local-single-user 固定保留版本入口

- 文件：`apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`
- 在 `local-single-user` 运行态下，`版本与升级` 入口固定显示

### 3.2 `/auth/me` 与 `/auth/brands` 的 fallback 贯穿到返回层

- 文件：`apps/server/src/modules/auth/auth.service.ts`
- 当认证上下文来源是 `fallback` 且运行态为 `local-single-user` 时：
  - `getProfile()` 不再继续查数据库
  - `getBrands()` / `getMe()` 改为回退使用本地 mock 品牌列表

## 4. 影响面检查

### 4.1 受影响范围

- local-single-user 个人中心
- 版本与升级入口可见性
- 账号接口短时失败时的前端退化体验

### 4.2 为避免副作用做的保护

- 仅对 `local-single-user` 生效
- 标准部署模式不改变版本入口判断
- 真正的未登录 / token 无效语义不放宽

## 5. 验证

- 后端构建：待和本轮前端改动一起重新打包验证
- 页面策略：静态检查完成，确认 local-single-user 下版本入口不再依赖升级状态接口是否成功

## 6. 后续建议

- 若安装新包后仍出现“本地登录态”，需要拿那台机器的最新 `server.err.log`
- 但即使账号接口仍在抖动，用户至少应保留 `版本与升级` 入口，不再完全失去操作路径

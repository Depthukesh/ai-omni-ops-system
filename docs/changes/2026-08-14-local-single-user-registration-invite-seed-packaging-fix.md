# 2026-08-14 local-single-user 注册邀请码种子随包修复

## 1. 背景

用户在 `local-single-user` 安装态下使用当前项目种子文件中的真实邀请码注册，前端仍提示：

- `邀请码不存在、已失效或已被使用`

进一步排查发现：

- 当前源码中的 `prisma/seed-data/registration-invite-codes.txt` 确实包含用户所用的邀请码
- 注册后端会精确匹配邀请码，逻辑本身没有放宽或改写
- 但 `local-single-user` 发布包内没有携带这份注册邀请码种子文件

## 2. 根因

`apps/server/src/modules/auth/auth.service.ts` 在启动时只会从以下位置加载注册邀请码种子：

- `prisma/seed-data/registration-invite-codes.txt`
- `.runtime/registration-invite-codes.txt`

而 `scripts/build-local-single-user-release.cjs` 之前只拷贝：

- `prisma/schema.prisma`
- `prisma/schema.local.prisma`

没有把 `prisma/seed-data/registration-invite-codes.txt` 打进安装包。

这导致新安装的本地单机版即使源码仓库中存在有效邀请码，安装态运行目录里也读不到种子文件，注册接口自然会把所有邀请码判成不存在。

## 3. 本次改动

- 文件：`scripts/build-local-single-user-release.cjs`
- 将以下路径加入 `requiredRelativePaths`：
  - `prisma\\seed-data\\registration-invite-codes.txt`

## 4. 影响面检查

### 4.1 受影响范围

- `local-single-user` 安装包构建链
- 本地单机版首次注册准入

### 4.2 为避免副作用做的保护

- 只补发布物拷贝清单，不改注册协议、不改邀请码消费逻辑
- 不影响网站版 / 源码运行态的现有注册逻辑
- 不改变邀请码一次性消费的既有规则

## 5. 验证

- 静态确认：
  - 后端种子读取位置与发布物目录结构一致
  - 发布构建脚本已包含 `prisma/seed-data/registration-invite-codes.txt`
- 后续需要重新打包 `local-single-user` 并确认发布物目录内可见该文件

## 6. 后续建议

- 后续若还有安装态专属种子或初始化资产，优先在发布脚本中显式列为必拷贝项
- 不建议继续依赖“源码目录里有文件，所以安装包也一定有”的隐含假设

# 2026-05-11 注册邀请码线上 seed 补齐

## 1. 背景

- 用户使用昨天收到的 6 位注册邀请码在线上注册时，前端提示“邀请码不存在、已失效或已被使用”
- 该邀请码实际存在于 `prisma/seed-data/registration-invite-codes.txt`
- 线上自动部署流程此前只执行 `prisma:db:push`，没有执行任何邀请码 seed 步骤

## 2. 根因

- 注册接口会去数据库 `RegistrationInviteCode` 表中精确查询邀请码，并要求该记录尚未消费
- `prisma:db:push` 只会同步 schema，不会把预置邀请码写入数据库
- 项目原有 `prisma:seed` 实际绑定 `scripts/seed-demo.cjs`，除了邀请码外还会写入 demo 用户、品牌和演示数据，不适合在生产部署时默认整套执行

## 3. 本次修复

- 新增独立脚本 `scripts/seed-registration-invite-codes.cjs`
  - 仅从 `prisma/seed-data/registration-invite-codes.txt` 或 `.runtime/registration-invite-codes.txt` 读取邀请码
  - 仅对 `RegistrationInviteCode` 表执行 `upsert`
  - 不会覆盖或注入整套 demo 用户、品牌、任务和媒体数据
- 在根目录 `package.json` 新增脚本：
  - `prisma:seed:registration-invite-codes`
- 在 `.github/workflows/deploy.yml` 中，把部署阶段的 Prisma 步骤调整为：
  - `npm run prisma:generate`
  - `npm run prisma:db:push`
  - `npm run prisma:seed:registration-invite-codes`

## 4. 影响范围

- 注册链路：`/api/auth/register`
- 部署流程：`.github/workflows/deploy.yml`
- 数据表：`RegistrationInviteCode`
- 脚本：`scripts/seed-registration-invite-codes.cjs`

## 5. 验证方式

- 语法检查：`node --check scripts/seed-registration-invite-codes.cjs`
- 诊断检查：`GetDiagnostics` 检查 `package.json`、`deploy.yml`
- 部署验证：
  - 推送后观察 GitHub Actions 是否执行到 `npm run prisma:seed:registration-invite-codes`
  - 线上再用已知预置邀请码复测注册

## 6. 风险与后续

- 本次修复只保证“预置注册邀请码”会随部署补入线上数据库，不等于已具备后台邀请码管理能力
- 若线上已有部分邀请码被真实用户消费，`upsert` 不会重置消费状态，符合一次性邀请码设计
- 后续如果还要支持后台增发/冻结/回收注册邀请码，应单独补后台管理页与审计记录

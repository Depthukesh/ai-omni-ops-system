# 2026-05-11 Next.js 安全升级

## 1. 背景

- 阿里云安全中心在生产机 `/srv/ai-omni-ops-system` 报告当前运行的 `nextjs 15.0.0` 命中高危漏洞：
  - `CVE-2025-29927`
  - `CVE-2025-66478`
- 当前项目前端使用 App Router，属于 Next.js 15 受影响范围，不能继续停留在 `15.0.0`

## 2. 本次处理

- 将 `apps/web/package.json` 中的 `next` 从 `15.0.0` 升级到 `^15.5.15`
- 更新根目录 `package-lock.json`
- 同步接受 `apps/web/next-env.d.ts` 的版本联动更新

## 3. 处理原因

- `15.2.x` 虽可修掉较早一批漏洞，但不能覆盖后续追加披露的 RSC / DoS / request smuggling 相关问题
- 本次直接升级到 `15.5.15`，目标是一次清掉当前 `npm audit` 中的 Next.js 关键风险，而不是只做最低限度版本跳升

## 4. 验证结果

- `npm --workspace apps/web run build` 通过
- `npm audit --workspace apps/web --json` 结果中：
  - `critical = 0`
  - 已不再出现截图中的 Next.js 两条高危/严重漏洞
- 当前剩余 2 条 `moderate` 为 `postcss` 链路告警，不属于本次阿里云截图里的两条 Next.js 漏洞

## 5. 风险与后续

- 由于生产环境此前长期运行在受影响版本，升级部署完成后，建议按官方安全公告补做应用密钥轮换，优先轮换高敏感环境变量
- 本次仅处理 Next.js 漏洞修复，不包含其他工作区遗留改动

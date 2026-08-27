# 2026-08-27 标准运行态版本页回退更新指引

## 背景

个人中心 `版本与升级` 之前在标准运行态下主要依赖远端 `STANDARD_RUNTIME_UPDATE_MANIFEST_URL`。

问题是：

- 一旦没配远端 manifest，页面就容易退成“空壳版本页”
- 用户虽然已经拿到最新代码，但页面里看不到明确的版本记录、更新提醒和 Docker 更新命令
- 更新步骤仍然只能靠口头说明，不利于实际交付

## 本次改动

### 1. 标准运行态新增仓库回退模式

当 `APP_RUNTIME_MODE=standard` 且**未配置** `STANDARD_RUNTIME_UPDATE_MANIFEST_URL` 时：

- `system-update` 不再直接返回空结果
- 会自动退回到“仓库更新指引”模式
- 继续返回：
  - 当前分支 / commit 推导的版本标识
  - 最近 `docs/changes/*.md` 版本记录
  - Docker 更新命令
  - Skill / MCP 同步提醒

### 2. 版本页文案改为区分两种标准运行态来源

- `manifest` 模式：显示远端更新清单和“是否有新版本”提醒
- `repo` 模式：显示仓库内最近版本记录与 Docker 更新命令，并明确提示“若要自动检测新版本，请配置 manifest”

### 3. Docker 更新命令固定下沉到页面

标准运行态当前页面至少会给出：

1. `git pull origin <当前部署分支>`
2. `docker compose -f "docker/docker-compose.local-postgres.yml" up -d --build server web`
3. 如涉及 schema 或初始化链，再执行 `db-init`

### 4. 版本记录来源

标准运行态回退模式下，系统更新日志优先读取仓库内最近的 `docs/changes/*.md`，用于在页面里形成“版本记录”而不是只显示空白占位。

## 影响范围

- `apps/server/src/modules/system-update/system-update.service.ts`
- `apps/web/src/services/personal-center.ts`
- `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`
- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
- `docs/engineering-standards.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`

## 验证

- 待执行：
  - `npm run build:server`
  - `npm run build:web`
  - 手工确认标准运行态版本页在无 manifest 场景下也能展示：
    - 最近版本记录
    - Docker 更新命令
    - Skill / MCP 同步提醒

## 一句话结论

现在标准运行态的 `版本与升级` 不再是“只有远端 manifest 才有内容”的空壳页；即使没配远端清单，也能先给用户版本记录、更新提醒和可执行的 Docker 更新命令。

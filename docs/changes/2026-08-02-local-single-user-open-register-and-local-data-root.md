# 2026-08-02 local-single-user 免邀请码注册与本地资料目录设置

## 为什么改

- 这套系统已经从“服务器托管 + OSS 为主”逐步转向 `local-single-user` 本地交付，安装态新用户不应该再被邀请码门槛卡住。
- 用户希望本地单机版能够自己决定资料目录，把数据库、日志、缓存、升级包和本地运行时文件统一收口到一个明确文件夹，而不是继续分散在默认目录里。
- 这次需要把“本地安装态”和“网站版/源码运行态”继续拆清，避免把单机能力串回网站版。

## 本次范围

- `apps/server/src/modules/auth/auth.controller.ts`
- `apps/server/src/modules/auth/auth.service.ts`
- `apps/server/src/modules/local-runtime/*`
- `apps/server/src/config/app-config.service.ts`
- `apps/server/src/app.module.ts`
- `apps/web/src/services/auth.ts`
- `apps/web/src/services/personal-center.ts`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/app/home-page-client.tsx`
- `apps/web/src/app/(dashboard)/personal-center/security/page.tsx`
- `scripts/local-single-user-launch-settings.cjs`
- `scripts/build-local-single-user-release.cjs`
- `docs/engineering-standards.md`
- `docs/README.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/database-archive.md`
- `docs/generated-content-storage-standards.md`

## 这次改了什么

### 1. local-single-user 注册改为免邀请码

- 新增 `GET /auth/register-config`，由后端按运行模式返回：
  - `inviteCodeRequired`
  - `registrationMode`
  - `runtimeMode`
- `local-single-user` 安装态下，注册不再要求邀请码，用户可直接注册并进入系统。
- 网站版和源码运行态继续沿用邀请码注册逻辑，不把这次调整扩散到线上多用户环境。
- 前台首页注册区和 `/register` 页都改为按后端返回动态展示文案与字段，避免两个入口口径不一致。

### 2. 个人中心安全页新增“本地资料目录”设置

- `GET /local-runtime/settings`
- `PATCH /local-runtime/settings`
- 安装态用户现在可以在 `/personal-center/security` 查看并设置：
  - 当前运行模式
  - 当前资料目录
  - 下次启动将使用的资料目录
  - 数据库、日志、存储、缓存、升级等子目录位置
  - 当前是否需要重启才能生效
- 新目录配置保存后不会立刻打断当前会话，而是等下次重启本地工作台时切换。

### 3. 资料目录配置与迁移改为 launcher 负责

- 新增 `scripts/local-single-user-launch-settings.cjs`
- 配置文件固定写到默认资料根下的 `launcher-settings.json`，不写进程序安装目录，避免升级覆盖。
- `start-local-single-user.cmd` 在启动时会先读取这份配置，再决定 `LOCAL_APP_DATA_ROOT` / `AI_OMNI_LOCAL_ROOT`。
- 如果资料目录发生变化，launcher 会在重启切换时尝试迁移旧目录内容，再落回新目录继续启动。
- 明确禁止把资料目录直接设置到程序安装目录内，避免升级时把程序目录和资料目录混在一起。

### 4. 发布链补齐了真实预构建与压缩打包

- `build-local-single-user-release.cjs` 现在会在打 release bundle 前先真实执行：
  - `build:server`
  - `build:web`
- 这样安装包里带的 `apps/server/dist` 与 `apps/web/.next/standalone` 不会再停留在旧构建状态，避免“源码已改、发布物还是旧接口”的错位。
- `start-local-single-user.cmd` 读取资料目录配置的方式也补成了更稳的批处理实现，确保启动前能真正拿到 `launcher-settings.json` 解析出的本地资料根。
- `package-local-single-user-release.cjs` 已从 `Compress-Archive` 切到 `.NET ZipFile` 打包，避免在当前大体积发布目录和部分依赖树上继续触发压缩阶段异常。

## 影响范围与防副作用说明

- 这次没有改数据库 schema。
- 这次没有改网站版注册策略；邀请码放开只对 `local-single-user` 安装态生效。
- 这次没有改“版本与升级”的主入口，升级仍通过个人中心统一完成。
- 这次新增的资料目录设置，覆盖的是本地运行时目录：
  - `data/`
  - `db/`
  - `logs/`
  - `runtime/`
  - `storage/`
  - `cache/`
  - `backup/`
  - `updates/`
- 这次**没有**把作品、报告、媒体正式真源从 OSS 改成“纯本地目录模式”；当前正式媒体链路仍以 OSS 为真源，本地资料目录主要承接安装态运行时数据和本地副本目录。

## 验证

- `npm --workspace apps/web exec tsc --noEmit`
  - 通过
- `npm exec tsc -- -p apps/server/tsconfig.json --noEmit`
  - 通过
- 代码对照确认：
  - 注册页与首页注册入口都已按 `register-config` 动态展示邀请码字段
  - 个人中心安全页已接入本地资料目录设置卡片
  - launcher 已具备读取 `launcher-settings.json` 并切换本地资料根的逻辑
- 安装态 smoke 验证：
  - `GET /api/auth/register-config` 已返回 `inviteCodeRequired=false`
  - 未提供邀请码的 `POST /api/auth/register` 已成功创建用户与默认品牌
  - `GET /api/local-runtime/settings` 与 `PATCH /api/local-runtime/settings` 已验证通过
  - 已验证“保存资料目录 -> 重启本地工作台 -> 切到新目录”闭环：
    - 新根目录下已真实生成 `db/`
    - 新根目录下已真实生成 `logs/`
    - 新根目录下已真实生成 `runtime/local-single-user-runtime.json`
    - 启动日志已打印新的 `LOCAL_APP_DATA_ROOT`
    - 接口返回的 `currentLocalAppRoot` 已切到新目录，且 `restartRequired=false`

## 未完成与下一步

- 这次还没有做一轮真实安装包内的端到端验证：
  - 修改资料目录
  - 重启本地工作台
  - 观察迁移是否完成
  - 验证新目录是否真实承接数据库、日志、升级包与本地缓存
- 当前正式作品/报告仍以 OSS 为真源；如果后续要继续推进“完全本地化存储”，需要单独规划：
  - 媒体对象真源切换
  - 旧 `storageKey` 兼容
  - 本地备份/迁移策略
  - 升级链与回滚链影响

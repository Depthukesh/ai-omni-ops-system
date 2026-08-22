# 2026-08-22 Docker 标准运行态版本通知与更新引导页

## 背景

- 之前个人中心的 `版本与升级` 只服务 `local-single-user` 安装态。
- Docker + PostgreSQL + mixedcut 标准运行态虽然也需要让其他部署用户感知新版本，但系统里没有统一入口告诉用户：
  - 当前版本是多少
  - 最新版本是多少
  - 这次需要重建哪些容器
  - 是否还要重新导入 `skill-package.zip`
- 用户因此只能靠口头通知或手工发命令，难以形成稳定的更新闭环。

## 本次改动

### 1. 复用现有 `system-update` 模块，扩展成双模式

保留原有 `local-single-user` 自动升级链不变，同时给 `standard` 运行态新增“远端更新清单”模式：

- `local-single-user`
  - 继续读取 OSS `latest.json`
  - 继续支持下载、校验和一键升级
- `standard`
  - 当配置了 `STANDARD_RUNTIME_UPDATE_MANIFEST_URL` 时
  - `GET /system/update/status` 与 `POST /system/update/check` 会读取远端 JSON 清单
  - 返回最新版本、更新摘要、是否要重建 `server/web/mixedcut`、是否要重新导入 `Skill ZIP`、建议执行命令

### 2. 个人中心版本页改为按运行态自适应

更新：

- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`

当前行为：

- `local-single-user`
  - 继续显示检查、下载、升级按钮
- `standard + 已配置更新清单`
  - 显示“当前版本 / 最新版本”
  - 显示更新摘要
  - 显示需要重建的容器与 Skill 同步提醒
  - 显示建议命令与外部说明链接
- `standard + 未配置更新清单`
  - 不显示该入口，避免网站版 / 普通源码态误出现一个空壳升级页

### 3. Docker 配置新增更新清单入口

更新：

- `docker/docker-compose.local-postgres-mixedcut.yml`

新增环境变量：

- `STANDARD_RUNTIME_UPDATE_MANIFEST_URL`

它指向一个公网可访问的 JSON 清单，供 Docker 标准运行态读取更新说明。

### 4. 补示例清单

新增：

- `apps/web/public/update-manifests/docker-standard.latest.example.json`

这份文件只作为结构示例与联调样本，不作为正式发布真源。真正对外发布时，应把同结构 JSON 上传到公网地址，再把 `STANDARD_RUNTIME_UPDATE_MANIFEST_URL` 指向该地址。

## 远端更新清单格式

核心字段示例：

```json
{
  "latestVersion": "2026.08.22.1",
  "releaseTag": "docker-hotfix-2026-08-22-1",
  "releaseDate": "2026-08-22T12:00:00+08:00",
  "summary": "本次更新摘要",
  "changeLogUrl": "https://example.com/release-notes",
  "skillPackageUrl": "https://example.com/skill-package.zip",
  "commands": [
    "git pull",
    "docker compose ... up -d --build server web"
  ],
  "notices": [
    "如涉及 Skill ZIP，请重新导入"
  ],
  "requires": {
    "server": true,
    "web": true,
    "mixedcut": false,
    "skillPackage": true,
    "migration": false
  }
}
```

## 影响范围

- `apps/server/src/config/app-config.service.ts`
- `apps/server/src/modules/system-update/system-update.service.ts`
- `apps/web/src/services/personal-center.ts`
- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/route-helpers.ts`
- `docker/docker-compose.local-postgres-mixedcut.yml`
- `apps/web/public/update-manifests/docker-standard.latest.example.json`

## 验证

- `pnpm build:server`
- `pnpm build:web`
- 使用示例清单验证 `standard` 运行态版本页可显示：
  - 最新版本
  - 更新摘要
  - 容器重建提示
  - Skill ZIP 重新导入提示

## 后续建议

- 后续发布流程里，建议把“推代码 / 发版”与“更新远端 JSON 清单”绑定成同一动作。
- 如果后面希望进一步自动化，可以继续补：
  - 生成标准清单的脚本
  - 发布后自动把清单推到 OSS 或固定 CDN 地址

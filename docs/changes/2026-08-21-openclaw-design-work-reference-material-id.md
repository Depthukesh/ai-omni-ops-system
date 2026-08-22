# 2026-08-21 OpenClaw 设计工作台支持 referenceMaterialId

## 背景

- Docker + PostgreSQL + mixedcut 主链跑通后，下一步需要继续收口 OpenClaw 的本地素材协议。
- 现状里 `create_design_work` 只支持：
  - `referenceImageUrl`
  - `referenceImage.dataBase64`
- 这会让已归档到站内的 OpenClaw 创作素材，仍然需要人工转成 URL 或重新上传，不能直接按素材 ID 复用。

## 本次改动

- 为 `apps/server/src/modules/openclaw/openclaw.service.ts` 的 `create_design_work` 增加 `referenceMaterialId` 输入。
- 同步补齐：
  - `apps/server/src/modules/openclaw/openclaw.controller.ts`
  - OpenClaw MCP tool dispatch
  让 `referenceMaterialId` 不会在入口层被截断。
- 当用户传入 `referenceMaterialId` 时，OpenClaw 会：
  - 在现有创作素材作用域中查找对应素材
  - 取出站内可访问的 `fileUrl`
  - 继续复用原有 `referenceImageUrl` 设计生成链
- 若素材不存在或没有可用图片地址，会直接报错拦截，避免继续走空参考图链路。
- 同步更新了 OpenClaw MCP 工具 schema，方便后续在对话或安装指引里直接使用该字段。

## 影响面

- 仅扩展 OpenClaw 设计工作台的参考图入参。
- 不改数据库结构。
- 不改 mixedcut 配置同步逻辑。
- 不改现有 `referenceImageUrl` / `referenceImage` 行为。

## 验证

- 通过真实接口验证 mixedcut 配置预览/同步：
  - `GET /third-party-platforms/mixedcut-ai-config`
  - `POST /third-party-platforms/mixedcut-ai-config/sync`
- 确认宿主机已生成：
  - `docker/local-data/mixedcut/config/ai_config.json`
- 确认当前空配置原因是：
  - `ApiProviderConfig` 活跃记录存在
  - `BrandThirdPartyPlatformSecret` 对 demo 品牌仍为 `0`
- 已执行 `pnpm build:server`，后端 TypeScript 构建通过。
- 已重建 `ai-omni-server` 容器，并实测：
  - `POST /api/openclaw/mcp/works/design/generate`
  - 当传入不存在的 `referenceMaterialId` 时，返回 `400 Bad Request`
  - 错误文案为：`未找到可用的创作素材参考图：...`

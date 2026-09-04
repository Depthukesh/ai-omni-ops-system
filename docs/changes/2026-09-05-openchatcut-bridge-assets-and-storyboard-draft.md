# 2026-09-05 OpenChatCut 桥接素材清单与剪辑草案

## 变更背景

前一阶段已经把 OpenChatCut 独立 Docker 部署和双 MCP 集成口径补进了 OpenClaw 安装中心，但 OpenClaw 真正要继续调外部剪辑系统时，仍然缺一层站内桥接能力：

- 现有创作素材和视频作品分散在不同真源
- OpenClaw 还需要先把它们整理成统一素材清单
- 还需要一份可直接交给 OpenChatCut 的 storyboard / timeline 草案

本次先补最小桥接层，不直接接 OpenChatCut 外部 API，也不改现有数据库结构和主业务流程。

## 本次改动

### 1. 新增 OpenChatCut bridge service

新增：

- `apps/server/src/modules/openclaw/openclaw-openchatcut-bridge.service.ts`

当前职责：

- 汇总 `OpenClawCreativeMaterial` 与 `OpenClawVideoWork`
- 输出统一桥接素材清单
- 基于素材和视频作品生成剪辑草案
- 返回推荐素材和时间线草案

### 2. OpenClaw MCP 新增两项桥接工具

新增：

- `get_openchatcut_bridge_assets`
- `build_openchatcut_storyboard_draft`

当前口径：

- `get_openchatcut_bridge_assets`
  - 读取指定板块下可交给 OpenChatCut 的素材清单
  - 支持按 `image / video / audio / text` 过滤
- `build_openchatcut_storyboard_draft`
  - 基于当前板块素材自动生成剪辑草案
  - 也支持显式指定素材 ID 和视频作品 ID

### 3. Skill / MCP 文档同步

已同步更新：

- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`

### 4. 站点地图同步

已同步更新：

- `docs/site-map.md`
- `docs/site-map-mermaid.md`

当前明确：

- OpenClaw 安装中心除双 MCP 部署说明外，已补站内素材桥接草案能力
- OpenClaw 在对接外部剪辑系统时，可先走站内桥接工具，再继续调用 OpenChatCut MCP

## 影响范围与保护

本次改动刻意保持在最小范围内：

- 不新增页面入口
- 不改数据库 schema
- 不直接调用 OpenChatCut 外部服务
- 不改变现有创作素材、视频作品、设计工作台或发布链路

也就是说，这一刀只是把现有素材真源整理成“外部剪辑系统可消费的摘要能力”，避免把局部桥接扩散成全站耦合改造。

## 验证计划

本次至少验证：

1. `pnpm build:server`
2. MCP tool dispatch 可正常编译通过
3. 文档和站点地图已同步到当前事实

## 后续建议

下一步可继续做两类受控推进：

1. 用真实品牌素材跑一次 `get_openchatcut_bridge_assets` 和 `build_openchatcut_storyboard_draft`
2. 再按 OpenChatCut MCP 的真实工具面，把本站草案继续映射成外部剪辑工程创建、素材导入、时间线编辑和导出

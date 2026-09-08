# 2026-09-08 OpenClaw GEO 关键词挖掘路由与 generatedAt 写库修复

## 背景

另一台电脑上的 OpenClaw 通过 MCP 保存 `GEO获客 -> 关键词挖掘` 结果时失败，报错如下：

```text
column "generatedAt" is of type timestamp without time zone but expression is of type text
```

进一步排查发现，这次调用实际走的是 `create_openclaw_strategy_optimization`，而不是 GEO 板块应该使用的 `create_openclaw_geo_content`。

## 真实根因

### 1. `generatedAt` 写库类型不匹配

- `OpenClawStrategyOptimization.generatedAt` 在 Prisma schema 中是 `DateTime`
- PostgreSQL 实际列类型是 `timestamp without time zone`
- 之前服务端在 `$executeRaw` 时把 ISO 字符串直接作为文本参数写入
- PostgreSQL 不会自动把该文本实参当成目标 timestamp，因此直接报类型不匹配

### 2. GEO 关键词挖掘误走了策略优化工具

- `create_openclaw_strategy_optimization` 的 MCP schema 之前允许 `workspaceScope = geo`
- 外部客户端在 GEO 关键词挖掘场景下因此可能误选该工具
- 即便写库成功，结果也不会进入 `/geo -> 关键词挖掘` 对应的 GEO 内容真源

## 本次修复

1. `OpenClawStrategyOptimizationService`
   - 在 PostgreSQL 写库时把 `generatedAt` 显式转成 `Date` 再传给 `$executeRaw`
   - 不再把 ISO 字符串直接按文本参数写入 timestamp 列

2. `create/get/update/delete_openclaw_strategy_optimization`
   - 收紧支持的 `workspaceScope`
   - 仅允许：
     - `brand_growth`
     - `xiaohongshu`
     - `douyin`
     - `wechat`
   - 不再允许 `geo`

3. 当外部仍误把 GEO 内容写到策略优化工具时：
   - 服务端会直接报清晰错误
   - 明确提示应改用 `create_openclaw_geo_content`

4. OpenClaw MCP 工具描述同步补充说明：
   - `strategy_optimization` 不用于 GEO 关键词挖掘等工作流内容
   - GEO 关键词挖掘、网站诊断、知识库搭建、GEO优化方案应使用 `create_openclaw_geo_content`

## 影响范围

- 修复 PostgreSQL 下策略优化记录的 `generatedAt` 写库失败
- 防止 OpenClaw 在 GEO 场景下继续误选策略优化工具
- 不改 GEO 内容真源结构，不改 `/geo` 页面展示结构

## 验证重点

1. `pnpm --filter server build`
2. 确认策略优化工具 schema 不再暴露 `geo` scope
3. 确认 GEO 场景误调策略优化工具时返回明确引导，而不是数据库类型错误

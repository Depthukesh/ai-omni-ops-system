# 2026-09-15 OpenClaw 收集数据全量开放补齐

## 背景

`品牌增长策略 -> 收集数据` 页面里的不少动作已经能在站内执行，但 OpenClaw 对外暴露仍然存在差集，导致同一块工作区里出现：

- 网页能提交，OpenClaw 不能提交
- 网页能读正文或补统计，OpenClaw 只能看摘要
- 网页能看每日热点，OpenClaw 还没有对应直连动作

本次目标不是重做采集底层，而是把已经存在的采集能力完整开放给 OpenClaw，并同步 MCP 与 Skill 口径。

## 本次补齐

### 1. OpenClaw 收集数据动作补齐

- `apps/server/src/modules/openclaw/openclaw.service.ts`

新增或补齐以下动作：

- 小红书采集
  - `sync_xiaohongshu_comment_data`
  - `get_xiaohongshu_comment_replies`
- 抖音采集
  - `sync_douyin_brand_works`
  - `sync_douyin_competitor_works`
  - `add_douyin_creators_to_result_pool`
  - `delete_douyin_brand_account`
  - `delete_douyin_competitor_account`
  - `delete_douyin_keyword_recommendation`
- 公众号采集
  - `delete_wechat_brand_account`
  - `read_wechat_article_content`
  - `update_wechat_benchmark_article_stats`
  - `read_wechat_search_item_content`
  - `update_wechat_search_item_stats`
- 每日热点
  - `get_daily_hotspot_workspace`
  - `sync_daily_hotspots`

同时补强已有入参：

- `sync_wechat_search_articles`
  - 现已支持 `searchBusinessType`、`searchSort`、`searchPublishTime`、`offset`
- `add_wechat_article_to_material_library`
  - 现已支持通过 `kind` 区分品牌文章与搜一搜文章入库

### 2. MCP bridge 工具定义同步

- `scripts/openclaw-ai-omni-mcp-server.mjs`

同步补齐上述收集数据工具定义，确保 OpenClaw 安装侧看到的工具清单与服务端暴露能力一致。

本次没有重写桥接执行流，继续沿用当前“参数归一 + 转发远端 MCP”的既有方式，避免把局部能力补齐扩散成整条桥接链路改造。

### 3. Skill 文档同步

- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`

同步说明：

- 收集数据现在默认优先走 MCP 直连，不再优先引导回网页点击提交
- 小红书评论链路、抖音品牌/竞品作品、公众号正文/统计、每日热点已纳入 Skill 路由说明
- OpenClaw 现在可以直接覆盖 `品牌增长策略 -> 收集数据` 下的主要日常操作

## 影响范围

- `品牌增长策略 -> 收集数据`
  - 小红书采集
  - 抖音采集
  - 公众号采集
  - 每日热点
- OpenClaw MCP 工具清单
- 品牌运营助手 Skill 路由口径

## 风险控制

- 没有重做 `collectors.service.ts` 底层采集逻辑，继续复用既有页面与 API 已验证的能力
- 没有改数据库结构
- 没有改页面主交互
- 对桥接脚本只补工具定义，不改当前主执行流，避免影响已有非采集类工具

## 验证

- `pnpm --filter server lint`
- `node --check scripts/openclaw-ai-omni-mcp-server.mjs`

## 更新后 OpenClaw 侧建议

1. 拉取最新代码并重建服务端运行态
2. 同步 OpenClaw MCP 配置或重启 OpenClaw 客户端，刷新工具列表
3. 重新让 OpenClaw 按 MCP 直连方式执行收集数据，不再让它提示“请回网页点击提交”

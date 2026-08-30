# 2026-08-30 OpenClaw 策略优化记录板块与 MCP / Skill 同步

## 背景

在内容获客的某书、某音/某号、公众号三个板块里，原本只有 OpenClaw 的创作素材、每日计划、每周复盘和作品列表。现在需要在每周复盘下面新增一个独立的 `策略优化记录` 板块，用于承接 OpenClaw 基于每周复盘生成的后续策略建议，并允许人工继续共同维护。

## 本次变更

### 1. 新增独立资源：策略优化记录

- 新增后端真源 `OpenClawStrategyOptimization`
- 字段固定为：
  - `title`
  - `content`
  - `generatedAt`
- 支持：
  - 列表查询
  - OpenClaw 创建
  - 人工编辑
  - 详情留言
  - 直接删除

### 2. 内容获客三板块同步新增入口

- 某书：在 `每周复盘` 下新增 `策略优化记录`
- 某音/某号：在 `每周复盘` 下新增 `策略优化记录`
- 公众号：在 `每周复盘` 下新增 `策略优化记录`

三个板块都统一复用同一套详情弹窗与留言链路，保持 OpenClaw 和人工共同维护同一条记录。

### 3. MCP / Skill 同步补齐

- OpenClaw MCP 新增：
  - `get_openclaw_strategy_optimizations`
  - `create_openclaw_strategy_optimization`
  - `update_openclaw_strategy_optimization`
  - `delete_openclaw_strategy_optimization`
- 安装中心导出的 Skill 说明、MCP 工具矩阵、高频任务路由手册同步加入策略优化记录能力

### 4. 20 条分页统一收口

本次把和 OpenClaw 相关的可滚动列表统一补到“每页 20 条自动分页”：

- 创作素材
- 每日计划
- 每周复盘
- 策略优化记录
- 作品列表
- 留言列表

## 影响面说明

- 本次没有改 API 鉴权方式
- 没有改既有 provider / prompt / fallback 行为
- 没有改数据库 schema 的其他业务表，只新增 `OpenClawStrategyOptimization` 独立真源
- 评论线程继续复用原 `OpenClawCommentThread`，只是新增 `strategy_optimization` 资源类型

## 验证重点

- 内容获客左侧菜单是否在三个板块下出现 `策略优化记录`
- 列表是否按 20 条自动分页
- 详情弹窗是否支持查看、编辑、留言、删除
- OpenClaw MCP 是否能对策略优化记录执行增删改查

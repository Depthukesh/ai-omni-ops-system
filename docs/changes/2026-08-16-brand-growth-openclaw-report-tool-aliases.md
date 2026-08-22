# 2026-08-16 品牌增长报告分栏补 OpenClaw 语义别名工具

## 1. 背景

品牌增长策略左侧“品牌增长报告”分栏当前包含：

- 机会洞察
- 生成品牌增长报告
- 品牌增长可视化报告
- 半年营销规划
- 营销日历
- 选题库
- 素材库

其中实际 OpenClaw 能力并非都以同名工具暴露：

- `机会洞察` 有独立工具
- `品牌增长报告`、`半年营销规划` 有独立工具
- `营销日历`、`选题库`、`可视化报告` 主要挂在 `manage_growth_reports`
- `素材库` 则暴露为 `get_unified_material_library_items`

这会造成两个问题：

1. 页面分栏名称和 OpenClaw 工具名脱节
2. 外部 Skill / MCP 调用时，很难一眼看出“这就是品牌增长报告左侧这一栏”

## 2. 本次改动

### 2.1 为品牌增长报告分栏补直观别名工具

文件：

- `apps/server/src/modules/openclaw/openclaw.service.ts`

新增品牌增长语义别名：

- `get_brand_growth_visual_report_workspace`
- `generate_brand_growth_visual_report`
- `get_brand_growth_marketing_calendar_workspace`
- `generate_brand_growth_marketing_calendar`
- `update_brand_growth_marketing_calendar`
- `get_brand_growth_topic_library_workspace`
- `generate_brand_growth_topic_candidates`
- `update_brand_growth_topic_library`
- `get_brand_growth_material_library_items`

### 2.2 实现方式

这些新增工具没有重写底层业务逻辑，而是直接转发到既有链路：

- `manage_growth_reports`
- `get_unified_material_library_items`

这样做的目的是：

- 保持现有 OpenClaw / Skill 兼容
- 让新调用可以直接按“品牌增长报告”分栏语义使用
- 不把原有稳定链路大改成高风险重构

### 2.3 同步 OpenClaw 手册与安装中心 fallback

已同步更新：

- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`

## 3. 影响面检查

### 3.1 受影响范围

- OpenClaw MCP 工具暴露层
- OpenClaw 安装中心导出的 Skill / 手册口径

### 3.2 未改动范围

- 没有改品牌增长报告页面 UI
- 没有改报告生成底层任务逻辑
- 没有移除旧工具名
- 没有修改数据库结构

## 4. 验证

已完成：

- `npm run build:server`
- `npm run build:web`

结果：

- 服务端构建通过
- Web 构建通过

## 5. 结论

当前“品牌增长报告”这组板块在 OpenClaw 侧已经不再只是“能调，但名字绕”。

后续外部调用可以直接按品牌增长语义理解：

- 可视化报告
- 营销日历
- 选题库
- 素材库

旧工具继续保留，确保历史 Skill / MCP 配置不受影响。

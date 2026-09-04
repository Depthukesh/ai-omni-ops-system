# 2026-09-04 OpenClaw 自由生图与设计页收口

## 背景

用户明确要求：

- OpenClaw 调用 `gpt-image-2` 时，不应被系统强制套进“社交媒体配图”模板
- 平台不要默认植入品牌资料、中文排版文案或其它额外业务信息
- `更多功能 -> 设计` 只保留给 OpenClaw 承接生图结果，不再让用户在站内手动操作
- `运营提示词中心`、`生图提示词中心` 不再继续作为该链路的用户入口

此前真实问题不在模型本身，而在站内默认链路：

- `create_design_work`
- `generateDesignWork`
- `resolveDesignSkillProfile`
- `buildDesignImagePrompt`
- `social_graphic`

这条路径会把图片模块默认收口到设计 skill 和社媒成品图 prompt，导致 OpenClaw 即使调用的是 `gpt-image-2`，仍会被平台植入社媒模板语义。

## 本次改动

### 1. OpenClaw 图片模块默认改为自由生图

更新：

- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/openclaw/openclaw.service.ts`

当前行为：

- `create_design_work` 在图片模块下默认开启 `rawImageMode`
- 不再自动选择 `design-social-carousel` 等社媒 skill 作为默认前提
- 不再默认植入品牌资料
- 不再强制补中文排版文案
- Prompt mode 改为自由生图语义，而不是社媒成品图语义
- 未显式传 `modelSelection` 时，仍优先尝试工作台模型列表中的多元探索 `gpt-image-2`

### 2. 设计页收口为结果回看页

更新：

- `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
- `apps/web/src/app/(dashboard)/more-features/design/page.tsx`
- `apps/web/src/app/(dashboard)/more-features/section-sidebar.tsx`
- `apps/web/src/app/(dashboard)/more-features/operations-prompt-center/page.tsx`
- `apps/web/src/app/(dashboard)/more-features/image-prompt-center/page.tsx`

当前行为：

- `更多功能` 左侧只保留 `设计`
- 设计页只保留图片结果回看
- 页面不再暴露手动创建按钮、创建弹窗、技能模板和提示词中心
- `operations-prompt-center` / `image-prompt-center` 直达地址统一重定向回 `/more-features/design`

### 3. MCP / Skill / 文档口径同步

更新：

- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/openclaw/OpenClaw渠道、Skill与MCP对接说明.md`
- `docs/openclaw/skill-package/00-品牌运营助手Skill网站功能域地图.md`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md`
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md`
- `docs/openclaw/品牌运营助手Skill示例SKILL.md`
- `docs/openclaw/品牌运营助手Skill示例SKILL1.md`

同步后的统一口径：

- 设计页是 OpenClaw 自由生图结果面板
- 图片模块默认自由生图
- 平台不再强制植入社媒模板、品牌资料或提示词中心入口

## 影响范围

- 影响 OpenClaw `create_design_work` 的图片模块默认行为
- 影响 `更多功能 -> 设计` 的用户侧呈现
- 不改数据库结构
- 不改已有 `referenceMaterialId` 参考图复用能力
- 不影响 OpenClaw 显式指定 `modelSelection` 的调用方式

## 验证

至少执行：

```powershell
pnpm --filter @ai-omni/web build
pnpm --filter @ai-omni/server build
```

并确认：

1. `更多功能` 左侧只剩 `设计`
2. `运营提示词中心`、`生图提示词中心` 直达后会重定向回设计页
3. 设计页不再出现手动创建入口
4. OpenClaw 图片模块默认说明已变为自由生图

## 一句话结论

这次改动把 OpenClaw 图片生成从“站内社媒设计模板链路”收口成“直接调用生图模型的自由生图链路”，同时把设计页收成纯结果回看面板，避免系统继续强制植入无关模板和提示词心智。

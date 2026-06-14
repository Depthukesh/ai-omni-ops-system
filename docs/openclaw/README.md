# OpenClaw 文档入口

## 目标

本目录只保留 OpenClaw 当前仍有参考价值的 Markdown 文档，不再保留与 Markdown 一一重复的 HTML 镜像。

## 当前推荐阅读顺序

1. `OpenClaw正式安装与网站对接说明.md`
   - 当前安装中心、安装令牌、MCP 地址、Skill ZIP 的使用说明
2. `OpenClaw渠道、Skill与MCP对接说明.md`
   - OpenClaw、Skill、MCP 与站内系统之间的分工关系
3. `06-OpenClaw接口与权限落地规格_v1.md`
   - 接口、权限、审计和能力暴露边界
4. `07-OpenClaw无侵入接入与对话式体验方案_v1.md`
   - 无侵入接入、灰度、降级、回滚与体验约束
5. `05-OpenClaw详细开发方案_基于现有系统文档.md`
   - 基于当前系统结构的整体开发方案

## 仍保留的补充文档

- `OpenClaw用户体验优先主方案.md`
- `OpenClaw首批高频任务清单.md`
- `OpenClaw第一阶段开发任务拆分清单.md`
- `OpenClaw第一阶段MCP工具清单.md`
- `OpenClaw第一阶段MCP工具字段草案.md`
- `品牌运营助手Skill详细草案.md`
- `品牌运营助手Skill示例SKILL.md`
- `01-OpenClaw对接网站完整方案.md`
- `02-OpenClaw品牌运营助手Skill草案.md`
- `03-OpenClaw实施清单与验收标准.md`
- `04-OpenClaw接入技术评估与安全权限方案.md`

## 使用原则

- 以当前代码与 `docs/site-map.md` 为准
- 如果 OpenClaw 页面、安装中心、权限模型或运行时链路发生变化，应优先更新本目录入口说明和对应主文档
- 历史讨论稿可继续保留为背景参考，但不应覆盖当前安装说明与接口落地规格
- 面向站点公开访问的 OpenClaw HTML 交付页位于 `apps/web/public/docs/openclaw/`；本目录只维护源 Markdown

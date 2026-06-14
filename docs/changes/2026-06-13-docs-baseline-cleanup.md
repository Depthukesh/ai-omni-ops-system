# 2026-06-13 文档基线清理与结构收口

## 为什么改

- `docs/` 目录累积了大量历史方案、展示镜像和已放弃路线，已经影响后续开发定位效率
- 多份基线文档和当前代码不一致，尤其是首页/登录关系、前端路由、后台模块与 OpenClaw 入口
- 需要把文档收回到“当前真相 + 必要专题 + 变更历史 + 历史规划”的四层结构

## 本次范围

- `docs/README.md`
- `docs/engineering-standards.md`
- `docs/git-workflow.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`
- `docs/openclaw/README.md`
- `docs/*.html`
- `docs/openclaw/*.html`
- `docs/project_planning/*.html`
- 多-agent 相关文档

## 本次改动

### 1. 重写文档总索引

- 把 `docs/README.md` 改成新的总入口
- 明确区分：
  - 核心基线
  - 当前专题方案
  - 变更记录
  - 历史规划
  - 报告输出

### 2. 重写开发规范

- 修正首页、登录页、后台登录页与受保护页面的真实关系
- 补齐当前工作台、后台治理模块、OpenClaw 和资源/任务/Provider 的真实边界
- 删除已放弃的多-agent 默认开发表述

### 3. 重写网站地图

- 补齐当前真实路由：
  - 帮助页
  - 公众号工作台
  - 设计工作台
  - 个人中心 OpenClaw 安装页
  - 后台模块注册中心与能力包治理
- 把文字地图和 Mermaid 地图统一到同一套当前结构

### 4. 重写 Git 规则

- 保留 Git 基础要求
- 改成更短、更明确的“当前闭环版”
- 明确把 `docs/README.md` 纳入提交前默认必读

### 5. 收口 OpenClaw 文档入口

- 重写 `docs/openclaw/README.md`
- 去掉 HTML 镜像入口
- 只保留 Markdown 主文档阅读顺序

### 6. 删除无储存价值文档

- 删除与 Markdown 重复的 HTML 镜像
- 删除已放弃的多-agent 文档和相关变更记录
- 保留 `apps/web/public/docs/openclaw/` 中仍被安装中心使用的公开 HTML 交付页，不把它们误删为 `docs/` 镜像

## 整理原则

- 当前代码和当前产品结构优先
- 重复展示文件不保留
- 已放弃路线不再作为当前文档体系的一部分
- 历史规划稿保留在 `project_planning/`，但明确不作为当前真相

## 验证方式

- 对照 `apps/web/src/app` 与 `apps/server/src/modules` 当前目录结构
- 对照 `apps/server/src/app.module.ts` 当前实际引入模块
- 对照个人中心、后台与 OpenClaw 当前页面入口
- 检查 `docs` 目录删除和重写后的引用关系

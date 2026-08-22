# 2026-08-08 系统内页简洁版方案与预览稿

## 背景

用户明确要求这次重新做一版：

1. 页面更简洁、更干净
2. 去掉不重要的信息
3. 先用 `finesse-brief` 生成方案
4. 再用 `finesse-ui` 实现 HTML 预览

因此这次不再继续扩展信息，而是主动做减法。

## 本次调整

### 1. 方案收敛为简洁版

将系统内页方案压缩成最小结构：

- 顶部
- 首屏
- 三个核心入口
- 两个侧边信息盒子

不再保留大段分析和复杂模块说明。

### 2. 预览页重做为轻量版

重写：

- `apps/web/public/docs/homepage-ui-refresh-preview.html`

新版特点：

- 浅色背景
- 白色卡片
- 更大留白
- 更少说明文字
- 只保留三个主入口
- 右侧只保留“今日重点”和“最近更新”

### 3. 文档同步变简

重写：

- `docs/homepage-ui-optimization-proposal-2026-08-08.md`

内容改为简洁版方案，不再写过多分析过程，只保留：

- 保留什么
- 删除什么
- 页面怎么分层
- 下一步怎么落地

## 影响范围

- `apps/web/public/docs/homepage-ui-refresh-preview.html`
- `docs/homepage-ui-optimization-proposal-2026-08-08.md`
- `docs/changes/2026-08-08-homepage-ui-optimization-proposal-and-preview.md`
- `docs/README.md`

## 验证

本次已完成：

- 确认预览页已重写为简洁版
- 确认方案文档已改为 `finesse-brief` 风格的收敛版
- 确认文档索引已保留当前交付入口

本次未做：

- 未接入真实 `/brand-growth`
- 未做浏览器联调
- 未做正式 JSX 改造

## 结果

这次交付的重点不再是“讲清所有能力”，而是：

- 先把系统首页做得更清爽
- 先让用户更快知道下一步操作

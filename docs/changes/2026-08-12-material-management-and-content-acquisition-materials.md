# 2026-08-12 素材管理聚合页与内容获客创作素材字段补齐

## 1. 背景

本轮目标是把个人中心原来的 `订单中心` 改成 `素材管理`，并与【内容获客】工作台里的三组 `创作素材` 做同一事实源聚合：

- 某书
- 某音/某号
- 公众号

同时，用户要求两边列表统一展示以下字段，并保持紧凑、简洁：

- 标题
- 素材标签
- 素材来源
- 入库时间
- 存储位置（本地文件夹地址）

## 2. 本次改动

### 2.1 个人中心：订单中心改为素材管理

- 保留旧路由 `/personal-center/orders` 做兼容
- 页面语义改为 `素材管理`
- 左侧新增四个类型子版块：
  - 文本
  - 图片
  - 语音
  - 视频
- 列表数据不再走订单接口，而是聚合内容获客三组 `创作素材`

### 2.2 内容获客：创作素材字段补齐

- `OpenClawCreativeMaterial` 真源新增并返回：
  - `materialTags`
  - `materialCategory`
  - `sourceLabel`
  - `storageKey`
  - `localFilePath`
- 内容获客三组 `创作素材` 列表统一改成紧凑表格
- 详情弹窗补充素材标签、来源、本地路径与存储键回显

### 2.3 本地路径与存储边界

- 上传型创作素材现在会把 `storageKey` 真正落入 `OpenClawCreativeMaterial`
- `local-single-user` / 本地 fallback 模式下，后端直接返回：
  - `LOCAL_APP_DATA_ROOT/storage/oss/<storageKey>`
- 前端不再通过 `fileUrl` 自己猜本地路径

### 2.4 MCP 与 Skill 同步

- OpenClaw MCP 新增：
  - `list_personal_material_assets`
- 个人中心功能目录从“订单中心”更新为“素材管理”
- Skill package 文档同步更新内容获客改版与素材管理聚合口径

## 3. 影响面检查

### 3.1 受影响板块

- 个人中心导航与概览
- 个人中心 `/personal-center/orders`
- 内容获客三组 `创作素材`
- OpenClaw 创作素材持久化结构
- OpenClaw MCP 目录与 Skill ZIP 文档

### 3.2 为避免副作用做的保护

- 没有删除订单接口与订单 MCP 工具，保留历史支付链路兼容
- 没有新建第二套素材表，继续复用 `OpenClawCreativeMaterial`
- 只把个人中心的用户可见概念改成素材管理，不强拆历史路由

## 4. 验证

- 前端构建：待执行
- 后端构建：待执行

## 5. 后续建议

- 后续如需让 OpenClaw 在创建素材时显式写入更多标签，可继续在 Skill 示例里补推荐写法
- 若后续确认个人中心不再需要历史订单入口，可再评估是否把订单查询迁到独立历史页，而不是继续复用旧路由

# 2026-08-15 本地素材库设置与 OpenClaw 素材同步收口

## 1. 背景

本轮目标是把 `local-single-user` 的个人中心 `素材管理` 从“只看聚合列表”升级成真正可控的本地素材库入口：

- 用户可以自己选择素材存储根目录
- 系统自动创建 `素材库`
- 网站上传素材要真正写入用户指定的本地素材库
- OpenClaw 上传到网站的素材不强制进入素材库，但也必须统一进入素材管理四分类列表
- 同步补齐 MCP、Skill 包与安装中心 ZIP 文案

## 2. 本次改动

### 2.1 个人中心素材管理

- `local-single-user` 的 `/personal-center/orders` 新增 `素材库存储设置`
- 用户选择的是【素材库】外层根目录
- 顶部设置区当前已进一步收口为极简交互，只保留：
  - 路径输入框
  - `选择文件夹`
  - `恢复默认目录`
  - `保存素材存储设置`
- 保存后自动创建：
  - `素材库/文本`
  - `素材库/图片`
  - `素材库/语音`
  - `素材库/视频`
- 网站上传素材统一按以下规则落盘：
  - `素材库/<分类>/<brandId>/<YYYY>/<YYYY-MM>/<timestamp>-<title>.<ext>`
- 页面内原“上传素材到网站”表单已移除，素材管理页当前只负责目录设置与四分类聚合查看

### 2.2 网站上传与 OpenClaw 上传统一入库

- 继续复用 `OpenClawCreativeMaterial` 作为统一素材真源
- 新增 `sourceKind`
  - `material_library_upload`
  - `openclaw_upload`
- 网站上传素材：
  - 保存为 `material_library_upload`
  - `storageKey` 写入 `works/<brandId>/material-library/...`
  - `local-single-user` 下映射到用户配置的本地素材库目录
- OpenClaw 上传素材：
  - 保存为 `openclaw_upload`
  - 不要求必须进入本地素材库
  - 但同样进入素材管理四分类列表

### 2.3 本地受控存储映射

- `OssStorageService` 现在会识别 `works/<brandId>/material-library/<category>/...`
- 命中该前缀时，自动映射到用户设置的：
  - `素材库/文本`
  - `素材库/图片`
  - `素材库/语音`
  - `素材库/视频`
- 同一份本地存储设置现在同时承接其它本地受控副本：
  - `works/*`
  - `reports/*`
  - `brands/*`
  - `users/*`
- 这些非素材库类受控副本统一写入用户设置目录下的 `站内存储/<storageKey>`
- 历史仍位于旧 `LOCAL_APP_DATA_ROOT/storage/oss` 的本地副本，当前会先兼容读取；用户重新保存一次本地存储目录时，也会把可迁移的旧文件同步复制到新的 `站内存储` 目录

### 2.4 MCP 与 Skill 同步

- MCP 新增：
  - `get_local_material_storage_settings`
  - `update_local_material_storage_settings`
- `list_personal_material_assets` 现在按统一素材真源聚合网站上传与 OpenClaw 入库记录
- `create_openclaw_creative_material` 新增 `sourceKind` 口径
- OpenClaw Skill package 文档、示例 SKILL 和安装中心 fallback 文案同步更新

### 2.5 local-single-user 持久化保护

- 品牌资料库 / 产品资料库在 `local-single-user` 下，如果 SQLite 暂时不可用，后端不再继续回退到临时 mock 数据
- 当前改为直接返回“数据库暂不可用”的明确错误，避免用户在本地单机版里误把临时演示数据当成真实已保存内容
- 这次保护不改数据库结构，只是收紧本地单机版的读写边界

## 3. 影响面检查

### 3.1 受影响板块

- 个人中心 `素材管理`
- 本地运行时目录设置
- OpenClaw 创作素材写入链路
- 本地受控存储路径映射
- MCP 工具矩阵与 Skill ZIP

### 3.2 为避免副作用做的保护

- 没有新建第二套素材表，继续复用 `OpenClawCreativeMaterial`
- 仍然保留 `material-library/*` 到 `素材库/<分类>` 的专属映射，避免素材四分类与其它站内副本混在一起
- 对历史本地副本保留旧路径兼容读取，避免切换规则后已有 GEO / 报告 / 附件记录直接失联
- OpenClaw 上传素材继续兼容原有受控存储路径，只补统一入列表能力

## 4. 验证

- 后端构建：已执行 `npm run build:server`
- 前端构建：已执行 `npm run build:web`
- SQLite 现场排查：已确认当前 runtime 仍指向 `C:\Users\Administrator\AppData\Roaming\AiOmniOps\db\local-single-user.sqlite`
- SQLite 数据核对：已确认当前活跃真实会话指向真实品牌，但当前库内 `Brand` 背景字段为空、`Product` 表无记录，因此“显示为空”不是单纯前端渲染问题
- 本地安装态联调：未执行完整页面手工联调
- OSS 发版：待执行

## 5. 后续建议

- 后续可继续给素材管理补“打开所在目录”和“按来源筛选”
- 若后续还要把更多站内上传入口接到本地素材库，应继续复用同一套 `sourceKind + material-library storageKey` 规则

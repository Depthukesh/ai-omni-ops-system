# 2026-05-27 抖音热点找选题

## 背景

在抖音工作台里新增“热点找选题”板块，要求沿用现有工作区布局，不新开独立模块；用户选择某个热点日期后，需要把当天“每日热点”全部榜单和品牌背景资料一起送入指定提示词，输出 3 条可勾选选题，并同步到前后台技能中心。

## 本次调整

1. 后端 `ReportsModule` 新增 `douyin-hot-topic-candidates` 工作区与异步生成接口：
   - `GET /reports/brands/:brandId/douyin-hot-topic-candidates?date=YYYY-MM-DD`
   - `POST /reports/brands/:brandId/douyin-hot-topic-candidates/generate`
2. 生成链路复用现有报告任务模式，输入固定包含：
   - 所选日期的每日热点全部榜单
   - 品牌背景资料、产品、调研和账号信息
3. 结果以 `DOUYIN_HOT_TOPIC_CANDIDATES` 写入品牌生成资产，前端按 3 条选题逐行展示，并在每行前保留勾选框，为后续“选题库”接入预留。
4. 抖音工作台新增“热点找选题” section，继续沿用 `douyin.plan` 的查看/编辑权限，不额外扩展团队权限树。
5. 技能注册同步新增：
   - 后台绑定：`douyin-hot-topic-candidates / prompt_douyin_hot_topic_candidates`
   - 前台技能中心目录项：`热点找选题-生成热点选题`
   - 提示词文件回源：`提示词/抖音板块/热点找选题.txt`
6. 后台/前台技能中心读取该提示词时，若本地文件存在，则优先展示和运行源文件内容，不再继续停留在数据库里历史占位文案。

## 影响范围

1. 不改现有抖音营销策划方案的生成、保存和删除链路。
2. 不改现有抖音素材库的数据来源与卡片渲染逻辑。
3. 不改“每日热点”页面本身，只复用其日期和榜单结果作为输入源。

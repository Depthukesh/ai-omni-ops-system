# 2026-06-10 接入对象运行时生效与文档同步

## 本次变更

- `ReportsModule` 已正式引入 `KnowledgeBasesModule`，让报告运行时可以直接读取知识库绑定与检索结果。
- 品牌增长报告生成前，系统会先按：
  - `MODULE = brand-growth-workbench`
  - `SKILL_PACKAGE = brand-growth-analysis`
  - `SKILL = brand-omni-growth-analysis`
  这三层执行身份做继承解析，并兼容读取旧版 `PROMPT` 绑定。
- 半年营销规划生成前，也会复用同一套继承解析规则，按 `brand-growth-workbench -> enterprise-annual-plan -> enterprise-annual-plan` 读取企业知识库片段。
- 小红书营销策划方案生成前，会按 `xiaohongshu-workbench -> xiaohongshu-brand-marketing-plan -> xiaohongshu-brand-marketing-plan` 读取企业知识库片段。
- 抖音营销策划方案生成前，会按 `douyin-workbench -> tongcheng-brand-douyin-planning -> tongcheng-brand-douyin-planning` 读取企业知识库片段。
- 抖音热点找选题生成前，会按 `douyin-workbench -> tongcheng-brand-douyin-planning -> douyin-hot-topic-candidates` 读取企业知识库片段。
- 公众号文章生成前，会按 `wechat-workbench -> wechat-article-generator -> wechat-article-composer` 读取企业知识库片段。
- 公众号 HTML 渲染前，会按 `wechat-workbench -> wechat-html-renderer -> wechat-html-renderer` 读取企业知识库片段。
- 公众号封面图/正文配图生成前，会按 `wechat-workbench -> wechat-image-designer -> wechat-cover-image-designer / wechat-body-image-designer` 读取企业知识库片段。
- 对命中的绑定知识库，系统会执行一次最小检索召回，把企业知识库中与品牌背景、产品资料、经营情况、客户画像、渠道策略相关的片段追加到品牌增长报告输入上下文。
- 这次接法保持“最小闭环”：
  - 先接到“品牌增长报告 + 半年营销规划 + 小红书营销策划方案 + 抖音营销策划方案 + 抖音热点找选题 + 公众号文章生成 + 公众号 HTML 渲染 + 公众号配图生成”
  - 标准绑定层级收口为“模块 / 能力包 / 技能”
  - 运行时统一按“模块 -> 能力包 -> 技能”继承解析
  - 采用 best-effort 方式，知识检索失败不会直接阻断报告生成
- `docs` 顶层文档同步补齐：
  - `docs/README.md`
  - `docs/engineering-standards.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`

## 当前结果

- “接入对象”不再只是后台治理字段，已经开始在品牌增长报告、半年营销规划、小红书营销策划方案、抖音营销策划方案、抖音热点找选题、公众号文章生成、公众号 HTML 渲染、公众号配图生成这八条主链路里真实生效。
- 前端企业知识库上传后的默认绑定 `brand-growth-workbench`，现在会真正影响品牌增长报告生成时的上下文范围。
- 顶层文档已明确区分：
  - 哪些属于知识库治理层
  - 哪些已经进入运行时
  - 当前是强依赖还是 best-effort

## 仍未完成

- 目前还没有把同一套知识绑定运行时注入到：
  - 提示词独立执行链路
- 公众号工作流目前已打通“文章 -> 配图 -> HTML”三段知识注入，但发布确认 / API 发布阶段仍未继续消费知识绑定。
- 绑定里的 `priority`、`retrievalMode`、`isRequired` 目前只在最小范围内参与排序和过滤，还没有形成统一的全链路编排规则。
- 当前报告运行时注入仍以“召回片段直接拼入 prompt”为主，后续还需要继续补：
  - 命中来源展示
  - 检索日志
  - 运行时效果评估
  - 更细的 targetId 路由规则

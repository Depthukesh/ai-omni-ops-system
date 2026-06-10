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
- 小红书原创文案生成前，会按 `xiaohongshu-workbench -> xiaohongshu-content-original -> original_copy` 读取企业知识库片段。
- 小红书原创配图提示词生成前，会按 `xiaohongshu-workbench -> xiaohongshu-content-original -> xhs-original-image-prompt` 读取企业知识库片段。
- 小红书二创文案生成前，会按 `xiaohongshu-workbench -> xiaohongshu-content-rewrite -> rewrite_copy` 读取企业知识库片段。
- 小红书二创配图提示词生成前，会按 `xiaohongshu-workbench -> xiaohongshu-content-rewrite -> rewrite_image` 读取企业知识库片段。
- 小红书视频笔记文案 / 视频提示词 / 故事板阶段，会按 `xiaohongshu-workbench -> xiaohongshu-video-production -> short-video-api-studio` 读取企业知识库片段。
- 抖音 AI 生视频（故事板）阶段，会按 `douyin-workbench -> tongcheng-brand-douyin-planning -> douyin-video-storyboard-studio` 读取企业知识库片段。
- 抖音 AI 生视频阶段，会按 `douyin-workbench -> douyin-video-production -> douyin-direct-video-studio` 读取企业知识库片段。
- 抖音数字人口播脚本生成阶段，会按 `douyin-workbench -> douyin-digital-human -> douyin-digital-human-script-studio` 读取企业知识库片段。
- 设计工作台的图片 / HTML / PPT / 视频方案，会按 `design-workbench -> design-web-prototype -> 具体设计技能` 读取企业知识库片段。
- 对命中的绑定知识库，系统会执行一次最小检索召回，把企业知识库中与品牌背景、产品资料、经营情况、客户画像、渠道策略相关的片段追加到品牌增长报告输入上下文。
- 后台知识库详情新增“调用记录”页签，用于测试时确认某次技能执行到底有没有真的调用知识库。
- 调用记录当前覆盖 `REPORTS` 与 `WORKS` 两类运行时入口，并统一记录：
  - 调用场景
  - 绑定知识库
  - 命中来源知识库
  - 命中片段数
  - 状态（`UNBOUND / NO_HIT / HIT / FAILED`）
- 这次接法保持“最小闭环”：
  - 先接到“品牌增长报告 + 半年营销规划 + 小红书营销策划方案 + 抖音营销策划方案 + 抖音热点找选题 + 公众号文章生成 + 公众号 HTML 渲染 + 公众号配图生成 + 小红书原创/二创文案与配图提示词 + 小红书视频笔记文案/提示词/故事板 + 抖音视频阶段技能 + 抖音数字人口播脚本 + 设计工作台图片/HTML/PPT/视频方案”
  - 标准绑定层级收口为“模块 / 能力包 / 技能”
  - 运行时统一按“模块 -> 能力包 -> 技能”继承解析
  - 采用 best-effort 方式，知识检索失败不会直接阻断报告生成
  - 技能只是“具备可接知识库能力”，是否真正生效由用户是否绑定对应模块 / 能力包 / 技能决定，不做默认全量强绑
- `docs` 顶层文档同步补齐：
  - `docs/README.md`
  - `docs/engineering-standards.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`

## 当前结果

- “接入对象”不再只是后台治理字段，已经开始在品牌增长报告、半年营销规划、小红书营销策划方案、抖音营销策划方案、抖音热点找选题、公众号文章生成、公众号 HTML 渲染、公众号配图生成、小红书原创 / 二创 / 视频、抖音视频阶段技能、抖音数字人口播脚本，以及设计工作台里真实生效。
- 前端企业知识库上传后的默认绑定 `brand-growth-workbench`，现在会真正影响品牌增长报告生成时的上下文范围。
- 测试阶段现在可以在后台知识库页直接查看最近调用记录，快速分辨当前是“未绑定”“已绑定但未命中”“命中”还是“调用失败”。
- 顶层文档已明确区分：
  - 哪些属于知识库治理层
  - 哪些已经进入运行时
  - 当前是强依赖还是 best-effort

## 仍未完成

- 目前仍有部分边缘执行入口未统一接入同一套知识绑定运行时，但抖音数字人口播脚本本身已经具备独立技能级生成入口，并可按接入对象读取企业知识库。
- 当前仍保持最小注入模式：绑定排序和过滤继续只做最小可用，不额外扩展日志面板、命中来源展示或复杂编排能力。

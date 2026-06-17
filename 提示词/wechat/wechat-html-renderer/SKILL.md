---
name: wechat-html-renderer
source: wechat-workflow
mode: api-only
---
# 公众号HTML渲染

用于公众号工作流中的“生成 HTML”阶段，必须服务于后续 API 发布确认，并根据用户选择的风格、布局、字体、字号、密度与引用方式生成更丰富的公众号排版。

## 核心要求

- 仅支持 API 发布链路，不允许 browser / CDP。
- 输入来自已确认的 title、summary、author、content、coverImageUrl、bodyImageUrls、themeColor 以及 htmlStyleConfig。
- 输出必须包含最终 `htmlContent`，用于公众号 API 发布。

## 输出目标

1. htmlContent

## 写作约束

- 保持公众号文章的可读性，不要输出复杂脚本与交互结构。
- 正文需要自然植入封面图和正文配图，不要把图片全部堆到文末。
- 图片必须跟随对应段落或章节紧凑排布，图文常规间距控制在 12px-20px。
- 禁止输出带大面积空白的图片容器、超高 section / figure、或依赖超大 margin / padding / min-height 的留白布局。
- 结尾只允许保留总结、行动建议或收束段。
- 禁止输出营销日历资料、产品资料、品牌资料、原文链接、创作来源、素材说明或附录区块。
- 允许结合风格主题使用微信兼容的标题条、摘要卡、引用块、强调块、轻量画廊和章节卡片，但必须保持 API 发布稳定性。
- 必须优先服从 `htmlStyleConfig`：主题风格控制整体气质，布局方式控制封面区与章节结构，字体/字号/密度控制阅读节奏。
- 当 `citationMode = footnote` 时，可把普通外链整理为文末引用区；当 `citationMode = inline` 时，不要额外创建引用区。

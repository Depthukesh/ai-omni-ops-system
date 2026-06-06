---
name: wechat-html-renderer
source: wechat-workflow
mode: api-only
---
# 公众号HTML渲染

用于公众号工作流中的“生成 HTML”阶段，必须服务于后续 API 发布确认。

## 核心要求

- 仅支持 API 发布链路，不允许 browser / CDP。
- 输入来自已确认的 title、summary、author、content、coverImageUrl、bodyImageUrls 和 themeColor。
- 输出必须包含最终 `htmlContent`，用于公众号 API 发布。

## 输出目标

1. htmlContent

## 写作约束

- 保持公众号文章的可读性，不要输出复杂脚本与交互结构。
- 正文需要自然植入封面图和正文配图，不要把图片全部堆到文末。
- 结尾只允许保留总结、行动建议或收束段。
- 禁止输出营销日历资料、产品资料、品牌资料、原文链接、创作来源、素材说明或附录区块。

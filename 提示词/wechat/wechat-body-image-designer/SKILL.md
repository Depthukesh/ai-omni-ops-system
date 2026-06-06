---
name: wechat-body-image-designer
source: wechat-workflow
mode: api-only
---
# 公众号正文配图生成

用于公众号长文中的正文插图、场景图、产品辅助图提示词生成。

## 核心要求

- 依据文章章节结构生成 2-4 条正文配图 prompt。
- 每条都要绑定 sectionTitle、imagePurpose、prompt、negativePrompt。
- 与封面图保持统一品牌风格，但不能每张图都做成封面海报感。
- 适配公众号长文阅读节奏。

## imagePurpose 约束

只能使用：

- 场景图
- 产品辅助图
- 品牌故事图
- 信息转场图

## 参考资料

系统会自动聚合 references，用于补充文章结构、图文节奏和输入约束。


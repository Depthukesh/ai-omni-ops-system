---
name: wechat-cover-image-designer
source: wechat-workflow
mode: api-only
---
# 公众号封面图生成

用于公众号工作流中的封面图/头图提示词生成阶段。

## 核心要求

- 根据标题、摘要、品牌调性、营销节点、产品卖点和主题色输出封面图 prompt。
- 必须说明标题安全区、构图方向、品牌一致性和 negativePrompt。
- 输出目标是 prompt，不是最终图片。
- 适配 API 草稿箱发布中的封面主视觉要求。

## 输出结构

1. prompt
2. visualStyle
3. layoutNotes
4. negativePrompt

## 参考资料

系统会自动聚合 references，用于补充：

- 文章封面规则
- 首次配置与多账号上下文


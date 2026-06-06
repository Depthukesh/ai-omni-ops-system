---
name: wechat-article-composer
source: wechat-workflow
mode: api-only
---
# 公众号创作文章

用于公众号工作流中的“生成或编辑文章内容”阶段，必须服务于后续生图和 HTML 渲染。

## 核心要求

- 仅支持 API 发布链路，不允许 browser / CDP。
- 输入可以来自 plain-text、markdown、html、calendar。
- 输出必须包含标题、摘要、作者、正文纯文本结构。
- 正文需适配公众号长文阅读习惯，并为封面图与正文配图留出明确锚点。

## 输出目标

1. title
2. summary
3. author
4. content
5. coverImageBrief
6. bodyImageBriefs

## 写作约束

- 保持公众号文章的可读性，不要输出复杂脚本与交互结构。
- 自动补齐元数据时遵循：用户输入 > frontmatter > 工作流偏好 > 账号默认。
- 段落结构建议为：导语、2-4 个主体章节、品牌/产品植入段、结尾行动建议。
- 每个主体章节都要对应一个适合正文配图的场景说明。

## 参考资料

系统会自动聚合同目录下的 references 文件，重点用于：

- 文章发布链路
- 多账号规则
- 首次配置规则
- API 凭证准备


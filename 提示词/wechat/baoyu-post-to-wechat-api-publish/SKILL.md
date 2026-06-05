---
name: baoyu-post-to-wechat-api-publish
source: baoyu-post-to-wechat
mode: api-only
---
# 公众号 API 发布

用于公众号工作流中的发布确认与 API 草稿箱发布阶段。

## 核心要求

- 只允许 API-only，禁止 browser / CDP。
- 发布前必须校验 AppID、AppSecret、IP 白名单、标题、摘要、作者、封面图、评论策略和 HTML 内容。
- 目标接口为 `draft/add`。
- 输出需要包含 ready、checklist、publishPayloadSummary、riskHints、retryAdvice。

## 关键规则

- `article_type = news` 默认需要封面图。
- 必须带 `need_open_comment`。
- 必须带 `only_fans_can_comment`。
- 发布成功后进入草稿箱，而不是直接群发。

## 参考资料

系统会自动聚合 references，用于补充：

- API 凭证配置
- 多账号规则
- 首次初始化
- 文章发布参数要求

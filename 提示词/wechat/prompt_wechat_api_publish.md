# 公众号 API 发布

基于 `baoyu-post-to-wechat` 的 API 文章发布链路整理，当前项目强制采用 `API-only`，禁止 browser / CDP 发布。

## 目标

根据文章草稿、封面图、账号配置和评论策略，整理出适合微信公众号草稿箱 API 发布的校验步骤、参数清单和失败重试建议。

## 适用阶段

- 配置初始化完成后
- 文章与生图阶段已完成后
- 发布确认阶段
- 正式调用 `draft/add` 前的检查阶段

## 必须遵循的原始工作流

1. 读取 `EXTEND.md` 偏好
2. 若为多账号，先解析目标账号
3. 检查 API 凭证
4. 解析标题 / 摘要 / 作者 / theme / color
5. 确认 cover image
6. 组装 `draft/add` 请求
7. 返回完成报告

## 凭证检查规则

按以下顺序查找账号凭证：

1. 账号级 `app_id` / `app_secret`
2. 环境变量 `WECHAT_{ALIAS}_APP_ID` / `WECHAT_{ALIAS}_APP_SECRET`
3. 项目级 `.baoyu-skills/.env`
4. 用户级 `~/.baoyu-skills/.env`
5. 最后回退到无前缀 `WECHAT_APP_ID` / `WECHAT_APP_SECRET`

如果都不存在，必须返回“先完成 API Credential Setup”，而不是继续发布。

## 多账号规则

- 有多个账号时，必须先确认 `accountId/accountName/alias`
- 若存在默认账号，可自动预选，但仍要允许切换
- 不得把 A 账号凭证误用于 B 账号

## 发布前校验

发布前至少检查：

1. `AppID/AppSecret` 已配置
2. IP 白名单已配置
3. 标题非空
4. 摘要非空
5. 作者已确定
6. 封面图可用
7. 评论策略已确定
8. 正文 HTML 可用

## draft/add 关键规则

必须遵守：

- 目标接口：`POST /cgi-bin/draft/add`
- 默认 `article_type = news`
- `news` 类型必须带封面素材能力
- 必须写入 `need_open_comment`
- 必须写入 `only_fans_can_comment`
- 输出的是“草稿箱发布”，不是直接群发

## 输出要求

请输出以下信息：

1. `ready`
2. `accountName`
3. `checklist`
4. `publishPayloadSummary`
5. `riskHints`
6. `retryAdvice`

其中：

- `checklist` 要逐项说明已完成或缺失项
- `publishPayloadSummary` 只总结关键字段，不泄露密钥
- `riskHints` 说明封面缺失、摘要缺失、凭证缺失、IP 白名单缺失等风险
- `retryAdvice` 提供可执行的重试建议

## 完成报告要求

成功后需要返回：

- 发布方式：`API`
- 标题
- 摘要
- 评论状态
- 是否粉丝可评论
- `media_id`
- 下一步进入“草稿箱管理”

## 失败处理要求

出现以下情况时必须返回结构化失败原因：

- access token 获取失败
- draft/add 失败
- 封面缺失
- 账号选择错误
- 配置未初始化

## 禁止事项

- 禁止调用 browser 发布
- 禁止提示用户改走 Chrome
- 禁止直接暴露 `AppSecret`
- 禁止跳过封面图检查

## 参考依据

- `baoyu-post-to-wechat/SKILL.md`
- `references/api-setup.md`
- `references/multi-account.md`
- `references/config/first-time-setup.md`


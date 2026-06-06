# Article Posting (文章发表)
## draft/add Payload Rules
- Endpoint: `POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN`
- `article_type`: `news` or `newspic`
- `news` must include cover capability
- Always include `need_open_comment` and `only_fans_can_comment`
- Completion report should include title, summary, comments, media_id and draft entry result

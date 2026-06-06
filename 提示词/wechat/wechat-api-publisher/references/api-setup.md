# API Credential Setup
## Detection Order
1. Env vars `WECHAT_APP_ID` / `WECHAT_APP_SECRET`
2. `<cwd>/.wechat-skills/.env`
3. `$HOME/.wechat-skills/.env`
## Guided Setup
在微信公众号后台 `开发 -> 基本配置` 获取 AppID / AppSecret。
如果多账号存在，优先使用带 alias 前缀的环境变量。


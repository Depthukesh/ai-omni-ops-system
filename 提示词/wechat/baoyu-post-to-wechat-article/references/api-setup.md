# API Credential Setup
## Detection
Look for credentials in this order:
1. `WECHAT_APP_ID` / `WECHAT_APP_SECRET`
2. `<cwd>/.baoyu-skills/.env`
3. `$HOME/.baoyu-skills/.env`
## Guided Setup
If credentials are missing:
1. Visit `https://mp.weixin.qq.com`
2. Open `开发 -> 基本配置`
3. Copy AppID and AppSecret
4. Save to project-level or user-level `.baoyu-skills/.env`
## Multi-Account Variant
When multiple accounts exist, use prefixed keys such as `WECHAT_BAOYU_APP_ID`.

# Article Posting (文章发表)
Post markdown articles to WeChat Official Account with full formatting support.
## Usage
```bash
${BUN_X} ./scripts/wechat-article.ts --markdown article.md
${BUN_X} ./scripts/wechat-article.ts --markdown article.md --theme grace
${BUN_X} ./scripts/wechat-article.ts --markdown article.md --no-cite
${BUN_X} ./scripts/wechat-article.ts --markdown article.md --author "作者名" --summary "摘要"
```
## Parameters
| Parameter | Description |
|-----------|-------------|
| `--markdown <path>` | Markdown file to convert and post |
| `--theme <name>` | Theme: default, grace, simple, modern |
| `--no-cite` | Keep ordinary external links inline instead of converting them to bottom citations |
| `--title <text>` | Override title (auto-extracted from markdown) |
| `--author <name>` | Author name |
| `--summary <text>` | Article summary |
| `--html <path>` | Pre-rendered HTML file (alternative to markdown) |
| `--profile <dir>` | Chrome profile directory |
## Markdown Format
Markdown mode converts ordinary external links into bottom citations by default for WeChat-friendly output. Use `--no-cite` to disable that behavior.
## Image Handling
1. Parse images and placeholders
2. Generate HTML
3. Paste or upload according to publish mode
## Important Rules
- Never pre-convert markdown to HTML before deciding publish method.
- API mode and browser mode use different image handling paths.
- `news` article type requires a cover image.

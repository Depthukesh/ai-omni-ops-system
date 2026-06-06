# Multi-Account Support
## Compatibility
| Condition | Mode | Behavior |
|-----------|------|----------|
| No `accounts` block | Single-account | Original behavior |
| `accounts` with 1 entry | Single-account | Auto-select |
| `accounts` with 2+ entries | Multi-account | Prompt to select |
| `accounts` with `default: true` | Multi-account | Pre-select default |
## Key Rules
- Multi-account selection happens before publishing.
- Each account can override publish method, author, comments, app_id, app_secret.
- Credential resolution order: inline account config -> prefixed env vars -> project .env -> user .env -> unprefixed env vars.
- Do not mix credentials between accounts.

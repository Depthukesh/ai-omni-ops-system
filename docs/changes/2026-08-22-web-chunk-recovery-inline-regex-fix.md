# 2026-08-22 Web chunk 自动恢复脚本内联正则修复

## 背景

- 用户反馈站点页面白屏，浏览器打开 `更多功能 -> 设计` 后仍无法正常进入。
- 进一步做浏览器侧验证时，控制台出现运行时错误：
  - `SyntaxError: Failed to execute 'appendChild' on 'Node': Invalid regular expression flags`
- 排查确认问题不在页面业务组件本身，而在根布局 `apps/web/src/app/layout.tsx` 里新增的 `chunk-load-recovery` 内联脚本。

## 根因

- `chunk-load-recovery` 使用 `dangerouslySetInnerHTML` 注入字符串脚本。
- 脚本里的正则原本想匹配 `/_next/static/chunks/`，但写成了字符串内的单层转义：
  - `\/_next\/static\/chunks\/`
- 这类写法在外层模板字符串被解释后，反斜杠会被吃掉，浏览器最终拿到的是非法正则字面量，从而在脚本注入阶段直接报 `Invalid regular expression flags`。
- 由于该脚本是 `beforeInteractive`，会在页面正式初始化前执行，所以会把全站都拖成白屏。

## 本次改动

- 将内联脚本中的正则路径部分改为双层转义：
  - `\\/_next\\/static\\/chunks\\//`
- 保持原有“chunk 资源失效时自动刷新恢复”的设计不变，只修复内联脚本在浏览器端的可执行性。

## 影响面

- 仅影响前端根布局的静态资源恢复脚本。
- 不改业务页面逻辑。
- 不改 API 链路。
- 不改 Docker 配置。

## 验证

- 浏览器控制台复查：
  - 不再出现 `Invalid regular expression flags`
- 运行态页面验证：
  - `http://localhost:13001/`
  - `http://localhost:13001/more-features/design`
  - `http://localhost:13001/personal-center/third-party-platforms`

# 2026-05-20 第三方平台私钥增加同 Host 兜底匹配

## 背景

- 小红书原创笔记在文生图阶段报错：
  - `文生图 Provider 已激活，但当前没有可用的执行配置`
  - 排查结果指向 `Right Codes · 文生图/图生图：未配置 API Key`
- 用户已在个人中心提交 API Key，但系统仍未取到。

## 根因

- 运行时私钥解析此前采用 `baseUrl` 精确匹配。
- `Right Codes` 不同能力可能被拆成多个平台条目，例如：
  - `https://www.right.codes/draw`
  - 同 host 下的其他路径
- 当用户把 API Key 保存到同 host 的另一条平台记录时，文生图运行时无法复用该私钥，最终被判定为未配置 API Key。

## 本次调整

- 在 `ThirdPartyPlatformsService.resolveBrandRuntimeApiKeys()` 中增加同 host 兜底匹配。
- 匹配顺序调整为：
  - 先按完整 `baseUrl` 精确匹配平台
  - 若存在同 host 的兄弟平台，则把它们作为候选补充
  - 查找用户私钥时按候选顺序取第一条可用密钥

## 风险边界

- 不改数据库 schema。
- 不改个人中心录入流程。
- 不改原创、二创、视频笔记主业务流程。
- 仅增强运行时私钥解析的兼容性，优先精确匹配，缺失时才回退到同 host 候选。

# 2026-05-20 文生图 Provider 错误提示澄清

## 背景

- 小红书原创笔记创建时，前端统一显示 `未找到文生图接口配置`。
- 该提示过于笼统，无法区分到底是：
  - 文生图 Provider 未激活
  - 品牌 Owner 未配置第三方平台私钥
  - Provider 已激活，但 baseUrl / API Key / 模型白名单不完整

## 本次调整

- 在 `WorksService` 的文生图 Provider 装配阶段补充更明确的错误文案。
- 当 runtimeKey=`image-generation` 没有任何激活 Provider 时，改为提示：
  - 需要先在后台启用 `Right Codes · 文生图/图生图` 或其他 `image-generation` Provider
- 当品牌 Owner 没有配置对应第三方平台私钥时，改为提示：
  - `文生图 Provider 已激活，但当前品牌的 Owner 尚未配置第三方平台 API Key`
- 当 Provider 已激活但没有形成可用执行配置时，改为提示：
  - `文生图 Provider 已激活，但当前没有可用的执行配置`
  - 并附带每个 Provider 被跳过的原因，如 `未配置 baseUrl / 未配置 API Key / 未匹配到可用模型`

## 风险边界

- 仅调整错误识别和报错文案。
- 不改原创笔记、二创笔记、视频笔记的主业务流程。
- 不改 API 协议，不改数据库 schema。

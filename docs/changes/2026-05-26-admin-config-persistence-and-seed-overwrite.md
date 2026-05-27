# 2026-05-26 后台配置持久化与系统 Seed 覆盖问题排查

## 背景

- 后台此前已修过“技能中心保存后被旧数据覆盖”的问题，但用户继续反馈：
  - 其他板块保存后，页面刷新或服务更新后又恢复成原来的值。
- 这类现象经排查并不是同一种根因，而是至少分成两类：
  - 系统 seed 在启动时继续回写，覆盖了后台人工保存的配置。
  - 某些板块仍处于 mock 内存数据阶段，页面内保存有效，但服务重启后必然丢失。

## 本次结论

### 1. 接口供应商存在系统 Seed 覆盖风险

- `ApiProvidersService.bootstrapSystemProviders()` 会在服务启动时遍历系统 Provider seed。
- 旧实现里，只要数据库中存在同 ID 的系统 Provider，就会执行 `syncSystemProviderSeed()`，把 seed 中的大量字段重新写回数据库。
- 这会导致后台在“接口供应商”里手动修改过的配置，在下次重启或部署后被回滚。

### 2. 第三方平台存在系统 Seed 覆盖风险

- `ThirdPartyPlatformsService.bootstrapTables()` 会在服务启动时遍历 `THIRD_PARTY_PLATFORM_SEEDS`。
- 旧实现会对已有系统平台执行 `syncSeedPlatform()`，将 seed 里的平台名称、状态、Base URL、模型 ID、默认模型等再次写回数据库。
- 这会导致后台在“第三方平台”里手动保存的值，在服务更新后又恢复成 seed 里的旧值。

### 3. 会员与积分规则、知识库管理当前仍不是数据库持久化

- `BillingRulesService` 当前直接写入 `mock-data` 中的内存对象。
- `KnowledgeBasesService` 当前也仍直接操作 `mock-data` 中的知识库、文件和同步记录。
- 这两块不是“系统 seed 覆盖”，而是“本来就还没接数据库”；因此服务重启后恢复原数据属于当前实现边界。

## 本次修复

### 1. 接口供应商改为“人工保存优先，Seed 只补缺失值”

- 对已存在的系统 Provider，不再用 seed 强制覆盖后台已保存的这些字段：
  - `status`
  - `baseUrl`
  - `tutorialUrl`
  - `modelWhitelist`
  - `defaultModel`
  - `timeoutMs`
  - `streamEnabled`
  - `customHeaders`
  - `remark`
- `extraParams` 改为“当前值优先、seed 只补缺失项”：
  - 保留后台人工配置的运行时地址、查询路径、能力边界、超时等参数
  - 但仍会补齐缺失的系统元信息，比如 `runtimeKey`、`backendKey`、展示标签等
- 这样既能避免后台人工保存被整体回滚，也不会丢掉系统 seed 新增的缺失字段。

### 2. 第三方平台改为“人工保存优先，模型列表做并集补齐”

- 对已存在的系统平台，不再用 seed 覆盖后台已保存的这些字段：
  - `name`
  - `providerType`
  - `status`
  - `baseUrl`
  - `tutorialUrl`
  - `defaultModel`
  - `remark`
- `modelIds` 改为保留当前列表，并把 seed 中新增模型做并集补齐：
  - 不会丢掉后台已保存的模型列表
  - 也不会漏掉系统 seed 后续新增的模型 ID

## 影响范围

- 后端：
  - `ApiProvidersService`
  - `ThirdPartyPlatformsService`
- 后台管理页：
  - `接口供应商`
  - `第三方平台`
- 说明性边界：
  - `会员与积分规则`
  - `知识库管理`

## 验证建议

- 在后台分别修改一个系统 `API Provider` 和一个系统 `Third Party Platform`
- 保存后重启后端或走一次部署
- 再次进入后台确认：
  - 手工修改值是否仍保留
  - 系统 seed 新增但此前缺失的字段是否仍能自动补齐

## 后续建议

- 如果要让 `会员与积分规则`、`知识库管理` 也具备真正的跨部署持久化能力，需要单独补数据库表和持久化接口，不能继续依赖 `mock-data`
- 后续再新增后台“系统 seed + 后台可编辑”模块时，必须先定义清楚：
  - 哪些字段属于系统保底默认值
  - 哪些字段属于后台人工可覆盖值
  - 启动同步时到底是“强制回写”还是“仅补缺失值”

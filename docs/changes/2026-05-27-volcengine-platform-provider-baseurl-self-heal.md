# 2026-05-27 火山方舟平台匹配回归与关键地址自愈修复

## 背景

- 视频笔记最终生视频阶段再次出现：
  - `当前品牌未匹配到第三方平台配置`
- 这次不是视频轮询、状态暴露或火山方舟请求体本身的问题，而是后台配置持久化改造后带出的回归。

## 回归根因

### 1. 第三方平台匹配依赖系统平台 `baseUrl`

- 视频运行时在解析品牌 API Key 时，会按 `baseUrl` 或同 host 的平台记录去匹配品牌下已配置的平台。
- 火山方舟这类系统隐藏平台虽然前端不向用户暴露 `baseUrl`，但运行时仍然依赖数据库里的 `ThirdPartyPlatformConfig.baseUrl`。
- 只要历史数据库里该地址漂移，就会出现平台匹配失败。

### 2. “人工保存优先”把关键地址自愈能力冲掉了

- 之前为修后台保存后又被 seed 覆盖的问题，系统平台与系统 Provider 同步被改成“当前值优先，seed 只补缺失值”。
- 这对大多数后台可编辑字段是对的，但对下面这些运行时关键匹配地址不成立：
  - `ThirdPartyPlatformConfig.baseUrl`
  - `ApiProviderConfig.baseUrl`
  - `ApiProviderConfig.extraParams.baseUrls`
  - `ApiProviderConfig.extraParams.platformBaseUrls`
- 结果就是：
  - 历史错误地址被一直保留
  - 代码里的正确 seed 地址不再回正数据库
  - 火山方舟运行时匹配失败

## 本次修复

### 1. 系统平台只回正关键 `baseUrl`

- 更新文件：
  - `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
- 对已有系统平台保留原来的人工保存优先策略，但针对 `baseUrl` 增加单独判断：
  - 当前为空时，用 seed 地址补齐
  - 当前与 seed 归一化后相同，保留当前值
  - 当前与 seed 不同，回正为 seed 地址

### 2. 系统 Provider 只回正关键运行时地址

- 更新文件：
  - `apps/server/src/modules/admin/api-providers.service.ts`
- 对已有系统 Provider 继续保留人工保存优先，但以下关键字段改为按 seed 自愈：
  - `baseUrl`
  - `extraParams.baseUrls`
  - `extraParams.platformBaseUrls`
- 其余字段仍按原策略处理：
  - 后台人工值优先
  - seed 只补缺失项

## 影响范围

- 直接影响：
  - 火山方舟平台匹配
  - 视频笔记最终生视频阶段的品牌平台鉴权
- 间接影响：
  - 其他同样依赖系统隐藏平台 `baseUrl` 的运行时 Provider
- 不受这次修复回滚影响的字段：
  - 系统平台/Provider 的名称、备注、教程地址、模型白名单、默认模型等后台人工保存值

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/third-party-platforms/third-party-platforms.service.ts`
  - `apps/server/src/modules/admin/api-providers.service.ts`
- `npm --workspace apps/server run build`

## 后续约束

- 后续再改“系统 seed + 后台人工可编辑”模块时，要先区分两类字段：
  - 可交给后台长期覆盖的展示/运营字段
  - 必须由系统 seed 保底纠正的运行时关键匹配字段
- 尤其是 `baseUrl`、`baseUrls`、`platformBaseUrls` 这类会直接参与品牌平台匹配的字段，不能简单套用“当前值优先”。

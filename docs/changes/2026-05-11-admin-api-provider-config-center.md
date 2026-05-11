# 2026-05-11 后台接口供应商配置中心补齐

## 1. 背景

- 后台 `接口供应商` 页面原先只支持维护 `名称 / 类型 / Base URL / 模型白名单 / 密钥占位`
- 用户希望把所有第三方接口设置统一放到这里，至少能维护：
  - 名称
  - API 接口链接
  - 教程文档链接
  - API Key
  - 相关真实参数
- 原后端 `admin/api-providers` 仍主要依赖 `mock-data`，无法保证配置真正持久化

## 2. 本次处理

- 扩展后台接口供应商配置字段：
  - `tutorialUrl`
  - `apiKey`
  - `defaultModel`
  - `organization`
  - `project`
  - `timeoutMs`
  - `streamEnabled`
  - `customHeaders`
  - `extraParams`
  - `remark`
- 将后台接口供应商页的创建表单和编辑表单同步补齐为真实配置项
- 后端 `ApiProvidersService` 改为“数据库优先、mock 兜底”：
  - 数据库可用时自动创建 `ApiProviderConfig` 表
  - 首次命中时自动把 `mock-data` 中的默认 Provider 回填进表
  - 数据库不可用时仍回退到内存演示数据
- 前端对 `自定义 Headers` 和 `扩展参数` 增加 JSON 对象校验，避免保存非法结构
- 保留原有的状态、模型白名单、调用量、成功率、成本等运营观察信息

## 3. 影响文件

- `apps/web/src/app/(dashboard)/admin/page.tsx`
- `apps/web/src/services/admin.ts`
- `apps/server/src/modules/admin/api-providers.service.ts`
- `apps/server/src/common/mock-data.ts`

## 4. 验证结果

- `npm --workspace apps/server run build` 通过
- `npm --workspace apps/web run build` 通过
- `GetDiagnostics` 检查本次改动文件，无新增诊断报错

## 5. 当前边界

- 这次先解决后台接口供应商页的真实配置维护与持久化问题，当前已可维护名称、接口地址、教程文档、API Key 与扩展参数
- 下游生成链路里仍有部分第三方调用未完全切到统一 Provider 配置真源，后续可继续补“调用侧读取后台 Provider 配置”

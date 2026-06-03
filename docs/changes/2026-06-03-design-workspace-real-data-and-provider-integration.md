# 2026-06-03 设计工作台接入真实品牌数据与第三方模型配置

## 为什么改

- 设计工作台此前仍以静态前端假数据驱动，营销日历、产品、品牌资料和模型选项都没有读取真实系统数据
- 用户明确要求设计弹窗必须读取当前品牌数据，并让模型选择走第三方接口配置，而不是继续使用硬编码枚举
- `/more-features` 入口已经重定向到真实设计页，但 `docs/site-map*` 仍未同步设计工作台的真实链路和当前边界

## 这次改了什么

### 1. 设计工作台前端改为真实接口驱动

- `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
  - 创建弹窗改为调用 `apps/web/src/services/design.ts`
  - 营销日历下拉读取 `GET /api/works/brands/:brandId/design/options`
  - 产品下拉读取真实品牌产品，并补保留 `不植入产品`
  - 品牌资料开关读取真实后端返回的 `inject/skip`
  - 模型下拉读取真实运行时 Provider，并提交 `providerId::modelName`
  - 提交创建改为调用 `POST /api/works/brands/:brandId/design/generate`
  - 作品详情区支持展示真实生成结果，HTML 结果可在当前页直接预览

### 2. 设计工作台后端正式承接真实数据聚合与生成

- `apps/server/src/modules/works/works.controller.ts`
  - 新增设计工作台 options/generate 两个接口
- `apps/server/src/modules/works/works.service.ts`
  - 聚合品牌档案、产品、营销日历、图像/文本 Provider 模型列表
  - 按模块把设计生成分流到图像生成或文本生成链路
  - 继续复用品牌级第三方平台密钥解析和作品资产持久化能力

### 3. 文档同步

- `docs/site-map.md`
  - 补齐 `/more-features` 与 `/more-features/design` 入口
  - 补齐设计工作台的数据来源、接口和当前边界说明
- `docs/site-map-mermaid.md`
  - 补齐设计工作台的页面、service、API、模块与数据模型关系图

## 影响范围

- 前端设计工作台
- `WorksModule` 设计生成链路
- 站点地图与变更记录

## 当前边界

- 当前作品区展示的是本次会话内创建成功的设计结果，尚未补独立“历史设计作品列表”查询接口
- 设计工作台沿用 `personalCenter.works` 权限做首版鉴权，尚未单独拆出 `design.*` 权限键

## 验证

- 对设计工作台前端壳层运行 TypeScript/诊断检查
- 对 `works.controller.ts`、`works.service.ts` 保持无新增诊断
- 对 `docs/site-map.md`、`docs/site-map-mermaid.md`、本变更记录进行同步检查

## 后续建议

- 增加设计工作台历史作品查询接口，让刷新后仍能看到历史结果
- 评估是否为设计工作台单独拆分权限键，避免长期借用 `personalCenter.works`

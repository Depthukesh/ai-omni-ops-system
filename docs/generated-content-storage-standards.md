# 生成内容存储规范

## 1. 目标

- 统一原创笔记、二创笔记、视频笔记生成内容的存储方式
- 避免图片、视频仅依赖第三方临时链接，导致历史作品失效
- 让作品记录、预览、发布、删除、追踪都基于同一套稳定数据结构

## 2. 适用范围

- 小红书原创笔记
- 小红书二创笔记
- 小红书视频笔记
- 品牌增长报告、可视化报告、半年营销规划、小红书营销策划方案等 HTML 产物
- 品牌资料库中的产品图片、资料附件等上传素材
- 用户头像等用户上传图片素材
- 后续所有生成型图文/视频作品与需要长期访问的业务上传文件

## 3. 当前统一原则

- 生成结果必须同时具备“数据库记录”和“本站可控资源副本”
- 文案主记录统一落 `MediaAsset(HTML)`
- 图片结果统一落 `MediaAsset(IMAGE)`
- 视频结果统一落 `MediaAsset(VIDEO)`
- 任务过程统一落 `Task`

## 4. 当前存储模型

### 4.1 Task

- 用于记录生成过程
- 必须包含：
- `taskType`
- `taskStatus`
- `taskTitle`
- `modelName`
- `inputJson`
- `outputJson`
- `errorMessage`

### 4.2 MediaAsset

- 用于记录最终作品和资源
- 必须包含：
- `mediaType`
- `taskId`
- `title`
- `sourceUrl`
- `storageKey`
- `metadataJson`

### 4.3 受控资源副本

- 当前以下资源均统一持久化到 OSS：
- `works` 生成资源：`works/<brandId>/<fileName>`
- `reports` HTML 产物：`reports/<brandId>/<fileName>`
- 原创参考模板素材：`reference-templates/xiaohongshu/original/<categoryId>/<fileName>`
- 品牌产品图片：`brands/<brandId>/product-images/<fileName>`
- 品牌资料附件：`brands/<brandId>/asset-files/<fileName>`
- 用户头像：`users/<userId>/avatars/<fileName>`
- 对外访问统一仍优先走站内接口：
- `/api/works/brands/:brandId/assets/:fileName`
- `/api/reports/brands/:brandId/assets/:fileName`
- `/api/works/xiaohongshu/original/reference-templates/:templateId/asset`
- `/api/brands/:id/product-images/:fileName`
- `/api/brands/:id/asset-files/:fileName`
- `/api/auth/users/:userId/avatar/:fileName`
- 站内接口负责按 `storageKey` 从 OSS 读取，不再把 `.runtime/generated-works/` 或其他本地目录当作正式真源
- 仅在本地开发且未配置 OSS 时，允许暂时回退到 `.runtime/local-oss/<storageKey>` 作为联调副本；但站内接口、`storageKey` 前缀与业务记录结构必须保持和正式 OSS 链路一致
- `local-single-user` 安装态新增“本地资料目录”设置后，`LOCAL_APP_DATA_ROOT/storage` 主要承接安装态本地运行资料与副本目录；这项设置本身不等于把作品、报告、媒体正式真源从 OSS 切成本地目录
- 若已配置 OSS 但当前运行环境不在阿里云内网，`OSS_INTERNAL` 应保持关闭或不配置；只有明确需要走阿里云内网 endpoint 时才开启 `OSS_INTERNAL=true`

## 5. 三类作品存储要求

### 5.1 原创笔记

- 主文案存 `HTML` 作品记录
- 封面图存 `IMAGE` 资源记录
- 配图存 `IMAGE` 资源记录
- `metadataJson` 记录标题、正文、提示词、模型、图片关系、时间戳

### 5.2 二创笔记

- 主文案存 `HTML` 作品记录
- 封面图存 `IMAGE` 资源记录
- 配图存 `IMAGE` 资源记录
- `metadataJson` 记录来源素材、标题、正文、提示词、模型、图片关系、时间戳

### 5.3 视频笔记

- 主文案存 `HTML` 作品记录
- 成片视频存 `VIDEO` 资源记录
- 视频封面优先存本站副本 URL
- `metadataJson` 记录标题、正文、视频提示词、分镜提示词、模型、provider、时间戳

## 6. 强制规则

### 6.1 文案

- HTML 主记录必须写入受控持久化副本
- 不允许只在内存或任务返回值中保留正文

### 6.2 图片

- 生成图片必须先下载或直接写入受控持久化副本，再写入 `MediaAsset`
- 不允许把第三方临时图片 URL 作为唯一正式存储地址

### 6.3 视频

- 生成视频必须先下载并写入受控持久化副本，再写入 `MediaAsset`
- 第三方返回的 `videoUrl` 只能作为中间输入，不能作为最终唯一存储地址

### 6.4 元数据

- `metadataJson` 只保存结构化业务字段
- 不在 `metadataJson` 中保存大体积二进制
- 不把第三方临时链接当作唯一主键关系

## 7. 删除与更新规则

- 删除作品或附件时，同时删除对应 OSS 对象副本
- 更新作品文案或报告 HTML 时，同时更新 OSS 中的 HTML 副本与 `metadataJson`
- 更新头像、产品图、资料附件等上传资源时，新对象必须直接写入 OSS，不回退本地目录
- 更新资源引用时，优先覆盖 OSS 副本关系，不直接改回第三方外链
- 原创参考模板素材不进入前端静态目录；新增或替换模板时，统一通过导入脚本批量写入 `reference-templates/xiaohongshu/original/...`，再更新模板清单

## 8. 发布前校验规则

- 发布前只使用本站可访问的图片和视频地址
- 发现资源失效时，必须在站内直接报错
- 不把失效资源继续交给扩展或手机接力页

## 9. 后续扩展要求

- 后续新增“营销海报”“短视频封面”“长视频剪辑稿”等内容时，沿用同一模型
- 统一遵循：
- `Task` 记录过程
- `MediaAsset` 或 `BusinessAsset` 记录结果索引
- 业务对象统一使用明确前缀的 `storageKey`
- `metadataJson` 保存结构化业务信息

## 10. 当前执行结论

- 文案已基本进入规范化存储
- `works` 主链路现已改为纯 OSS 存储，站内保留统一资产读取入口
- `reports` 的品牌增长报告、可视化报告、半年营销规划、小红书营销策划方案 HTML 产物已真实写入 OSS
- 本地开发若缺失 OSS 配置，`OssStorageService` 现可回退到 `.runtime/local-oss`，避免报告生成在“保存 HTML 附件”阶段直接 500；生产态仍坚持 OSS 真源
- 品牌产品图与品牌资料附件已改为 OSS 真源，站内读取接口直接代理 OSS 对象
- 用户头像已支持真实上传到 OSS，并通过站内头像接口读取
- 原创参考模板库也已纳入相同存储边界：导入脚本会优先写 OSS，开发态缺失 OSS 时回退 `.runtime/local-oss`，前端始终只认站内模板资产接口
- 原创/二创图片已进入受控副本链路
- 视频成片与视频封面已开始补齐受控副本链路
- 下一阶段继续收口历史外链资源、演示种子占位链接和更多作品类型

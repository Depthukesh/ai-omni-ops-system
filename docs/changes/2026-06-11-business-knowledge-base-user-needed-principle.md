# 2026-06-11 企业知识库重构与用户需要原则

## 背景

- 原企业知识库页面沿用“先新增资料、再从资料 metadata 反推后台知识库容器”的旧模型
- 前台弹窗直接暴露了 `knowledgeBaseSlug`、`targetId`、`targetKey`、绑定目标等系统字段
- 这与当前产品要求的“知识库优先”和“用户需要原则”不一致

## 本次调整

### 1. 品牌侧企业知识库切到知识库优先

- 新增品牌域知识库接口：
- `GET /brands/:id/business-knowledge-bases`
- `POST /brands/:id/business-knowledge-bases`
- `PATCH /brands/:id/business-knowledge-bases/:knowledgeBaseId`
- `DELETE /brands/:id/business-knowledge-bases/:knowledgeBaseId`
- 新增品牌域资料接口：
- `GET /brands/:id/business-knowledge-bases/:knowledgeBaseId/files`
- `POST /brands/:id/business-knowledge-bases/:knowledgeBaseId/files`
- `GET /brands/:id/business-knowledge-bases/:knowledgeBaseId/files/:fileId`
- `DELETE /brands/:id/business-knowledge-bases/:knowledgeBaseId/files/:fileId`

### 2. 企业知识库前端交互改为用户视角

- 企业知识库主页面入口改为“新增知识库”
- 新增知识库只要求填写名称和简介
- 主视图改为知识库卡片列表，不再展示“后台知识库容器”
- 点开知识库后，顶部提供：
- 添加资料
- 知识库设置
- 资料列表按列表形式展示，每项提供：
- 编辑
- 删除
- 添加资料流程只处理文件上传、资料说明、优先级，不再混入系统设置
- 资料上传后自动触发切片，并可在资料详情里查看切片和同步记录

### 3. 同步链路改为知识库设置优先

- 品牌知识库同步时，知识库设置成为主数据源
- 资料 metadata 不再反向覆盖知识库名称、简介、检索配置
- 知识库在没有资料时会继续保留，不会因为同步过程被自动删除
- 知识库文件 ID 改为与品牌资料稳定关联，便于前台进行资料级编辑和删除

## 文档规范补充

- `docs/engineering-standards.md` 已新增“用户需要原则”
- 后续所有前台创建弹窗、设置页、表单字段设计，默认都要遵守：
- 只展示用户必须理解和必须填写的字段
- 系统内部 ID、slug、targetKey、调试字段不进入正式业务界面
- 创建流程优先最小必要输入，复杂设置后置到独立设置页

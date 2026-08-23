# 混剪模式对接交付包说明

这个压缩包不是整仓库源码，而是给另一套系统开发人员使用的“混剪模式对接交付包”。

## 交付目的

用于让对方开发人员：

1. 了解混剪模式的接口契约
2. 评估如何把混剪能力接入另一套系统
3. 参考核心实现代码
4. 在需要时本地拉起一个可研究的最小运行集合

## 先看哪些文件

建议阅读顺序：

1. `开发文档/混剪模式对接开发说明.md`
2. `README.md`
3. `backend/api/remix_api.py`
4. `backend/services/remix_service.py`
5. `backend/services/task_service.py`

如果对方主要做 HTTP 对接，重点看：

- `开发文档/混剪模式对接开发说明.md`
- `backend/api/remix_api.py`
- `backend/api/upload_routes.py`

如果对方主要做 Python 源码嵌入，重点看：

- `backend/services/remix_service.py`
- `backend/services/task_service.py`
- `backend/database/db_manager.py`
- `backend/engine/*.py`

## 为什么不是整个仓库

这次交付目标是“混剪模式对接开发”，不是整套产品移交。

因此本包只保留：

1. 混剪模式相关文档
2. 混剪所需核心后端代码
3. 支撑混剪运行的引擎、数据库、工具模块
4. 参考前端页面
5. 基础依赖与 Docker 启动文件

未包含：

1. 与原创解说、封面、系统设置等无关的大量页面资源
2. 非混剪主链路的完整静态资源
3. 运行时数据库、日志、上传素材、输出成片
4. 模型权重和用户私有配置

## 重要提醒

1. 这套能力当前仍然是“本地文件路径优先”架构。
2. 若对方系统素材在 OSS / S3，需要先落地到本地文件再调用。
3. 真正落地时，建议优先使用 HTTP 接入，而不是直接拆源码。
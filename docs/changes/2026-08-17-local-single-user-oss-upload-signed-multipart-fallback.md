# 2026-08-17 local-single-user OSS 大包上传改为可重试 signed multipart fallback

## 1. 背景

在发布 `hotfix-72` 时，`AiOmniOps-local-single-user-win-x64.zip` 大约 252MB。

原来的 `scripts/upload-local-single-user-release-to-oss.cjs` 继续走 `ali-oss` 自带 `multipartUpload()`，实际上传过程中多次出现：

- `ECONNRESET`
- `socket hang up`
- `callback twice!!!`

导致 zip 已经打好，但 `latest.json` 长时间无法切到新版本，笔记本机器也就拉不到新的升级包继续验证“立即升级”链路。

## 2. 根因

本次问题不在业务代码，而在发布链对大文件上传实现的依赖过于单一：

1. 超过阈值的大包默认完全依赖 `ali-oss multipartUpload()`
2. 一旦底层 `urllib` 在长连接或某个分片上传时抖动，整次上传就容易中断
3. 旧脚本没有把“初始化 multipart / 实际传分片 / complete”拆开，也没有把失败粒度收敛到单个 part 重试

结果就是：

- 小文件可以继续正常上传
- 大 zip 在真实网络波动场景下成功率不足

## 3. 本次改动

修改文件：

- `scripts/upload-local-single-user-release-to-oss.cjs`

具体调整：

1. 对于超过阈值的大文件，不再直接调用 `ali-oss multipartUpload()`
2. 改为：
   - 用 SDK 发起 `initMultipartUpload`
   - 为每个分片生成 signed URL
   - 用 Node 原生 `fetch` 单独 `PUT` 每个分片
   - 每个 part 支持受控重试
   - 全部分片成功后再调用 `completeMultipartUpload`
3. 如果中途失败，主动 `abortMultipartUpload`，避免 OSS 留下一批悬挂 uploadId

## 4. 影响面检查

### 4.1 本次影响范围

- `local-single-user` 发布包上传 OSS 的脚本
- 大体积 zip 的上传稳定性

### 4.2 本次未改动范围

- 前后端运行时
- 安装器逻辑
- 更新检查协议
- `latest.json` 结构

## 5. 验证

已完成：

- `node --check scripts/upload-local-single-user-release-to-oss.cjs`

待继续：

- 用新上传逻辑重新上传 `hotfix-72`
- 确认 zip、`.sha256`、`latest.json` 都已落到 OSS
- 再让笔记本继续验证“立即升级”

## 6. 当前结论

这次不是继续给 `ali-oss multipartUpload()` 外面包更多重试，而是把失败边界收敛到单个分片，让大包上传在真实网络抖动下也能继续推进。

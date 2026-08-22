# 2026-08-14 local-single-user OSS 区域归一化修复

## 1. 背景

在上传 `local-single-user-win-x64-2026-08-14-hotfix-56` 到 OSS 时，脚本报错：

- `getaddrinfo ENOTFOUND bucketwangxiaodong.cn-beijing.aliyuncs.com`

本地 OSS 配置文件里给的是地域：

- `cn-beijing`

但上传脚本直接把它拼成了：

- `https://bucketwangxiaodong.cn-beijing.aliyuncs.com`

这不是阿里云 OSS 的有效域名。

## 2. 根因

`scripts/upload-local-single-user-release-to-oss.cjs` 之前默认假设 `OSS_REGION` 已经是完整的 OSS 区域标识，并直接同时用于：

- `ali-oss` client 的 `region`
- 对外下载地址 `publicBaseUrl`

如果传入的是普通地域值 `cn-beijing`，脚本不会自动补齐为：

- `oss-cn-beijing`

于是：

- 上传 client 的 endpoint 口径错误
- `latest.json` 里的公开下载地址也会错误

## 3. 本次改动

文件：`scripts/upload-local-single-user-release-to-oss.cjs`

新增：

- `normalizeOssRegion(region)`

规则：

- 如果输入已是 `oss-` 开头，则保持不变
- 如果输入是 `cn-beijing` 这类普通地域值，则自动转为 `oss-cn-beijing`

并统一用于：

- `ali-oss` client 的 `region`
- 默认 `publicBaseUrl`

## 4. 影响范围

- 仅影响本地单机版发布包上传 OSS 的脚本
- 不影响业务运行时
- 不影响前后端页面或接口

## 5. 验证

已完成：

- 复现旧错误域名 `bucketwangxiaodong.cn-beijing.aliyuncs.com`
- 代码层确认现在会自动归一化为 `oss-cn-beijing`

待继续：

- 使用本地 OSS 凭据重新上传 `hotfix-56`
- 确认 `latest.json`、zip、sha256 都成功落到 OSS

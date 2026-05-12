# 2026-05-12 Feishu Wiki Base Token Resolve Hardening

## 背景
- 品牌增长策略页在绑定飞书 `wiki` 副本链接后，执行“从飞书同步”会报错：`当前链接尚未解析出 Base Token，请优先绑定飞书多维表格 base 链接。`
- 根因不是前端未传参，也不是默认 OAuth scope 缺失，而是后端在 `wiki -> bitable app_token` 解析时主要依赖抓取飞书页面 HTML，页面结构变化或鉴权态不同就会解析失败。

## 本次调整
- `apps/server/src/modules/collectors/collectors.service.ts`
  - `syncFeishuWorkspace()` 改为先取当前品牌所属用户的 `user_access_token`，再解析飞书副本对应的 `baseToken`
  - `resolveFeishuBaseToken()` 改为优先调用飞书开放平台 `GET /open-apis/wiki/v2/spaces/get_node`
  - 新增 `tryResolveBaseTokenFromWikiNode()`，从 wiki 节点响应中的 `obj_type` / `obj_token` 解析真实 bitable token
  - 仅当 OpenAPI 解析失败时，才回退到旧的 HTML 抓取逻辑
  - 无法解析时的报错补充为“也可能是当前授权用户已失去该飞书副本访问权限”

## 影响
- 用户在品牌增长策略页继续保存 `wiki` 副本链接时，不再强依赖页面 HTML 结构
- 只要当前授权飞书账号仍对该 wiki 节点有读取权限，就能稳定解析到后续同步所需的 bitable `app_token`
- 若文档权限被移除，错误信息也更接近真实原因

## 验证
- `npm run build:server`
- `collectors.service.ts` 诊断无报错

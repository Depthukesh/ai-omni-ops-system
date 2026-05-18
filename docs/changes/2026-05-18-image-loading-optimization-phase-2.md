# 2026-05-18 图片加载优化第二版

## 1. 变更背景

- 图片加载优化第一版已经收紧了首屏并发请求，但受保护媒体仍存在“重复拉取”的问题
- 小红书素材库中的飞书媒体在卡片滚动离开后会释放 object URL，回滚时会再次发起鉴权请求
- 品牌增长策略里的飞书作品附件预览也复制了一套 `requestBlobByUrl -> createObjectURL` 逻辑，跨页面无法共享缓存
- 小红书工作区里仍有少量图片入口未接统一图片组件

## 2. 变更目标

- 继续在不改接口协议的前提下，减少受保护媒体的重复请求和重复 `createObjectURL`
- 把跨工作区重复的 blob 读取逻辑收口成共享 hook，降低后续继续扩散的成本
- 补齐小红书剩余图片入口的统一加载参数

## 3. 修改内容

### 3.1 前端共享能力

- 新增 `apps/web/src/app/(dashboard)/use-protected-media-asset.ts`
  - 统一封装受保护媒体的鉴权拉取、object URL 创建、短时缓存与并发去重
  - 同一 `sourceUrl` 在页面会话内重复预览时，优先复用已存在的 object URL
  - 当多个卡片同时请求同一资源时，共享同一个进行中的 Promise，避免重复并发 fetch
  - 当资源暂时离开视口或组件卸载后，不立即释放；保留短时空闲 TTL，降低滚动回看时的再次请求概率

### 3.2 小红书工作区

- `apps/web/src/app/(dashboard)/xiaohongshu/assets-workspace.tsx`
  - 素材库的受保护媒体预览改接共享 hook
  - 继续保留第一版的“接近视口才加载”，但同一素材在滚动回看、再次选中或重复打开时不再总是重新请求
- `apps/web/src/app/(dashboard)/xiaohongshu/publish-modal.tsx`
  - 手机扫码接力二维码改接统一图片组件
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
  - 视频详情里的故事板图片改接统一图片组件

### 3.3 品牌增长策略

- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`
  - 品牌作品与对标作品中的受保护附件图片/视频改接共享 hook
  - 降低在品牌增长页翻页、重复打开附件和跨卡片回看时的重复鉴权请求

## 4. 修改意图

- 第一版解决的是“首屏不要一下子全打出去”，第二版解决的是“已经打过的不要反复再打”
- 先做前端会话级共享缓存，是因为这一步不需要改后端协议，也不会影响当前鉴权模型
- 把逻辑抽到 `(dashboard)` 共享层，是为了避免 `brand-growth` 和 `xiaohongshu` 继续各自复制一份 blob 预览实现

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
  - `/brand-growth`
- 影响模块：
  - 小红书素材库
  - 品牌增长策略中的飞书作品附件预览
  - 小红书发布弹窗
  - 视频笔记详情区
- 不影响接口协议
- 不影响数据库结构

## 6. 验证方式

- `GetDiagnostics` 检查新增共享 hook 和相关页面文件的类型诊断
- `npm run build:web`
- 手工验证重点：
  - 小红书素材库滚动到图片后正常加载，滚回再看不应重复明显闪烁
  - 品牌增长策略里的作品附件图片/视频仍可预览和下载
  - 手机扫码发布二维码仍可正常显示
  - 视频笔记详情里的故事板图片仍可正常显示

## 7. 风险与后续

- 当前仍然是浏览器会话级缓存，不是服务端缩略图服务或 CDN
- 若后续同页长时间加载大量不同受保护媒体，仍需继续评估 object URL 的内存占用
- 下一步更合适的方向：
  - 图片规格继续往 `thumbnail / preview / original` 三层推进
  - 把小红书和品牌增长中图片密集区继续拆出更明确的 shared 资源层
  - 评估受保护媒体是否需要服务端落盘缓存或签名直链

## 8. 相关文件

- `apps/web/src/app/(dashboard)/use-protected-media-asset.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/assets-workspace.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/publish-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspaces.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/use-near-viewport.ts`
- `apps/web/src/app/(dashboard)/brand-growth/collection-workspace.tsx`

# 抖音复刻短视频兜底与删除修复

## 1. 背景

- 复刻短视频点击“创建复刻视频”后，前端请求实际上已经成功发出，但任务会在第一阶段很快失败。
- 任务中心报错显示为“模型未返回有效 JSON”，且实际尝试顺序只有 `KIMI/kimi-k2.6`，没有继续落到 `deepseek-v4-pro / deepseek-v4-flash / doubao`。
- 同时，复刻短视频工作区的“作品列表”缺少删除按钮，导致失败任务和不再需要的工作区无法直接清理。

## 2. 根因

### 2.1 文本阶段 fallback 被 provider 选择规则裁掉

- 复刻短视频第一阶段和第二阶段都走 `requestVideoStageJson()`。
- 该函数会读取技能中心当前首选模型，例如 `kimi-k2.6`。
- 随后又调用 `loadOriginalCopyProviders()`，而其中套用了 `applyTextProviderSelectionRule(...)`。
- 一旦首选模型命中了 `KIMI` provider，这条规则会把后面的 `DEEPSEEK / ARK / THIRD_PARTY` 整个裁掉，导致 fallback 链失效。

### 2.2 作品工作区缺少删除入口

- 前端 `DouyinRemixShortVideoWorkspace` 只有“预览完整视频 / 一键生成视频”，没有删除按钮。
- 后端 `works.controller.ts` 和 `works.service.ts` 里也没有 `deleteDouyinRemixShortVideo(...)` 专用接口。

## 3. 本次调整

### 3.1 保留视频阶段的完整 fallback provider 链

- `requestVideoStageJson()` 现在改为调用：
  - `loadOriginalCopyProviders(brandId, preference, true)`
- 新增 `preserveFallbackProviders` 参数后：
  - 仍然按技能中心首选模型排序优先尝试；
  - 但不再把后续 provider 过滤掉；
  - 从而允许 `KIMI -> DEEPSEEK -> DOUBAO` 继续顺序兜底。

### 3.2 复刻短视频 fallback 模型顺序补强

- 第一阶段拉片分析 fallback 顺序调整为：
  - `kimi-k2.6`
  - `deepseek-v4-pro`
  - `deepseek-v4-flash`
  - `doubao-seed-2-0-pro-260215`
- 第二阶段分段提示词 fallback 顺序同步调整为以上顺序。

### 3.3 增加复刻短视频删除能力

- 新增后端接口：
  - `DELETE /works/brands/:brandId/douyin/remix-short-video/:workId`
- 新增服务端删除逻辑：
  - 删除工作区 HTML 记录；
  - 删除同 taskId 下关联 media 记录；
  - 删除 task 记录；
  - 清理本地可识别的源视频、参考图、分镜图、分段视频、拼接成片、封面图等生成文件。
- 前端 `works.ts` 增加 `deleteDouyinRemixShortVideoWork(...)`。
- 前端 `DouyinRemixShortVideoWorkspace` 在：
  - 左侧作品列表卡片；
  - 右侧详情操作区；
  都补上删除按钮，并增加确认提示。

## 4. 验证

- `GetDiagnostics`：
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/server/src/modules/works/works.controller.ts`
  - `apps/web/src/app/(dashboard)/douyin/remix-short-video-workspace.tsx`
  - `apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx`
  均通过。
- 执行：
  - `npm --workspace apps/server run build`
  - `npm --workspace apps/web run build`
  均通过。

## 5. 影响范围

- 页面：`/douyin` 下的“复刻短视频”工作区。
- 功能：
  - 创建复刻短视频后的第一阶段/第二阶段文本生成；
  - 复刻短视频作品列表与详情删除。

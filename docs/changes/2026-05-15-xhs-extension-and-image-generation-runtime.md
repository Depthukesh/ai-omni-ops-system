# 2026-05-15 小红书发布扩展修复与图片生成运行时补强

## 1. 变更背景

- 用户反馈小红书“一键发布”明明已安装扩展，弹窗里仍长期显示“等待电脑端扩展”。
- 用户反馈生成图片存在两类问题：
  - 中文标题和标签会超出画面边界，成品图观感差。
  - 上传参考图后，最终生成图与参考图关联很弱，怀疑参考图只在拆解阶段被使用，没有真正参与最终生图。
- 用户要求把“图片生成”从原先只有“配图提示词”提升为前后台都可配置的独立技能。

## 2. 本次目标

- 修复线上 `https://17ai.site` 工作台与浏览器扩展的握手失败问题。
- 在发布弹窗补入扩展下载入口和安装教程页面。
- 查清并修复参考图从拆解到最终出图的断链问题。
- 为原创/二创最终出图补上独立的图片生成技能和提示词源文件。

## 3. 本次修改

### 3.1 小红书发布扩展

- 更新 `apps/web/public/extensions/xhs-draft-publisher/manifest.json`
- 将工作台注入范围从宽泛 `http://*/*` 调整为明确的：
  - `http://localhost/*`
  - `http://127.0.0.1/*`
  - `https://17ai.site/*`
  - `https://www.17ai.site/*`
  - `https://creator.xiaohongshu.com/*`
- 将扩展版本升级到 `0.1.1`，解决线上工作台没有注入 `content-script.js` 导致永远收不到 `PONG` 的问题。
- 更新 `apps/web/src/app/(dashboard)/xiaohongshu/desktop-publish-bridge.ts`
- `probeDesktopPublisher()` 默认超时提升到 `2400ms`，并在探测窗口内每 `500ms` 重发一次 `PING`。
- 更新 `apps/web/src/app/(dashboard)/xiaohongshu/use-publish-flow.ts`
- 打开发布弹窗后增加周期性重探测，避免扩展刚加载或浏览器较慢时被误判为未连接。
- 更新 `apps/web/src/app/(dashboard)/xiaohongshu/publish-modal.tsx`
- 在弹窗中新增“下载扩展插件”“查看安装教程”两个入口，并补充站点访问权限说明。
- 新增 `apps/web/src/app/help/xhs-draft-publisher/page.tsx`
- 提供独立帮助页，说明安装步骤、必须授权的站点和常见问题。
- 更新 `apps/web/public/extensions/xhs-draft-publisher/README.md`
- 同步记录 `17ai.site / localhost / creator.xiaohongshu.com` 的授权要求。

### 3.2 图片生成运行时

- 更新 `apps/server/src/modules/works/works.service.ts`
- 原创链路现在会先拆解上传参考图，再在最终 `generateImageAsset()` 阶段把上传参考图原图一起传给图像模型，不再只传产品图或外部 URL。
- 新增 `buildImageGenerationReferenceInputs()`，统一合并上传参考图的 data URL 与产品图/素材图 URL。
- 新增 `loadImageGenerationExecutionConfig()`，让最终出图模型与提示词真正来自独立的图片生成技能，而不是继续复用“配图提示词”技能。
- 强化最终出图 prompt，增加竖版比例、中文排版、标题层级和 8% 安全边距约束，降低文字出界概率。
- 将 `images-generations` 请求尺寸从固定方图 `1024x1024` 改为直接请求小红书竖版 `1242x1660`，让上游模型尽量按目标成品尺寸出图，而不是先生成方图再依赖后处理收口。
- 修正保存前的成品图规范化策略：过去会把生成图统一用 `fit: "cover"` 强裁成 `1242x1660`，当上游返回方图时会把左右边缘文字直接裁掉；现在改为按比例差判断，方图或比例差过大的图片走 `contain + 白底补边`，避免标题和标签在落盘阶段被二次裁切。
- 新增参考图优先通道策略：当本次生成携带封面/配图参考图时，运行时会优先尝试 `images-generations` provider，而不是先走旧的 `chat-completions` 图片 provider，避免参考模板只被弱参考、没有真正形成图生图垫图效果。
- 真实链路结论同步明确：
  - 旧链路中，参考图会先进入 `analyzeReferenceImages()` 生成文字化“风格档案”。
  - 旧链路的最终图片生成阶段并没有继续把用户上传参考图原图传给模型。
  - 本次已补上这一步，让参考图同时参与“风格拆解”和“最终生图”。
  - 进一步核对后确认：如果运行时优先命中了旧的 `chat-completions` 图片 provider，参考图会弱化为附件输入，导致“选了封面模板但最终成品和模板无明显关联”；现在携带参考图时会优先切到真正的 `images-generations` 通道。

### 3.3 图片生成技能注册

- 更新 `apps/server/src/common/prompt-source-loader.ts`
- 新增：
  - `prompt_xhs_original_image_generation`
  - `prompt_xhs_rewrite_image_generation`
- 优先支持读取仓库内 `提示词/original_image_generation/SKILL.md` 与 `提示词/rewrite_image_generation/SKILL.md`。
- 新增：
  - `提示词/original_image_generation/SKILL.md`
  - `提示词/rewrite_image_generation/SKILL.md`
- 明确区分“提示词生成阶段”和“最终图片生成阶段”的职责，并补充参考图强跟随与文字安全区约束。
- 更新 `apps/server/src/common/mock-data.ts`
- 新增：
  - `skill_xhs_original_image_generation`
  - `skill_xhs_rewrite_image_generation`
  - `prompt_xhs_original_image_generation`
  - `prompt_xhs_rewrite_image_generation`
- 更新 `apps/server/src/modules/admin/skills-prompts.service.ts`
- 为原创/二创图片生成技能补入技能与提示词绑定。
- 更新 `apps/web/src/app/(dashboard)/admin/page.tsx`
- 后台技能中心新增“原创笔记-图片生成”“二创笔记-图片生成”两个三级节点。

## 4. 验证结果

- `GetDiagnostics`
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/modules/works/works.service.ts`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/desktop-publish-bridge.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/publish-modal.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/use-publish-flow.ts`
  - `apps/web/src/app/help/xhs-draft-publisher/page.tsx`
  - `apps/web/src/styles/globals.css`
- `npm --workspace apps/server run build` 通过
- `npm --workspace apps/web run build` 通过

## 5. 风险与后续

- 当前图片文字越界问题虽然已修正“保存前强裁切”这一类后处理问题，但仍未引入本地二次贴字、OCR 校验或边界检测兜底，因此最终排版质量仍部分依赖模型自身输出。
- 扩展下载链接依赖站点静态资源中存在 `xhs-draft-publisher.zip`；本次代码收口后还需要同步生成压缩包。
- 个人中心技能中心不需要单独写死新技能 UI，前提是后台技能注册表和提示词源文件保持同步可读。

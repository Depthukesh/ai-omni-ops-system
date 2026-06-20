# 企业知识库上传格式扩展

## 1. 变更背景

- 企业知识库“添加资料”弹窗此前没有明确写出支持的文件格式，用户在上传前无法判断图片、音频、视频等资料能否接入。
- 前端虽然可以上传更多文件，但后端正文抽取主要针对文档类格式，二进制文件缺少清晰的同步策略说明。
- 产品需要在知识库板块里明确支持范围，并优先保证用户上传图片、音频等文件时不会产生错误或乱码切片。

## 2. 变更目标

- 在企业知识库“添加资料”弹窗中明确展示支持上传的格式。
- 扩展文件选择器的 `accept` 范围，让图片、音频、视频、压缩包等资料可以直接选择上传。
- 后端对二进制文件采用安全兜底策略，避免把原始二进制内容误当正文切片。

## 3. 修改内容

### 3.1 前端

- 在 `apps/web/src/app/(dashboard)/brand-growth/business-knowledge-workspace.tsx` 为知识库上传弹窗新增格式说明。
- 上传区现在明确展示以下支持范围：
  - 文档：PDF、Word、Excel、CSV、TXT、Markdown、JSON、XML、HTML
  - 图片：JPG、JPEG、PNG、WEBP、GIF、BMP、SVG、TIFF、HEIC
  - 音频：MP3、WAV、M4A、AAC、OGG、FLAC
  - 视频：MP4、MOV、WEBM、M4V、AVI
  - 其他：PPT、PPTX、ZIP、RAR、7Z
- 为上传输入框补充 `accept`，让用户在系统文件选择器里能直接选择这些格式。

### 3.2 后端

- 在 `apps/server/src/modules/brands/brands.service.ts` 扩展企业知识库桥接层的文件类型识别，新增：
  - `IMAGE`
  - `AUDIO`
  - `VIDEO`
  - `ARCHIVE`
- 在 `apps/server/src/modules/admin/knowledge-bases.service.ts` 扩展知识库文件类型识别和分片估算规则。
- 正文抽取策略调整为：
  - `PDF / DOCX / XLSX / MD` 继续按正文抽取
  - `IMAGE / AUDIO / VIDEO / ARCHIVE / LINK` 不再尝试直接按文本解码
  - 这类文件统一走 metadata fallback，只按文件名、类型、来源生成占位分片

### 3.3 类型同步

- 在 `apps/server/src/common/mock-data.ts` 和 `apps/web/src/services/admin.ts` 中同步扩展知识库文件类型联合类型。

## 4. 修改意图

- 先把“用户能不能传、系统怎么处理”说清楚，比只开放上传按钮但不给边界更符合用户需要原则。
- 对图片、音频、视频这类资料，当前阶段优先保证“可上传、可归档、可进入知识库”，避免误切片乱码。
- 后续如果需要 OCR、语音转写、视频字幕抽取，可以在现有文件类型基础上继续补强，不影响当前上传链路。

## 5. 影响范围

- 影响页面：`/brand-growth` 下企业知识库板块的“添加资料”弹窗。
- 影响模块：品牌知识库文件上传、品牌知识库同步、后台知识库文件类型识别。
- 对现有文档类上传无破坏性影响。

## 6. 验证方式

- 手工验证：
  - 打开企业知识库，点击“添加资料”，确认弹窗里出现支持格式说明。
  - 点击“选择文件”，确认文件选择器可选择图片、音频、视频和压缩包。
  - 上传图片或音频后，资料可成功进入知识库列表并触发同步。
- 编译验证：
  - 执行前端与后端文件诊断。
  - 执行 `npm run build:web`。
  - 执行 `npm --workspace apps/server run build`。

## 7. 风险与后续

- 当前图片、音频、视频、压缩包仍以 metadata fallback 为主，尚未做 OCR、ASR、字幕抽取或压缩包解包。
- 如果后续要支持真正的图片识别、音频转写、视频文本抽取，需要新增对应解析器和计算资源调度。

## 8. 相关文件

- `apps/web/src/app/(dashboard)/brand-growth/business-knowledge-workspace.tsx`
- `apps/server/src/modules/brands/brands.service.ts`
- `apps/server/src/modules/admin/knowledge-bases.service.ts`
- `apps/server/src/common/mock-data.ts`
- `apps/web/src/services/admin.ts`
- `docs/changes/2026-06-20-business-knowledge-upload-formats.md`

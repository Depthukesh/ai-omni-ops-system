# 2026-06-22 设计尺寸透传与复刻短视频第二步修复

## 1. 背景

- `更多功能 -> 设计` 的图片设计弹窗虽然提供了 `1080x1920` 等规格选项，但后端真实调用生图接口时并没有把该规格透传到 `size` / `image_size`，导致结果容易退回默认比例。
- 设计工作台作品卡片对图片统一使用固定比例裁切，竖版图即使生成正确，也会在列表里被误看成方图或被严重裁切。
- 抖音 `复刻短视频` 第二步“一键生成视频”在第一阶段未完全就绪时仍可能被点击；如果服务端缺少 `ffmpeg`，第二阶段也会在拼接环节直接失败。
- 同一批次里还收口了上轮尚未提交的“运营提示词中心”体验修正，需要一并记录。

## 2. 本次修复

### 2.1 设计工作台

- `apps/server/src/modules/works/works.service.ts`
  - 新增设计图片规格解析逻辑，把前端 `spec` 映射为：
    - OpenAI / Right Codes `images/generations` 使用的像素 `size`
    - APIZ 任务模式使用的近似比例 `image_size`
  - 设计图片生成正式透传 `imageSizeOverride`，不再固定回退到 `1242x1660`
  - 设计任务输出新增 `spec`，用于历史回显和前端预览
- `apps/web/src/services/design.ts`
  - `DesignGeneratedWorkRecord` 新增 `spec`
- `apps/web/src/app/(dashboard)/more-features/design/workspace-shell.tsx`
  - 待生成占位作品和真实作品都保留 `spec`
  - 图片作品卡片按真实规格设置预览比例，而不是统一固定比例
- `apps/web/src/styles/globals.css`
  - 图片卡片预览由 `cover` 改为 `contain`，减少竖图被裁切造成的“看起来像方图”的误判

### 2.2 复刻短视频第二步

- `apps/web/src/app/(dashboard)/douyin/remix-short-video-workspace.tsx`
  - 第二步按钮增加就绪判断：
    - 必须已经生成分段结果
    - 所有分段都具备分镜图
    - 第一阶段状态必须是 `WAITING_VIDEO`，或属于第二阶段失败后的重试场景
  - 在工作区直接展示“当前还不能执行第二步”的原因，避免继续点进去才报错
- `apps/server/src/modules/works/works.service.ts`
  - 第二步接口新增第一阶段状态判断，第一阶段失败或未完成时直接返回更明确的错误
  - 第二步开始前统一校验分镜图完整性
  - 第二步开始前增加 `ffmpeg` 可用性检测，避免任务排进去了才在末尾失败
  - `resolveFfmpegBinary()` 优先使用环境变量，其次使用随项目安装的二进制，再回退系统 `ffmpeg`
- `apps/server/package.json`
  - 新增 `@ffmpeg-installer/ffmpeg` 依赖，减少对机器预装 `ffmpeg` 的硬依赖

### 2.3 同批次一并提交的运营提示词中心修正

- `apps/server/src/modules/works/operations-prompt-center.helpers.ts`
  - 标题抽取跳过 `执行指令` 等通用标题，优先取真实业务标题
- `apps/server/src/modules/works/operations-prompt-center.seed-data.ts`
  - 重新生成内置种子，修正错误标题
- `apps/web/src/app/(dashboard)/more-features/design/operations-prompt-center.tsx`
  - 作品中心重构为列表式布局
  - 增加创建时间、查看详情区与一键复制
- `apps/web/src/styles/globals.css`
  - 补齐作品列表与详情容器样式

## 3. 验证

- 编辑器诊断：
  - `works.service.ts`
  - `workspace-shell.tsx`
  - `remix-short-video-workspace.tsx`
  - `design.ts`
- 构建验证：
  - `npm run build:server`
  - `npm run build:web`

## 4. 风险与说明

- 设计图片最终出图比例仍取决于第三方模型本身是否严格遵守尺寸参数，但本次已经修复了我们自己的参数透传和前端裁切误导问题。
- 复刻短视频第二步仍依赖视频模型本身的片段生成成功；本次主要修复的是“未就绪也能点”和“缺少 ffmpeg 时没有运行时兜底”。

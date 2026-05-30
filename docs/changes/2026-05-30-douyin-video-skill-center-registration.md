# 2026-05-30 抖音 AI生视频（故事板）技能中心独立注册

## 背景

- 抖音 `AI生视频（故事板）` 工作台已经完成前后端功能接入，但技能中心仍只存在“小红书视频笔记”这套技能叶子。
- 虽然抖音视频功能与小红书视频笔记在实现上复用了同一类提示词能力，但从业务分区上看，抖音板块仍需要在前台和后台技能中心拥有独立的抖音技能入口。
- 如果继续复用小红书的 `skillSlug` 和 `promptId`，就会出现两个问题：
  - 前后台技能中心里看不到抖音区自己的视频技能
  - 在抖音视频页修改技能/提示词时，实际影响的是小红书视频笔记的配置

## 本次调整

### 1. 新增抖音视频独立 skill / prompt 标识

- 新增主技能：
  - `skill_douyin_video_note`
  - `slug: douyin-video-storyboard-studio`
- 新增主提示词：
  - `prompt_douyin_video_note`
- 新增 5 个抖音视频叶子提示词：
  - `prompt_douyin_video_brand_script`
  - `prompt_douyin_video_spoken_script`
  - `prompt_douyin_video_skit_script`
  - `prompt_douyin_video_remix_script`
  - `prompt_douyin_video_storyboard`

### 2. 前后台技能中心同步挂到抖音区

- `apps/web/src/app/(dashboard)/skill-center-config.ts`
  - 在抖音主分类下新增：
    - `AI生视频（故事板）-剧本策划`
    - `AI生视频（故事板）-视频生成`
  - 并补入 5 个叶子技能：
    - 品牌宣传剧本
    - 口播带货剧本
    - 短剧带货剧本
    - 复刻视频拆解
    - 故事板提示词
- 后台管理页复用同一棵技能树，因此会同步出现在后台技能中心。

### 3. 后端注册层改为支持抖音视频独立配置

- `apps/server/src/common/prompt-source-loader.ts`
  - 为上述 6 个抖音视频 `promptId` 新增提示词文件映射
  - 当前仍复用与小红书相同的底层提示词文件作为初始内容来源
- `apps/server/src/common/mock-data.ts`
  - 新增抖音视频主技能、主提示词和 5 个叶子提示词的 seed
- `apps/server/src/modules/admin/skills-prompts.service.ts`
  - 新增 `skill_douyin_video_note` 和 `douyin-video-storyboard-studio` 到提示词场景绑定表

### 4. 抖音视频运行时切到抖音 skill / prompt

- `apps/server/src/modules/works/works.service.ts`
  - 新增按 `VideoWorkKind` 选择视频技能 profile 的映射
  - 抖音 `AI生视频（故事板）` 在运行时不再继续读取：
    - `short-video-api-studio`
    - `prompt_xhs_video_*`
  - 改为读取自己的：
    - `douyin-video-storyboard-studio`
    - `prompt_douyin_video_*`
- 这样前后台修改抖音视频技能后，会直接作用到抖音视频工作流，不再串到小红书视频笔记。

## 影响范围

- 前端：
  - `apps/web/src/app/(dashboard)/skill-center-config.ts`
  - `apps/web/src/services/admin.ts`
- 后端：
  - `apps/server/src/common/prompt-source-loader.ts`
  - `apps/server/src/common/mock-data.ts`
  - `apps/server/src/modules/admin/skills-prompts.service.ts`
  - `apps/server/src/modules/works/works.service.ts`

## 验证

- `GetDiagnostics`
- `npm --workspace apps/server exec -- tsc --noEmit -p tsconfig.json`
- `npm --workspace apps/web exec -- tsc --noEmit -p tsconfig.json`
- 人工检查前台技能中心与后台技能中心是否都能在抖音区看到 5 个抖音视频叶子技能

## 备注

- 当前抖音视频技能初始内容仍复用现有视频生成提示词文件，这样可以保证与小红书视频笔记默认能力一致。
- 后续如需让抖音视频和小红书视频在提示词内容层完全分叉，只需要把 `prompt_douyin_video_*` 指向抖音专用提示词文件即可，不需要再改技能中心或工作流代码。

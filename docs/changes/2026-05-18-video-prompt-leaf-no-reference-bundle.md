# 2026-05-18 视频提示词叶子项取消同目录参考资料聚合

## 背景

视频笔记 6 条提示词已经拆成独立叶子项并在前后台技能中心展示，但用户继续反馈：每个视频板块右侧看到的提示词内容不是当前板块自己的内容，而是把同目录下其他视频提示词也一并拼接了进去。

## 根因

问题不在分类映射，也不在 promptId 绑定，而在提示词源文件读取逻辑：

- `apps/server/src/common/prompt-source-loader.ts`
- 原逻辑会对提示词入口文件所在目录执行“同目录参考资料自动聚合”
- 规则是：除了入口文件本身，只要同目录还有顶层 `.md` / `.txt` 文件，就会被统一拼接进当前 prompt 内容

这套聚合规则适用于 `SKILL.md` 这类“总技能入口 + 多份参考资料”的目录结构，但不适用于视频笔记这种“多个独立 `.txt` 提示词并列放在同一目录”的结构。

因此：

- 打开“视频笔记-品牌宣传剧本”时，会把口播、短剧、复刻、故事板、短视频等其它 `.txt` 也拼进去
- 打开“视频笔记-口播带货剧本”时，也会把同目录其它 `.txt` 一并显示

## 本次修正

### 1. 收紧参考资料自动聚合条件

文件：

- `apps/server/src/common/prompt-source-loader.ts`

新增 `shouldAggregateReferenceFiles(entryFilePath)`：

- 只有入口文件名为 `SKILL.md` 时，才允许自动读取同目录参考资料
- 普通独立 `.txt` / `.md` 提示词文件只返回自身内容，不再自动拼接同目录其它文件

### 2. 保留原有技能型聚合能力

这次没有取消全部聚合逻辑，而是保留了原本适用于以下场景的能力：

- `SKILL.md` + 同目录参考资料
- 原创/二创等本来就依赖总技能说明 + 参考文件共同构成提示词上下文的目录

## 影响范围

- 后台技能中心 `/admin`
- 个人技能中心 `/personal-center/skills`
- 视频笔记 6 条独立提示词叶子项

## 验证

- `GetDiagnostics`
  - `apps/server/src/common/prompt-source-loader.ts`
- `npm --workspace apps/server run build`
- 运行时检查：
  - `prompt_xhs_video_brand_script` 不再包含 `## 自动聚合参考资料`
  - `prompt_xhs_video_spoken_script` 不再包含 `### 参考资料：...`

## 结果

修正后，视频笔记每个叶子项只显示自己对应的提示词内容，不会再把同目录的其它视频提示词一起放进当前板块。

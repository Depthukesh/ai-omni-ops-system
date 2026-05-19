# 2026-05-19 小红书结构治理阶段性收口与续接记录

## 1. 变更背景

- 小红书结构治理在 2026-05-18 至 2026-05-19 期间持续沿“低风险、薄壳化、纯装配外移”的路线推进
- 当前 `note-workspaces.tsx`、`note-create-modals.tsx` 周边的主要厚块已经完成多轮拆分
- 为避免继续在收益递减区间做过细碎的拆解，需要把当前阶段的结构状态、已完成边界和建议续接点沉淀下来，方便后续再继续

## 2. 本次目标

- 对创建弹窗静态配置再收一层，形成统一配置入口
- 在 `docs/` 下补一份阶段交接文档，明确当前完成度、未完成事项和建议恢复顺序
- 在系统级路线图中标记小红书结构治理当前处于“阶段 B 局部收口完成”的状态

## 3. 修改内容

### 3.1 创建弹窗静态配置统一成 map

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-copy.ts`
  - 新增 `NoteCreateModalKind`
  - 新增 `NOTE_CREATE_MODAL_COPY_MAP`
  - `original / rewrite / video` 三类创建弹窗统一从 map 导出文案配置

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-shell.tsx`
  - 由接收 `title/metaText` 改为接收统一的 `copy` 配置对象

- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`
  - 改为直接向公共 shell 透传各自的 `copy` 配置

### 3.2 补充阶段交接文档

- `docs/xiaohongshu-structure-governance-handoff-2026-05-19.md`
  - 记录当前结构治理范围
  - 记录已完成拆分列表
  - 记录当前停留点与推荐续接顺序
  - 记录阶段性暂停建议

### 3.3 更新索引与路线图

- `docs/README.md`
  - 增加阶段交接文档与本次变更记录索引
- `docs/system-refactor-roadmap.md`
  - 增加“小红书结构治理阶段进度快照”
- `docs/site-map.md`
  - 同步记录创建弹窗静态配置 map 与阶段交接文档
- `docs/site-map-mermaid.md`
  - 同步更新创建弹窗配置节点说明

## 4. 修改意图

- 把这条“小红书结构治理”主线先收在一个方便恢复的位置
- 避免下次继续时还需要重新梳理已经完成到哪一层
- 让后续续接可以直接从“收益仍然明显的下一刀”开始，而不是重复拆已经很薄的区域

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-copy.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-shell.tsx`
  - 三类创建弹窗文件
  - `docs/README.md`
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - `docs/system-refactor-roadmap.md`
  - `docs/xiaohongshu-structure-governance-handoff-2026-05-19.md`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创、视频创作流程

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-create-modal-copy.ts`
  - 检查 `note-create-modal-shell.tsx`
  - 检查三类创建弹窗文件
- `npm run build:web`
  - 确认前端构建通过

## 7. 阶段结论

- 小红书结构治理当前已经完成一轮比较完整的“工作区主链路 + 创建弹窗主链路”减薄
- 当前继续深挖创建弹窗内部的边际收益开始下降
- 更合理的后续续接点应转向：
  - `workspace-shell.tsx`
  - `publish-modal.tsx`
  - 或其它仍明显偏厚的编排层

## 8. 相关文件

- `docs/xiaohongshu-structure-governance-handoff-2026-05-19.md`
- `docs/system-refactor-roadmap.md`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-copy.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-shell.tsx`

# 小红书结构治理阶段交接记录（2026-05-19）

## 1. 文档目的

- 记录本轮小红书结构治理已经推进到哪里
- 给后续继续拆分时提供一个明确的恢复点，避免重复梳理
- 明确当前哪些区域已经接近收益递减，哪些区域仍值得继续优化

## 2. 本轮治理目标

- 在不改 API 协议、不改数据库结构、不改主业务流程的前提下
- 继续推进小红书工作区、模态挂载层、创建弹窗和视频详情区的薄壳化
- 通过“小步快跑 + 每刀独立验证 + 每刀独立提交”的方式持续收口结构复杂度

## 3. 当前阶段结论

- 小红书结构治理第一阶段可以视为“主收益区已拿到”
- 工作区主链路和创建弹窗主链路的主要厚块已经拆开
- 当前若继续深挖创建弹窗内部，边际收益已经开始下降
- 后续更值得继续的区域，已经逐步转向仍偏厚的外层编排文件

## 4. 已完成的结构拆分

### 4.1 创建弹窗主链路

- `note-create-modals.tsx`
  - 已收口为纯导出层
- `original-create-modal.tsx`
- `rewrite-create-modal.tsx`
- `video-create-modal.tsx`
  - 三类创建弹窗壳层已各自迁出
- `note-create-modal-shell.tsx`
  - 三类创建弹窗的公共外层壳、标题区和底部动作区已统一
- `note-create-modal-copy.ts`
  - 三类创建弹窗的标题和说明文案已统一为静态配置 map

### 4.2 创建弹窗字段区

- 原创：
  - `original-create-basic-fields.tsx`
  - `original-create-reference-fields.tsx`
  - `original-create-tail-fields.tsx`
- 二创：
  - `rewrite-create-basic-fields.tsx`
  - `rewrite-create-tail-fields.tsx`
- 视频：
  - `video-create-basic-fields.tsx`
  - `video-create-config-fields.tsx`

### 4.3 工作区与模态挂载层

- `note-workspace-modals.tsx`
  - 已统一原创、二创、视频三类工作区模态挂载
- `video-workspace-modals.tsx`
  - 已收口为兼容导出层
- `note-workspace-modal-props.ts`
  - 工作区到 modal 的 props 装配已外移

### 4.4 视频详情区

- `video-workspace-stage-flags.ts`
  - 阶段按钮可用性派生已外移
- `video-workspace-detail-props.ts`
  - 视频详情区 props 装配已外移
- `video-workspace-detail-section.tsx`
  - 视频详情区的判空与挂载层已外移

## 5. 当前适合暂停的位置

- 创建弹窗区域目前已经相对干净：
  - 导出层、壳层、文案、字段区都已拆开
- 工作区视频详情区也已经拆到“判空 / 派生 / 装配 / 叶子面板”四层
- 继续在这两块深挖不会没有收益，但收益已经明显低于之前几刀

## 6. 推荐的下次续接顺序

### 第一优先级

- `apps/web/src/app/(dashboard)/xiaohongshu/workspace-shell.tsx`
  - 当前仍是更值得继续治理的外层编排文件
  - 后续可优先检查是否还存在超长 props 装配、重复分发或重型状态编排

### 第二优先级

- `apps/web/src/app/(dashboard)/xiaohongshu/publish-modal.tsx`
  - 当前仍承担较多发布链路 UI 逻辑和动作编排
  - 后续可继续评估是否拆分公共段落或参数装配

### 第三优先级

- `apps/web/src/app/(dashboard)/xiaohongshu/work-card-grids.tsx`
  - 若后续卡片差异逻辑继续增多，可再看是否拆为更细的卡片叶子组件

## 7. 建议的恢复策略

- 恢复前先查看：
  - `docs/site-map.md`
  - `docs/site-map-mermaid.md`
  - 本文档
  - `docs/changes/2026-05-19-xiaohongshu-structure-governance-winddown.md`
- 恢复时优先遵循：
  - 只拆纯前端装配与静态配置
  - 每刀必须低风险
  - 每刀必须补文档
  - 每刀必须独立验证与独立提交

## 8. 当前不建议继续深挖的区域

- `note-create-modals.tsx` 本身
  - 已经是纯导出层
- 三类创建弹窗字段区
  - 当前拆分粒度已经足够细
- 视频详情区按钮派生
  - 当前已经有独立 helper，不值得再继续拆更细

## 9. 阶段备注

- 本轮已经完成多次连续低风险提交，并已把当前 4 个已收口提交推送到远端
- 本文档的目的不是结束小红书治理，而是把它停在一个“随时可恢复、无需重新建模”的位置

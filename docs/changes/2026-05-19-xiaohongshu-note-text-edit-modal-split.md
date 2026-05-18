# 2026-05-19 小红书文本编辑弹窗共享壳层拆分

## 1. 变更背景

- 在完成原创创建弹窗参考图字段拆分后，`note-edit-modals.tsx` 中最明显的重复变成了原创与二创的文本编辑弹窗结构
- 原创、二创和视频三类编辑弹窗都共享同一套遮罩层、头部徽标、标题/正文编辑区和保存动作，只有摘要文案与视频的“故事板提示词”字段存在差异

## 2. 变更目标

- 不改 `OriginalEditModalProps` / `RewriteEditModalProps` / `VideoEditModalProps` 协议
- 把共享的文本编辑弹窗壳层抽成独立组件
- 让 `note-edit-modals.tsx` 更聚焦三类编辑弹窗的差异映射，而不是继续内联整段重复结构

## 3. 修改内容

### 3.1 新增共享文本编辑弹窗组件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-text-edit-modal.tsx`
  - 新增 `NoteTextEditModal`
  - 统一承接遮罩层、头部状态徽标、标题/正文输入区与保存动作
  - 通过 `extraFields` 扩展位承接视频编辑弹窗的“故事板提示词”差异字段

### 3.2 收口编辑弹窗本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-edit-modals.tsx`
  - `OriginalEditModal` 改为只负责原创标题、摘要文案和状态映射
  - `RewriteEditModal` 改为只负责二创标题、摘要文案和状态映射
  - `VideoEditModal` 改为复用共享壳层，并把故事板提示词作为额外字段下沉

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - `note-edit-modals.tsx`
  - 原创/二创/视频三段编辑弹窗内联壳层
- 进一步推进为：
  - `note-edit-modals.tsx`
  - `note-text-edit-modal.tsx`
  - 视频只保留差异字段注入

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-edit-modals.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-text-edit-modal.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创、视频编辑弹窗的保存交互和状态展示行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-edit-modals.tsx` 与 `note-text-edit-modal.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前文本编辑壳层已完成共享，但 `note-create-modals.tsx` 与 `note-edit-modals.tsx` 仍分别承接创建/编辑两个维度的聚合出口
- 下一步更合适的方向：
  - 继续进入 `note-create-modals.tsx` 内部拆视频创建弹窗的 provider / 素材配置局部块
  - 或进一步收口 `note-edit-modals.tsx` / `note-create-modals.tsx` 的共享类型定义

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-edit-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/note-text-edit-modal.tsx`

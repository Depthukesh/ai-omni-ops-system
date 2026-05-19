# 2026-05-19 小红书创建弹窗壳层文件拆分

## 1. 变更背景

- 在原创、二创、视频三类创建弹窗都完成字段块拆分后，`note-create-modals.tsx` 仍然同时承载三类创建弹窗壳层组件与类型定义
- 虽然字段编排已经显著减薄，但这个文件依然是创建弹窗的集中定义点，不利于继续向“纯壳层导出/组织层”收敛
- 若继续沿“小步拆壳”的低风险路线推进，更合适的下一刀就是把三类创建弹窗壳层各自迁到独立文件

## 2. 变更目标

- 不改现有 `OriginalCreateModalProps`、`RewriteCreateModalProps`、`VideoCreateModalProps` 协议
- 不改三类创建弹窗的交互行为与创建流程
- 让 `note-create-modals.tsx` 从“多组件定义文件”收敛为“统一导出层”

## 3. 修改内容

### 3.1 拆出三类创建弹窗壳层文件

- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
  - 承接 `OriginalCreateModal` 与 `OriginalCreateModalProps`
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
  - 承接 `RewriteCreateModal` 与 `RewriteCreateModalProps`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`
  - 承接 `VideoCreateModal` 与 `VideoCreateModalProps`

### 3.2 收口创建弹窗导出层

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - 不再直接定义三类创建弹窗组件
  - 改为统一 re-export 三个独立创建弹窗文件
  - 外部调用点继续维持原有导入路径，不需要同步改动接线层

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - `note-create-modals.tsx`
  - Original / Rewrite / Video Create Modal
- 推进为：
  - `note-create-modals.tsx`
  - `original-create-modal.tsx`
  - `rewrite-create-modal.tsx`
  - `video-create-modal.tsx`

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变三类创建弹窗的字段交互、创建入参与一键创作行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-create-modals.tsx`、`original-create-modal.tsx`、`rewrite-create-modal.tsx`、`video-create-modal.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前 `note-create-modals.tsx` 已收敛为统一导出层，三类创建弹窗壳层职责也已按文件拆开
- 下一步更合适的方向：
  - 继续把 `note-workspace-modals.tsx` / `video-workspace-modals.tsx` 再向更统一的挂载编排收敛
  - 或返回 workspace 容器层继续推进薄壳化

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`

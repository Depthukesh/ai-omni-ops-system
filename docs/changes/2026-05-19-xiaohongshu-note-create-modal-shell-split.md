# 2026-05-19 小红书创建弹窗公共壳层抽取

## 1. 变更背景

- `note-create-modals.tsx` 已经收口为纯导出层，原创、二创、视频三个创建弹窗壳层也分别迁出到独立文件
- 但这三个创建弹窗文件仍然重复维护同一套 overlay、dialog、标题区和底部操作按钮壳层
- 当前差异主要已经只剩各自的字段区块，继续保留重复壳层会让三个创建弹窗文件变厚

## 2. 变更目标

- 不改 `OriginalCreateModalProps`、`RewriteCreateModalProps`、`VideoCreateModalProps` 协议
- 不改三类创建弹窗的字段组件协议
- 抽出共享创建弹窗壳层，让三个创建弹窗文件更聚焦字段布局差异

## 3. 修改内容

### 3.1 新增共享创建弹窗壳层

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-shell.tsx`
  - 新增 `NoteCreateModalShell`
  - 统一承接 `open` 判空
  - 统一承接 overlay/dialog/card 外层结构
  - 统一承接标题说明区
  - 统一承接底部“创作/取消”按钮

### 3.2 三类创建弹窗接入共享壳层

- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
  - 改为复用 `NoteCreateModalShell`
  - 保留原创基础字段、参考字段、尾部字段组合不变
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
  - 改为复用 `NoteCreateModalShell`
  - 保留二创基础字段、尾部字段组合不变
  - 保留“素材为空时禁止创作”规则不变
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`
  - 改为复用 `NoteCreateModalShell`
  - 保留视频基础字段、配置字段组合不变

## 4. 修改意图

- 继续沿“壳层复用、差异字段保留”的低风险路线推进
- 让三个创建弹窗文件只关注各自字段区编排
- 把共享的关闭按钮、标题说明和底部动作区集中到一个更易维护的位置

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-shell.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变三类创建弹窗的打开、关闭和创作流程

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-create-modal-shell.tsx`
  - 检查 `original-create-modal.tsx`
  - 检查 `rewrite-create-modal.tsx`
  - 检查 `video-create-modal.tsx`
- `npm run build:web`
  - 确认前端构建通过，公共壳层抽取未引入编译回归

## 7. 风险与后续

- 当前三类创建弹窗已经不再各自维护重复壳层
- 下一步更自然的方向：
  - 继续检查创建弹窗之间是否还有可复用的标题/说明配置装配
  - 或回到工作区视图层，继续推进其它厚组件的纯装配外移

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-shell.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`

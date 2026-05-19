# 2026-05-19 小红书创建弹窗文案配置抽取

## 1. 变更背景

- 原创、二创、视频三个创建弹窗已经接入共享的 `note-create-modal-shell.tsx`
- 但三个创建弹窗文件内仍然保留各自的标题和说明文案字面量
- 这些文案本质上属于静态展示配置，继续分散在三个 modal 文件中，会让弹窗文件保留额外重复内容

## 2. 变更目标

- 不改三类创建弹窗的 props 协议
- 不改 `NoteCreateModalShell` 的 props 协议
- 抽出创建弹窗标题与说明文案的静态配置，让三个 modal 文件更聚焦字段区组合

## 3. 修改内容

### 3.1 新增创建弹窗文案配置文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-copy.ts`
  - 新增 `NoteCreateModalCopy`
  - 新增 `ORIGINAL_CREATE_MODAL_COPY`
  - 新增 `REWRITE_CREATE_MODAL_COPY`
  - 新增 `VIDEO_CREATE_MODAL_COPY`

### 3.2 三类创建弹窗接入文案配置

- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
  - 改为读取 `ORIGINAL_CREATE_MODAL_COPY`
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
  - 改为读取 `REWRITE_CREATE_MODAL_COPY`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`
  - 改为读取 `VIDEO_CREATE_MODAL_COPY`

## 4. 修改意图

- 继续沿“静态配置外移、弹窗本体聚焦编排”的低风险路线推进
- 让三个创建弹窗文件进一步减少重复字面量
- 为后续继续抽取弹窗配置项或统一挂载参数打基础

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-copy.ts`
  - `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变三类创建弹窗的展示文案内容和创作流程

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-create-modal-copy.ts`
  - 检查三类创建弹窗文件
- `npm run build:web`
  - 确认前端构建通过，文案配置抽取未引入编译回归

## 7. 风险与后续

- 当前三类创建弹窗的标题与说明文案已经不再分散维护
- 下一步更自然的方向：
  - 继续梳理创建弹窗之间可统一的静态配置
  - 或回到工作区/发布链路，继续推进其它厚组件减薄

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modal-copy.ts`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-create-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-create-modal.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-modal.tsx`

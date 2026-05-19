# 2026-05-19 小红书视频创建弹窗配置区拆分

## 1. 变更背景

- 在完成原创创建弹窗参考图字段拆分后，`note-create-modals.tsx` 中最厚的局部块转移到了 `VideoCreateModal`
- 这一段同时承接视频类型、素材选择、参考图上传、视频后端与模型、时长、营销策划开关以及两段用户要求
- 如果继续把这些字段全部内联在 `VideoCreateModal` 中，创建弹窗本体会同时承担三类创建弹窗的壳层职责和视频配置细节，后续继续薄壳化会越来越困难

## 2. 变更目标

- 不改 `VideoCreateModalProps` 协议，不改视频笔记创建流程
- 只把视频创建弹窗里的“视频配置区”抽成独立子组件
- 继续减薄 `note-create-modals.tsx`，让它更聚焦原创、二创、视频三类创建弹窗的顶层编排

## 3. 修改内容

### 3.1 新增视频配置字段子组件

- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-config-fields.tsx`
  - 新增 `VideoCreateConfigFields`
  - 组件内部承接视频类型、素材库、参考图上传、视频后端与模型选择、视频时长、营销策划方案开关
  - 组件内部承接“用户要求（剧本）”与“用户要求（故事板/视频）”两段文本输入

### 3.2 收口视频创建弹窗本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `VideoCreateModal` 不再直接内联视频配置区的大段字段
  - 保留营销日历、产品、账号角色、自定义选题和弹窗底部动作区
  - 通过挂载 `VideoCreateConfigFields` 继续复用现有的 props 与事件处理函数

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - `note-create-modals.tsx`
  - `VideoCreateModal`
  - 内联视频配置区
- 推进为：
  - `note-create-modals.tsx`
  - `VideoCreateModal`
  - `video-create-config-fields.tsx`

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-create-config-fields.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变视频创建弹窗的字段交互、创建入参和一键创作行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-create-modals.tsx` 与 `video-create-config-fields.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前视频创建弹窗的配置区已拆出，但 `note-create-modals.tsx` 仍同时承接原创、二创、视频三类创建弹窗
- 下一步更合适的方向：
  - 继续把 `VideoCreateModal` 中“营销日历/产品/角色/选题”头部区抽成更轻量的字段块
  - 或回到其他 workspace 容器层继续推进薄壳化

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-config-fields.tsx`

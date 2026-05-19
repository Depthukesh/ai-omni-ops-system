# 2026-05-19 小红书视频创建弹窗头部字段拆分

## 1. 变更背景

- 在完成视频创建弹窗配置区拆分后，`note-create-modals.tsx` 中 `VideoCreateModal` 剩余的主要内联结构变成了头部基础字段区
- 这一段承接营销日历、产品、账号角色和自定义选题输入，虽然逻辑不复杂，但仍让 `VideoCreateModal` 同时承担弹窗壳层和字段编排细节
- 若继续沿“小步拆壳”的路线推进，更合适的下一刀就是把这组基础字段也抽成独立子组件

## 2. 变更目标

- 不改 `VideoCreateModalProps` 协议，不改视频笔记创建流程
- 只把视频创建弹窗里的“头部基础字段区”抽成独立子组件
- 继续减薄 `note-create-modals.tsx`，让 `VideoCreateModal` 更聚焦弹窗壳层与字段块挂载

## 3. 修改内容

### 3.1 新增视频头部字段子组件

- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-basic-fields.tsx`
  - 新增 `VideoCreateBasicFields`
  - 组件内部承接营销日历、产品、账号角色和自定义选题字段
  - 继续复用现有 `VideoCreateModalProps` 中的状态值和事件处理函数

### 3.2 收口视频创建弹窗本体

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `VideoCreateModal` 不再直接内联头部基础字段
  - 改为组合 `VideoCreateBasicFields` 与 `VideoCreateConfigFields`
  - 弹窗头部描述、底部动作区和创建行为保持不变

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - `note-create-modals.tsx`
  - `VideoCreateModal`
  - 头部基础字段 + 配置字段
- 推进为：
  - `note-create-modals.tsx`
  - `VideoCreateModal`
  - `video-create-basic-fields.tsx`
  - `video-create-config-fields.tsx`

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-create-basic-fields.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变视频创建弹窗的字段交互、创建入参与一键创作行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查 `note-create-modals.tsx` 与 `video-create-basic-fields.tsx`
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前视频创建弹窗的基础字段区和配置字段区都已拆出，`note-create-modals.tsx` 进一步向顶层编排壳层收敛
- 下一步更合适的方向：
  - 继续把原创创建弹窗的头部基础字段也抽成更轻量的字段块
  - 或返回 workspace 容器层继续推进薄壳化

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-create-modals.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-basic-fields.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-create-config-fields.tsx`

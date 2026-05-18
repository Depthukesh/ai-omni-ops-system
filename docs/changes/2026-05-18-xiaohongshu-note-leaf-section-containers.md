# 2026-05-18 小红书笔记叶子 SectionContainer 拆分

## 1. 变更背景

- 在完成 `note-workspace-section-containers.tsx` 后，虽然 `workspace-shell.tsx` 已经不再直接维护 note section 的超长装配逻辑，但中间层 container 本身仍然同时承接原创、二创、视频三类 section 的全部细节
- 这使得 note container 仍然偏厚，还没有真正形成“一个 section 一个 container 文件”的稳定结构

## 2. 变更目标

- 不改面板组件协议、不改交互行为，把原创、二创、视频三个笔记 section 再进一步拆成独立叶子 container 文件
- 让 `note-workspace-section-containers.tsx` 只保留共享类型与路由分发
- 为后续继续精简 note 面板内部结构，或切换到 `brand-growth/workspace.tsx` 拆壳时保留清晰范式

## 3. 修改内容

### 3.1 新增三个叶子 container

- `apps/web/src/app/(dashboard)/xiaohongshu/original-workspace-section-container.tsx`
  - 承接原创笔记 section 的状态派生、动作包装与 props 组装
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-workspace-section-container.tsx`
  - 承接二创笔记 section 的状态派生、动作包装与 props 组装
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-section-container.tsx`
  - 承接视频笔记 section 的状态派生、动作包装与 props 组装

### 3.2 精简中间路由层

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-containers.tsx`
  - 收口为共享类型定义 + `activeSection` 分发
  - 不再内联原创、二创、视频三类 section 的具体 props 组装
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-props.ts`
  - 删除已不再使用的批量 section props 集合出口，避免与叶子 container 新链路并存
- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-sections.tsx`
  - 旧的 note section 集合出口已退出主链路并删除，避免遗留一层无调用的中间转发文件

## 4. 修改意图

- 这一步继续遵循“小步拆壳、不动协议”的低风险路线
- 结构从：
  - 顶层壳
  - note container
  - note 面板
- 进一步推进为：
  - 顶层壳
  - note 路由层
  - 原创/二创/视频叶子 container
  - note 面板

## 5. 影响范围

- 影响页面：
  - `/xiaohongshu`
- 影响文件：
  - `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-containers.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/original-workspace-section-container.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-workspace-section-container.tsx`
  - `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-section-container.tsx`
- 不影响接口协议
- 不影响数据库结构
- 不改变原创、二创、视频工作区现有交互和任务行为

## 6. 验证方式

- `GetDiagnostics`
  - 检查中间路由层与三个叶子 container
- `npm run build:web`
  - 确认前端构建通过，拆分未引入编译回归

## 7. 风险与后续

- 当前只是把三类 note section 再细分为独立叶子 container，`note-workspaces.tsx` 面板本体仍保持不变
- 下一步更合适的方向：
  - 继续清理 `note-workspaces.tsx` 内部的共性片段和重复结构
  - 或转入 `brand-growth/workspace.tsx`，复用同样的拆壳链路

## 8. 相关文件

- `apps/web/src/app/(dashboard)/xiaohongshu/note-workspace-section-containers.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/original-workspace-section-container.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/rewrite-workspace-section-container.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/video-workspace-section-container.tsx`

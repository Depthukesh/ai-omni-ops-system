# 2026-05-09 个人中心概览页收敛重构

## 1. 变更背景

- 个人中心已经连续拆出 `/orders`、`/works`、`/skills`、`/security`、`/tasks`、`/team`、`/invites`
- 但 `/personal-center` 根页仍保留旧聚合式 tab、参考条和多段大列表，导致首页信息堆叠严重，视觉与结构都和新二级工作区不一致

## 2. 本次目标

- 把 `/personal-center` 从“历史聚合页”收成真正的“概览页”
- 只保留账号摘要、品牌上下文、待办提醒、最近动态和快捷入口
- 让详细列表统一下沉到各自的二级工作区

## 3. 本次修改

### 3.1 根页结构重写

- 重写 `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- 删除旧的：
  - 双层 tab
  - 参考图式标签条
  - 点数流水、订单、任务、作品的首页长列表
- 改为三段结构：
  - 概览摘要
  - 关键信息
  - 快捷入口

### 3.2 工作区头部收敛

- 更新 `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- 删除 `个人中心工作区` 下方整排“当前页 / 可进入”大卡片
- 把账号相关操作统一移动到 `个人中心工作区` 右上角：
  - 数据来源状态
  - 刷新
  - 当前品牌切换
  - 退出登录
- 根页不再重复显示这组账号操作

### 3.3 保留的首页能力

- 校验登录态
- 读取真实 `/auth/me`
- 读取真实 `/orders`、`/tasks`、`/media`、`/point-ledgers`、`/brands/me/invites`
- 支持品牌切换
- 支持退出登录
- 支持接口失败时回退到本地种子数据

### 3.4 首页现在只展示什么

- 会员等级、剩余点数、进行中任务、作品资产、待处理邀请等摘要卡
- 当前账号与品牌信息
- 当前最需要处理的事项
- 任务 / 订单 / 作品三类最近动态
- 跳往各独立工作区的快捷入口

### 3.5 首页不再展示什么

- 点数流水长表
- 会员订单长表
- 充值订单长表
- 任务记录长表
- 作品资产长表

## 4. 文档同步

- 更新 `docs/site-map.md`
- 补记本次概览页收敛重构

## 5. 验证结果

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/personal-center/page.tsx` 无报错
- `npm run build:web` 通过
- Next 构建已识别并保留：
  - `/personal-center`

## 6. 当前边界

- 概览页当前仍然依赖多接口摘要拉取，不是专门的 overview 聚合接口
- 如果后续首页信息继续扩张，建议补独立 `/personal-center/overview` 聚合接口，避免前端并发请求继续膨胀

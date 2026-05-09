# 2026-05-08 品牌成员管理第一版

## 1. 变更背景

- `team` 页面已经能读取真实品牌成员列表，但还停留在只读态
- 为了让多用户品牌协作继续往前推进，需要先补第一版成员管理能力

## 2. 本次目标

- 新增品牌成员管理接口
- 让 `team` 页面支持第一版可操作成员管理
- 保持边界可控，不在这一轮引入完整邀请表和接受邀请流程

## 3. 本次修改

### 3.1 后端接口

- 更新 `apps/server/src/modules/brands/brands.controller.ts`
- 更新 `apps/server/src/modules/brands/brands.service.ts`
- 新增接口：
  - `GET /api/brands/:id/members`
  - `POST /api/brands/:id/members`
  - `PATCH /api/brands/:id/members/:memberId`

### 3.2 当前能力

- 成员列表：
  - 校验当前登录用户是否属于该品牌
  - 返回当前用户角色
  - 返回是否可管理成员
  - 返回真实品牌成员列表
- 添加成员：
  - 输入手机号 / 邮箱 / 昵称 / 用户 ID
  - 查找已存在用户
  - 直接加入当前品牌工作区
  - 当前为“直加已有账号”模式
- 修改成员：
  - 支持修改角色
  - 支持修改状态：
    - `ACTIVE`
    - `DISABLED`
    - `REMOVED`

### 3.3 权限约束

- `OWNER`：
  - 可添加成员
  - 可授予 `ADMIN` / `EDITOR` / `OPERATOR` / `VIEWER`
  - 可修改非主账号成员
- `ADMIN`：
  - 可添加成员
  - 仅可授予 `EDITOR` / `OPERATOR` / `VIEWER`
  - 不可修改 `OWNER`
  - 不可把别人提升为 `ADMIN`
- 当前版本暂不支持：
  - 修改自己角色或状态
  - 修改主账号成员
  - 主账号转移

### 3.4 前端页面

- 更新 `apps/web/src/services/brand-growth.ts`
- 更新 `apps/web/src/app/(dashboard)/personal-center/team/page.tsx`
- `team` 页面当前已支持：
  - 添加成员表单
  - 角色下拉
  - 状态下拉
  - 行级保存

## 4. 验证结果

- `GetDiagnostics` 检查通过
- `npm run build:server` 通过
- `npm run build:web` 通过

## 5. 当前边界

- 当前不是完整邀请流，没有邀请码、邀请确认和过期机制
- mock 模式暂不支持成员管理写操作，需连接数据库
- 审计日志、邀请记录、成员操作留痕后续继续补

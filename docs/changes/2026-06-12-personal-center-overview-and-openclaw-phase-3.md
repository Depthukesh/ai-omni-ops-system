# 2026-06-12 个人中心第三批上线：概览页、OpenClaw 与零散文案收口

## 为什么改

- 个人中心前两批已经完成壳层统一与主要二级页乱码修复，但概览页、OpenClaw 安装页和少量安全页、任务页文案仍偏研发口吻。
- 这会让页面虽然可用，但不够像正式上线的运营工作台。
- 本批继续只处理 `personal-center` 范围，不碰其他工作区改动。

## 本次范围

- `apps/web/src/app/(dashboard)/personal-center/layout.tsx`
- `apps/web/src/app/(dashboard)/personal-center/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/openclaw/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/security/page.tsx`
- `apps/web/src/app/(dashboard)/personal-center/tasks/page.tsx`

## 这次改了什么

### 1. 个人中心概览页

- 收口首页提醒区、快捷入口和最近动态文案。
- 将任务、订单、作品状态改为中文标签，避免直接暴露接口枚举。
- 将品牌角色展示统一为面向用户可读的中文角色名称。
- 调整若干提示语，避免“下沉”“回跳”“token 持有状态”这类偏研发的表达。

### 2. OpenClaw 安装页

- 优化安装令牌、MCP 地址、Skill 下载等说明文案。
- 让页面更接近正式工作台语气，而不是内部技术说明页。
- 保留原有安装令牌生成、停用、复制与下载逻辑不变。

### 3. 零散修复

- 修复安全页剩余的用户名、新密码与密码重复校验提示文案。
- 修复任务页剩余的“刚刚更新”乱码。
- 调整任务页统计卡文案，让状态说明更自然。

## 明确不改的内容

- 不改登录、鉴权、接口协议和数据库结构。
- 不新增接口请求，不增加服务器负载。
- 不引入额外重动画或高开销视觉效果。

## 验证

- `layout.tsx` 诊断通过
- `page.tsx` 诊断通过
- `openclaw/page.tsx` 诊断通过
- `security/page.tsx` 诊断通过
- `tasks/page.tsx` 诊断通过

## 后续建议

- 继续保留“只提交 personal-center 范围”的策略，避免误带其他工作区改动。
- 下一轮可转向更细的视觉一致性收口，例如空态、按钮层级和移动端间距统一。

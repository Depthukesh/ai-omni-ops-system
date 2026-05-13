# 2026-05-13 Team Collaboration Owner Guard And Invite Confirmation

## 背景
- 个人中心团队协作页曾同时混用平台系统角色、品牌成员角色和当前品牌切换结果。
- `SUPER_ADMIN` 账号进入前台个人中心后会看到全品牌列表，和品牌成员权限页的真实校验结果不一致。
- 团队协作页原先同时提供“直接添加即入组”“邀请码加入品牌”“按账号创建邀请”三种入口，不符合当前“Owner 发邀请、成员确认后加入”的协作规则。

## 本次调整
- `apps/server/src/modules/auth/auth.service.ts`
  - 前台 `accessible brands` 改为只认真实 `BrandMember` 关系，不再因为 `SUPER_ADMIN` 自动放大全品牌范围。
  - 若账号同时存在协作品牌和其他品牌，前台优先收口到当前协作品牌，避免个人中心与团队页落到错误品牌上下文。
- `apps/server/src/modules/brands/brands.service.ts`
  - 团队邀请、成员管理、成员审计统一收口为 `OWNER` 才可操作。
  - “直接添加成员”改为创建待确认邀请，不再立即写入 `BrandMember`。
  - “创建邀请”改为生成邀请链接，不再要求填写邀请账号。
  - 接受邀请时，若当前用户已有其他非 owner 协作品牌，会自动移除旧的非 owner 活跃成员关系，避免普通协作成员同时挂多个品牌。
- `apps/server/src/modules/brands/brands.controller.ts`
  - 品牌资料库、品牌资产、飞书绑定等品牌增长策略写接口改为 `Owner` 校验。
- `apps/server/src/modules/reports/reports.controller.ts`
  - 品牌增长报告、可视化报告、半年营销规划生成接口改为仅 `Owner` 可触发。
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
  - 非 `Owner` 进入品牌增长策略页时不再继续加载操作面板，改为显示权限提示并引导前往小红书或个人中心。
- `apps/web/src/app/(dashboard)/personal-center/team/page.tsx`
  - 去掉手动邀请码加入区块。
  - “直接添加成员”改成“发送加入邀请”。
  - “创建邀请”改成纯邀请链接生成。
  - 当前角色展示不再回退到认证品牌列表角色，避免把系统角色误显示成品牌角色。
- `apps/web/src/app/(dashboard)/personal-center/invites/page.tsx`
  - 邀请通知页改用“邀请对象/邀请链接”文案，不再继续向前台强化邀请码心智。

## 预期效果
- 前台普通协作成员只会在个人中心看到自己当前协作品牌，不再因为系统角色或旧品牌残留看到全品牌列表。
- 品牌增长策略与团队邀请入口统一改为 `Owner` 主控。
- 团队成员加入统一走“收到提醒/打开邀请链接 -> 点击同意 -> 正式加入”的确认式流程。

## 验证
- `GetDiagnostics`
- `npm run build:web`
- `npm run build:server`

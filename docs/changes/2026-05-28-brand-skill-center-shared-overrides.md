# 2026-05-28 品牌级技能中心共享覆盖

## 1. 变更背景

- 现有个人中心技能中心实际采用的是“用户 + 品牌”双键覆盖。
- 最新规则要求调整为：
  - 后台继续维护唯一一套平台技能与提示词基线，所有超级管理员共享。
  - 前端用户中心不再保存个人版本，而是保存“当前品牌共享版本”。
  - 只有当前品牌管理员可以保存和恢复平台基线。
  - 点击“恢复平台基线”后，应回到后台平台基线对应提示词。

## 2. 本次修改

### 2.1 存储层

- 更新 `prisma/schema.prisma`
- 新增品牌级技能覆盖模型：
  - `BrandSkillProfile`
  - `BrandPromptOverride`
  - `BrandSkillResetLog`
- 保留旧的 `UserSkillProfile` / `UserPromptOverride` / `UserSkillResetLog`，本次不做破坏性删除，降低回滚风险。

### 2.2 后端

- 更新 `apps/server/src/modules/user-skills/user-skills.service.ts`
- 更新 `apps/server/src/modules/user-skills/user-skills.controller.ts`
- 当前 `/api/user-skills` 这组接口继续复用原路径，但内部读写已切到品牌级共享覆盖表。
- 当前读取顺序：
  - 先读取后台平台基线 `SkillConfig` / `PromptTemplate`
  - 再按 `brandId + baseSkillId / basePromptId` 合成当前品牌有效视图
- 当前保存规则：
  - 仅写当前品牌的共享覆盖
  - 不改后台平台基线
  - 不回写提示词源文件
- 当前重置规则：
  - 删除当前品牌覆盖
  - 记录 `BrandSkillResetLog`
  - 再回到后台平台基线
- 当前权限规则：
  - 品牌成员可查看
  - 仅品牌管理员可保存与重置

### 2.3 前端

- 更新 `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx`
- 页面文案由“个人技能库”调整为“品牌技能库”
- 保存说明、重置说明、空态文案都同步改为“当前品牌共享版本”
- 当当前品牌角色不是 `ADMIN` 时，前端禁用保存和恢复按钮，仅保留查看

### 2.4 兼容与自愈

- 旧环境若仍存在 `UserSkillProfile` / `UserPromptOverride` / `UserSkillResetLog` 用户级覆盖数据：
  - 当前会在首次命中品牌技能中心接口时自动迁移到品牌级表
  - 迁移策略采用“同品牌下最近一次更新时间优先”
  - 若品牌级表中已存在记录，则保留品牌级现值，不再用旧用户数据覆盖
- 继续保留模型值归一化逻辑：
  - `providerId::modelName`
  - 兼容 `模型名 · Provider名`
  - 兼容纯模型名
- 继续保留旧模型值自愈：
  - 图片生成旧值 `provider_runtime_image_generation::gpt-image-2` 自动回填到 `Right Codes`
  - 视频旧值 `seedance` 自动回填到火山方舟 `doubao-seedance-2-0-260128`

## 3. 影响评估

- 影响范围仅限个人中心技能中心覆盖层。
- 不影响后台平台基线 `SkillConfig` / `PromptTemplate`。
- 不影响 `works`、`reports`、第三方平台配置中心、品牌业务数据存储。
- 不改现有接口路径，避免前端路由和入口联动回归。

## 4. 验证重点

- 品牌 A 管理员保存后，品牌 A 下其他管理员/成员可看到同一份提示词结果。
- 切换到品牌 B 时，不应读到品牌 A 的覆盖。
- 点击“恢复平台基线”后，应回到后台对应技能/提示词基线。
- 非品牌管理员应只能查看，不能保存或重置。

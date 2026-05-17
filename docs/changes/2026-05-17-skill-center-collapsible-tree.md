# 2026-05-17 技能中心左侧分类树支持折叠

## 背景

前一轮已经把前后台技能中心统一成“按提示词叶子项分类展示”，但左侧分类树在提示词增多后会明显变长，浏览与定位成本上升。用户要求把左侧分类做成折叠式目录，减少滚动长度，并保持前后台体验一致。

## 本次调整

### 1. 个人技能中心支持一级、二级分类折叠

- 页面：`/personal-center/skills`
- 左侧一级分类现在支持展开/收起
- 左侧二级分类现在也支持展开/收起
- 选中某条提示词时，会自动展开到对应分类，避免当前项被折叠隐藏
- 搜索关键词时，左侧分类树会自动全部展开，方便直接看到命中结果

### 2. 后台技能中心同步支持一级、二级分类折叠

- 页面：`/admin`
- 技能中心左侧一级分类改为可折叠
- 一级分类内的二级业务分组也改为可折叠
- 点击某个提示词叶子项时，会自动展开对应一级和二级分组

## 影响范围

- `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx`
- `apps/web/src/app/(dashboard)/admin/page.tsx`

## 验证

- `GetDiagnostics`
  - `apps/web/src/app/(dashboard)/personal-center/skills/page.tsx`
  - `apps/web/src/app/(dashboard)/admin/page.tsx`
- `npm --workspace apps/web run build`

## 后续说明

- 当前折叠状态为页面内本地状态，刷新页面后会恢复默认展开
- 如果后续用户还希望“记住上次展开状态”，可再补本地持久化，例如 `localStorage`

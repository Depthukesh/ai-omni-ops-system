# 2026-05-21 抖音分组定向同步修复

## 背景

- 抖音收集页已经拆成 `品牌账号信息 / 竞品账号信息 / 品牌作品信息及数据 / 对标作品信息及数据` 四个独立分组。
- 但前端点击任一分组的“提交”时，后端仍会把四类数据全部一起执行。
- 这会导致用户在“对标作品信息及数据”页只想提交 `aweme_id / 作品链接` 时，被其他分组中残留的历史输入或预置账号一起触发请求，最终出现与当前分组不一致的 `400` 报错。

## 本次修复

- 为抖音同步请求新增 `scope` 字段，标记当前激活的分组。
- 前端只提交当前分组实际需要的输入字段：
  - `brandAccount`
  - `competitorAccount`
  - `brandWorks`
  - `benchmarkWorks`
- 后端根据 `scope` 仅执行对应分组的采集逻辑，不再把其他分组一并运行。

## 结果

- 在“对标作品信息及数据”页点击提交时，只会处理 `benchmarkAwemeIds`
- 不会再因为品牌账号、竞品账号或品牌作品分组中的旧输入而把本次请求整体打成失败

## 影响文件

- `apps/server/src/modules/collectors/collectors.service.ts`
- `apps/server/src/modules/collectors/collectors.controller.ts`
- `apps/web/src/services/collectors.ts`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`

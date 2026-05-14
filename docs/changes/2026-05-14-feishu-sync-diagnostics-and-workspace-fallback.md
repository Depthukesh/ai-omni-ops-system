# 2026-05-14 飞书同步诊断增强与工作区回退修复

## 背景

- 品牌增长页“小红书平台 -> 从飞书同步”在修正“命中 5 张数据表”问题后，仍存在“对标作品信息及数据”为 0 条的现象。
- 现有页面成功提示只有总 `syncedCount` 和 `tableCount`，无法判断问题发生在：
  - `benchmarkNotes` 没命中正确数据表
  - 命中了对标作品表，但本次同步写入为 0 条
  - 同步接口返回了对标作品，但随后 `loadArchive()` 重载工作区时又把结果读空

## 本次调整

### 1. 后端返回同步诊断明细

- 文件：`apps/server/src/modules/collectors/collectors.service.ts`
- `syncFeishuWorkspace()` 现在除了返回总 `syncedCount`、`tableCount`、`workspace` 外，还会额外返回：
  - `matchedTables`：每个角色实际命中的飞书表 `tableId/tableName`
  - `syncBreakdown`：每类同步本次实际写入条数
  - `workspaceCounts`：同步结束后工作区各类记录数

### 2. 前端优先落同步响应中的工作区

- 文件：`apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- 点击“从飞书同步”后，前端先执行 `setCollectionWorkspace(response.workspace)`，再触发 `loadArchive()` 重拉全量数据。
- 若后续重载把 `benchmarkNotes` 读成 0，但同步响应里的 `benchmarkNotes` 非空，则继续保留同步接口返回的结果，避免页面瞬间把已有对标作品刷没。

### 3. 页面提示直接暴露对标作品同步结果

- 文件：`apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- 同步成功提示改为直接展示：
  - 对标作品命中的表名
  - `benchmarkNotes` 本次同步条数
  - 当前工作区中的对标作品条数

## 影响

- 下一轮用户点击“从飞书同步”后，不再只能看到模糊的总数提示，而能直接判断：
  - 是否命中了 `对标作品信息及数据`
  - 本次对标作品是否真的写入
  - 页面当前看到的工作区数据是否与同步响应一致

## 验证

- `GetDiagnostics`
  - `apps/server/src/modules/collectors/collectors.service.ts`
  - `apps/web/src/services/collectors.ts`
  - `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `npm run build:server`
- `npm run build:web`

## 后续说明

- 若上线后提示中显示“对标作品表已命中，但本次同步 0 条，当前工作区 0 条”，则问题继续集中在飞书行级解析/写入层。
- 若提示中显示“本次同步 > 0 条，但当前工作区 0 条”，则问题继续集中在工作区读取链路或品牌上下文错位。

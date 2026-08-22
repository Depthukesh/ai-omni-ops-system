# 2026-08-16 local-single-user 默认品牌背景快照恢复保护

## 1. 背景

用户反馈另一台笔记本在重启后，页面虽然过一会儿可以打开，但 `品牌资料库 -> 品牌背景资料` 又被打回默认内容，而同品牌下的产品资料、运营情况等其它内容仍然存在。

这说明问题不是整库丢失，而是默认品牌主记录上的背景字段被单独重置。

## 2. 本次判断

当前仓库与 `hotfix-65` 发布包里的 `LocalSingleUserBootstrapService` 已经不是旧的 `upsert+update` 覆盖写法，而是：

- 默认品牌不存在时才 `create`
- 已存在时不再覆盖业务字段

因此，现场仍出现“品牌背景又被打回默认值”，说明不能只靠“去掉当前已知覆盖点”。

还需要补一层更强的兜底：

- 即使未来还有其它链路误把 `local_default_brand` 的背景字段写回默认值
- 系统也要能在启动时自动识别，并优先从本地快照恢复

## 3. 本次改动

文件：

- `apps/server/src/local-single-user/local-single-user-bootstrap.service.ts`

### 3.1 默认品牌背景快照

当 `local_default_brand` 已经带有自定义背景内容时，启动期会把以下字段写入本地快照：

- `brandName`
- `industry`
- `storeCount`
- `foundedYear`
- `brandDescription`
- `enterpriseIntro`

快照文件：

- `LOCAL_APP_DATA_ROOT\\backup\\default-local-brand-background-snapshot.json`

### 3.2 启动时自动识别“被打回默认值”

启动期会判断默认品牌背景是否又变回以下默认口径：

- `本地默认品牌`
- `本地工作台`
- 默认品牌介绍
- 默认企业介绍

如果命中这个“被打回默认值”的状态，同时本地快照里存在有效的自定义背景，则会自动恢复该快照。

### 3.3 自动恢复后写日志

如果发生自动恢复，会在服务日志里明确记录：

- 检测到默认品牌背景被回退到默认值
- 已从本地快照自动恢复

## 4. 影响面检查

### 4.1 受影响范围

- `local-single-user` 启动期默认品牌自检
- 默认品牌背景资料的本地保护链

### 4.2 为避免副作用做的保护

- 只针对 `local_default_brand`
- 只在当前背景与出厂默认值完全命中时才尝试恢复
- 没有改数据库结构
- 没有改品牌资料库前端交互
- 不影响非默认品牌

## 5. 验证

已执行：

- `npm run build:server`
- `npm run build:web`

现场建议继续验证：

1. 在笔记本上升级到新版本并重启
2. 检查 `品牌资料库 -> 品牌背景资料` 是否仍保持原内容
3. 如仍异常，补看：
   - `LOCAL_APP_DATA_ROOT\\logs\\server.log`
   - `LOCAL_APP_DATA_ROOT\\backup\\default-local-brand-background-snapshot.json`

## 6. 结论

这次不再只是假设“旧覆盖代码已经删掉就够了”，而是把默认品牌背景做成了：

- 正常情况下不覆盖
- 异常情况下可自动恢复

用本地快照把 `local_default_brand` 的背景资料保护收紧了一层。

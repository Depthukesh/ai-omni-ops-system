# 2026-08-03 版本页收口为版本卡 + 系统更新日志

## 为什么改

- 当前“版本与升级”页堆了过多安装态说明、运行时细节和升级解释，用户真正想看的信息反而不够集中。
- 用户要求把“当前版本”和“最新版本”收成更直接的展示：
  - 主标题只看 `0.1.0` 这类产品版本号
  - 打包名称如 `local-single-user-win-x64-2026-08-02-hotfix-9` 放到版本号下面
- 用户同时要求删掉版本卡下方原有的说明区、安装态详情区和升级说明区，页面下半部分只保留“系统更新日志”，只记录每次更新时间和更新内容。

## 本次范围

- `apps/web/src/app/(dashboard)/personal-center/version/page.tsx`
- `apps/web/src/services/personal-center.ts`
- `apps/server/src/modules/system-update/system-update.service.ts`
- `scripts/upload-local-single-user-release-to-oss.cjs`
- `docs/README.md`

## 这次改了什么

### 1. 版本页改成两张合并版本卡

- 保留页面顶部操作区：
  - 刷新
  - 检查更新
  - 预下载安装包
  - 立即升级
- 版本信息区收成两张卡：
  - 当前版本
  - 最新版本
- 两张卡都按统一口径展示：
  - 主行显示产品版本号，例如 `0.1.0`
  - 第二行显示打包名称 / 发布标签
  - 第三行显示对应时间

### 2. 删除版本页下半部分原有说明块

- 已删除：
  - “当前安装态已经和最新版本对齐，可继续正常使用”推荐说明区
  - 当前安装态详情区
  - 最新发布详情区
  - 升级说明区
  - 旧的“展开查看最新更新说明”折叠区
- 页面下半部分现在只保留：
  - `系统更新日志`

### 3. 系统更新日志改为多条历史记录

- 前端不再只读取最新一条 `notes`
- 后端 `system-update` 读取 OSS `latest.json` 时新增：
  - `appVersion`
  - `changeLogs`
- 如果 OSS 端已有 `history`，页面会按时间顺序展示多条日志
- 如果 OSS 端还是旧格式，没有 `history`，则自动回退为“最新一条 notes”

### 4. OSS 上传脚本补齐历史日志累积

- `upload-local-single-user-release-to-oss.cjs` 现在会：
  - 自动读取根 `package.json` 里的产品版本号，写入 `appVersion`
  - 上传前尝试读取 OSS 当前 `latest.json`
  - 将本次发布记录写入 `history`
  - 保留旧记录并按新到旧顺序累积
- 这样后续版本页里的“系统更新日志”就不会只剩最新一条。

## 影响范围与防副作用说明

- 这次没有改升级协议，没有改下载 / apply 行为。
- 这次没有改安装态门禁逻辑，版本页仍只在 `local-single-user` 安装态展示。
- 这次只是收紧展示结构与日志数据源，不新增新的入口或新的运行模式判断。

## 验证

- `npm --workspace apps/web exec tsc --noEmit`
- `npm exec tsc -- -p apps/server/tsconfig.json --noEmit`
- 代码对照确认：
  - 当前版本和最新版本均改为“版本号主行 + 打包名称次行”
  - 版本页从中段开始已删除原说明区，只保留“系统更新日志”
  - OSS 上传脚本已支持 `history` 累积和 `appVersion` 输出

## 下一步

- 结合本次页面优化一起提交。
- 以新热修版本重新打包并上传 OSS。
- 上传后拉取 OSS `latest.json` 复核：
  - `appVersion`
  - `version`
  - `history`
  - `notes`
  是否都已按新口径生效。

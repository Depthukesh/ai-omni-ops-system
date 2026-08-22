# 2026-08-04 local-single-user 升级链补齐验活与自动回滚

## 为什么改

- 用户反馈通过“版本与升级”执行更新后，安装目录虽然替换完成，但页面仍可能打不开。
- 排查后确认，旧升级链把“安装脚本执行完成”直接视为“升级成功”，没有继续等待新版本 API / Web 真正恢复可用。
- 同时，installer 和 updater 都会尝试重新拉起本地工作台，存在双重启动和状态过早写成 `SUCCEEDED` 的风险。

## 本次范围

- `scripts/local-single-user-updater.ps1`
- `scripts/build-local-single-user-release.cjs`
- `docs/engineering-standards.md`
- `docs/README.md`
- `docs/site-map.md`
- `docs/site-map-mermaid.md`

## 这次改了什么

### 1. updater 不再“装完就算成功”

- `local-single-user-updater.ps1` 现在会在替换安装目录后：
  - 受控重启本地工作台
  - 等待 `LOCAL_APP_DATA_ROOT/runtime/local-single-user-runtime.json` 刷新
  - 继续校验本地 API 健康检查和 Web 入口是否恢复可用
- 只有 API / Web 都通过验活后，才会把升级状态写成 `SUCCEEDED`

### 2. 新版本起不来时自动回滚

- updater 现在会识别安装脚本生成的 `AiOmniOps-backup-*` 备份目录
- 如果新版本在受控时限内没有通过验活，会：
  - 停掉失败的新版本运行时
  - 删除失败安装目录
  - 把 backup 自动恢复回原安装目录
  - 重启上一版本并再次验活
- 如果回滚成功，状态会写成 `FAILED`，但会明确说明“已自动回滚到上一版本”

### 3. installer 增加 `-NoLaunch`，避免双重启动

- `build-local-single-user-release.cjs` 生成的 `install-local-single-user.ps1` 新增 `-NoLaunch`
- updater 调 installer 时会显式传入 `-NoLaunch`
- 这样 installer 只负责替换安装目录，不再和 updater 抢着二次拉起本地工作台

## 影响范围与防副作用说明

- 这次没有改升级页 UI，也没有改 OSS `latest.json` 协议
- 这次没有改本地资料目录、注册逻辑、数据库结构或主业务功能
- 主要防护点是把“升级成功”的语义从“目录替换完成”收紧为“新版本已恢复服务”
- 同时利用安装链已有 backup 能力做自动恢复，避免用户落在站点打不开的半失败状态

## 验证

- `powershell -NoProfile -Command "[System.Management.Automation.Language.Parser]::ParseFile('scripts/local-single-user-updater.ps1',[ref]$null,[ref]$null) | Out-Null"`
- `node scripts/build-local-single-user-release.cjs --dry-run --skip-prebuild`

## 仍需注意

- 这套保护会随本次之后新打出的发布包一起生效
- 已经装在用户机器上的旧版本，如果本地 updater 还是旧逻辑，首次升级到本修复版时仍可能沿用旧链路；必要时需要通过重新安装本修复版建立新的升级基线

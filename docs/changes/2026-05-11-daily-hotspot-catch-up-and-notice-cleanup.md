# 2026-05-11 每日热点补抓兜底与提示收口

## 1. 背景

- 线上 `品牌增长 -> 每日热点` 页面可正常查看历史榜单，但当天数据停留在 `2026-05-10`
- 手动点击“手动搜索”后，可以立即刷出 `2026-05-11`
- 页面顶部还可能残留“正在跳转飞书授权...”提示，容易让人误以为每日热点与飞书授权卡住有关

## 2. 现象判断

- 每日热点抓取、解析、入库、前端展示链路本身可用
- 问题主要出在“定时任务或启动补跑偶发漏掉当天快照时，页面缺少自愈补抓”
- 飞书授权提示属于全局通知残留，不是每日热点真实状态

## 3. 本次修复

- 后端 `CollectorsService.getDailyHotspotWorkspace()` 新增工作区自愈逻辑：
  - 当访问每日热点工作区且未指定日期时
  - 若发现当天热点快照不存在或状态不是 `SUCCESS`
  - 且当前环境已配置 `TIKHUB_API_KEY`
  - 则自动补跑一次 `syncDailyHotspots()`，再返回最新工作区数据
- 为避免递归，手动同步完成后回读工作区时跳过自动补抓分支
- 前端去掉发起飞书授权前的全局“正在跳转飞书授权...”提示，避免该提示残留到每日热点页造成误判
- 部署脚本改为显式把 GitHub Secret `TIKHUB_API_KEY` 传入远端 `pm2 startOrReload` 的运行环境，避免服务重启后丢失每日热点抓取凭证
- `ecosystem.config.cjs` 的 `ai-omni-server` 进程显式透传 `process.env.TIKHUB_API_KEY`，不再只依赖 `pm2` 对临时 shell 环境的隐式继承
- 部署脚本在 `pm2 startOrReload --update-env` 后新增一次运行态校验：若 `ai-omni-server` 进程里仍缺少 `TIKHUB_API_KEY`，则让部署直接失败，避免“工作流成功但热点运行态继续缺密钥”
- 上述运行态校验最初用嵌套 heredoc 执行 `node`，在远端 `bash` 中会把内层 `NODE` 结束符吃坏；现已改成 `node -e`，避免 `Run 31` 这类 `unexpected end of file` 部署失败

## 4. 影响范围

- `GET /collectors/daily-hotspots/brands/:brandId/workspace`
- `POST /collectors/daily-hotspots/brands/:brandId/sync`
- `品牌增长 -> 每日热点` 页面
- `品牌增长 -> 收集数据` 的飞书授权提示体验

## 5. 验证

- 服务端构建：`npm run build:server`
- 前端构建：`npm --workspace apps/web run build`
- 线上验证：
  - 手动触发“每日热点”搜索后，日期从 `2026-05-10` 更新到 `2026-05-11`
  - 热点列表继续正常显示
  - 页面不再把飞书授权中的全局提示残留到每日热点视图中
  - 再次检查线上页面时，已可直接看到 `2026-05-11`，但页面报出“缺少 `TIKHUB_API_KEY`，无法调用每日热点接口”，由此继续补齐 `ecosystem.config.cjs -> PM2 进程环境` 的最后一跳
  - 补齐 GitHub Secret 后，`Run 31` 进一步暴露出部署脚本的嵌套 heredoc 语法问题；日志显示 `bash: warning: here-document ... wanted NODE`，本次已一并修正

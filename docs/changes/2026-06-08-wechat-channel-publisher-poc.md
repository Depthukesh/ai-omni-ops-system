# 2026-06-08 视频号独立插件 PoC 骨架

## 本轮目的

- 不直接开发视频号正式发布功能
- 先建立一个独立浏览器扩展 PoC，用于验证视频号网页端是否可被稳定接管

## 新增内容

### 1. 视频号独立扩展目录

- 新增目录：
  - `apps/web/public/extensions/wechat-channel-publisher/`
- 当前包含：
  - `manifest.json`
  - `background.js`
  - `content-script.js`
  - `README.md`

### 2. 当前 PoC 能力

- 可在 Chrome/Edge 里按开发者模式加载
- 可在工作台域名上响应健康检查和启动指令
- 可自动打开 `https://channels.weixin.qq.com/`
- 可在视频号页面左上角显示 PoC 状态浮层
- 可探测：
  - 当前页更像视频页还是图文页
  - 当前页是否命中上传控件
  - 当前页是否命中标题区和正文区

### 3. 当前刻意保留的边界

- 不自动上传视频
- 不自动上传图片
- 不自动点击发表
- 不接正式工作台发布入口
- 不并入统一插件

## 为什么这样做

- 视频号与抖音/小红书不同，登录与页面结构风险更高
- 当前最重要的是先验证：
  - 登录后页面能否稳定注入扩展
  - 页面是否真的暴露可接管的上传与输入控件
- 只有这一步成立，后续再继续做视频上传、图文上传和表单自动填写才有意义

## 相关入口

- 帮助页：
  - `/help/wechat-channel-publisher`
- 参考说明：
  - `docs/changes/2026-06-08-wechat-channel-minimum-validation-plan.md`

# 2026-08-11 内容获客工作台重组与本地存储收口

## 1. 背景

本轮目标有两部分：

1. 把原顶栏中的 `某书 / 某音/某号 / 公众号` 三条内容运营入口，重组为统一的 `内容获客` 工作台。
2. 把原本依赖 OSS 的受控资源副本，在 `local-single-user` 安装态下统一切到本地受控存储，避免本机运行仍继续把内容写到 OSS。

同时，用户要求 OpenClaw 在以下 4 个内容板块里生成的内容都支持“用户在内容下面留言”：

- 创作素材
- 每日计划
- 每日复盘
- 作品列表

## 2. 本次改动

### 2.1 前端导航与工作台结构

- 顶栏把 `/xiaohongshu` 的标签从 `某书` 改为 `内容获客`
- 顶栏移除 `某音/某号`、`公众号` 两个一级入口
- `/xiaohongshu` 入口改为新的统一壳层 `ContentAcquisitionWorkspace`
- 新壳层左侧采用“一级分组 + 二级板块”结构，分为：
  - `某书`
    - 营销策划方案
    - 创作素材
    - 每日计划
    - 每日复盘
    - 作品列表
  - `某音/某号`
    - 营销策划方案
    - 数字人
    - RunningHub应用
    - 创作素材
    - 每日计划
    - 每日复盘
    - 作品列表
  - `公众号`
    - 配置初始化
    - 创作工作流
    - 发布历史
    - 创作素材
    - 每日计划
    - 每日复盘
    - 作品列表

### 2.2 旧工作区复用方式

- 没有重写三套业务页
- 继续复用：
  - `XiaohongshuWorkspaceShell`
  - `DouyinWorkspaceShell`
  - `WechatWorkspaceShell`
- 为三套 shell 增加并实际启用：
  - `embedded`
  - `forcedSection`
- 外层统一导航只负责切换板块，内层继续承接原有业务逻辑、权限判断与操作链路

### 2.3 OpenClaw 板块补齐与留言

- 某书补齐：
  - 创作素材
  - 作品列表
- 公众号补齐：
  - 创作素材
  - 作品列表
- OpenClaw 四类内容详情统一接入留言组件 `OpenClawCommentThread`
- 新增后端评论接口与运行时建表能力：
  - `OpenClawCommentController`
  - `OpenClawCommentService`
  - `OpenClawComment`

## 3. 本地存储收口

### 3.1 本次收口范围

本次把 `local-single-user` 安装态的受控资源副本正式切到本地，不再因为机器上仍配置了 OSS 凭据就继续把内容写到 OSS。

### 3.2 实现方式

- `OssStorageService.shouldUseLocalFallback()`
  - `local-single-user` 模式下始终返回本地存储
- `OssStorageService.getLocalFallbackRoot()`
  - `local-single-user` 下改为写入 `LOCAL_APP_DATA_ROOT/storage/oss`
- `OssStorageService.isEnabled()`
  - 在本地安装态下不再把 OSS 视为当前正式可用真源

### 3.3 兼容边界

- 网站版 / 源码标准运行态：仍按原规则优先 OSS
- 本地安装态：统一写本地受控副本
- 保留原 `storageKey` 结构，避免业务记录、接口路径和历史读取逻辑失配

## 4. 影响面检查

### 4.1 受影响板块

- 顶栏主导航
- `/xiaohongshu` 页面入口
- 小红书 / 抖音 / 公众号三套内容工作区
- OpenClaw 内容详情弹窗
- 本地安装态受控资源副本写入目录

### 4.2 为避免副作用做的保护

- 没有改数据库主业务表结构
- 没有重命名 OpenClaw `workspaceScope`
- 没有迁移历史数据
- 没有删除 `/douyin`、`/wechat` 兼容直达路由，避免历史书签和内部跳转直接失效
- 只在 `local-single-user` 模式强制改为本地存储，没有改变网站版 / 标准运行态的 OSS 边界

## 5. 验证

- 前端构建：`npm run build:web`
- 后端构建：`npm run build:server`

结果：

- 前端构建通过
- 后端构建通过

## 6. 本次涉及文件

- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/page.tsx`
- `apps/web/src/app/(dashboard)/xiaohongshu/content-acquisition-workspace.tsx`
- `apps/web/src/styles/globals.css`
- `apps/server/src/storage/oss-storage.service.ts`
- 以及前面已经补齐的 OpenClaw 留言与工作区相关文件

## 7. 后续建议

- 如果后续确认旧 `/douyin`、`/wechat` 不再需要兼容直达，可再做一轮路由级收口
- 可以继续把 `内容获客` 首屏文案与状态提示做进一步视觉精修
- 若后续需要按留言人展示昵称或角色，可在评论记录上补用户信息映射

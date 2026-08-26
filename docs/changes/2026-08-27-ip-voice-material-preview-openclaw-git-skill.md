# 2026-08-27 IP语音、素材预览与 OpenClaw Git Skill 安装

## 背景

这一轮要同时补三条闭环：

1. 品牌资料库 `IP资料库` 增加品牌语音上传，并要求真实校验 `mp3` 与时长 `> 30 秒`
2. 个人中心 `素材管理` 给 `文本 / 图片 / 语音 / 视频` 四类素材统一补 `查看` 按钮和站内预览
3. OpenClaw 安装中心除了保留 `Skill ZIP` 下载，还要支持把 `GitHub Skill 链接 + 一句安装指令` 直接发给 OpenClaw 自行安装

## 本次改动

### 1. IP资料库语音上传

- 继续沿用 `Brand.ipProfileJson`，不新增独立音频表
- 扩展 `BrandIpProfile`：
  - `voiceUrl`
  - `voiceFileName`
  - `voiceDurationSec`
- 前端新增 `uploadBrandIpVoice(...)`
- 品牌增长 `IP资料库` 页面新增语音上传、查看与 `<audio>` 预览
- 后端新增：
  - `POST /brands/:id/ip-voices`
  - `GET /brands/:id/ip-voices/:fileName`
- 服务端上传规则：
  - 只接受 `mp3`
  - 使用 `ffprobe` 真实探测时长
  - 时长必须 `> 30 秒`
  - 语音走品牌受控存储路径，不直接暴露裸文件路径

### 2. 素材管理四类预览

- `个人中心 -> 素材管理` 列表新增 `操作` 列与 `查看` 按钮
- 统一复用站内现有素材预览弹窗模式：
  - 文本：站内文本预览
  - 图片：站内图片预览
  - 语音：站内音频播放器预览
  - 视频：站内视频播放器预览
- 保持原有紧凑列表结构不扩表，不额外引入第二套素材模型

### 3. OpenClaw 安装中心 Git + ZIP 双通道

- `Skill ZIP` 下载继续保留
- 新增 Git 安装元信息：
  - `githubTreeUrl`
  - `githubRef`
  - `githubPrompt`
- 页面新增：
  - `复制 Git Skill 链接`
  - `复制一句安装指令`
  - Git 分支展示
  - Git 安装说明区
- Git 与 ZIP 现在共用仓库内同一套 Skill 真源：
  - `docs/openclaw/skill-package/SKILL.md`
  - `docs/openclaw/skill-package/README.md`
  - 同目录下三份 Skill 手册
- ZIP 导出逻辑改为优先读取这套仓库真源，再回退到服务端内置文案

### 4. MCP / Skill 同步

- `manage_brand_library` 新增 `upload_ip_voice`
- `docs/openclaw/skill-package/01-品牌运营助手Skill-MCP工具矩阵.md` 新增 IP 语音上传说明
- `docs/openclaw/skill-package/02-品牌运营助手Skill高频任务路由手册.md` 新增 IP 语音上传问法与约束

## 影响面与保护

### 1. 对品牌资料归档的影响

- 本次没有新增重表，仍然走 `Brand.ipProfileJson`
- 旧数据兼容：未上传语音时字段保持空值，不影响已有 IP 图文资料读取

### 2. 对素材管理的影响

- 只补 `查看` 预览动作，不改变素材列表的数据来源、四分类逻辑和本地存储规则

### 3. 对 OpenClaw 安装中心的影响

- 旧的 ZIP 导入方式保持可用
- 新增 Git 安装方式，不替换既有安装路径

## 相关文件

- `packages/shared/src/index.ts`
- `apps/web/src/services/brand-growth.ts`
- `apps/web/src/app/(dashboard)/brand-growth/workspace.tsx`
- `apps/web/src/app/(dashboard)/brand-growth/library-workspace.tsx`
- `apps/server/src/modules/brands/brands.service.ts`
- `apps/server/src/modules/brands/brands.controller.ts`
- `apps/web/src/app/(dashboard)/personal-center/orders/page.tsx`
- `apps/server/src/modules/openclaw/openclaw.service.ts`
- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `apps/web/src/services/openclaw.ts`
- `apps/web/src/app/(dashboard)/personal-center/openclaw/page.tsx`
- `docs/openclaw/skill-package/SKILL.md`
- `docs/openclaw/skill-package/README.md`

## 验证

- 待执行：
  - Web 构建
  - Server 构建
  - 关键页面静态检查

## 一句话结论

这次把 `IP资料库语音上传`、`素材管理四类预览`、`OpenClaw Git Skill 安装` 三条链路一起接通，并保持 `Brand.ipProfileJson`、统一素材列表和 `Skill ZIP` 老路径都继续兼容。

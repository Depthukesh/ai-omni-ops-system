# 2026-06-07 Skill Installer First Pass

## 背景

- 技能板块目标对齐 AI CODING 风格：用户可以通过上传技能压缩包，或填写 GitHub 技能目录链接，自动安装并创建技能。
- 当前系统已有“手工创建技能”能力，但缺少“导入 / 安装技能”链路。

## 本次实现

### 后台入口

- 在后台 `技能专区` 左侧操作区新增 `安装技能` 按钮。
- 点击后打开安装弹窗，支持两种来源：
  - `GitHub` 技能目录链接
  - `ZIP_UPLOAD` 技能压缩包

### 服务端安装能力

- 新增 `SkillInstallerService`
- 新增接口：
  - `POST /admin/skills/install`
- 安装流程：
  1. 接收 GitHub 链接或 zip base64
  2. 下载 / 解压压缩包
  3. 自动定位技能目录中的 `SKILL.md`
  4. 解析 frontmatter 与标题
  5. 自动创建技能记录
  6. 返回安装摘要

### 自动创建内容

- 当前 first pass 自动创建：
  - 技能本体 `SkillConfig`
- 安装成功后，前端继续复用现有逻辑自动挂接：
  - 所属模块
  - 所属能力包
  - 提示词场景

## 当前支持范围

- 支持 public `github.com/.../tree/<branch>/<skill-path>` 技能目录链接
- 支持单个技能目录 zip
- zip 中必须包含 `SKILL.md`
- zip 可以是两种结构：
  - 外层带技能目录
  - `SKILL.md` 直接位于压缩包根目录

## 当前边界

- 本次只做“安装并创建技能” first pass
- 还没有自动导入这些技能级对象：
  - Prompt
  - References
  - Scripts
  - Knowledge
  - Input / Output Schema
- GitHub 当前仅支持公开仓库
- 当前 first pass 只支持单技能目录安装，不支持一次导入多个技能

## 后续建议

- 下一步继续把 `SKILL.md`、`references/`、`scripts/` 解析后映射到系统的技能三维结构：
  - 输入项
  - 提示词及其他元素
  - 输出
- 再往后扩展成：
  - 技能安装后自动生成 Prompt
  - 自动挂载 References / Scripts
  - 多技能批量导入
  - 从 skill 自动推导能力包编排

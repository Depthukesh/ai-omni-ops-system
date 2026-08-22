# 2026-08-10 local-single-user 技能提示词真源补包

## 背景

用户反馈本地单机版已经升级到恢复后的技能中心页面，但进入 `个人中心 -> 技能中心` 后，提示词内容仍然不是当前网页版本的最新内容，看起来还是旧版本。

## 根因

这次问题不在前端页面结构，也不在 SQLite 读取逻辑本身，而在 `local-single-user` 发布包内容：

1. 技能中心与运行时很多内置提示词会优先尝试从仓库里的源文件读取，例如：
   - `提示词/`
   - `技能/`
   - `.trae/skills/`
2. 但 `scripts/build-local-single-user-release.cjs` 之前打包时并没有把这些目录带进安装包
3. 结果是安装态运行时虽然具备“读源文件优先”的逻辑，但本地安装目录里没有这些真源文件
4. 最终只能退回到打进代码里的旧 fallback / 数据库旧内容，于是用户看到的提示词仍像“之前网页版本”

## 本次修复

文件：

- `scripts/build-local-single-user-release.cjs`

调整：

- `local-single-user` 打包时补充复制以下目录到安装包：
  - `提示词`
  - `技能`
  - `.trae/skills`

这样安装态运行时在解析 prompt source candidates 时，才能真正读到随包分发的最新提示词真源，而不是继续退回旧 fallback。

## 影响范围

- `local-single-user` 发包体积会略有增加
- 安装态技能中心与相关运行时提示词将更接近当前仓库版本
- 不修改数据库 schema
- 不修改 `user-skills` 接口结构

## 验证计划

- 执行 `npm run local:release:package`
- 检查 `.release/local-single-user-win-x64/app/` 下是否已包含：
  - `提示词/`
  - `技能/`
  - `.trae/skills/`
- 在安装态重新安装后，打开 `个人中心 -> 技能中心`，确认提示词内容已切到当前仓库版本

## 结论

这次用户看到“技能中心提示词还是旧的”，核心原因是本地版安装包缺失提示词真源目录。补齐随包分发后，安装态才能真正跟随当前仓库里的最新提示词内容。

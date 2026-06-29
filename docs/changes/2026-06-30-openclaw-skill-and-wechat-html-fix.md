# OpenClaw Skill 导出补齐 + 公众号 HTML 生成容错修复

## 1. 变更背景

- 用户要求把 `OpenClaw` 板块的 Skill 导出内容同步到最近新增的 MCP 功能，不再只停留在早期通用描述
- 用户反馈公众号工作流 `Step 4 生成最终公众号 HTML` 报错，需要排查真实原因并修复
- 已确认公众号 HTML 阶段现有报错主要出在模型返回中携带整段 HTML 时，后端只接受严格 JSON，导致可用结果被误判失败

## 2. 变更目标

- 让 OpenClaw 安装中心导出的 `SKILL.md / README.md` 反映当前已落地的工具能力
- 修复公众号 HTML 阶段对“近似 JSON + 大段 HTML”返回的兼容性问题
- 同步前端文案和系统文档，避免继续出现旧技能名误导

## 3. 修改内容

### 3.1 OpenClaw Skill 导出

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
  - 在导出的 Skill 说明中补充高频直连工具清单
  - 新增 `openclaw` 域说明
  - 新增“统一素材库与采集数据”路由说明
  - 新增 “OpenClaw 专区 / 龙虾日记” 路由与输入约束说明
  - 更新安装验收话术，覆盖统一素材库、公众号采集同步、采集删除、龙虾日记

### 3.2 公众号 HTML 生成修复

- `apps/server/src/modules/works/works.service.ts`
  - 在公众号 HTML 阶段新增 `parseWechatHtmlModelResponse(...)`
  - 优先沿用原有严格 JSON 解析
  - 当严格 JSON 失败时，仅在公众号 HTML 这条链路里增加宽松提取：
    - 识别直接返回的完整 HTML
    - 识别 `htmlContent` 包裹的大段 HTML 字符串
    - 解码常见的 `\\n / \\r / \\t / \\uXXXX / \\" / \\\\` 转义
  - 失败报错从“未返回有效 JSON”收敛为更准确的“未返回有效 HTML”

### 3.3 前端与文档同步

- `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
  - 把旧的 `wechat-html-renderer` 提示文案改为 4 种排版技能说明
- `apps/web/src/services/admin.ts`
  - 清理前端后台镜像中的旧 `wechat-html-renderer`
  - 新增 4 个公众号 HTML 排版技能、4 个提示词和新的 `wechat-html-typesetting` 能力包映射
- `apps/server/src/common/mock-data.ts`
  - 清理旧的单一 HTML 渲染技能 / prompt / 能力包种子
  - 改为新的 `wechat-html-typesetting` 能力包，并挂载 4 个排版技能
- `apps/server/src/common/prompt-source-loader.ts`
  - 移除旧 `prompt_wechat_html_render` 的文件入口
- `apps/server/src/modules/admin/skills-prompts.service.ts`
  - 启动时清理数据库中的旧 `skill_wechat_html_render / prompt_wechat_html_render`
- `docs/openclaw/OpenClaw第一阶段MCP工具清单.md`
  - 新增“当前已落地增量能力”章节，补充最新已开放的 OpenClaw / 素材库 / 公众号采集 / 删除类工具

## 4. 修复意图

- 只在公众号 HTML 阶段加容错，不改动全局 JSON 解析策略，避免影响其他依赖严格 JSON 的链路
- 保留原有风格技能选择机制，让 `通用 / 极简 / 空间艺术 / 通知类` 四类技能继续作为唯一入口
- 让 OpenClaw 导出的 Skill 包与系统实际 MCP 能力保持一致，减少安装后的认知偏差
- 彻底清理旧 `wechat-html-renderer` 残留，避免后台和运行时继续出现旧技能名、旧 prompt 或旧能力包

## 5. 影响范围

- 影响模块：`openclaw`、`works`
- 影响页面：公众号工作流 `Step 4`
- 影响文档：OpenClaw MCP 工具说明、变更记录
- 不影响范围：其他文生文 JSON 严格解析链路保持原状

## 6. 验证建议

- 重新执行公众号工作流 `Step 4`，验证模型即使返回整段 HTML 也能成功落库并进入预览
- 下载 OpenClaw Skill 压缩包，确认导出的 `SKILL.md / README.md` 已包含统一素材库、公众号采集、龙虾日记相关说明
- 跑后端构建并检查本次修改文件的类型诊断

## 7. 相关文件

- `apps/server/src/modules/openclaw/openclaw-installation.service.ts`
- `apps/server/src/modules/works/works.service.ts`
- `apps/server/src/modules/admin/skills-prompts.service.ts`
- `apps/server/src/common/mock-data.ts`
- `apps/server/src/common/prompt-source-loader.ts`
- `apps/web/src/app/(dashboard)/wechat/workspace-shell.tsx`
- `apps/web/src/services/admin.ts`
- `docs/openclaw/OpenClaw第一阶段MCP工具清单.md`

## 2026-06-21 复刻短视频独立能力包修正

### 背景

- 用户反馈“复刻短视频”两个技能虽然在左侧树上能看到，但右侧详情仍然像没有真正落进来。
- 后台截图里最明显的异常是：
  - 当前选中 `复刻短视频-复刻分析`
  - 右侧却显示 `上游技能输出 = 抖音AI生视频`
  - `References 来源 / Scripts 来源` 仍落在“抖音视频生产能力包”

### 根因

- 之前的修复只补齐了 `douyin-video-production` 能力包主体和模块挂载。
- 但 `douyin-remix-short-video-studio` 与 `douyin-remix-short-video-compose` 仍然挂在共享的 `douyin-video-production` 下。
- 后台技能详情页的“上游技能输出 / 技能链路”是按“同一能力包里的启用技能”计算的，因此会把复刻短视频和 `douyin-direct-video-studio` 混成一条链。
- 结果就是：
  - 左侧叶子节点有了
  - 但右侧上下文仍像挂在 AI 生视频链路里
  - 用户感知就是“这两个技能还是没真正出来”

### 本次修改

- 新增独立能力包 `douyin-remix-short-video`
  - 名称：`抖音复刻短视频能力包`
  - 工作流步骤：`douyin-remix-short-video-step`
- 将以下两个技能从共享视频生产包拆出，改挂到新能力包：
  - `douyin-remix-short-video-studio`
  - `douyin-remix-short-video-compose`
- 保留 `douyin-video-production` 仅服务抖音 AI 生视频直出链路。
- `douyin-workbench.defaultSkillPackages` 补为：
  - `tongcheng-brand-douyin-planning`
  - `douyin-video-production`
  - `douyin-remix-short-video`
- 前端 `skillAssetBindingSeed` 补齐两个复刻技能到新能力包的映射，确保后台详情页优先命中新包。
- 运行时知识/提示词 scope 中，`DOUYIN_REMIX_SHORT_VIDEO` 改为读取 `douyin-remix-short-video`。

### 老库兼容

- 启动时会自动把 `douyin-workbench` 的默认能力包补上 `douyin-remix-short-video`。
- 启动时会自动把数据库里旧的两个复刻技能关系迁移到新能力包，不要求手工改表。

### 预期结果

- 后台技能页选中“复刻短视频-复刻分析”或“复刻短视频-拼接成片”时：
  - 所在能力包应显示为“抖音复刻短视频能力包”
  - 上游/下游技能链应只围绕复刻短视频两步展开
  - 不再错误串到“抖音AI生视频”
- 后台首屏详情区会直接显示：
  - `下游技能承接`
  - `完整技能链路`
- 用户无需再滚动到更下面的“输出”区，首屏即可看到两个复刻短视频技能已经串成一条链路。

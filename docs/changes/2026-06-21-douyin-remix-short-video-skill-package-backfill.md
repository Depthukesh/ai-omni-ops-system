## 2026-06-21 抖音复刻短视频技能包补齐

### 背景

- 用户反馈“某音/某号-复刻短视频”板块的两个技能没有真正落进去。
- 回看 `docs/changes/2026-06-19-douyin-remix-short-video-workspace.md` 后确认，技能中心叶子节点和技能/提示词绑定虽然已经注册，但模块装配链仍有缺口。

### 问题定位

- `douyin-remix-short-video-studio` 与 `douyin-remix-short-video-compose` 都挂在能力包 `douyin-video-production` 下。
- 但 `apps/server/src/common/mock-data.ts` 与 `apps/web/src/services/admin.ts` 中缺少 `douyin-video-production` 这个能力包主体记录。
- `douyin-workbench` 的 `defaultSkillPackages` 误写成了 `douyin-direct-video`，这不是能力包 key，导致模块默认装配无法正确推导到复刻短视频技能。
- 相关模块/能力包/技能关系服务的启动补种逻辑此前是“表里已有数据就直接返回”，老库不会自动拿到这次新增的包和绑定关系。

### 本次修改

- 在 `apps/server/src/common/mock-data.ts` 中新增：
  - `douyin-video-production` 能力包主体
  - `spv_douyin_video_production_v1` 版本快照
  - `spm_douyin_video_production_default` 模块默认挂载
  - `douyin-workbench.defaultSkillPackages` 改为 `["tongcheng-brand-douyin-planning", "douyin-video-production"]`
- 在 `apps/web/src/services/admin.ts` 中同步新增前端 fallback 所需的能力包主体与模块挂载，并把两个复刻短视频技能的能力包绑定改回默认绑定。
- 在以下服务中，把启动补种逻辑改成支持“增量补齐缺失种子”，不再只在空表时初始化：
  - `apps/server/src/modules/admin/skill-packages.service.ts`
  - `apps/server/src/modules/admin/skill-package-modules.service.ts`
  - `apps/server/src/modules/admin/skill-package-skills.service.ts`
- 在 `apps/server/src/modules/admin/module-definitions.service.ts` 中新增定向修正：
  - 启动时检查 `douyin-workbench`
  - 自动移除错误的 `douyin-direct-video`
  - 自动补入正确的 `douyin-video-production`

### 结果

- “复刻短视频-复刻分析”
- “复刻短视频-拼接成片”

以上两个技能现在不仅在技能中心有叶子节点，也能通过 `douyin-workbench -> douyin-video-production` 这条模块装配链被正确推导到“某音/某号-复刻短视频”板块。

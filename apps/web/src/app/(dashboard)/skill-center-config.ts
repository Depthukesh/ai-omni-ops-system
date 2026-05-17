export type SkillCenterLeafConfig = {
  id: string;
  label: string;
  description: string;
  skillSlug?: string;
  promptScene?: string;
};

export type SkillCenterSectionConfig = {
  id: string;
  label: string;
  items: SkillCenterLeafConfig[];
};

export type SkillCenterPrimaryConfig = {
  id: string;
  label: string;
  sections: SkillCenterSectionConfig[];
};

export const SKILL_CENTER_TREE: SkillCenterPrimaryConfig[] = [
  {
    id: "brand-growth",
    label: "品牌增长策略",
    sections: [
      {
        id: "growth-report",
        label: "品牌增长报告",
        items: [
          {
            id: "growth-report-main",
            label: "品牌增长报告-生成品牌增长报告",
            description: "用于生成品牌全域增长分析报告。",
            skillSlug: "brand-omni-growth-analysis",
            promptScene: "品牌增长报告生成",
          },
          {
            id: "growth-report-visual",
            label: "品牌增长可视化报告-生成可视化报告",
            description: "用于把品牌增长报告转成前端可展示的可视化报告。",
            skillSlug: "article-visual-report-designer",
            promptScene: "HTML 可视化报告生成",
          },
        ],
      },
      {
        id: "annual-plan",
        label: "半年营销规划",
        items: [
          {
            id: "annual-plan-main",
            label: "半年营销规划-生成半年营销规划",
            description: "用于输出未来半年节奏、节点和多平台联动规划。",
            skillSlug: "enterprise-annual-plan",
            promptScene: "半年营销规划生成",
          },
        ],
      },
    ],
  },
  {
    id: "xiaohongshu",
    label: "小红书",
    sections: [
      {
        id: "xhs-planning",
        label: "营销规划",
        items: [
          {
            id: "xhs-plan-main",
            label: "小红书营销规划-生成营销规划",
            description: "用于输出小红书年度种草策略、内容支柱与排期建议。",
            skillSlug: "xiaohongshu-brand-marketing-plan",
            promptScene: "小红书营销规划",
          },
          {
            id: "xhs-calendar-main",
            label: "营销日历-生成7天营销日历",
            description: "对应前台营销日历工作区，基于营销策划方案、半年规划、热点与历史记录生成未来 7 天日历。",
            skillSlug: "xiaohongshu-marketing-calendar",
            promptScene: "小红书营销日历生成",
          },
        ],
      },
      {
        id: "xhs-content",
        label: "内容生产",
        items: [
          {
            id: "xhs-original-copy",
            label: "原创笔记-原创文案",
            description: "对应前台原创笔记工作台，生成可直接发布的标题、正文与标签。",
            skillSlug: "original_copy",
            promptScene: "小红书原创笔记文案",
          },
          {
            id: "xhs-original-image",
            label: "原创笔记-原创配图",
            description: "对应前台原创笔记工作台，生成封面提示词与多张配图提示词。",
            skillSlug: "xhs-original-image-prompt",
            promptScene: "小红书原创笔记配图",
          },
          {
            id: "xhs-original-image-generation",
            label: "原创笔记-图片生成",
            description: "对应前台原创笔记工作台，控制最终出图模型、参考图跟随策略与中文排版安全区。",
            skillSlug: "xhs-original-image-generation",
            promptScene: "小红书原创图片生成",
          },
          {
            id: "xhs-rewrite-copy",
            label: "二创笔记-二创文案",
            description: "对应前台二创笔记工作台，生成二创标题、正文与标签。",
            skillSlug: "rewrite_copy",
            promptScene: "小红书二创笔记文案",
          },
          {
            id: "xhs-rewrite-note",
            label: "二创笔记-二创配图",
            description: "对应前台二创笔记工作台，生成参考图拆解后的二创配图提示词。",
            skillSlug: "rewrite_image",
            promptScene: "小红书二创笔记配图",
          },
          {
            id: "xhs-rewrite-image-generation",
            label: "二创笔记-图片生成",
            description: "对应前台二创笔记工作台，控制最终出图模型、对标图跟随策略与中文排版安全区。",
            skillSlug: "rewrite_image_generation",
            promptScene: "小红书二创图片生成",
          },
        ],
      },
      {
        id: "xhs-video-script",
        label: "视频笔记-剧本策划",
        items: [
          {
            id: "xhs-video-brand-script",
            label: "视频笔记-品牌宣传剧本",
            description: "对应前台品牌宣传视频，第 1 阶段生成创意剧本。",
            skillSlug: "short-video-api-studio",
            promptScene: "视频笔记-品牌宣传剧本",
          },
          {
            id: "xhs-video-spoken-script",
            label: "视频笔记-口播带货剧本",
            description: "对应前台口播带货视频，第 1 阶段生成创意剧本。",
            skillSlug: "short-video-api-studio",
            promptScene: "视频笔记-口播带货剧本",
          },
          {
            id: "xhs-video-skit-script",
            label: "视频笔记-短剧带货剧本",
            description: "对应前台短剧带货视频，第 1 阶段生成创意剧本。",
            skillSlug: "short-video-api-studio",
            promptScene: "视频笔记-短剧带货剧本",
          },
          {
            id: "xhs-video-remix-script",
            label: "视频笔记-复刻视频拆解",
            description: "对应前台复刻视频，第 1 阶段根据素材视频拆解剧情脚本。",
            skillSlug: "short-video-api-studio",
            promptScene: "视频笔记-复刻视频拆解",
          },
        ],
      },
      {
        id: "xhs-video-production",
        label: "视频笔记-视频生成",
        items: [
          {
            id: "xhs-video-storyboard",
            label: "视频笔记-故事板提示词",
            description: "对应前台第 2 阶段，根据剧本生成故事板提示词并驱动故事板图片生成。",
            skillSlug: "short-video-api-studio",
            promptScene: "视频笔记-故事板提示词",
          },
          {
            id: "xhs-video-short-prompt",
            label: "视频笔记-短视频提示词",
            description: "对应前台第 3 阶段，根据故事板提示词和故事板图片生成短视频提示词。",
            skillSlug: "short-video-api-studio",
            promptScene: "视频笔记-短视频提示词",
          },
        ],
      },
    ],
  },
  {
    id: "douyin",
    label: "抖音",
    sections: [
      {
        id: "douyin-planning",
        label: "运营规划",
        items: [
          {
            id: "douyin-plan-main",
            label: "抖音品牌规划",
            description: "预留抖音内容规划与投放策略的技能入口。",
          },
        ],
      },
    ],
  },
];

export function flattenSkillCenterLeaves(tree: SkillCenterPrimaryConfig[] = SKILL_CENTER_TREE) {
  return tree.flatMap((primary) =>
    primary.sections.flatMap((section) =>
      section.items.map((item) => ({
        ...item,
        primaryId: primary.id,
        primaryLabel: primary.label,
        sectionId: section.id,
        sectionLabel: section.label,
      })),
    ),
  );
}

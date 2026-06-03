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
        label: "营销规划",
        items: [
          {
            id: "douyin-plan-main",
            label: "抖音营销策划方案-生成营销策划方案",
            description: "对应前台抖音营销策划方案工作台，基于品牌报告、半年规划和抖音采集数据生成完整策划方案。",
            skillSlug: "tongcheng-brand-douyin-planning",
            promptScene: "抖音营销策划方案",
          },
          {
            id: "douyin-hot-topic-candidates-main",
            label: "热点找选题-生成热点选题",
            description: "对应前台抖音热点找选题板块，基于所选日期的每日热点榜单与品牌背景资料生成 3 个可勾选选题。",
            skillSlug: "douyin-hot-topic-candidates",
            promptScene: "抖音热点找选题",
          },
        ],
      },
      {
        id: "douyin-content",
        label: "内容生产",
        items: [
          {
            id: "douyin-original-copy-viewpoint",
            label: "原创文案-聊观点",
            description: "对应前台抖音原创文案板块，生成观点表达型短视频文案。",
            skillSlug: "douyin-original-copy-viewpoint",
            promptScene: "抖音原创文案-聊观点",
          },
          {
            id: "douyin-original-copy-story",
            label: "原创文案-讲故事",
            description: "对应前台抖音原创文案板块，生成故事叙事型短视频文案。",
            skillSlug: "douyin-original-copy-story",
            promptScene: "抖音原创文案-讲故事",
          },
          {
            id: "douyin-original-copy-process",
            label: "原创文案-晒过程",
            description: "对应前台抖音原创文案板块，生成过程展示型短视频文案。",
            skillSlug: "douyin-original-copy-process",
            promptScene: "抖音原创文案-晒过程",
          },
          {
            id: "douyin-original-copy-knowledge",
            label: "原创文案-教知识",
            description: "对应前台抖音原创文案板块，生成知识讲解型短视频文案。",
            skillSlug: "douyin-original-copy-knowledge",
            promptScene: "抖音原创文案-教知识",
          },
          {
            id: "douyin-original-copy-plot-sales",
            label: "原创文案-剧情带货",
            description: "对应前台抖音原创文案板块，生成剧情带货型短视频文案。",
            skillSlug: "douyin-original-copy-plot-sales",
            promptScene: "抖音原创文案-剧情带货",
          },
          {
            id: "douyin-original-copy-seeding",
            label: "原创文案-种草类",
            description: "对应前台抖音原创文案板块，生成种草推荐型短视频文案。",
            skillSlug: "douyin-original-copy-seeding",
            promptScene: "抖音原创文案-种草类",
          },
          {
            id: "douyin-original-copy-local-sales",
            label: "原创文案-同城带货",
            description: "对应前台抖音原创文案板块，生成同城带货型短视频文案。",
            skillSlug: "douyin-original-copy-local-sales",
            promptScene: "抖音原创文案-同城带货",
          },
          {
            id: "douyin-remix-copy-intro",
            label: "二创文案-拆解开头",
            description: "对应前台抖音二创文案板块，第 1 阶段拆解素材视频文案的开头结构。",
            skillSlug: "douyin-remix-copy-intro",
            promptScene: "抖音二创文案-拆解开头",
          },
          {
            id: "douyin-remix-copy-body",
            label: "二创文案-拆解正文",
            description: "对应前台抖音二创文案板块，第 2 阶段拆解素材视频文案的正文结构。",
            skillSlug: "douyin-remix-copy-body",
            promptScene: "抖音二创文案-拆解正文",
          },
          {
            id: "douyin-remix-copy-outro",
            label: "二创文案-拆解结尾",
            description: "对应前台抖音二创文案板块，第 3 阶段拆解素材视频文案的结尾与转化动作。",
            skillSlug: "douyin-remix-copy-outro",
            promptScene: "抖音二创文案-拆解结尾",
          },
          {
            id: "douyin-remix-copy-final",
            label: "二创文案-生成二创文案",
            description: "对应前台抖音二创文案板块，整合拆解结果与品牌资料生成最终二创文案。",
            skillSlug: "douyin-remix-copy-final",
            promptScene: "抖音二创文案-生成二创文案",
          },
        ],
      },
      {
        id: "douyin-video-script",
        label: "AI生视频（故事板）-剧本策划",
        items: [
          {
            id: "douyin-video-brand-script",
            label: "AI生视频-品牌宣传剧本",
            description: "对应前台抖音 AI生视频（故事板）板块，生成品牌宣传视频的创意剧本。",
            skillSlug: "douyin-video-storyboard-studio",
            promptScene: "抖音AI生视频（故事板）-品牌宣传剧本",
          },
          {
            id: "douyin-video-spoken-script",
            label: "AI生视频-口播带货剧本",
            description: "对应前台抖音 AI生视频（故事板）板块，生成口播视频/口播带货视频的创意剧本。",
            skillSlug: "douyin-video-storyboard-studio",
            promptScene: "抖音AI生视频（故事板）-口播带货剧本",
          },
          {
            id: "douyin-video-skit-script",
            label: "AI生视频-短剧带货剧本",
            description: "对应前台抖音 AI生视频（故事板）板块，生成短剧带货视频的创意剧本。",
            skillSlug: "douyin-video-storyboard-studio",
            promptScene: "抖音AI生视频（故事板）-短剧带货剧本",
          },
          {
            id: "douyin-video-remix-script",
            label: "AI生视频-复刻视频拆解",
            description: "对应前台抖音 AI生视频（故事板）板块，根据素材视频拆解复刻脚本。",
            skillSlug: "douyin-video-storyboard-studio",
            promptScene: "抖音AI生视频（故事板）-复刻视频拆解",
          },
        ],
      },
      {
        id: "douyin-video-production",
        label: "AI生视频（故事板）-视频生成",
        items: [
          {
            id: "douyin-video-storyboard",
            label: "AI生视频-故事板提示词",
            description: "对应前台抖音 AI生视频（故事板）板块，第 2 阶段根据剧本生成故事板提示词并驱动故事板图片生成。",
            skillSlug: "douyin-video-storyboard-studio",
            promptScene: "抖音AI生视频（故事板）-故事板提示词",
          },
        ],
      },
      {
        id: "douyin-direct-video",
        label: "AI生视频",
        items: [
          {
            id: "douyin-direct-video-prompt",
            label: "AI生视频-Seedance提示词",
            description: "对应前台抖音 AI生视频 板块，根据选题、产品、素材和用户要求生成可直接用于 Seedance 2.0 的视频提示词。",
            skillSlug: "douyin-direct-video-studio",
            promptScene: "抖音AI生视频-Seedance提示词",
          },
        ],
      },
      {
        id: "douyin-digital-human",
        label: "数字人",
        items: [
          {
            id: "douyin-digital-human-script",
            label: "数字人-口播脚本",
            description: "对应前台抖音数字人板块，用于生成适合数字人口播视频的短视频脚本。",
            skillSlug: "douyin-digital-human-script-studio",
            promptScene: "抖音数字人-口播脚本",
          },
        ],
      },
    ],
  },
  {
    id: "wechat-oa",
    label: "公众号",
    sections: [
      {
        id: "wechat-compose",
        label: "创作与发布",
        items: [
          {
            id: "wechat-article-compose",
            label: "公众号-创作文章",
            description: "对应前台公众号创作弹窗，基于营销日历、产品信息、品牌信息和主题色生成 HTML 文章草稿。",
            skillSlug: "wechat-article-composer",
            promptScene: "公众号创作文章",
          },
          {
            id: "wechat-image-compose",
            label: "公众号-制作图片",
            description: "对应前台公众号创作弹窗，生成公众号头图、封面图和文中配图，并对接第三方文生图模型。",
            skillSlug: "wechat-image-designer",
            promptScene: "公众号制作图片",
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

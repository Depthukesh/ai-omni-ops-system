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
    id: "opportunity-insight",
    label: "机会洞察",
    sections: [
      {
        id: "opportunity-insight-skills",
        label: "4个技能",
        items: [
          {
            id: "opportunity-insight-brand-account",
            label: "机会洞察-品牌账号分析",
            description: "对应机会洞察第 1 步，分析小红书与抖音品牌账号内容结构、账号定位与增长信号。",
            skillSlug: "opportunity-insight-brand-account-analysis",
            promptScene: "机会洞察-品牌账号分析",
          },
          {
            id: "opportunity-insight-competitor-account",
            label: "机会洞察-竞品账号分析",
            description: "对应机会洞察第 1 步，分析小红书与抖音竞品账号打法、内容节奏与差异化策略。",
            skillSlug: "opportunity-insight-competitor-account-analysis",
            promptScene: "机会洞察-竞品账号分析",
          },
          {
            id: "opportunity-insight-comment",
            label: "机会洞察-评论洞察分析",
            description: "对应机会洞察第 2 步，提炼评论中的用户痛点、需求与负反馈信号。",
            skillSlug: "opportunity-insight-comment-analysis",
            promptScene: "机会洞察-评论洞察分析",
          },
          {
            id: "opportunity-insight-final",
            label: "机会洞察-机会洞察总报告",
            description: "对应机会洞察第 3 步，整合品牌资料与前序分析结果输出机会洞察总报告。",
            skillSlug: "opportunity-insight-final-report",
            promptScene: "机会洞察-机会洞察总报告",
          },
        ],
      },
    ],
  },
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
      {
        id: "marketing-calendar",
        label: "营销日历",
        items: [
          {
            id: "xhs-calendar-main",
            label: "营销日历-品牌全平台营销日历",
            description: "对应前台营销日历工作区，基于品牌背景资料、机会洞察总报告、品牌增长报告与系统内容能力清单生成品牌全平台日历。",
            skillSlug: "xiaohongshu-marketing-calendar",
            promptScene: "品牌全平台营销日历生成",
          },
        ],
      },
      {
        id: "topic-library",
        label: "选题库",
        items: [
          {
            id: "brand-growth-topic-library-main",
            label: "选题库-生成热点选题",
            description: "对应前台品牌增长策略 > 品牌增长报告 > 选题库，基于所选日期的每日热点榜单与品牌背景资料生成可勾选热点选题，并沉淀进品牌选题库。",
            skillSlug: "douyin-hot-topic-candidates",
            promptScene: "抖音热点找选题",
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
        ],
      },
      {
        id: "xhs-content",
        label: "内容生产",
        items: [
          {
            id: "xhs-original-copy",
            label: "原创笔记-通用文案",
            description: "对应前台原创笔记工作台里的通用笔记，生成可直接发布的标题、正文与标签。",
            skillSlug: "original_copy",
            promptScene: "小红书原创笔记文案",
          },
          {
            id: "xhs-original-copy-science",
            label: "原创笔记-科普类文案",
            description: "对应前台原创笔记工作台里的科普类笔记，突出知识解释、判断标准与收藏价值。",
            skillSlug: "xhs-original-copy-science",
            promptScene: "小红书原创笔记-科普类文案",
          },
          {
            id: "xhs-original-copy-review",
            label: "原创笔记-测评类文案",
            description: "对应前台原创笔记工作台里的测评类笔记，突出同维度对比、测评结构与选择建议。",
            skillSlug: "xhs-original-copy-review",
            promptScene: "小红书原创笔记-测评类文案",
          },
          {
            id: "xhs-original-copy-avoid-pitfall",
            label: "原创笔记-避坑类文案",
            description: "对应前台原创笔记工作台里的避坑类笔记，突出误区识别、风险提醒与正确选择标准。",
            skillSlug: "xhs-original-copy-avoid-pitfall",
            promptScene: "小红书原创笔记-避坑类文案",
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
        id: "douyin-remix-short-video",
        label: "复刻短视频",
        items: [
          {
            id: "douyin-remix-short-video-analysis",
            label: "复刻短视频-复刻分析",
            description: "对应前台抖音复刻短视频板块，按每 15 秒一段完成视频分析、角色卡、分镜脚本和出图提示词。",
            skillSlug: "douyin-remix-short-video-studio",
            promptScene: "抖音复刻短视频-复刻分析",
          },
          {
            id: "douyin-remix-short-video-compose",
            label: "复刻短视频-拼接成片",
            description: "对应前台抖音复刻短视频板块第二阶段，根据分镜图生成各段视频并拼接完整成片。",
            skillSlug: "douyin-remix-short-video-compose",
            promptScene: "拼接复刻短视频-分段提示词",
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
        label: "创作工作流",
        items: [
          {
            id: "wechat-article-compose",
            label: "公众号-创作文章",
            description: "对应公众号工作流的文章阶段，用于生成标题、摘要、正文结构与可供后续渲染的文章稿。",
            skillSlug: "wechat-article-composer",
            promptScene: "公众号创作文章",
          },
          {
            id: "wechat-cover-image-compose",
            label: "公众号-封面图生成",
            description: "对应公众号工作流的生图阶段，用于生成公众号封面图、头图与发布封面主视觉。",
            skillSlug: "wechat-cover-image-designer",
            promptScene: "公众号封面图生成",
          },
          {
            id: "wechat-body-image-compose",
            label: "公众号-正文配图生成",
            description: "对应公众号工作流的生图阶段，用于生成正文插图、场景图和产品辅助图。",
            skillSlug: "wechat-body-image-designer",
            promptScene: "公众号正文配图生成",
          },
          {
            id: "wechat-html-general",
            label: "公众号-通用排版",
            description: "对应公众号工作流的排版阶段，使用通用排版风格渲染公众号HTML。",
            skillSlug: "wechat-html-general",
            promptScene: "公众号HTML通用排版",
          },
          {
            id: "wechat-html-minimal",
            label: "公众号-极简排版",
            description: "对应公众号工作流的排版阶段，使用极简排版风格渲染公众号HTML。",
            skillSlug: "wechat-html-minimal",
            promptScene: "公众号HTML极简排版",
          },
          {
            id: "wechat-html-space",
            label: "公众号-空间艺术排版",
            description: "对应公众号工作流的排版阶段，使用空间艺术排版风格渲染公众号HTML。",
            skillSlug: "wechat-html-space",
            promptScene: "公众号HTML空间艺术排版",
          },
          {
            id: "wechat-html-notice",
            label: "公众号-通知类排版",
            description: "对应公众号工作流的排版阶段，使用通知类排版风格渲染公众号HTML。",
            skillSlug: "wechat-html-notice",
            promptScene: "公众号HTML通知类排版",
          },
          {
            id: "wechat-api-publish",
            label: "公众号-API发布",
            description: "对应公众号工作流的 API 发布确认阶段，用于校验发布参数、评论策略和草稿箱发布动作。",
            skillSlug: "wechat-api-publisher",
            promptScene: "公众号API发布",
          },
        ],
      },
    ],
  },
  {
    id: "design-workspace",
    label: "设计",
    sections: [
      {
        id: "design-image",
        label: "图片设计",
        items: [
          {
            id: "design-social-carousel",
            label: "图片设计-社媒轮播图",
            description: "用于生成社媒轮播图、方版卡片和品牌传播视觉。",
            skillSlug: "design-social-carousel",
            promptScene: "设计工作台-社媒轮播图设计",
          },
          {
            id: "design-magazine-poster",
            label: "图片设计-杂志风海报",
            description: "用于生成杂志风海报、封面图和主视觉。",
            skillSlug: "design-magazine-poster",
            promptScene: "设计工作台-杂志风海报设计",
          },
          {
            id: "design-motion-frames",
            label: "图片设计-动效首帧",
            description: "用于生成动效海报首帧、动态标题视觉和动画关键帧。",
            skillSlug: "design-motion-frames",
            promptScene: "设计工作台-动效首帧设计",
          },
          {
            id: "design-sprite-animation",
            label: "图片设计-像素动画首帧",
            description: "用于生成像素风、8-bit 和循环动画首帧视觉。",
            skillSlug: "design-sprite-animation",
            promptScene: "设计工作台-像素动画首帧设计",
          },
        ],
      },
      {
        id: "design-html",
        label: "HTML 设计",
        items: [
          {
            id: "design-web-prototype",
            label: "HTML设计-单页原型",
            description: "用于生成 landing、活动页和品牌展示页。",
            skillSlug: "design-web-prototype",
            promptScene: "设计工作台-HTML 原型设计",
          },
          {
            id: "design-dashboard",
            label: "HTML设计-数据看板",
            description: "用于生成后台看板、经营分析页和运营监控页。",
            skillSlug: "design-dashboard",
            promptScene: "设计工作台-数据看板设计",
          },
          {
            id: "design-saas-landing",
            label: "HTML设计-SaaS落地页",
            description: "用于生成营销卖点、功能区、价格区和 CTA 完整落地页。",
            skillSlug: "design-saas-landing",
            promptScene: "设计工作台-SaaS 落地页设计",
          },
          {
            id: "design-email-marketing",
            label: "HTML设计-邮件营销页",
            description: "用于生成新品发布、促销预热和活动通知邮件页面。",
            skillSlug: "design-email-marketing",
            promptScene: "设计工作台-邮件营销页设计",
          },
          {
            id: "design-docs-page",
            label: "HTML设计-文档展示页",
            description: "用于生成知识页、说明页和帮助中心页面。",
            skillSlug: "design-docs-page",
            promptScene: "设计工作台-文档展示页设计",
          },
          {
            id: "design-blog-post",
            label: "HTML设计-博客长页",
            description: "用于生成专题页、长图文博客页和内容发布页。",
            skillSlug: "design-blog-post",
            promptScene: "设计工作台-博客长页设计",
          },
          {
            id: "design-mobile-onboarding",
            label: "HTML设计-移动端引导",
            description: "用于生成多屏移动端原型。",
            skillSlug: "design-mobile-onboarding",
            promptScene: "设计工作台-移动端引导设计",
          },
          {
            id: "design-gamified-app",
            label: "HTML设计-游戏化活动页",
            description: "用于生成任务闯关、积分激励和签到打卡类页面。",
            skillSlug: "design-gamified-app",
            promptScene: "设计工作台-游戏化活动页设计",
          },
        ],
      },
      {
        id: "design-deck",
        label: "PPT 设计",
        items: [
          {
            id: "design-pitch-deck",
            label: "PPT设计-Pitch Deck",
            description: "用于生成品牌提案、融资 deck 和汇报结构。",
            skillSlug: "design-pitch-deck",
            promptScene: "设计工作台-Pitch Deck 设计",
          },
          {
            id: "design-weekly-update",
            label: "PPT设计-周报更新",
            description: "用于生成阶段周报、里程碑同步和项目更新 deck。",
            skillSlug: "design-weekly-update",
            promptScene: "设计工作台-周报更新 Deck",
          },
          {
            id: "design-simple-deck",
            label: "PPT设计-极简Deck",
            description: "用于生成极简汇报、单主题提案和产品概览演示稿。",
            skillSlug: "design-simple-deck",
            promptScene: "设计工作台-极简 Deck",
          },
        ],
      },
      {
        id: "design-video",
        label: "视频设计",
        items: [
          {
            id: "design-video-storyboard",
            label: "视频设计-视频故事板",
            description: "用于生成镜头脚本、画面分镜和字幕口播建议。",
            skillSlug: "design-video-storyboard",
            promptScene: "设计工作台-视频故事板设计",
          },
          {
            id: "design-motion-storyboard",
            label: "视频设计-动效脚本",
            description: "用于生成转场脚本、动效节奏和动画镜头说明。",
            skillSlug: "design-motion-storyboard",
            promptScene: "设计工作台-动效脚本设计",
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

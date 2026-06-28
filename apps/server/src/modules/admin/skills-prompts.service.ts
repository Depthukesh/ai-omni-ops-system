import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createId, database, type PromptTemplateRecord, type SkillConfigRecord } from "../../common/mock-data";
import { normalizeSafeText } from "../../common/prompt-injection-guard";
import {
  PROMPT_SOURCE_CANDIDATES,
  readPromptSourceBundle,
} from "../../common/prompt-source-loader";
import { PrismaService } from "../../prisma/prisma.service";

type SkillConfigRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: SkillConfigRecord["status"];
  provider: string;
  defaultModel: string;
  pointsCost: number;
  description: string;
  inputSchemaJson: Prisma.JsonValue | null;
  updatedAt: Date | string;
};

type PromptTemplateRow = {
  id: string;
  name: string;
  scene: string;
  version: string;
  status: PromptTemplateRecord["status"];
  modelName: string;
  temperature: number;
  maxTokens: number;
  content: string;
  updatedAt: Date | string;
};

type SkillPromptBindingRow = {
  id: string;
  skillId: string;
  promptId: string;
  skillSlug: string;
  promptScene: string;
  bindingType: string;
  isPrimary: boolean;
  sortOrder: number;
  enabled: boolean;
  remarks: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  skillName?: string;
  promptName?: string;
};

const SOURCE_PINNED_PROMPT_IDS = new Set([
  "prompt_opportunity_insight_brand_account",
  "prompt_opportunity_insight_competitor_account",
  "prompt_opportunity_insight_comment",
  "prompt_opportunity_insight_final_report",
  "prompt_xhs_calendar",
  "prompt_wechat_body_image_compose",
]);
const SOURCE_PINNED_PROMPT_SCENES = new Set([
  "机会洞察-品牌账号分析",
  "机会洞察-竞品账号分析",
  "机会洞察-评论洞察分析",
  "机会洞察-机会洞察总报告",
  "品牌全平台营销日历生成",
  "公众号正文配图生成",
]);

export type UpdateSkillConfigPayload = {
  status?: SkillConfigRecord["status"];
  provider?: string;
  defaultModel?: string;
  pointsCost?: number;
  description?: string;
  inputSchemaJson?: Prisma.JsonValue | null;
};

export type CreateSkillConfigPayload = {
  name: string;
  slug: string;
  category: string;
  status?: SkillConfigRecord["status"];
  provider: string;
  defaultModel: string;
  pointsCost?: number;
  description?: string;
  inputSchemaJson?: Prisma.JsonValue | null;
};

export type UpdatePromptTemplatePayload = {
  status?: PromptTemplateRecord["status"];
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  content?: string;
};

export type CreatePromptTemplatePayload = {
  name: string;
  scene: string;
  version?: string;
  status?: PromptTemplateRecord["status"];
  modelName: string;
  temperature?: number;
  maxTokens?: number;
  content?: string;
};

export type SkillPromptBindingRecord = {
  id: string;
  skillId: string;
  skillSlug: string;
  skillName?: string;
  promptId: string;
  promptScene: string;
  promptName?: string;
  bindingType: "PRIMARY" | "SUPPLEMENTAL" | "FALLBACK";
  isPrimary: boolean;
  sortOrder: number;
  enabled: boolean;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
};

export type ListSkillPromptBindingsQuery = {
  skillSlug?: string;
  promptScene?: string;
  enabled?: boolean;
};

export type CreateSkillPromptBindingPayload = {
  skillId?: string;
  skillSlug?: string;
  promptId?: string;
  promptScene?: string;
  bindingType?: SkillPromptBindingRecord["bindingType"];
  isPrimary?: boolean;
  sortOrder?: number;
  enabled?: boolean;
  remarks?: string;
};

export type UpdateSkillPromptBindingPayload = {
  bindingType?: SkillPromptBindingRecord["bindingType"];
  isPrimary?: boolean;
  sortOrder?: number;
  enabled?: boolean;
  remarks?: string;
};

type SkillPromptBindingRule = {
  promptIds?: string[];
  promptScenes?: string[];
};

const LEGACY_IMAGE_GENERATION_DEFAULT_MODEL = "provider_runtime_image_generation::gpt-image-2";
const RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL = "provider_runtime_image_generation_right_codes::gpt-image-2";
const RIGHT_CODES_IMAGE_PROVIDER_LABEL = "Right Codes · 文生图/图生图";
const LEGACY_VIDEO_NOTE_DEFAULT_MODEL = "seedance";
const VOLCENGINE_VIDEO_NOTE_DEFAULT_MODEL = "doubao-seedance-2-0-260128";
const VOLCENGINE_VIDEO_PROVIDER_LABEL = "火山方舟 · Seedance 2.0";
const DOUYIN_ORIGINAL_COPY_LEGACY_FALLBACKS: Record<string, string> = {
  prompt_douyin_original_copy_viewpoint: "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成聊观点类抖音原创文案。",
  prompt_douyin_original_copy_story: "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成讲故事类抖音原创文案。",
  prompt_douyin_original_copy_process: "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成晒过程类抖音原创文案。",
  prompt_douyin_original_copy_knowledge: "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成教知识类抖音原创文案。",
  prompt_douyin_original_copy_plot_sales: "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成剧情带货类抖音原创文案。",
  prompt_douyin_original_copy_seeding: "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成种草类抖音原创文案。",
  prompt_douyin_original_copy_local_sales: "根据品牌资料、营销日历、选题内容与抖音营销策划方案，生成同城带货类抖音原创文案。",
};

const XHS_ORIGINAL_COPY_LEGACY_FALLBACKS: Record<string, string> = {
  prompt_xhs_original_copy_science:
    "根据营销规划方案、营销日历选题、产品信息和用户附加要求，生成适合小红书发布的科普类原创标题、正文与标签。",
  prompt_xhs_original_copy_review:
    "根据营销规划方案、营销日历选题、产品信息和用户附加要求，生成适合小红书发布的测评类原创标题、正文与标签。",
  prompt_xhs_original_copy_avoid_pitfall:
    "根据营销规划方案、营销日历选题、产品信息和用户附加要求，生成适合小红书发布的避坑类原创标题、正文与标签。",
};

const WECHAT_HTML_GENERAL_PROMPT_ID = "prompt_wechat_html_general";
const WECHAT_HTML_MINIMAL_PROMPT_ID = "prompt_wechat_html_minimal";
const WECHAT_HTML_SPACE_PROMPT_ID = "prompt_wechat_html_space";
const WECHAT_HTML_NOTICE_PROMPT_ID = "prompt_wechat_html_notice";

const WECHAT_HTML_GENERAL_SCENE = "公众号HTML通用排版";
const WECHAT_HTML_MINIMAL_SCENE = "公众号HTML极简排版";
const WECHAT_HTML_SPACE_SCENE = "公众号HTML空间艺术排版";
const WECHAT_HTML_NOTICE_SCENE = "公众号HTML通知类排版";

const SKILL_PROMPT_BINDINGS: Record<string, SkillPromptBindingRule> = {
  skill_growth_analysis: {
    promptIds: ["prompt_growth_report"],
    promptScenes: ["品牌增长报告生成"],
  },
  "brand-omni-growth-analysis": {
    promptIds: ["prompt_growth_report"],
    promptScenes: ["品牌增长报告生成"],
  },
  skill_annual_plan: {
    promptIds: ["prompt_annual_marketing_plan", "prompt_annual_plan"],
    promptScenes: ["半年营销规划生成", "全年营销规划生成"],
  },
  "enterprise-annual-plan": {
    promptIds: ["prompt_annual_marketing_plan", "prompt_annual_plan"],
    promptScenes: ["半年营销规划生成", "全年营销规划生成"],
  },
  skill_opportunity_insight_brand_account: {
    promptIds: ["prompt_opportunity_insight_brand_account"],
    promptScenes: ["机会洞察-品牌账号分析"],
  },
  "opportunity-insight-brand-account-analysis": {
    promptIds: ["prompt_opportunity_insight_brand_account"],
    promptScenes: ["机会洞察-品牌账号分析"],
  },
  skill_opportunity_insight_competitor_account: {
    promptIds: ["prompt_opportunity_insight_competitor_account"],
    promptScenes: ["机会洞察-竞品账号分析"],
  },
  "opportunity-insight-competitor-account-analysis": {
    promptIds: ["prompt_opportunity_insight_competitor_account"],
    promptScenes: ["机会洞察-竞品账号分析"],
  },
  skill_opportunity_insight_comment: {
    promptIds: ["prompt_opportunity_insight_comment"],
    promptScenes: ["机会洞察-评论洞察分析"],
  },
  "opportunity-insight-comment-analysis": {
    promptIds: ["prompt_opportunity_insight_comment"],
    promptScenes: ["机会洞察-评论洞察分析"],
  },
  skill_opportunity_insight_final_report: {
    promptIds: ["prompt_opportunity_insight_final_report"],
    promptScenes: ["机会洞察-机会洞察总报告"],
  },
  "opportunity-insight-final-report": {
    promptIds: ["prompt_opportunity_insight_final_report"],
    promptScenes: ["机会洞察-机会洞察总报告"],
  },
  skill_xhs_plan: {
    promptIds: ["prompt_xhs_plan"],
    promptScenes: ["小红书营销规划"],
  },
  "xiaohongshu-brand-marketing-plan": {
    promptIds: ["prompt_xhs_plan"],
    promptScenes: ["小红书营销规划"],
  },
  skill_douyin_plan: {
    promptIds: ["prompt_douyin_plan"],
    promptScenes: ["抖音营销策划方案"],
  },
  "tongcheng-brand-douyin-planning": {
    promptIds: ["prompt_douyin_plan"],
    promptScenes: ["抖音营销策划方案"],
  },
  skill_douyin_hot_topic_candidates: {
    promptIds: ["prompt_douyin_hot_topic_candidates"],
    promptScenes: ["抖音热点找选题"],
  },
  "douyin-hot-topic-candidates": {
    promptIds: ["prompt_douyin_hot_topic_candidates"],
    promptScenes: ["抖音热点找选题"],
  },
  skill_douyin_original_copy_viewpoint: {
    promptIds: ["prompt_douyin_original_copy_viewpoint"],
    promptScenes: ["抖音原创文案-聊观点"],
  },
  "douyin-original-copy-viewpoint": {
    promptIds: ["prompt_douyin_original_copy_viewpoint"],
    promptScenes: ["抖音原创文案-聊观点"],
  },
  skill_douyin_original_copy_story: {
    promptIds: ["prompt_douyin_original_copy_story"],
    promptScenes: ["抖音原创文案-讲故事"],
  },
  "douyin-original-copy-story": {
    promptIds: ["prompt_douyin_original_copy_story"],
    promptScenes: ["抖音原创文案-讲故事"],
  },
  skill_douyin_original_copy_process: {
    promptIds: ["prompt_douyin_original_copy_process"],
    promptScenes: ["抖音原创文案-晒过程"],
  },
  "douyin-original-copy-process": {
    promptIds: ["prompt_douyin_original_copy_process"],
    promptScenes: ["抖音原创文案-晒过程"],
  },
  skill_douyin_original_copy_knowledge: {
    promptIds: ["prompt_douyin_original_copy_knowledge"],
    promptScenes: ["抖音原创文案-教知识"],
  },
  "douyin-original-copy-knowledge": {
    promptIds: ["prompt_douyin_original_copy_knowledge"],
    promptScenes: ["抖音原创文案-教知识"],
  },
  skill_douyin_original_copy_plot_sales: {
    promptIds: ["prompt_douyin_original_copy_plot_sales"],
    promptScenes: ["抖音原创文案-剧情带货"],
  },
  "douyin-original-copy-plot-sales": {
    promptIds: ["prompt_douyin_original_copy_plot_sales"],
    promptScenes: ["抖音原创文案-剧情带货"],
  },
  skill_douyin_original_copy_seeding: {
    promptIds: ["prompt_douyin_original_copy_seeding"],
    promptScenes: ["抖音原创文案-种草类"],
  },
  "douyin-original-copy-seeding": {
    promptIds: ["prompt_douyin_original_copy_seeding"],
    promptScenes: ["抖音原创文案-种草类"],
  },
  skill_douyin_original_copy_local_sales: {
    promptIds: ["prompt_douyin_original_copy_local_sales"],
    promptScenes: ["抖音原创文案-同城带货"],
  },
  "douyin-original-copy-local-sales": {
    promptIds: ["prompt_douyin_original_copy_local_sales"],
    promptScenes: ["抖音原创文案-同城带货"],
  },
  skill_douyin_remix_copy_intro: {
    promptIds: ["prompt_douyin_remix_copy_intro"],
    promptScenes: ["抖音二创文案-拆解开头"],
  },
  "douyin-remix-copy-intro": {
    promptIds: ["prompt_douyin_remix_copy_intro"],
    promptScenes: ["抖音二创文案-拆解开头"],
  },
  skill_douyin_remix_copy_body: {
    promptIds: ["prompt_douyin_remix_copy_body"],
    promptScenes: ["抖音二创文案-拆解正文"],
  },
  "douyin-remix-copy-body": {
    promptIds: ["prompt_douyin_remix_copy_body"],
    promptScenes: ["抖音二创文案-拆解正文"],
  },
  skill_douyin_remix_copy_outro: {
    promptIds: ["prompt_douyin_remix_copy_outro"],
    promptScenes: ["抖音二创文案-拆解结尾"],
  },
  "douyin-remix-copy-outro": {
    promptIds: ["prompt_douyin_remix_copy_outro"],
    promptScenes: ["抖音二创文案-拆解结尾"],
  },
  skill_douyin_remix_copy_final: {
    promptIds: ["prompt_douyin_remix_copy_final"],
    promptScenes: ["抖音二创文案-生成二创文案"],
  },
  "douyin-remix-copy-final": {
    promptIds: ["prompt_douyin_remix_copy_final"],
    promptScenes: ["抖音二创文案-生成二创文案"],
  },
  skill_xhs_calendar: {
    promptIds: ["prompt_xhs_calendar"],
    promptScenes: ["品牌全平台营销日历生成"],
  },
  "xiaohongshu-marketing-calendar": {
    promptIds: ["prompt_xhs_calendar"],
    promptScenes: ["品牌全平台营销日历生成"],
  },
  skill_article_report: {
    promptIds: ["prompt_visual_report"],
    promptScenes: ["HTML 可视化报告生成"],
  },
  "article-visual-report-designer": {
    promptIds: ["prompt_visual_report"],
    promptScenes: ["HTML 可视化报告生成"],
  },
  skill_xhs_original_copy: {
    promptIds: ["prompt_xhs_original_copy"],
    promptScenes: ["小红书原创笔记文案"],
  },
  original_copy: {
    promptIds: ["prompt_xhs_original_copy"],
    promptScenes: ["小红书原创笔记文案"],
  },
  skill_xhs_original_copy_science: {
    promptIds: ["prompt_xhs_original_copy_science"],
    promptScenes: ["小红书原创笔记-科普类文案"],
  },
  "xhs-original-copy-science": {
    promptIds: ["prompt_xhs_original_copy_science"],
    promptScenes: ["小红书原创笔记-科普类文案"],
  },
  skill_xhs_original_copy_review: {
    promptIds: ["prompt_xhs_original_copy_review"],
    promptScenes: ["小红书原创笔记-测评类文案"],
  },
  "xhs-original-copy-review": {
    promptIds: ["prompt_xhs_original_copy_review"],
    promptScenes: ["小红书原创笔记-测评类文案"],
  },
  skill_xhs_original_copy_avoid_pitfall: {
    promptIds: ["prompt_xhs_original_copy_avoid_pitfall"],
    promptScenes: ["小红书原创笔记-避坑类文案"],
  },
  "xhs-original-copy-avoid-pitfall": {
    promptIds: ["prompt_xhs_original_copy_avoid_pitfall"],
    promptScenes: ["小红书原创笔记-避坑类文案"],
  },
  skill_xhs_original_note: {
    promptIds: ["prompt_xhs_original_note"],
    promptScenes: ["小红书原创笔记配图"],
  },
  "xhs-original-image-prompt": {
    promptIds: ["prompt_xhs_original_note"],
    promptScenes: ["小红书原创笔记配图"],
  },
  skill_xhs_original_image_generation: {
    promptIds: ["prompt_xhs_original_image_generation"],
    promptScenes: ["小红书原创图片生成"],
  },
  "xhs-original-image-generation": {
    promptIds: ["prompt_xhs_original_image_generation"],
    promptScenes: ["小红书原创图片生成"],
  },
  skill_wechat_article_compose: {
    promptIds: ["prompt_wechat_article_compose"],
    promptScenes: ["公众号创作文章"],
  },
  "wechat-article-composer": {
    promptIds: ["prompt_wechat_article_compose"],
    promptScenes: ["公众号创作文章"],
  },
  skill_wechat_cover_image_compose: {
    promptIds: ["prompt_wechat_cover_image_compose"],
    promptScenes: ["公众号封面图生成"],
  },
  "wechat-cover-image-designer": {
    promptIds: ["prompt_wechat_cover_image_compose"],
    promptScenes: ["公众号封面图生成"],
  },
  skill_wechat_body_image_compose: {
    promptIds: ["prompt_wechat_body_image_compose"],
    promptScenes: ["公众号正文配图生成"],
  },
  "wechat-body-image-designer": {
    promptIds: ["prompt_wechat_body_image_compose"],
    promptScenes: ["公众号正文配图生成"],
  },
  "wechat-html-general": {
    promptIds: ["prompt_wechat_html_general"],
    promptScenes: ["公众号HTML通用排版"],
  },
  "wechat-html-minimal": {
    promptIds: ["prompt_wechat_html_minimal"],
    promptScenes: ["公众号HTML极简排版"],
  },
  "wechat-html-space": {
    promptIds: ["prompt_wechat_html_space"],
    promptScenes: ["公众号HTML空间艺术排版"],
  },
  "wechat-html-notice": {
    promptIds: ["prompt_wechat_html_notice"],
    promptScenes: ["公众号HTML通知类排版"],
  },
  skill_wechat_api_publish: {
    promptIds: ["prompt_wechat_api_publish"],
    promptScenes: ["公众号API发布"],
  },
  "wechat-api-publisher": {
    promptIds: ["prompt_wechat_api_publish"],
    promptScenes: ["公众号API发布"],
  },
  skill_design_web_prototype: {
    promptIds: ["prompt_design_web_prototype"],
    promptScenes: ["设计工作台-HTML 原型设计"],
  },
  "design-web-prototype": {
    promptIds: ["prompt_design_web_prototype"],
    promptScenes: ["设计工作台-HTML 原型设计"],
  },
  skill_design_dashboard: {
    promptIds: ["prompt_design_dashboard"],
    promptScenes: ["设计工作台-数据看板设计"],
  },
  "design-dashboard": {
    promptIds: ["prompt_design_dashboard"],
    promptScenes: ["设计工作台-数据看板设计"],
  },
  skill_design_saas_landing: {
    promptIds: ["prompt_design_saas_landing"],
    promptScenes: ["设计工作台-SaaS 落地页设计"],
  },
  "design-saas-landing": {
    promptIds: ["prompt_design_saas_landing"],
    promptScenes: ["设计工作台-SaaS 落地页设计"],
  },
  skill_design_email_marketing: {
    promptIds: ["prompt_design_email_marketing"],
    promptScenes: ["设计工作台-邮件营销页设计"],
  },
  "design-email-marketing": {
    promptIds: ["prompt_design_email_marketing"],
    promptScenes: ["设计工作台-邮件营销页设计"],
  },
  skill_design_docs_page: {
    promptIds: ["prompt_design_docs_page"],
    promptScenes: ["设计工作台-文档展示页设计"],
  },
  "design-docs-page": {
    promptIds: ["prompt_design_docs_page"],
    promptScenes: ["设计工作台-文档展示页设计"],
  },
  skill_design_blog_post: {
    promptIds: ["prompt_design_blog_post"],
    promptScenes: ["设计工作台-博客长页设计"],
  },
  "design-blog-post": {
    promptIds: ["prompt_design_blog_post"],
    promptScenes: ["设计工作台-博客长页设计"],
  },
  skill_design_mobile_onboarding: {
    promptIds: ["prompt_design_mobile_onboarding"],
    promptScenes: ["设计工作台-移动端引导设计"],
  },
  "design-mobile-onboarding": {
    promptIds: ["prompt_design_mobile_onboarding"],
    promptScenes: ["设计工作台-移动端引导设计"],
  },
  skill_design_gamified_app: {
    promptIds: ["prompt_design_gamified_app"],
    promptScenes: ["设计工作台-游戏化活动页设计"],
  },
  "design-gamified-app": {
    promptIds: ["prompt_design_gamified_app"],
    promptScenes: ["设计工作台-游戏化活动页设计"],
  },
  skill_design_social_carousel: {
    promptIds: ["prompt_design_social_carousel"],
    promptScenes: ["设计工作台-社媒轮播图设计"],
  },
  "design-social-carousel": {
    promptIds: ["prompt_design_social_carousel"],
    promptScenes: ["设计工作台-社媒轮播图设计"],
  },
  skill_design_magazine_poster: {
    promptIds: ["prompt_design_magazine_poster"],
    promptScenes: ["设计工作台-杂志风海报设计"],
  },
  "design-magazine-poster": {
    promptIds: ["prompt_design_magazine_poster"],
    promptScenes: ["设计工作台-杂志风海报设计"],
  },
  skill_design_motion_frames: {
    promptIds: ["prompt_design_motion_frames"],
    promptScenes: ["设计工作台-动效首帧设计"],
  },
  "design-motion-frames": {
    promptIds: ["prompt_design_motion_frames"],
    promptScenes: ["设计工作台-动效首帧设计"],
  },
  skill_design_sprite_animation: {
    promptIds: ["prompt_design_sprite_animation"],
    promptScenes: ["设计工作台-像素动画首帧设计"],
  },
  "design-sprite-animation": {
    promptIds: ["prompt_design_sprite_animation"],
    promptScenes: ["设计工作台-像素动画首帧设计"],
  },
  skill_design_pitch_deck: {
    promptIds: ["prompt_design_pitch_deck"],
    promptScenes: ["设计工作台-Pitch Deck 设计"],
  },
  "design-pitch-deck": {
    promptIds: ["prompt_design_pitch_deck"],
    promptScenes: ["设计工作台-Pitch Deck 设计"],
  },
  skill_design_weekly_update: {
    promptIds: ["prompt_design_weekly_update"],
    promptScenes: ["设计工作台-周报更新 Deck"],
  },
  "design-weekly-update": {
    promptIds: ["prompt_design_weekly_update"],
    promptScenes: ["设计工作台-周报更新 Deck"],
  },
  skill_design_simple_deck: {
    promptIds: ["prompt_design_simple_deck"],
    promptScenes: ["设计工作台-极简 Deck"],
  },
  "design-simple-deck": {
    promptIds: ["prompt_design_simple_deck"],
    promptScenes: ["设计工作台-极简 Deck"],
  },
  skill_design_video_storyboard: {
    promptIds: ["prompt_design_video_storyboard"],
    promptScenes: ["设计工作台-视频故事板设计"],
  },
  "design-video-storyboard": {
    promptIds: ["prompt_design_video_storyboard"],
    promptScenes: ["设计工作台-视频故事板设计"],
  },
  skill_design_motion_storyboard: {
    promptIds: ["prompt_design_motion_storyboard"],
    promptScenes: ["设计工作台-动效脚本设计"],
  },
  "design-motion-storyboard": {
    promptIds: ["prompt_design_motion_storyboard"],
    promptScenes: ["设计工作台-动效脚本设计"],
  },
  skill_xhs_rewrite_copy: {
    promptIds: ["prompt_xhs_rewrite_copy"],
    promptScenes: ["小红书二创笔记文案"],
  },
  rewrite_copy: {
    promptIds: ["prompt_xhs_rewrite_copy"],
    promptScenes: ["小红书二创笔记文案"],
  },
  skill_xhs_rewrite_note: {
    promptIds: ["prompt_xhs_rewrite_note"],
    promptScenes: ["小红书二创笔记配图"],
  },
  rewrite_image: {
    promptIds: ["prompt_xhs_rewrite_note"],
    promptScenes: ["小红书二创笔记配图"],
  },
  skill_xhs_rewrite_image_generation: {
    promptIds: ["prompt_xhs_rewrite_image_generation"],
    promptScenes: ["小红书二创图片生成"],
  },
  rewrite_image_generation: {
    promptIds: ["prompt_xhs_rewrite_image_generation"],
    promptScenes: ["小红书二创图片生成"],
  },
  skill_xhs_video_note: {
    promptIds: [
      "prompt_xhs_video_brand_script",
      "prompt_xhs_video_spoken_script",
      "prompt_xhs_video_skit_script",
      "prompt_xhs_video_storyboard",
    ],
    promptScenes: [
      "视频笔记-品牌宣传剧本",
      "视频笔记-口播带货剧本",
      "视频笔记-短剧带货剧本",
      "视频笔记-故事板提示词",
    ],
  },
  "short-video-api-studio": {
    promptIds: [
      "prompt_xhs_video_brand_script",
      "prompt_xhs_video_spoken_script",
      "prompt_xhs_video_skit_script",
      "prompt_xhs_video_storyboard",
    ],
    promptScenes: [
      "视频笔记-品牌宣传剧本",
      "视频笔记-口播带货剧本",
      "视频笔记-短剧带货剧本",
      "视频笔记-故事板提示词",
    ],
  },
  skill_douyin_video_note: {
    promptIds: [
      "prompt_douyin_video_brand_script",
      "prompt_douyin_video_spoken_script",
      "prompt_douyin_video_skit_script",
      "prompt_douyin_video_remix_script",
      "prompt_douyin_video_storyboard",
    ],
    promptScenes: [
      "抖音AI生视频（故事板）-品牌宣传剧本",
      "抖音AI生视频（故事板）-口播带货剧本",
      "抖音AI生视频（故事板）-短剧带货剧本",
      "抖音AI生视频（故事板）-复刻视频拆解",
      "抖音AI生视频（故事板）-故事板提示词",
    ],
  },
  "douyin-video-storyboard-studio": {
    promptIds: [
      "prompt_douyin_video_brand_script",
      "prompt_douyin_video_spoken_script",
      "prompt_douyin_video_skit_script",
      "prompt_douyin_video_remix_script",
      "prompt_douyin_video_storyboard",
    ],
    promptScenes: [
      "抖音AI生视频（故事板）-品牌宣传剧本",
      "抖音AI生视频（故事板）-口播带货剧本",
      "抖音AI生视频（故事板）-短剧带货剧本",
      "抖音AI生视频（故事板）-复刻视频拆解",
      "抖音AI生视频（故事板）-故事板提示词",
    ],
  },
  skill_douyin_direct_video: {
    promptIds: ["prompt_douyin_direct_video"],
    promptScenes: ["抖音AI生视频-Seedance提示词"],
  },
  "douyin-direct-video-studio": {
    promptIds: ["prompt_douyin_direct_video"],
    promptScenes: ["抖音AI生视频-Seedance提示词"],
  },
  skill_douyin_remix_short_video: {
    promptIds: ["prompt_douyin_remix_short_video"],
    promptScenes: ["抖音复刻短视频-复刻分析"],
  },
  "douyin-remix-short-video-studio": {
    promptIds: ["prompt_douyin_remix_short_video"],
    promptScenes: ["抖音复刻短视频-复刻分析"],
  },
  skill_douyin_remix_short_video_compose: {
    promptIds: ["prompt_douyin_remix_short_video_compose"],
    promptScenes: ["拼接复刻短视频-分段提示词"],
  },
  "douyin-remix-short-video-compose": {
    promptIds: ["prompt_douyin_remix_short_video_compose"],
    promptScenes: ["拼接复刻短视频-分段提示词"],
  },
  skill_douyin_digital_human_script: {
    promptIds: ["prompt_douyin_digital_human_script"],
    promptScenes: ["抖音数字人-口播脚本"],
  },
  "douyin-digital-human-script-studio": {
    promptIds: ["prompt_douyin_digital_human_script"],
    promptScenes: ["抖音数字人-口播脚本"],
  },
};

const RETIRED_OPEN_DESIGN_SKILL_IDS = [
  "skill_open_design_critique",
  "skill_open_design_tweaks",
  "skill_open_design_wireframe_sketch",
  "skill_open_design_design_brief",
  "skill_open_design_dating_web",
  "skill_open_design_digital_eguide",
  "skill_open_design_hatch_pet",
  "skill_open_design_audio_jingle",
  "skill_open_design_pm_spec",
  "skill_open_design_eng_runbook",
  "skill_open_design_finance_report",
  "skill_open_design_hr_onboarding",
  "skill_open_design_invoice",
  "skill_open_design_kanban_board",
  "skill_open_design_team_okrs",
  "skill_open_design_replit_deck",
  "skill_open_design_html_ppt_course_module",
  "skill_open_design_html_ppt_dir_key_nav_minimal",
  "skill_open_design_html_ppt_graphify_dark_graph",
  "skill_open_design_html_ppt_hermes_cyber_terminal",
  "skill_open_design_html_ppt_knowledge_arch_blueprint",
] as const;

const RETIRED_OPEN_DESIGN_SKILL_SLUGS = [
  "critique",
  "tweaks",
  "wireframe-sketch",
  "design-brief",
  "dating-web",
  "digital-eguide",
  "hatch-pet",
  "audio-jingle",
  "pm-spec",
  "eng-runbook",
  "finance-report",
  "hr-onboarding",
  "invoice",
  "kanban-board",
  "team-okrs",
  "replit-deck",
  "html-ppt-course-module",
  "html-ppt-dir-key-nav-minimal",
  "html-ppt-graphify-dark-graph",
  "html-ppt-hermes-cyber-terminal",
  "html-ppt-knowledge-arch-blueprint",
] as const;

const RETIRED_OPEN_DESIGN_PROMPT_IDS = [
  "prompt_open_design_critique",
  "prompt_open_design_tweaks",
  "prompt_open_design_wireframe_sketch",
  "prompt_open_design_design_brief",
  "prompt_open_design_dating_web",
  "prompt_open_design_digital_eguide",
  "prompt_open_design_hatch_pet",
  "prompt_open_design_audio_jingle",
  "prompt_open_design_pm_spec",
  "prompt_open_design_eng_runbook",
  "prompt_open_design_finance_report",
  "prompt_open_design_hr_onboarding",
  "prompt_open_design_invoice",
  "prompt_open_design_kanban_board",
  "prompt_open_design_team_okrs",
  "prompt_open_design_replit_deck",
  "prompt_open_design_html_ppt_course_module",
  "prompt_open_design_html_ppt_dir_key_nav_minimal",
  "prompt_open_design_html_ppt_graphify_dark_graph",
  "prompt_open_design_html_ppt_hermes_cyber_terminal",
  "prompt_open_design_html_ppt_knowledge_arch_blueprint",
] as const;

const RETIRED_OPEN_DESIGN_PROMPT_SCENES = [
  "Open Design-设计评审",
  "Open Design-定向微调",
  "Open Design-线框草图",
  "Open Design-设计简报",
  "Open Design-约会产品网页",
  "Open Design-数字指南",
  "Open Design-宠物孵化互动页",
  "Open Design-音频 Jingle",
  "Open Design-PM 规格说明",
  "Open Design-工程 Runbook",
  "Open Design-财务报告",
  "Open Design-HR 入职引导",
  "Open Design-发票模板",
  "Open Design-看板面板",
  "Open Design-团队 OKR",
  "Open Design-Replit Deck",
  "Open Design-课程模块 Deck",
  "Open Design-极简目录 Deck",
  "Open Design-深色图表 Deck",
  "Open Design-赛博终端 Deck",
  "Open Design-知识架构蓝图 Deck",
] as const;

@Injectable()
export class SkillsPromptsService implements OnModuleInit {
  private registryBootstrapPromise?: Promise<boolean>;
  private registryBootstrapCompleted = false;
  private skillPromptBindingCache = new Map<string, string[]>();
  private legacySkillPromptBindings?: SkillPromptBindingRecord[];

  async onModuleInit() {
    await this.ensureRegistryTablesReady();
  }

  private readonly promptFileCandidates = PROMPT_SOURCE_CANDIDATES;

  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
  ) {}

  async listSkills() {
    return this.listSkillRows();
  }

  async createSkill(payload: CreateSkillConfigPayload) {
    const name = String(payload.name || "").trim();
    const slug = this.normalizeSkillSlug(payload.slug);
    const category = String(payload.category || "").trim();
    const provider = String(payload.provider || "").trim();
    const defaultModel = String(payload.defaultModel || "").trim();

    if (!name) {
      throw new BadRequestException("技能名称不能为空");
    }
    if (!category) {
      throw new BadRequestException("技能分类不能为空");
    }
    if (!provider) {
      throw new BadRequestException("供应商不能为空");
    }
    if (!defaultModel) {
      throw new BadRequestException("默认模型不能为空");
    }

    const nextSkill: SkillConfigRecord = {
      id: createId("skill"),
      name,
      slug,
      category,
      status: payload.status || "DRAFT",
      provider,
      defaultModel,
      pointsCost: Math.max(0, Number(payload.pointsCost || 0)),
      description: String(payload.description || "").trim(),
      inputSchemaJson: this.normalizeSkillInputSchemaValue(payload.inputSchemaJson),
      updatedAt: new Date().toISOString(),
    };

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const duplicated = await this.findSkillBySlugFromDatabase(slug);
      if (duplicated) {
        throw new BadRequestException("技能标识已存在");
      }
      const createdRows = await this.prismaService.$queryRaw<SkillConfigRow[]>`
        INSERT INTO "SkillConfig" (
          "id",
          "name",
          "slug",
          "category",
          "status",
          "provider",
          "defaultModel",
          "pointsCost",
          "description",
          "inputSchemaJson",
          "updatedAt"
        )
        VALUES (
          ${nextSkill.id},
          ${nextSkill.name},
          ${nextSkill.slug},
          ${nextSkill.category},
          ${nextSkill.status},
          ${nextSkill.provider},
          ${nextSkill.defaultModel},
          ${nextSkill.pointsCost},
          ${nextSkill.description},
          CAST(${this.serializeSkillInputSchemaValue(nextSkill.inputSchemaJson)} AS JSONB),
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `;
      return this.normalizeSkillConfigRow(createdRows[0] ?? nextSkill);
    }

    const duplicated = database.skillConfigs.find((item) => item.slug === slug);
    if (duplicated) {
      throw new BadRequestException("技能标识已存在");
    }
    database.skillConfigs.unshift(nextSkill);
    return { ...nextSkill };
  }

  async updateSkill(id: string, payload: UpdateSkillConfigPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const current = await this.findSkillByIdFromDatabase(id);
      if (!current) {
        throw new NotFoundException("技能配置不存在");
      }
      const updatedRows = await this.prismaService.$queryRaw<SkillConfigRow[]>`
        UPDATE "SkillConfig"
        SET
          "status" = ${payload.status ?? current.status},
          "provider" = ${payload.provider ?? current.provider},
          "defaultModel" = ${payload.defaultModel ?? current.defaultModel},
          "pointsCost" = ${payload.pointsCost ?? current.pointsCost},
          "description" = ${payload.description ?? current.description},
          "inputSchemaJson" = CAST(${this.serializeSkillInputSchemaValue(
            payload.inputSchemaJson !== undefined ? payload.inputSchemaJson : current.inputSchemaJson,
          )} AS JSONB),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
        RETURNING *
      `;
      return this.normalizeSkillConfigRow(updatedRows[0] ?? current);
    }

    const skill = database.skillConfigs.find((item) => item.id === id);
    if (!skill) {
      throw new NotFoundException("技能配置不存在");
    }
    if (payload.status) {
      skill.status = payload.status;
    }
    if (payload.provider !== undefined) {
      skill.provider = payload.provider;
    }
    if (payload.defaultModel !== undefined) {
      skill.defaultModel = payload.defaultModel;
    }
    if (payload.pointsCost !== undefined) {
      skill.pointsCost = payload.pointsCost;
    }
    if (payload.description !== undefined) {
      skill.description = payload.description;
    }
    if (payload.inputSchemaJson !== undefined) {
      skill.inputSchemaJson = this.normalizeSkillInputSchemaValue(payload.inputSchemaJson);
    }
    skill.updatedAt = new Date().toISOString();
    return { ...skill };
  }

  async backfillSkillInputSchema(id: string) {
    const skill = await this.findSkillByIdFromDatabase(id);
    if (!skill) {
      throw new Error(`未找到技能：${id}`);
    }
    const current = this.normalizeSkillConfigRow(skill);
    if (current.inputSchemaJson) {
      return current;
    }

    const nextInputSchema =
      this.getBuiltInSkillInputSchemaSeed(current.slug)
      || this.deriveLegacySkillInputSchemaFromDescription(current.description);

    if (!nextInputSchema) {
      return current;
    }

    await this.prismaService.$executeRaw`
      UPDATE "SkillConfig"
      SET
        "inputSchemaJson" = CAST(${JSON.stringify(nextInputSchema)} AS JSONB),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;

    const refreshed = await this.findSkillByIdFromDatabase(id);
    return refreshed ? this.normalizeSkillConfigRow(refreshed) : current;
  }

  async listPrompts() {
    const prompts = await this.listPromptRows();
    return prompts.map((item) => this.hydratePromptTemplateRecord(item));
  }

  async createPrompt(payload: CreatePromptTemplatePayload) {
    const name = String(payload.name || "").trim();
    const scene = String(payload.scene || "").trim();
    const modelName = String(payload.modelName || "").trim();
    const version = String(payload.version || "v1.0").trim() || "v1.0";
    const content = this.normalizePromptContent(payload.content);

    if (!name) {
      throw new BadRequestException("提示词名称不能为空");
    }
    if (!scene) {
      throw new BadRequestException("提示词场景不能为空");
    }
    if (!modelName) {
      throw new BadRequestException("提示词模型不能为空");
    }

    const nextPrompt: PromptTemplateRecord = {
      id: createId("prompt"),
      name,
      scene,
      version,
      status: payload.status || "DRAFT",
      modelName,
      temperature: Number(payload.temperature ?? 0.7),
      maxTokens: Number(payload.maxTokens ?? 4000),
      content,
      updatedAt: new Date().toISOString(),
    };

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const duplicated = await this.findPromptBySceneFromDatabase(scene);
      if (duplicated) {
        throw new BadRequestException("提示词场景已存在");
      }
      const createdRows = await this.prismaService.$queryRaw<PromptTemplateRow[]>`
        INSERT INTO "PromptTemplate" (
          "id",
          "name",
          "scene",
          "version",
          "status",
          "modelName",
          "temperature",
          "maxTokens",
          "content",
          "updatedAt"
        )
        VALUES (
          ${nextPrompt.id},
          ${nextPrompt.name},
          ${nextPrompt.scene},
          ${nextPrompt.version},
          ${nextPrompt.status},
          ${nextPrompt.modelName},
          ${nextPrompt.temperature},
          ${nextPrompt.maxTokens},
          ${nextPrompt.content},
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `;
      return this.hydratePromptTemplateRecord(this.normalizePromptTemplateRow(createdRows[0] ?? nextPrompt));
    }

    const duplicated = database.promptTemplates.find((item) => item.scene === scene);
    if (duplicated) {
      throw new BadRequestException("提示词场景已存在");
    }
    database.promptTemplates.unshift(nextPrompt);
    return { ...nextPrompt };
  }

  async updatePrompt(id: string, payload: UpdatePromptTemplatePayload) {
    const normalizedSubmittedContent =
      payload.content !== undefined ? this.normalizePromptContent(payload.content) : undefined;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const current = await this.findPromptByIdFromDatabase(id);
      if (!current) {
        throw new NotFoundException("提示词模板不存在");
      }

      const currentContent = current.content || "";
      const nextContent = normalizedSubmittedContent ?? currentContent;
      const updatedRows = await this.prismaService.$queryRaw<PromptTemplateRow[]>`
        UPDATE "PromptTemplate"
        SET
          "status" = ${payload.status ?? current.status},
          "modelName" = ${payload.modelName ?? current.modelName},
          "temperature" = ${payload.temperature ?? current.temperature},
          "maxTokens" = ${payload.maxTokens ?? current.maxTokens},
          "content" = ${nextContent},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
        RETURNING *
      `;
      return this.hydratePromptTemplateRecord(
        this.normalizePromptTemplateRow(updatedRows[0] ?? { ...current, content: nextContent }),
      );
    }

    const prompt = database.promptTemplates.find((item) => item.id === id);
    if (!prompt) {
      throw new NotFoundException("提示词模板不存在");
    }
    if (payload.status) {
      prompt.status = payload.status;
    }
    if (payload.modelName !== undefined) {
      prompt.modelName = payload.modelName;
    }
    if (payload.temperature !== undefined) {
      prompt.temperature = payload.temperature;
    }
    if (payload.maxTokens !== undefined) {
      prompt.maxTokens = payload.maxTokens;
    }
    if (normalizedSubmittedContent !== undefined) {
      const nextContent = normalizedSubmittedContent;
      prompt.content = nextContent;
    }
    prompt.updatedAt = new Date().toISOString();
    return { ...prompt };
  }

  async listSkillPromptBindings(query: ListSkillPromptBindingsQuery = {}) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const bindings = await this.listSkillPromptBindingRowsFromDatabase();
      return bindings.filter((item) => this.matchSkillPromptBindingQuery(item, query));
    }
    return this.buildLegacySkillPromptBindings().filter((item) => this.matchSkillPromptBindingQuery(item, query));
  }

  async listSkillPromptBindingsBySkill(skillSlug: string, enabled?: boolean) {
    return this.listSkillPromptBindings({
      skillSlug,
      enabled,
    });
  }

  async createSkillPromptBinding(payload: CreateSkillPromptBindingPayload) {
    const skill = await this.resolveSkillForBinding(payload);
    const prompt = await this.resolvePromptForBinding(payload);
    const bindingType = this.normalizeSkillPromptBindingType(payload.bindingType);
    const isPrimary = payload.isPrimary ?? bindingType === "PRIMARY";
    const sortOrder = Number.isFinite(payload.sortOrder) ? Number(payload.sortOrder) : 100;
    const enabled = payload.enabled ?? true;
    const remarks = String(payload.remarks || "").trim();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const current = await this.findSkillPromptBindingBySkillAndPrompt(skill.id, prompt.id);
      const bindingId = current?.id || createId("skill_prompt_binding");

      if (isPrimary) {
        await this.clearPrimarySkillPromptBindings(skill.id, current?.id);
      }

      const rows = await this.prismaService.$queryRaw<SkillPromptBindingRow[]>`
        INSERT INTO "SkillPromptBinding" (
          "id",
          "skillId",
          "promptId",
          "skillSlug",
          "promptScene",
          "bindingType",
          "isPrimary",
          "sortOrder",
          "enabled",
          "remarks",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${bindingId},
          ${skill.id},
          ${prompt.id},
          ${skill.slug},
          ${prompt.scene},
          ${bindingType},
          ${isPrimary},
          ${sortOrder},
          ${enabled},
          ${remarks},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("skillId","promptId") DO UPDATE SET
          "skillSlug" = EXCLUDED."skillSlug",
          "promptScene" = EXCLUDED."promptScene",
          "bindingType" = EXCLUDED."bindingType",
          "isPrimary" = EXCLUDED."isPrimary",
          "sortOrder" = EXCLUDED."sortOrder",
          "enabled" = EXCLUDED."enabled",
          "remarks" = EXCLUDED."remarks",
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING *
      `;
      await this.refreshSkillPromptBindingCache();
      const joined = await this.findSkillPromptBindingByIdFromDatabase(rows[0]?.id || bindingId);
      return this.normalizeSkillPromptBindingRow(joined || rows[0]);
    }

    const next: SkillPromptBindingRecord = {
      id: createId("skill_prompt_binding"),
      skillId: skill.id,
      skillSlug: skill.slug,
      skillName: skill.name,
      promptId: prompt.id,
      promptScene: prompt.scene,
      promptName: prompt.name,
      bindingType,
      isPrimary,
      sortOrder,
      enabled,
      remarks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.upsertLegacySkillPromptBinding(next);
    this.rebuildSkillPromptBindingCacheFromRecords(this.buildLegacySkillPromptBindings());
    return next;
  }

  async updateSkillPromptBinding(id: string, payload: UpdateSkillPromptBindingPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const current = await this.findSkillPromptBindingByIdFromDatabase(id);
      if (!current) {
        throw new NotFoundException("技能提示词绑定不存在");
      }
      const nextBindingType = this.normalizeSkillPromptBindingType(payload.bindingType ?? current.bindingType);
      const nextIsPrimary = payload.isPrimary ?? current.isPrimary;
      if (nextIsPrimary) {
        await this.clearPrimarySkillPromptBindings(current.skillId, current.id);
      }
      const rows = await this.prismaService.$queryRaw<SkillPromptBindingRow[]>`
        UPDATE "SkillPromptBinding"
        SET
          "bindingType" = ${nextBindingType},
          "isPrimary" = ${nextIsPrimary},
          "sortOrder" = ${payload.sortOrder ?? current.sortOrder},
          "enabled" = ${payload.enabled ?? current.enabled},
          "remarks" = ${payload.remarks !== undefined ? String(payload.remarks || "").trim() : current.remarks},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
        RETURNING *
      `;
      await this.refreshSkillPromptBindingCache();
      const joined = await this.findSkillPromptBindingByIdFromDatabase(id);
      return this.normalizeSkillPromptBindingRow(joined || rows[0] || current);
    }

    const bindings = this.buildLegacySkillPromptBindings();
    const current = bindings.find((item) => item.id === id);
    if (!current) {
      throw new NotFoundException("技能提示词绑定不存在");
    }
    const updated: SkillPromptBindingRecord = {
      ...current,
      bindingType: this.normalizeSkillPromptBindingType(payload.bindingType ?? current.bindingType),
      isPrimary: payload.isPrimary ?? current.isPrimary,
      sortOrder: payload.sortOrder ?? current.sortOrder,
      enabled: payload.enabled ?? current.enabled,
      remarks: payload.remarks !== undefined ? String(payload.remarks || "").trim() : current.remarks,
      updatedAt: new Date().toISOString(),
    };
    this.upsertLegacySkillPromptBinding(updated, true);
    this.rebuildSkillPromptBindingCacheFromRecords(this.buildLegacySkillPromptBindings());
    return updated;
  }

  async getActiveSkillBySlug(slug: string) {
    const skill = await this.getSkillBySlug(slug);
    return skill?.status === "ACTIVE" ? skill : undefined;
  }

  async getSkillById(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const row = await this.findSkillByIdFromDatabase(id);
      if (row) {
        return this.normalizeSkillConfigRow(row);
      }
    }
    const skill = database.skillConfigs.find((item) => item.id === id);
    return skill ? { ...skill } : undefined;
  }

  async getSkillBySlug(slug: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const row = await this.findSkillBySlugFromDatabase(slug);
      if (row) {
        return this.normalizeSkillConfigRow(row);
      }
    }
    const skill = database.skillConfigs.find((item) => item.slug === slug);
    return skill ? { ...skill } : undefined;
  }

  async getPromptById(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      if (SOURCE_PINNED_PROMPT_IDS.has(id)) {
        await this.syncOpportunityInsightPromptContents();
      }
      const row = await this.findPromptByIdFromDatabase(id);
      if (row) {
        return this.hydratePromptTemplateRecord(this.hydrateSourcePinnedPrompt(this.normalizePromptTemplateRow(row)));
      }
    }
    const prompt = database.promptTemplates.find((item) => item.id === id);
    if (!prompt) {
      return undefined;
    }
    return this.hydratePromptTemplateRecord(this.hydrateLocalPromptTemplateSeed(prompt));
  }

  async getActivePromptById(id: string) {
    const prompt = await this.getPromptById(id);
    return prompt?.status === "ACTIVE" ? prompt : undefined;
  }

  async getActivePromptByScene(scenes: string[]) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      if (scenes.some((scene) => SOURCE_PINNED_PROMPT_SCENES.has(scene))) {
        await this.syncOpportunityInsightPromptContents();
      }
      const rows = await this.prismaService.$queryRaw<PromptTemplateRow[]>`
        SELECT *
        FROM "PromptTemplate"
        WHERE "scene" = ANY(${scenes}::text[])
          AND "status" = 'ACTIVE'
        ORDER BY "updatedAt" DESC
      `;
      const row = rows[0];
      if (row) {
        return this.hydratePromptTemplateRecord(this.hydrateSourcePinnedPrompt(this.normalizePromptTemplateRow(row)));
      }
    }

    const prompt = database.promptTemplates.find(
      (item) => scenes.includes(item.scene) && item.status === "ACTIVE",
    );
    if (!prompt) {
      return undefined;
    }
    return this.hydratePromptTemplateRecord(this.hydrateLocalPromptTemplateSeed(prompt));
  }

  resolvePromptIdsForSkill(skill: SkillConfigRecord, prompts: PromptTemplateRecord[]) {
    const cachedIds = this.skillPromptBindingCache.get(skill.id) || this.skillPromptBindingCache.get(skill.slug);
    if (cachedIds?.length) {
      return cachedIds.filter((promptId, index, list) => list.indexOf(promptId) === index);
    }

    const binding = SKILL_PROMPT_BINDINGS[skill.id] || SKILL_PROMPT_BINDINGS[skill.slug];
    const matched: string[] = [];
    const seen = new Set<string>();

    const pushPrompt = (prompt?: PromptTemplateRecord) => {
      if (!prompt || seen.has(prompt.id)) {
        return;
      }
      seen.add(prompt.id);
      matched.push(prompt.id);
    };

    if (binding?.promptIds?.length) {
      binding.promptIds.forEach((promptId) => {
        pushPrompt(prompts.find((item) => item.id === promptId));
      });
    }

    if (binding?.promptScenes?.length) {
      binding.promptScenes.forEach((scene) => {
        pushPrompt(prompts.find((item) => item.scene === scene));
      });
    }

    if (matched.length) {
      return matched;
    }

    const keywords = [skill.slug, skill.name, skill.category]
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    prompts.forEach((prompt) => {
      const haystack = `${prompt.id} ${prompt.name} ${prompt.scene}`.toLowerCase();
      if (keywords.some((keyword) => haystack.includes(keyword))) {
        pushPrompt(prompt);
      }
    });

    return matched;
  }

  private async listSkillRows() {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const rows = await this.prismaService.$queryRaw<SkillConfigRow[]>`
        SELECT *
        FROM "SkillConfig"
        ORDER BY "updatedAt" DESC
      `;
      return rows.map((item) => this.normalizeSkillConfigRow(item));
    }
    return database.skillConfigs.map((item) => ({ ...item }));
  }

  private async listPromptRows() {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      await this.syncOpportunityInsightPromptContents();
      const rows = await this.prismaService.$queryRaw<PromptTemplateRow[]>`
        SELECT *
        FROM "PromptTemplate"
        ORDER BY "updatedAt" DESC
      `;
      return rows.map((item) => this.hydrateSourcePinnedPrompt(this.normalizePromptTemplateRow(item)));
    }
    return database.promptTemplates.map((item) => this.hydratePromptTemplateRecord(this.hydrateLocalPromptTemplateSeed(item)));
  }

  private async ensureRegistryTablesReady() {
    if (this.registryBootstrapCompleted) {
      return;
    }

    if (!this.registryBootstrapPromise) {
      this.registryBootstrapPromise = this.bootstrapRegistryTables()
        .then((bootstrapped) => {
          if (bootstrapped) {
            this.registryBootstrapCompleted = true;
          }
          return bootstrapped;
        })
        .finally(() => {
          this.registryBootstrapPromise = undefined;
        });
    }

    await this.registryBootstrapPromise;
  }

  private async bootstrapRegistryTables() {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }

    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SkillConfig" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "category" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "defaultModel" TEXT NOT NULL,
        "pointsCost" INTEGER NOT NULL DEFAULT 0,
        "description" TEXT NOT NULL DEFAULT '',
        "inputSchemaJson" JSONB,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "SkillConfig"
      ADD COLUMN IF NOT EXISTS "inputSchemaJson" JSONB
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PromptTemplate" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "scene" TEXT NOT NULL,
        "version" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "modelName" TEXT NOT NULL,
        "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
        "maxTokens" INTEGER NOT NULL DEFAULT 4000,
        "content" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "PromptTemplate_scene_updatedAt_idx" ON "PromptTemplate" ("scene", "updatedAt" DESC)`,
    );
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SkillPromptBinding" (
        "id" TEXT PRIMARY KEY,
        "skillId" TEXT NOT NULL,
        "promptId" TEXT NOT NULL,
        "skillSlug" TEXT NOT NULL,
        "promptScene" TEXT NOT NULL,
        "bindingType" TEXT NOT NULL DEFAULT 'PRIMARY',
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "sortOrder" INTEGER NOT NULL DEFAULT 100,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "remarks" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SkillPromptBinding_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillConfig"("id") ON DELETE CASCADE,
        CONSTRAINT "SkillPromptBinding_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE,
        CONSTRAINT "SkillPromptBinding_skillId_promptId_key" UNIQUE ("skillId", "promptId")
      )
    `);
    await this.prismaService.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "SkillPromptBinding_skillSlug_enabled_sortOrder_idx" ON "SkillPromptBinding" ("skillSlug", "enabled", "sortOrder")`,
    );
    await this.prismaService.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "SkillPromptBinding_promptScene_enabled_sortOrder_idx" ON "SkillPromptBinding" ("promptScene", "enabled", "sortOrder")`,
    );
    await this.prismaService.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "SkillPromptBinding_promptId_enabled_sortOrder_idx" ON "SkillPromptBinding" ("promptId", "enabled", "sortOrder")`,
    );

    for (const skill of database.skillConfigs) {
      await this.prismaService.$executeRaw`
        INSERT INTO "SkillConfig" (
          "id",
          "name",
          "slug",
          "category",
          "status",
          "provider",
          "defaultModel",
          "pointsCost",
          "description",
          "inputSchemaJson",
          "updatedAt"
        )
        VALUES (
          ${skill.id},
          ${skill.name},
          ${skill.slug},
          ${skill.category},
          ${skill.status},
          ${skill.provider},
          ${skill.defaultModel},
          ${skill.pointsCost},
          ${skill.description},
          CAST(${this.serializeSkillInputSchemaValue(skill.inputSchemaJson)} AS JSONB),
          ${new Date(skill.updatedAt)}
        )
        ON CONFLICT ("id") DO NOTHING
      `;
    }

    for (const prompt of database.promptTemplates) {
      const seedPrompt = {
        ...prompt,
        content: this.readPromptContent(prompt.id, prompt.content),
      };
      await this.prismaService.$executeRaw`
        INSERT INTO "PromptTemplate" (
          "id",
          "name",
          "scene",
          "version",
          "status",
          "modelName",
          "temperature",
          "maxTokens",
          "content",
          "updatedAt"
        )
        VALUES (
          ${seedPrompt.id},
          ${seedPrompt.name},
          ${seedPrompt.scene},
          ${seedPrompt.version},
          ${seedPrompt.status},
          ${seedPrompt.modelName},
          ${seedPrompt.temperature},
          ${seedPrompt.maxTokens},
          ${seedPrompt.content},
          ${new Date(seedPrompt.updatedAt)}
        )
        ON CONFLICT ("id") DO NOTHING
      `;
    }

    await this.removeRetiredOpenDesignArtifacts();
    await this.backfillDouyinOriginalCopyPromptContents();
    await this.backfillXhsOriginalCopyPromptContents();
    await this.backfillImageGenerationSkillDefaults();
    await this.backfillLegacyVideoNoteDefaults();
    await this.backfillLegacySkillInputSchemas();
    await this.backfillBuiltInSkillInputSchemas();
    await this.syncGlobalGpt54Defaults();
    await this.syncOpportunityInsightSkillMetadata();
    await this.syncOpportunityInsightPromptContents();
    await this.backfillLegacySkillPromptBindings();
    await this.refreshSkillPromptBindingCache();
    return true;
  }

  private async removeRetiredOpenDesignArtifacts() {
    await this.prismaService.$executeRaw(
      Prisma.sql`
        DELETE FROM "SkillPromptBinding"
        WHERE "skillId" IN (${Prisma.join([...RETIRED_OPEN_DESIGN_SKILL_IDS])})
          OR "promptId" IN (${Prisma.join([...RETIRED_OPEN_DESIGN_PROMPT_IDS])})
          OR "skillSlug" IN (${Prisma.join([...RETIRED_OPEN_DESIGN_SKILL_SLUGS])})
          OR "promptScene" IN (${Prisma.join([...RETIRED_OPEN_DESIGN_PROMPT_SCENES])})
      `,
    );

    await this.prismaService.$executeRaw(
      Prisma.sql`
        DELETE FROM "PromptTemplate"
        WHERE "id" IN (${Prisma.join([...RETIRED_OPEN_DESIGN_PROMPT_IDS])})
          OR "scene" IN (${Prisma.join([...RETIRED_OPEN_DESIGN_PROMPT_SCENES])})
      `,
    );

    await this.prismaService.$executeRaw(
      Prisma.sql`
        DELETE FROM "SkillConfig"
        WHERE "id" IN (${Prisma.join([...RETIRED_OPEN_DESIGN_SKILL_IDS])})
          OR "slug" IN (${Prisma.join([...RETIRED_OPEN_DESIGN_SKILL_SLUGS])})
      `,
    );

    database.skillConfigs = database.skillConfigs.filter(
      (item) => !RETIRED_OPEN_DESIGN_SKILL_IDS.includes(item.id as (typeof RETIRED_OPEN_DESIGN_SKILL_IDS)[number]),
    );
    database.promptTemplates = database.promptTemplates.filter(
      (item) => !RETIRED_OPEN_DESIGN_PROMPT_IDS.includes(item.id as (typeof RETIRED_OPEN_DESIGN_PROMPT_IDS)[number]),
    );
    this.legacySkillPromptBindings = undefined;
  }

  private async backfillLegacySkillInputSchemas() {
    const rows = await this.prismaService.$queryRaw<SkillConfigRow[]>`
      SELECT *
      FROM "SkillConfig"
      WHERE "inputSchemaJson" IS NULL
        AND COALESCE(BTRIM("description"), '') <> ''
    `;

    for (const row of rows) {
      const nextInputSchema = this.deriveLegacySkillInputSchemaFromDescription(row.description);
      if (!nextInputSchema) {
        continue;
      }
      await this.prismaService.$executeRaw`
        UPDATE "SkillConfig"
        SET
          "inputSchemaJson" = CAST(${JSON.stringify(nextInputSchema)} AS JSONB),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${row.id}
          AND "inputSchemaJson" IS NULL
      `;
    }
  }

  private async backfillBuiltInSkillInputSchemas() {
    const rows = await this.prismaService.$queryRaw<SkillConfigRow[]>`
      SELECT *
      FROM "SkillConfig"
      WHERE "inputSchemaJson" IS NULL
    `;

    for (const row of rows) {
      const nextInputSchema = this.getBuiltInSkillInputSchemaSeed(row.slug);
      if (!nextInputSchema) {
        continue;
      }
      await this.prismaService.$executeRaw`
        UPDATE "SkillConfig"
        SET
          "inputSchemaJson" = CAST(${JSON.stringify(nextInputSchema)} AS JSONB),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${row.id}
          AND "inputSchemaJson" IS NULL
      `;
    }
  }

  private async syncGlobalGpt54Defaults() {
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "SkillConfig"
      SET
        "defaultModel" = REPLACE("defaultModel", 'gpt-5.5', 'gpt-5.4'),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE POSITION('gpt-5.5' IN "defaultModel") > 0
    `);

    await this.prismaService.$executeRawUnsafe(`
      UPDATE "PromptTemplate"
      SET
        "modelName" = REPLACE("modelName", 'gpt-5.5', 'gpt-5.4'),
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE POSITION('gpt-5.5' IN "modelName") > 0
    `);
  }

  private async syncOpportunityInsightSkillMetadata() {
    const targetSlugs = new Set([
      "opportunity-insight-brand-account-analysis",
      "opportunity-insight-competitor-account-analysis",
      "opportunity-insight-comment-analysis",
      "opportunity-insight-final-report",
      "xiaohongshu-marketing-calendar",
    ]);
    const seeds = database.skillConfigs.filter((item) => targetSlugs.has(item.slug));

    for (const skill of seeds) {
      await this.prismaService.$executeRaw`
        UPDATE "SkillConfig"
        SET
          "name" = ${skill.name},
          "category" = ${skill.category},
          "provider" = ${skill.provider},
          "defaultModel" = ${skill.defaultModel},
          "pointsCost" = ${skill.pointsCost},
          "description" = ${skill.description},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${skill.id}
           OR "slug" = ${skill.slug}
      `;
    }
  }

  private async syncOpportunityInsightPromptContents() {
    const seeds = database.promptTemplates.filter((item) => SOURCE_PINNED_PROMPT_IDS.has(item.id));

    for (const prompt of seeds) {
      const nextContent = this.readPromptContent(prompt.id, prompt.content);
      await this.prismaService.$executeRaw`
        UPDATE "PromptTemplate"
        SET
          "name" = ${prompt.name},
          "scene" = ${prompt.scene},
          "version" = ${prompt.version},
          "status" = ${prompt.status},
          "modelName" = ${prompt.modelName},
          "temperature" = ${prompt.temperature},
          "maxTokens" = ${prompt.maxTokens},
          "content" = ${nextContent},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${prompt.id}
          AND (
            "name" IS DISTINCT FROM ${prompt.name}
            OR "scene" IS DISTINCT FROM ${prompt.scene}
            OR "version" IS DISTINCT FROM ${prompt.version}
            OR "status" IS DISTINCT FROM ${prompt.status}
            OR "modelName" IS DISTINCT FROM ${prompt.modelName}
            OR "temperature" IS DISTINCT FROM ${prompt.temperature}
            OR "maxTokens" IS DISTINCT FROM ${prompt.maxTokens}
            OR "content" IS DISTINCT FROM ${nextContent}
          )
      `;
    }
  }

  private async backfillDouyinOriginalCopyPromptContents() {
    for (const prompt of database.promptTemplates) {
      const legacyFallback = DOUYIN_ORIGINAL_COPY_LEGACY_FALLBACKS[prompt.id];
      if (!legacyFallback) {
        continue;
      }
      const seedContent = this.readPromptContent(prompt.id, prompt.content);
      if (!seedContent || seedContent.trim() === legacyFallback.trim()) {
        continue;
      }
      await this.prismaService.$executeRaw`
        UPDATE "PromptTemplate"
        SET
          "content" = ${seedContent},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${prompt.id}
          AND (
            COALESCE(BTRIM("content"), '') = ''
            OR BTRIM("content") = ${legacyFallback.trim()}
          )
      `;
    }
  }

  private async backfillXhsOriginalCopyPromptContents() {
    for (const prompt of database.promptTemplates) {
      const legacyFallback = XHS_ORIGINAL_COPY_LEGACY_FALLBACKS[prompt.id];
      if (!legacyFallback) {
        continue;
      }
      const seedContent = this.readPromptContent(prompt.id, prompt.content);
      if (!seedContent || seedContent.trim() === legacyFallback.trim()) {
        continue;
      }
      await this.prismaService.$executeRaw`
        UPDATE "PromptTemplate"
        SET
          "content" = ${seedContent},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${prompt.id}
          AND (
            COALESCE(BTRIM("content"), '') = ''
            OR BTRIM("content") = ${legacyFallback.trim()}
          )
      `;
    }
  }

  private async backfillImageGenerationSkillDefaults() {
    for (const skillId of ["skill_xhs_original_image_generation", "skill_xhs_rewrite_image_generation"]) {
      await this.prismaService.$executeRaw`
        UPDATE "SkillConfig"
        SET
          "provider" = ${RIGHT_CODES_IMAGE_PROVIDER_LABEL},
          "defaultModel" = ${RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL}
        WHERE "id" = ${skillId}
          AND "defaultModel" = ${LEGACY_IMAGE_GENERATION_DEFAULT_MODEL}
      `;
    }

    for (const promptId of ["prompt_xhs_original_image_generation", "prompt_xhs_rewrite_image_generation"]) {
      await this.prismaService.$executeRaw`
        UPDATE "PromptTemplate"
        SET "modelName" = ${RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL}
        WHERE "id" = ${promptId}
          AND "modelName" = ${LEGACY_IMAGE_GENERATION_DEFAULT_MODEL}
      `;
    }
  }

  private async backfillLegacyVideoNoteDefaults() {
    await this.prismaService.$executeRaw`
      UPDATE "SkillConfig"
      SET
        "provider" = ${VOLCENGINE_VIDEO_PROVIDER_LABEL},
        "defaultModel" = ${VOLCENGINE_VIDEO_NOTE_DEFAULT_MODEL}
      WHERE "id" = ${"skill_xhs_video_note"}
        AND "defaultModel" = ${LEGACY_VIDEO_NOTE_DEFAULT_MODEL}
    `;

    await this.prismaService.$executeRaw`
      UPDATE "PromptTemplate"
      SET "modelName" = ${VOLCENGINE_VIDEO_NOTE_DEFAULT_MODEL}
      WHERE "id" = ${"prompt_xhs_video_note"}
        AND "modelName" = ${LEGACY_VIDEO_NOTE_DEFAULT_MODEL}
    `;
  }

  private async backfillLegacySkillPromptBindings() {
    const records = this.buildLegacySkillPromptBindings();
    for (const item of records) {
      await this.prismaService.$executeRaw`
        INSERT INTO "SkillPromptBinding" (
          "id",
          "skillId",
          "promptId",
          "skillSlug",
          "promptScene",
          "bindingType",
          "isPrimary",
          "sortOrder",
          "enabled",
          "remarks",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${item.id},
          ${item.skillId},
          ${item.promptId},
          ${item.skillSlug},
          ${item.promptScene},
          ${item.bindingType},
          ${item.isPrimary},
          ${item.sortOrder},
          ${item.enabled},
          ${item.remarks || ""},
          ${new Date(item.createdAt)},
          ${new Date(item.updatedAt)}
        )
        ON CONFLICT ("skillId","promptId") DO NOTHING
      `;
    }
  }

  private async findSkillByIdFromDatabase(id: string) {
    const rows = await this.prismaService.$queryRaw<SkillConfigRow[]>`
      SELECT *
      FROM "SkillConfig"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    return rows[0];
  }

  private async findSkillBySlugFromDatabase(slug: string) {
    const rows = await this.prismaService.$queryRaw<SkillConfigRow[]>`
      SELECT *
      FROM "SkillConfig"
      WHERE "slug" = ${slug}
      LIMIT 1
    `;
    return rows[0];
  }

  private async findPromptByIdFromDatabase(id: string) {
    const rows = await this.prismaService.$queryRaw<PromptTemplateRow[]>`
      SELECT *
      FROM "PromptTemplate"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    return rows[0];
  }

  private async findPromptBySceneFromDatabase(scene: string) {
    const rows = await this.prismaService.$queryRaw<PromptTemplateRow[]>`
      SELECT *
      FROM "PromptTemplate"
      WHERE "scene" = ${scene}
      LIMIT 1
    `;
    return rows[0];
  }

  private async listSkillPromptBindingRowsFromDatabase() {
    const rows = await this.prismaService.$queryRaw<SkillPromptBindingRow[]>`
      SELECT
        binding.*,
        skill."name" AS "skillName",
        prompt."name" AS "promptName"
      FROM "SkillPromptBinding" AS binding
      INNER JOIN "SkillConfig" AS skill ON skill."id" = binding."skillId"
      INNER JOIN "PromptTemplate" AS prompt ON prompt."id" = binding."promptId"
      ORDER BY binding."isPrimary" DESC, binding."sortOrder" ASC, binding."updatedAt" DESC
    `;
    return rows.map((item) => this.normalizeSkillPromptBindingRow(item));
  }

  private async findSkillPromptBindingByIdFromDatabase(id: string) {
    const rows = await this.prismaService.$queryRaw<SkillPromptBindingRow[]>`
      SELECT
        binding.*,
        skill."name" AS "skillName",
        prompt."name" AS "promptName"
      FROM "SkillPromptBinding" AS binding
      INNER JOIN "SkillConfig" AS skill ON skill."id" = binding."skillId"
      INNER JOIN "PromptTemplate" AS prompt ON prompt."id" = binding."promptId"
      WHERE binding."id" = ${id}
      LIMIT 1
    `;
    return rows[0];
  }

  private async findSkillPromptBindingBySkillAndPrompt(skillId: string, promptId: string) {
    const rows = await this.prismaService.$queryRaw<SkillPromptBindingRow[]>`
      SELECT *
      FROM "SkillPromptBinding"
      WHERE "skillId" = ${skillId}
        AND "promptId" = ${promptId}
      LIMIT 1
    `;
    return rows[0];
  }

  private async clearPrimarySkillPromptBindings(skillId: string, excludeId?: string) {
    if (excludeId) {
      await this.prismaService.$executeRaw`
        UPDATE "SkillPromptBinding"
        SET
          "isPrimary" = false,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "skillId" = ${skillId}
          AND "id" <> ${excludeId}
      `;
      return;
    }
    await this.prismaService.$executeRaw`
      UPDATE "SkillPromptBinding"
      SET
        "isPrimary" = false,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "skillId" = ${skillId}
    `;
  }

  private async refreshSkillPromptBindingCache() {
    if (await this.prismaService.canUseDatabase()) {
      const records = await this.listSkillPromptBindingRowsFromDatabase();
      this.rebuildSkillPromptBindingCacheFromRecords(records);
      return;
    }
    this.rebuildSkillPromptBindingCacheFromRecords(this.getLegacySkillPromptBindingsStore());
  }

  private rebuildSkillPromptBindingCacheFromRecords(records: SkillPromptBindingRecord[]) {
    const next = new Map<string, string[]>();
    records
      .filter((item) => item.enabled)
      .sort((left, right) => {
        if (left.skillId !== right.skillId) {
          return left.skillId.localeCompare(right.skillId);
        }
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }
        return left.sortOrder - right.sortOrder;
      })
      .forEach((item) => {
        const idsBySkillId = next.get(item.skillId) || [];
        idsBySkillId.push(item.promptId);
        next.set(item.skillId, idsBySkillId);

        const idsBySkillSlug = next.get(item.skillSlug) || [];
        idsBySkillSlug.push(item.promptId);
        next.set(item.skillSlug, idsBySkillSlug);
      });
    this.skillPromptBindingCache = next;
  }

  private getLegacySkillPromptBindingsStore() {
    if (!this.legacySkillPromptBindings) {
      this.legacySkillPromptBindings = this.buildLegacySkillPromptBindings();
    }
    return this.legacySkillPromptBindings;
  }

  private buildLegacySkillPromptBindings() {
    const skills = database.skillConfigs;
    const prompts = database.promptTemplates;
    const records: SkillPromptBindingRecord[] = [];
    const existed = new Set<string>();

    Object.entries(SKILL_PROMPT_BINDINGS).forEach(([skillKey, rule]) => {
      const skill = skills.find((item) => item.id === skillKey || item.slug === skillKey);
      if (!skill) {
        return;
      }
      const promptQueue: PromptTemplateRecord[] = [];
      const seenPromptId = new Set<string>();
      rule.promptIds?.forEach((promptId) => {
        const prompt = prompts.find((item) => item.id === promptId);
        if (prompt && !seenPromptId.has(prompt.id)) {
          seenPromptId.add(prompt.id);
          promptQueue.push(prompt);
        }
      });
      rule.promptScenes?.forEach((scene) => {
        const prompt = prompts.find((item) => item.scene === scene);
        if (prompt && !seenPromptId.has(prompt.id)) {
          seenPromptId.add(prompt.id);
          promptQueue.push(prompt);
        }
      });

      promptQueue.forEach((prompt, index) => {
        const uniqueKey = `${skill.id}:${prompt.id}`;
        if (existed.has(uniqueKey)) {
          return;
        }
        existed.add(uniqueKey);
        records.push({
          id: `spb_${skill.id}_${prompt.id}`,
          skillId: skill.id,
          skillSlug: skill.slug,
          skillName: skill.name,
          promptId: prompt.id,
          promptScene: prompt.scene,
          promptName: prompt.name,
          bindingType: index === 0 ? "PRIMARY" : "SUPPLEMENTAL",
          isPrimary: index === 0,
          sortOrder: 100 + index * 10,
          enabled: true,
          remarks: "由历史技能提示词映射自动回填。",
          createdAt: skill.updatedAt,
          updatedAt: prompt.updatedAt || skill.updatedAt,
        });
      });
    });

    return records;
  }

  private upsertLegacySkillPromptBinding(record: SkillPromptBindingRecord, replace = false) {
    const store = this.getLegacySkillPromptBindingsStore();
    if (record.isPrimary) {
      store.forEach((item, index) => {
        if (item.skillId === record.skillId && item.id !== record.id) {
          store[index] = { ...item, isPrimary: false };
        }
      });
    }
    const index = store.findIndex((item) => item.skillId === record.skillId && item.promptId === record.promptId);
    if (index >= 0) {
      store[index] = replace ? record : { ...store[index], ...record, updatedAt: new Date().toISOString() };
      return;
    }
    store.unshift(record);
  }

  private matchSkillPromptBindingQuery(item: SkillPromptBindingRecord, query: ListSkillPromptBindingsQuery) {
    if (query.skillSlug && item.skillSlug !== query.skillSlug) {
      return false;
    }
    if (query.promptScene && item.promptScene !== query.promptScene) {
      return false;
    }
    if (typeof query.enabled === "boolean" && item.enabled !== query.enabled) {
      return false;
    }
    return true;
  }

  private async resolveSkillForBinding(payload: CreateSkillPromptBindingPayload) {
    const byId = payload.skillId ? await this.getSkillById(String(payload.skillId).trim()) : undefined;
    if (byId) {
      return byId;
    }
    const skillSlug = this.normalizeSkillSlug(payload.skillSlug);
    const bySlug = await this.getSkillBySlug(skillSlug);
    if (!bySlug) {
      throw new BadRequestException("绑定的技能不存在");
    }
    return bySlug;
  }

  private async resolvePromptForBinding(payload: CreateSkillPromptBindingPayload) {
    const promptId = String(payload.promptId || "").trim();
    if (promptId) {
      const byId = await this.getPromptById(promptId);
      if (!byId) {
        throw new BadRequestException("绑定的提示词不存在");
      }
      return byId;
    }
    const promptScene = String(payload.promptScene || "").trim();
    if (!promptScene) {
      throw new BadRequestException("提示词场景不能为空");
    }
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const byScene = await this.findPromptBySceneFromDatabase(promptScene);
      if (byScene) {
        return this.hydratePromptTemplateRecord(this.hydrateSourcePinnedPrompt(this.normalizePromptTemplateRow(byScene)));
      }
    }
    const prompt = database.promptTemplates.find((item) => item.scene === promptScene);
    if (!prompt) {
      throw new BadRequestException("绑定的提示词不存在");
    }
    return this.hydratePromptTemplateRecord(this.hydrateLocalPromptTemplateSeed(prompt));
  }

  private getPromptSourceBundle(promptId: string, fallback: string) {
    return readPromptSourceBundle(promptId, fallback);
  }

  private readPromptContent(promptId: string, fallback: string) {
    return this.getPromptSourceBundle(promptId, fallback).content;
  }

  private normalizePromptContent(content: unknown) {
    if (typeof content === "string") {
      return normalizeSafeText(content, { fieldLabel: "提示词正文", strict: true }) || "";
    }
    if (content === null || content === undefined) {
      return "";
    }
    return JSON.stringify(content, null, 2);
  }

  private normalizeSkillConfigRow(row: SkillConfigRow): SkillConfigRecord {
    const isHalfYearPlan = row.id === "skill_annual_plan" || row.slug === "enterprise-annual-plan";
    const isImageGenerationSkill = row.id === "skill_xhs_original_image_generation" || row.id === "skill_xhs_rewrite_image_generation";
    const normalizedSkillName =
      row.slug === "douyin-remix-short-video-studio"
        ? "复刻短视频-复刻分析"
        : row.slug === "douyin-remix-short-video-compose"
          ? "复刻短视频-拼接成片"
          : isHalfYearPlan
            ? "半年营销规划"
            : row.name;
    return {
      id: row.id,
      name: normalizedSkillName,
      slug: row.slug,
      category: row.category,
      status: row.status,
      provider: isImageGenerationSkill ? RIGHT_CODES_IMAGE_PROVIDER_LABEL : row.provider,
      defaultModel: this.normalizeImageGenerationModelValue(row.defaultModel),
      pointsCost: Number(row.pointsCost || 0),
      description: isHalfYearPlan ? "用于输出未来半年营销节点、活动主题和多平台协同规划。" : row.description,
      inputSchemaJson: this.normalizeSkillInputSchemaValue(row.inputSchemaJson),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private normalizePromptTemplateRow(row: PromptTemplateRow): PromptTemplateRecord {
    const isHalfYearPlanPrompt = row.id === "prompt_annual_marketing_plan" || row.id === "prompt_annual_plan";
    return {
      id: row.id,
      name: isHalfYearPlanPrompt ? "半年营销规划主提示词" : row.name,
      scene: isHalfYearPlanPrompt ? "半年营销规划生成" : row.scene,
      version: row.version,
      status: row.status,
      modelName: this.normalizeImageGenerationModelValue(row.modelName),
      temperature: Number(row.temperature || 0),
      maxTokens: Number(row.maxTokens || 0),
      content: row.content || "",
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private hydratePromptTemplateRecord(prompt: PromptTemplateRecord): PromptTemplateRecord {
    return {
      ...prompt,
      content: prompt.content || "",
    };
  }

  private hydrateSourcePinnedPrompt(prompt: PromptTemplateRecord): PromptTemplateRecord {
    if (!SOURCE_PINNED_PROMPT_IDS.has(prompt.id)) {
      return prompt;
    }
    return {
      ...prompt,
      content: this.readPromptContent(prompt.id, prompt.content),
    };
  }

  private hydrateLocalPromptTemplateSeed(prompt: PromptTemplateRecord): PromptTemplateRecord {
    return this.hydrateSourcePinnedPrompt(prompt);
  }

  private normalizeSkillPromptBindingRow(row: SkillPromptBindingRow): SkillPromptBindingRecord {
    return {
      id: row.id,
      skillId: row.skillId,
      skillSlug: row.skillSlug,
      skillName: row.skillName,
      promptId: row.promptId,
      promptScene: row.promptScene,
      promptName: row.promptName,
      bindingType: this.normalizeSkillPromptBindingType(row.bindingType),
      isPrimary: Boolean(row.isPrimary),
      sortOrder: Number(row.sortOrder || 0),
      enabled: Boolean(row.enabled),
      remarks: row.remarks || "",
      createdAt: this.normalizeDate(row.createdAt),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private normalizeDate(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  private normalizeSkillInputSchemaValue(value: unknown): SkillConfigRecord["inputSchemaJson"] {
    const parsed = this.parseJsonValue(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const current = parsed as Record<string, unknown>;
    return {
      version: "v1",
      source:
        current.source === "INSTALLER_PARSED" || current.source === "DESCRIPTION_MIGRATED" || current.source === "ADMIN_EDITED"
          ? current.source
          : undefined,
      databaseInputs: Array.isArray(current.databaseInputs) ? current.databaseInputs : [],
      knowledgeInputs: Array.isArray(current.knowledgeInputs) ? current.knowledgeInputs : [],
      customInputs: Array.isArray(current.customInputs) ? current.customInputs : [],
    };
  }

  private serializeSkillInputSchemaValue(value: unknown) {
    const normalized = this.normalizeSkillInputSchemaValue(value);
    return normalized ? JSON.stringify(normalized) : null;
  }

  private parseJsonValue(value: unknown) {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  }

  private deriveLegacySkillInputSchemaFromDescription(description: string): SkillConfigRecord["inputSchemaJson"] {
    const source = String(description || "").trim();
    if (!source) {
      return null;
    }

    const markers = [
      "步骤摘要：",
      "数据库参数：",
      "知识库参数：",
      "自定义输入参数：",
      "输入要点：",
      "输出要点：",
      "References 资产：",
      "Scripts 资产：",
    ];
    const extractJsonArray = (title: string) => {
      const start = source.indexOf(title);
      if (start < 0) {
        return [];
      }
      const nextStart = markers
        .map((marker) => source.indexOf(marker, start + title.length))
        .filter((index) => index >= 0)
        .sort((left, right) => left - right)[0];
      const body = source.slice(start + title.length, nextStart ?? source.length).trim();
      const parsed = this.parseJsonValue(body);
      return Array.isArray(parsed) ? parsed : [];
    };

    const databaseInputs = extractJsonArray("数据库参数：");
    const knowledgeInputs = extractJsonArray("知识库参数：");
    const customInputs = extractJsonArray("自定义输入参数：");

    if (!databaseInputs.length && !knowledgeInputs.length && !customInputs.length) {
      return null;
    }

    return {
      version: "v1",
      source: "DESCRIPTION_MIGRATED",
      databaseInputs,
      knowledgeInputs,
      customInputs,
    };
  }

  private getBuiltInSkillInputSchemaSeed(slug: string): SkillConfigRecord["inputSchemaJson"] {
    const normalizedSlug = String(slug || "").trim();
    const seeds: Record<string, NonNullable<SkillConfigRecord["inputSchemaJson"]>> = {
      "brand-omni-growth-analysis": {
        version: "v1",
        source: "ADMIN_EDITED",
        databaseInputs: [
          {
            id: "seed_db_brand_profile",
            parameterType: "INJECT_TOGGLE",
            parameterKey: "brand_profile",
            parameterLabel: "品牌资料",
            selectedValue: "INJECT",
            remarks: "生成品牌增长报告时默认植入品牌资料。",
          },
          {
            id: "seed_db_product_library",
            parameterType: "INJECT_TOGGLE",
            parameterKey: "product_library",
            parameterLabel: "产品资料",
            selectedValue: "INJECT",
            remarks: "生成品牌增长报告时默认植入产品资料。",
          },
        ],
        knowledgeInputs: [
          {
            id: "seed_kb_brand_docs",
            knowledgeBaseId: "kb_brand_docs",
            knowledgeBaseName: "品牌资料知识库",
            targetContentId: "",
            targetContentLabel: "",
            remarks: "默认检索品牌资料知识库。",
          },
        ],
        customInputs: [
          {
            id: "seed_custom_growth_goal",
            inputType: "TEXT",
            label: "补充目标",
            required: false,
            options: [],
            placeholder: "例如：重点分析门店引流、节日礼赠或内容增长机会。",
            acceptedFileTypes: "",
            remarks: "允许在默认报告框架之外追加关注目标。",
          },
        ],
      },
      "enterprise-annual-plan": {
        version: "v1",
        source: "ADMIN_EDITED",
        databaseInputs: [
          {
            id: "seed_db_brand_profile_plan",
            parameterType: "INJECT_TOGGLE",
            parameterKey: "brand_profile",
            parameterLabel: "品牌资料",
            selectedValue: "INJECT",
            remarks: "半年规划默认读取品牌资料。",
          },
          {
            id: "seed_db_marketing_calendar",
            parameterType: "SELECT_CHOICE",
            parameterKey: "marketing_calendar",
            parameterLabel: "营销日历",
            selectedValue: "",
            remarks: "可引用历史营销日历或最近一期日历作为规划参考。",
          },
        ],
        knowledgeInputs: [
          {
            id: "seed_kb_brand_docs_plan",
            knowledgeBaseId: "kb_brand_docs",
            knowledgeBaseName: "品牌资料知识库",
            targetContentId: "",
            targetContentLabel: "",
            remarks: "默认检索品牌资料知识库。",
          },
        ],
        customInputs: [
          {
            id: "seed_custom_plan_focus",
            inputType: "TEXT",
            label: "规划重点",
            required: false,
            options: [],
            placeholder: "例如：新品上市、节日礼赠、门店拉新、会员运营。",
            acceptedFileTypes: "",
            remarks: "支持补充本轮半年规划的业务重点。",
          },
        ],
      },
      "xiaohongshu-brand-marketing-plan": {
        version: "v1",
        source: "ADMIN_EDITED",
        databaseInputs: [
          {
            id: "seed_db_brand_profile_xhs",
            parameterType: "INJECT_TOGGLE",
            parameterKey: "brand_profile",
            parameterLabel: "品牌资料",
            selectedValue: "INJECT",
            remarks: "小红书营销规划默认植入品牌资料。",
          },
          {
            id: "seed_db_topic_library_xhs",
            parameterType: "SELECT_CHOICE",
            parameterKey: "topic_library",
            parameterLabel: "选题库",
            selectedValue: "",
            remarks: "可直接使用已有选题库作为规划参考。",
          },
        ],
        knowledgeInputs: [
          {
            id: "seed_kb_brand_docs_xhs",
            knowledgeBaseId: "kb_brand_docs",
            knowledgeBaseName: "品牌资料知识库",
            targetContentId: "",
            targetContentLabel: "",
            remarks: "默认检索品牌资料知识库。",
          },
        ],
        customInputs: [
          {
            id: "seed_custom_xhs_target",
            inputType: "TEXT",
            label: "目标人群",
            required: false,
            options: [],
            placeholder: "例如：职场女性、亲子家庭、城市白领。",
            acceptedFileTypes: "",
            remarks: "补充小红书种草重点人群。",
          },
        ],
      },
      "tongcheng-brand-douyin-planning": {
        version: "v1",
        source: "ADMIN_EDITED",
        databaseInputs: [
          {
            id: "seed_db_brand_profile_dy",
            parameterType: "INJECT_TOGGLE",
            parameterKey: "brand_profile",
            parameterLabel: "品牌资料",
            selectedValue: "INJECT",
            remarks: "抖音策划默认读取品牌资料。",
          },
          {
            id: "seed_db_material_library_dy",
            parameterType: "SELECT_CHOICE",
            parameterKey: "material_library",
            parameterLabel: "素材库",
            selectedValue: "",
            remarks: "可直接读取现有素材库内容作为策划参考。",
          },
        ],
        knowledgeInputs: [
          {
            id: "seed_kb_brand_docs_dy",
            knowledgeBaseId: "kb_brand_docs",
            knowledgeBaseName: "品牌资料知识库",
            targetContentId: "",
            targetContentLabel: "",
            remarks: "默认检索品牌资料知识库。",
          },
        ],
        customInputs: [
          {
            id: "seed_custom_douyin_theme",
            inputType: "TEXT",
            label: "活动主题",
            required: false,
            options: [],
            placeholder: "例如：暑期活动、新品促销、同城门店引流。",
            acceptedFileTypes: "",
            remarks: "用于补充本轮抖音策划主题。",
          },
        ],
      },
      "wechat-article-composer": {
        version: "v1",
        source: "ADMIN_EDITED",
        databaseInputs: [
          {
            id: "seed_db_brand_profile_wechat",
            parameterType: "INJECT_TOGGLE",
            parameterKey: "brand_profile",
            parameterLabel: "品牌资料",
            selectedValue: "INJECT",
            remarks: "公众号创作默认植入品牌资料。",
          },
          {
            id: "seed_db_product_library_wechat",
            parameterType: "INJECT_TOGGLE",
            parameterKey: "product_library",
            parameterLabel: "产品资料",
            selectedValue: "INJECT",
            remarks: "公众号创作默认植入产品资料。",
          },
          {
            id: "seed_db_marketing_calendar_wechat",
            parameterType: "SELECT_CHOICE",
            parameterKey: "marketing_calendar",
            parameterLabel: "营销日历",
            selectedValue: "",
            remarks: "可直接选择最近一期营销日历。",
          },
        ],
        knowledgeInputs: [
          {
            id: "seed_kb_brand_docs_wechat",
            knowledgeBaseId: "kb_brand_docs",
            knowledgeBaseName: "品牌资料知识库",
            targetContentId: "",
            targetContentLabel: "",
            remarks: "默认检索品牌资料知识库。",
          },
        ],
        customInputs: [
          {
            id: "seed_custom_wechat_topic",
            inputType: "TEXT",
            label: "文章主题",
            required: true,
            options: [],
            placeholder: "例如：新品上市、节日营销、门店活动。",
            acceptedFileTypes: "",
            remarks: "补充本轮公众号文章主题。",
          },
          {
            id: "seed_custom_wechat_style",
            inputType: "SELECT",
            label: "文章风格",
            required: false,
            options: ["品牌故事", "活动种草", "专业解读", "促销转化"],
            placeholder: "请选择文章风格",
            acceptedFileTypes: "",
            remarks: "用于控制公众号文章整体风格。",
          },
        ],
      },
      "wechat-html-general": {
        version: "v1",
        source: "ADMIN_EDITED",
        databaseInputs: [],
        knowledgeInputs: [],
        customInputs: [
          {
            id: "seed_custom_html_content",
            inputType: "TEXT",
            label: "Markdown 正文",
            required: true,
            options: [],
            placeholder: "请输入或粘贴待渲染的公众号正文内容。",
            acceptedFileTypes: "",
            remarks: "HTML 渲染主输入。",
          },
        ],
      },
      "wechat-html-minimal": {
        version: "v1",
        source: "ADMIN_EDITED",
        databaseInputs: [],
        knowledgeInputs: [],
        customInputs: [
          {
            id: "seed_custom_html_content",
            inputType: "TEXT",
            label: "Markdown 正文",
            required: true,
            options: [],
            placeholder: "请输入或粘贴待渲染的公众号正文内容。",
            acceptedFileTypes: "",
            remarks: "HTML 渲染主输入。",
          },
        ],
      },
      "wechat-html-space": {
        version: "v1",
        source: "ADMIN_EDITED",
        databaseInputs: [],
        knowledgeInputs: [],
        customInputs: [
          {
            id: "seed_custom_html_content",
            inputType: "TEXT",
            label: "Markdown 正文",
            required: true,
            options: [],
            placeholder: "请输入或粘贴待渲染的公众号正文内容。",
            acceptedFileTypes: "",
            remarks: "HTML 渲染主输入。",
          },
        ],
      },
      "wechat-html-notice": {
        version: "v1",
        source: "ADMIN_EDITED",
        databaseInputs: [],
        knowledgeInputs: [],
        customInputs: [
          {
            id: "seed_custom_html_content",
            inputType: "TEXT",
            label: "Markdown 正文",
            required: true,
            options: [],
            placeholder: "请输入或粘贴待渲染的公众号正文内容。",
            acceptedFileTypes: "",
            remarks: "HTML 渲染主输入。",
          },
        ],
      },
    };
    return seeds[normalizedSlug] || null;
  }

  private normalizeImageGenerationModelValue(value: string) {
    if (value === LEGACY_IMAGE_GENERATION_DEFAULT_MODEL) {
      return RIGHT_CODES_IMAGE_GENERATION_DEFAULT_MODEL;
    }
    if (value === LEGACY_VIDEO_NOTE_DEFAULT_MODEL) {
      return VOLCENGINE_VIDEO_NOTE_DEFAULT_MODEL;
    }
    return value;
  }

  private normalizeSkillPromptBindingType(value: unknown): SkillPromptBindingRecord["bindingType"] {
    const normalized = String(value || "PRIMARY").trim().toUpperCase();
    if (normalized === "SUPPLEMENTAL" || normalized === "FALLBACK") {
      return normalized;
    }
    return "PRIMARY";
  }

  private normalizeSkillSlug(value: unknown) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();
    if (!normalized) {
      throw new BadRequestException("技能标识不能为空");
    }
    if (!/^[a-z0-9-]+$/.test(normalized)) {
      throw new BadRequestException("技能标识只能使用英文小写、数字和短横线");
    }
    return normalized;
  }
}

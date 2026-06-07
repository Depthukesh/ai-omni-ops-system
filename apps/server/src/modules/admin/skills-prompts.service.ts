import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createId, database, type PromptTemplateRecord, type SkillConfigRecord } from "../../common/mock-data";
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

export type UpdateSkillConfigPayload = {
  status?: SkillConfigRecord["status"];
  defaultModel?: string;
  pointsCost?: number;
  description?: string;
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
};

export type UpdatePromptTemplatePayload = {
  status?: PromptTemplateRecord["status"];
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  content?: string;
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
    promptScenes: ["小红书营销日历生成"],
  },
  "xiaohongshu-marketing-calendar": {
    promptIds: ["prompt_xhs_calendar"],
    promptScenes: ["小红书营销日历生成"],
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
  skill_wechat_html_render: {
    promptIds: ["prompt_wechat_html_render"],
    promptScenes: ["公众号HTML渲染"],
  },
  "wechat-html-renderer": {
    promptIds: ["prompt_wechat_html_render"],
    promptScenes: ["公众号HTML渲染"],
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
  skill_open_design_critique: {
    promptIds: ["prompt_open_design_critique"],
    promptScenes: ["Open Design-设计评审"],
  },
  critique: {
    promptIds: ["prompt_open_design_critique"],
    promptScenes: ["Open Design-设计评审"],
  },
  skill_open_design_tweaks: {
    promptIds: ["prompt_open_design_tweaks"],
    promptScenes: ["Open Design-定向微调"],
  },
  tweaks: {
    promptIds: ["prompt_open_design_tweaks"],
    promptScenes: ["Open Design-定向微调"],
  },
  skill_open_design_wireframe_sketch: {
    promptIds: ["prompt_open_design_wireframe_sketch"],
    promptScenes: ["Open Design-线框草图"],
  },
  "wireframe-sketch": {
    promptIds: ["prompt_open_design_wireframe_sketch"],
    promptScenes: ["Open Design-线框草图"],
  },
  skill_open_design_design_brief: {
    promptIds: ["prompt_open_design_design_brief"],
    promptScenes: ["Open Design-设计简报"],
  },
  "design-brief": {
    promptIds: ["prompt_open_design_design_brief"],
    promptScenes: ["Open Design-设计简报"],
  },
  skill_open_design_dating_web: {
    promptIds: ["prompt_open_design_dating_web"],
    promptScenes: ["Open Design-约会产品网页"],
  },
  "dating-web": {
    promptIds: ["prompt_open_design_dating_web"],
    promptScenes: ["Open Design-约会产品网页"],
  },
  skill_open_design_digital_eguide: {
    promptIds: ["prompt_open_design_digital_eguide"],
    promptScenes: ["Open Design-数字指南"],
  },
  "digital-eguide": {
    promptIds: ["prompt_open_design_digital_eguide"],
    promptScenes: ["Open Design-数字指南"],
  },
  skill_open_design_hatch_pet: {
    promptIds: ["prompt_open_design_hatch_pet"],
    promptScenes: ["Open Design-宠物孵化互动页"],
  },
  "hatch-pet": {
    promptIds: ["prompt_open_design_hatch_pet"],
    promptScenes: ["Open Design-宠物孵化互动页"],
  },
  skill_open_design_audio_jingle: {
    promptIds: ["prompt_open_design_audio_jingle"],
    promptScenes: ["Open Design-音频 Jingle"],
  },
  "audio-jingle": {
    promptIds: ["prompt_open_design_audio_jingle"],
    promptScenes: ["Open Design-音频 Jingle"],
  },
  skill_open_design_pm_spec: {
    promptIds: ["prompt_open_design_pm_spec"],
    promptScenes: ["Open Design-PM 规格说明"],
  },
  "pm-spec": {
    promptIds: ["prompt_open_design_pm_spec"],
    promptScenes: ["Open Design-PM 规格说明"],
  },
  skill_open_design_eng_runbook: {
    promptIds: ["prompt_open_design_eng_runbook"],
    promptScenes: ["Open Design-工程 Runbook"],
  },
  "eng-runbook": {
    promptIds: ["prompt_open_design_eng_runbook"],
    promptScenes: ["Open Design-工程 Runbook"],
  },
  skill_open_design_finance_report: {
    promptIds: ["prompt_open_design_finance_report"],
    promptScenes: ["Open Design-财务报告"],
  },
  "finance-report": {
    promptIds: ["prompt_open_design_finance_report"],
    promptScenes: ["Open Design-财务报告"],
  },
  skill_open_design_hr_onboarding: {
    promptIds: ["prompt_open_design_hr_onboarding"],
    promptScenes: ["Open Design-HR 入职引导"],
  },
  "hr-onboarding": {
    promptIds: ["prompt_open_design_hr_onboarding"],
    promptScenes: ["Open Design-HR 入职引导"],
  },
  skill_open_design_invoice: {
    promptIds: ["prompt_open_design_invoice"],
    promptScenes: ["Open Design-发票模板"],
  },
  invoice: {
    promptIds: ["prompt_open_design_invoice"],
    promptScenes: ["Open Design-发票模板"],
  },
  skill_open_design_kanban_board: {
    promptIds: ["prompt_open_design_kanban_board"],
    promptScenes: ["Open Design-看板面板"],
  },
  "kanban-board": {
    promptIds: ["prompt_open_design_kanban_board"],
    promptScenes: ["Open Design-看板面板"],
  },
  skill_open_design_team_okrs: {
    promptIds: ["prompt_open_design_team_okrs"],
    promptScenes: ["Open Design-团队 OKR"],
  },
  "team-okrs": {
    promptIds: ["prompt_open_design_team_okrs"],
    promptScenes: ["Open Design-团队 OKR"],
  },
  skill_open_design_replit_deck: {
    promptIds: ["prompt_open_design_replit_deck"],
    promptScenes: ["Open Design-Replit Deck"],
  },
  "replit-deck": {
    promptIds: ["prompt_open_design_replit_deck"],
    promptScenes: ["Open Design-Replit Deck"],
  },
  skill_open_design_html_ppt_course_module: {
    promptIds: ["prompt_open_design_html_ppt_course_module"],
    promptScenes: ["Open Design-课程模块 Deck"],
  },
  "html-ppt-course-module": {
    promptIds: ["prompt_open_design_html_ppt_course_module"],
    promptScenes: ["Open Design-课程模块 Deck"],
  },
  skill_open_design_html_ppt_dir_key_nav_minimal: {
    promptIds: ["prompt_open_design_html_ppt_dir_key_nav_minimal"],
    promptScenes: ["Open Design-极简目录 Deck"],
  },
  "html-ppt-dir-key-nav-minimal": {
    promptIds: ["prompt_open_design_html_ppt_dir_key_nav_minimal"],
    promptScenes: ["Open Design-极简目录 Deck"],
  },
  skill_open_design_html_ppt_graphify_dark_graph: {
    promptIds: ["prompt_open_design_html_ppt_graphify_dark_graph"],
    promptScenes: ["Open Design-深色图表 Deck"],
  },
  "html-ppt-graphify-dark-graph": {
    promptIds: ["prompt_open_design_html_ppt_graphify_dark_graph"],
    promptScenes: ["Open Design-深色图表 Deck"],
  },
  skill_open_design_html_ppt_hermes_cyber_terminal: {
    promptIds: ["prompt_open_design_html_ppt_hermes_cyber_terminal"],
    promptScenes: ["Open Design-赛博终端 Deck"],
  },
  "html-ppt-hermes-cyber-terminal": {
    promptIds: ["prompt_open_design_html_ppt_hermes_cyber_terminal"],
    promptScenes: ["Open Design-赛博终端 Deck"],
  },
  skill_open_design_html_ppt_knowledge_arch_blueprint: {
    promptIds: ["prompt_open_design_html_ppt_knowledge_arch_blueprint"],
    promptScenes: ["Open Design-知识架构蓝图 Deck"],
  },
  "html-ppt-knowledge-arch-blueprint": {
    promptIds: ["prompt_open_design_html_ppt_knowledge_arch_blueprint"],
    promptScenes: ["Open Design-知识架构蓝图 Deck"],
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
      "prompt_xhs_video_remix_script",
      "prompt_xhs_video_storyboard",
    ],
    promptScenes: [
      "视频笔记-品牌宣传剧本",
      "视频笔记-口播带货剧本",
      "视频笔记-短剧带货剧本",
      "视频笔记-复刻视频拆解",
      "视频笔记-故事板提示词",
    ],
  },
  "short-video-api-studio": {
    promptIds: [
      "prompt_xhs_video_brand_script",
      "prompt_xhs_video_spoken_script",
      "prompt_xhs_video_skit_script",
      "prompt_xhs_video_remix_script",
      "prompt_xhs_video_storyboard",
    ],
    promptScenes: [
      "视频笔记-品牌宣传剧本",
      "视频笔记-口播带货剧本",
      "视频笔记-短剧带货剧本",
      "视频笔记-复刻视频拆解",
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
  skill_douyin_digital_human_script: {
    promptIds: ["prompt_douyin_digital_human_script"],
    promptScenes: ["抖音数字人-口播脚本"],
  },
  "douyin-digital-human-script-studio": {
    promptIds: ["prompt_douyin_digital_human_script"],
    promptScenes: ["抖音数字人-口播脚本"],
  },
};

@Injectable()
export class SkillsPromptsService {
  private registryBootstrapPromise?: Promise<void>;

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
          "defaultModel" = ${payload.defaultModel ?? current.defaultModel},
          "pointsCost" = ${payload.pointsCost ?? current.pointsCost},
          "description" = ${payload.description ?? current.description},
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
    if (payload.defaultModel !== undefined) {
      skill.defaultModel = payload.defaultModel;
    }
    if (payload.pointsCost !== undefined) {
      skill.pointsCost = payload.pointsCost;
    }
    if (payload.description !== undefined) {
      skill.description = payload.description;
    }
    skill.updatedAt = new Date().toISOString();
    return { ...skill };
  }

  async listPrompts() {
    const prompts = await this.listPromptRows();
    return prompts.map((item) => this.hydratePromptTemplateRecord(item));
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
      const row = await this.findPromptByIdFromDatabase(id);
      if (row) {
        return this.hydratePromptTemplateRecord(this.normalizePromptTemplateRow(row));
      }
    }
    const prompt = database.promptTemplates.find((item) => item.id === id);
    if (!prompt) {
      return undefined;
    }
    return this.hydratePromptTemplateRecord(prompt);
  }

  async getActivePromptById(id: string) {
    const prompt = await this.getPromptById(id);
    return prompt?.status === "ACTIVE" ? prompt : undefined;
  }

  async getActivePromptByScene(scenes: string[]) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureRegistryTablesReady();
      const rows = await this.prismaService.$queryRaw<PromptTemplateRow[]>`
        SELECT *
        FROM "PromptTemplate"
        WHERE "scene" = ANY(${scenes}::text[])
          AND "status" = 'ACTIVE'
        ORDER BY "updatedAt" DESC
      `;
      const row = rows[0];
      if (row) {
        return this.hydratePromptTemplateRecord(this.normalizePromptTemplateRow(row));
      }
    }

    const prompt = database.promptTemplates.find(
      (item) => scenes.includes(item.scene) && item.status === "ACTIVE",
    );
    if (!prompt) {
      return undefined;
    }
    return this.hydratePromptTemplateRecord(prompt);
  }

  resolvePromptIdsForSkill(skill: SkillConfigRecord, prompts: PromptTemplateRecord[]) {
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
      const rows = await this.prismaService.$queryRaw<PromptTemplateRow[]>`
        SELECT *
        FROM "PromptTemplate"
        ORDER BY "updatedAt" DESC
      `;
      return rows.map((item) => this.normalizePromptTemplateRow(item));
    }
    return database.promptTemplates.map((item) => this.hydratePromptTemplateRecord(item));
  }

  private async ensureRegistryTablesReady() {
    if (!this.registryBootstrapPromise) {
      this.registryBootstrapPromise = this.bootstrapRegistryTables();
    }
    await this.registryBootstrapPromise;
  }

  private async bootstrapRegistryTables() {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
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
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
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

    await this.backfillDouyinOriginalCopyPromptContents();
    await this.backfillImageGenerationSkillDefaults();
    await this.backfillLegacyVideoNoteDefaults();
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

  private getPromptSourceBundle(promptId: string, fallback: string) {
    return readPromptSourceBundle(promptId, fallback);
  }

  private readPromptContent(promptId: string, fallback: string) {
    return this.getPromptSourceBundle(promptId, fallback).content;
  }

  private normalizePromptContent(content: unknown) {
    if (typeof content === "string") {
      return content;
    }
    if (content === null || content === undefined) {
      return "";
    }
    return JSON.stringify(content, null, 2);
  }

  private normalizeSkillConfigRow(row: SkillConfigRow): SkillConfigRecord {
    const isHalfYearPlan = row.id === "skill_annual_plan" || row.slug === "enterprise-annual-plan";
    const isImageGenerationSkill = row.id === "skill_xhs_original_image_generation" || row.id === "skill_xhs_rewrite_image_generation";
    return {
      id: row.id,
      name: isHalfYearPlan ? "半年营销规划" : row.name,
      slug: row.slug,
      category: row.category,
      status: row.status,
      provider: isImageGenerationSkill ? RIGHT_CODES_IMAGE_PROVIDER_LABEL : row.provider,
      defaultModel: this.normalizeImageGenerationModelValue(row.defaultModel),
      pointsCost: Number(row.pointsCost || 0),
      description: isHalfYearPlan ? "用于输出未来半年营销节点、活动主题和多平台协同规划。" : row.description,
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

  private normalizeDate(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
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

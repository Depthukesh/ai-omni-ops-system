"use client";

import { type MediaRecord } from "../../../services/personal-center";
import { type XiaohongshuGoal, type XiaohongshuNoteDraft, type XiaohongshuTone } from "../../../services/xiaohongshu";
import { getWorkBaseTitle } from "./work-task-helpers";

export function buildPublishedPreview(params: {
  work?: MediaRecord;
  matchedDraft?: XiaohongshuNoteDraft;
  brandName: string;
  productName: string;
  goal: XiaohongshuGoal;
  tone: XiaohongshuTone;
  campaignBrief: string;
}) {
  const { work, matchedDraft, brandName, productName, goal, tone, campaignBrief } = params;
  const title = matchedDraft?.title || getWorkBaseTitle(work?.title || `${brandName}${productName}小红书作品`);

  return {
    title,
    summary:
      matchedDraft?.summary || `${brandName}围绕${productName}做了一份面向${goal}的小红书内容成果，风格偏${tone}。`,
    opening:
      matchedDraft?.opening || `如果你也在找适合${productName}的真实分享内容，这版成果可直接用于小红书图文排版与发布。`,
    outline:
      matchedDraft?.outline || [
        `开头先交代 ${productName} 的使用场景和适合人群，快速把用户带入真实消费语境。`,
        `中段拆解卖点、门店体验和转化理由，让内容既能种草也方便导流到店。`,
        `结尾补充评论区互动或私信动作，承接 ${goal} 的目标。`,
      ],
    hashtags: matchedDraft?.hashtags || [`#${brandName}`, `#${productName}`, "#小红书运营", `#${goal}`],
    coverLine: `${campaignBrief} 这张封面可直接搭配图文笔记使用，突出${productName}与${tone}风格。`,
    nextStep:
      work?.mediaType === "HTML"
        ? "下一步可把这篇 HTML 笔记拿去排版发布，再回到个人中心确认作品沉淀。"
        : "下一步可切换到笔记 HTML 预览，确认正文内容后再一起发布到小红书。",
  };
}

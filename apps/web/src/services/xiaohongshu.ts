"use client";

import {
  DEMO_BRAND_ID,
  brandArchiveSeed,
  getBrandArchive,
  type BrandAccount,
  type BrandArchiveBundle,
  type BrandProduct,
} from "./brand-growth";
import { getXiaohongshuCollectionWorkspace, xhsCollectionSeed, type XhsCollectedNoteRecord, type XhsCollectionWorkspace } from "./collectors";
import { getMedia, getTasks, mediaSeed, taskSeed, type MediaRecord, type TaskRecord } from "./personal-center";

export type XiaohongshuGoal = "种草曝光" | "门店转化" | "新品上新" | "会员拉新";
export type XiaohongshuTone = "专业种草" | "生活方式" | "门店日常" | "促销转化";

export type XiaohongshuTopicIdea = {
  id: string;
  title: string;
  angle: string;
  cta: string;
};

export type XiaohongshuNoteDraft = {
  id: string;
  title: string;
  summary: string;
  opening: string;
  outline: string[];
  hashtags: string[];
};

export type XiaohongshuWorkspaceData = {
  archive: BrandArchiveBundle;
  tasks: TaskRecord[];
  media: MediaRecord[];
  collection: XhsCollectionWorkspace;
  materialNotes: XhsCollectedNoteRecord[];
};

export const xiaohongshuGoalOptions: XiaohongshuGoal[] = ["种草曝光", "门店转化", "新品上新", "会员拉新"];
export const xiaohongshuToneOptions: XiaohongshuTone[] = ["专业种草", "生活方式", "门店日常", "促销转化"];

export async function getXiaohongshuWorkspace() {
  const [archive, tasks, media, collection] = await Promise.all([
    getBrandArchive(DEMO_BRAND_ID),
    getTasks(),
    getMedia(),
    getXiaohongshuCollectionWorkspace(DEMO_BRAND_ID),
  ]);

  return {
    archive,
    tasks,
    media,
    collection,
    materialNotes: collection.benchmarkNotes.filter((item) => item.isInMaterialLibrary),
  } satisfies XiaohongshuWorkspaceData;
}

export function getXiaohongshuWorkspaceSeed(): XiaohongshuWorkspaceData {
  return {
    archive: JSON.parse(JSON.stringify(brandArchiveSeed)) as BrandArchiveBundle,
    tasks: [...taskSeed],
    media: [...mediaSeed],
    collection: JSON.parse(JSON.stringify(xhsCollectionSeed)) as XhsCollectionWorkspace,
    materialNotes: xhsCollectionSeed.benchmarkNotes.filter((item) => item.isInMaterialLibrary),
  };
}

export function getDefaultProduct(products: BrandProduct[]) {
  return products[0];
}

export function getDefaultXiaohongshuAccount(accounts: BrandAccount[]) {
  return accounts.find((item) => item.platform === "XIAOHONGSHU") || accounts[0];
}

export function buildXiaohongshuPlan(params: {
  brandName: string;
  productName: string;
  usageScenario: string;
  goal: XiaohongshuGoal;
  tone: XiaohongshuTone;
}) {
  const { brandName, productName, usageScenario, goal, tone } = params;

  const topicIdeas: XiaohongshuTopicIdea[] = [
    {
      id: "xhs_topic_1",
      title: `${brandName}${productName}值得买吗？`,
      angle: `从${usageScenario}切入，强调真实体验和高频消费场景。`,
      cta: "收藏这篇，周末到店直接照着买。",
    },
    {
      id: "xhs_topic_2",
      title: `${productName}如何拍出门店爆款氛围感？`,
      angle: `围绕${tone}风格设计门店、出片角度和文案节奏。`,
      cta: "评论区回复“清单”领取拍摄模板。",
    },
    {
      id: "xhs_topic_3",
      title: `${brandName}怎么用${productName}做${goal}？`,
      angle: `结合品牌现有门店与会员基础，输出可落地的活动玩法。`,
      cta: "私信关键词“方案”领取完整门店转化脚本。",
    },
  ];

  const noteDrafts: XiaohongshuNoteDraft[] = topicIdeas.map((topic, index) => ({
    id: `xhs_note_${index + 1}`,
    title: topic.title,
    summary: `${brandName}围绕${productName}做一篇面向${goal}的小红书笔记，风格偏${tone}。`,
    opening: `如果你最近也在找适合${usageScenario}的选择，这篇关于${productName}的真实体验建议先收藏。`,
    outline: [
      `先用 1 句话交代${productName}适合谁，以及为什么在${usageScenario}场景里更容易被种草。`,
      `中段拆解 3 个具体卖点，带出品牌门店、口味体验或节日场景的真实感受。`,
      `结尾给出到店、下单或入会动作，引导用户完成${goal}。`,
    ],
    hashtags: [`#${brandName}`, `#${productName}`, "#小红书运营", `#${goal}`, "#门店增长"],
  }));

  return {
    topicIdeas,
    noteDrafts,
  };
}

export function getXiaohongshuTasks(tasks: TaskRecord[]) {
  return tasks.filter((item) => item.taskType.includes("XHS") || item.taskTitle.includes("小红书"));
}

export function getXiaohongshuMedia(media: MediaRecord[]) {
  return media.filter(
    (item) => item.title.includes("小红书") || item.storageKey.includes("xhs") || item.storageKey.includes("xiaohongshu"),
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { postRuntimeDebugEvent } from "../../../lib/runtime-debug";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import {
  brandArchiveSeed,
  DEMO_BRAND_ID,
  getBrandArchive,
  getBrandPermissionSettings,
  type BrandArchiveBundle,
  type BrandPermissionKey,
  type BrandPermissionSettingsRecord,
} from "../../../services/brand-growth";
import {
  buildUnifiedMaterialLibraryItems,
  buildUnifiedMaterialOptions,
  douyinCollectionSeed,
  getDouyinCollectionWorkspace,
  getXiaohongshuCollectionWorkspace,
  xhsCollectionSeed,
  type DouyinCollectionWorkspace,
  type XhsCollectionWorkspace,
} from "../../../services/collectors";
import {
  annualMarketingPlanSeed,
  deleteDouyinOriginalCopy,
  deleteDouyinRemixCopy,
  deleteDouyinMarketingPlan,
  douyinHotTopicCandidatesSeed,
  douyinMarketingPlanSeed,
  douyinOriginalCopySeed,
  douyinRemixCopySeed,
  generateDouyinHotTopicCandidates,
  generateDouyinMarketingPlan,
  generateDouyinOriginalCopy,
  generateDouyinRemixCopy,
  getAnnualMarketingPlanWorkspace,
  getDouyinHotTopicCandidatesWorkspace,
  getDouyinMarketingPlanWorkspace,
  getDouyinOriginalCopyWorkspace,
  getDouyinRemixCopyWorkspace,
  getGrowthReportWorkspace,
  getOpportunityInsightWorkspace,
  growthReportSeed,
  opportunityInsightSeed,
  updateDouyinTopicLibrary,
  updateDouyinOriginalCopy,
  updateDouyinRemixCopy,
  updateDouyinMarketingPlan,
  type DouyinHotTopicCandidatesWorkspace,
  type DouyinOriginalCopyWorkspace,
  type DouyinRemixCopyWorkspace,
  type DouyinTopicLibraryItem,
  type DouyinMarketingPlanTaskRecord,
  type DouyinMarketingPlanWorkspace,
} from "../../../services/reports";
import {
  deleteOpenClawCreativeMaterial,
  deleteOpenClawDailyPlan,
  deleteOpenClawLobsterDiary,
  deleteOpenClawStrategyOptimization,
  deleteOpenClawVideoWork,
  getOpenClawCreativeMaterialWorkspace,
  getOpenClawDailyPlanWorkspace,
  getOpenClawLobsterDiaryWorkspace,
  getOpenClawStrategyOptimizationWorkspace,
  getOpenClawVideoWorkWorkspace,
  updateOpenClawStrategyOptimization,
  updateOpenClawLobsterDiary,
  type OpenClawCreativeMaterialWorkspace as OpenClawCreativeMaterialWorkspaceRecord,
  type OpenClawDailyPlanWorkspace as OpenClawDailyPlanWorkspaceRecord,
  type OpenClawLobsterDiaryWorkspace as OpenClawLobsterDiaryWorkspaceRecord,
  type OpenClawStrategyOptimizationWorkspace as OpenClawStrategyOptimizationWorkspaceRecord,
  type OpenClawVideoWorkWorkspace as OpenClawVideoWorkWorkspaceRecord,
} from "../../../services/openclaw";
import {
  createDouyinAdPreAudit,
  createDouyinAdPreAuditUpload,
  createDouyinCustomVoice,
  createDouyinDigitalHumanCustomPerson,
  createDouyinDigitalHumanScriptTemplate,
  createDouyinSpeechTask,
  deleteDouyinAdPreAudit,
  deleteDouyinCustomVoice,
  deleteDouyinDigitalHumanCustomPerson,
  deleteDouyinLipSyncWork,
  deleteDouyinDigitalHumanVideoWork,
  deleteDouyinDigitalHumanFavoriteTemplate,
  deleteDouyinDigitalHumanScriptTemplate,
  continueDouyinDirectVideoGeneration,
  continueDouyinRemixShortVideoGeneration,
  continueDouyinVideoGeneration,
  deleteDouyinDirectVideoWork,
  deleteDouyinRemixShortVideoWork,
  deleteDouyinVideoWork,
  generateDouyinDigitalHumanCompleteVideoWork,
  generateDouyinDigitalHumanScript,
  generateDouyinDigitalHumanVideoWork,
  generateDouyinLipSyncWork,
  generateDouyinDirectVideoWork,
  generateDouyinRemixShortVideoWork,
  generateDouyinVideoWork,
  getDouyinAdPreAuditConfig,
  getDouyinAdPreAuditMediaAssets,
  getDouyinAdPreAuditWorks,
  getDouyinDigitalHumanCustomPersons,
  getDouyinDigitalHumanFavoriteTemplates,
  getDouyinDigitalHumanScriptTemplates,
  getDouyinDigitalHumanTemplates,
  getDouyinDigitalHumanTemplateTags,
  getDouyinDigitalHumanVideoWorks,
  getDouyinCustomVoices,
  getDouyinLipSyncWorks,
  getDouyinSpeechTaskDetail,
  refreshDouyinAdPreAudit,
  getDouyinDirectVideoProviders,
  getDouyinDirectVideoWorks,
  getDouyinRemixShortVideoWorks,
  getDouyinVideoProviders,
  getDouyinVideoStoryboardImageProviders,
  getDouyinVideoWorks,
  getDouyinVoiceLibrary,
  refreshDouyinAdPreAuditUpload,
  recoverDouyinDigitalHumanVideo,
  recoverDouyinLipSyncGeneration,
  recoverDouyinDirectVideoGeneration,
  recoverDouyinVideoGeneration,
  regenerateDouyinVideoStoryboard,
  saveDouyinAdPreAuditConfig,
  saveDouyinDigitalHumanFavoriteTemplate,
  updateDouyinDigitalHumanScriptTemplate,
  type DouyinAdPreAuditConfigRecord,
  type DouyinAdPreAuditMediaAssetRecord,
  type DouyinAdPreAuditRecord,
  type DouyinDigitalHumanFavoriteTemplateRecord,
  type DouyinDigitalHumanCustomPersonRecord,
  type DouyinLipSyncWorkRecord,
  type DouyinDigitalHumanScriptTemplateRecord,
  type DouyinCustomVoiceRecord,
  type DigitalHumanTemplatePageInfo,
  type DigitalHumanTemplateRecord,
  type DigitalHumanTemplateTagGroupRecord,
  type DouyinDigitalHumanVideoWorkRecord,
  type DouyinSpeechTaskRecord,
  type DouyinVoiceLibraryRecord,
  type VoiceLibraryPageInfo,
  updateDouyinDirectVideoWork,
  updateDouyinVideoWork,
  type DouyinDirectVideoWorkRecord,
  type DouyinRemixShortVideoWorkRecord,
  type DouyinVideoWorkRecord,
  type StoryboardImageModelOptionRecord,
  type VideoProviderOptionRecord,
} from "../../../services/works";
import { MediaLightbox } from "../xiaohongshu/media-lightbox";
import { type MediaLightboxState } from "../xiaohongshu/shared-types";
import { DouyinAdPreAuditWorkspace } from "./ad-preaudit-workspace";
import { DouyinDigitalHumanWorkspace } from "./digital-human-workspace";
import { DouyinRunningHubWorkspace } from "./douyin-runninghub-workspace";
import { formatDateTime } from "../xiaohongshu/datetime-helpers";
import { renderMarkdownToHtml } from "../xiaohongshu/markdown-render";
import { DouyinHotTopicCandidatesWorkspace as DouyinHotTopicCandidatesWorkspacePanel } from "./hot-topic-candidates-workspace";
import { DouyinOriginalCopyWorkspace as DouyinOriginalCopyWorkspacePanel } from "./original-copy-workspace";
import { DouyinPublishModal } from "./publish-modal";
import { DouyinRemixCopyWorkspace as DouyinRemixCopyWorkspacePanel } from "./remix-copy-workspace";
import { DouyinRemixShortVideoWorkspace } from "./remix-short-video-workspace";
import { DouyinTopicLibraryWorkspace } from "./topic-library-workspace";
import { useDouyinPublishFlow } from "./use-douyin-publish-flow";
import { useWechatChannelPublishFlow } from "./use-wechat-channel-publish-flow";
import { DouyinDirectVideoWorkspace } from "./video-direct-workspace";
import { DouyinVideoStoryboardWorkspace } from "./video-storyboard-workspace";
import { WechatChannelPublishModal } from "./wechat-channel-publish-modal";
import { OpenClawCreativeMaterialWorkspace } from "../brand-growth/openclaw-creative-material-workspace";
import { OpenClawDailyPlanWorkspace } from "../brand-growth/openclaw-daily-plan-workspace";
import { OpenClawLobsterDiaryWorkspace } from "../brand-growth/openclaw-lobster-diary-workspace";
import { OpenClawStrategyOptimizationWorkspace } from "../brand-growth/openclaw-strategy-optimization-workspace";
import { OpenClawVideoWorkspace } from "../brand-growth/openclaw-video-workspace";

type LoadState = "loading" | "api" | "partial";
export type DouyinSectionKey =
  | "plan"
  | "hotTopics"
  | "topicLibrary"
  | "originalCopy"
  | "remixCopy"
  | "remixShortVideo"
  | "video"
  | "videoDirect"
  | "digitalHuman"
  | "runningHub"
  | "adPreAudit"
  | "openclawCreativeMaterials"
  | "openclawDailyPlan"
  | "openclawLobsterDiary"
  | "openclawStrategyOptimization"
  | "openclawVideoWorks";

export interface DouyinWorkspaceShellProps {
  embedded?: boolean;
  forcedSection?: DouyinSectionKey;
}

const MARKETING_PLAN_REQUIRED_INPUTS = ["品牌背景资料", "产品资料库", "机会洞察总报告", "品牌增长报告"] as const;
const douyinPrimarySections: Array<{ key: DouyinSectionKey; label: string; description: string }> = [
  { key: "plan", label: "营销策划方案", description: "围绕品牌背景资料、产品资料库、机会洞察总报告和品牌增长报告生成可编辑的 Markdown 方案。" },
  { key: "originalCopy", label: "原创文案", description: "基于选题库、营销日历和抖音营销策划方案，按不同文案类型生成品牌独立存储的原创文案。" },
  { key: "remixCopy", label: "二创文案", description: "基于统一素材库视频、品牌资料、产品资料和营销策划方案，提取视频文案后生成品牌独立存储的二创文案。" },
  { key: "remixShortVideo", label: "复刻短视频", description: "基于短视频链接或上传视频，按 15 秒一段完成复刻分析、角色卡、分镜图，并在第二阶段逐段生成后自动拼接完整短视频。" },
  { key: "video", label: "AI生视频（故事板）", description: "基于营销日历、统一素材库、产品与营销策划方案，先生成剧本和故事板，再继续生成短视频。" },
  { key: "videoDirect", label: "AI生视频", description: "基于营销日历、统一素材库、产品与营销策划方案直接生成 Seedance 2.0 生视频提示词，确认后继续生成短视频。" },
  { key: "digitalHuman", label: "数字人", description: "对接蝉镜 OpenAPI，支持公共模板库、数字人口播视频创建、结果找回和作品中心管理。" },
  { key: "runningHub", label: "RunningHub应用", description: "独立承载 RunningHub AI 应用卡片、参数弹窗与作品中心，当前先接入 Animate 动作迁移应用。" },
  { key: "adPreAudit", label: "广告预审", description: "对接火山引擎 VOD 广告预审，对已上传到 VOD 的 Vid 发起审核并查看通过、驳回和原因。" },
];
const douyinOpenClawSections: Array<{ key: DouyinSectionKey; label: string; description: string }> = [
  { key: "openclawCreativeMaterials", label: "创作素材", description: "展示由 OpenClaw 调用站内第三方平台能力后生成并保存的文本、图片、视频、语音和 BGM 等素材。" },
  { key: "openclawDailyPlan", label: "每日计划", description: "展示由 OpenClaw Agent 创建的每日计划记录，页面只支持查看与删除。" },
  { key: "openclawLobsterDiary", label: "每周复盘", description: "展示由 OpenClaw Agent 创建的每周复盘记录，支持查看后直接编辑并在内容下留言。" },
  { key: "openclawStrategyOptimization", label: "策略优化记录", description: "展示由 OpenClaw 在每周复盘后生成的策略优化记录，支持查看、编辑、留言和删除。" },
  { key: "openclawVideoWorks", label: "作品列表", description: "展示由 OpenClaw 最终整合生成的成片，可查看、删除，并接入抖音与视频号发布插件。" },
];
const douyinSections = [...douyinPrimarySections, ...douyinOpenClawSections];

const douyinSectionPermissionMap: Record<DouyinSectionKey, BrandPermissionKey> = {
  plan: "douyin.plan",
  hotTopics: "brandGrowth.report.topicLibrary",
  topicLibrary: "brandGrowth.report.topicLibrary",
  originalCopy: "douyin.original",
  remixCopy: "douyin.remix",
  remixShortVideo: "douyin.remixShortVideo",
  video: "douyin.video",
  videoDirect: "douyin.videoDirect",
  digitalHuman: "douyin.digitalHuman",
  runningHub: "douyin.runningHub",
  adPreAudit: "douyin.adPreAudit",
  openclawCreativeMaterials: "brandGrowth.report.topicLibrary",
  openclawDailyPlan: "brandGrowth.report.topicLibrary",
  openclawLobsterDiary: "brandGrowth.report.topicLibrary",
  openclawStrategyOptimization: "brandGrowth.report.topicLibrary",
  openclawVideoWorks: "brandGrowth.report.topicLibrary",
};

function isDouyinOpenClawSection(sectionKey: DouyinSectionKey) {
  return sectionKey === "openclawCreativeMaterials"
    || sectionKey === "openclawDailyPlan"
    || sectionKey === "openclawLobsterDiary"
    || sectionKey === "openclawStrategyOptimization"
    || sectionKey === "openclawVideoWorks";
}

function readRequestErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

function formatFailedInterfaceNames(labels: string[]) {
  const unique = labels.filter((item, index) => item && labels.indexOf(item) === index);
  return unique.join("、");
}

function createInitialSectionLoadState(): Record<DouyinSectionKey, boolean> {
  return {
    plan: false,
    hotTopics: false,
    topicLibrary: false,
    originalCopy: false,
    remixCopy: false,
    remixShortVideo: false,
    video: false,
    videoDirect: false,
    digitalHuman: false,
    runningHub: false,
    adPreAudit: false,
    openclawCreativeMaterials: false,
    openclawDailyPlan: false,
    openclawLobsterDiary: false,
    openclawStrategyOptimization: false,
    openclawVideoWorks: false,
  };
}

function getTaskStatusClass(status?: DouyinMarketingPlanTaskRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }
  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }
  return "status-pending";
}

function getTaskStatusText(task?: DouyinMarketingPlanTaskRecord) {
  if (!task) {
    return "暂无任务";
  }
  if (task.taskStatus === "SUCCESS") {
    return "已完成";
  }
  if (task.taskStatus === "RUNNING") {
    return "生成中";
  }
  if (task.taskStatus === "QUEUED" || task.taskStatus === "PENDING") {
    return "排队中";
  }
  if (task.taskStatus === "FAILED") {
    return "失败";
  }
  if (task.taskStatus === "CANCELLED") {
    return "已取消";
  }
  return task.taskStatus;
}

export function DouyinWorkspaceShell(props: DouyinWorkspaceShellProps) {
  const debugBundleMarker = "douyin-workspace-false-502-a8a51d5";
  const activeBrandId = useMemo(() => getStoredCurrentBrandId(DEMO_BRAND_ID) || DEMO_BRAND_ID, []);
  const [isLoading, setIsLoading] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [hasLoadedSharedWorkspace, setHasLoadedSharedWorkspace] = useState(false);
  const [hasLoadedDigitalHumanEditorResources, setHasLoadedDigitalHumanEditorResources] = useState(false);
  const [loadedSections, setLoadedSections] = useState<Record<DouyinSectionKey, boolean>>(() => createInitialSectionLoadState());
  const [activeSection, setActiveSection] = useState<DouyinSectionKey>(props.forcedSection || "plan");
  const activeSectionRef = useRef<DouyinSectionKey>(props.forcedSection || "plan");
  const digitalHumanEditorResourcesPromiseRef = useRef<Promise<void> | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [brandArchive, setBrandArchive] = useState<BrandArchiveBundle>(brandArchiveSeed);
  const [brandPermissionSettings, setBrandPermissionSettings] = useState<BrandPermissionSettingsRecord | null>(null);
  const brandPermissionSettingsRef = useRef<BrandPermissionSettingsRecord | null>(null);
  const [collectionWorkspace, setCollectionWorkspace] = useState<DouyinCollectionWorkspace>(douyinCollectionSeed);
  const collectionWorkspaceRef = useRef<DouyinCollectionWorkspace>(douyinCollectionSeed);
  const [xhsCollectionWorkspace, setXhsCollectionWorkspace] = useState<XhsCollectionWorkspace>(xhsCollectionSeed);
  const xhsCollectionWorkspaceRef = useRef<XhsCollectionWorkspace>(xhsCollectionSeed);
  const [growthReportWorkspace, setGrowthReportWorkspace] = useState(growthReportSeed);
  const growthReportWorkspaceRef = useRef(growthReportSeed);
  const [annualPlanWorkspace, setAnnualPlanWorkspace] = useState(annualMarketingPlanSeed);
  const annualPlanWorkspaceRef = useRef(annualMarketingPlanSeed);
  const [opportunityInsightWorkspace, setOpportunityInsightWorkspace] = useState(opportunityInsightSeed);
  const opportunityInsightWorkspaceRef = useRef(opportunityInsightSeed);
  const [marketingPlanWorkspace, setMarketingPlanWorkspace] = useState<DouyinMarketingPlanWorkspace>(douyinMarketingPlanSeed);
  const [hotTopicWorkspace, setHotTopicWorkspace] = useState<DouyinHotTopicCandidatesWorkspace>(douyinHotTopicCandidatesSeed);
  const [originalCopyWorkspace, setOriginalCopyWorkspace] = useState<DouyinOriginalCopyWorkspace>(douyinOriginalCopySeed);
  const [remixCopyWorkspace, setRemixCopyWorkspace] = useState<DouyinRemixCopyWorkspace>(douyinRemixCopySeed);
  const [remixShortVideoWorks, setRemixShortVideoWorks] = useState<DouyinRemixShortVideoWorkRecord[]>([]);
  const [videoWorks, setVideoWorks] = useState<DouyinVideoWorkRecord[]>([]);
  const [videoProviderOptions, setVideoProviderOptions] = useState<VideoProviderOptionRecord[]>([]);
  const [storyboardImageModelOptions, setStoryboardImageModelOptions] = useState<StoryboardImageModelOptionRecord[]>([]);
  const [directVideoWorks, setDirectVideoWorks] = useState<DouyinDirectVideoWorkRecord[]>([]);
  const [directVideoProviderOptions, setDirectVideoProviderOptions] = useState<VideoProviderOptionRecord[]>([]);
  const [digitalHumanWorks, setDigitalHumanWorks] = useState<DouyinDigitalHumanVideoWorkRecord[]>([]);
  const [openClawCreativeMaterialWorkspace, setOpenClawCreativeMaterialWorkspace] = useState<OpenClawCreativeMaterialWorkspaceRecord>({ items: [], total: 0 });
  const [openClawDailyPlanWorkspace, setOpenClawDailyPlanWorkspace] = useState<OpenClawDailyPlanWorkspaceRecord>({ items: [], total: 0 });
  const [openClawLobsterDiaryWorkspace, setOpenClawLobsterDiaryWorkspace] = useState<OpenClawLobsterDiaryWorkspaceRecord>({ items: [], total: 0 });
  const [openClawStrategyOptimizationWorkspace, setOpenClawStrategyOptimizationWorkspace] =
    useState<OpenClawStrategyOptimizationWorkspaceRecord>({ items: [], total: 0 });
  const [openClawVideoWorkWorkspace, setOpenClawVideoWorkWorkspace] = useState<OpenClawVideoWorkWorkspaceRecord>({ items: [], total: 0 });
  const [adPreAuditWorks, setAdPreAuditWorks] = useState<DouyinAdPreAuditRecord[]>([]);
  const [adPreAuditConfig, setAdPreAuditConfig] = useState<DouyinAdPreAuditConfigRecord>({
    brandId: activeBrandId,
    defaultBusinessType: "ad",
    updatedAt: "",
  });
  const [adPreAuditMediaAssets, setAdPreAuditMediaAssets] = useState<DouyinAdPreAuditMediaAssetRecord[]>([]);
  const [digitalHumanCustomPersons, setDigitalHumanCustomPersons] = useState<DouyinDigitalHumanCustomPersonRecord[]>([]);
  const [digitalHumanLipSyncWorks, setDigitalHumanLipSyncWorks] = useState<DouyinLipSyncWorkRecord[]>([]);
  const [digitalHumanTemplates, setDigitalHumanTemplates] = useState<DigitalHumanTemplateRecord[]>([]);
  const [digitalHumanTemplateTags, setDigitalHumanTemplateTags] = useState<DigitalHumanTemplateTagGroupRecord[]>([]);
  const [digitalHumanFavoriteTemplates, setDigitalHumanFavoriteTemplates] = useState<DouyinDigitalHumanFavoriteTemplateRecord[]>([]);
  const [digitalHumanScriptTemplates, setDigitalHumanScriptTemplates] = useState<DouyinDigitalHumanScriptTemplateRecord[]>([]);
  const [digitalHumanPublicVoices, setDigitalHumanPublicVoices] = useState<DouyinVoiceLibraryRecord[]>([]);
  const [digitalHumanCustomVoices, setDigitalHumanCustomVoices] = useState<DouyinCustomVoiceRecord[]>([]);
  const [digitalHumanPublicVoicePageInfo, setDigitalHumanPublicVoicePageInfo] = useState<VoiceLibraryPageInfo | undefined>(undefined);
  const [digitalHumanCustomVoicePageInfo, setDigitalHumanCustomVoicePageInfo] = useState<VoiceLibraryPageInfo | undefined>(undefined);
  const [digitalHumanPublicVoiceError, setDigitalHumanPublicVoiceError] = useState("");
  const [digitalHumanCustomVoiceError, setDigitalHumanCustomVoiceError] = useState("");
  const [digitalHumanCurrentSpeechTask, setDigitalHumanCurrentSpeechTask] = useState<DouyinSpeechTaskRecord | null>(null);
  const [digitalHumanCurrentSpeechTaskId, setDigitalHumanCurrentSpeechTaskId] = useState("");
  const [digitalHumanTemplatePageInfo, setDigitalHumanTemplatePageInfo] = useState<DigitalHumanTemplatePageInfo | undefined>(undefined);
  const [digitalHumanTemplateTagId, setDigitalHumanTemplateTagId] = useState("");
  const [digitalHumanTemplateError, setDigitalHumanTemplateError] = useState("");
  const [digitalHumanTemplateTagError, setDigitalHumanTemplateTagError] = useState("");
  const [isDigitalHumanTemplateLoading, setIsDigitalHumanTemplateLoading] = useState(false);
  const [marketingPlanDraft, setMarketingPlanDraft] = useState("");
  const [isMarketingPlanGenerateDialogOpen, setIsMarketingPlanGenerateDialogOpen] = useState(false);
  const [marketingPlanUserRequirement, setMarketingPlanUserRequirement] = useState("");
  const [selectedHotTopicDate, setSelectedHotTopicDate] = useState("");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingHotTopics, setIsGeneratingHotTopics] = useState(false);
  const [isSubmittingOriginalCopy, setIsSubmittingOriginalCopy] = useState(false);
  const [isSubmittingRemixCopy, setIsSubmittingRemixCopy] = useState(false);
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);
  const [isSubmittingDirectVideo, setIsSubmittingDirectVideo] = useState(false);
  const [isSubmittingDigitalHuman, setIsSubmittingDigitalHuman] = useState(false);
  const [isSubmittingAdPreAudit, setIsSubmittingAdPreAudit] = useState(false);
  const [isSavingTopicLibrary, setIsSavingTopicLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingOpenClawCreativeMaterialId, setDeletingOpenClawCreativeMaterialId] = useState("");
  const [deletingOpenClawDailyPlanId, setDeletingOpenClawDailyPlanId] = useState("");
  const [deletingOpenClawDiaryId, setDeletingOpenClawDiaryId] = useState("");
  const [updatingOpenClawDiaryId, setUpdatingOpenClawDiaryId] = useState("");
  const [deletingOpenClawStrategyOptimizationId, setDeletingOpenClawStrategyOptimizationId] = useState("");
  const [updatingOpenClawStrategyOptimizationId, setUpdatingOpenClawStrategyOptimizationId] = useState("");
  const [deletingOpenClawVideoWorkId, setDeletingOpenClawVideoWorkId] = useState("");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [materialPreviewIndexMap, setMaterialPreviewIndexMap] = useState<Record<string, number>>({});
  const [materialLightbox, setMaterialLightbox] = useState<MediaLightboxState | null>(null);

  const latestMarketingPlan = marketingPlanWorkspace.latest;
  const latestTask = marketingPlanWorkspace.latestTask;
  const isTaskActive = latestTask?.taskStatus === "RUNNING" || latestTask?.taskStatus === "QUEUED" || latestTask?.taskStatus === "PENDING";
  const latestHotTopicResult = hotTopicWorkspace.latest;
  const latestHotTopicTask = hotTopicWorkspace.latestTask;
  const isHotTopicTaskActive =
    latestHotTopicTask?.taskStatus === "RUNNING"
    || latestHotTopicTask?.taskStatus === "QUEUED"
    || latestHotTopicTask?.taskStatus === "PENDING";
  const latestOriginalCopyTask = originalCopyWorkspace.latestTask;
  const isOriginalCopyTaskActive =
    latestOriginalCopyTask?.taskStatus === "RUNNING"
    || latestOriginalCopyTask?.taskStatus === "QUEUED"
    || latestOriginalCopyTask?.taskStatus === "PENDING";
  const latestRemixCopyTask = remixCopyWorkspace.latestTask;
  const isRemixCopyTaskActive =
    latestRemixCopyTask?.taskStatus === "RUNNING"
    || latestRemixCopyTask?.taskStatus === "QUEUED"
    || latestRemixCopyTask?.taskStatus === "PENDING";
  const isRemixShortVideoTaskActive = remixShortVideoWorks.some((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED" || item.taskStatus === "PENDING");
  const isVideoTaskActive = videoWorks.some((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED" || item.taskStatus === "PENDING");
  const isDirectVideoTaskActive = directVideoWorks.some((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED" || item.taskStatus === "PENDING");
  const isDigitalHumanTaskActive =
    digitalHumanWorks.some((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED" || item.taskStatus === "PENDING")
    || digitalHumanCustomPersons.some((item) => item.status === "PENDING" || item.status === "RUNNING")
    || digitalHumanLipSyncWorks.some((item) => item.status === "PENDING" || item.status === "RUNNING")
    || digitalHumanCustomVoices.some((item) => item.status === 1)
    || Boolean(digitalHumanCurrentSpeechTaskId && digitalHumanCurrentSpeechTask?.status !== 9 && !digitalHumanCurrentSpeechTask?.errMsg && !digitalHumanCurrentSpeechTask?.errReason);
  const isAdPreAuditTaskActive = adPreAuditWorks.some((item) =>
    item.taskStatus === "RUNNING"
    || item.taskStatus === "QUEUED"
    || item.taskStatus === "PENDING"
    || item.executionStatus === "PendingStart"
    || item.executionStatus === "Running",
  );
  const permissionMap = brandPermissionSettings?.currentUserPermissions;
  const visibleSections = useMemo(
    () =>
      brandPermissionSettings
        ? douyinSections.filter((item) => Boolean(permissionMap?.[douyinSectionPermissionMap[item.key]]?.view))
        : douyinSections,
    [brandPermissionSettings, permissionMap],
  );
  const visiblePrimarySections = useMemo(
    () => visibleSections.filter((item) => !isDouyinOpenClawSection(item.key)),
    [visibleSections],
  );
  const visibleOpenClawSections = useMemo(
    () => visibleSections.filter((item) => isDouyinOpenClawSection(item.key)),
    [visibleSections],
  );
  useEffect(() => {
    brandPermissionSettingsRef.current = brandPermissionSettings;
  }, [brandPermissionSettings]);
  useEffect(() => {
    collectionWorkspaceRef.current = collectionWorkspace;
  }, [collectionWorkspace]);
  useEffect(() => {
    xhsCollectionWorkspaceRef.current = xhsCollectionWorkspace;
  }, [xhsCollectionWorkspace]);
  useEffect(() => {
    growthReportWorkspaceRef.current = growthReportWorkspace;
  }, [growthReportWorkspace]);
  useEffect(() => {
    annualPlanWorkspaceRef.current = annualPlanWorkspace;
  }, [annualPlanWorkspace]);
  useEffect(() => {
    opportunityInsightWorkspaceRef.current = opportunityInsightWorkspace;
  }, [opportunityInsightWorkspace]);
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);
  useEffect(() => {
    if (props.forcedSection && props.forcedSection !== activeSection) {
      setActiveSection(props.forcedSection);
    }
  }, [activeSection, props.forcedSection]);
  useEffect(() => {
    setHasLoadedSharedWorkspace(false);
    setHasLoadedDigitalHumanEditorResources(false);
    digitalHumanEditorResourcesPromiseRef.current = null;
    setLoadedSections(createInitialSectionLoadState());
    setLoadState("loading");
    setDigitalHumanTemplates([]);
    setDigitalHumanTemplateTags([]);
    setDigitalHumanFavoriteTemplates([]);
    setDigitalHumanScriptTemplates([]);
    setDigitalHumanPublicVoices([]);
    setDigitalHumanCustomVoices([]);
    setDigitalHumanPublicVoicePageInfo(undefined);
    setDigitalHumanCustomVoicePageInfo(undefined);
    setDigitalHumanPublicVoiceError("");
    setDigitalHumanCustomVoiceError("");
    setDigitalHumanCurrentSpeechTask(null);
    setDigitalHumanCurrentSpeechTaskId("");
    setDigitalHumanTemplatePageInfo(undefined);
    setDigitalHumanTemplateTagId("");
    setDigitalHumanTemplateError("");
    setDigitalHumanTemplateTagError("");
  }, [activeBrandId]);
  const hasWorkspaceAccess = visibleSections.length > 0;
  const canEditMarketingPlan = brandPermissionSettings ? (permissionMap?.["douyin.plan"]?.edit ?? false) : true;
  const canEditHotTopics = brandPermissionSettings ? (permissionMap?.["brandGrowth.report.topicLibrary"]?.edit ?? false) : true;
  const canEditTopicLibrary = brandPermissionSettings ? (permissionMap?.["brandGrowth.report.topicLibrary"]?.edit ?? false) : true;
  const canViewTopicLibrary = brandPermissionSettings ? (permissionMap?.["brandGrowth.report.topicLibrary"]?.view ?? false) : true;
  const canEditOriginalCopy = brandPermissionSettings ? (permissionMap?.["douyin.original"]?.edit ?? false) : true;
  const canEditRemixCopy = brandPermissionSettings ? (permissionMap?.["douyin.remix"]?.edit ?? false) : true;
  const canEditRemixShortVideo = brandPermissionSettings ? (permissionMap?.["douyin.remixShortVideo"]?.edit ?? false) : true;
  const canEditVideo = brandPermissionSettings ? (permissionMap?.["douyin.video"]?.edit ?? false) : true;
  const canEditDirectVideo = brandPermissionSettings ? (permissionMap?.["douyin.videoDirect"]?.edit ?? false) : true;
  const canEditDigitalHuman = brandPermissionSettings ? (permissionMap?.["douyin.digitalHuman"]?.edit ?? false) : true;
  const canEditAdPreAudit = brandPermissionSettings ? (permissionMap?.["douyin.adPreAudit"]?.edit ?? false) : true;
  const defaultDouyinAccountId = useMemo(
    () => brandArchive.platformAccounts.find((item) => item.platform === "DOUYIN")?.id || "",
    [brandArchive.platformAccounts],
  );
  const canEditCurrentSection = brandPermissionSettings
    ? Boolean(permissionMap?.[douyinSectionPermissionMap[activeSection]]?.edit)
    : true;
  const unifiedMaterialLibraryItems = useMemo(
    () => buildUnifiedMaterialLibraryItems(xhsCollectionWorkspace, collectionWorkspace),
    [collectionWorkspace, xhsCollectionWorkspace],
  );
  const unifiedMaterialOptions = useMemo(
    () => buildUnifiedMaterialOptions(xhsCollectionWorkspace, collectionWorkspace),
    [collectionWorkspace, xhsCollectionWorkspace],
  );
  const materialLibraryItems = useMemo(
    () => {
      const collectedItems = unifiedMaterialLibraryItems
        .filter((item) => item.videoUrl)
        .map((item) => ({
        id: `collected:${item.id}`,
        label: `[${item.platformLabel}] ${item.title}`,
        videoUrl: item.videoUrl,
        coverUrl: item.coverUrl,
        workUrl: item.detailUrl,
        sourceLabel: `${item.platformLabel}采集素材`,
      }));
      const generatedVideoItems = videoWorks
        .filter((item) => item.videoUrl || item.coverImageUrl)
        .map((item) => ({
          id: `video:${item.id}`,
          label: item.title,
          videoUrl: item.videoUrl,
          coverUrl: item.coverImageUrl,
          workUrl: item.videoUrl,
          sourceLabel: "AI 生视频",
        }));
      const generatedDirectVideoItems = directVideoWorks
        .filter((item) => item.videoUrl || item.coverImageUrl)
        .map((item) => ({
          id: `direct-video:${item.id}`,
          label: item.title,
          videoUrl: item.videoUrl,
          coverUrl: item.coverImageUrl,
          workUrl: item.videoUrl,
          sourceLabel: "AI 生视频直出",
        }));
      const generatedDigitalHumanItems = digitalHumanWorks
        .filter((item) => item.videoUrl || item.coverImageUrl)
        .map((item) => ({
          id: `digital-human:${item.id}`,
          label: item.title,
          videoUrl: item.videoUrl,
          coverUrl: item.coverImageUrl,
          workUrl: item.videoUrl,
          sourceLabel: "数字人作品",
        }));
      const generatedLipSyncItems = digitalHumanLipSyncWorks
        .filter((item) => item.videoUrl || item.coverImageUrl)
        .map((item) => ({
          id: `lip-sync:${item.id}`,
          label: item.title,
          videoUrl: item.videoUrl,
          coverUrl: item.coverImageUrl,
          workUrl: item.videoUrl,
          sourceLabel: "口型驱动作品",
        }));
      return [
        ...collectedItems,
        ...generatedVideoItems,
        ...generatedDirectVideoItems,
        ...generatedDigitalHumanItems,
        ...generatedLipSyncItems,
      ];
    },
    [digitalHumanLipSyncWorks, digitalHumanWorks, directVideoWorks, unifiedMaterialLibraryItems, videoWorks],
  );
  const hasMarketingPlanBrandBackground = Boolean(
    brandArchive.brand.brandName?.trim()
    || brandArchive.brand.brandDescription?.trim()
    || brandArchive.brand.enterpriseIntro?.trim(),
  );
  const hasMarketingPlanProductLibrary = brandArchive.products.length > 0;
  const canGenerateMarketingPlan = Boolean(
    growthReportWorkspace.latest
    && opportunityInsightWorkspace.finalOpportunityReport?.htmlDocument?.trim()
    && hasMarketingPlanBrandBackground
    && hasMarketingPlanProductLibrary,
  );
  const currentSection = visibleSections.find((item) => item.key === activeSection) ?? visibleSections[0] ?? douyinSections[0];
  const heroTitle =
    isDouyinOpenClawSection(activeSection)
      ? "OpenClaw板块"
      : "抖音工作台";
  const heroDescription =
    activeSection === "openclawCreativeMaterials"
      ? "当前展示由 OpenClaw 调用站内第三方平台能力后保存的创作素材，支持查看预览与删除。"
      : activeSection === "openclawDailyPlan"
      ? "当前展示由 OpenClaw Agent 在抖音板块下创建的每日计划记录，可只读查看并手动删除。"
      : activeSection === "openclawLobsterDiary"
        ? "当前展示由 OpenClaw Agent 在抖音板块下创建的每周复盘记录，点击查看后可直接编辑并在下方留言。"
        : activeSection === "openclawStrategyOptimization"
          ? "当前展示由 OpenClaw 在抖音板块下根据每周复盘生成的策略优化记录，支持查看、编辑、留言和删除。"
        : activeSection === "openclawVideoWorks"
          ? "当前展示由 OpenClaw 最终整合生成的视频作品，支持查看、删除，并接入抖音与视频号发布插件。"
        : "当前开放营销策划方案、选题库、原创文案、二创文案、AI 生视频（故事板）、AI 生视频、数字人和广告预审，可直接复用品牌增长策略里沉淀的统一素材库、每日热点与品牌资料。";
  const videoMarketingPlanTitle = marketingPlanWorkspace.latest?.title || originalCopyWorkspace.marketingPlanTitle || remixCopyWorkspace.marketingPlanTitle;
  const hasVideoMarketingPlan = Boolean(marketingPlanWorkspace.latest || originalCopyWorkspace.hasMarketingPlan || remixCopyWorkspace.hasMarketingPlan);

  const marketingPlanPreviewHtml = useMemo(
    () => renderMarkdownToHtml(marketingPlanDraft || latestMarketingPlan?.reportMarkdown || ""),
    [latestMarketingPlan?.reportMarkdown, marketingPlanDraft],
  );

  const refreshMarketingPlanWorkspace = useCallback(async () => {
    const nextWorkspace = await getDouyinMarketingPlanWorkspace(activeBrandId);
    setMarketingPlanWorkspace(nextWorkspace);
    return nextWorkspace;
  }, [activeBrandId]);

  const refreshHotTopicWorkspace = useCallback(async (date?: string) => {
    const nextWorkspace = await getDouyinHotTopicCandidatesWorkspace(activeBrandId, date || selectedHotTopicDate || undefined);
    setHotTopicWorkspace(nextWorkspace);
    return nextWorkspace;
  }, [activeBrandId, selectedHotTopicDate]);

  const refreshOriginalCopyWorkspace = useCallback(async () => {
    const nextWorkspace = await getDouyinOriginalCopyWorkspace(activeBrandId);
    setOriginalCopyWorkspace(nextWorkspace);
    return nextWorkspace;
  }, [activeBrandId]);

  const refreshRemixCopyWorkspace = useCallback(async () => {
    const nextWorkspace = await getDouyinRemixCopyWorkspace(activeBrandId);
    setRemixCopyWorkspace(nextWorkspace);
    return nextWorkspace;
  }, [activeBrandId]);

  const refreshVideoWorkspace = useCallback(async () => {
    const [items, providers, storyboardModels] = await Promise.all([
      getDouyinVideoWorks(activeBrandId),
      getDouyinVideoProviders(activeBrandId),
      getDouyinVideoStoryboardImageProviders(activeBrandId),
    ]);
    setVideoWorks(items.items || []);
    setVideoProviderOptions(providers.items || []);
    setStoryboardImageModelOptions(storyboardModels.items || []);
    return items.items || [];
  }, [activeBrandId]);

  const refreshRemixShortVideoWorkspace = useCallback(async () => {
    const items = await getDouyinRemixShortVideoWorks(activeBrandId);
    setRemixShortVideoWorks(items.items || []);
    return items.items || [];
  }, [activeBrandId]);

  const refreshDirectVideoWorkspace = useCallback(async () => {
    const [items, providers] = await Promise.all([
      getDouyinDirectVideoWorks(activeBrandId),
      getDouyinDirectVideoProviders(activeBrandId),
    ]);
    setDirectVideoWorks(items.items || []);
    setDirectVideoProviderOptions(providers.items || []);
    return items.items || [];
  }, [activeBrandId]);

  const refreshAdPreAuditWorkspace = useCallback(async () => {
    const [worksResponse, configResponse, mediaResponse] = await Promise.all([
      getDouyinAdPreAuditWorks(activeBrandId),
      getDouyinAdPreAuditConfig(activeBrandId),
      getDouyinAdPreAuditMediaAssets(activeBrandId),
    ]);
    setAdPreAuditWorks(worksResponse.items || []);
    setAdPreAuditConfig(
      configResponse.item || {
        brandId: activeBrandId,
        defaultBusinessType: "ad",
        updatedAt: "",
      },
    );
    setAdPreAuditMediaAssets(mediaResponse.items || []);
    return worksResponse.items || [];
  }, [activeBrandId]);

  const refreshDigitalHumanPublicVoices = useCallback(async (page = 1) => {
    const response = await getDouyinVoiceLibrary(activeBrandId, {
      page,
      size: digitalHumanPublicVoicePageInfo?.size || 24,
    });
    setDigitalHumanPublicVoices(response.list || []);
    setDigitalHumanPublicVoicePageInfo(response.pageInfo);
    setDigitalHumanPublicVoiceError("");
    return response.list || [];
  }, [activeBrandId, digitalHumanPublicVoicePageInfo?.size]);

  const refreshDigitalHumanCustomVoices = useCallback(async (page = 1) => {
    const response = await getDouyinCustomVoices(activeBrandId, {
      page,
      pageSize: digitalHumanCustomVoicePageInfo?.size || 24,
    });
    setDigitalHumanCustomVoices(response.list || []);
    setDigitalHumanCustomVoicePageInfo(response.pageInfo);
    setDigitalHumanCustomVoiceError("");
    return response.list || [];
  }, [activeBrandId, digitalHumanCustomVoicePageInfo?.size]);

  const refreshDigitalHumanSpeechTask = useCallback(async (taskId?: string) => {
    const targetTaskId = String(taskId || digitalHumanCurrentSpeechTaskId || "").trim();
    if (!targetTaskId) {
      return null;
    }
    const response = await getDouyinSpeechTaskDetail(activeBrandId, targetTaskId);
    setDigitalHumanCurrentSpeechTaskId(targetTaskId);
    setDigitalHumanCurrentSpeechTask(response.item || null);
    return response.item || null;
  }, [activeBrandId, digitalHumanCurrentSpeechTaskId]);

  const ensureDigitalHumanEditorResources = useCallback(async (force = false) => {
    if (digitalHumanEditorResourcesPromiseRef.current) {
      return digitalHumanEditorResourcesPromiseRef.current;
    }
    if (hasLoadedDigitalHumanEditorResources && !force) {
      return;
    }

    const task = (async () => {
      const [templates, tagGroups, favorites, scriptTemplates, publicVoices, customVoices, speechTask] = await Promise.allSettled([
        getDouyinDigitalHumanTemplates(activeBrandId, {
          page: 1,
          size: digitalHumanTemplatePageInfo?.size || 24,
          sort: "hottest",
          tagIds: digitalHumanTemplateTagId ? [Number(digitalHumanTemplateTagId)] : [],
        }),
        getDouyinDigitalHumanTemplateTags(activeBrandId),
        getDouyinDigitalHumanFavoriteTemplates(activeBrandId),
        getDouyinDigitalHumanScriptTemplates(activeBrandId),
        getDouyinVoiceLibrary(activeBrandId, {
          page: digitalHumanPublicVoicePageInfo?.page || 1,
          size: digitalHumanPublicVoicePageInfo?.size || 24,
        }),
        getDouyinCustomVoices(activeBrandId, {
          page: digitalHumanCustomVoicePageInfo?.page || 1,
          pageSize: digitalHumanCustomVoicePageInfo?.size || 24,
        }),
        digitalHumanCurrentSpeechTaskId
          ? getDouyinSpeechTaskDetail(activeBrandId, digitalHumanCurrentSpeechTaskId)
          : Promise.resolve({ item: digitalHumanCurrentSpeechTask || null }),
      ]);

      if (templates.status === "fulfilled") {
        setDigitalHumanTemplates(templates.value.list || []);
        setDigitalHumanTemplatePageInfo(templates.value.pageInfo);
        setDigitalHumanTemplateError("");
      } else {
        setDigitalHumanTemplates([]);
        setDigitalHumanTemplatePageInfo(undefined);
        setDigitalHumanTemplateError(readRequestErrorMessage(templates.reason, "数字人模板读取失败，请检查蝉镜配置或稍后重试。"));
      }

      if (tagGroups.status === "fulfilled") {
        setDigitalHumanTemplateTags(tagGroups.value.list || []);
        setDigitalHumanTemplateTagError("");
      } else {
        setDigitalHumanTemplateTags([]);
        setDigitalHumanTemplateTagError(readRequestErrorMessage(tagGroups.reason, "数字人模板标签读取失败，请检查蝉镜配置或稍后重试。"));
      }

      if (favorites.status === "fulfilled") {
        setDigitalHumanFavoriteTemplates(favorites.value.items || []);
      } else {
        setDigitalHumanFavoriteTemplates([]);
      }

      if (scriptTemplates.status === "fulfilled") {
        setDigitalHumanScriptTemplates(scriptTemplates.value.items || []);
      } else {
        setDigitalHumanScriptTemplates([]);
      }

      if (publicVoices.status === "fulfilled") {
        setDigitalHumanPublicVoices(publicVoices.value.list || []);
        setDigitalHumanPublicVoicePageInfo(publicVoices.value.pageInfo);
        setDigitalHumanPublicVoiceError("");
      } else {
        setDigitalHumanPublicVoices([]);
        setDigitalHumanPublicVoicePageInfo(undefined);
        setDigitalHumanPublicVoiceError(readRequestErrorMessage(publicVoices.reason, "公共声音读取失败，请检查蝉镜配置或稍后重试。"));
      }

      if (customVoices.status === "fulfilled") {
        setDigitalHumanCustomVoices(customVoices.value.list || []);
        setDigitalHumanCustomVoicePageInfo(customVoices.value.pageInfo);
        setDigitalHumanCustomVoiceError("");
      } else {
        setDigitalHumanCustomVoices([]);
        setDigitalHumanCustomVoicePageInfo(undefined);
        setDigitalHumanCustomVoiceError(readRequestErrorMessage(customVoices.reason, "我的声音读取失败，请检查蝉镜配置或稍后重试。"));
      }

      if (speechTask.status === "fulfilled") {
        setDigitalHumanCurrentSpeechTask(speechTask.value.item || null);
      }

      setHasLoadedDigitalHumanEditorResources(true);
    })();

    digitalHumanEditorResourcesPromiseRef.current = task.finally(() => {
      digitalHumanEditorResourcesPromiseRef.current = null;
    });

    return digitalHumanEditorResourcesPromiseRef.current;
  }, [
    activeBrandId,
    digitalHumanCurrentSpeechTask,
    digitalHumanCurrentSpeechTaskId,
    digitalHumanCustomVoicePageInfo?.page,
    digitalHumanCustomVoicePageInfo?.size,
    digitalHumanPublicVoicePageInfo?.page,
    digitalHumanPublicVoicePageInfo?.size,
    digitalHumanTemplatePageInfo?.size,
    digitalHumanTemplateTagId,
    hasLoadedDigitalHumanEditorResources,
  ]);

  const loadDigitalHumanTemplates = useCallback(async (
    options?: {
      page?: number;
      size?: number;
      tagId?: string;
    },
    append?: boolean,
  ) => {
    const nextPage = Math.max(1, options?.page || 1);
    const nextSize = Math.max(1, options?.size || digitalHumanTemplatePageInfo?.size || 24);
    const nextTagId = options?.tagId ?? digitalHumanTemplateTagId;
    setIsDigitalHumanTemplateLoading(true);
    try {
      const templates = await getDouyinDigitalHumanTemplates(activeBrandId, {
        page: nextPage,
        size: nextSize,
        sort: "hottest",
        tagIds: nextTagId ? [Number(nextTagId)] : [],
      });
      setDigitalHumanTemplateTagId(nextTagId);
      setDigitalHumanTemplatePageInfo(templates.pageInfo);
      setDigitalHumanTemplateError("");
      setDigitalHumanTemplates((current) => {
        if (!append) {
          return templates.list || [];
        }
        const merged = [...current, ...(templates.list || [])];
        return merged.filter((item, index) => merged.findIndex((entry) => entry.id === item.id) === index);
      });
      return templates.list || [];
    } catch (error) {
      // #region debug-point E:digital-human-template-ui-error
      postRuntimeDebugEvent({
        sessionId: "digital-human-502-list",
        runId: "pre-fix",
        hypothesisId: "E",
        location: "apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx:loadDigitalHumanTemplates",
        msg: "[DEBUG] 数字人模板错误写入 UI 状态",
        data: {
          brandId: activeBrandId,
          page: nextPage,
          size: nextSize,
          tagId: nextTagId,
          message: error instanceof Error ? error.message : String(error),
        },
        ts: Date.now(),
      });
      // #endregion
      setDigitalHumanTemplateError(readRequestErrorMessage(error, "数字人模板读取失败，请检查蝉镜配置或稍后重试。"));
      throw error;
    } finally {
      setIsDigitalHumanTemplateLoading(false);
    }
  }, [activeBrandId, digitalHumanTemplatePageInfo?.size, digitalHumanTemplateTagId]);

  const refreshDigitalHumanWorkspace = useCallback(async () => {
    const [items, customPersons, lipSyncWorks] = await Promise.allSettled([
      getDouyinDigitalHumanVideoWorks(activeBrandId),
      getDouyinDigitalHumanCustomPersons(activeBrandId),
      getDouyinLipSyncWorks(activeBrandId),
    ]);
    if (items.status === "fulfilled") {
      setDigitalHumanWorks(items.value.items || []);
    } else {
      setDigitalHumanWorks([]);
    }
    if (customPersons.status === "fulfilled") {
      setDigitalHumanCustomPersons(customPersons.value.items || []);
    } else {
      setDigitalHumanCustomPersons([]);
    }
    if (lipSyncWorks.status === "fulfilled") {
      setDigitalHumanLipSyncWorks(lipSyncWorks.value.items || []);
    } else {
      setDigitalHumanLipSyncWorks([]);
    }
    await ensureDigitalHumanEditorResources(true);
    return items.status === "fulfilled" ? (items.value.items || []) : [];
  }, [activeBrandId, ensureDigitalHumanEditorResources]);
  const activeWorkspacePollers = useMemo(
    (): Array<{ key: string; run: () => Promise<unknown> }> => {
      const pollers: Array<{ key: string; run: () => Promise<unknown> }> = [];
      if (isTaskActive) {
        pollers.push({ key: "marketingPlan", run: () => refreshMarketingPlanWorkspace() });
      }
      if (isHotTopicTaskActive) {
        pollers.push({ key: "hotTopic", run: () => refreshHotTopicWorkspace(selectedHotTopicDate) });
      }
      if (isOriginalCopyTaskActive) {
        pollers.push({ key: "originalCopy", run: () => refreshOriginalCopyWorkspace() });
      }
      if (isRemixCopyTaskActive) {
        pollers.push({ key: "remixCopy", run: () => refreshRemixCopyWorkspace() });
      }
      if (isRemixShortVideoTaskActive) {
        pollers.push({ key: "remixShortVideo", run: () => refreshRemixShortVideoWorkspace() });
      }
      if (isVideoTaskActive) {
        pollers.push({ key: "video", run: () => refreshVideoWorkspace() });
      }
      if (isDirectVideoTaskActive) {
        pollers.push({ key: "directVideo", run: () => refreshDirectVideoWorkspace() });
      }
      if (isAdPreAuditTaskActive) {
        pollers.push({ key: "adPreAudit", run: () => refreshAdPreAuditWorkspace() });
      }
      if (isDigitalHumanTaskActive) {
        pollers.push({ key: "digitalHuman", run: () => refreshDigitalHumanWorkspace() });
      }
      return pollers;
    },
    [
      isAdPreAuditTaskActive,
      isDigitalHumanTaskActive,
      isDirectVideoTaskActive,
      isHotTopicTaskActive,
      isOriginalCopyTaskActive,
      isRemixCopyTaskActive,
      isRemixShortVideoTaskActive,
      isTaskActive,
      isVideoTaskActive,
      refreshAdPreAuditWorkspace,
      refreshDigitalHumanWorkspace,
      refreshDirectVideoWorkspace,
      refreshHotTopicWorkspace,
      refreshMarketingPlanWorkspace,
      refreshOriginalCopyWorkspace,
      refreshRemixCopyWorkspace,
      refreshRemixShortVideoWorkspace,
      refreshVideoWorkspace,
      selectedHotTopicDate,
    ],
  );
  const hasActiveWorkspacePolling = activeWorkspacePollers.length > 0;

  const loadWorkspace = useCallback(async (
    sectionKey?: DouyinSectionKey,
    options?: {
      forceShared?: boolean;
    },
  ) => {
    const currentSectionKey = sectionKey || activeSectionRef.current;
    const shouldLoadSharedWorkspace = options?.forceShared || !hasLoadedSharedWorkspace;
    setIsLoading(true);
    setErrorMessage("");
    setNotice("");
    const failedInterfaceNames: string[] = [];
    const currentSectionFailedInterfaceNames: string[] = [];

    const [permissionResult, collectionResult, xhsCollectionResult] = await Promise.allSettled([
      shouldLoadSharedWorkspace ? getBrandPermissionSettings(activeBrandId) : Promise.resolve(brandPermissionSettingsRef.current),
      shouldLoadSharedWorkspace ? getDouyinCollectionWorkspace(activeBrandId) : Promise.resolve(collectionWorkspaceRef.current),
      shouldLoadSharedWorkspace ? getXiaohongshuCollectionWorkspace(activeBrandId) : Promise.resolve(xhsCollectionWorkspaceRef.current),
    ]);
    const sharedWorkspaceLoadedSuccessfully =
      !shouldLoadSharedWorkspace
      || (
        permissionResult.status === "fulfilled"
        && collectionResult.status === "fulfilled"
        && xhsCollectionResult.status === "fulfilled"
      );

    let hasFallback = false;
    const resolvedPermissionSettings =
      permissionResult.status === "fulfilled"
        ? permissionResult.value
        : brandPermissionSettingsRef.current;
    if (shouldLoadSharedWorkspace) {
      if (permissionResult.status === "fulfilled") {
        setBrandPermissionSettings(permissionResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("品牌权限设置");
        setBrandPermissionSettings(null);
      }
    }

    const canViewSection = (sectionKey: DouyinSectionKey) =>
      !resolvedPermissionSettings || Boolean(resolvedPermissionSettings.currentUserPermissions?.[douyinSectionPermissionMap[sectionKey]]?.view);

    const shouldLoadPlanWorkspace = currentSectionKey === "plan" && canViewSection("plan");
    const shouldLoadPlanContext = currentSectionKey === "plan" && canViewSection("plan");
    const shouldLoadHotTopicWorkspace =
      (currentSectionKey === "hotTopics" || currentSectionKey === "topicLibrary" || currentSectionKey === "originalCopy")
      && (canViewSection("hotTopics") || canViewSection("topicLibrary"));
    const shouldLoadOriginalCopyWorkspace =
      (currentSectionKey === "originalCopy" && canViewSection("originalCopy"))
      || (currentSectionKey === "video" && canViewSection("video"))
      || (currentSectionKey === "videoDirect" && canViewSection("videoDirect"))
      || (currentSectionKey === "digitalHuman" && canViewSection("digitalHuman"));
    const shouldLoadRemixCopyWorkspace =
      (currentSectionKey === "remixCopy" && canViewSection("remixCopy"))
      || (currentSectionKey === "remixShortVideo" && canViewSection("remixShortVideo"))
      || (currentSectionKey === "video" && canViewSection("video"))
      || (currentSectionKey === "videoDirect" && canViewSection("videoDirect"))
      || (currentSectionKey === "digitalHuman" && canViewSection("digitalHuman"));
    const shouldLoadRemixShortVideoWorkspace = currentSectionKey === "remixShortVideo" && canViewSection("remixShortVideo");
    const shouldLoadVideoWorkspace =
      (currentSectionKey === "video" && canViewSection("video"))
      || (currentSectionKey === "runningHub" && canViewSection("video"));
    const shouldLoadVideoSupportOptions =
      (currentSectionKey === "video" && canViewSection("video"))
      || (currentSectionKey === "remixShortVideo" && canViewSection("remixShortVideo"));
    const shouldLoadDirectVideoWorkspace =
      (currentSectionKey === "videoDirect" && canViewSection("videoDirect"))
      || (currentSectionKey === "runningHub" && canViewSection("videoDirect"));
    const shouldLoadDigitalHumanWorks =
      (currentSectionKey === "digitalHuman" && canViewSection("digitalHuman"))
      || (currentSectionKey === "runningHub" && canViewSection("digitalHuman"));
    const shouldLoadDigitalHumanSupportWorkspace = currentSectionKey === "digitalHuman" && canViewSection("digitalHuman");
    const shouldLoadOpenClawCreativeMaterialWorkspace = currentSectionKey === "openclawCreativeMaterials" && canViewSection("openclawCreativeMaterials");
    const shouldLoadOpenClawDailyPlanWorkspace = currentSectionKey === "openclawDailyPlan" && canViewSection("openclawDailyPlan");
    const shouldLoadOpenClawLobsterDiaryWorkspace = currentSectionKey === "openclawLobsterDiary" && canViewSection("openclawLobsterDiary");
    const shouldLoadOpenClawStrategyOptimizationWorkspace =
      currentSectionKey === "openclawStrategyOptimization" && canViewSection("openclawStrategyOptimization");
    const shouldLoadOpenClawVideoWorkWorkspace = currentSectionKey === "openclawVideoWorks" && canViewSection("openclawVideoWorks");
    const shouldLoadAdPreAuditWorkspace = currentSectionKey === "adPreAudit" && canViewSection("adPreAudit");

    const [planContextGrowthResult, planContextAnnualResult, planContextOpportunityResult, planResult, hotTopicResult, originalCopyResult, remixCopyResult, remixShortVideoResult, videoResult, videoProvidersResult, storyboardModelsResult, directVideoResult, directVideoProvidersResult, digitalHumanResult, openClawCreativeMaterialResult, openClawDailyPlanResult, openClawLobsterDiaryResult, openClawStrategyOptimizationResult, openClawVideoWorkResult, adPreAuditResult, adPreAuditConfigResult, adPreAuditMediaResult, digitalHumanCustomPersonsResult, digitalHumanLipSyncResult] = await Promise.allSettled([
      shouldLoadPlanContext ? getGrowthReportWorkspace(activeBrandId) : Promise.resolve(growthReportWorkspaceRef.current),
      shouldLoadPlanContext ? getAnnualMarketingPlanWorkspace(activeBrandId) : Promise.resolve(annualPlanWorkspaceRef.current),
      shouldLoadPlanContext ? getOpportunityInsightWorkspace(activeBrandId) : Promise.resolve(opportunityInsightWorkspaceRef.current),
      shouldLoadPlanWorkspace ? getDouyinMarketingPlanWorkspace(activeBrandId) : Promise.resolve(douyinMarketingPlanSeed),
      shouldLoadHotTopicWorkspace
        ? getDouyinHotTopicCandidatesWorkspace(activeBrandId)
        : Promise.resolve(douyinHotTopicCandidatesSeed),
      shouldLoadOriginalCopyWorkspace
        ? getDouyinOriginalCopyWorkspace(activeBrandId)
        : Promise.resolve(douyinOriginalCopySeed),
      shouldLoadRemixCopyWorkspace
        ? getDouyinRemixCopyWorkspace(activeBrandId)
        : Promise.resolve(douyinRemixCopySeed),
      shouldLoadRemixShortVideoWorkspace ? getDouyinRemixShortVideoWorks(activeBrandId) : Promise.resolve({ items: [] }),
      shouldLoadVideoWorkspace ? getDouyinVideoWorks(activeBrandId) : Promise.resolve({ items: [] }),
      shouldLoadVideoSupportOptions ? getDouyinVideoProviders(activeBrandId) : Promise.resolve({ items: [] }),
      shouldLoadVideoSupportOptions ? getDouyinVideoStoryboardImageProviders(activeBrandId) : Promise.resolve({ items: [] }),
      shouldLoadDirectVideoWorkspace ? getDouyinDirectVideoWorks(activeBrandId) : Promise.resolve({ items: [] }),
      shouldLoadDirectVideoWorkspace && currentSectionKey === "videoDirect" ? getDouyinDirectVideoProviders(activeBrandId) : Promise.resolve({ items: [] }),
      shouldLoadDigitalHumanWorks
        ? getDouyinDigitalHumanVideoWorks(activeBrandId)
        : Promise.resolve({ items: [] }),
      shouldLoadOpenClawCreativeMaterialWorkspace
        ? getOpenClawCreativeMaterialWorkspace(activeBrandId, "douyin")
        : Promise.resolve({ items: [], total: 0 }),
      shouldLoadOpenClawDailyPlanWorkspace
        ? getOpenClawDailyPlanWorkspace(activeBrandId, "douyin")
        : Promise.resolve({ items: [], total: 0 }),
      shouldLoadOpenClawLobsterDiaryWorkspace
        ? getOpenClawLobsterDiaryWorkspace(activeBrandId, "douyin")
        : Promise.resolve({ items: [], total: 0 }),
      shouldLoadOpenClawStrategyOptimizationWorkspace
        ? getOpenClawStrategyOptimizationWorkspace(activeBrandId, "douyin")
        : Promise.resolve({ items: [], total: 0 }),
      shouldLoadOpenClawVideoWorkWorkspace
        ? getOpenClawVideoWorkWorkspace(activeBrandId, "douyin")
        : Promise.resolve({ items: [], total: 0 }),
      shouldLoadAdPreAuditWorkspace
        ? getDouyinAdPreAuditWorks(activeBrandId)
        : Promise.resolve({ items: [] }),
      shouldLoadAdPreAuditWorkspace
        ? getDouyinAdPreAuditConfig(activeBrandId)
        : Promise.resolve({ item: { brandId: activeBrandId, defaultBusinessType: "ad", updatedAt: "" } }),
      shouldLoadAdPreAuditWorkspace
        ? getDouyinAdPreAuditMediaAssets(activeBrandId)
        : Promise.resolve({ items: [] }),
      shouldLoadDigitalHumanSupportWorkspace
        ? getDouyinDigitalHumanCustomPersons(activeBrandId)
        : Promise.resolve({ items: [] }),
      shouldLoadDigitalHumanSupportWorkspace
        ? getDouyinLipSyncWorks(activeBrandId)
        : Promise.resolve({ items: [] }),
    ]);

    if (shouldLoadSharedWorkspace) {
      if (collectionResult.status === "fulfilled") {
        setCollectionWorkspace(collectionResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("素材库工作台");
        setCollectionWorkspace(douyinCollectionSeed);
      }

      if (xhsCollectionResult.status === "fulfilled") {
        setXhsCollectionWorkspace(xhsCollectionResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("统一素材库（小红书侧）数据");
        setXhsCollectionWorkspace(xhsCollectionSeed);
      }

    }

    if (shouldLoadPlanContext) {
      if (planContextGrowthResult.status === "fulfilled") {
        setGrowthReportWorkspace(planContextGrowthResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("品牌增长报告");
        setGrowthReportWorkspace(growthReportSeed);
      }

      if (planContextAnnualResult.status === "fulfilled") {
        setAnnualPlanWorkspace(planContextAnnualResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("年度营销计划");
        setAnnualPlanWorkspace(annualMarketingPlanSeed);
      }

      if (planContextOpportunityResult.status === "fulfilled") {
        setOpportunityInsightWorkspace(planContextOpportunityResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("机会洞察总报告");
        setOpportunityInsightWorkspace(opportunityInsightSeed);
      }
    }

    if (shouldLoadPlanWorkspace) {
      if (planResult.status === "fulfilled") {
        setMarketingPlanWorkspace(planResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("营销策划方案");
        setMarketingPlanWorkspace(douyinMarketingPlanSeed);
      }
    }

    if (shouldLoadHotTopicWorkspace) {
      if (hotTopicResult.status === "fulfilled") {
        setHotTopicWorkspace(hotTopicResult.value);
        setSelectedHotTopicDate(hotTopicResult.value.selectedDate || hotTopicResult.value.availableDates[0] || "");
      } else {
        hasFallback = true;
        failedInterfaceNames.push("热点找选题");
        setHotTopicWorkspace(douyinHotTopicCandidatesSeed);
        setSelectedHotTopicDate("");
      }
    }

    if (shouldLoadOriginalCopyWorkspace) {
      if (originalCopyResult.status === "fulfilled") {
        setOriginalCopyWorkspace(originalCopyResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("原创文案");
        setOriginalCopyWorkspace(douyinOriginalCopySeed);
      }
    }

    if (shouldLoadRemixCopyWorkspace) {
      if (remixCopyResult.status === "fulfilled") {
        setRemixCopyWorkspace(remixCopyResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("二创文案");
        setRemixCopyWorkspace(douyinRemixCopySeed);
      }
    }

    if (shouldLoadRemixShortVideoWorkspace) {
      if (remixShortVideoResult.status === "fulfilled") {
        setRemixShortVideoWorks(remixShortVideoResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("复刻短视频作品");
        setRemixShortVideoWorks([]);
      }
    }

    if (shouldLoadVideoWorkspace) {
      if (videoResult.status === "fulfilled") {
        setVideoWorks(videoResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("AI 生视频作品");
        setVideoWorks([]);
      }
    }

    if (shouldLoadVideoSupportOptions) {
      if (videoProvidersResult.status === "fulfilled") {
        setVideoProviderOptions(videoProvidersResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("AI 生视频服务商");
        setVideoProviderOptions([]);
      }

      if (storyboardModelsResult.status === "fulfilled") {
        setStoryboardImageModelOptions(storyboardModelsResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("故事板模型");
        setStoryboardImageModelOptions([]);
      }
    }

    if (shouldLoadDirectVideoWorkspace) {
      if (directVideoResult.status === "fulfilled") {
        setDirectVideoWorks(directVideoResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("AI 生视频直出作品");
        setDirectVideoWorks([]);
      }
    }

    if (currentSectionKey === "videoDirect" && shouldLoadDirectVideoWorkspace) {
      if (directVideoProvidersResult.status === "fulfilled") {
        setDirectVideoProviderOptions(directVideoProvidersResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("AI 生视频直出服务商");
        setDirectVideoProviderOptions([]);
      }
    }

    if (shouldLoadDigitalHumanWorks) {
      if (digitalHumanResult.status === "fulfilled") {
        setDigitalHumanWorks(digitalHumanResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("数字人作品列表");
        setDigitalHumanWorks([]);
      }
    }

    if (shouldLoadOpenClawCreativeMaterialWorkspace) {
      if (openClawCreativeMaterialResult.status === "fulfilled") {
        setOpenClawCreativeMaterialWorkspace(openClawCreativeMaterialResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("OpenClaw 创作素材");
        setOpenClawCreativeMaterialWorkspace({ items: [], total: 0 });
      }
    }

    if (shouldLoadOpenClawDailyPlanWorkspace) {
      if (openClawDailyPlanResult.status === "fulfilled") {
        setOpenClawDailyPlanWorkspace(openClawDailyPlanResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("OpenClaw 每日计划");
        setOpenClawDailyPlanWorkspace({ items: [], total: 0 });
      }
    }

    if (shouldLoadOpenClawLobsterDiaryWorkspace) {
      if (openClawLobsterDiaryResult.status === "fulfilled") {
        setOpenClawLobsterDiaryWorkspace(openClawLobsterDiaryResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("OpenClaw 每周复盘");
        setOpenClawLobsterDiaryWorkspace({ items: [], total: 0 });
      }
    }

    if (shouldLoadOpenClawStrategyOptimizationWorkspace) {
      if (openClawStrategyOptimizationResult.status === "fulfilled") {
        setOpenClawStrategyOptimizationWorkspace(openClawStrategyOptimizationResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("OpenClaw 策略优化记录");
        setOpenClawStrategyOptimizationWorkspace({ items: [], total: 0 });
      }
    }

    if (shouldLoadOpenClawVideoWorkWorkspace) {
      if (openClawVideoWorkResult.status === "fulfilled") {
        setOpenClawVideoWorkWorkspace(openClawVideoWorkResult.value);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("OpenClaw 视频作品");
        setOpenClawVideoWorkWorkspace({ items: [], total: 0 });
      }
    }

    if (shouldLoadAdPreAuditWorkspace) {
      if (adPreAuditResult.status === "fulfilled") {
        setAdPreAuditWorks(adPreAuditResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("广告预审记录");
        setAdPreAuditWorks([]);
      }

      if (adPreAuditConfigResult.status === "fulfilled") {
        setAdPreAuditConfig(
          adPreAuditConfigResult.value.item || {
            brandId: activeBrandId,
            defaultBusinessType: "ad",
            updatedAt: "",
          },
        );
      } else {
        hasFallback = true;
        failedInterfaceNames.push("广告预审默认配置");
        setAdPreAuditConfig({
          brandId: activeBrandId,
          defaultBusinessType: "ad",
          updatedAt: "",
        });
      }

      if (adPreAuditMediaResult.status === "fulfilled") {
        setAdPreAuditMediaAssets(adPreAuditMediaResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("广告预审可选视频");
        setAdPreAuditMediaAssets([]);
      }
    }

    if (shouldLoadDigitalHumanSupportWorkspace) {
      if (digitalHumanCustomPersonsResult.status === "fulfilled") {
        setDigitalHumanCustomPersons(digitalHumanCustomPersonsResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("我的数字人");
        setDigitalHumanCustomPersons([]);
      }
    }

    if (shouldLoadDigitalHumanWorks) {
      if (digitalHumanLipSyncResult.status === "fulfilled") {
        setDigitalHumanLipSyncWorks(digitalHumanLipSyncResult.value.items || []);
      } else {
        hasFallback = true;
        failedInterfaceNames.push("口型驱动作品");
        setDigitalHumanLipSyncWorks([]);
      }
    }

    if (currentSectionKey === "plan") {
      if (planContextGrowthResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("品牌增长报告");
      }
      if (planContextAnnualResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("年度营销计划");
      }
      if (planContextOpportunityResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("机会洞察总报告");
      }
      if (planResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("营销策划方案");
      }
    }
    if ((currentSectionKey === "hotTopics" || currentSectionKey === "topicLibrary") && hotTopicResult.status !== "fulfilled") {
      currentSectionFailedInterfaceNames.push("热点找选题");
    }
    if (currentSectionKey === "originalCopy" && originalCopyResult.status !== "fulfilled") {
      currentSectionFailedInterfaceNames.push("原创文案");
    }
    if (currentSectionKey === "remixCopy" && remixCopyResult.status !== "fulfilled") {
      currentSectionFailedInterfaceNames.push("二创文案");
    }
    if (currentSectionKey === "remixShortVideo" && remixShortVideoResult.status !== "fulfilled") {
      currentSectionFailedInterfaceNames.push("复刻短视频作品");
    }
    if (currentSectionKey === "video") {
      if (videoResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("AI 生视频作品");
      }
      if (videoProvidersResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("AI 生视频服务商");
      }
      if (storyboardModelsResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("故事板模型");
      }
    }
    if (currentSectionKey === "videoDirect") {
      if (directVideoResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("AI 生视频直出作品");
      }
      if (directVideoProvidersResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("AI 生视频直出服务商");
      }
    }
    if (currentSectionKey === "digitalHuman") {
      if (digitalHumanResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("数字人作品列表");
      }
      if (digitalHumanCustomPersonsResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("我的数字人");
      }
      if (digitalHumanLipSyncResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("口型驱动作品");
      }
    }
    if (currentSectionKey === "adPreAudit") {
      if (adPreAuditResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("广告预审记录");
      }
      if (adPreAuditConfigResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("广告预审默认配置");
      }
      if (adPreAuditMediaResult.status !== "fulfilled") {
        currentSectionFailedInterfaceNames.push("广告预审可选视频");
      }
    }

    const nextWorkspaceError = currentSectionFailedInterfaceNames.length
      ? `当前板块接口读取失败：${formatFailedInterfaceNames(currentSectionFailedInterfaceNames) || "请按需刷新重试"}。当前仅保留已成功加载的数据。`
      : "";
    // #region debug-point G:douyin-workspace-load-summary
    postRuntimeDebugEvent({
      sessionId: "douyin-workspace-false-502",
      runId: "pre-fix",
      hypothesisId: "G",
      location: "apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx:loadWorkspace",
      msg: "[DEBUG] 抖音工作台完成加载并生成当前板块错误文案",
      data: {
        bundleMarker: debugBundleMarker,
        brandId: activeBrandId,
        activeSection: currentSectionKey,
        hasFallback,
        failedInterfaceNames,
        currentSectionFailedInterfaceNames,
        nextWorkspaceError,
      },
      ts: Date.now(),
    });
    // #endregion
    setHasLoadedSharedWorkspace((current) => current || sharedWorkspaceLoadedSuccessfully);
    setLoadedSections((current) => ({
      ...current,
      plan: current.plan || shouldLoadPlanWorkspace,
      hotTopics: current.hotTopics || shouldLoadHotTopicWorkspace,
      topicLibrary: current.topicLibrary || shouldLoadHotTopicWorkspace,
      originalCopy: current.originalCopy || shouldLoadOriginalCopyWorkspace,
      remixCopy: current.remixCopy || shouldLoadRemixCopyWorkspace,
      remixShortVideo: current.remixShortVideo || shouldLoadRemixShortVideoWorkspace,
      video: current.video || currentSectionKey === "video",
      videoDirect: current.videoDirect || currentSectionKey === "videoDirect",
      digitalHuman: current.digitalHuman || shouldLoadDigitalHumanSupportWorkspace,
      runningHub: current.runningHub || currentSectionKey === "runningHub",
      adPreAudit: current.adPreAudit || shouldLoadAdPreAuditWorkspace,
      openclawCreativeMaterials: current.openclawCreativeMaterials || shouldLoadOpenClawCreativeMaterialWorkspace,
      openclawDailyPlan: current.openclawDailyPlan || shouldLoadOpenClawDailyPlanWorkspace,
      openclawLobsterDiary: current.openclawLobsterDiary || shouldLoadOpenClawLobsterDiaryWorkspace,
      openclawStrategyOptimization: current.openclawStrategyOptimization || shouldLoadOpenClawStrategyOptimizationWorkspace,
      openclawVideoWorks: current.openclawVideoWorks || shouldLoadOpenClawVideoWorkWorkspace,
    }));
    setLoadState(hasFallback ? "partial" : "api");
    if (nextWorkspaceError) {
      setErrorMessage(nextWorkspaceError);
    }
    setIsLoading(false);
  }, [
    activeBrandId,
    debugBundleMarker,
    digitalHumanCurrentSpeechTaskId,
    digitalHumanTemplateTagId,
    hasLoadedSharedWorkspace,
  ]);

  const refreshPublishingWorkspace = useCallback(async () => {
    await Promise.all([
      loadWorkspace(undefined, { forceShared: true }),
      getBrandArchive(activeBrandId)
        .then((archive) => {
          setBrandArchive(archive);
          return archive;
        })
        .catch(() => brandArchiveSeed),
    ]);
  }, [activeBrandId, loadWorkspace]);

  const {
    publishingTarget,
    publishingAccountValue,
    setPublishingAccountValue,
    isDesktopExtensionReady,
    isCreatingDesktopPublishSession,
    activeDesktopPublishSession,
    openPublishModal: handleOpenPublishModal,
    closePublishModal: handleClosePublishModal,
    createDesktopPublishSession: handleCreateDesktopPublishSession,
  } = useDouyinPublishFlow({
    brandId: activeBrandId,
    defaultAccountId: defaultDouyinAccountId,
    platformAccounts: brandArchive.platformAccounts,
    onRefreshWorkspace: refreshPublishingWorkspace,
    setNotice,
    setErrorMessage,
  });
  const {
    publishingTarget: wechatChannelPublishingTarget,
    isExtensionReady: isWechatChannelExtensionReady,
    isLaunching: isLaunchingWechatChannelProbe,
    notice: wechatChannelNotice,
    errorMessage: wechatChannelErrorMessage,
    probeResult: wechatChannelProbeResult,
    activeSession: activeWechatChannelSession,
    openPublishModal: handleOpenWechatChannelPublishModal,
    closePublishModal: handleCloseWechatChannelPublishModal,
    startPublishProbe: handleStartWechatChannelPublishProbe,
  } = useWechatChannelPublishFlow();

  useEffect(() => {
    // #region debug-point G:douyin-workspace-bundle-marker
    postRuntimeDebugEvent({
      sessionId: "douyin-workspace-false-502",
      runId: "pre-fix",
      hypothesisId: "G",
      location: "apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx:mount",
      msg: "[DEBUG] 抖音工作台前端 bundle 已挂载",
      data: {
        bundleMarker: debugBundleMarker,
        brandId: activeBrandId,
      },
      ts: Date.now(),
    });
    // #endregion
  }, [activeBrandId, debugBundleMarker]);

  useEffect(() => {
    void loadWorkspace(undefined, { forceShared: true });
  }, [activeBrandId]);

  useEffect(() => {
    if (isLoading || loadedSections[activeSection]) {
      return;
    }
    void loadWorkspace(activeSection);
  }, [activeBrandId, activeSection, isLoading, loadedSections]);

  useEffect(() => {
    // #region debug-point G:douyin-workspace-error-message-change
    postRuntimeDebugEvent({
      sessionId: "douyin-workspace-false-502",
      runId: "pre-fix",
      hypothesisId: "G",
      location: "apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx:errorMessage",
      msg: "[DEBUG] 抖音工作台错误文案发生变化",
      data: {
        bundleMarker: debugBundleMarker,
        brandId: activeBrandId,
        activeSection,
        loadState,
        errorMessage,
      },
      ts: Date.now(),
    });
    // #endregion
  }, [activeBrandId, activeSection, debugBundleMarker, errorMessage, loadState]);

  useEffect(() => {
    let cancelled = false;
    void getBrandArchive(activeBrandId)
      .then((archive) => {
        if (!cancelled) {
          setBrandArchive(archive);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeBrandId]);

  useEffect(() => {
    if (!visibleSections.length) {
      return;
    }
    if (!visibleSections.some((item) => item.key === activeSection)) {
      setActiveSection(visibleSections[0].key);
    }
  }, [activeSection, visibleSections]);

  useEffect(() => {
    setMarketingPlanDraft(marketingPlanWorkspace.latest?.reportMarkdown || "");
  }, [marketingPlanWorkspace.latest?.id, marketingPlanWorkspace.latest?.generatedAt]);

  useEffect(() => {
    if (hotTopicWorkspace.selectedDate && hotTopicWorkspace.selectedDate !== selectedHotTopicDate) {
      setSelectedHotTopicDate(hotTopicWorkspace.selectedDate);
    }
    if (!selectedHotTopicDate && hotTopicWorkspace.availableDates.length) {
      setSelectedHotTopicDate(hotTopicWorkspace.selectedDate || hotTopicWorkspace.availableDates[0] || "");
    }
  }, [hotTopicWorkspace.availableDates, hotTopicWorkspace.selectedDate, selectedHotTopicDate]);

  useEffect(() => {
    setSelectedTopicIds(
      (latestHotTopicResult?.items || [])
        .filter((item) => item.checked)
        .map((item) => item.id),
    );
  }, [latestHotTopicResult?.id, latestHotTopicResult?.generatedAt, latestHotTopicResult?.items]);

  useEffect(() => {
    if (!unifiedMaterialOptions.length) {
      setSelectedMaterialId("");
      return;
    }
    if (!unifiedMaterialOptions.some((item) => item.id === selectedMaterialId)) {
      setSelectedMaterialId(unifiedMaterialOptions[0]?.id || "");
    }
  }, [selectedMaterialId, unifiedMaterialOptions]);

  useEffect(() => {
    if (!activeWorkspacePollers.length) {
      return undefined;
    }
    let cancelled = false;
    let timer: number | undefined;
    let polling = false;
    const scheduleNext = () => {
      if (cancelled) {
        return;
      }
      timer = window.setTimeout(() => {
        void runPollingCycle();
      }, 10000);
    };
    const runPollingCycle = async () => {
      if (cancelled || polling) {
        return;
      }
      if (typeof document !== "undefined" && document.hidden) {
        scheduleNext();
        return;
      }
      polling = true;
      try {
        for (const poller of activeWorkspacePollers) {
          if (cancelled) {
            break;
          }
          await poller.run().catch(() => undefined);
        }
      } finally {
        polling = false;
        scheduleNext();
      }
    };
    scheduleNext();
    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [activeWorkspacePollers]);

  useEffect(() => {
    if (!hasActiveWorkspacePolling && notice.includes("任务已提交")) {
      setNotice("");
    }
  }, [hasActiveWorkspacePolling, notice]);

  useEffect(() => {
    setOriginalCopyWorkspace((current) => ({
      ...current,
      topicOptions: hotTopicWorkspace.topicLibrary || [],
    }));
  }, [hotTopicWorkspace.topicLibrary]);

  useEffect(() => {
    setOriginalCopyWorkspace((current) => ({
      ...current,
      hasMarketingPlan: Boolean(marketingPlanWorkspace.latest),
      marketingPlanTitle: marketingPlanWorkspace.latest?.title,
    }));
  }, [marketingPlanWorkspace.latest?.id, marketingPlanWorkspace.latest?.title]);

  useEffect(() => {
    setRemixCopyWorkspace((current) => ({
      ...current,
      hasMarketingPlan: Boolean(marketingPlanWorkspace.latest),
      marketingPlanTitle: marketingPlanWorkspace.latest?.title,
    }));
  }, [marketingPlanWorkspace.latest?.id, marketingPlanWorkspace.latest?.title]);

  const handleOpenGenerateDialog = useCallback(() => {
    if (!canEditMarketingPlan) {
      setErrorMessage("当前账号只有查看权限，不能生成抖音营销策划方案。");
      return;
    }
    if (!growthReportWorkspace.latest) {
      setErrorMessage("请先生成品牌增长报告。");
      return;
    }
    if (!opportunityInsightWorkspace.finalOpportunityReport?.htmlDocument?.trim()) {
      setErrorMessage("请先生成机会洞察总报告。");
      return;
    }
    if (!hasMarketingPlanBrandBackground) {
      setErrorMessage("请先完善品牌背景资料。");
      return;
    }
    if (!hasMarketingPlanProductLibrary) {
      setErrorMessage("请先完善产品资料库。");
      return;
    }
    setErrorMessage("");
    setNotice("");
    setIsMarketingPlanGenerateDialogOpen(true);
  }, [
    canEditMarketingPlan,
    growthReportWorkspace.latest,
    hasMarketingPlanBrandBackground,
    hasMarketingPlanProductLibrary,
    opportunityInsightWorkspace.finalOpportunityReport?.htmlDocument,
  ]);

  const handleCloseGenerateDialog = useCallback(() => {
    if (isGenerating) {
      return;
    }
    setIsMarketingPlanGenerateDialogOpen(false);
  }, [isGenerating]);

  const handleGenerate = useCallback(async () => {
    if (!canEditMarketingPlan) {
      setErrorMessage("当前账号只有查看权限，不能生成抖音营销策划方案。");
      return;
    }
    if (!growthReportWorkspace.latest) {
      setErrorMessage("请先生成品牌增长报告。");
      return;
    }
    if (!opportunityInsightWorkspace.finalOpportunityReport?.htmlDocument?.trim()) {
      setErrorMessage("请先生成机会洞察总报告。");
      return;
    }
    if (!hasMarketingPlanBrandBackground) {
      setErrorMessage("请先完善品牌背景资料。");
      return;
    }
    if (!hasMarketingPlanProductLibrary) {
      setErrorMessage("请先完善产品资料库。");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await generateDouyinMarketingPlan(
        {
          userRequirement: marketingPlanUserRequirement,
        },
        activeBrandId,
      );
      setMarketingPlanWorkspace(nextWorkspace);
      setIsMarketingPlanGenerateDialogOpen(false);
      setMarketingPlanUserRequirement("");
      setNotice("抖音营销策划方案任务已提交，系统正在后台生成。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "抖音营销策划方案提交失败。");
    } finally {
      setIsGenerating(false);
    }
  }, [
    activeBrandId,
    canEditMarketingPlan,
    growthReportWorkspace.latest,
    hasMarketingPlanBrandBackground,
    hasMarketingPlanProductLibrary,
    marketingPlanUserRequirement,
    opportunityInsightWorkspace.finalOpportunityReport?.htmlDocument,
  ]);

  const handleSave = useCallback(async () => {
    if (!latestMarketingPlan) {
      return;
    }
    if (!canEditMarketingPlan) {
      setErrorMessage("当前账号只有查看权限，不能保存抖音营销策划方案。");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await updateDouyinMarketingPlan(
        latestMarketingPlan.id,
        marketingPlanDraft,
        latestMarketingPlan.title,
        activeBrandId,
      );
      setMarketingPlanWorkspace(nextWorkspace);
      setNotice("抖音营销策划方案已保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "抖音营销策划方案保存失败。");
    } finally {
      setIsSaving(false);
    }
  }, [activeBrandId, canEditMarketingPlan, latestMarketingPlan, marketingPlanDraft]);

  const handleDelete = useCallback(async () => {
    if (!latestMarketingPlan) {
      return;
    }
    if (!canEditMarketingPlan) {
      setErrorMessage("当前账号只有查看权限，不能删除抖音营销策划方案。");
      return;
    }
    if (!window.confirm(`确认删除「${latestMarketingPlan.title}」吗？`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await deleteDouyinMarketingPlan(latestMarketingPlan.id, activeBrandId);
      setMarketingPlanWorkspace(nextWorkspace);
      setNotice("抖音营销策划方案已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "抖音营销策划方案删除失败。");
    } finally {
      setIsDeleting(false);
    }
  }, [activeBrandId, canEditMarketingPlan, latestMarketingPlan]);

  const handleHotTopicDateChange = useCallback(async (date: string) => {
    setSelectedHotTopicDate(date);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await getDouyinHotTopicCandidatesWorkspace(activeBrandId, date);
      setHotTopicWorkspace(nextWorkspace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "热点日期切换失败。");
    }
  }, [activeBrandId]);

  const handleGenerateHotTopics = useCallback(async () => {
    if (!canEditHotTopics) {
      setErrorMessage("当前账号只有查看权限，不能生成热点找选题。");
      return;
    }
    if (!selectedHotTopicDate) {
      setErrorMessage("请先选择一个热点日期。");
      return;
    }

    setIsGeneratingHotTopics(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await generateDouyinHotTopicCandidates(selectedHotTopicDate, activeBrandId);
      setHotTopicWorkspace(nextWorkspace);
      setNotice("热点找选题任务已提交，系统正在后台生成。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "热点找选题提交失败。");
    } finally {
      setIsGeneratingHotTopics(false);
    }
  }, [activeBrandId, canEditHotTopics, selectedHotTopicDate]);

  const handleToggleTopic = useCallback((topicId: string, checked: boolean) => {
    setSelectedTopicIds((current) => {
      if (checked) {
        return current.includes(topicId) ? current : [...current, topicId];
      }
      return current.filter((item) => item !== topicId);
    });
  }, []);

  const saveTopicLibrary = useCallback(async (items: DouyinTopicLibraryItem[], noticeText: string) => {
    setIsSavingTopicLibrary(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await updateDouyinTopicLibrary(items, activeBrandId);
      setHotTopicWorkspace(nextWorkspace);
      setOriginalCopyWorkspace((current) => ({
        ...current,
        topicOptions: nextWorkspace.topicLibrary || [],
      }));
      setNotice(noticeText);
      return nextWorkspace;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "选题库保存失败。");
      return undefined;
    } finally {
      setIsSavingTopicLibrary(false);
    }
  }, [activeBrandId]);

  const handleAddSelectedTopics = useCallback(async () => {
    if (!canEditTopicLibrary) {
      setErrorMessage("当前账号只有查看权限，不能写入选题库。");
      return;
    }
    if (!latestHotTopicResult?.items?.length || !selectedTopicIds.length) {
      setErrorMessage("请先勾选至少一个热点选题。");
      return;
    }
    const existing = hotTopicWorkspace.topicLibrary || [];
    const existingKeys = new Set(existing.map((item) => item.topicContent.trim().toLowerCase()));
    const nextItems = [...existing];
    let addedCount = 0;
    for (const item of latestHotTopicResult.items) {
      if (!selectedTopicIds.includes(item.id)) {
        continue;
      }
      const dedupeKey = item.title.trim().toLowerCase();
      if (!dedupeKey || existingKeys.has(dedupeKey)) {
        continue;
      }
      existingKeys.add(dedupeKey);
      addedCount += 1;
      nextItems.unshift({
        id: `topic-library-${item.id}`,
        topicTitle: item.title,
        topicContent: item.title,
        topicPlatform: "抖音",
        contentFormat: "视频",
        presentationFormat: "结合热点切口包装为短视频选题",
        topicGoal: "提升内容曝光与互动效率",
        expertSkill: "",
        reusable: false,
        topicDescription: item.description?.trim() || latestHotTopicResult.summary || `来自 ${selectedHotTopicDate} 热点找选题结果`,
        selectedAt: new Date().toISOString(),
        source: "GENERATED",
        sourceDate: selectedHotTopicDate || undefined,
      });
    }
    if (!addedCount) {
      setNotice("勾选选题已在当前品牌选题库中，无需重复加入。");
      return;
    }
    const nextWorkspace = await saveTopicLibrary(nextItems, `已加入 ${addedCount} 条选题到当前品牌选题库。`);
    if (nextWorkspace) {
      setSelectedTopicIds([]);
    }
  }, [
    canEditTopicLibrary,
    hotTopicWorkspace.topicLibrary,
    latestHotTopicResult,
    saveTopicLibrary,
    selectedHotTopicDate,
    selectedTopicIds,
  ]);

  const handleSaveTopic = useCallback(async (item: DouyinTopicLibraryItem) => {
    if (!canEditTopicLibrary) {
      setErrorMessage("当前账号只有查看权限，不能写入选题库。");
      return;
    }
    const topicTitle = item.topicTitle.trim();
    const topicContent = item.topicContent.trim();
    if (!topicTitle || !topicContent) {
      setErrorMessage("请先填写完整的选题标题和选题内容。");
      return;
    }
    const existing = hotTopicWorkspace.topicLibrary || [];
    const exists = existing.some((current) => (
      current.id !== item.id
      && current.topicPlatform === item.topicPlatform
      && current.topicTitle.trim().toLowerCase() === topicTitle.toLowerCase()
    ));
    if (exists) {
      setNotice("同平台下相同标题的选题已存在于当前品牌选题库中。");
      return;
    }
    const hasExisting = existing.some((current) => current.id === item.id);
    await saveTopicLibrary(
      hasExisting
        ? existing.map((current) => (current.id === item.id ? item : current))
        : [item, ...existing],
      hasExisting ? "选题已更新。" : "选题已添加到当前品牌选题库。",
    );
  }, [canEditTopicLibrary, hotTopicWorkspace.topicLibrary, saveTopicLibrary]);

  const handleDeleteTopic = useCallback(async (topicId: string) => {
    if (!canEditTopicLibrary) {
      setErrorMessage("当前账号只有查看权限，不能修改选题库。");
      return;
    }
    const existing = hotTopicWorkspace.topicLibrary || [];
    const nextItems = existing.filter((item) => item.id !== topicId);
    if (nextItems.length === existing.length) {
      setNotice("目标选题不存在或已删除。");
      return;
    }
    await saveTopicLibrary(nextItems, "选题已从当前品牌选题库删除。");
  }, [canEditTopicLibrary, hotTopicWorkspace.topicLibrary, saveTopicLibrary]);

  const handleCreateOriginalCopy = useCallback(async (payload: {
    calendarItemId?: string;
    topicId?: string;
    injectMarketingPlan: boolean;
    copyType: "VIEWPOINT" | "STORY" | "PROCESS" | "KNOWLEDGE" | "PLOT_SALES" | "SEEDING" | "LOCAL_SALES";
    userRequirement?: string;
  }) => {
    if (!canEditOriginalCopy) {
      setErrorMessage("当前账号只有查看权限，不能生成原创文案。");
      return false;
    }

    setIsSubmittingOriginalCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await generateDouyinOriginalCopy(payload, activeBrandId);
      setOriginalCopyWorkspace(nextWorkspace);
      setNotice("原创文案任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "原创文案提交失败。");
      return false;
    } finally {
      setIsSubmittingOriginalCopy(false);
    }
  }, [activeBrandId, canEditOriginalCopy]);

  const handleUpdateOriginalCopy = useCallback(async (payload: {
    reportId: string;
    title?: string;
    content: string;
  }) => {
    if (!canEditOriginalCopy) {
      setErrorMessage("当前账号只有查看权限，不能修改原创文案。");
      return false;
    }

    setIsSubmittingOriginalCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await updateDouyinOriginalCopy(payload.reportId, {
        title: payload.title,
        content: payload.content,
      }, activeBrandId);
      setOriginalCopyWorkspace(nextWorkspace);
      setNotice("原创文案已修改。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "原创文案修改失败。");
      return false;
    } finally {
      setIsSubmittingOriginalCopy(false);
    }
  }, [activeBrandId, canEditOriginalCopy]);

  const handleDeleteOriginalCopy = useCallback(async (reportId: string) => {
    if (!canEditOriginalCopy) {
      setErrorMessage("当前账号只有查看权限，不能删除原创文案。");
      return false;
    }

    setIsSubmittingOriginalCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await deleteDouyinOriginalCopy(reportId, activeBrandId);
      setOriginalCopyWorkspace(nextWorkspace);
      setNotice("原创文案已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "原创文案删除失败。");
      return false;
    } finally {
      setIsSubmittingOriginalCopy(false);
    }
  }, [activeBrandId, canEditOriginalCopy]);

  const handleCreateRemixCopy = useCallback(async (payload: {
    materialId: string;
    injectBrandProfile: boolean;
    productId?: string;
    injectMarketingPlan: boolean;
    userRequirement?: string;
  }) => {
    if (!canEditRemixCopy) {
      setErrorMessage("当前账号只有查看权限，不能生成二创文案。");
      return false;
    }

    setIsSubmittingRemixCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await generateDouyinRemixCopy(payload, activeBrandId);
      setRemixCopyWorkspace(nextWorkspace);
      setNotice("二创文案任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "二创文案提交失败。");
      return false;
    } finally {
      setIsSubmittingRemixCopy(false);
    }
  }, [activeBrandId, canEditRemixCopy]);

  const handleUpdateRemixCopy = useCallback(async (payload: {
    reportId: string;
    title?: string;
    content: string;
  }) => {
    if (!canEditRemixCopy) {
      setErrorMessage("当前账号只有查看权限，不能修改二创文案。");
      return false;
    }

    setIsSubmittingRemixCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await updateDouyinRemixCopy(payload.reportId, {
        title: payload.title,
        content: payload.content,
      }, activeBrandId);
      setRemixCopyWorkspace(nextWorkspace);
      setNotice("二创文案已修改。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "二创文案修改失败。");
      return false;
    } finally {
      setIsSubmittingRemixCopy(false);
    }
  }, [activeBrandId, canEditRemixCopy]);

  const handleDeleteRemixCopy = useCallback(async (reportId: string) => {
    if (!canEditRemixCopy) {
      setErrorMessage("当前账号只有查看权限，不能删除二创文案。");
      return false;
    }

    setIsSubmittingRemixCopy(true);
    setErrorMessage("");
    setNotice("");
    try {
      const nextWorkspace = await deleteDouyinRemixCopy(reportId, activeBrandId);
      setRemixCopyWorkspace(nextWorkspace);
      setNotice("二创文案已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "二创文案删除失败。");
      return false;
    } finally {
      setIsSubmittingRemixCopy(false);
    }
  }, [activeBrandId, canEditRemixCopy]);

  const handleCreateVideo = useCallback(async (payload: Parameters<typeof generateDouyinVideoWork>[1]) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能生成 AI 生视频（故事板）。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await generateDouyinVideoWork(activeBrandId, payload);
      await refreshVideoWorkspace();
      setNotice("AI 生视频（故事板）任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频（故事板）提交失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleCreateRemixShortVideo = useCallback(async (payload: Parameters<typeof generateDouyinRemixShortVideoWork>[1]) => {
    if (!canEditRemixShortVideo) {
      setErrorMessage("当前账号只有查看权限，不能创建复刻短视频。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await generateDouyinRemixShortVideoWork(activeBrandId, payload);
      await refreshRemixShortVideoWorkspace();
      setNotice("复刻短视频任务已提交，系统正在后台生成分段工作区。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "复刻短视频提交失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditRemixShortVideo, refreshRemixShortVideoWorkspace]);

  const handleUpdateVideo = useCallback(async (payload: {
    workId: string;
    title?: string;
    content?: string;
    storyboardPrompt?: string;
  }) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能修改 AI 生视频（故事板）。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await updateDouyinVideoWork(activeBrandId, payload.workId, payload);
      await refreshVideoWorkspace();
      setNotice("AI 生视频（故事板）已更新。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频（故事板）更新失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleDeleteVideo = useCallback(async (workId: string) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能删除 AI 生视频（故事板）。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinVideoWork(activeBrandId, workId);
      await refreshVideoWorkspace();
      setNotice("AI 生视频（故事板）已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频（故事板）删除失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleRegenerateVideoStoryboard = useCallback(async (payload: {
    workId: string;
    storyboardPrompt?: string;
  }) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能修改故事板。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await regenerateDouyinVideoStoryboard(activeBrandId, payload.workId, { storyboardPrompt: payload.storyboardPrompt });
      await refreshVideoWorkspace();
      setNotice("故事板重生成任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "故事板重生成失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleGenerateVideo = useCallback(async (payload: {
    workId: string;
    customVideoModelName?: string;
  }) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能生成短视频。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await continueDouyinVideoGeneration(activeBrandId, payload.workId, { customVideoModelName: payload.customVideoModelName });
      await refreshVideoWorkspace();
      setNotice("短视频生成任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "短视频生成失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleGenerateRemixShortVideo = useCallback(async (payload: {
    workId: string;
  }) => {
    if (!canEditRemixShortVideo) {
      setErrorMessage("当前账号只有查看权限，不能生成复刻短视频。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await continueDouyinRemixShortVideoGeneration(activeBrandId, payload.workId);
      await refreshRemixShortVideoWorkspace();
      setNotice("复刻短视频拼接任务已提交，系统正在后台生成分段视频并自动拼接。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "复刻短视频生成失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditRemixShortVideo, refreshRemixShortVideoWorkspace]);

  const handleDeleteRemixShortVideo = useCallback(async (workId: string) => {
    if (!canEditRemixShortVideo) {
      setErrorMessage("当前账号只有查看权限，不能删除复刻短视频。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinRemixShortVideoWork(activeBrandId, workId);
      await refreshRemixShortVideoWorkspace();
      setNotice("复刻短视频已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "复刻短视频删除失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditRemixShortVideo, refreshRemixShortVideoWorkspace]);

  const handleRecoverVideo = useCallback(async (payload: {
    workId?: string;
    providerTaskId: string;
    requestedVideoProvider?: string;
  }) => {
    if (!canEditVideo) {
      setErrorMessage("当前账号只有查看权限，不能找回视频结果。");
      return false;
    }
    setIsSubmittingVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await recoverDouyinVideoGeneration(activeBrandId, payload);
      await refreshVideoWorkspace();
      setNotice("视频结果找回完成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "找回视频结果失败。");
      return false;
    } finally {
      setIsSubmittingVideo(false);
    }
  }, [activeBrandId, canEditVideo, refreshVideoWorkspace]);

  const handleCreateDirectVideo = useCallback(async (payload: Parameters<typeof generateDouyinDirectVideoWork>[1]) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能生成 AI 生视频。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await generateDouyinDirectVideoWork(activeBrandId, payload);
      await refreshDirectVideoWorkspace();
      setNotice("AI 生视频任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频提交失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleUpdateDirectVideo = useCallback(async (payload: {
    workId: string;
    title?: string;
    content?: string;
  }) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能修改 AI 生视频。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await updateDouyinDirectVideoWork(activeBrandId, payload.workId, payload);
      await refreshDirectVideoWorkspace();
      setNotice("AI 生视频提示词已更新。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频提示词更新失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleDeleteDirectVideo = useCallback(async (workId: string) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能删除 AI 生视频。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinDirectVideoWork(activeBrandId, workId);
      await refreshDirectVideoWorkspace();
      setNotice("AI 生视频已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 生视频删除失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleGenerateDirectVideo = useCallback(async (payload: {
    workId: string;
    customVideoModelName?: string;
  }) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能生成短视频。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await continueDouyinDirectVideoGeneration(activeBrandId, payload.workId, { customVideoModelName: payload.customVideoModelName });
      await refreshDirectVideoWorkspace();
      setNotice("短视频生成任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "短视频生成失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleRecoverDirectVideo = useCallback(async (payload: {
    workId?: string;
    providerTaskId: string;
    requestedVideoProvider?: string;
  }) => {
    if (!canEditDirectVideo) {
      setErrorMessage("当前账号只有查看权限，不能找回视频结果。");
      return false;
    }
    setIsSubmittingDirectVideo(true);
    setErrorMessage("");
    setNotice("");
    try {
      await recoverDouyinDirectVideoGeneration(activeBrandId, payload);
      await refreshDirectVideoWorkspace();
      setNotice("视频结果找回完成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "找回视频结果失败。");
      return false;
    } finally {
      setIsSubmittingDirectVideo(false);
    }
  }, [activeBrandId, canEditDirectVideo, refreshDirectVideoWorkspace]);

  const handleCreateAdPreAudit = useCallback(async (payload: {
    vid?: string;
    fileId?: string;
    advertiserId?: string;
    businessType?: string;
    materialLabel?: string;
  }) => {
    if (!canEditAdPreAudit) {
      setErrorMessage("当前账号只有查看权限，不能提交广告预审。");
      return false;
    }
    setIsSubmittingAdPreAudit(true);
    setErrorMessage("");
    setNotice("");
    try {
      await createDouyinAdPreAudit(activeBrandId, payload);
      await refreshAdPreAuditWorkspace();
      setNotice("广告预审任务已提交，系统正在后台拉取火山引擎结果。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "广告预审提交失败。");
      return false;
    } finally {
      setIsSubmittingAdPreAudit(false);
    }
  }, [activeBrandId, canEditAdPreAudit, refreshAdPreAuditWorkspace]);

  const handleSaveAdPreAuditConfig = useCallback(async (payload: {
    defaultAdvertiserId?: string;
    defaultBusinessType?: string;
    vodSpaceName?: string;
  }) => {
    if (!canEditAdPreAudit) {
      setErrorMessage("当前账号只有查看权限，不能保存广告预审配置。");
      return false;
    }
    setIsSubmittingAdPreAudit(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await saveDouyinAdPreAuditConfig(activeBrandId, payload);
      setAdPreAuditConfig(response.item);
      await refreshAdPreAuditWorkspace();
      setNotice("广告预审默认配置已保存。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "广告预审配置保存失败。");
      return false;
    } finally {
      setIsSubmittingAdPreAudit(false);
    }
  }, [activeBrandId, canEditAdPreAudit, refreshAdPreAuditWorkspace]);

  const handleUploadAdPreAuditMedia = useCallback(async (mediaAssetId: string) => {
    if (!canEditAdPreAudit) {
      setErrorMessage("当前账号只有查看权限，不能上传作品到 VOD。");
      return null;
    }
    setIsSubmittingAdPreAudit(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await createDouyinAdPreAuditUpload(activeBrandId, { mediaAssetId });
      await refreshAdPreAuditWorkspace();
      setNotice("VOD 上传任务已提交，可继续刷新查看 Vid 返回结果。");
      return response.item;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "VOD 上传任务提交失败。");
      return null;
    } finally {
      setIsSubmittingAdPreAudit(false);
    }
  }, [activeBrandId, canEditAdPreAudit, refreshAdPreAuditWorkspace]);

  const handleRefreshAdPreAuditUpload = useCallback(async (mediaAssetId: string) => {
    if (!canEditAdPreAudit) {
      setErrorMessage("当前账号只有查看权限，不能刷新 VOD 上传结果。");
      return null;
    }
    setIsSubmittingAdPreAudit(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await refreshDouyinAdPreAuditUpload(activeBrandId, mediaAssetId);
      await refreshAdPreAuditWorkspace();
      setNotice(
        response.item.vodUpload?.status === "SUCCESS"
          ? "VOD 上传已完成，Vid 已可用于广告预审。"
          : response.item.vodUpload?.status === "FAILED"
            ? "VOD 上传已失败，请检查源视频地址或火山引擎配置。"
            : "VOD 上传状态已刷新。",
      );
      return response.item;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "VOD 上传状态刷新失败。");
      return null;
    } finally {
      setIsSubmittingAdPreAudit(false);
    }
  }, [activeBrandId, canEditAdPreAudit, refreshAdPreAuditWorkspace]);

  const handleRefreshAdPreAudit = useCallback(async (taskId: string) => {
    if (!canEditAdPreAudit) {
      setErrorMessage("当前账号只有查看权限，不能刷新广告预审结果。");
      return false;
    }
    setIsSubmittingAdPreAudit(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await refreshDouyinAdPreAudit(activeBrandId, taskId);
      await refreshAdPreAuditWorkspace();
      setNotice(
        response.item.auditStatus === "AuditResult__PASS"
          ? "广告预审已通过。"
          : response.item.auditStatus === "AuditResult__REJECT"
            ? "广告预审已返回驳回结果。"
            : "广告预审状态已刷新。",
      );
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "广告预审结果刷新失败。");
      return false;
    } finally {
      setIsSubmittingAdPreAudit(false);
    }
  }, [activeBrandId, canEditAdPreAudit, refreshAdPreAuditWorkspace]);

  const handleDeleteAdPreAudit = useCallback(async (taskId: string) => {
    if (!canEditAdPreAudit) {
      setErrorMessage("当前账号只有查看权限，不能删除广告预审记录。");
      return false;
    }
    setIsSubmittingAdPreAudit(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinAdPreAudit(activeBrandId, taskId);
      await refreshAdPreAuditWorkspace();
      setNotice("广告预审记录已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "广告预审记录删除失败。");
      return false;
    } finally {
      setIsSubmittingAdPreAudit(false);
    }
  }, [activeBrandId, canEditAdPreAudit, refreshAdPreAuditWorkspace]);

  const handleCreateDigitalHuman = useCallback(async (payload: Parameters<typeof generateDouyinDigitalHumanVideoWork>[1]) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能生成数字人视频。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await generateDouyinDigitalHumanVideoWork(activeBrandId, payload);
      await refreshDigitalHumanWorkspace();
      setNotice("数字人视频任务已提交，系统正在后台生成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "数字人视频提交失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleCreateDigitalHumanCompleteVideo = useCallback(async (payload: Parameters<typeof generateDouyinDigitalHumanCompleteVideoWork>[1]) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能生成完整数字人作品。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await generateDouyinDigitalHumanCompleteVideoWork(activeBrandId, payload);
      await refreshDigitalHumanWorkspace();
      setNotice("完整数字人作品任务已提交，系统将串行生成片段并自动拼接。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "完整数字人作品提交失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleRecoverDigitalHuman = useCallback(async (payload: {
    workId?: string;
    providerTaskId?: string;
  }) => {
    // #region debug-point A:digital-human-recover-click
    postRuntimeDebugEvent({
      sessionId: "digital-human-recover-result",
      runId: "pre-fix",
      hypothesisId: "A",
      location: "apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx:handleRecoverDigitalHuman",
      msg: "[DEBUG] 用户触发数字人结果找回",
      data: {
        brandId: activeBrandId,
        canEditDigitalHuman,
        payload,
      },
      ts: Date.now(),
    });
    // #endregion
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能找回数字人视频结果。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      const recovered = await recoverDouyinDigitalHumanVideo(activeBrandId, payload);
      // #region debug-point B:digital-human-recover-response
      postRuntimeDebugEvent({
        sessionId: "digital-human-recover-result",
        runId: "pre-fix",
        hypothesisId: "B",
        location: "apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx:handleRecoverDigitalHuman",
        msg: "[DEBUG] 前端收到数字人结果找回响应",
        data: {
          brandId: activeBrandId,
          payload,
          recovered,
        },
        ts: Date.now(),
      });
      // #endregion
      await refreshDigitalHumanWorkspace();
      if (recovered.recovered) {
        setNotice("数字人视频结果找回完成。");
      } else {
        setNotice(recovered.item?.thirdPartyStatusDetail || "已发起找回，系统正在后台同步结果，请稍后刷新查看。");
        if (typeof window !== "undefined") {
          window.setTimeout(() => {
            void refreshDigitalHumanWorkspace();
          }, 3000);
          window.setTimeout(() => {
            void refreshDigitalHumanWorkspace();
          }, 10000);
        }
      }
      return true;
    } catch (error) {
      // #region debug-point C:digital-human-recover-error
      postRuntimeDebugEvent({
        sessionId: "digital-human-recover-result",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "apps/web/src/app/(dashboard)/douyin/workspace-shell.tsx:handleRecoverDigitalHuman",
        msg: "[DEBUG] 前端数字人结果找回失败",
        data: {
          brandId: activeBrandId,
          payload,
          message: error instanceof Error ? error.message : String(error),
        },
        ts: Date.now(),
      });
      // #endregion
      setErrorMessage(error instanceof Error ? error.message : "找回数字人视频结果失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleDeleteDigitalHuman = useCallback(async (workId: string) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能删除数字人作品。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinDigitalHumanVideoWork(activeBrandId, workId);
      await refreshDigitalHumanWorkspace();
      setNotice("数字人作品已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "数字人作品删除失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleCreateDigitalHumanCustomPerson = useCallback(async (payload: {
    name?: string;
    trainingVideoFile?: File | null;
    trainType?: "figure" | "both";
    language?: string;
    resolutionRate?: "1080p" | "4K";
    errorSkip?: boolean;
  }) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能创建定制数字人。");
      return false;
    }
    if (payload.trainingVideoFile && payload.trainingVideoFile.size > 500 * 1024 * 1024) {
      setErrorMessage("训练视频大小不能超过 500MB，请压缩后再提交。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await createDouyinDigitalHumanCustomPerson(activeBrandId, payload);
      await refreshDigitalHumanWorkspace();
      setNotice("定制数字人任务已提交。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "定制数字人提交失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleDeleteDigitalHumanCustomPerson = useCallback(async (customPersonId: string) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能删除定制数字人记录。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinDigitalHumanCustomPerson(activeBrandId, customPersonId);
      await refreshDigitalHumanWorkspace();
      setNotice("定制数字人记录已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "定制数字人记录删除失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleCreateLipSync = useCallback(async (payload: {
    title?: string;
    sourceVideoFile?: File | null;
    audioType?: "TEXT" | "AUDIO";
    script?: string;
    audioFile?: File | null;
    model?: 0 | 1;
    backway?: 1 | 2;
    driveMode?: "" | "random";
    audioManId?: string;
    speechRate?: number;
    pitch?: number;
    volume?: number;
    screenWidth?: number;
    screenHeight?: number;
  }) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能提交口型驱动任务。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await generateDouyinLipSyncWork(activeBrandId, payload);
      await refreshDigitalHumanWorkspace();
      setNotice("口型驱动任务已提交。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "口型驱动提交失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleRecoverLipSync = useCallback(async (payload: {
    workId?: string;
    providerTaskId?: string;
  }) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能找回口型驱动结果。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await recoverDouyinLipSyncGeneration(activeBrandId, payload);
      await refreshDigitalHumanWorkspace();
      setNotice("口型驱动结果找回完成。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "找回口型驱动结果失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleDeleteLipSync = useCallback(async (workId: string) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能删除口型驱动记录。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinLipSyncWork(activeBrandId, workId);
      await refreshDigitalHumanWorkspace();
      setNotice("口型驱动记录已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "口型驱动记录删除失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanWorkspace]);

  const handleRefreshDigitalHumanPublicVoices = useCallback(async (page: number) => {
    setErrorMessage("");
    setNotice("");
    try {
      await refreshDigitalHumanPublicVoices(page);
      setNotice(`已切换到公共声音第 ${page} 页。`);
    } catch (error) {
      const message = readRequestErrorMessage(error, "公共声音列表刷新失败。");
      setDigitalHumanPublicVoiceError(message);
      setErrorMessage(message);
    }
  }, [refreshDigitalHumanPublicVoices]);

  const handleRefreshDigitalHumanCustomVoices = useCallback(async (page: number) => {
    setErrorMessage("");
    setNotice("");
    try {
      await refreshDigitalHumanCustomVoices(page);
      setNotice(`已切换到我的声音第 ${page} 页。`);
    } catch (error) {
      const message = readRequestErrorMessage(error, "我的声音列表刷新失败。");
      setDigitalHumanCustomVoiceError(message);
      setErrorMessage(message);
    }
  }, [refreshDigitalHumanCustomVoices]);

  const handleCreateDigitalHumanCustomVoice = useCallback(async (payload: {
    name?: string;
    audioFile?: File | null;
    modelType?: "cicada1.0" | "cicada3.0" | "cicada3.0-turbo";
    language?: "cn" | "en";
    text?: string;
  }) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能创建定制声音。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await createDouyinCustomVoice(activeBrandId, payload);
      setDigitalHumanCurrentSpeechTask(null);
      await refreshDigitalHumanCustomVoices(1);
      setNotice(`定制声音已提交：${response.item.name}`);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "定制声音创建失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, refreshDigitalHumanCustomVoices]);

  const handleDeleteDigitalHumanCustomVoice = useCallback(async (voiceId: string) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能删除定制声音。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinCustomVoice(activeBrandId, voiceId);
      await refreshDigitalHumanCustomVoices(Math.min(digitalHumanCustomVoicePageInfo?.page || 1, digitalHumanCustomVoicePageInfo?.totalPage || 1));
      setNotice("定制声音已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "定制声音删除失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman, digitalHumanCustomVoicePageInfo?.page, digitalHumanCustomVoicePageInfo?.totalPage, refreshDigitalHumanCustomVoices]);

  const handleCreateDigitalHumanSpeechTask = useCallback(async (payload: {
    audioManId?: string;
    text?: string;
    speed?: number;
    pitch?: number;
    dialect?: number;
  }) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能提交语音合成任务。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await createDouyinSpeechTask(activeBrandId, payload);
      setDigitalHumanCurrentSpeechTaskId(response.taskId || response.item.id);
      setDigitalHumanCurrentSpeechTask(response.item || null);
      setNotice("语音合成任务已提交。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "语音合成提交失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman]);

  const handleRefreshDigitalHumanSpeechTask = useCallback(async (taskId?: string) => {
    setErrorMessage("");
    setNotice("");
    try {
      const item = await refreshDigitalHumanSpeechTask(taskId);
      if (!item) {
        setErrorMessage("请先提交一次语音合成任务。");
        return false;
      }
      setNotice(item.full?.url ? "语音合成结果已刷新。" : "语音合成任务状态已刷新。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "语音合成结果刷新失败。");
      return false;
    }
  }, [refreshDigitalHumanSpeechTask]);

  const handleDigitalHumanTemplateTagChange = useCallback(async (tagId: string) => {
    setErrorMessage("");
    setNotice("");
    try {
      await loadDigitalHumanTemplates({
        page: 1,
        size: digitalHumanTemplatePageInfo?.size || 24,
        tagId,
      });
      setNotice(tagId ? "数字人模板已按标签筛选。" : "已恢复全部数字人模板。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "数字人模板刷新失败。");
    }
  }, [digitalHumanTemplatePageInfo?.size, loadDigitalHumanTemplates]);

  const handleLoadMoreDigitalHumanTemplates = useCallback(async () => {
    if (!digitalHumanTemplatePageInfo || digitalHumanTemplatePageInfo.page >= digitalHumanTemplatePageInfo.totalPage) {
      return;
    }
    setErrorMessage("");
    setNotice("");
    try {
      await loadDigitalHumanTemplates({
        page: digitalHumanTemplatePageInfo.page + 1,
        size: digitalHumanTemplatePageInfo.size,
        tagId: digitalHumanTemplateTagId,
      }, true);
      setNotice("已加载更多数字人模板。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载更多数字人模板失败。");
    }
  }, [digitalHumanTemplatePageInfo, digitalHumanTemplateTagId, loadDigitalHumanTemplates]);

  const handleDigitalHumanTemplatePageChange = useCallback(async (page: number) => {
    if (!digitalHumanTemplatePageInfo || page < 1 || page > digitalHumanTemplatePageInfo.totalPage) {
      return;
    }
    setErrorMessage("");
    setNotice("");
    try {
      await loadDigitalHumanTemplates({
        page,
        size: digitalHumanTemplatePageInfo.size || 24,
        tagId: digitalHumanTemplateTagId,
      });
      setNotice(`已切换到数字人模板第 ${page} 页。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "数字人模板分页切换失败。");
    }
  }, [digitalHumanTemplatePageInfo, digitalHumanTemplateTagId, loadDigitalHumanTemplates]);

  const handleToggleDigitalHumanFavoriteTemplate = useCallback(async (templateId: string, nextFavorite: boolean) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能修改数字人模板收藏。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      if (nextFavorite) {
        await saveDouyinDigitalHumanFavoriteTemplate(activeBrandId, templateId);
      } else {
        await deleteDouyinDigitalHumanFavoriteTemplate(activeBrandId, templateId);
      }
      const favorites = await getDouyinDigitalHumanFavoriteTemplates(activeBrandId);
      setDigitalHumanFavoriteTemplates(favorites.items || []);
      setNotice(nextFavorite ? "已收藏数字人模板。" : "已取消收藏数字人模板。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "数字人模板收藏更新失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman]);

  const handleSaveDigitalHumanScriptTemplate = useCallback(async (payload: { name?: string; content?: string; note?: string; isShared?: boolean; category?: string; isArchived?: boolean }) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能保存个人脚本模板。");
      return null;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await createDouyinDigitalHumanScriptTemplate(activeBrandId, payload);
      const templates = await getDouyinDigitalHumanScriptTemplates(activeBrandId);
      setDigitalHumanScriptTemplates(templates.items || []);
      setNotice(response.item.isShared ? `已保存团队共享模板：${response.item.name}` : `已保存个人脚本模板：${response.item.name}`);
      return response.item;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "个人脚本模板保存失败。");
      return null;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman]);

  const handleUpdateDigitalHumanScriptTemplate = useCallback(async (
    templateId: string,
    payload: { name?: string; content?: string; note?: string; isShared?: boolean; category?: string; isArchived?: boolean },
  ) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能编辑个人脚本模板。");
      return null;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await updateDouyinDigitalHumanScriptTemplate(activeBrandId, templateId, payload);
      const templates = await getDouyinDigitalHumanScriptTemplates(activeBrandId);
      setDigitalHumanScriptTemplates(templates.items || []);
      setNotice(response.item.isShared ? `团队共享模板已更新：${response.item.name}` : `个人脚本模板已更新：${response.item.name}`);
      return response.item;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "个人脚本模板更新失败。");
      return null;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman]);

  const handleDeleteDigitalHumanScriptTemplate = useCallback(async (templateId: string) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能删除个人脚本模板。");
      return false;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      await deleteDouyinDigitalHumanScriptTemplate(activeBrandId, templateId);
      const templates = await getDouyinDigitalHumanScriptTemplates(activeBrandId);
      setDigitalHumanScriptTemplates(templates.items || []);
      setNotice("个人脚本模板已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "个人脚本模板删除失败。");
      return false;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman]);

  const handleGenerateDigitalHumanScript = useCallback(async (payload: {
    title?: string;
    personName?: string;
    personSource?: "COMMON" | "CUSTOM";
    templateName?: string;
    materialLabel?: string;
    currentScript?: string;
    userRequirement?: string;
  }) => {
    if (!canEditDigitalHuman) {
      setErrorMessage("当前账号只有查看权限，不能生成数字人口播脚本。");
      return null;
    }
    setIsSubmittingDigitalHuman(true);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await generateDouyinDigitalHumanScript(activeBrandId, payload);
      setNotice(response.item.modelName ? `数字人口播脚本已生成，使用模型：${response.item.modelName}` : "数字人口播脚本已生成。");
      return response.item;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "数字人口播脚本生成失败。");
      return null;
    } finally {
      setIsSubmittingDigitalHuman(false);
    }
  }, [activeBrandId, canEditDigitalHuman]);

  const openGeneratedVideoPreview = useCallback((item: DouyinVideoWorkRecord | DouyinDirectVideoWorkRecord | DouyinDigitalHumanVideoWorkRecord) => {
    if (item.videoUrl) {
      setMaterialLightbox({
        title: item.title,
        url: item.videoUrl,
        type: "VIDEO",
      });
      return;
    }
    const storyboardImageUrl = "storyboardImageUrl" in item ? item.storyboardImageUrl : undefined;
    const referenceImageUrl = "referenceImageUrl" in item ? item.referenceImageUrl : undefined;
    if (storyboardImageUrl || item.coverImageUrl || referenceImageUrl) {
      setMaterialLightbox({
        title: storyboardImageUrl ? `${item.title} 故事板` : `${item.title} 参考图`,
        url: storyboardImageUrl || item.coverImageUrl || referenceImageUrl || "",
        type: "IMAGE",
      });
    }
  }, []);

  const shiftMaterialPreview = useCallback((materialId: string, total: number, delta: number) => {
    if (!materialId || total <= 0) {
      return;
    }
    setMaterialPreviewIndexMap((current) => {
      const nextIndex = ((current[materialId] ?? 0) + delta + total) % total;
      return {
        ...current,
        [materialId]: nextIndex,
      };
    });
  }, []);

  const openMaterialLightbox = useCallback((payload: MediaLightboxState) => {
    setMaterialLightbox(payload);
  }, []);

  const handleDeleteOpenClawCreativeMaterial = useCallback(async (materialId: string) => {
    if (!canEditCurrentSection) {
      setErrorMessage("当前账号只有查看权限，不能删除创作素材。");
      return;
    }
    setDeletingOpenClawCreativeMaterialId(materialId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawCreativeMaterial(materialId, activeBrandId, "douyin");
      setOpenClawCreativeMaterialWorkspace(response.workspace);
      setNotice("创作素材已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除创作素材失败。");
    } finally {
      setDeletingOpenClawCreativeMaterialId("");
    }
  }, [activeBrandId, canEditCurrentSection]);

  const handleDeleteOpenClawDailyPlan = useCallback(async (planId: string) => {
    if (!canEditCurrentSection) {
      setErrorMessage("当前账号只有查看权限，不能删除每日计划。");
      return;
    }
    setDeletingOpenClawDailyPlanId(planId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawDailyPlan(planId, activeBrandId, "douyin");
      setOpenClawDailyPlanWorkspace(response.workspace);
      setNotice("每日计划已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除每日计划失败。");
    } finally {
      setDeletingOpenClawDailyPlanId("");
    }
  }, [activeBrandId, canEditCurrentSection]);

  const handleDeleteOpenClawDiary = useCallback(async (diaryId: string) => {
    if (!canEditCurrentSection) {
      setErrorMessage("当前账号只有查看权限，不能删除每周复盘。");
      return;
    }
    setDeletingOpenClawDiaryId(diaryId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawLobsterDiary(diaryId, activeBrandId, "douyin");
      setOpenClawLobsterDiaryWorkspace(response.workspace);
      setNotice("每周复盘已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除每周复盘失败。");
    } finally {
      setDeletingOpenClawDiaryId("");
    }
  }, [activeBrandId, canEditCurrentSection]);

  const handleUpdateOpenClawDiary = useCallback(async (
    diaryId: string,
    payload: {
      diaryDate: string;
      title: string;
      content: string;
    },
  ) => {
    if (!canEditCurrentSection) {
      throw new Error("当前账号只有查看权限，不能编辑每周复盘。");
    }
    setUpdatingOpenClawDiaryId(diaryId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await updateOpenClawLobsterDiary(diaryId, activeBrandId, {
        workspaceScope: "douyin",
        ...payload,
      });
      setOpenClawLobsterDiaryWorkspace(response.workspace);
      setNotice("每周复盘已保存。");
      return response.item;
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存每周复盘失败。";
      setErrorMessage(message);
      throw error;
    } finally {
      setUpdatingOpenClawDiaryId("");
    }
  }, [activeBrandId, canEditCurrentSection]);

  const handleDeleteOpenClawStrategyOptimization = useCallback(async (recordId: string) => {
    if (!canEditCurrentSection) {
      setErrorMessage("当前账号只有查看权限，不能删除策略优化记录。");
      return;
    }
    setDeletingOpenClawStrategyOptimizationId(recordId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawStrategyOptimization(recordId, activeBrandId, "douyin");
      setOpenClawStrategyOptimizationWorkspace(response.workspace);
      setNotice("策略优化记录已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除策略优化记录失败。");
    } finally {
      setDeletingOpenClawStrategyOptimizationId("");
    }
  }, [activeBrandId, canEditCurrentSection]);

  const handleUpdateOpenClawStrategyOptimization = useCallback(async (
    recordId: string,
    payload: {
      title: string;
      content: string;
    },
  ) => {
    if (!canEditCurrentSection) {
      throw new Error("当前账号只有查看权限，不能编辑策略优化记录。");
    }
    setUpdatingOpenClawStrategyOptimizationId(recordId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await updateOpenClawStrategyOptimization(recordId, activeBrandId, {
        workspaceScope: "douyin",
        ...payload,
      });
      setOpenClawStrategyOptimizationWorkspace(response.workspace);
      setNotice("策略优化记录已保存。");
      return response.item;
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存策略优化记录失败。";
      setErrorMessage(message);
      throw error;
    } finally {
      setUpdatingOpenClawStrategyOptimizationId("");
    }
  }, [activeBrandId, canEditCurrentSection]);

  const handleDeleteOpenClawVideoWork = useCallback(async (workId: string) => {
    if (!canEditCurrentSection) {
      setErrorMessage("当前账号只有查看权限，不能删除视频作品。");
      return;
    }
    setDeletingOpenClawVideoWorkId(workId);
    setErrorMessage("");
    setNotice("");
    try {
      const response = await deleteOpenClawVideoWork(workId, activeBrandId, "douyin");
      setOpenClawVideoWorkWorkspace(response.workspace);
      setNotice("视频作品已删除。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除视频作品失败。");
    } finally {
      setDeletingOpenClawVideoWorkId("");
    }
  }, [activeBrandId, canEditCurrentSection]);

  return (
    <main className={`archive-shell strategy-shell ${props.embedded ? "strategy-shell--embedded" : ""}`}>
      <section className={`strategy-layout ${props.embedded ? "strategy-layout--embedded" : ""}`}>
          {!hasWorkspaceAccess ? (
            <div className="strategy-content-panel">
              <article className={`workspace-panel strategy-page-header ${props.embedded ? "strategy-page-header--embedded" : ""}`}>
                <div>
                  <strong>当前无权限进入抖音工作区</strong>
                  <p>当前账号未获得抖音板块的查看权限，请联系管理员在团队权限设置中为对应板块勾选可见权限。</p>
                </div>
                <div className="strategy-page-header-actions">
                  <div className="workspace-status">
                    <span className="archive-pill status-pending">当前板块只读</span>
                    <span className="status-text error-text">当前账号没有抖音板块的查看权限，请联系管理员开通后再进入。</span>
                  </div>
                </div>
              </article>
            </div>
          ) : (
            <>
              {props.embedded ? null : (
              <aside className="strategy-level-panel strategy-level-panel--directory">
                <div className="strategy-level-button-list">
                  {visiblePrimarySections.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`strategy-level-button strategy-level-button--section ${item.key === activeSection ? "is-active" : ""}`}
                      onClick={() => setActiveSection(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                {visibleOpenClawSections.length ? (
                  <div className="strategy-directory-group">
                    <div className="strategy-directory-group__title">OpenClaw板块</div>
                    <div className="strategy-level-button-list strategy-level-button-list--nested">
                      {visibleOpenClawSections.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={`strategy-level-button strategy-level-button--nested ${item.key === activeSection ? "is-active" : ""}`}
                          onClick={() => setActiveSection(item.key)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </aside>
              )}

              <div className="strategy-content-panel">
                {props.embedded ? null : (
                <article className="workspace-panel strategy-page-header">
                  <div>
                    <strong>{heroTitle}</strong>
                    <p>{heroDescription}</p>
                  </div>
                  <div className="strategy-page-header-actions">
                    <div className="workspace-status">
                      <span className={`archive-pill ${canEditCurrentSection ? "status-ready" : "status-pending"}`}>
                        {canEditCurrentSection ? "当前板块可编辑" : "当前板块只读"}
                      </span>
                      <span className={`archive-pill ${loadState === "api" ? "status-ready" : loadState === "partial" ? "status-pending" : "status-in_progress"}`}>
                        {loadState === "api" ? "接口数据" : loadState === "partial" ? "部分接口降级" : "加载中"}
                      </span>
                      {isLoading ? <span className="status-text">正在加载抖音工作台...</span> : null}
                      {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
                      {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
                    </div>
                    <div className="strategy-inline-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void loadWorkspace(undefined, { forceShared: true })}
                        disabled={isLoading || isGenerating || isGeneratingHotTopics || isSubmittingOriginalCopy || isSubmittingRemixCopy || isSubmittingVideo || isSubmittingDirectVideo || isSubmittingDigitalHuman || isSubmittingAdPreAudit || isSaving || isDeleting}
                      >
                        刷新数据
                      </button>
                    </div>
                  </div>
                </article>
                )}

                {activeSection === "openclawCreativeMaterials" ? (
                  <OpenClawCreativeMaterialWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    canDelete={canEditCurrentSection}
                    items={openClawCreativeMaterialWorkspace.items}
                    deletingMaterialId={deletingOpenClawCreativeMaterialId}
                    onRefresh={loadWorkspace}
                    onDelete={handleDeleteOpenClawCreativeMaterial}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "openclawDailyPlan" ? (
                  <OpenClawDailyPlanWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    canDelete={canEditCurrentSection}
                    items={openClawDailyPlanWorkspace.items}
                    deletingPlanId={deletingOpenClawDailyPlanId}
                    onRefresh={loadWorkspace}
                    onDelete={handleDeleteOpenClawDailyPlan}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "openclawLobsterDiary" ? (
                  <OpenClawLobsterDiaryWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    canEdit={canEditCurrentSection}
                    canDelete={canEditCurrentSection}
                    items={openClawLobsterDiaryWorkspace.items}
                    deletingDiaryId={deletingOpenClawDiaryId}
                    updatingDiaryId={updatingOpenClawDiaryId}
                    onRefresh={loadWorkspace}
                    onUpdate={handleUpdateOpenClawDiary}
                    onDelete={handleDeleteOpenClawDiary}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "openclawStrategyOptimization" ? (
                  <OpenClawStrategyOptimizationWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    canEdit={canEditCurrentSection}
                    canDelete={canEditCurrentSection}
                    items={openClawStrategyOptimizationWorkspace.items}
                    deletingRecordId={deletingOpenClawStrategyOptimizationId}
                    updatingRecordId={updatingOpenClawStrategyOptimizationId}
                    onRefresh={() => loadWorkspace("openclawStrategyOptimization")}
                    onUpdate={handleUpdateOpenClawStrategyOptimization}
                    onDelete={handleDeleteOpenClawStrategyOptimization}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "openclawVideoWorks" ? (
                  <OpenClawVideoWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    canDelete={canEditCurrentSection}
                    canPublish={canEditCurrentSection}
                    items={openClawVideoWorkWorkspace.items}
                    deletingWorkId={deletingOpenClawVideoWorkId}
                    onRefresh={loadWorkspace}
                    onDelete={handleDeleteOpenClawVideoWork}
                    onPublish={handleOpenPublishModal}
                    onWechatChannelPublish={handleOpenWechatChannelPublishModal}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "hotTopics" ? (
                  <DouyinHotTopicCandidatesWorkspacePanel
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading || isGeneratingHotTopics}
                    canEdit={canEditHotTopics}
                    canEditTopicLibrary={canEditTopicLibrary}
                    canViewTopicLibrary={canViewTopicLibrary}
                    availableDates={hotTopicWorkspace.availableDates}
                    selectedDate={selectedHotTopicDate}
                    latest={latestHotTopicResult}
                    latestTask={latestHotTopicTask}
                    selectedTopicIds={selectedTopicIds}
                    isSavingTopicLibrary={isSavingTopicLibrary}
                    onRefresh={async () => {
                      await refreshHotTopicWorkspace(selectedHotTopicDate);
                    }}
                    onDateChange={handleHotTopicDateChange}
                    onGenerate={handleGenerateHotTopics}
                    onToggleTopic={handleToggleTopic}
                    onAddSelectedTopics={handleAddSelectedTopics}
                    onOpenTopicLibrary={canViewTopicLibrary ? () => setActiveSection("topicLibrary") : undefined}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "topicLibrary" ? (
                  <DouyinTopicLibraryWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    canEdit={canEditTopicLibrary}
                    items={hotTopicWorkspace.topicLibrary || []}
                    isSaving={isSavingTopicLibrary}
                    onRefresh={async () => {
                      await refreshHotTopicWorkspace();
                    }}
                    onSaveTopic={handleSaveTopic}
                    onDeleteTopic={handleDeleteTopic}
                    formatDateTime={formatDateTime}
                    hotTopicProps={{
                      canEdit: canEditHotTopics,
                      availableDates: hotTopicWorkspace.availableDates,
                      selectedDate: selectedHotTopicDate,
                      latest: latestHotTopicResult,
                      latestTask: latestHotTopicTask,
                      selectedTopicIds: selectedTopicIds,
                      isSavingTopicLibrary: isSavingTopicLibrary,
                      onRefresh: async () => {
                        await refreshHotTopicWorkspace(selectedHotTopicDate);
                      },
                      onDateChange: handleHotTopicDateChange,
                      onGenerate: handleGenerateHotTopics,
                      onToggleTopic: handleToggleTopic,
                      onAddSelectedTopics: handleAddSelectedTopics,
                    }}
                  />
                ) : activeSection === "originalCopy" ? (
                  <DouyinOriginalCopyWorkspacePanel
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingOriginalCopy}
                    canEdit={canEditOriginalCopy}
                    history={originalCopyWorkspace.history}
                    latestTask={originalCopyWorkspace.latestTask}
                    calendarOptions={originalCopyWorkspace.calendarOptions.map((item) => ({ id: item.id, label: item.label }))}
                    topicOptions={originalCopyWorkspace.topicOptions.map((item) => ({ id: item.id, label: item.topicTitle || item.topicContent }))}
                    hasMarketingPlan={originalCopyWorkspace.hasMarketingPlan}
                    marketingPlanTitle={originalCopyWorkspace.marketingPlanTitle}
                    onRefresh={async () => {
                      await refreshOriginalCopyWorkspace();
                    }}
                    onCreate={handleCreateOriginalCopy}
                    onUpdate={handleUpdateOriginalCopy}
                    onDelete={handleDeleteOriginalCopy}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "remixCopy" ? (
                  <DouyinRemixCopyWorkspacePanel
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingRemixCopy}
                    canEdit={canEditRemixCopy}
                    history={remixCopyWorkspace.history}
                    latestTask={remixCopyWorkspace.latestTask}
                    materialOptions={remixCopyWorkspace.materialOptions.map((item) => ({ id: item.id, label: item.title }))}
                    productOptions={remixCopyWorkspace.productOptions.map((item) => ({ id: item.id, label: item.productName }))}
                    hasMarketingPlan={remixCopyWorkspace.hasMarketingPlan}
                    marketingPlanTitle={remixCopyWorkspace.marketingPlanTitle}
                    onRefresh={async () => {
                      await refreshRemixCopyWorkspace();
                    }}
                    onCreate={handleCreateRemixCopy}
                    onUpdate={handleUpdateRemixCopy}
                    onDelete={handleDeleteRemixCopy}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "remixShortVideo" ? (
                  <DouyinRemixShortVideoWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingVideo}
                    canEdit={canEditRemixShortVideo}
                    items={remixShortVideoWorks}
                    materialOptions={unifiedMaterialOptions.map((item) => ({ id: item.id, label: item.label, videoUrl: item.videoUrl }))}
                    productOptions={remixCopyWorkspace.productOptions.map((item) => ({ id: item.id, label: item.productName }))}
                    videoProviderOptions={videoProviderOptions}
                    storyboardImageModelOptions={storyboardImageModelOptions}
                    hasMarketingPlan={hasVideoMarketingPlan}
                    marketingPlanTitle={videoMarketingPlanTitle}
                    onRefresh={async () => {
                      await refreshRemixShortVideoWorkspace();
                    }}
                    onPreview={openGeneratedVideoPreview as never}
                    onCreate={handleCreateRemixShortVideo}
                    onGenerateVideo={handleGenerateRemixShortVideo}
                    onDelete={handleDeleteRemixShortVideo}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "video" ? (
                  <DouyinVideoStoryboardWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingVideo}
                    canEdit={canEditVideo}
                    items={videoWorks}
                    calendarOptions={originalCopyWorkspace.calendarOptions.map((item) => ({ id: item.id, label: item.label }))}
                    productOptions={remixCopyWorkspace.productOptions.map((item) => ({ id: item.id, label: item.productName }))}
                    materialOptions={unifiedMaterialOptions.map((item) => ({ id: item.id, label: item.label, videoUrl: item.videoUrl }))}
                    videoProviderOptions={videoProviderOptions}
                    storyboardImageModelOptions={storyboardImageModelOptions}
                    hasMarketingPlan={hasVideoMarketingPlan}
                    marketingPlanTitle={videoMarketingPlanTitle}
                    onRefresh={async () => {
                      await refreshVideoWorkspace();
                    }}
                    onPreview={openGeneratedVideoPreview}
                    onCreate={handleCreateVideo}
                    onUpdate={handleUpdateVideo}
                    onDelete={handleDeleteVideo}
                    onRegenerateStoryboard={handleRegenerateVideoStoryboard}
                    onGenerateVideo={handleGenerateVideo}
                    onRecoverVideo={handleRecoverVideo}
                    onOpenPublishModal={handleOpenPublishModal}
                    onOpenWechatChannelPublishModal={handleOpenWechatChannelPublishModal}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "videoDirect" ? (
                  <DouyinDirectVideoWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingDirectVideo}
                    canEdit={canEditDirectVideo}
                    items={directVideoWorks}
                    calendarOptions={originalCopyWorkspace.calendarOptions.map((item) => ({ id: item.id, label: item.label }))}
                    productOptions={remixCopyWorkspace.productOptions.map((item) => ({ id: item.id, label: item.productName }))}
                    materialOptions={unifiedMaterialOptions.map((item) => ({ id: item.id, label: item.label, videoUrl: item.videoUrl }))}
                    videoProviderOptions={directVideoProviderOptions}
                    hasMarketingPlan={hasVideoMarketingPlan}
                    marketingPlanTitle={videoMarketingPlanTitle}
                    onRefresh={async () => {
                      await refreshDirectVideoWorkspace();
                    }}
                    onPreview={openGeneratedVideoPreview}
                    onCreate={handleCreateDirectVideo}
                    onUpdate={handleUpdateDirectVideo}
                    onDelete={handleDeleteDirectVideo}
                    onGenerateVideo={handleGenerateDirectVideo}
                    onRecoverVideo={handleRecoverDirectVideo}
                    onOpenPublishModal={handleOpenPublishModal}
                    onOpenWechatChannelPublishModal={handleOpenWechatChannelPublishModal}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "digitalHuman" ? (
                  <DouyinDigitalHumanWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingDigitalHuman}
                    canEdit={canEditDigitalHuman}
                    items={digitalHumanWorks}
                    customPersons={digitalHumanCustomPersons}
                    lipSyncItems={digitalHumanLipSyncWorks}
                    publicVoices={digitalHumanPublicVoices}
                    customVoices={digitalHumanCustomVoices}
                    publicVoicePageInfo={digitalHumanPublicVoicePageInfo}
                    customVoicePageInfo={digitalHumanCustomVoicePageInfo}
                    publicVoiceLoadError={digitalHumanPublicVoiceError}
                    customVoiceLoadError={digitalHumanCustomVoiceError}
                    currentSpeechTask={digitalHumanCurrentSpeechTask}
                    currentSpeechTaskId={digitalHumanCurrentSpeechTaskId}
                    originalCopyLatest={originalCopyWorkspace.latest}
                    originalCopyHistory={originalCopyWorkspace.history}
                    originalCopyTaskStatus={originalCopyWorkspace.latestTask?.taskStatus}
                    remixCopyLatest={remixCopyWorkspace.latest}
                    remixCopyHistory={remixCopyWorkspace.history}
                    remixCopyTaskStatus={remixCopyWorkspace.latestTask?.taskStatus}
                    originalCopyCalendarOptions={originalCopyWorkspace.calendarOptions.map((item) => ({ id: item.id, label: item.label }))}
                    originalCopyTopicOptions={originalCopyWorkspace.topicOptions.map((item) => ({ id: item.id, label: item.topicTitle || item.topicContent }))}
                    remixCopyProductOptions={remixCopyWorkspace.productOptions.map((item) => ({ id: item.id, label: item.productName }))}
                    templateTagGroups={digitalHumanTemplateTags}
                    templates={digitalHumanTemplates}
                    favoriteTemplateIds={digitalHumanFavoriteTemplates.map((item) => item.templateId)}
                    personalScriptTemplates={digitalHumanScriptTemplates}
                    materialLibraryItems={materialLibraryItems}
                    templatePageInfo={digitalHumanTemplatePageInfo}
                    activeTagId={digitalHumanTemplateTagId}
                    templateLoadError={digitalHumanTemplateError}
                    templateTagLoadError={digitalHumanTemplateTagError}
                    isTemplateLoading={isDigitalHumanTemplateLoading}
                    hasLoadedEditorResources={hasLoadedDigitalHumanEditorResources}
                    onRefresh={async () => {
                      await refreshDigitalHumanWorkspace();
                    }}
                    onEnsureEditorResources={async () => {
                      await ensureDigitalHumanEditorResources();
                    }}
                    onTemplateTagChange={handleDigitalHumanTemplateTagChange}
                    onTemplatePageChange={handleDigitalHumanTemplatePageChange}
                    onToggleFavoriteTemplate={handleToggleDigitalHumanFavoriteTemplate}
                    onSaveScriptTemplate={handleSaveDigitalHumanScriptTemplate}
                    onUpdateScriptTemplate={handleUpdateDigitalHumanScriptTemplate}
                    onDeleteScriptTemplate={handleDeleteDigitalHumanScriptTemplate}
                    onPreview={openGeneratedVideoPreview}
                    onCreate={handleCreateDigitalHuman}
                    onCreateCompleteVideo={handleCreateDigitalHumanCompleteVideo}
                    onCreateCustomPerson={handleCreateDigitalHumanCustomPerson}
                    onCreateLipSync={handleCreateLipSync}
                    onRecoverVideo={handleRecoverDigitalHuman}
                    onRecoverLipSync={handleRecoverLipSync}
                    onDeleteCustomPerson={handleDeleteDigitalHumanCustomPerson}
                    onDelete={handleDeleteDigitalHuman}
                    onDeleteLipSync={handleDeleteLipSync}
                    onRefreshPublicVoices={handleRefreshDigitalHumanPublicVoices}
                    onRefreshCustomVoices={handleRefreshDigitalHumanCustomVoices}
                    onCreateCustomVoice={handleCreateDigitalHumanCustomVoice}
                    onDeleteCustomVoice={handleDeleteDigitalHumanCustomVoice}
                    onCreateSpeechTask={handleCreateDigitalHumanSpeechTask}
                    onGenerateScript={handleGenerateDigitalHumanScript}
                    onRefreshSpeechTask={handleRefreshDigitalHumanSpeechTask}
                    onCreateOriginalCopy={handleCreateOriginalCopy}
                    onCreateRemixCopy={handleCreateRemixCopy}
                    onOpenPublishModal={handleOpenPublishModal}
                    onOpenWechatChannelPublishModal={handleOpenWechatChannelPublishModal}
                    formatDateTime={formatDateTime}
                  />
                ) : activeSection === "runningHub" ? (
                  <DouyinRunningHubWorkspace
                    brandId={activeBrandId}
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    canEdit={Boolean(permissionMap?.["douyin.runningHub"]?.edit)}
                    formatDateTime={formatDateTime}
                    materialLibraryItems={materialLibraryItems}
                  />
                ) : activeSection === "adPreAudit" ? (
                  <DouyinAdPreAuditWorkspace
                    sectionLabel={currentSection.label}
                    sectionDescription={currentSection.description}
                    isLoading={isLoading}
                    isSubmitting={isSubmittingAdPreAudit}
                    canEdit={canEditAdPreAudit}
                    config={adPreAuditConfig}
                    mediaAssets={adPreAuditMediaAssets}
                    items={adPreAuditWorks}
                    onRefresh={async () => {
                      await refreshAdPreAuditWorkspace();
                    }}
                    onSaveConfig={handleSaveAdPreAuditConfig}
                    onUploadMedia={handleUploadAdPreAuditMedia}
                    onRefreshUpload={handleRefreshAdPreAuditUpload}
                    onCreate={handleCreateAdPreAudit}
                    onRefreshItem={handleRefreshAdPreAudit}
                    onDelete={handleDeleteAdPreAudit}
                    formatDateTime={formatDateTime}
                  />
                ) : (
                <article className="workspace-panel strategy-page-card">
                  <div className="strategy-card-toolbar">
                    <div>
                      <strong>{currentSection.label}</strong>
                      <p className="text-xs text-slate-500 mt-2">{currentSection.description}</p>
                    </div>
                    <div className="strategy-inline-actions">
                      {latestMarketingPlan ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => void handleDelete()}
                          disabled={!canEditMarketingPlan || isDeleting || isGenerating || isTaskActive}
                        >
                          {isDeleting ? "删除中..." : "删除"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleOpenGenerateDialog()}
                        disabled={!canEditMarketingPlan || isGenerating || !canGenerateMarketingPlan || isTaskActive}
                      >
                        {isGenerating ? "提交中..." : isTaskActive ? "后台生成中..." : latestMarketingPlan ? "重新生成" : "一键生成"}
                      </button>
                    </div>
                  </div>

                  <article className="light-data-panel report-editor-panel report-editor-panel--compact">
                    <div className="report-editor-head">
                      <div>
                        <strong>{latestMarketingPlan?.title || "抖音营销策划方案"}</strong>
                      </div>
                      <div className="report-editor-actions">
                        <span className={`archive-pill ${canGenerateMarketingPlan ? "status-ready" : "status-in_progress"}`}>
                          {canGenerateMarketingPlan ? "已满足生成条件" : "等待前置输入"}
                        </span>
                        {latestTask ? (
                          <span className={`archive-pill ${getTaskStatusClass(latestTask.taskStatus)}`}>{getTaskStatusText(latestTask)}</span>
                        ) : null}
                        {latestMarketingPlan?.generatedAt ? (
                          <span className="archive-pill status-ready">{formatDateTime(latestMarketingPlan.generatedAt)}</span>
                        ) : null}
                        {latestMarketingPlan?.modelName ? <span className="archive-pill status-pending">{latestMarketingPlan.modelName}</span> : null}
                        <span className={`archive-pill ${canEditMarketingPlan ? "status-ready" : "status-pending"}`}>
                          {canEditCurrentSection ? "当前板块可编辑" : "当前板块只读"}
                        </span>
                        {latestMarketingPlan ? (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void handleSave()}
                            disabled={!canEditMarketingPlan || isSaving || isGenerating || isDeleting || isTaskActive}
                          >
                            {isSaving ? "保存中..." : "保存报告"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {!canGenerateMarketingPlan ? (
                      <div className="report-inline-tip">请先准备品牌背景资料、产品资料库、机会洞察总报告和品牌增长报告，再开始生成。</div>
                    ) : null}
                    {isTaskActive ? (
                      <div className="report-inline-tip">
                        {latestTask?.taskStatus === "QUEUED"
                          ? "正在排队生成，页面会自动刷新结果。"
                          : latestTask?.phaseText
                            ? `${latestTask.phaseText}${latestTask.phaseIndex && latestTask.phaseTotal ? `（${latestTask.phaseIndex}/${latestTask.phaseTotal}）` : ""}`
                            : "正在后台生成，完成后会自动刷新到编辑区。"}
                      </div>
                    ) : null}
                    {!canEditMarketingPlan ? <div className="report-inline-tip">当前账号只有查看权限，不能编辑、删除或重新生成该板块内容。</div> : null}

                    {!latestMarketingPlan ? (
                      <div className="empty-state">当前还没有抖音营销策划方案，点击右上角“一键生成”开始。</div>
                    ) : (
                      <div className="report-editor-grid">
                        <label className="report-editor-pane">
                          <span>Markdown 内容</span>
                          <textarea
                            className="report-markdown-textarea"
                            value={marketingPlanDraft}
                            onChange={(event) => setMarketingPlanDraft(event.target.value)}
                            readOnly={!canEditMarketingPlan}
                            placeholder="这里显示并编辑抖音营销策划方案 Markdown 内容"
                          />
                        </label>
                        <article className="report-editor-pane">
                          <span>预览</span>
                          <div className="generated-report-html" dangerouslySetInnerHTML={{ __html: marketingPlanPreviewHtml }} />
                        </article>
                      </div>
                    )}
                  </article>
                  {isMarketingPlanGenerateDialogOpen ? (
                    <div className="media-preview-overlay" onClick={handleCloseGenerateDialog}>
                      <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="media-preview-close" onClick={handleCloseGenerateDialog} disabled={isGenerating}>
                          关闭
                        </button>
                        <article className="entity-card personal-card">
                          <div className="entity-card-head">
                            <div>
                              <strong>生成抖音营销策划方案</strong>
                              <p className="personal-meta">确认本次输入范围，并可补充本次生成要求。</p>
                            </div>
                          </div>
                          <div className="personal-list">
                            <article className="report-editor-pane">
                              <span>本次输入</span>
                              <div className="report-inline-tip">
                                {MARKETING_PLAN_REQUIRED_INPUTS.map((item, index) => `${index + 1}. ${item}`).join("；")}
                              </div>
                            </article>
                            <label className="report-editor-pane">
                              <span>用户要求</span>
                              <textarea
                                className="report-content-textarea"
                                value={marketingPlanUserRequirement}
                                onChange={(event) => setMarketingPlanUserRequirement(event.target.value)}
                                placeholder="可选填写本次营销策划方案的补充要求，例如重点产品、内容风格、资源限制或阶段目标。"
                              />
                            </label>
                            <div className="strategy-inline-actions">
                              <button type="button" className="primary-button" onClick={() => void handleGenerate()} disabled={isGenerating}>
                                {isGenerating ? "提交中..." : "提交"}
                              </button>
                              <button type="button" className="secondary-button" onClick={handleCloseGenerateDialog} disabled={isGenerating}>
                                取消
                              </button>
                            </div>
                          </div>
                        </article>
                      </div>
                    </div>
                  ) : null}
                </article>
                )}
                <MediaLightbox state={materialLightbox} onClose={() => setMaterialLightbox(null)} />
              </div>
            </>
          )}
      </section>
      <DouyinPublishModal
        publishTarget={publishingTarget}
        platformAccounts={brandArchive.platformAccounts}
        publishingAccountValue={publishingAccountValue}
        isDesktopExtensionReady={isDesktopExtensionReady}
        isCreatingDesktopPublishSession={isCreatingDesktopPublishSession}
        activeDesktopPublishSession={activeDesktopPublishSession}
        notice={notice}
        errorMessage={errorMessage}
        onClose={handleClosePublishModal}
        onAccountChange={setPublishingAccountValue}
        onCreateDesktopSession={handleCreateDesktopPublishSession}
        formatDateTime={formatDateTime}
      />
      <WechatChannelPublishModal
        publishTarget={wechatChannelPublishingTarget}
        isExtensionReady={isWechatChannelExtensionReady}
        isLaunching={isLaunchingWechatChannelProbe}
        notice={wechatChannelNotice}
        errorMessage={wechatChannelErrorMessage}
        probeResult={wechatChannelProbeResult}
        activeSession={activeWechatChannelSession}
        onClose={handleCloseWechatChannelPublishModal}
        onStartPublishProbe={handleStartWechatChannelPublishProbe}
      />
    </main>
  );
}

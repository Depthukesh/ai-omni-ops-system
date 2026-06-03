"use client";

import { useEffect, useMemo, useState } from "react";
import { type DouyinOriginalCopyRecord, type DouyinRemixCopyRecord } from "../../../services/reports";
import {
  type DigitalHumanFigureType,
  type GenerateDouyinDigitalHumanCompleteVideoForm,
  type GenerateDouyinDigitalHumanVideoForm,
  type DigitalHumanTemplatePageInfo,
  type DigitalHumanTemplateRecord,
  type DigitalHumanTemplateTagGroupRecord,
  type DouyinCustomVoiceRecord,
  type DouyinDigitalHumanCustomPersonRecord,
  type DouyinLipSyncWorkRecord,
  type DouyinDigitalHumanScriptTemplateRecord,
  type DouyinDigitalHumanVideoWorkRecord,
  type DouyinSpeechTaskRecord,
  type DouyinVoiceLibraryRecord,
  type VoiceLibraryPageInfo,
} from "../../../services/works";
import { DigitalHumanHomePanel } from "./digital-human-home-panel";
import { DigitalHumanCustomPersonWorkspace } from "./digital-human-custom-person-workspace";
import { DigitalHumanLipSyncWorkspace } from "./digital-human-lip-sync-workspace";
import { DigitalHumanPlaceholderPanel } from "./digital-human-placeholder-panel";
import { DigitalHumanTemplateLibrary } from "./digital-human-template-library";
import { DigitalHumanVoiceLibraryWorkspace } from "./digital-human-voice-library-workspace";
import { DigitalHumanVideoPanel } from "./digital-human-video-panel";
import { DigitalHumanWorksCenterPanel } from "./digital-human-works-center-panel";
import { WorkspaceSectionHeader } from "../xiaohongshu/note-workspace-shared-panels";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

const PAGE_SIZE = 18;
const DIGITAL_HUMAN_TEMPLATE_RECENTS_STORAGE_KEY = "douyin-digital-human-template-recents";
const DIGITAL_HUMAN_SCRIPT_PRESETS = [
  {
    key: "brand-promo",
    label: "品牌宣传",
    content: "开头先抛出一个品牌价值钩子，再用 2 到 3 句讲清核心卖点、适用人群和使用场景，结尾补一句行动引导。",
  },
  {
    key: "activity-promo",
    label: "活动促销",
    content: "第一句直接说活动力度或限时福利，第二句强调人群和购买理由，第三句补充时间节点和下单引导，整体节奏要快。",
  },
  {
    key: "knowledge-share",
    label: "知识分享",
    content: "先点出一个常见误区或痛点，再给出 2 到 3 条实用建议，最后补一句总结和关注引导，语气自然像真人口播。",
  },
  {
    key: "live-warmup",
    label: "直播预热",
    content: "开头直接告诉用户直播时间和主题，中间突出直播专属福利、重点产品或亮点内容，结尾引导用户预约或蹲守直播间。",
  },
] as const;

type DigitalHumanEditorDiffEntry = {
  key: string;
  label: string;
  currentValue: string;
  selectedValue: string;
};

type DigitalHumanMaterialLibraryItem = {
  id: string;
  label: string;
  videoUrl?: string;
  coverUrl?: string;
  workUrl?: string;
  sourceLabel?: string;
};

type DigitalHumanCreatorDraftCard = {
  id: string;
  name: string;
  personSource: "COMMON" | "CUSTOM";
  selectedTemplateId: string;
  selectedCustomPersonId: string;
  selectedFigureType: DigitalHumanFigureType;
  selectedVoiceMode: "DEFAULT" | "PUBLIC" | "CUSTOM";
  selectedPublicVoiceId: string;
  selectedCustomVoiceId: string;
  selectedMaterialLibraryItemId: string;
  title: string;
  script: string;
  speechRate: string;
  pitch: string;
  volume: string;
  backgroundColor: string;
  backgroundImageFile: File | null;
  backgroundImageUrl: string;
  backgroundImageName: string;
  subtitleEnabled: boolean;
  subtitlePositionX: string;
  subtitlePositionY: string;
  subtitleWidth: string;
  subtitleHeight: string;
  subtitleFontSize: string;
  subtitleTextColor: string;
  subtitleStrokeColor: string;
  subtitleStrokeWidth: string;
  subtitleFontId: string;
  addComplianceWatermark: boolean;
  screenWidth: string;
  screenHeight: string;
};

type DigitalHumanCreatorDraftCardSummary = {
  id: string;
  name: string;
  personSource: "COMMON" | "CUSTOM";
  personLabel: string;
  voiceLabel: string;
  materialLabel?: string;
  title: string;
  scriptPreview: string;
  scriptLength: number;
  subtitleEnabled: boolean;
  addComplianceWatermark: boolean;
  previewImageUrl?: string;
  previewVideoUrl?: string;
  materialPreviewVideoUrl?: string;
  materialPreviewImageUrl?: string;
  materialWorkUrl?: string;
};

type PersonalScriptTemplateSort = "UPDATED_DESC" | "UPDATED_ASC" | "NAME_ASC" | "NAME_DESC";
type PersonalScriptTemplateFilter = "ALL" | "SELF" | "SHARED";
type PersonalScriptTemplateArchiveFilter = "ACTIVE" | "ARCHIVED" | "ALL";
type PersonalScriptTemplateGovernanceFilter = "ALL" | "NEED_NOTE" | "READONLY_SHARED" | "SHARED_ACTIVE" | "ARCHIVED";
type ScriptTemplateCategory = "general" | "brand_promo" | "activity_promo" | "knowledge" | "live_warmup" | "selling";
type DigitalHumanWorkspaceTab = "home" | "templateLibrary" | "voiceLibrary" | "videoStudio" | "worksCenter" | "customPerson" | "lipSync";
type PendingAutoApplyCopy = {
  source: "ORIGINAL" | "REMIX";
  baselineId?: string;
  scriptSnapshot: string;
  titleSnapshot: string;
};

const DIGITAL_HUMAN_WORKSPACE_TABS: Array<{ key: DigitalHumanWorkspaceTab; label: string; description: string }> = [
  { key: "home", label: "首页", description: "先看我的数字人、公共数字人和最近作品，再进入创作主流程。" },
  { key: "videoStudio", label: "创作作品", description: "基于选中数字人填写脚本和参数，提交数字人视频。" },
  { key: "templateLibrary", label: "模板库", description: "继续保留为深度资源页，负责筛选并预览公共数字人模板。" },
  { key: "voiceLibrary", label: "语音库", description: "继续保留为深度资源页，负责浏览公共声音、管理我的声音和语音创作。" },
  { key: "worksCenter", label: "作品中心", description: "查看数字人视频结果、失败任务和找回进度。" },
];

const DIGITAL_HUMAN_SCRIPT_TEMPLATE_CATEGORIES: Array<{ value: ScriptTemplateCategory; label: string }> = [
  { value: "general", label: "通用模板" },
  { value: "brand_promo", label: "品牌宣传" },
  { value: "activity_promo", label: "活动促销" },
  { value: "knowledge", label: "知识分享" },
  { value: "live_warmup", label: "直播预热" },
  { value: "selling", label: "带货转化" },
];

function normalizeScriptTemplateCategory(value?: string): ScriptTemplateCategory {
  switch (String(value || "").trim().toLowerCase()) {
    case "brand_promo":
    case "activity_promo":
    case "knowledge":
    case "live_warmup":
    case "selling":
      return String(value).trim().toLowerCase() as ScriptTemplateCategory;
    default:
      return "general";
  }
}

function getScriptTemplateCategoryLabel(value?: string) {
  const normalized = normalizeScriptTemplateCategory(value);
  return DIGITAL_HUMAN_SCRIPT_TEMPLATE_CATEGORIES.find((item) => item.value === normalized)?.label || "通用模板";
}

function getScriptTemplateArchiveLabel(isArchived?: boolean) {
  return isArchived ? "已归档" : "生效中";
}

function getStageLabel(stage?: DouyinDigitalHumanVideoWorkRecord["stage"]) {
  switch (stage) {
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    case "GENERATING":
      return "生成中";
    default:
      return "排队中";
  }
}

function getStageClass(stage?: DouyinDigitalHumanVideoWorkRecord["stage"]) {
  switch (stage) {
    case "SUCCESS":
      return "status-ready";
    case "FAILED":
      return "status-pending";
    default:
      return "status-in_progress";
  }
}

function getFigureTypeLabel(type?: DigitalHumanFigureType) {
  switch (type) {
    case "whole_body":
      return "全身";
    case "circle_view":
      return "圆形";
    default:
      return "半身";
  }
}

function getCustomPersonRecommendedCanvas(person?: DouyinDigitalHumanCustomPersonRecord) {
  if (person?.support4k && person.resolutionRate === "4K") {
    return {
      width: person.width4k || 2160,
      height: person.height4k || 3840,
      label: "4K 推荐尺寸",
    };
  }
  return {
    width: 1080,
    height: 1920,
    label: "1080p 推荐尺寸",
  };
}

function isRecoverableWork(item: DouyinDigitalHumanVideoWorkRecord) {
  if (item.videoUrl) {
    return false;
  }
  if (item.stage === "FAILED") {
    return false;
  }
  return Boolean(item.providerTaskId || item.thirdPartyStatus || item.taskStatus);
}

export interface DouyinDigitalHumanWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  items: DouyinDigitalHumanVideoWorkRecord[];
  customPersons: DouyinDigitalHumanCustomPersonRecord[];
  lipSyncItems: DouyinLipSyncWorkRecord[];
  publicVoices: DouyinVoiceLibraryRecord[];
  customVoices: DouyinCustomVoiceRecord[];
  publicVoicePageInfo?: VoiceLibraryPageInfo;
  customVoicePageInfo?: VoiceLibraryPageInfo;
  publicVoiceLoadError?: string;
  customVoiceLoadError?: string;
  currentSpeechTask?: DouyinSpeechTaskRecord | null;
  currentSpeechTaskId?: string;
  originalCopyLatest?: DouyinOriginalCopyRecord;
  originalCopyHistory: DouyinOriginalCopyRecord[];
  originalCopyTaskStatus?: string;
  remixCopyLatest?: DouyinRemixCopyRecord;
  remixCopyHistory: DouyinRemixCopyRecord[];
  remixCopyTaskStatus?: string;
  originalCopyCalendarOptions: Array<{ id: string; label: string }>;
  originalCopyTopicOptions: Array<{ id: string; label: string }>;
  remixCopyProductOptions: Array<{ id: string; label: string }>;
  templateTagGroups: DigitalHumanTemplateTagGroupRecord[];
  templates: DigitalHumanTemplateRecord[];
  favoriteTemplateIds: string[];
  personalScriptTemplates: DouyinDigitalHumanScriptTemplateRecord[];
  materialLibraryItems: DigitalHumanMaterialLibraryItem[];
  templatePageInfo?: DigitalHumanTemplatePageInfo;
  activeTagId?: string;
  templateLoadError?: string;
  templateTagLoadError?: string;
  isTemplateLoading?: boolean;
  onRefresh: () => void | Promise<void>;
  onTemplateTagChange: (tagId: string) => Promise<void>;
  onTemplatePageChange?: (page: number) => Promise<void>;
  onToggleFavoriteTemplate: (templateId: string, nextFavorite: boolean) => Promise<boolean>;
  onSaveScriptTemplate: (payload: { name?: string; content?: string; note?: string; isShared?: boolean; category?: string; isArchived?: boolean }) => Promise<DouyinDigitalHumanScriptTemplateRecord | null>;
  onUpdateScriptTemplate: (
    templateId: string,
    payload: { name?: string; content?: string; note?: string; isShared?: boolean; category?: string; isArchived?: boolean },
  ) => Promise<DouyinDigitalHumanScriptTemplateRecord | null>;
  onDeleteScriptTemplate: (templateId: string) => Promise<boolean>;
  onPreview: (item: DouyinDigitalHumanVideoWorkRecord) => void;
  onCreate: (payload: GenerateDouyinDigitalHumanVideoForm) => Promise<boolean>;
  onCreateCompleteVideo: (payload: GenerateDouyinDigitalHumanCompleteVideoForm) => Promise<boolean>;
  onCreateCustomPerson: (payload: {
    name?: string;
    trainingVideoFile?: File | null;
    trainType?: "figure" | "both";
    language?: string;
    resolutionRate?: "1080p" | "4K";
    errorSkip?: boolean;
  }) => Promise<boolean>;
  onCreateLipSync: (payload: {
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
  }) => Promise<boolean>;
  onRecoverVideo: (payload: { workId?: string; providerTaskId?: string }) => Promise<boolean>;
  onRecoverLipSync: (payload: { workId?: string; providerTaskId?: string }) => Promise<boolean>;
  onDeleteCustomPerson: (customPersonId: string) => Promise<boolean>;
  onDelete: (workId: string) => Promise<boolean>;
  onDeleteLipSync: (workId: string) => Promise<boolean>;
  onRefreshPublicVoices: (page: number) => Promise<void>;
  onRefreshCustomVoices: (page: number) => Promise<void>;
  onCreateCustomVoice: (payload: {
    name?: string;
    audioFile?: File | null;
    modelType?: "cicada1.0" | "cicada3.0" | "cicada3.0-turbo";
    language?: "cn" | "en";
    text?: string;
  }) => Promise<boolean>;
  onDeleteCustomVoice: (voiceId: string) => Promise<boolean>;
  onCreateSpeechTask: (payload: {
    audioManId?: string;
    text?: string;
    speed?: number;
    pitch?: number;
    dialect?: number;
  }) => Promise<boolean>;
  onRefreshSpeechTask: (taskId?: string) => Promise<boolean>;
  onCreateOriginalCopy: (payload: {
    calendarItemId?: string;
    topicId?: string;
    injectMarketingPlan: boolean;
    copyType: "VIEWPOINT" | "STORY" | "PROCESS" | "KNOWLEDGE" | "PLOT_SALES" | "SEEDING" | "LOCAL_SALES";
    userRequirement?: string;
  }) => Promise<boolean>;
  onCreateRemixCopy: (payload: {
    materialId: string;
    injectBrandProfile: boolean;
    productId?: string;
    injectMarketingPlan: boolean;
    userRequirement?: string;
  }) => Promise<boolean>;
  formatDateTime: OptionalDateFormatter;
}

function createDigitalHumanDraftId() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DouyinDigitalHumanWorkspace(props: DouyinDigitalHumanWorkspaceProps) {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<DigitalHumanWorkspaceTab>("home");
  const [selectedPersonSource, setSelectedPersonSource] = useState<"COMMON" | "CUSTOM">("COMMON");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedCustomPersonId, setSelectedCustomPersonId] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateScopeFilter, setTemplateScopeFilter] = useState<"ALL" | "FAVORITES" | "RECENT">("ALL");
  const [workSearch, setWorkSearch] = useState("");
  const [workStageFilter, setWorkStageFilter] = useState<string>("ALL");
  const [selectedFigureType, setSelectedFigureType] = useState<DigitalHumanFigureType>("sit_body");
  const [selectedVoiceMode, setSelectedVoiceMode] = useState<"DEFAULT" | "PUBLIC" | "CUSTOM">("DEFAULT");
  const [selectedPublicVoiceId, setSelectedPublicVoiceId] = useState("");
  const [selectedCustomVoiceId, setSelectedCustomVoiceId] = useState("");
  const [selectedMaterialLibraryItemId, setSelectedMaterialLibraryItemId] = useState("");
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [speechRate, setSpeechRate] = useState("1");
  const [pitch, setPitch] = useState("0");
  const [volume, setVolume] = useState("1");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [backgroundImageName, setBackgroundImageName] = useState("");
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [subtitlePositionX, setSubtitlePositionX] = useState("86");
  const [subtitlePositionY, setSubtitlePositionY] = useState("1498");
  const [subtitleWidth, setSubtitleWidth] = useState("907");
  const [subtitleHeight, setSubtitleHeight] = useState("269");
  const [subtitleFontSize, setSubtitleFontSize] = useState("48");
  const [subtitleTextColor, setSubtitleTextColor] = useState("#FFFFFF");
  const [subtitleStrokeColor, setSubtitleStrokeColor] = useState("#000000");
  const [subtitleStrokeWidth, setSubtitleStrokeWidth] = useState("2");
  const [subtitleFontId, setSubtitleFontId] = useState("");
  const [addComplianceWatermark, setAddComplianceWatermark] = useState(true);
  const [screenWidth, setScreenWidth] = useState("1080");
  const [screenHeight, setScreenHeight] = useState("1920");
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [manualRecoverTaskId, setManualRecoverTaskId] = useState("");
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>([]);
  const [scriptActionMessage, setScriptActionMessage] = useState("");
  const [editorActionMessage, setEditorActionMessage] = useState("");
  const [selectedPersonalScriptTemplateId, setSelectedPersonalScriptTemplateId] = useState("");
  const [personalScriptTemplateName, setPersonalScriptTemplateName] = useState("");
  const [personalScriptTemplateSearch, setPersonalScriptTemplateSearch] = useState("");
  const [personalScriptTemplateSort, setPersonalScriptTemplateSort] = useState<PersonalScriptTemplateSort>("UPDATED_DESC");
  const [personalScriptTemplateFilter, setPersonalScriptTemplateFilter] = useState<PersonalScriptTemplateFilter>("ALL");
  const [personalScriptTemplateArchiveFilter, setPersonalScriptTemplateArchiveFilter] = useState<PersonalScriptTemplateArchiveFilter>("ACTIVE");
  const [personalScriptTemplateGovernanceFilter, setPersonalScriptTemplateGovernanceFilter] = useState<PersonalScriptTemplateGovernanceFilter>("ALL");
  const [scriptTemplateVisibility, setScriptTemplateVisibility] = useState<"SELF" | "SHARED">("SELF");
  const [scriptTemplateCategory, setScriptTemplateCategory] = useState<ScriptTemplateCategory>("general");
  const [personalScriptTemplateNote, setPersonalScriptTemplateNote] = useState("");
  const [showScriptTemplateManager, setShowScriptTemplateManager] = useState(false);
  const [personalScriptTemplateCategoryFilter, setPersonalScriptTemplateCategoryFilter] = useState<ScriptTemplateCategory | "ALL">("ALL");
  const [creatorDraftCards, setCreatorDraftCards] = useState<DigitalHumanCreatorDraftCard[]>(() => [
    {
      id: createDigitalHumanDraftId(),
      name: "片段 1",
      personSource: "COMMON",
      selectedTemplateId: "",
      selectedCustomPersonId: "",
      selectedFigureType: "sit_body",
      selectedVoiceMode: "DEFAULT",
      selectedPublicVoiceId: "",
      selectedCustomVoiceId: "",
      selectedMaterialLibraryItemId: "",
      title: "",
      script: "",
      speechRate: "1",
      pitch: "0",
      volume: "1",
      backgroundColor: "#ffffff",
      backgroundImageFile: null,
      backgroundImageUrl: "",
      backgroundImageName: "",
      subtitleEnabled: true,
      subtitlePositionX: "86",
      subtitlePositionY: "1498",
      subtitleWidth: "907",
      subtitleHeight: "269",
      subtitleFontSize: "48",
      subtitleTextColor: "#FFFFFF",
      subtitleStrokeColor: "#000000",
      subtitleStrokeWidth: "2",
      subtitleFontId: "",
      addComplianceWatermark: true,
      screenWidth: "1080",
      screenHeight: "1920",
    },
  ]);
  const [activeDraftCardId, setActiveDraftCardId] = useState("");
  const [isAudioDriveDialogOpen, setIsAudioDriveDialogOpen] = useState(false);
  const [audioDriveTitle, setAudioDriveTitle] = useState("");
  const [audioDriveSourceVideoFile, setAudioDriveSourceVideoFile] = useState<File | null>(null);
  const [audioDriveAudioFile, setAudioDriveAudioFile] = useState<File | null>(null);
  const [audioDriveAudioPreviewUrl, setAudioDriveAudioPreviewUrl] = useState("");
  const [audioDriveAudioDurationLabel, setAudioDriveAudioDurationLabel] = useState("");
  const [pendingAutoApplyCopy, setPendingAutoApplyCopy] = useState<PendingAutoApplyCopy | null>(null);

  const filteredTemplates = useMemo(() => {
    const keyword = templateSearch.trim().toLowerCase();
    const favoriteIdSet = new Set(props.favoriteTemplateIds);
    const recentIdSet = new Set(recentTemplateIds);
    const recentOrderMap = new Map(recentTemplateIds.map((id, index) => [id, index]));
    const favorites = props.templates.filter((item) => favoriteIdSet.has(item.id));
    const recents = props.templates
      .filter((item) => recentIdSet.has(item.id))
      .sort((left, right) => (recentOrderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (recentOrderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER));

    const source =
      templateScopeFilter === "FAVORITES"
        ? favorites
        : templateScopeFilter === "RECENT"
          ? recents
          : props.templates;

    const filtered = keyword
      ? source.filter((item) =>
          [item.name, item.audioName, item.gender, item.tagNames.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(keyword),
        )
      : source;

    if (templateScopeFilter !== "ALL") {
      return filtered;
    }

    return [...filtered].sort((left, right) => {
      const leftFavorite = favoriteIdSet.has(left.id) ? 1 : 0;
      const rightFavorite = favoriteIdSet.has(right.id) ? 1 : 0;
      if (leftFavorite !== rightFavorite) {
        return rightFavorite - leftFavorite;
      }
      const leftRecent = recentOrderMap.get(left.id);
      const rightRecent = recentOrderMap.get(right.id);
      if (leftRecent !== undefined || rightRecent !== undefined) {
        return (leftRecent ?? Number.MAX_SAFE_INTEGER) - (rightRecent ?? Number.MAX_SAFE_INTEGER);
      }
      return left.name.localeCompare(right.name, "zh-CN");
    });
  }, [props.favoriteTemplateIds, props.templates, recentTemplateIds, templateScopeFilter, templateSearch]);

  const selectedTemplate = useMemo(
    () => filteredTemplates.find((item) => item.id === selectedTemplateId) || filteredTemplates[0],
    [filteredTemplates, selectedTemplateId],
  );

  const selectedFigure = useMemo(
    () => selectedTemplate?.figures.find((item) => item.type === selectedFigureType) || selectedTemplate?.figures[0],
    [selectedFigureType, selectedTemplate],
  );
  const availableCustomPersons = useMemo(
    () => props.customPersons.filter((item) => item.status === "SUCCESS" && (item.personId || item.id)),
    [props.customPersons],
  );
  const selectedCustomPerson = useMemo(
    () => availableCustomPersons.find((item) => item.id === selectedCustomPersonId) || availableCustomPersons[0],
    [availableCustomPersons, selectedCustomPersonId],
  );
  const selectedPublicVoice = useMemo(
    () => props.publicVoices.find((item) => item.id === selectedPublicVoiceId) || props.publicVoices[0],
    [props.publicVoices, selectedPublicVoiceId],
  );
  const selectedCustomVoice = useMemo(
    () => props.customVoices.find((item) => item.id === selectedCustomVoiceId) || props.customVoices[0],
    [props.customVoices, selectedCustomVoiceId],
  );
  const selectedMaterialLibraryItem = useMemo(
    () => props.materialLibraryItems.find((item) => item.id === selectedMaterialLibraryItemId),
    [props.materialLibraryItems, selectedMaterialLibraryItemId],
  );
  const resolvedSelectedVoice = useMemo(() => {
    if (selectedVoiceMode === "PUBLIC") {
      return selectedPublicVoice;
    }
    if (selectedVoiceMode === "CUSTOM") {
      return selectedCustomVoice;
    }
    return undefined;
  }, [selectedCustomVoice, selectedPublicVoice, selectedVoiceMode]);
  const activeDraftCard = useMemo(
    () => creatorDraftCards.find((item) => item.id === activeDraftCardId) || creatorDraftCards[0],
    [activeDraftCardId, creatorDraftCards],
  );

  const filteredWorks = useMemo(() => {
    const keyword = workSearch.trim().toLowerCase();
    return props.items.filter((item) => {
      if (workStageFilter === "RECOVERABLE") {
        if (!isRecoverableWork(item)) {
          return false;
        }
      } else if (workStageFilter !== "ALL" && item.stage !== workStageFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [item.title, item.personName, item.audioName, item.thirdPartyStatusLabel, item.content]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [props.items, workSearch, workStageFilter]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredWorks.slice(start, start + PAGE_SIZE);
  }, [filteredWorks, page]);

  const pageCount = Math.max(1, Math.ceil(filteredWorks.length / PAGE_SIZE));
  const selectedWork = useMemo(
    () => filteredWorks.find((item) => item.id === selectedWorkId) || filteredWorks[0] || props.items[0],
    [filteredWorks, props.items, selectedWorkId],
  );
  const recentTemplates = useMemo(
    () =>
      recentTemplateIds
        .map((id) => props.templates.find((item) => item.id === id))
        .filter((item): item is DigitalHumanTemplateRecord => Boolean(item))
        .slice(0, 6),
    [props.templates, recentTemplateIds],
  );
  const selectedPersonalScriptTemplate = useMemo(
    () => props.personalScriptTemplates.find((item) => item.id === selectedPersonalScriptTemplateId),
    [props.personalScriptTemplates, selectedPersonalScriptTemplateId],
  );
  const filteredPersonalScriptTemplates = useMemo(() => {
    const keyword = personalScriptTemplateSearch.trim().toLowerCase();
    const visibilityFiltered = props.personalScriptTemplates.filter((item) => {
      if (personalScriptTemplateFilter === "SELF") {
        return !item.isShared;
      }
      if (personalScriptTemplateFilter === "SHARED") {
        return item.isShared;
      }
      return true;
    });
    const archiveFiltered =
      personalScriptTemplateArchiveFilter === "ALL"
        ? visibilityFiltered
        : visibilityFiltered.filter((item) => (personalScriptTemplateArchiveFilter === "ARCHIVED" ? item.isArchived : !item.isArchived));
    const categoryFiltered =
      personalScriptTemplateCategoryFilter === "ALL"
        ? archiveFiltered
        : archiveFiltered.filter((item) => normalizeScriptTemplateCategory(item.category) === personalScriptTemplateCategoryFilter);
    const governanceFiltered = categoryFiltered.filter((item) => {
      switch (personalScriptTemplateGovernanceFilter) {
        case "NEED_NOTE":
          return !item.note.trim();
        case "READONLY_SHARED":
          return item.isShared && !item.editable;
        case "SHARED_ACTIVE":
          return item.isShared && !item.isArchived;
        case "ARCHIVED":
          return item.isArchived;
        case "ALL":
        default:
          return true;
      }
    });
    const filtered = keyword
      ? governanceFiltered.filter((item) =>
          [item.name, item.content, item.note]
            .join(" ")
            .toLowerCase()
            .includes(keyword),
        )
      : governanceFiltered;

    return [...filtered].sort((left, right) => {
      switch (personalScriptTemplateSort) {
        case "UPDATED_ASC":
          return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
        case "NAME_ASC":
          return left.name.localeCompare(right.name, "zh-CN");
        case "NAME_DESC":
          return right.name.localeCompare(left.name, "zh-CN");
        case "UPDATED_DESC":
        default:
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      }
    });
  }, [personalScriptTemplateArchiveFilter, personalScriptTemplateCategoryFilter, personalScriptTemplateFilter, personalScriptTemplateGovernanceFilter, personalScriptTemplateSearch, personalScriptTemplateSort, props.personalScriptTemplates]);
  const isSelectedTemplateFavorite = Boolean(selectedTemplate?.id && props.favoriteTemplateIds.includes(selectedTemplate.id));
  const selectedPersonalScriptTemplateEditable = selectedPersonalScriptTemplate?.editable ?? false;
  const isReadonlySharedScriptTemplate = Boolean(selectedPersonalScriptTemplate?.isShared && !selectedPersonalScriptTemplateEditable);
  const selectedPersonalScriptTemplateArchived = Boolean(selectedPersonalScriptTemplate?.isArchived);
  const scriptTemplateSaveScopeLabel = scriptTemplateVisibility === "SHARED" ? "团队共享模板" : "个人模板";
  const duplicateTargetIsShared = isReadonlySharedScriptTemplate ? false : scriptTemplateVisibility === "SHARED";
  const personalTemplateGovernanceSummary = useMemo(() => {
    const templates = props.personalScriptTemplates;
    return {
      total: templates.length,
      shared: templates.filter((item) => item.isShared).length,
      sharedActive: templates.filter((item) => item.isShared && !item.isArchived).length,
      archived: templates.filter((item) => item.isArchived).length,
      missingNotes: templates.filter((item) => !item.note.trim()).length,
      readonlyShared: templates.filter((item) => item.isShared && !item.editable).length,
    };
  }, [props.personalScriptTemplates]);
  const selectedTemplateAuditMessages = useMemo(() => {
    const target = selectedPersonalScriptTemplate;
    if (!target) {
      return [];
    }
    const messages: string[] = [];
    if (target.isShared && !target.note.trim()) {
      messages.push("共享模板缺少协作备注，建议补充适用场景和禁用说法。");
    }
    if (target.isShared && !target.editable) {
      messages.push("当前模板来自他人共享区，如需改内容请先保存为我的副本。");
    }
    if (target.isArchived) {
      messages.push("当前模板已归档，适合历史复用参考，不建议直接作为默认生产模板。");
    }
    if (!target.isArchived && !target.isShared && !target.note.trim()) {
      messages.push("当前个人模板尚未补备注，后续共享前建议先写清使用边界。");
    }
    return messages;
  }, [selectedPersonalScriptTemplate]);
  const editorDiffs = useMemo<DigitalHumanEditorDiffEntry[]>(() => {
    if (!selectedWork) {
      return [];
    }
    const diffEntries: DigitalHumanEditorDiffEntry[] = [];
    const pushDiff = (key: string, label: string, currentValue: string, selectedValue: string) => {
      if (currentValue.trim() !== selectedValue.trim()) {
        diffEntries.push({ key, label, currentValue, selectedValue });
      }
    };

    pushDiff("title", "作品标题", title || "", selectedWork.title || "");
    pushDiff("script", "口播脚本", script || "", selectedWork.content || "");
    pushDiff(
      "template",
      "数字人形象",
      selectedPersonSource === "CUSTOM" ? selectedCustomPerson?.name || "" : selectedTemplate?.name || "",
      selectedWork.personName || "",
    );
    pushDiff("personSource", "数字人来源", selectedPersonSource === "CUSTOM" ? "我的定制数字人" : "公共模板", selectedWork.personSource === "CUSTOM" ? "我的定制数字人" : "公共模板");
    pushDiff("figureType", "形象类型", getFigureTypeLabel(selectedFigureType), getFigureTypeLabel(selectedWork.figureType));
    pushDiff(
      "voiceMode",
      "声音来源",
      selectedVoiceMode === "DEFAULT" ? "默认音色" : selectedVoiceMode === "PUBLIC" ? "公共声音" : "我的声音",
      selectedWork.audioName || selectedWork.audioManId || "默认音色",
    );
    pushDiff("speechRate", "语速", String(speechRate || ""), String(selectedWork.speechRate ?? ""));
    pushDiff("pitch", "音调", String(pitch || ""), String(selectedWork.pitch ?? ""));
    pushDiff("volume", "音量", String(volume || ""), String(selectedWork.volume ?? ""));
    pushDiff("backgroundColor", "背景色", backgroundColor || "", selectedWork.backgroundColor || "");
    pushDiff("subtitleEnabled", "字幕开关", subtitleEnabled ? "开启" : "关闭", selectedWork.subtitleEnabled ? "开启" : "关闭");
    pushDiff("subtitleTextColor", "字幕颜色", subtitleTextColor || "", selectedWork.subtitleTextColor || "");
    pushDiff("subtitleStrokeColor", "描边颜色", subtitleStrokeColor || "", selectedWork.subtitleStrokeColor || "");
    pushDiff("screenWidth", "画布宽度", String(screenWidth || ""), String(selectedWork.screenWidth ?? ""));
    pushDiff("screenHeight", "画布高度", String(screenHeight || ""), String(selectedWork.screenHeight ?? ""));

    return diffEntries;
  }, [
    backgroundColor,
    pitch,
    screenHeight,
    screenWidth,
    script,
    selectedCustomPerson?.name,
    selectedFigureType,
    selectedVoiceMode,
    selectedPersonSource,
    selectedTemplate?.name,
    selectedWork?.audioManId,
    selectedWork?.audioName,
    selectedWork,
    speechRate,
    subtitleEnabled,
    subtitleStrokeColor,
    subtitleTextColor,
    title,
    volume,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const recentText = window.localStorage.getItem(DIGITAL_HUMAN_TEMPLATE_RECENTS_STORAGE_KEY);
      const recentList = JSON.parse(recentText || "[]");
      setRecentTemplateIds(Array.isArray(recentList) ? recentList.map((item) => String(item || "").trim()).filter(Boolean) : []);
    } catch {
      setRecentTemplateIds([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(DIGITAL_HUMAN_TEMPLATE_RECENTS_STORAGE_KEY, JSON.stringify(recentTemplateIds));
  }, [recentTemplateIds]);

  useEffect(() => {
    if (!filteredTemplates.length) {
      setSelectedTemplateId("");
      return;
    }
    if (!filteredTemplates.some((item) => item.id === selectedTemplateId)) {
      setSelectedTemplateId(filteredTemplates[0]?.id || "");
    }
  }, [filteredTemplates, selectedTemplateId]);

  useEffect(() => {
    if (!availableCustomPersons.length) {
      setSelectedCustomPersonId("");
      if (selectedPersonSource === "CUSTOM") {
        setSelectedPersonSource("COMMON");
      }
      return;
    }
    if (!availableCustomPersons.some((item) => item.id === selectedCustomPersonId)) {
      setSelectedCustomPersonId(availableCustomPersons[0]?.id || "");
    }
  }, [availableCustomPersons, selectedCustomPersonId, selectedPersonSource]);

  useEffect(() => {
    if (!props.publicVoices.length) {
      setSelectedPublicVoiceId("");
      if (selectedVoiceMode === "PUBLIC") {
        setSelectedVoiceMode("DEFAULT");
      }
      return;
    }
    if (!props.publicVoices.some((item) => item.id === selectedPublicVoiceId)) {
      setSelectedPublicVoiceId(props.publicVoices[0]?.id || "");
    }
  }, [props.publicVoices, selectedPublicVoiceId, selectedVoiceMode]);

  useEffect(() => {
    if (!props.customVoices.length) {
      setSelectedCustomVoiceId("");
      if (selectedVoiceMode === "CUSTOM") {
        setSelectedVoiceMode("DEFAULT");
      }
      return;
    }
    if (!props.customVoices.some((item) => item.id === selectedCustomVoiceId)) {
      setSelectedCustomVoiceId(props.customVoices[0]?.id || "");
    }
  }, [props.customVoices, selectedCustomVoiceId, selectedVoiceMode]);

  useEffect(() => {
    if (!props.materialLibraryItems.length) {
      setSelectedMaterialLibraryItemId("");
      return;
    }
    if (!props.materialLibraryItems.some((item) => item.id === selectedMaterialLibraryItemId)) {
      setSelectedMaterialLibraryItemId("");
    }
  }, [props.materialLibraryItems, selectedMaterialLibraryItemId]);

  useEffect(() => {
    if (!creatorDraftCards.length) {
      return;
    }
    if (!creatorDraftCards.some((item) => item.id === activeDraftCardId)) {
      setActiveDraftCardId(creatorDraftCards[0]?.id || "");
    }
  }, [activeDraftCardId, creatorDraftCards]);

  useEffect(() => {
    if (!audioDriveAudioFile) {
      setAudioDriveAudioPreviewUrl("");
      setAudioDriveAudioDurationLabel("");
      return;
    }
    const previewUrl = window.URL.createObjectURL(audioDriveAudioFile);
    setAudioDriveAudioPreviewUrl(previewUrl);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = previewUrl;
    const handleLoadedMetadata = () => {
      const durationSeconds = Number.isFinite(audio.duration) ? Math.max(0, Math.round(audio.duration)) : 0;
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      setAudioDriveAudioDurationLabel(`${minutes}:${String(seconds).padStart(2, "0")}`);
    };
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      window.URL.revokeObjectURL(previewUrl);
    };
  }, [audioDriveAudioFile]);

  useEffect(() => {
    if (!activeDraftCardId) {
      return;
    }
    setCreatorDraftCards((current) =>
      current.map((item) =>
        item.id === activeDraftCardId
          ? {
              ...item,
              name: item.name || `片段 ${current.findIndex((entry) => entry.id === item.id) + 1}`,
              personSource: selectedPersonSource,
              selectedTemplateId,
              selectedCustomPersonId,
              selectedFigureType,
              selectedVoiceMode,
              selectedPublicVoiceId,
              selectedCustomVoiceId,
              selectedMaterialLibraryItemId,
              title,
              script,
              speechRate,
              pitch,
              volume,
              backgroundColor,
              backgroundImageFile,
              backgroundImageUrl,
              backgroundImageName,
              subtitleEnabled,
              subtitlePositionX,
              subtitlePositionY,
              subtitleWidth,
              subtitleHeight,
              subtitleFontSize,
              subtitleTextColor,
              subtitleStrokeColor,
              subtitleStrokeWidth,
              subtitleFontId,
              addComplianceWatermark,
              screenWidth,
              screenHeight,
            }
          : item,
      ),
    );
  }, [
    activeDraftCardId,
    backgroundColor,
    backgroundImageFile,
    backgroundImageName,
    backgroundImageUrl,
    pitch,
    screenHeight,
    screenWidth,
    script,
    selectedCustomPersonId,
    selectedFigureType,
    selectedMaterialLibraryItemId,
    selectedPersonSource,
    selectedPublicVoiceId,
    selectedCustomVoiceId,
    selectedTemplateId,
    selectedVoiceMode,
    speechRate,
    subtitleEnabled,
    subtitleFontId,
    subtitleFontSize,
    subtitleHeight,
    subtitlePositionX,
    subtitlePositionY,
    subtitleStrokeColor,
    subtitleStrokeWidth,
    subtitleTextColor,
    subtitleWidth,
    addComplianceWatermark,
    title,
    volume,
  ]);

  useEffect(() => {
    if (selectedPersonSource !== "COMMON" || !selectedTemplate) {
      return;
    }
    if (!selectedTemplate.figures.some((item) => item.type === selectedFigureType)) {
      setSelectedFigureType(selectedTemplate.figures[0]?.type || "sit_body");
    }
    if (!title.trim()) {
      setTitle(`${selectedTemplate.name} 数字人口播`);
    }
    setRecentTemplateIds((current) => {
      const next = [selectedTemplate.id, ...current.filter((item) => item !== selectedTemplate.id)];
      return next.slice(0, 12);
    });
  }, [selectedFigureType, selectedPersonSource, selectedTemplate, title]);

  useEffect(() => {
    if (selectedPersonSource !== "CUSTOM" || !selectedCustomPerson) {
      return;
    }
    setSelectedFigureType("sit_body");
    setTitle((current) => (current.trim() ? current : `${selectedCustomPerson.name} 数字人口播`));
    const recommendedCanvas = getCustomPersonRecommendedCanvas(selectedCustomPerson);
    setScreenWidth(String(recommendedCanvas.width));
    setScreenHeight(String(recommendedCanvas.height));
  }, [selectedCustomPerson, selectedPersonSource]);

  useEffect(() => {
    if (!props.items.length) {
      setSelectedWorkId("");
      return;
    }
    if (!props.items.some((item) => item.id === selectedWorkId)) {
      setSelectedWorkId(props.items[0]?.id || "");
    }
  }, [props.items, selectedWorkId]);

  useEffect(() => {
    setPage(1);
  }, [templateScopeFilter, workSearch, workStageFilter]);

  useEffect(() => {
    setManualRecoverTaskId(selectedWork?.providerTaskId || "");
  }, [selectedWork?.id, selectedWork?.providerTaskId]);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!selectedPersonalScriptTemplateId) {
      setPersonalScriptTemplateName("");
      setPersonalScriptTemplateNote("");
      setScriptTemplateCategory("general");
      return;
    }
    const target = props.personalScriptTemplates.find((item) => item.id === selectedPersonalScriptTemplateId);
    if (!target) {
      setSelectedPersonalScriptTemplateId("");
      setPersonalScriptTemplateName("");
      setPersonalScriptTemplateNote("");
      setScriptTemplateCategory("general");
      return;
    }
    setPersonalScriptTemplateName(target.name);
    setPersonalScriptTemplateNote(target.note || "");
    setScriptTemplateVisibility(target.isShared && !target.editable ? "SELF" : target.isShared ? "SHARED" : "SELF");
    setScriptTemplateCategory(normalizeScriptTemplateCategory(target.category));
  }, [props.personalScriptTemplates, selectedPersonalScriptTemplateId]);

  useEffect(() => {
    if (!selectedPersonalScriptTemplateId) {
      return;
    }
    if (!filteredPersonalScriptTemplates.some((item) => item.id === selectedPersonalScriptTemplateId)) {
      setSelectedPersonalScriptTemplateId("");
      setPersonalScriptTemplateName("");
      setPersonalScriptTemplateNote("");
      setScriptTemplateCategory("general");
    }
  }, [filteredPersonalScriptTemplates, selectedPersonalScriptTemplateId]);

  const createDisabled =
    !props.canEdit
    || !script.trim()
    || (selectedPersonSource === "COMMON" ? !selectedTemplate || !selectedFigure : !selectedCustomPerson);
  const selectedWorkIsRecoverable = Boolean(selectedWork && isRecoverableWork(selectedWork));
  const activeTabMeta = DIGITAL_HUMAN_WORKSPACE_TABS.find((item) => item.key === activeTab) || DIGITAL_HUMAN_WORKSPACE_TABS[0];
  const templateCountLabel = props.templatePageInfo?.totalCount
    ? `共 ${props.templatePageInfo.totalCount} 个模板，第 ${props.templatePageInfo.page}/${props.templatePageInfo.totalPage} 页`
    : props.templates.length
      ? `${props.templates.length} 个模板`
      : "暂无模板";
  const workCountLabel = filteredWorks.length ? `${filteredWorks.length} 条作品` : "暂无作品";
  const primaryActionLabel =
    activeTab === "home"
      ? "进入创作作品"
      : activeTab === "templateLibrary"
      ? "带入视频创建"
      : activeTab === "voiceLibrary"
        ? "刷新语音库"
      : activeTab === "videoStudio"
        ? "提交数字人视频"
        : activeTab === "worksCenter"
          ? "回填到创建区"
          : "建设中";
  const primaryActionDisabled =
    activeTab === "home"
      ? props.isSubmitting
      : activeTab === "templateLibrary"
      ? !selectedTemplate
      : activeTab === "voiceLibrary"
        ? props.isSubmitting
      : activeTab === "videoStudio"
        ? createDisabled
        : activeTab === "worksCenter"
          ? !selectedWork || props.isSubmitting
          : true;

  const buildCurrentDraftCard = (name?: string): DigitalHumanCreatorDraftCard => ({
    id: createDigitalHumanDraftId(),
    name: name || activeDraftCard?.name || `片段 ${creatorDraftCards.length + 1}`,
    personSource: selectedPersonSource,
    selectedTemplateId,
    selectedCustomPersonId,
    selectedFigureType,
    selectedVoiceMode,
    selectedPublicVoiceId,
    selectedCustomVoiceId,
    selectedMaterialLibraryItemId,
    title,
    script,
    speechRate,
    pitch,
    volume,
    backgroundColor,
    backgroundImageFile,
    backgroundImageUrl,
    backgroundImageName,
    subtitleEnabled,
    subtitlePositionX,
    subtitlePositionY,
    subtitleWidth,
    subtitleHeight,
    subtitleFontSize,
    subtitleTextColor,
    subtitleStrokeColor,
    subtitleStrokeWidth,
    subtitleFontId,
    addComplianceWatermark,
    screenWidth,
    screenHeight,
  });

  const applyDraftCardToEditor = (draft: DigitalHumanCreatorDraftCard) => {
    setSelectedPersonSource(draft.personSource);
    setSelectedTemplateId(draft.selectedTemplateId);
    setSelectedCustomPersonId(draft.selectedCustomPersonId);
    setSelectedFigureType(draft.selectedFigureType);
    setSelectedVoiceMode(draft.selectedVoiceMode);
    setSelectedPublicVoiceId(draft.selectedPublicVoiceId);
    setSelectedCustomVoiceId(draft.selectedCustomVoiceId);
    setSelectedMaterialLibraryItemId(draft.selectedMaterialLibraryItemId);
    setTitle(draft.title);
    setScript(draft.script);
    setSpeechRate(draft.speechRate);
    setPitch(draft.pitch);
    setVolume(draft.volume);
    setBackgroundColor(draft.backgroundColor);
    setBackgroundImageFile(draft.backgroundImageFile);
    setBackgroundImageUrl(draft.backgroundImageUrl);
    setBackgroundImageName(draft.backgroundImageName);
    setSubtitleEnabled(draft.subtitleEnabled);
    setSubtitlePositionX(draft.subtitlePositionX);
    setSubtitlePositionY(draft.subtitlePositionY);
    setSubtitleWidth(draft.subtitleWidth);
    setSubtitleHeight(draft.subtitleHeight);
    setSubtitleFontSize(draft.subtitleFontSize);
    setSubtitleTextColor(draft.subtitleTextColor);
    setSubtitleStrokeColor(draft.subtitleStrokeColor);
    setSubtitleStrokeWidth(draft.subtitleStrokeWidth);
    setSubtitleFontId(draft.subtitleFontId);
    setAddComplianceWatermark(draft.addComplianceWatermark);
    setScreenWidth(draft.screenWidth);
    setScreenHeight(draft.screenHeight);
  };

  const creatorDraftCardSummaries = useMemo<DigitalHumanCreatorDraftCardSummary[]>(
    () =>
      creatorDraftCards.map((item, index) => {
        const matchedTemplate = props.templates.find((entry) => entry.id === item.selectedTemplateId);
        const matchedFigure = matchedTemplate?.figures.find((entry) => entry.type === item.selectedFigureType) || matchedTemplate?.figures[0];
        const matchedCustomPerson = props.customPersons.find((entry) => entry.id === item.selectedCustomPersonId);
        const personLabel =
          item.personSource === "CUSTOM"
            ? matchedCustomPerson?.name || "我的数字人"
            : matchedTemplate?.name || "公共模板";
        const voiceLabel =
          item.selectedVoiceMode === "DEFAULT"
            ? "默认音色"
            : item.selectedVoiceMode === "PUBLIC"
              ? props.publicVoices.find((entry) => entry.id === item.selectedPublicVoiceId)?.name || "公共声音"
              : props.customVoices.find((entry) => entry.id === item.selectedCustomVoiceId)?.name || "我的声音";
        const matchedMaterial = props.materialLibraryItems.find((entry) => entry.id === item.selectedMaterialLibraryItemId);
        const materialLabel = matchedMaterial?.label;
        return {
          id: item.id,
          name: item.name || `片段 ${index + 1}`,
          personSource: item.personSource,
          personLabel,
          voiceLabel,
          materialLabel,
          title: item.title,
          scriptPreview: item.script.trim(),
          scriptLength: item.script.trim().length,
          subtitleEnabled: item.subtitleEnabled,
          addComplianceWatermark: item.addComplianceWatermark,
          previewImageUrl: item.personSource === "CUSTOM" ? matchedCustomPerson?.coverImageUrl : matchedFigure?.cover,
          previewVideoUrl: item.personSource === "CUSTOM" ? matchedCustomPerson?.previewVideoUrl : matchedFigure?.previewVideoUrl,
          materialPreviewVideoUrl: matchedMaterial?.videoUrl,
          materialPreviewImageUrl: matchedMaterial?.coverUrl,
          materialWorkUrl: matchedMaterial?.workUrl,
        };
      }),
    [creatorDraftCards, props.customPersons, props.customVoices, props.materialLibraryItems, props.publicVoices, props.templates],
  );
  const activeDraftCardIndex = useMemo(
    () => creatorDraftCards.findIndex((item) => item.id === activeDraftCardId),
    [activeDraftCardId, creatorDraftCards],
  );
  const canMoveActiveDraftCardUp = activeDraftCardIndex > 0;
  const canMoveActiveDraftCardDown = activeDraftCardIndex >= 0 && activeDraftCardIndex < creatorDraftCards.length - 1;

  const handleUseTemplateInVideo = (payload?: { templateId?: string; figureType?: DigitalHumanFigureType }) => {
    setSelectedPersonSource("COMMON");
    if (payload?.templateId) {
      setSelectedTemplateId(payload.templateId);
    }
    if (payload?.figureType) {
      setSelectedFigureType(payload.figureType);
    }
    setActiveTab("videoStudio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUseCustomPersonInVideo = (customPersonId?: string) => {
    const target = props.customPersons.find((item) => item.id === customPersonId) || props.customPersons.find((item) => item.status === "SUCCESS");
    if (!target || target.status !== "SUCCESS") {
      setEditorActionMessage("只有训练成功的定制数字人才能直接带入视频创建区。");
      return;
    }
    setSelectedPersonSource("CUSTOM");
    setSelectedCustomPersonId(target.id);
    setSelectedFigureType("sit_body");
    const recommendedCanvas = getCustomPersonRecommendedCanvas(target);
    setScreenWidth(String(recommendedCanvas.width));
    setScreenHeight(String(recommendedCanvas.height));
    if (!title.trim()) {
      setTitle(`${target.name} 数字人口播`);
    }
    setActiveTab("videoStudio");
    setEditorActionMessage(`已带入定制数字人：${target.name}，并按 ${recommendedCanvas.label} 自动填入画布尺寸。`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectCreatorDraftCard = (draftId: string) => {
    const target = creatorDraftCards.find((item) => item.id === draftId);
    if (!target) {
      return;
    }
    setActiveDraftCardId(target.id);
    applyDraftCardToEditor(target);
    setEditorActionMessage(`已切换到 ${target.name}。`);
  };

  const handleCreateCreatorDraftCard = () => {
    const nextDraft = buildCurrentDraftCard(`片段 ${creatorDraftCards.length + 1}`);
    setCreatorDraftCards((current) => [...current, nextDraft]);
    setActiveDraftCardId(nextDraft.id);
    setEditorActionMessage(`已新增 ${nextDraft.name}，并复制当前编辑配置。`);
  };

  const handleDuplicateCreatorDraftCard = () => {
    const nextDraft = buildCurrentDraftCard(`${activeDraftCard?.name || `片段 ${creatorDraftCards.length + 1}`} 副本`);
    setCreatorDraftCards((current) => [...current, nextDraft]);
    setActiveDraftCardId(nextDraft.id);
    setEditorActionMessage(`已复制当前片段为 ${nextDraft.name}。`);
  };

  const handleDeleteActiveDraftCard = () => {
    if (!activeDraftCard) {
      return;
    }
    if (creatorDraftCards.length <= 1) {
      setEditorActionMessage("至少保留 1 个创作片段。");
      return;
    }
    const currentIndex = creatorDraftCards.findIndex((item) => item.id === activeDraftCard.id);
    const nextDrafts = creatorDraftCards.filter((item) => item.id !== activeDraftCard.id);
    const fallbackDraft = nextDrafts[Math.max(0, currentIndex - 1)] || nextDrafts[0];
    setCreatorDraftCards(nextDrafts);
    if (fallbackDraft) {
      setActiveDraftCardId(fallbackDraft.id);
      applyDraftCardToEditor(fallbackDraft);
    }
    setEditorActionMessage(`已删除 ${activeDraftCard.name}。`);
  };

  const handleMoveActiveDraftCard = (direction: -1 | 1) => {
    if (!activeDraftCard) {
      return;
    }
    const currentIndex = creatorDraftCards.findIndex((item) => item.id === activeDraftCard.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= creatorDraftCards.length) {
      return;
    }
    const nextDrafts = [...creatorDraftCards];
    const [targetDraft] = nextDrafts.splice(currentIndex, 1);
    nextDrafts.splice(nextIndex, 0, targetDraft);
    setCreatorDraftCards(nextDrafts);
    setEditorActionMessage(`已将 ${activeDraftCard.name} 调整到第 ${nextIndex + 1} 位。`);
  };

  const handleCopyScript = async () => {
    const text = script.trim();
    if (!text) {
      setScriptActionMessage("当前没有可复制的脚本内容。");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setScriptActionMessage("脚本已复制到剪贴板。");
    } catch {
      setScriptActionMessage("复制失败，请手动复制脚本内容。");
    }
  };

  const handleExportScript = () => {
    const text = script.trim();
    if (!text) {
      setScriptActionMessage("当前没有可导出的脚本内容。");
      return;
    }
    try {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileName = `${(title.trim() || selectedTemplate?.name || "数字人口播脚本").replace(/[\\/:*?\"<>|]/g, "_")}.txt`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setScriptActionMessage("脚本已导出为 txt 文件。");
    } catch {
      setScriptActionMessage("导出失败，请稍后重试。");
    }
  };

  const handleRetrySelectedWork = async () => {
    if (!selectedWork || !props.canEdit || props.isSubmitting || selectedWork.stage !== "FAILED") {
      return;
    }
    await props.onCreate({
      title: `${selectedWork.title} 重试`,
      personId: selectedWork.personId,
      personName: selectedWork.personName,
      personSource: selectedWork.personSource,
      figureType: selectedWork.figureType,
      figureCoverUrl: selectedWork.figureCoverUrl,
      figurePreviewVideoUrl: selectedWork.figurePreviewVideoUrl,
      figureWidth: selectedWork.figureWidth,
      figureHeight: selectedWork.figureHeight,
      audioManId: selectedWork.audioManId,
      audioName: selectedWork.audioName,
      script: selectedWork.content,
      speechRate: selectedWork.speechRate,
      pitch: selectedWork.pitch,
      volume: selectedWork.volume,
      language: selectedWork.language,
      backgroundColor: selectedWork.backgroundColor,
      backgroundImageUrl: selectedWork.backgroundImageUrl,
      backgroundImageName: selectedWork.backgroundImageName,
      subtitleEnabled: selectedWork.subtitleEnabled,
      subtitlePositionX: selectedWork.subtitlePositionX,
      subtitlePositionY: selectedWork.subtitlePositionY,
      subtitleWidth: selectedWork.subtitleWidth,
      subtitleHeight: selectedWork.subtitleHeight,
      subtitleFontSize: selectedWork.subtitleFontSize,
      subtitleTextColor: selectedWork.subtitleTextColor,
      subtitleStrokeColor: selectedWork.subtitleStrokeColor,
      subtitleStrokeWidth: selectedWork.subtitleStrokeWidth,
      subtitleFontId: selectedWork.subtitleFontId,
      addComplianceWatermark: selectedWork.addComplianceWatermark !== false,
      screenWidth: selectedWork.screenWidth,
      screenHeight: selectedWork.screenHeight,
    });
  };

  const handleSaveCurrentScriptTemplate = async () => {
    const content = script.trim();
    if (!content) {
      setScriptActionMessage("当前没有可保存的脚本内容。");
      return;
    }
    const templateName = (
      personalScriptTemplateName.trim()
      || title.trim()
      || selectedTemplate?.name
      || "我的数字人脚本模板"
    ).slice(0, 60);
    const created = await props.onSaveScriptTemplate({
      name: templateName,
      content,
      note: personalScriptTemplateNote.trim(),
      isShared: scriptTemplateVisibility === "SHARED",
      category: scriptTemplateCategory,
    });
    if (!created) {
      setScriptActionMessage("脚本模板保存失败，请稍后重试。");
      return;
    }
    setSelectedPersonalScriptTemplateId(created.id);
    setPersonalScriptTemplateNote(created.note || "");
    setScriptTemplateVisibility(created.isShared ? "SHARED" : "SELF");
    setScriptTemplateCategory(normalizeScriptTemplateCategory(created.category));
    setScriptActionMessage(created.isShared ? `已保存团队共享模板：${created.name}` : `已保存个人脚本模板：${created.name}`);
  };

  const handleApplyPersonalScriptTemplate = () => {
    const target = selectedPersonalScriptTemplate;
    if (!target) {
      setScriptActionMessage("请先选择一个脚本模板。");
      return;
    }
    setScript(target.content);
    setScriptActionMessage(`已套用脚本模板：${target.name}`);
  };

  const handleDeletePersonalScriptTemplate = async () => {
    if (!selectedPersonalScriptTemplateId) {
      setScriptActionMessage("请先选择要删除的脚本模板。");
      return;
    }
    if (!selectedPersonalScriptTemplateEditable) {
      setScriptActionMessage("当前选中的是团队共享模板，不能直接删除，请先另存为自己的副本。");
      return;
    }
    const target = selectedPersonalScriptTemplate;
    const success = await props.onDeleteScriptTemplate(selectedPersonalScriptTemplateId);
    if (!success) {
      setScriptActionMessage("脚本模板删除失败，请稍后重试。");
      return;
    }
    setSelectedPersonalScriptTemplateId("");
    setScriptActionMessage(target ? `已删除脚本模板：${target.name}` : "已删除所选脚本模板。");
  };

  const handleDuplicatePersonalScriptTemplate = async () => {
    const content = script.trim();
    if (!content) {
      setScriptActionMessage("当前没有可另存为副本的脚本内容。");
      return;
    }
    const baseName =
      personalScriptTemplateName.trim()
      || selectedPersonalScriptTemplate?.name
      || title.trim()
      || selectedTemplate?.name
      || "我的数字人脚本模板";
    const created = await props.onSaveScriptTemplate({
      name: `${baseName} 副本`.slice(0, 60),
      content,
      note: personalScriptTemplateNote.trim(),
      isShared: duplicateTargetIsShared,
      category: scriptTemplateCategory,
    });
    if (!created) {
      setScriptActionMessage("脚本模板副本保存失败，请稍后重试。");
      return;
    }
    setSelectedPersonalScriptTemplateId(created.id);
    setPersonalScriptTemplateName(created.name);
    setPersonalScriptTemplateNote(created.note || "");
    setScriptTemplateVisibility(created.isShared ? "SHARED" : "SELF");
    setScriptTemplateCategory(normalizeScriptTemplateCategory(created.category));
    setScriptActionMessage(created.isShared ? `已另存团队共享模板副本：${created.name}` : `已另存个人脚本模板副本：${created.name}`);
  };

  const handleRenamePersonalScriptTemplate = async () => {
    if (!selectedPersonalScriptTemplateId) {
      setScriptActionMessage("请先选择一个脚本模板。");
      return;
    }
    if (!selectedPersonalScriptTemplateEditable) {
      setScriptActionMessage("当前选中的是团队共享模板，不能直接重命名，请先另存为自己的副本。");
      return;
    }
    const nextName = personalScriptTemplateName.trim();
    if (!nextName) {
      setScriptActionMessage("请输入新的脚本模板名称。");
      return;
    }
    const updated = await props.onUpdateScriptTemplate(selectedPersonalScriptTemplateId, {
      name: nextName,
      note: personalScriptTemplateNote.trim(),
      category: scriptTemplateCategory,
    });
    if (!updated) {
      setScriptActionMessage("脚本模板重命名失败，请稍后重试。");
      return;
    }
    setPersonalScriptTemplateName(updated.name);
    setPersonalScriptTemplateNote(updated.note || "");
    setScriptTemplateVisibility(updated.isShared ? "SHARED" : "SELF");
    setScriptTemplateCategory(normalizeScriptTemplateCategory(updated.category));
    setScriptActionMessage(`已重命名脚本模板：${updated.name}`);
  };

  const handleOverwritePersonalScriptTemplate = async () => {
    if (!selectedPersonalScriptTemplateId) {
      setScriptActionMessage("请先选择一个脚本模板。");
      return;
    }
    if (!selectedPersonalScriptTemplateEditable) {
      setScriptActionMessage("当前选中的是团队共享模板，不能直接覆盖，请先另存为自己的副本。");
      return;
    }
    const content = script.trim();
    if (!content) {
      setScriptActionMessage("当前没有可覆盖到模板的脚本内容。");
      return;
    }
    const updated = await props.onUpdateScriptTemplate(selectedPersonalScriptTemplateId, {
      name: personalScriptTemplateName.trim() || undefined,
      content,
      note: personalScriptTemplateNote.trim(),
      isShared: scriptTemplateVisibility === "SHARED",
      category: scriptTemplateCategory,
    });
    if (!updated) {
      setScriptActionMessage("脚本模板更新失败，请稍后重试。");
      return;
    }
    setPersonalScriptTemplateName(updated.name);
    setPersonalScriptTemplateNote(updated.note || "");
    setScriptTemplateVisibility(updated.isShared ? "SHARED" : "SELF");
    setScriptTemplateCategory(normalizeScriptTemplateCategory(updated.category));
    setScriptActionMessage(`已用当前脚本更新模板：${updated.name}`);
  };

  const handleToggleSharedPersonalScriptTemplate = async () => {
    if (!selectedPersonalScriptTemplateId) {
      setScriptActionMessage("请先选择一个脚本模板。");
      return;
    }
    if (!selectedPersonalScriptTemplateEditable) {
      setScriptActionMessage("当前选中的是他人共享模板，不能直接修改共享状态，请先另存为自己的副本。");
      return;
    }
    const nextShared = scriptTemplateVisibility !== "SHARED";
    const updated = await props.onUpdateScriptTemplate(selectedPersonalScriptTemplateId, {
      isShared: nextShared,
      note: personalScriptTemplateNote.trim(),
      category: scriptTemplateCategory,
    });
    if (!updated) {
      setScriptActionMessage("脚本模板共享状态更新失败，请稍后重试。");
      return;
    }
    setScriptTemplateVisibility(updated.isShared ? "SHARED" : "SELF");
    setPersonalScriptTemplateNote(updated.note || "");
    setScriptTemplateCategory(normalizeScriptTemplateCategory(updated.category));
    setScriptActionMessage(updated.isShared ? `已设为团队共享模板：${updated.name}` : `已切回个人模板：${updated.name}`);
  };

  const handleToggleArchivePersonalScriptTemplate = async () => {
    if (!selectedPersonalScriptTemplateId) {
      setScriptActionMessage("请先选择一个脚本模板。");
      return;
    }
    if (!selectedPersonalScriptTemplateEditable) {
      setScriptActionMessage("当前选中的是团队共享模板，不能直接归档或恢复，请先另存为自己的副本。");
      return;
    }
    const updated = await props.onUpdateScriptTemplate(selectedPersonalScriptTemplateId, {
      isArchived: !selectedPersonalScriptTemplateArchived,
    });
    if (!updated) {
      setScriptActionMessage("脚本模板归档状态更新失败，请稍后重试。");
      return;
    }
    setScriptTemplateVisibility(updated.isShared ? "SHARED" : "SELF");
    setPersonalScriptTemplateNote(updated.note || "");
    setScriptTemplateCategory(normalizeScriptTemplateCategory(updated.category));
    setScriptActionMessage(updated.isArchived ? `已归档脚本模板：${updated.name}` : `已恢复脚本模板：${updated.name}`);
  };

  const handleUpdatePersonalScriptTemplateCategory = async () => {
    if (!selectedPersonalScriptTemplateId) {
      setScriptActionMessage("请先选择一个脚本模板。");
      return;
    }
    if (!selectedPersonalScriptTemplateEditable) {
      setScriptActionMessage("当前选中的是团队共享模板，不能直接改分类，请先另存为自己的副本。");
      return;
    }
    const updated = await props.onUpdateScriptTemplate(selectedPersonalScriptTemplateId, {
      note: personalScriptTemplateNote.trim(),
      category: scriptTemplateCategory,
    });
    if (!updated) {
      setScriptActionMessage("脚本模板分类更新失败，请稍后重试。");
      return;
    }
    setScriptTemplateCategory(normalizeScriptTemplateCategory(updated.category));
    setPersonalScriptTemplateNote(updated.note || "");
    setScriptActionMessage(`已更新模板分类：${getScriptTemplateCategoryLabel(updated.category)}`);
  };

  const handleUpdatePersonalScriptTemplateNote = async () => {
    if (!selectedPersonalScriptTemplateId) {
      setScriptActionMessage("请先选择一个脚本模板。");
      return;
    }
    if (!selectedPersonalScriptTemplateEditable) {
      setScriptActionMessage("当前选中的是团队共享模板，不能直接改备注，请先另存为自己的副本。");
      return;
    }
    const updated = await props.onUpdateScriptTemplate(selectedPersonalScriptTemplateId, {
      note: personalScriptTemplateNote.trim(),
    });
    if (!updated) {
      setScriptActionMessage("脚本模板备注更新失败，请稍后重试。");
      return;
    }
    setPersonalScriptTemplateNote(updated.note || "");
    setScriptActionMessage(updated.note ? `已更新模板备注：${updated.name}` : `已清空模板备注：${updated.name}`);
  };

  const handleBackfillSelectedWork = () => {
    if (!selectedWork) {
      return;
    }
    const matchedTemplate = props.templates.find((item) => item.id === selectedWork.personId);
    const matchedCustomPerson = props.customPersons.find((item) => item.personId === selectedWork.personId || item.id === selectedWork.personId);
    if (selectedWork.personSource === "CUSTOM") {
      setSelectedPersonSource("CUSTOM");
      if (matchedCustomPerson) {
        setSelectedCustomPersonId(matchedCustomPerson.id);
      }
      setSelectedFigureType(selectedWork.figureType || "sit_body");
    } else if (matchedTemplate) {
      setSelectedPersonSource("COMMON");
      setSelectedTemplateId(matchedTemplate.id);
      if (matchedTemplate.figures.some((item) => item.type === selectedWork.figureType)) {
        setSelectedFigureType(selectedWork.figureType);
      } else {
        setSelectedFigureType(matchedTemplate.figures[0]?.type || "sit_body");
      }
    }
    setTitle(selectedWork.title);
    setScript(selectedWork.content);
    setSpeechRate(String(selectedWork.speechRate ?? 1));
    setPitch(String(selectedWork.pitch ?? 0));
    setVolume(String(selectedWork.volume ?? 1));
    setBackgroundColor(selectedWork.backgroundColor || "#ffffff");
    setBackgroundImageFile(null);
    setBackgroundImageUrl(selectedWork.backgroundImageUrl || "");
    setBackgroundImageName(selectedWork.backgroundImageName || "");
    setSubtitleEnabled(Boolean(selectedWork.subtitleEnabled));
    setSubtitlePositionX(String(selectedWork.subtitlePositionX ?? 86));
    setSubtitlePositionY(String(selectedWork.subtitlePositionY ?? 1498));
    setSubtitleWidth(String(selectedWork.subtitleWidth ?? 907));
    setSubtitleHeight(String(selectedWork.subtitleHeight ?? 269));
    setSubtitleFontSize(String(selectedWork.subtitleFontSize ?? 48));
    setSubtitleTextColor(selectedWork.subtitleTextColor || "#FFFFFF");
    setSubtitleStrokeColor(selectedWork.subtitleStrokeColor || "#000000");
    setSubtitleStrokeWidth(String(selectedWork.subtitleStrokeWidth ?? 2));
    setSubtitleFontId(selectedWork.subtitleFontId || "");
    setAddComplianceWatermark(selectedWork.addComplianceWatermark !== false);
    setScreenWidth(String(selectedWork.screenWidth || 1080));
    setScreenHeight(String(selectedWork.screenHeight || 1920));
    setSelectedMaterialLibraryItemId("");
    const matchedPublicVoice = props.publicVoices.find((item) => item.id === selectedWork.audioManId);
    const matchedCustomVoice = props.customVoices.find((item) => item.id === selectedWork.audioManId);
    if (matchedPublicVoice) {
      setSelectedVoiceMode("PUBLIC");
      setSelectedPublicVoiceId(matchedPublicVoice.id);
    } else if (matchedCustomVoice) {
      setSelectedVoiceMode("CUSTOM");
      setSelectedCustomVoiceId(matchedCustomVoice.id);
    } else {
      setSelectedVoiceMode("DEFAULT");
    }
    setEditorActionMessage(
      selectedWork.personSource === "CUSTOM"
        ? matchedCustomPerson
          ? "已将定制数字人作品参数回填到创建区，可直接继续修改后重新提交。"
          : "已回填脚本与主要参数；当前定制数字人未命中本地列表，请刷新定制数字人列表后再确认。"
        : matchedTemplate
          ? "已将当前作品参数回填到创建区，可直接继续修改后重新提交。"
          : "已回填脚本与主要参数；当前模板未命中本地模板列表，请检查模板选择后再提交。",
    );
    setActiveTab("videoStudio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildVideoPayloadFromDraft = (draft: DigitalHumanCreatorDraftCard) => {
    const currentCommonSource = draft.personSource === "COMMON" ? props.templates.find((item) => item.id === draft.selectedTemplateId) : undefined;
    const currentCommonFigure =
      draft.personSource === "COMMON"
        ? currentCommonSource?.figures.find((item) => item.type === draft.selectedFigureType) || currentCommonSource?.figures[0]
        : undefined;
    const currentCustomSource =
      draft.personSource === "CUSTOM"
        ? props.customPersons.find((item) => item.id === draft.selectedCustomPersonId && item.status === "SUCCESS")
        : undefined;
    const currentPublicVoice =
      draft.selectedVoiceMode === "PUBLIC"
        ? props.publicVoices.find((item) => item.id === draft.selectedPublicVoiceId)
        : undefined;
    const currentCustomVoice =
      draft.selectedVoiceMode === "CUSTOM"
        ? props.customVoices.find((item) => item.id === draft.selectedCustomVoiceId)
        : undefined;
    const resolvedVoice = currentPublicVoice || currentCustomVoice;
    if (!draft.script.trim()) {
      return null;
    }
    if (draft.personSource === "COMMON" && (!currentCommonSource || !currentCommonFigure)) {
      return null;
    }
    if (draft.personSource === "CUSTOM" && !currentCustomSource) {
      return null;
    }
    return {
      title: draft.title.trim() || `${currentCustomSource?.name || currentCommonSource?.name || "数字人"} 数字人口播`,
      personId: currentCustomSource?.personId || currentCustomSource?.id || currentCommonSource?.id,
      personName: currentCustomSource?.name || currentCommonSource?.name,
      personSource: draft.personSource,
      figureType: currentCommonFigure?.type || draft.selectedFigureType,
      figureCoverUrl: currentCustomSource?.coverImageUrl || currentCommonFigure?.cover,
      figurePreviewVideoUrl: currentCustomSource?.previewVideoUrl || currentCommonFigure?.previewVideoUrl,
      figureWidth: currentCustomSource?.width || currentCommonFigure?.width,
      figureHeight: currentCustomSource?.height || currentCommonFigure?.height,
      audioManId: resolvedVoice?.id || currentCustomSource?.audioManId || currentCommonSource?.audioManId,
      audioName: resolvedVoice?.name || currentCommonSource?.audioName,
      script: draft.script.trim(),
      speechRate: Number(draft.speechRate || 1),
      pitch: Number(draft.pitch || 0),
      volume: Number(draft.volume || 1),
      language: (draft.selectedVoiceMode === "PUBLIC" ? currentPublicVoice?.lang : undefined) || currentCustomSource?.language || currentCommonSource?.audioLang || "cn",
      backgroundColor: draft.backgroundColor,
      backgroundImageFile: draft.backgroundImageFile,
      backgroundImageUrl: draft.backgroundImageUrl || undefined,
      backgroundImageName: draft.backgroundImageName || undefined,
      subtitleEnabled: draft.subtitleEnabled,
      subtitlePositionX: Number(draft.subtitlePositionX || 0),
      subtitlePositionY: Number(draft.subtitlePositionY || 0),
      subtitleWidth: Number(draft.subtitleWidth || 0),
      subtitleHeight: Number(draft.subtitleHeight || 0),
      subtitleFontSize: Number(draft.subtitleFontSize || 0),
      subtitleTextColor: draft.subtitleTextColor,
      subtitleStrokeColor: draft.subtitleStrokeColor,
      subtitleStrokeWidth: Number(draft.subtitleStrokeWidth || 0),
      subtitleFontId: draft.subtitleFontId || undefined,
      addComplianceWatermark: draft.addComplianceWatermark !== false,
      screenWidth: Number(draft.screenWidth || 1080),
      screenHeight: Number(draft.screenHeight || 1920),
      customPersonTrainType: currentCustomSource?.trainType,
      customPersonSupport4k: currentCustomSource?.support4k,
      customPersonWidth4k: currentCustomSource?.width4k,
      customPersonHeight4k: currentCustomSource?.height4k,
    };
  };

  const handleSubmitCurrentVideo = () => {
    if (createDisabled) {
      return;
    }
    const payload = buildVideoPayloadFromDraft({
      id: activeDraftCard?.id || createDigitalHumanDraftId(),
      name: activeDraftCard?.name || "当前片段",
      personSource: selectedPersonSource,
      selectedTemplateId,
      selectedCustomPersonId,
      selectedFigureType,
      selectedVoiceMode,
      selectedPublicVoiceId,
      selectedCustomVoiceId,
      selectedMaterialLibraryItemId,
      title,
      script,
      speechRate,
      pitch,
      volume,
      backgroundColor,
      backgroundImageFile,
      backgroundImageUrl,
      backgroundImageName,
      subtitleEnabled,
      subtitlePositionX,
      subtitlePositionY,
      subtitleWidth,
      subtitleHeight,
      subtitleFontSize,
      subtitleTextColor,
      subtitleStrokeColor,
      subtitleStrokeWidth,
      subtitleFontId,
      addComplianceWatermark,
      screenWidth,
      screenHeight,
    });
    if (!payload) {
      setEditorActionMessage("当前片段信息不完整，请先补齐数字人和脚本。");
      return;
    }
    void props.onCreate(payload);
  };

  const handleSubmitBatchVideos = async () => {
    const validDrafts = creatorDraftCards
      .map((draft) => ({ draft, payload: buildVideoPayloadFromDraft(draft) }))
      .filter((item) => Boolean(item.payload)) as Array<{ draft: DigitalHumanCreatorDraftCard; payload: NonNullable<ReturnType<typeof buildVideoPayloadFromDraft>> }>;
    if (!validDrafts.length) {
      setEditorActionMessage("当前没有可批量生成的片段，请先补齐至少一个有效片段。");
      return;
    }
    let successCount = 0;
    for (const item of validDrafts) {
      const success = await props.onCreate(item.payload);
      if (success) {
        successCount += 1;
      }
    }
    setEditorActionMessage(`批量生成已提交 ${successCount}/${validDrafts.length} 个片段。`);
  };

  const handleSubmitCompleteVideo = async () => {
    const validDrafts = creatorDraftCards
      .map((draft) => ({ draft, payload: buildVideoPayloadFromDraft(draft) }))
      .filter((item) => Boolean(item.payload)) as Array<{ draft: DigitalHumanCreatorDraftCard; payload: NonNullable<ReturnType<typeof buildVideoPayloadFromDraft>> }>;
    if (validDrafts.length < 2) {
      setEditorActionMessage("生成完整作品至少需要 2 个有效片段，请先补齐数字人和脚本。");
      return;
    }
    const success = await props.onCreateCompleteVideo({
      title: title.trim() || `${validDrafts[0]?.payload.personName || "数字人"} 完整作品`,
      segments: validDrafts.map((item) => item.payload),
    });
    if (success) {
      setEditorActionMessage(`完整作品已提交，系统将按顺序生成并拼接 ${validDrafts.length} 个片段。`);
    }
  };

  const handleOpenAudioDriveDialog = () => {
    setAudioDriveTitle(title.trim() || `${activeDraftCard?.name || "当前片段"} 音频驱动`);
    setAudioDriveSourceVideoFile(null);
    setAudioDriveAudioFile(null);
    setAudioDriveAudioDurationLabel("");
    setIsAudioDriveDialogOpen(true);
  };

  const handleCloseAudioDriveDialog = () => {
    setIsAudioDriveDialogOpen(false);
    setAudioDriveSourceVideoFile(null);
    setAudioDriveAudioFile(null);
    setAudioDriveTitle("");
    setAudioDriveAudioDurationLabel("");
  };

  const handleSubmitAudioDrive = async () => {
    if (!audioDriveSourceVideoFile || !audioDriveAudioFile) {
      return;
    }
    const normalizedAudioDriveVolume = Math.max(0, Math.round(Number(volume || 1) * 100));
    const success = await props.onCreateLipSync({
      title: audioDriveTitle.trim() || undefined,
      sourceVideoFile: audioDriveSourceVideoFile,
      audioType: "AUDIO",
      audioFile: audioDriveAudioFile,
      volume: normalizedAudioDriveVolume || 100,
      screenWidth: Number(screenWidth || 1080),
      screenHeight: Number(screenHeight || 1920),
    });
    if (!success) {
      return;
    }
    handleCloseAudioDriveDialog();
    setEditorActionMessage("音频驱动任务已提交，可在作品中心继续查看进度。");
  };

  const handleApplyOriginalCopy = (item: DouyinOriginalCopyRecord) => {
    setScript(item.content || "");
    if (!title.trim()) {
      setTitle(item.title || "原创文案片段");
    }
    setShowScriptTemplateManager(false);
    setEditorActionMessage(`已带入原创文案：${item.title}`);
  };

  const handleApplyRemixCopy = (item: DouyinRemixCopyRecord) => {
    setScript(item.content || "");
    if (!title.trim()) {
      setTitle(item.title || "二创文案片段");
    }
    setShowScriptTemplateManager(false);
    setEditorActionMessage(`已带入二创文案：${item.title}`);
  };

  const handleCreateOriginalCopyFromStudio = async (payload: {
    calendarItemId?: string;
    topicId?: string;
    injectMarketingPlan: boolean;
    copyType: "VIEWPOINT" | "STORY" | "PROCESS" | "KNOWLEDGE" | "PLOT_SALES" | "SEEDING" | "LOCAL_SALES";
    userRequirement?: string;
  }) => {
    const success = await props.onCreateOriginalCopy(payload);
    if (success) {
      setPendingAutoApplyCopy({
        source: "ORIGINAL",
        baselineId: props.originalCopyLatest?.id,
        scriptSnapshot: script,
        titleSnapshot: title,
      });
      setEditorActionMessage("原创文案任务已提交，稍后可在弹窗中一键带入结果。");
    }
    return success;
  };

  const handleCreateRemixCopyFromStudio = async (payload: {
    materialId: string;
    injectBrandProfile: boolean;
    productId?: string;
    injectMarketingPlan: boolean;
    userRequirement?: string;
  }) => {
    const success = await props.onCreateRemixCopy(payload);
    if (success) {
      setPendingAutoApplyCopy({
        source: "REMIX",
        baselineId: props.remixCopyLatest?.id,
        scriptSnapshot: script,
        titleSnapshot: title,
      });
      setEditorActionMessage("二创文案任务已提交，稍后可在弹窗中一键带入结果。");
    }
    return success;
  };

  useEffect(() => {
    if (!pendingAutoApplyCopy) {
      return;
    }

    if (pendingAutoApplyCopy.source === "ORIGINAL") {
      const latest = props.originalCopyLatest;
      if (latest?.id && latest.id !== pendingAutoApplyCopy.baselineId) {
        const scriptChanged = script !== pendingAutoApplyCopy.scriptSnapshot;
        const titleChanged = title !== pendingAutoApplyCopy.titleSnapshot;
        if (!scriptChanged && !titleChanged) {
          setScript(latest.content || "");
          if (!title.trim()) {
            setTitle(latest.title || "原创文案片段");
          }
          setEditorActionMessage(`原创文案已自动带入：${latest.title}`);
        } else {
          setEditorActionMessage(`原创文案已生成：${latest.title}。检测到当前片段已被修改，未自动覆盖，可在“原创文案”中手动带入。`);
        }
        setPendingAutoApplyCopy(null);
        return;
      }

      if (props.originalCopyTaskStatus && !["RUNNING", "QUEUED", "PENDING"].includes(props.originalCopyTaskStatus)) {
        setPendingAutoApplyCopy(null);
      }
      return;
    }

    const latest = props.remixCopyLatest;
    if (latest?.id && latest.id !== pendingAutoApplyCopy.baselineId) {
      const scriptChanged = script !== pendingAutoApplyCopy.scriptSnapshot;
      const titleChanged = title !== pendingAutoApplyCopy.titleSnapshot;
      if (!scriptChanged && !titleChanged) {
        setScript(latest.content || "");
        if (!title.trim()) {
          setTitle(latest.title || "二创文案片段");
        }
        setEditorActionMessage(`二创文案已自动带入：${latest.title}`);
      } else {
        setEditorActionMessage(`二创文案已生成：${latest.title}。检测到当前片段已被修改，未自动覆盖，可在“二创文案”中手动带入。`);
      }
      setPendingAutoApplyCopy(null);
      return;
    }

    if (props.remixCopyTaskStatus && !["RUNNING", "QUEUED", "PENDING"].includes(props.remixCopyTaskStatus)) {
      setPendingAutoApplyCopy(null);
    }
  }, [
    pendingAutoApplyCopy,
    props.originalCopyLatest,
    props.originalCopyTaskStatus,
    props.remixCopyLatest,
    props.remixCopyTaskStatus,
    script,
    title,
  ]);

  useEffect(() => {
    if (activeTab !== "videoStudio") {
      return;
    }
    if (!props.currentSpeechTaskId) {
      return;
    }
    if (props.currentSpeechTask?.full?.url) {
      return;
    }
    if (props.currentSpeechTask?.errMsg || props.currentSpeechTask?.errReason) {
      return;
    }
    const timer = window.setTimeout(() => {
      void props.onRefreshSpeechTask(props.currentSpeechTaskId);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    props.currentSpeechTask?.errMsg,
    props.currentSpeechTask?.errReason,
    props.currentSpeechTask?.full?.url,
    props.currentSpeechTaskId,
    props.onRefreshSpeechTask,
  ]);

  return (
    <section className="workspace-panel strategy-page-card">
      <WorkspaceSectionHeader
        sectionLabel={props.sectionLabel}
        sectionDescription={activeTabMeta.description}
        createLabel={primaryActionLabel}
        refreshDisabled={props.isLoading || props.isSubmitting}
        createDisabled={primaryActionDisabled}
        onRefresh={props.onRefresh}
        onOpenCreate={() => {
          if (activeTab === "home") {
            setActiveTab("videoStudio");
            return;
          }
          if (activeTab === "templateLibrary") {
            if (selectedTemplate) {
              handleUseTemplateInVideo({ templateId: selectedTemplate.id, figureType: selectedFigure?.type });
            }
            return;
          }
          if (activeTab === "voiceLibrary") {
            void props.onRefresh();
            return;
          }
          if (activeTab === "videoStudio") {
            handleSubmitCurrentVideo();
            return;
          }
          if (activeTab === "worksCenter") {
            handleBackfillSelectedWork();
          }
        }}
      />

      <div className="strategy-inline-actions" style={{ marginTop: 20, flexWrap: "wrap" }}>
        {DIGITAL_HUMAN_WORKSPACE_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={item.key === activeTab ? "primary-button" : "secondary-button"}
            onClick={() => setActiveTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === "home" ? (
        <DigitalHumanHomePanel
          templates={props.templates}
          favoriteTemplateIds={props.favoriteTemplateIds}
          customPersons={props.customPersons}
          works={props.items}
          publicVoiceCount={props.publicVoices.length}
          customVoiceCount={props.customVoices.length}
          isSubmitting={props.isSubmitting}
          canEdit={props.canEdit}
          formatDateTime={props.formatDateTime}
          onRefresh={props.onRefresh}
          onCreateCustomPerson={props.onCreateCustomPerson}
          onUseTemplate={handleUseTemplateInVideo}
          onUseCustomPerson={handleUseCustomPersonInVideo}
          onOpenCreator={() => setActiveTab("videoStudio")}
          onOpenTemplateLibrary={() => setActiveTab("templateLibrary")}
          onOpenVoiceLibrary={() => setActiveTab("voiceLibrary")}
          onOpenWorksCenter={() => setActiveTab("worksCenter")}
        />
      ) : null}

      {activeTab === "templateLibrary" ? (
        <DigitalHumanTemplateLibrary
          templateCountLabel={templateCountLabel}
          workCountLabel={workCountLabel}
          templateTagGroups={props.templateTagGroups}
          activeTagId={props.activeTagId}
          templateLoadError={props.templateLoadError}
          templateTagLoadError={props.templateTagLoadError}
          isTemplateLoading={props.isTemplateLoading}
          templateSearch={templateSearch}
          templateScopeFilter={templateScopeFilter}
          filteredTemplates={filteredTemplates}
          favoriteTemplateIds={props.favoriteTemplateIds}
          templatePageInfo={props.templatePageInfo}
          onTemplateTagChange={props.onTemplateTagChange}
          onTemplateSearchChange={setTemplateSearch}
          onTemplateScopeFilterChange={setTemplateScopeFilter}
          onSelectedTemplateChange={setSelectedTemplateId}
          onSelectedFigureTypeChange={setSelectedFigureType}
          onToggleFavoriteTemplate={props.onToggleFavoriteTemplate}
          onUseTemplate={handleUseTemplateInVideo}
          getFigureTypeLabel={getFigureTypeLabel}
          onTemplatePageChange={props.onTemplatePageChange}
        />
      ) : null}

      {activeTab === "videoStudio" ? (
        <DigitalHumanVideoPanel
          templateCountLabel={templateCountLabel}
          workCountLabel={workCountLabel}
          personSource={selectedPersonSource}
          templateTagGroups={props.templateTagGroups}
          activeTagId={props.activeTagId}
          templateLoadError={props.templateLoadError}
          templateTagLoadError={props.templateTagLoadError}
          isTemplateLoading={props.isTemplateLoading}
          templateSearch={templateSearch}
          templateScopeFilter={templateScopeFilter}
          filteredTemplates={filteredTemplates}
          availableCustomPersons={availableCustomPersons}
          selectedTemplateId={selectedTemplateId}
          selectedTemplate={selectedTemplate}
          selectedCustomPersonId={selectedCustomPersonId}
          selectedCustomPerson={selectedCustomPerson}
          selectedFigureType={selectedFigureType}
          selectedFigure={selectedFigure}
          selectedVoiceMode={selectedVoiceMode}
          selectedPublicVoiceId={selectedPublicVoiceId}
          selectedCustomVoiceId={selectedCustomVoiceId}
          publicVoices={props.publicVoices}
          customVoices={props.customVoices}
          selectedPublicVoice={selectedPublicVoice}
          selectedCustomVoice={selectedCustomVoice}
          materialLibraryItems={props.materialLibraryItems}
          selectedMaterialLibraryItemId={selectedMaterialLibraryItemId}
          selectedMaterialLibraryItem={selectedMaterialLibraryItem}
          creatorDraftCards={creatorDraftCardSummaries}
          activeDraftCardId={activeDraftCardId}
          isAudioDriveDialogOpen={isAudioDriveDialogOpen}
          audioDriveTitle={audioDriveTitle}
          audioDriveSourceVideoFile={audioDriveSourceVideoFile}
          audioDriveAudioFile={audioDriveAudioFile}
          audioDriveAudioPreviewUrl={audioDriveAudioPreviewUrl}
          audioDriveAudioDurationLabel={audioDriveAudioDurationLabel}
          title={title}
          script={script}
          speechRate={speechRate}
          pitch={pitch}
          volume={volume}
          backgroundColor={backgroundColor}
          backgroundImageFile={backgroundImageFile}
          backgroundImageUrl={backgroundImageUrl}
          backgroundImageName={backgroundImageName}
          subtitleEnabled={subtitleEnabled}
          subtitlePositionX={subtitlePositionX}
          subtitlePositionY={subtitlePositionY}
          subtitleWidth={subtitleWidth}
          subtitleHeight={subtitleHeight}
          subtitleFontSize={subtitleFontSize}
          subtitleTextColor={subtitleTextColor}
          subtitleStrokeColor={subtitleStrokeColor}
          subtitleStrokeWidth={subtitleStrokeWidth}
          subtitleFontId={subtitleFontId}
          addComplianceWatermark={addComplianceWatermark}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          scriptTemplateVisibility={scriptTemplateVisibility}
          scriptTemplateCategory={scriptTemplateCategory}
          personalScriptTemplateNote={personalScriptTemplateNote}
          showScriptTemplateManager={showScriptTemplateManager}
          personalScriptTemplateSearch={personalScriptTemplateSearch}
          personalScriptTemplateFilter={personalScriptTemplateFilter}
          personalScriptTemplateArchiveFilter={personalScriptTemplateArchiveFilter}
          personalScriptTemplateCategoryFilter={personalScriptTemplateCategoryFilter}
          personalScriptTemplateGovernanceFilter={personalScriptTemplateGovernanceFilter}
          personalScriptTemplateSort={personalScriptTemplateSort}
          selectedPersonalScriptTemplateId={selectedPersonalScriptTemplateId}
          filteredPersonalScriptTemplates={filteredPersonalScriptTemplates}
          personalScriptTemplateName={personalScriptTemplateName}
          selectedPersonalScriptTemplate={selectedPersonalScriptTemplate}
          selectedPersonalScriptTemplateEditable={selectedPersonalScriptTemplateEditable}
          selectedPersonalScriptTemplateArchived={selectedPersonalScriptTemplateArchived}
          scriptTemplateSaveScopeLabel={scriptTemplateSaveScopeLabel}
          isReadonlySharedScriptTemplate={isReadonlySharedScriptTemplate}
          currentSpeechTask={props.currentSpeechTask}
          currentSpeechTaskId={props.currentSpeechTaskId}
          originalCopyLatest={props.originalCopyLatest}
          originalCopyHistory={props.originalCopyHistory}
          originalCopyTaskStatus={props.originalCopyTaskStatus}
          remixCopyLatest={props.remixCopyLatest}
          remixCopyHistory={props.remixCopyHistory}
          remixCopyTaskStatus={props.remixCopyTaskStatus}
          originalCopyCalendarOptions={props.originalCopyCalendarOptions}
          originalCopyTopicOptions={props.originalCopyTopicOptions}
          remixCopyProductOptions={props.remixCopyProductOptions}
          scriptActionMessage={scriptActionMessage}
          editorActionMessage={editorActionMessage}
          personalTemplateGovernanceSummary={personalTemplateGovernanceSummary}
          selectedTemplateAuditMessages={selectedTemplateAuditMessages}
          selectedWork={selectedWork}
          editorDiffs={editorDiffs}
          recentTemplates={recentTemplates}
          isSelectedTemplateFavorite={isSelectedTemplateFavorite}
          isSubmitting={props.isSubmitting}
          canEdit={props.canEdit}
          scriptPresets={DIGITAL_HUMAN_SCRIPT_PRESETS}
          scriptTemplateCategories={DIGITAL_HUMAN_SCRIPT_TEMPLATE_CATEGORIES}
          templatePageInfo={props.templatePageInfo}
          formatDateTime={props.formatDateTime}
          onPersonSourceChange={setSelectedPersonSource}
          onTemplateTagChange={props.onTemplateTagChange}
          onTemplateSearchChange={setTemplateSearch}
          onTemplateScopeFilterChange={setTemplateScopeFilter}
          onSelectedTemplateChange={setSelectedTemplateId}
          onSelectedCustomPersonChange={setSelectedCustomPersonId}
          onSelectedFigureTypeChange={setSelectedFigureType}
          onSelectedVoiceModeChange={setSelectedVoiceMode}
          onSelectedPublicVoiceChange={setSelectedPublicVoiceId}
          onSelectedCustomVoiceChange={setSelectedCustomVoiceId}
          onSelectedMaterialLibraryItemChange={setSelectedMaterialLibraryItemId}
          onSelectCreatorDraftCard={handleSelectCreatorDraftCard}
          onCreateCreatorDraftCard={handleCreateCreatorDraftCard}
          onDuplicateCreatorDraftCard={handleDuplicateCreatorDraftCard}
          onDeleteActiveDraftCard={handleDeleteActiveDraftCard}
          onMoveActiveDraftCardUp={() => handleMoveActiveDraftCard(-1)}
          onMoveActiveDraftCardDown={() => handleMoveActiveDraftCard(1)}
          canMoveActiveDraftCardUp={canMoveActiveDraftCardUp}
          canMoveActiveDraftCardDown={canMoveActiveDraftCardDown}
          onOpenAudioDriveDialog={handleOpenAudioDriveDialog}
          onCloseAudioDriveDialog={handleCloseAudioDriveDialog}
          onAudioDriveTitleChange={setAudioDriveTitle}
          onAudioDriveSourceVideoFileChange={setAudioDriveSourceVideoFile}
          onAudioDriveAudioFileChange={setAudioDriveAudioFile}
          onTitleChange={setTitle}
          onScriptChange={setScript}
          onSpeechRateChange={setSpeechRate}
          onPitchChange={setPitch}
          onVolumeChange={setVolume}
          onBackgroundColorChange={setBackgroundColor}
          onBackgroundImageFileChange={setBackgroundImageFile}
          onBackgroundImageUrlChange={setBackgroundImageUrl}
          onBackgroundImageNameChange={setBackgroundImageName}
          onSubtitleEnabledChange={setSubtitleEnabled}
          onSubtitlePositionXChange={setSubtitlePositionX}
          onSubtitlePositionYChange={setSubtitlePositionY}
          onSubtitleWidthChange={setSubtitleWidth}
          onSubtitleHeightChange={setSubtitleHeight}
          onSubtitleFontSizeChange={setSubtitleFontSize}
          onSubtitleTextColorChange={setSubtitleTextColor}
          onSubtitleStrokeColorChange={setSubtitleStrokeColor}
          onSubtitleStrokeWidthChange={setSubtitleStrokeWidth}
          onSubtitleFontIdChange={setSubtitleFontId}
          onAddComplianceWatermarkChange={setAddComplianceWatermark}
          onScreenWidthChange={setScreenWidth}
          onScreenHeightChange={setScreenHeight}
          onScriptTemplateVisibilityChange={setScriptTemplateVisibility}
          onScriptTemplateCategoryChange={setScriptTemplateCategory}
          onPersonalScriptTemplateNoteChange={setPersonalScriptTemplateNote}
          onShowScriptTemplateManagerChange={setShowScriptTemplateManager}
          onPersonalScriptTemplateSearchChange={setPersonalScriptTemplateSearch}
          onPersonalScriptTemplateFilterChange={setPersonalScriptTemplateFilter}
          onPersonalScriptTemplateArchiveFilterChange={setPersonalScriptTemplateArchiveFilter}
          onPersonalScriptTemplateCategoryFilterChange={setPersonalScriptTemplateCategoryFilter}
          onPersonalScriptTemplateGovernanceFilterChange={setPersonalScriptTemplateGovernanceFilter}
          onPersonalScriptTemplateSortChange={setPersonalScriptTemplateSort}
          onSelectedPersonalScriptTemplateChange={setSelectedPersonalScriptTemplateId}
          onPersonalScriptTemplateNameChange={setPersonalScriptTemplateName}
          onToggleFavoriteTemplate={props.onToggleFavoriteTemplate}
          onCopyScript={handleCopyScript}
          onExportScript={handleExportScript}
          onSaveCurrentScriptTemplate={handleSaveCurrentScriptTemplate}
          onApplyPersonalScriptTemplate={handleApplyPersonalScriptTemplate}
          onRenamePersonalScriptTemplate={handleRenamePersonalScriptTemplate}
          onUpdatePersonalScriptTemplateCategory={handleUpdatePersonalScriptTemplateCategory}
          onUpdatePersonalScriptTemplateNote={handleUpdatePersonalScriptTemplateNote}
          onOverwritePersonalScriptTemplate={handleOverwritePersonalScriptTemplate}
          onToggleSharedPersonalScriptTemplate={handleToggleSharedPersonalScriptTemplate}
          onToggleArchivePersonalScriptTemplate={handleToggleArchivePersonalScriptTemplate}
          onDuplicatePersonalScriptTemplate={handleDuplicatePersonalScriptTemplate}
          onDeletePersonalScriptTemplate={handleDeletePersonalScriptTemplate}
          onTemplatePageChange={props.onTemplatePageChange}
          onCreateSpeechTask={props.onCreateSpeechTask}
          onRefreshSpeechTask={props.onRefreshSpeechTask}
          onApplyOriginalCopy={handleApplyOriginalCopy}
          onApplyRemixCopy={handleApplyRemixCopy}
          onCreateOriginalCopy={handleCreateOriginalCopyFromStudio}
          onCreateRemixCopy={handleCreateRemixCopyFromStudio}
          onSubmitCurrentVideo={handleSubmitCurrentVideo}
          onSubmitCompleteVideo={handleSubmitCompleteVideo}
          onSubmitBatchVideos={handleSubmitBatchVideos}
          onSubmitAudioDrive={handleSubmitAudioDrive}
          getFigureTypeLabel={getFigureTypeLabel}
          getScriptTemplateCategoryLabel={getScriptTemplateCategoryLabel}
          getScriptTemplateArchiveLabel={getScriptTemplateArchiveLabel}
        />
      ) : null}

      {activeTab === "voiceLibrary" ? (
        <DigitalHumanVoiceLibraryWorkspace
          publicVoices={props.publicVoices}
          customVoices={props.customVoices}
          publicVoicePageInfo={props.publicVoicePageInfo}
          customVoicePageInfo={props.customVoicePageInfo}
          publicVoiceLoadError={props.publicVoiceLoadError}
          customVoiceLoadError={props.customVoiceLoadError}
          currentSpeechTask={props.currentSpeechTask}
          currentSpeechTaskId={props.currentSpeechTaskId}
          isSubmitting={props.isSubmitting}
          canEdit={props.canEdit}
          onRefresh={props.onRefresh}
          onRefreshPublicVoices={props.onRefreshPublicVoices}
          onRefreshCustomVoices={props.onRefreshCustomVoices}
          onCreateCustomVoice={props.onCreateCustomVoice}
          onDeleteCustomVoice={props.onDeleteCustomVoice}
          onCreateSpeechTask={props.onCreateSpeechTask}
          onRefreshSpeechTask={props.onRefreshSpeechTask}
        />
      ) : null}

      {activeTab === "worksCenter" ? (
        <DigitalHumanWorksCenterPanel
          items={props.items}
          filteredWorks={filteredWorks}
          pagedItems={pagedItems}
          selectedWork={selectedWork}
          selectedWorkId={selectedWorkId}
          selectedWorkIsRecoverable={selectedWorkIsRecoverable}
          workSearch={workSearch}
          workStageFilter={workStageFilter}
          page={page}
          pageCount={pageCount}
          manualRecoverTaskId={manualRecoverTaskId}
          editorDiffs={editorDiffs}
          isSubmitting={props.isSubmitting}
          canEdit={props.canEdit}
          formatDateTime={props.formatDateTime}
          getStageLabel={getStageLabel}
          getStageClass={getStageClass}
          getFigureTypeLabel={getFigureTypeLabel}
          onWorkSearchChange={setWorkSearch}
          onWorkStageFilterChange={setWorkStageFilter}
          onSelectWork={setSelectedWorkId}
          onPageChange={setPage}
          onManualRecoverTaskIdChange={setManualRecoverTaskId}
          onBackfillSelectedWork={handleBackfillSelectedWork}
          onRecoverVideo={props.onRecoverVideo}
          onRetrySelectedWork={handleRetrySelectedWork}
          onPreview={props.onPreview}
          onDelete={props.onDelete}
        />
      ) : null}

      {activeTab === "customPerson" ? (
        <DigitalHumanCustomPersonWorkspace
          items={props.customPersons}
          isSubmitting={props.isSubmitting}
          canEdit={props.canEdit}
          onRefresh={props.onRefresh}
          onCreate={props.onCreateCustomPerson}
          onDelete={props.onDeleteCustomPerson}
          onUseInVideo={handleUseCustomPersonInVideo}
          formatDateTime={props.formatDateTime}
        />
      ) : null}

      {activeTab === "lipSync" ? (
        <DigitalHumanLipSyncWorkspace
          items={props.lipSyncItems}
          isSubmitting={props.isSubmitting}
          canEdit={props.canEdit}
          onRefresh={props.onRefresh}
          onCreate={props.onCreateLipSync}
          onRecover={props.onRecoverLipSync}
          onDelete={props.onDeleteLipSync}
          formatDateTime={props.formatDateTime}
        />
      ) : null}
    </section>
  );
}

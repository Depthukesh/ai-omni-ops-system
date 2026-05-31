"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DigitalHumanFigureType,
  type DigitalHumanTemplatePageInfo,
  type DigitalHumanTemplateRecord,
  type DigitalHumanTemplateTagGroupRecord,
  type DouyinDigitalHumanCustomPersonRecord,
  type DouyinLipSyncWorkRecord,
  type DouyinDigitalHumanScriptTemplateRecord,
  type DouyinDigitalHumanVideoWorkRecord,
} from "../../../services/works";
import { DigitalHumanCustomPersonWorkspace } from "./digital-human-custom-person-workspace";
import { DigitalHumanLipSyncWorkspace } from "./digital-human-lip-sync-workspace";
import { DigitalHumanPlaceholderPanel } from "./digital-human-placeholder-panel";
import { DigitalHumanTemplateLibrary } from "./digital-human-template-library";
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

type PersonalScriptTemplateSort = "UPDATED_DESC" | "UPDATED_ASC" | "NAME_ASC" | "NAME_DESC";
type PersonalScriptTemplateFilter = "ALL" | "SELF" | "SHARED";
type PersonalScriptTemplateArchiveFilter = "ACTIVE" | "ARCHIVED" | "ALL";
type PersonalScriptTemplateGovernanceFilter = "ALL" | "NEED_NOTE" | "READONLY_SHARED" | "SHARED_ACTIVE" | "ARCHIVED";
type ScriptTemplateCategory = "general" | "brand_promo" | "activity_promo" | "knowledge" | "live_warmup" | "selling";
type DigitalHumanWorkspaceTab = "templateLibrary" | "videoStudio" | "worksCenter" | "customPerson" | "lipSync";

const DIGITAL_HUMAN_WORKSPACE_TABS: Array<{ key: DigitalHumanWorkspaceTab; label: string; description: string }> = [
  { key: "templateLibrary", label: "模板库", description: "先筛选并预览公共数字人模板，再带入视频创建。" },
  { key: "videoStudio", label: "数字人视频", description: "基于选中模板填写脚本和参数，提交数字人视频。" },
  { key: "worksCenter", label: "作品中心", description: "查看数字人视频结果、失败任务和找回进度。" },
  { key: "customPerson", label: "定制数字人", description: "V2 能力，占位说明已补，后续接训练和管理接口。" },
  { key: "lipSync", label: "口型驱动", description: "V2 能力，占位说明已补，后续接视频口型驱动流程。" },
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
  templateTagGroups: DigitalHumanTemplateTagGroupRecord[];
  templates: DigitalHumanTemplateRecord[];
  favoriteTemplateIds: string[];
  personalScriptTemplates: DouyinDigitalHumanScriptTemplateRecord[];
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
  onCreate: (payload: {
    title?: string;
    personId?: string;
    personName?: string;
    personSource?: "COMMON" | "CUSTOM";
    figureType?: DigitalHumanFigureType;
    figureCoverUrl?: string;
    figurePreviewVideoUrl?: string;
    figureWidth?: number;
    figureHeight?: number;
    audioManId?: string;
    audioName?: string;
    script?: string;
    speechRate?: number;
    pitch?: number;
    volume?: number;
    language?: string;
    backgroundColor?: string;
    subtitleEnabled?: boolean;
    subtitleTextColor?: string;
    subtitleStrokeColor?: string;
    screenWidth?: number;
    screenHeight?: number;
    customPersonTrainType?: "figure" | "both";
    customPersonSupport4k?: boolean;
    customPersonWidth4k?: number;
    customPersonHeight4k?: number;
  }) => Promise<boolean>;
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
  formatDateTime: OptionalDateFormatter;
}

export function DouyinDigitalHumanWorkspace(props: DouyinDigitalHumanWorkspaceProps) {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<DigitalHumanWorkspaceTab>("templateLibrary");
  const [selectedPersonSource, setSelectedPersonSource] = useState<"COMMON" | "CUSTOM">("COMMON");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedCustomPersonId, setSelectedCustomPersonId] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateScopeFilter, setTemplateScopeFilter] = useState<"ALL" | "FAVORITES" | "RECENT">("ALL");
  const [workSearch, setWorkSearch] = useState("");
  const [workStageFilter, setWorkStageFilter] = useState<string>("ALL");
  const [selectedFigureType, setSelectedFigureType] = useState<DigitalHumanFigureType>("sit_body");
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [speechRate, setSpeechRate] = useState("1");
  const [pitch, setPitch] = useState("0");
  const [volume, setVolume] = useState("1");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [subtitleTextColor, setSubtitleTextColor] = useState("#FFFFFF");
  const [subtitleStrokeColor, setSubtitleStrokeColor] = useState("#000000");
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
    selectedPersonSource,
    selectedTemplate?.name,
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
    ? `已加载 ${props.templates.length}/${props.templatePageInfo.totalCount} 个模板`
    : props.templates.length
      ? `${props.templates.length} 个模板`
      : "暂无模板";
  const workCountLabel = filteredWorks.length ? `${filteredWorks.length} 条作品` : "暂无作品";
  const primaryActionLabel =
    activeTab === "templateLibrary"
      ? "带入视频创建"
      : activeTab === "videoStudio"
        ? "提交数字人视频"
        : activeTab === "worksCenter"
          ? "回填到创建区"
          : "建设中";
  const primaryActionDisabled =
    activeTab === "templateLibrary"
      ? !selectedTemplate
      : activeTab === "videoStudio"
        ? createDisabled
        : activeTab === "worksCenter"
          ? !selectedWork || props.isSubmitting
          : true;

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
      subtitleEnabled: selectedWork.subtitleEnabled,
      subtitleTextColor: selectedWork.subtitleTextColor,
      subtitleStrokeColor: selectedWork.subtitleStrokeColor,
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
    setSubtitleEnabled(Boolean(selectedWork.subtitleEnabled));
    setSubtitleTextColor(selectedWork.subtitleTextColor || "#FFFFFF");
    setSubtitleStrokeColor(selectedWork.subtitleStrokeColor || "#000000");
    setScreenWidth(String(selectedWork.screenWidth || 1080));
    setScreenHeight(String(selectedWork.screenHeight || 1920));
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

  const handleSubmitCurrentVideo = () => {
    if (createDisabled) {
      return;
    }
    const currentCommonSource = selectedPersonSource === "COMMON" ? selectedTemplate : undefined;
    const currentCommonFigure = selectedPersonSource === "COMMON" ? selectedFigure : undefined;
    const currentCustomSource = selectedPersonSource === "CUSTOM" ? selectedCustomPerson : undefined;
    void props.onCreate({
      title: title.trim() || `${currentCustomSource?.name || currentCommonSource?.name || "数字人"} 数字人口播`,
      personId: currentCustomSource?.personId || currentCustomSource?.id || currentCommonSource?.id,
      personName: currentCustomSource?.name || currentCommonSource?.name,
      personSource: selectedPersonSource,
      figureType: currentCommonFigure?.type || selectedFigureType,
      figureCoverUrl: currentCustomSource?.coverImageUrl || currentCommonFigure?.cover,
      figurePreviewVideoUrl: currentCustomSource?.previewVideoUrl || currentCommonFigure?.previewVideoUrl,
      figureWidth: currentCustomSource?.width || currentCommonFigure?.width,
      figureHeight: currentCustomSource?.height || currentCommonFigure?.height,
      audioManId: currentCustomSource?.audioManId || currentCommonSource?.audioManId,
      audioName: currentCommonSource?.audioName,
      script: script.trim(),
      speechRate: Number(speechRate || 1),
      pitch: Number(pitch || 0),
      volume: Number(volume || 1),
      language: currentCustomSource?.language || currentCommonSource?.audioLang || "cn",
      backgroundColor,
      subtitleEnabled,
      subtitleTextColor,
      subtitleStrokeColor,
      screenWidth: Number(screenWidth || 1080),
      screenHeight: Number(screenHeight || 1920),
      customPersonTrainType: currentCustomSource?.trainType,
      customPersonSupport4k: currentCustomSource?.support4k,
      customPersonWidth4k: currentCustomSource?.width4k,
      customPersonHeight4k: currentCustomSource?.height4k,
    });
  };

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
          if (activeTab === "templateLibrary") {
            if (selectedTemplate) {
              setSelectedPersonSource("COMMON");
              setActiveTab("videoStudio");
            }
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

      <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
        <div className="strategy-inline-actions" style={{ flexWrap: "wrap" }}>
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
        <div className="strategy-grid" style={{ marginTop: 16 }}>
          <div className="entity-card personal-card">
            <strong>当前栏目</strong>
            <p className="personal-meta">{activeTabMeta.label}</p>
            <p className="panel-subtext">{activeTabMeta.description}</p>
          </div>
          <div className="entity-card personal-card">
            <strong>模板库</strong>
            <p className="personal-meta">
              {templateCountLabel}
            </p>
            <p className="panel-subtext">
              当前视频来源：{selectedPersonSource === "CUSTOM" ? `定制数字人 / ${selectedCustomPerson?.name || "未选择"}` : `公共模板 / ${selectedTemplate?.name || "未选择模板"}`}
            </p>
          </div>
          <div className="entity-card personal-card">
            <strong>作品中心</strong>
            <p className="personal-meta">{workCountLabel}</p>
            <p className="panel-subtext">待找回：{props.items.filter((item) => isRecoverableWork(item)).length} 条</p>
          </div>
        </div>
      </article>

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
          onUseTemplate={(payload) => {
            setSelectedPersonSource("COMMON");
            if (payload?.templateId) {
              setSelectedTemplateId(payload.templateId);
            }
            if (payload?.figureType) {
              setSelectedFigureType(payload.figureType);
            }
            setActiveTab("videoStudio");
          }}
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
          title={title}
          script={script}
          speechRate={speechRate}
          pitch={pitch}
          volume={volume}
          backgroundColor={backgroundColor}
          subtitleEnabled={subtitleEnabled}
          subtitleTextColor={subtitleTextColor}
          subtitleStrokeColor={subtitleStrokeColor}
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
          onTitleChange={setTitle}
          onScriptChange={setScript}
          onSpeechRateChange={setSpeechRate}
          onPitchChange={setPitch}
          onVolumeChange={setVolume}
          onBackgroundColorChange={setBackgroundColor}
          onSubtitleEnabledChange={setSubtitleEnabled}
          onSubtitleTextColorChange={setSubtitleTextColor}
          onSubtitleStrokeColorChange={setSubtitleStrokeColor}
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
          onLoadMoreTemplates={undefined}
          onSubmitCurrentVideo={handleSubmitCurrentVideo}
          getFigureTypeLabel={getFigureTypeLabel}
          getScriptTemplateCategoryLabel={getScriptTemplateCategoryLabel}
          getScriptTemplateArchiveLabel={getScriptTemplateArchiveLabel}
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

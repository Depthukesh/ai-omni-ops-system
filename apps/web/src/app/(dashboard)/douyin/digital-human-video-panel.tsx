"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DigitalHumanFigureType,
  type DigitalHumanTemplatePageInfo,
  type DigitalHumanTemplateRecord,
  type DigitalHumanTemplateTagGroupRecord,
  type DouyinCustomVoiceRecord,
  type DouyinDigitalHumanCustomPersonRecord,
  type DouyinDigitalHumanScriptTemplateRecord,
  type DouyinSpeechTaskRecord,
  type DouyinDigitalHumanVideoWorkRecord,
  type DouyinVoiceLibraryRecord,
} from "../../../services/works";
import {
  type DouyinOriginalCopyRecord,
  type DouyinRemixCopyRecord,
} from "../../../services/reports";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

type PersonalScriptTemplateSort = "UPDATED_DESC" | "UPDATED_ASC" | "NAME_ASC" | "NAME_DESC";
type PersonalScriptTemplateFilter = "ALL" | "SELF" | "SHARED";
type PersonalScriptTemplateArchiveFilter = "ACTIVE" | "ARCHIVED" | "ALL";
type PersonalScriptTemplateGovernanceFilter = "ALL" | "NEED_NOTE" | "READONLY_SHARED" | "SHARED_ACTIVE" | "ARCHIVED";
type ScriptTemplateCategory = "general" | "brand_promo" | "activity_promo" | "knowledge" | "live_warmup" | "selling";

type DigitalHumanEditorDiffEntry = {
  key: string;
  label: string;
  currentValue: string;
  selectedValue: string;
};

type DigitalHumanVideoPanelDraftCard = {
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

type DigitalHumanVideoPanelMaterialItem = {
  id: string;
  label: string;
  videoUrl?: string;
  coverUrl?: string;
  workUrl?: string;
  sourceLabel?: string;
};

type DigitalHumanBackgroundPreset = {
  key: string;
  name: string;
  description: string;
  url: string;
};

type DigitalHumanFontOption = {
  label: string;
  value: string;
};

type DigitalHumanSubtitlePreset = {
  key: string;
  tab: "COMMON" | "TREND";
  name: string;
  description: string;
  previewTone: string;
  fontId: string;
  fontSize: string;
  textColor: string;
  strokeColor: string;
  strokeWidth: string;
};

type DigitalHumanSubtitleOutlinePreset = {
  key: string;
  name: string;
  strokeColor: string;
  strokeWidth: string;
};

const SUBTITLE_FONT_OPTIONS: DigitalHumanFontOption[] = [
  { label: "平台默认字体", value: "" },
  { label: "抖音美好体", value: "douyin_meihao" },
  { label: "思源黑体", value: "source_han_sans" },
  { label: "优设标题黑", value: "youshe_title_hei" },
  { label: "站酷快乐体", value: "zcool_happy" },
  { label: "阿里妈妈东方大楷", value: "alimama_dongfang_dakai" },
];

const SUBTITLE_COLOR_SWATCHES = ["#FFFFFF", "#FCE7F3", "#FDE68A", "#F97316", "#A855F7", "#60A5FA", "#34D399", "#111827", "#000000"];
const SUBTITLE_STROKE_SWATCHES = ["#000000", "#1F2937", "#7C2D12", "#7F1D1D", "#1E3A8A", "#14532D", "#6B21A8", "#FFFFFF"];
const SUBTITLE_PRESETS: DigitalHumanSubtitlePreset[] = [
  {
    key: "common-clean",
    tab: "COMMON",
    name: "清爽讲解",
    description: "白字黑描边，适合知识口播",
    previewTone: "linear-gradient(180deg, #d6d4ff 0%, #f1f0ff 100%)",
    fontId: "",
    fontSize: "48",
    textColor: "#FFFFFF",
    strokeColor: "#000000",
    strokeWidth: "2",
  },
  {
    key: "common-business",
    tab: "COMMON",
    name: "商务稳重",
    description: "偏深描边，适合品牌介绍",
    previewTone: "linear-gradient(180deg, #dce9ff 0%, #eef4ff 100%)",
    fontId: "source_han_sans",
    fontSize: "46",
    textColor: "#F8FAFC",
    strokeColor: "#1E293B",
    strokeWidth: "3",
  },
  {
    key: "common-warm",
    tab: "COMMON",
    name: "暖色种草",
    description: "暖橙文字，适合生活内容",
    previewTone: "linear-gradient(180deg, #ffe6cf 0%, #fff4e8 100%)",
    fontId: "douyin_meihao",
    fontSize: "50",
    textColor: "#FDE68A",
    strokeColor: "#7C2D12",
    strokeWidth: "2",
  },
  {
    key: "trend-purple",
    tab: "TREND",
    name: "网感紫调",
    description: "高饱和紫粉，适合网感表达",
    previewTone: "linear-gradient(180deg, #d7c8ff 0%, #efe8ff 100%)",
    fontId: "zcool_happy",
    fontSize: "54",
    textColor: "#F5D0FE",
    strokeColor: "#6B21A8",
    strokeWidth: "3",
  },
  {
    key: "trend-neon",
    tab: "TREND",
    name: "霓虹高亮",
    description: "亮色标题感，适合活动预热",
    previewTone: "linear-gradient(180deg, #c4f7ff 0%, #eefcff 100%)",
    fontId: "youshe_title_hei",
    fontSize: "56",
    textColor: "#67E8F9",
    strokeColor: "#1E3A8A",
    strokeWidth: "3",
  },
  {
    key: "trend-strong",
    tab: "TREND",
    name: "冲击红橙",
    description: "强视觉对比，适合爆点文案",
    previewTone: "linear-gradient(180deg, #ffd6c9 0%, #fff0e8 100%)",
    fontId: "alimama_dongfang_dakai",
    fontSize: "58",
    textColor: "#FDBA74",
    strokeColor: "#7F1D1D",
    strokeWidth: "4",
  },
];

const SUBTITLE_OUTLINE_PRESETS: DigitalHumanSubtitleOutlinePreset[] = [
  { key: "outline-soft", name: "轻描边", strokeColor: "#1F2937", strokeWidth: "2" },
  { key: "outline-classic", name: "经典黑边", strokeColor: "#000000", strokeWidth: "3" },
  { key: "outline-purple", name: "紫感描边", strokeColor: "#6B21A8", strokeWidth: "3" },
  { key: "outline-warm", name: "暖色描边", strokeColor: "#7C2D12", strokeWidth: "4" },
];

const DIGITAL_HUMAN_BACKGROUND_PRESETS: DigitalHumanBackgroundPreset[] = [
  {
    key: "office-living",
    name: "轻商务客厅",
    description: "适合知识分享和品牌口播",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=photorealistic%20modern%20living%20room%20for%20video%20shooting%2C%20clean%20sofa%2C%20wooden%20floor%2C%20soft%20window%20light%2C%20premium%20home%20studio%2C%20vertical%20composition%2C%20real%20interior&image_size=portrait_16_9",
  },
  {
    key: "meeting-room",
    name: "会议室场景",
    description: "适合企业宣传和商务表达",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=photorealistic%20modern%20conference%20room%20background%2C%20glass%20wall%2C%20city%20view%2C%20soft%20daylight%2C%20clean%20professional%20workspace%2C%20vertical%20composition&image_size=portrait_16_9",
  },
  {
    key: "cafe-window",
    name: "窗边咖啡馆",
    description: "适合轻种草和生活化表达",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=photorealistic%20stylish%20cafe%20interior%20background%2C%20large%20window%2C%20sunlight%2C%20wood%20table%2C%20warm%20lifestyle%20scene%2C%20vertical%20composition&image_size=portrait_16_9",
  },
  {
    key: "study-bookshelf",
    name: "书架书房",
    description: "适合课程讲解和干货输出",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=photorealistic%20elegant%20home%20office%20with%20bookshelf%2C%20desk%20lamp%2C%20warm%20light%2C%20educational%20video%20background%2C%20vertical%20composition&image_size=portrait_16_9",
  },
  {
    key: "city-night-studio",
    name: "城市夜景窗景",
    description: "适合活动预热和科技感内容",
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=photorealistic%20night%20city%20view%20from%20modern%20studio%2C%20glass%20window%2C%20soft%20indoor%20lighting%2C%20clean%20floor%2C%20vertical%20composition&image_size=portrait_16_9",
  },
];

const DIGITAL_HUMAN_CANVAS_PRESETS = [
  { value: "1080x1920", label: "竖版 1080 x 1920" },
  { value: "720x1280", label: "竖版 720 x 1280" },
  { value: "1080x1440", label: "竖版 1080 x 1440" },
  { value: "1080x1080", label: "方版 1080 x 1080" },
  { value: "1920x1080", label: "横版 1920 x 1080" },
] as const;

function estimateDurationSeconds(textLength: number) {
  return textLength ? Math.max(6, Math.ceil(textLength / 6)) : 0;
}

function formatEstimatedDuration(seconds: number) {
  if (!seconds) {
    return "待输入文案";
  }
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return minutes ? `${minutes}分${restSeconds}秒` : `${restSeconds}秒`;
}

function parseNumericValue(value: string, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
}

export interface DigitalHumanVideoPanelProps {
  templateCountLabel: string;
  workCountLabel: string;
  personSource: "COMMON" | "CUSTOM";
  templateTagGroups: DigitalHumanTemplateTagGroupRecord[];
  activeTagId?: string;
  templateLoadError?: string;
  templateTagLoadError?: string;
  isTemplateLoading?: boolean;
  templateSearch: string;
  templateScopeFilter: "ALL" | "FAVORITES" | "RECENT";
  filteredTemplates: DigitalHumanTemplateRecord[];
  availableCustomPersons: DouyinDigitalHumanCustomPersonRecord[];
  selectedTemplateId: string;
  selectedTemplate?: DigitalHumanTemplateRecord;
  selectedCustomPersonId: string;
  selectedCustomPerson?: DouyinDigitalHumanCustomPersonRecord;
  selectedFigureType: DigitalHumanFigureType;
  selectedFigure?: DigitalHumanTemplateRecord["figures"][number];
  selectedVoiceMode: "DEFAULT" | "PUBLIC" | "CUSTOM";
  selectedPublicVoiceId: string;
  selectedCustomVoiceId: string;
  publicVoices: DouyinVoiceLibraryRecord[];
  customVoices: DouyinCustomVoiceRecord[];
  selectedPublicVoice?: DouyinVoiceLibraryRecord;
  selectedCustomVoice?: DouyinCustomVoiceRecord;
  materialLibraryItems: DigitalHumanVideoPanelMaterialItem[];
  selectedMaterialLibraryItemId: string;
  selectedMaterialLibraryItem?: DigitalHumanVideoPanelMaterialItem;
  creatorDraftCards: DigitalHumanVideoPanelDraftCard[];
  activeDraftCardId: string;
  isAudioDriveDialogOpen: boolean;
  audioDriveTitle: string;
  audioDriveSourceVideoFile: File | null;
  audioDriveAudioFile: File | null;
  audioDriveAudioPreviewUrl: string;
  audioDriveAudioDurationLabel: string;
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
  scriptTemplateVisibility: "SELF" | "SHARED";
  scriptTemplateCategory: ScriptTemplateCategory;
  personalScriptTemplateNote: string;
  showScriptTemplateManager: boolean;
  personalScriptTemplateSearch: string;
  personalScriptTemplateFilter: PersonalScriptTemplateFilter;
  personalScriptTemplateArchiveFilter: PersonalScriptTemplateArchiveFilter;
  personalScriptTemplateCategoryFilter: ScriptTemplateCategory | "ALL";
  personalScriptTemplateGovernanceFilter: PersonalScriptTemplateGovernanceFilter;
  personalScriptTemplateSort: PersonalScriptTemplateSort;
  selectedPersonalScriptTemplateId: string;
  filteredPersonalScriptTemplates: DouyinDigitalHumanScriptTemplateRecord[];
  personalScriptTemplateName: string;
  selectedPersonalScriptTemplate?: DouyinDigitalHumanScriptTemplateRecord;
  selectedPersonalScriptTemplateEditable: boolean;
  selectedPersonalScriptTemplateArchived: boolean;
  scriptTemplateSaveScopeLabel: string;
  isReadonlySharedScriptTemplate: boolean;
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
  scriptActionMessage: string;
  editorActionMessage: string;
  personalTemplateGovernanceSummary: {
    total: number;
    shared: number;
    sharedActive: number;
    archived: number;
    missingNotes: number;
    readonlyShared: number;
  };
  selectedTemplateAuditMessages: string[];
  selectedWork?: DouyinDigitalHumanVideoWorkRecord;
  editorDiffs: DigitalHumanEditorDiffEntry[];
  recentTemplates: DigitalHumanTemplateRecord[];
  isSelectedTemplateFavorite: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  scriptPresets: ReadonlyArray<{ key: string; label: string; content: string }>;
  scriptTemplateCategories: Array<{ value: ScriptTemplateCategory; label: string }>;
  templatePageInfo?: DigitalHumanTemplatePageInfo;
  formatDateTime: OptionalDateFormatter;
  onPersonSourceChange: (value: "COMMON" | "CUSTOM") => void;
  onTemplateTagChange: (tagId: string) => Promise<void>;
  onTemplateSearchChange: (value: string) => void;
  onTemplateScopeFilterChange: (value: "ALL" | "FAVORITES" | "RECENT") => void;
  onSelectedTemplateChange: (templateId: string) => void;
  onSelectedCustomPersonChange: (customPersonId: string) => void;
  onSelectedFigureTypeChange: (figureType: DigitalHumanFigureType) => void;
  onSelectedVoiceModeChange: (value: "DEFAULT" | "PUBLIC" | "CUSTOM") => void;
  onSelectedPublicVoiceChange: (voiceId: string) => void;
  onSelectedCustomVoiceChange: (voiceId: string) => void;
  onSelectedMaterialLibraryItemChange: (materialId: string) => void;
  onSelectCreatorDraftCard: (draftId: string) => void;
  onCreateCreatorDraftCard: () => void;
  onDuplicateCreatorDraftCard: () => void;
  onDeleteActiveDraftCard: () => void;
  onMoveActiveDraftCardUp: () => void;
  onMoveActiveDraftCardDown: () => void;
  canMoveActiveDraftCardUp: boolean;
  canMoveActiveDraftCardDown: boolean;
  onOpenAudioDriveDialog: () => void;
  onCloseAudioDriveDialog: () => void;
  onAudioDriveTitleChange: (value: string) => void;
  onAudioDriveSourceVideoFileChange: (value: File | null) => void;
  onAudioDriveAudioFileChange: (value: File | null) => void;
  onTitleChange: (value: string) => void;
  onScriptChange: (value: string | ((current: string) => string)) => void;
  onSpeechRateChange: (value: string) => void;
  onPitchChange: (value: string) => void;
  onVolumeChange: (value: string) => void;
  onBackgroundColorChange: (value: string) => void;
  onBackgroundImageFileChange: (value: File | null) => void;
  onBackgroundImageUrlChange: (value: string) => void;
  onBackgroundImageNameChange: (value: string) => void;
  onSubtitleEnabledChange: (value: boolean) => void;
  onSubtitlePositionXChange: (value: string) => void;
  onSubtitlePositionYChange: (value: string) => void;
  onSubtitleWidthChange: (value: string) => void;
  onSubtitleHeightChange: (value: string) => void;
  onSubtitleFontSizeChange: (value: string) => void;
  onSubtitleTextColorChange: (value: string) => void;
  onSubtitleStrokeColorChange: (value: string) => void;
  onSubtitleStrokeWidthChange: (value: string) => void;
  onSubtitleFontIdChange: (value: string) => void;
  onAddComplianceWatermarkChange: (value: boolean) => void;
  onScreenWidthChange: (value: string) => void;
  onScreenHeightChange: (value: string) => void;
  onScriptTemplateVisibilityChange: (value: "SELF" | "SHARED") => void;
  onScriptTemplateCategoryChange: (value: ScriptTemplateCategory) => void;
  onPersonalScriptTemplateNoteChange: (value: string) => void;
  onShowScriptTemplateManagerChange: (value: boolean | ((current: boolean) => boolean)) => void;
  onPersonalScriptTemplateSearchChange: (value: string) => void;
  onPersonalScriptTemplateFilterChange: (value: PersonalScriptTemplateFilter) => void;
  onPersonalScriptTemplateArchiveFilterChange: (value: PersonalScriptTemplateArchiveFilter) => void;
  onPersonalScriptTemplateCategoryFilterChange: (value: ScriptTemplateCategory | "ALL") => void;
  onPersonalScriptTemplateGovernanceFilterChange: (value: PersonalScriptTemplateGovernanceFilter) => void;
  onPersonalScriptTemplateSortChange: (value: PersonalScriptTemplateSort) => void;
  onSelectedPersonalScriptTemplateChange: (value: string) => void;
  onPersonalScriptTemplateNameChange: (value: string) => void;
  onToggleFavoriteTemplate: (templateId: string, nextFavorite: boolean) => Promise<boolean>;
  onCopyScript: () => Promise<void> | void;
  onExportScript: () => void;
  onSaveCurrentScriptTemplate: () => Promise<void> | void;
  onApplyPersonalScriptTemplate: () => void;
  onRenamePersonalScriptTemplate: () => Promise<void> | void;
  onUpdatePersonalScriptTemplateCategory: () => Promise<void> | void;
  onUpdatePersonalScriptTemplateNote: () => Promise<void> | void;
  onOverwritePersonalScriptTemplate: () => Promise<void> | void;
  onToggleSharedPersonalScriptTemplate: () => Promise<void> | void;
  onToggleArchivePersonalScriptTemplate: () => Promise<void> | void;
  onDuplicatePersonalScriptTemplate: () => Promise<void> | void;
  onDeletePersonalScriptTemplate: () => Promise<void> | void;
  onTemplatePageChange?: (page: number) => Promise<void>;
  onCreateSpeechTask: (payload: {
    audioManId?: string;
    text?: string;
    speed?: number;
    pitch?: number;
    dialect?: number;
  }) => Promise<boolean>;
  onRefreshSpeechTask: (taskId?: string) => Promise<boolean>;
  onApplyOriginalCopy: (item: DouyinOriginalCopyRecord) => void;
  onApplyRemixCopy: (item: DouyinRemixCopyRecord) => void;
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
  onSubmitCurrentVideo: () => void;
  onSubmitCompleteVideo: () => Promise<void> | void;
  onSubmitBatchVideos: () => Promise<void> | void;
  onSubmitAudioDrive: () => Promise<void> | void;
  getFigureTypeLabel: (type?: DigitalHumanFigureType) => string;
  getScriptTemplateCategoryLabel: (value?: string) => string;
  getScriptTemplateArchiveLabel: (isArchived?: boolean) => string;
}

export function DigitalHumanVideoPanel(props: DigitalHumanVideoPanelProps) {
  const [isPersonDialogOpen, setIsPersonDialogOpen] = useState(false);
  const [personDialogTab, setPersonDialogTab] = useState<"MY" | "PUBLIC" | "MATERIAL">("PUBLIC");
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [voiceDialogTab, setVoiceDialogTab] = useState<"CUSTOM" | "PUBLIC">("CUSTOM");
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyDialogTab, setCopyDialogTab] = useState<"ORIGINAL" | "REMIX">("ORIGINAL");
  const [isSubtitleDialogOpen, setIsSubtitleDialogOpen] = useState(false);
  const [subtitleDialogTab, setSubtitleDialogTab] = useState<"COMMON" | "TREND">("COMMON");
  const [isBackgroundDialogOpen, setIsBackgroundDialogOpen] = useState(false);
  const [uploadedBackgroundPreviewUrl, setUploadedBackgroundPreviewUrl] = useState("");
  const [originalCopyType, setOriginalCopyType] = useState<"VIEWPOINT" | "STORY" | "PROCESS" | "KNOWLEDGE" | "PLOT_SALES" | "SEEDING" | "LOCAL_SALES">("KNOWLEDGE");
  const [originalCalendarId, setOriginalCalendarId] = useState("");
  const [originalTopicId, setOriginalTopicId] = useState("");
  const [originalInjectPlan, setOriginalInjectPlan] = useState(true);
  const [originalRequirement, setOriginalRequirement] = useState("");
  const [remixMaterialId, setRemixMaterialId] = useState("");
  const [remixProductId, setRemixProductId] = useState("");
  const [remixInjectBrandProfile, setRemixInjectBrandProfile] = useState(true);
  const [remixInjectPlan, setRemixInjectPlan] = useState(true);
  const [remixRequirement, setRemixRequirement] = useState("");
  const publicTemplatePageNumbers = useMemo(
    () => Array.from({ length: props.templatePageInfo?.totalPage || 0 }, (_, index) => index + 1),
    [props.templatePageInfo?.totalPage],
  );

  const hasTemplates = props.filteredTemplates.length > 0;
  const estimatedDurationLabel = useMemo(() => {
    const textLength = props.script.trim().length;
    return formatEstimatedDuration(estimateDurationSeconds(textLength));
  }, [props.script]);
  const selectedAuditionUrl =
    props.selectedVoiceMode === "PUBLIC"
      ? props.selectedPublicVoice?.audition
      : props.selectedVoiceMode === "CUSTOM"
        ? props.selectedCustomVoice?.audioPath
        : props.personSource === "COMMON"
          ? props.selectedTemplate?.audioPreview
          : undefined;

  const currentSpeechStatus =
    props.currentSpeechTask?.errMsg || props.currentSpeechTask?.errReason
      ? "试听失败"
      : props.currentSpeechTask?.status === 9
        ? "试听已完成"
        : props.currentSpeechTask?.status === 1
          ? "试听生成中"
          : props.currentSpeechTaskId
            ? "试听等待中"
            : "未试听";
  const originalTypeOptions: Array<{ value: "VIEWPOINT" | "STORY" | "PROCESS" | "KNOWLEDGE" | "PLOT_SALES" | "SEEDING" | "LOCAL_SALES"; label: string }> = [
    { value: "VIEWPOINT", label: "聊观点" },
    { value: "STORY", label: "讲故事" },
    { value: "PROCESS", label: "晒过程" },
    { value: "KNOWLEDGE", label: "教知识" },
    { value: "PLOT_SALES", label: "剧情带货" },
    { value: "SEEDING", label: "种草类" },
    { value: "LOCAL_SALES", label: "同城带货" },
  ];

  const handleOpenPersonDialog = () => {
    setPersonDialogTab(props.personSource === "CUSTOM" ? "MY" : "PUBLIC");
    setIsPersonDialogOpen(true);
  };

  const handleOpenVoiceDialog = () => {
    setVoiceDialogTab(props.selectedVoiceMode === "CUSTOM" ? "CUSTOM" : "PUBLIC");
    setIsVoiceDialogOpen(true);
  };

  const handlePickTemplate = (templateId: string) => {
    const target = props.filteredTemplates.find((item) => item.id === templateId);
    props.onPersonSourceChange("COMMON");
    props.onSelectedMaterialLibraryItemChange("");
    props.onSelectedTemplateChange(templateId);
    props.onSelectedFigureTypeChange(target?.figures[0]?.type || "sit_body");
    setIsPersonDialogOpen(false);
  };

  const handlePickCustomPerson = (customPersonId: string) => {
    props.onPersonSourceChange("CUSTOM");
    props.onSelectedMaterialLibraryItemChange("");
    props.onSelectedCustomPersonChange(customPersonId);
    setIsPersonDialogOpen(false);
  };

  const handlePickMaterial = (materialId: string) => {
    props.onSelectedMaterialLibraryItemChange(materialId);
    setIsPersonDialogOpen(false);
  };

  const handlePickPublicVoice = (voiceId: string) => {
    props.onSelectedVoiceModeChange("PUBLIC");
    props.onSelectedPublicVoiceChange(voiceId);
    setIsVoiceDialogOpen(false);
  };

  const handlePickCustomVoice = (voiceId: string) => {
    props.onSelectedVoiceModeChange("CUSTOM");
    props.onSelectedCustomVoiceChange(voiceId);
    setIsVoiceDialogOpen(false);
  };

  const handleInsertPause = () => {
    props.onScriptChange((current) => `${current.trim()} ...`.trim());
  };

  const recentOriginalCopies = useMemo(() => props.originalCopyHistory.slice(0, 8), [props.originalCopyHistory]);
  const recentRemixCopies = useMemo(() => props.remixCopyHistory.slice(0, 8), [props.remixCopyHistory]);
  const currentBackgroundPreviewUrl = uploadedBackgroundPreviewUrl || props.backgroundImageUrl;
  const currentBackgroundLabel = props.backgroundImageName || (props.backgroundImageUrl ? "已选择预设背景" : "");
  const selectedBackgroundPreset = useMemo(
    () => DIGITAL_HUMAN_BACKGROUND_PRESETS.find((item) => item.url === props.backgroundImageUrl),
    [props.backgroundImageUrl],
  );
  const subtitlePreviewFigureUrl = props.selectedCustomPerson?.coverImageUrl || props.selectedTemplate?.figures[0]?.cover || currentBackgroundPreviewUrl || "";
  const subtitlePreviewBackdropUrl = currentBackgroundPreviewUrl || subtitlePreviewFigureUrl;
  const subtitlePreviewText = props.script.trim().slice(0, 18) || "预览字幕效果会显示在这里";
  const screenWidthNumber = Math.max(1, parseNumericValue(props.screenWidth, 1080));
  const screenHeightNumber = Math.max(1, parseNumericValue(props.screenHeight, 1920));
  const speechRateNumber = Math.min(2, Math.max(0.5, parseNumericValue(props.speechRate, 1)));
  const pitchNumber = Math.min(10, Math.max(-10, parseNumericValue(props.pitch, 0)));
  const volumeNumber = Math.min(2, Math.max(0, parseNumericValue(props.volume, 1)));
  const subtitlePositionXNumber = Math.max(0, parseNumericValue(props.subtitlePositionX, 86));
  const subtitlePositionYNumber = Math.max(0, parseNumericValue(props.subtitlePositionY, 1498));
  const subtitleWidthNumber = Math.max(100, parseNumericValue(props.subtitleWidth, 907));
  const subtitleHeightNumber = Math.max(60, parseNumericValue(props.subtitleHeight, 269));
  const subtitleFontSizeNumber = Math.max(20, parseNumericValue(props.subtitleFontSize, 48));
  const subtitleStrokeWidthNumber = Math.max(0, parseNumericValue(props.subtitleStrokeWidth, 2));
  const subtitlePreviewStyle = {
    left: `${Math.min(86, (subtitlePositionXNumber / screenWidthNumber) * 100)}%`,
    top: `${Math.min(82, (subtitlePositionYNumber / screenHeightNumber) * 100)}%`,
    width: `${Math.min(82, (subtitleWidthNumber / screenWidthNumber) * 100)}%`,
    minHeight: `${Math.max(44, (subtitleHeightNumber / screenHeightNumber) * 320)}px`,
    color: props.subtitleTextColor || "#FFFFFF",
    fontSize: `${Math.max(16, Math.min(34, subtitleFontSizeNumber / 1.6))}px`,
    WebkitTextStroke: `${Math.min(4, subtitleStrokeWidthNumber)}px ${props.subtitleStrokeColor || "#000000"}`,
  };
  const subtitleFontSelectValue = SUBTITLE_FONT_OPTIONS.some((item) => item.value === props.subtitleFontId) ? props.subtitleFontId : "__custom__";
  const canvasPresetValue = useMemo(() => {
    const matched = DIGITAL_HUMAN_CANVAS_PRESETS.find((item) => item.value === `${screenWidthNumber}x${screenHeightNumber}`);
    return matched?.value || "custom";
  }, [screenHeightNumber, screenWidthNumber]);
  const visibleSubtitlePresets = useMemo(
    () => SUBTITLE_PRESETS.filter((item) => item.tab === subtitleDialogTab),
    [subtitleDialogTab],
  );
  const completeVideoPreview = useMemo(() => {
    const sequence = props.creatorDraftCards.map((item, index) => {
      const textLength = item.id === props.activeDraftCardId ? props.script.trim().length : item.scriptLength;
      const estimatedSeconds = estimateDurationSeconds(textLength);
      return {
        ...item,
        order: index + 1,
        estimatedSeconds,
        estimatedDurationLabel: formatEstimatedDuration(estimatedSeconds),
      };
    });
    const validSequenceCount = sequence.filter((item) => item.estimatedSeconds > 0).length;
    const totalEstimatedSeconds = sequence.reduce((sum, item) => sum + item.estimatedSeconds, 0);
    return {
      sequence,
      validSequenceCount,
      totalEstimatedSeconds,
      totalEstimatedLabel: formatEstimatedDuration(totalEstimatedSeconds),
    };
  }, [props.activeDraftCardId, props.creatorDraftCards, props.script]);

  useEffect(() => {
    if (!remixMaterialId && props.materialLibraryItems[0]?.id) {
      setRemixMaterialId(props.materialLibraryItems[0].id);
    }
  }, [props.materialLibraryItems, remixMaterialId]);

  useEffect(() => {
    if (!props.backgroundImageFile) {
      setUploadedBackgroundPreviewUrl("");
      return;
    }
    const previewUrl = window.URL.createObjectURL(props.backgroundImageFile);
    setUploadedBackgroundPreviewUrl(previewUrl);
    return () => {
      window.URL.revokeObjectURL(previewUrl);
    };
  }, [props.backgroundImageFile]);

  const handleAudition = async () => {
    const text = props.script.trim();
    const audioManId =
      props.selectedVoiceMode === "PUBLIC"
        ? props.selectedPublicVoice?.id
        : props.selectedVoiceMode === "CUSTOM"
          ? props.selectedCustomVoice?.id
          : props.personSource === "CUSTOM"
            ? props.selectedCustomPerson?.audioManId
            : props.selectedTemplate?.audioManId;
    if (!audioManId || !text) {
      return;
    }
    await props.onCreateSpeechTask({
      audioManId,
      text,
      speed: Number(props.speechRate || 1),
      pitch: Number(props.pitch || 1),
      dialect: 0,
    });
  };

  const handleCreateOriginalCopy = async () => {
    const success = await props.onCreateOriginalCopy({
      calendarItemId: originalCalendarId || undefined,
      topicId: originalTopicId || undefined,
      injectMarketingPlan: originalInjectPlan,
      copyType: originalCopyType,
      userRequirement: originalRequirement.trim() || undefined,
    });
    if (success) {
      setOriginalRequirement("");
    }
  };

  const handleCreateRemixCopy = async () => {
    if (!remixMaterialId) {
      return;
    }
    const success = await props.onCreateRemixCopy({
      materialId: remixMaterialId,
      injectBrandProfile: remixInjectBrandProfile,
      productId: remixProductId || undefined,
      injectMarketingPlan: remixInjectPlan,
      userRequirement: remixRequirement.trim() || undefined,
    });
    if (success) {
      setRemixRequirement("");
    }
  };

  const handleOpenSubtitleDialog = () => {
    setSubtitleDialogTab("COMMON");
    setIsSubtitleDialogOpen(true);
  };

  const handleOpenBackgroundDialog = () => {
    setIsBackgroundDialogOpen(true);
  };

  const handleSelectBackgroundPreset = (preset: DigitalHumanBackgroundPreset) => {
    props.onBackgroundImageFileChange(null);
    props.onBackgroundImageUrlChange(preset.url);
    props.onBackgroundImageNameChange(preset.name);
  };

  const handleBackgroundFileChange = (file: File | null) => {
    props.onBackgroundImageFileChange(file);
    props.onBackgroundImageUrlChange("");
    props.onBackgroundImageNameChange(file?.name || "");
  };

  const handleClearBackground = () => {
    props.onBackgroundImageFileChange(null);
    props.onBackgroundImageUrlChange("");
    props.onBackgroundImageNameChange("");
  };

  const handleApplySubtitlePreset = (preset: DigitalHumanSubtitlePreset) => {
    props.onSubtitleFontIdChange(preset.fontId);
    props.onSubtitleFontSizeChange(preset.fontSize);
    props.onSubtitleTextColorChange(preset.textColor);
    props.onSubtitleStrokeColorChange(preset.strokeColor);
    props.onSubtitleStrokeWidthChange(preset.strokeWidth);
    props.onSubtitleEnabledChange(true);
  };

  const handleApplyOutlinePreset = (preset: DigitalHumanSubtitleOutlinePreset) => {
    props.onSubtitleStrokeColorChange(preset.strokeColor);
    props.onSubtitleStrokeWidthChange(preset.strokeWidth);
    props.onSubtitleEnabledChange(true);
  };

  const handleCanvasPresetChange = (value: string) => {
    const matched = DIGITAL_HUMAN_CANVAS_PRESETS.find((item) => item.value === value);
    if (!matched) {
      return;
    }
    const [width, height] = matched.value.split("x");
    props.onScreenWidthChange(width);
    props.onScreenHeightChange(height);
  };

  const renderSegmentCard = (item: DigitalHumanVideoPanelDraftCard, index: number) => {
    const isActive = item.id === props.activeDraftCardId;
    const activeMaterialVideoUrl = isActive ? props.selectedMaterialLibraryItem?.videoUrl : undefined;
    const activeMaterialCoverUrl = isActive ? props.selectedMaterialLibraryItem?.coverUrl : undefined;
    const activeMaterialWorkUrl = isActive ? props.selectedMaterialLibraryItem?.workUrl : undefined;
    const isMaterialMode = isActive ? Boolean(props.selectedMaterialLibraryItemId && props.selectedMaterialLibraryItem) : Boolean(item.materialLabel);
    const previewVideoUrl = isMaterialMode ? (activeMaterialVideoUrl || item.materialPreviewVideoUrl) : item.previewVideoUrl;
    const previewImageUrl = isMaterialMode ? (activeMaterialCoverUrl || item.materialPreviewImageUrl) : item.previewImageUrl;
    const previewWorkUrl = isMaterialMode ? (activeMaterialWorkUrl || item.materialWorkUrl) : undefined;
    const previewTitle = isMaterialMode ? item.materialLabel || "素材片段" : item.personLabel;
    const shouldShowWatermark = !isMaterialMode && (isActive ? props.addComplianceWatermark : item.addComplianceWatermark);
    return (
      <article key={item.id} className={`digital-human-creator-v2-card ${isActive ? "is-active" : ""}`}>
        <div className="digital-human-creator-v2-card__topbar">
          <div>
            <strong>{item.title || item.name}</strong>
            <p>
              {previewTitle} / {item.voiceLabel} / {item.scriptLength} 字
            </p>
          </div>
          <div className="digital-human-creator-v2-card__topbar-actions">
            {!isActive ? (
              <button type="button" className="secondary-button" onClick={() => props.onSelectCreatorDraftCard(item.id)}>
                编辑此片段
              </button>
            ) : null}
            <span className={`archive-pill ${item.subtitleEnabled ? "status-ready" : "status-pending"}`}>{item.subtitleEnabled ? "显示字幕" : "隐藏字幕"}</span>
          </div>
        </div>

        <div className="digital-human-creator-v2-card__layout">
          <div className="digital-human-creator-v2-card__media-column">
            <div className="digital-human-creator-v2-card__preview">
              {isActive && !isMaterialMode ? (
                <button type="button" className="digital-human-creator-v2-card__change-bg" onClick={handleOpenBackgroundDialog}>
                  更换背景
                </button>
              ) : null}
              {previewVideoUrl && isMaterialMode ? (
                <video src={previewVideoUrl} className="digital-human-creator-v2-card__preview-video" controls preload="metadata" />
              ) : previewImageUrl ? (
                <img src={previewImageUrl} alt={previewTitle} className="digital-human-creator-v2-card__preview-image" />
              ) : (
                <div className="digital-human-creator-v2-card__preview-empty">{isMaterialMode ? "所选素材暂时没有可直接播放的视频" : "未选择数字人"}</div>
              )}
              {shouldShowWatermark ? <span className="digital-human-creator-v2-card__watermark" style={{ top: isActive ? 56 : 14 }}>AI生成</span> : null}
              {isActive ? (
                <button type="button" className="digital-human-creator-v2-card__replace" onClick={handleOpenPersonDialog}>
                  更换
                </button>
              ) : null}
            </div>

            <button type="button" className="digital-human-creator-v2-card__voice-button" onClick={isActive ? handleOpenVoiceDialog : () => props.onSelectCreatorDraftCard(item.id)}>
              <span className="digital-human-creator-v2-card__voice-icon">▶</span>
              <span>
                <strong>{item.voiceLabel}</strong>
                <small>{isActive ? "点击切换我的声音 / 公共声音" : "点击进入当前片段"}</small>
              </span>
              <span className="digital-human-creator-v2-card__voice-arrow">›</span>
            </button>

            {isActive && props.selectedMaterialLibraryItem ? (
              <div className="digital-human-creator-v2-card__material">
                <strong>我的素材库</strong>
                <p>{props.selectedMaterialLibraryItem.label}</p>
                {props.selectedMaterialLibraryItem.videoUrl ? (
                  <a href={props.selectedMaterialLibraryItem.videoUrl} target="_blank" rel="noreferrer" className="secondary-button">
                    预览素材
                  </a>
                ) : props.selectedMaterialLibraryItem.workUrl ? (
                  <a href={props.selectedMaterialLibraryItem.workUrl} target="_blank" rel="noreferrer" className="secondary-button">
                    打开源视频
                  </a>
                ) : null}
              </div>
            ) : item.materialLabel ? (
              <div className="digital-human-creator-v2-card__material">
                <strong>我的素材库</strong>
                <p>{item.materialLabel}</p>
                {item.materialWorkUrl ? (
                  <a href={item.materialWorkUrl} target="_blank" rel="noreferrer" className="secondary-button">
                    打开源视频
                  </a>
                ) : null}
              </div>
            ) : null}

            {isActive && selectedAuditionUrl ? <audio controls preload="metadata" src={selectedAuditionUrl} className="digital-human-creator-v2-card__audio" /> : null}
            {isActive && !isMaterialMode && item.previewVideoUrl ? <video controls preload="metadata" src={item.previewVideoUrl} className="digital-human-creator-v2-card__video" /> : null}
          </div>

          <div className="digital-human-creator-v2-card__editor-column">
            <div className="digital-human-creator-v2-card__editor-tools">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleAudition()}
                disabled={!props.canEdit || props.isSubmitting || !props.script.trim() || !(
                  props.selectedVoiceMode === "PUBLIC"
                    ? props.selectedPublicVoice?.id
                    : props.selectedVoiceMode === "CUSTOM"
                      ? props.selectedCustomVoice?.id
                      : props.personSource === "CUSTOM"
                        ? props.selectedCustomPerson?.audioManId
                        : props.selectedTemplate?.audioManId
                )}
              >
                试听
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setCopyDialogTab("ORIGINAL");
                  setIsCopyDialogOpen(true);
                }}
              >
                原创文案
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setCopyDialogTab("REMIX");
                  setIsCopyDialogOpen(true);
                }}
              >
                二创文案
              </button>
              <button type="button" className="secondary-button" onClick={isActive ? handleInsertPause : () => props.onSelectCreatorDraftCard(item.id)} disabled={!isActive}>
                插入停顿
              </button>
              <button type="button" className="secondary-button" onClick={isActive ? props.onOpenAudioDriveDialog : () => props.onSelectCreatorDraftCard(item.id)} disabled={!isActive}>
                切换成音频驱动
              </button>
            </div>

            {isActive ? (
              <>
                <textarea
                  className="digital-human-creator-v2-card__textarea"
                  value={props.script}
                  onChange={(event) => props.onScriptChange(event.target.value)}
                  placeholder="请输入台词，也可以先插入一段脚本模板。"
                />
                <div className="digital-human-creator-v2-card__footer">
                  <span className="digital-human-creator-v2-card__duration">预计时长：{estimatedDurationLabel}</span>
                  <span className="digital-human-creator-v2-card__duration">{currentSpeechStatus}</span>
                  <button type="button" className={`digital-human-creator-v2-card__toggle ${props.subtitleEnabled ? "is-active" : ""}`} onClick={() => props.onSubtitleEnabledChange(!props.subtitleEnabled)}>
                    显示字幕
                  </button>
                  <button type="button" className="secondary-button" onClick={handleOpenSubtitleDialog}>
                    调整字幕样式
                  </button>
                </div>
                <div className="digital-human-creator-v2-card__settings">
                  <div className="digital-human-creator-v2-card__settings-head">
                    <div>
                      <strong>背景与画布设置</strong>
                      <p>{currentBackgroundLabel || "未设置背景图时，将沿用背景底色生成。"}</p>
                    </div>
                    <button type="button" className="secondary-button" onClick={handleOpenBackgroundDialog}>
                      更换背景
                    </button>
                  </div>
                  <div className="digital-human-creator-v2-card__settings-grid">
                    <label className="digital-human-creator-v2-card__slider-field">
                      <div>
                        <span>语速</span>
                        <strong>{speechRateNumber.toFixed(1)}</strong>
                      </div>
                      <input type="range" min="0.5" max="2" step="0.1" value={String(speechRateNumber)} onChange={(event) => props.onSpeechRateChange(event.target.value)} />
                    </label>
                    <label className="digital-human-creator-v2-card__slider-field">
                      <div>
                        <span>音调</span>
                        <strong>{pitchNumber.toFixed(0)}</strong>
                      </div>
                      <input type="range" min="-10" max="10" step="1" value={String(pitchNumber)} onChange={(event) => props.onPitchChange(event.target.value)} />
                    </label>
                    <label className="digital-human-creator-v2-card__slider-field">
                      <div>
                        <span>音量</span>
                        <strong>{volumeNumber.toFixed(1)}</strong>
                      </div>
                      <input type="range" min="0" max="2" step="0.1" value={String(volumeNumber)} onChange={(event) => props.onVolumeChange(event.target.value)} />
                    </label>
                    <label className="digital-human-creator-v2__mini-field">
                      <span>画面尺寸</span>
                      <select value={canvasPresetValue} onChange={(event) => handleCanvasPresetChange(event.target.value)}>
                        {DIGITAL_HUMAN_CANVAS_PRESETS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                        {canvasPresetValue === "custom" ? <option value="custom">自定义 {screenWidthNumber} x {screenHeightNumber}</option> : null}
                      </select>
                    </label>
                    <div className="digital-human-creator-v2__mini-field digital-human-creator-v2__mini-field--switch">
                      <span>AI 水印</span>
                      <button type="button" className={`digital-human-creator-v2-card__toggle ${props.addComplianceWatermark ? "is-active" : ""}`} onClick={() => props.onAddComplianceWatermarkChange(!props.addComplianceWatermark)}>
                        {props.addComplianceWatermark ? "生成时带水印" : "不生成水印"}
                      </button>
                    </div>
                  </div>
                  {currentBackgroundPreviewUrl ? (
                    <div className="digital-human-creator-v2-card__background-inline">
                      <img src={currentBackgroundPreviewUrl} alt={currentBackgroundLabel || "背景预览"} className="digital-human-creator-v2-card__background-thumb" />
                      <div>
                        <strong>{currentBackgroundLabel || "已选择背景"}</strong>
                        <p>当前背景会用于生成与字幕预览，点击“更换背景”可重新选择。</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="digital-human-creator-v2-card__readonly">{item.scriptPreview || "点击“编辑此片段”后输入台词"}</div>
            )}
            {isActive && props.currentSpeechTask?.full?.url ? (
              <div className="digital-human-creator-v2-card__material">
                <strong>试听结果</strong>
                <audio controls preload="metadata" src={props.currentSpeechTask.full.url} className="digital-human-creator-v2-card__audio" />
                <div className="strategy-inline-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="secondary-button" onClick={() => void props.onRefreshSpeechTask(props.currentSpeechTaskId)}>
                    刷新试听
                  </button>
                </div>
              </div>
            ) : isActive && props.currentSpeechTaskId ? (
              <div className="digital-human-creator-v2-card__material">
                <strong>试听任务</strong>
                <p>{props.currentSpeechTaskId}</p>
                <div className="strategy-inline-actions" style={{ marginTop: 8 }}>
                  <button type="button" className="secondary-button" onClick={() => void props.onRefreshSpeechTask(props.currentSpeechTaskId)}>
                    刷新试听
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {isActive ? (
          <div className="digital-human-creator-v2-card__segment-actions">
            <button type="button" className="secondary-button" onClick={props.onMoveActiveDraftCardUp} disabled={!props.canMoveActiveDraftCardUp}>
              上移
            </button>
            <button type="button" className="secondary-button" onClick={props.onMoveActiveDraftCardDown} disabled={!props.canMoveActiveDraftCardDown}>
              下移
            </button>
            <button type="button" className="secondary-button" onClick={props.onDuplicateCreatorDraftCard}>
              复制
            </button>
            <button type="button" className="secondary-button" onClick={props.onCreateCreatorDraftCard}>
              + 新增片段
            </button>
            <button type="button" className="secondary-button" onClick={props.onDeleteActiveDraftCard} disabled={props.creatorDraftCards.length <= 1}>
              删除片段
            </button>
          </div>
        ) : index < props.creatorDraftCards.length - 1 ? (
          <div className="digital-human-creator-v2-card__connector" aria-hidden="true" />
        ) : null}
      </article>
    );
  };

  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact digital-human-creator-v2" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>创作作品</strong>
          <p>按参考图调整为多片段创作块，每个片段都围绕数字人、声音、文案和字幕展开，不再使用大表单式工作台。</p>
        </div>
        <div className="report-editor-actions">
          <span className={`archive-pill ${props.filteredTemplates.length ? "status-ready" : "status-in_progress"}`}>{props.templateCountLabel}</span>
          <span className="archive-pill status-ready">{props.creatorDraftCards.length} 个创作片段</span>
          <span className="archive-pill status-ready">{props.workCountLabel}</span>
        </div>
      </div>

      {props.personSource === "COMMON" && props.templateLoadError ? (
        <div className="empty-state" style={{ marginTop: 12, borderColor: "#fecaca", background: "#fff1f2", color: "#9f1239" }}>
          {hasTemplates ? `公共模板已加载，但模板接口最近一次刷新失败：${props.templateLoadError}` : `公共模板读取失败：${props.templateLoadError}`}
        </div>
      ) : null}

      <div className="digital-human-creator-v2__title-row">
        <input className="report-title-input" value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} placeholder="未命名" />
        <span className="digital-human-creator-v2__title-duration">预计时长：{estimatedDurationLabel}</span>
      </div>

      <div className="digital-human-creator-v2__stack">{props.creatorDraftCards.map(renderSegmentCard)}</div>

      <section className="digital-human-creator-v2__sequence-preview entity-card personal-card">
        <div className="digital-human-creator-v2__sequence-head">
          <div>
            <strong>完整作品顺序预览</strong>
            <p className="panel-subtext">生成完整作品前，先确认片段顺序、人物来源和预计总时长。</p>
          </div>
          <div className="digital-human-creator-v2__sequence-meta">
            <span className="archive-pill status-ready">{completeVideoPreview.sequence.length} 个片段</span>
            <span className="archive-pill status-ready">预计总时长 {completeVideoPreview.totalEstimatedLabel}</span>
          </div>
        </div>
        <div className="digital-human-creator-v2__sequence-list">
          {completeVideoPreview.sequence.map((item) => (
            <div key={item.id} className={`digital-human-creator-v2__sequence-item ${item.id === props.activeDraftCardId ? "is-active" : ""}`}>
              <span className="digital-human-creator-v2__sequence-order">#{item.order}</span>
              <div className="digital-human-creator-v2__sequence-content">
                <strong>{item.title || item.name}</strong>
                <p>
                  {item.materialLabel ? `素材片段 / ${item.materialLabel}` : `${item.personLabel} / ${item.voiceLabel}`} / {item.subtitleEnabled ? "显示字幕" : "隐藏字幕"}
                </p>
              </div>
              <span className="digital-human-creator-v2__sequence-duration">{item.estimatedDurationLabel}</span>
            </div>
          ))}
        </div>
        {completeVideoPreview.validSequenceCount < 2 ? (
          <p className="panel-subtext">至少补齐 2 个有脚本内容的片段后，再生成完整作品会更稳妥。</p>
        ) : null}
      </section>

      <div className="digital-human-creator-v2__bottom-bar">
        <button type="button" className="secondary-button" onClick={() => void props.onSubmitCompleteVideo()} disabled={!props.canEdit || props.isSubmitting}>
          生成1个完整作品
        </button>
        <button type="button" className="primary-button" onClick={props.onSubmitCurrentVideo} disabled={!props.canEdit || props.isSubmitting}>
          生成当前片段
        </button>
        <button type="button" className="primary-button" onClick={() => void props.onSubmitBatchVideos()} disabled={!props.canEdit || props.isSubmitting}>
          批量生成{props.creatorDraftCards.length}个作品
        </button>
      </div>

      {isPersonDialogOpen ? (
        <div className="digital-human-template-modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsPersonDialogOpen(false)}>
          <div className="digital-human-template-modal digital-human-creator-v2-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="digital-human-creator-v2-dialog__head">
              <div>
                <strong>选择数字人</strong>
                <p>把“我的数字人 / 公共数字人 / 我的素材库”收口在同一个弹窗里切换。</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setIsPersonDialogOpen(false)}>
                关闭
              </button>
            </div>
            <div className="digital-human-creator-v2-dialog__tabs">
              <button type="button" className={`personal-reference-tab ${personDialogTab === "MY" ? "is-active" : ""}`} onClick={() => setPersonDialogTab("MY")}>
                我的数字人
              </button>
              <button type="button" className={`personal-reference-tab ${personDialogTab === "PUBLIC" ? "is-active" : ""}`} onClick={() => setPersonDialogTab("PUBLIC")}>
                公共数字人
              </button>
              <button type="button" className={`personal-reference-tab ${personDialogTab === "MATERIAL" ? "is-active" : ""}`} onClick={() => setPersonDialogTab("MATERIAL")}>
                我的素材库
              </button>
            </div>
            <div className="digital-human-creator-v2-dialog__grid">
              {personDialogTab === "MY"
                ? props.availableCustomPersons.map((item) => (
                    <button key={item.id} type="button" className="digital-human-creator-v2-picker-card" onClick={() => handlePickCustomPerson(item.id)}>
                      {item.coverImageUrl ? <img src={item.coverImageUrl} alt={item.name} /> : <div className="digital-human-creator-v2-picker-card__empty">暂无封面</div>}
                      <strong>{item.name}</strong>
                    </button>
                  ))
                : null}
              {personDialogTab === "PUBLIC"
                ? props.filteredTemplates.map((item) => (
                    <button key={item.id} type="button" className="digital-human-creator-v2-picker-card" onClick={() => handlePickTemplate(item.id)}>
                      {item.figures[0]?.cover ? <img src={item.figures[0].cover} alt={item.name} /> : <div className="digital-human-creator-v2-picker-card__empty">暂无封面</div>}
                      <strong>{item.name}</strong>
                    </button>
                  ))
                : null}
              {personDialogTab === "MATERIAL"
                ? props.materialLibraryItems.map((item) => (
                    <button key={item.id} type="button" className="digital-human-creator-v2-picker-card is-material" onClick={() => handlePickMaterial(item.id)}>
                      {item.coverUrl ? <img src={item.coverUrl} alt={item.label} /> : <div className="digital-human-creator-v2-picker-card__empty">素材参考</div>}
                      <strong>{item.label}</strong>
                      {item.sourceLabel ? <span className="digital-human-creator-v2-picker-card__meta">{item.sourceLabel}</span> : null}
                    </button>
                  ))
                : null}
            </div>
            {personDialogTab === "PUBLIC" && props.onTemplatePageChange && props.templatePageInfo && props.templatePageInfo.totalPage > 1 ? (
              <div className="digital-human-creator-v2-dialog__footer digital-human-template-pagination">
                <span className="panel-subtext">
                  共 {props.templatePageInfo.totalCount} 个公共数字人，当前第 {props.templatePageInfo.page}/{props.templatePageInfo.totalPage} 页
                </span>
                <div className="digital-human-template-pagination__buttons">
                  <button
                    type="button"
                    className="filter-chip"
                    disabled={props.isTemplateLoading || props.templatePageInfo.page <= 1}
                    onClick={() => void props.onTemplatePageChange?.(props.templatePageInfo!.page - 1)}
                  >
                    上一页
                  </button>
                  {publicTemplatePageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`filter-chip ${props.templatePageInfo?.page === pageNumber ? "is-active" : ""}`}
                      disabled={props.isTemplateLoading || props.templatePageInfo?.page === pageNumber}
                      onClick={() => void props.onTemplatePageChange?.(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="filter-chip"
                    disabled={props.isTemplateLoading || props.templatePageInfo.page >= props.templatePageInfo.totalPage}
                    onClick={() => void props.onTemplatePageChange?.(props.templatePageInfo!.page + 1)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isVoiceDialogOpen ? (
        <div className="digital-human-template-modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsVoiceDialogOpen(false)}>
          <div className="digital-human-template-modal digital-human-creator-v2-dialog digital-human-creator-v2-dialog--voice" onClick={(event) => event.stopPropagation()}>
            <div className="digital-human-creator-v2-dialog__head">
              <div>
                <strong>选择声音</strong>
                <p>统一从“我的声音 / 公共声音”里选择，不再使用长下拉框。</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setIsVoiceDialogOpen(false)}>
                关闭
              </button>
            </div>
            <div className="digital-human-creator-v2-dialog__tabs">
              <button type="button" className={`personal-reference-tab ${voiceDialogTab === "CUSTOM" ? "is-active" : ""}`} onClick={() => setVoiceDialogTab("CUSTOM")}>
                我的声音
              </button>
              <button type="button" className={`personal-reference-tab ${voiceDialogTab === "PUBLIC" ? "is-active" : ""}`} onClick={() => setVoiceDialogTab("PUBLIC")}>
                公共声音
              </button>
            </div>
            <div className="digital-human-creator-v2-voice-grid">
              {voiceDialogTab === "CUSTOM"
                ? props.customVoices.map((item) => (
                    <button key={item.id} type="button" className="digital-human-creator-v2-voice-card" onClick={() => handlePickCustomVoice(item.id)}>
                      <strong>{item.name}</strong>
                      <span>{item.progress ? `${item.progress}%` : "我的声音"}</span>
                    </button>
                  ))
                : null}
              {voiceDialogTab === "PUBLIC"
                ? props.publicVoices.map((item) => (
                    <button key={item.id} type="button" className="digital-human-creator-v2-voice-card" onClick={() => handlePickPublicVoice(item.id)}>
                      <strong>{item.name}</strong>
                      <span>{item.lang || "公共声音"}</span>
                    </button>
                  ))
                : null}
            </div>
          </div>
        </div>
      ) : null}

      {isSubtitleDialogOpen ? (
        <div className="digital-human-template-modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsSubtitleDialogOpen(false)}>
          <div className="digital-human-template-modal digital-human-creator-v2-dialog digital-human-creator-v2-dialog--subtitle" onClick={(event) => event.stopPropagation()}>
            <div className="digital-human-creator-v2-dialog__head">
              <div>
                <strong>字幕设置</strong>
                <p>这里直接对应蝉镜数字人视频接口里的 `subtitle_config` 参数，保存后会跟随当前片段一起提交。</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setIsSubtitleDialogOpen(false)}>
                关闭
              </button>
            </div>
            <div className="digital-human-creator-v2__dialog-form">
              <div className="digital-human-creator-v2__dialog-switch">
                <div>
                  <strong>显示字幕</strong>
                  <p>关闭后会向蝉镜提交 `show: false`。</p>
                </div>
                <button type="button" className={`digital-human-creator-v2-card__toggle ${props.subtitleEnabled ? "is-active" : ""}`} onClick={() => props.onSubtitleEnabledChange(!props.subtitleEnabled)}>
                  {props.subtitleEnabled ? "已开启" : "已关闭"}
                </button>
              </div>
              <div className="digital-human-creator-v2__subtitle-layout">
                <div className="digital-human-creator-v2__subtitle-preview">
                  <div
                    className="digital-human-creator-v2__subtitle-canvas"
                    style={{
                      backgroundColor: props.backgroundColor || "#D9D6F8",
                      ...(subtitlePreviewBackdropUrl ? { backgroundImage: `url(${subtitlePreviewBackdropUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
                    }}
                  >
                    {props.addComplianceWatermark ? <span className="digital-human-creator-v2-card__watermark">AI生成</span> : null}
                    {props.subtitleEnabled ? (
                      <div className="digital-human-creator-v2__subtitle-preview-text" style={subtitlePreviewStyle}>
                        {subtitlePreviewText}
                      </div>
                    ) : (
                      <div className="digital-human-creator-v2__subtitle-preview-empty">当前已关闭字幕显示</div>
                    )}
                  </div>
                </div>
                <div className="digital-human-creator-v2__subtitle-controls">
                  <div className="digital-human-creator-v2__subtitle-preset-head">
                    <div className="digital-human-creator-v2-dialog__tabs">
                      <button type="button" className={`personal-reference-tab ${subtitleDialogTab === "COMMON" ? "is-active" : ""}`} onClick={() => setSubtitleDialogTab("COMMON")}>
                        常用样式
                      </button>
                      <button type="button" className={`personal-reference-tab ${subtitleDialogTab === "TREND" ? "is-active" : ""}`} onClick={() => setSubtitleDialogTab("TREND")}>
                        网感模板
                      </button>
                    </div>
                    <div className="digital-human-creator-v2__subtitle-preset-grid">
                      {visibleSubtitlePresets.map((preset) => (
                        <button key={preset.key} type="button" className="digital-human-creator-v2__subtitle-preset-card" onClick={() => handleApplySubtitlePreset(preset)}>
                          <div className="digital-human-creator-v2__subtitle-preset-thumb" style={{ background: preset.previewTone }}>
                            <span
                              style={{
                                color: preset.textColor,
                                WebkitTextStroke: `${preset.strokeWidth}px ${preset.strokeColor}`,
                                fontSize: `${Math.max(16, Math.min(24, Number(preset.fontSize) / 2.5))}px`,
                              }}
                            >
                              字幕效果
                            </span>
                          </div>
                          <strong>{preset.name}</strong>
                          <span>{preset.description}</span>
                          <div className="digital-human-creator-v2__subtitle-preset-preview">
                            <i style={{ backgroundColor: preset.textColor }} />
                            <i style={{ backgroundColor: preset.strokeColor }} />
                            <em>{preset.fontSize}px / {preset.strokeWidth}px</em>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="digital-human-creator-v2__outline-presets">
                      <strong>描边样式</strong>
                      <div className="digital-human-creator-v2__outline-buttons">
                        {SUBTITLE_OUTLINE_PRESETS.map((preset) => (
                          <button key={preset.key} type="button" className="digital-human-creator-v2__outline-button" onClick={() => handleApplyOutlinePreset(preset)}>
                            <span
                              style={{
                                color: props.subtitleTextColor || "#FFFFFF",
                                WebkitTextStroke: `${preset.strokeWidth}px ${preset.strokeColor}`,
                              }}
                            >
                              T
                            </span>
                            <em>{preset.name}</em>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <label className="digital-human-creator-v2__mini-field">
                    <span>字体</span>
                    <select
                      value={subtitleFontSelectValue}
                      onChange={(event) => props.onSubtitleFontIdChange(event.target.value === "__custom__" ? props.subtitleFontId : event.target.value)}
                    >
                      {SUBTITLE_FONT_OPTIONS.map((item) => (
                        <option key={item.value || "__default__"} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                      <option value="__custom__">当前自定义字体 ID</option>
                    </select>
                  </label>
                  {subtitleFontSelectValue === "__custom__" ? (
                    <label className="digital-human-creator-v2__mini-field">
                      <span>自定义字体 ID</span>
                      <input value={props.subtitleFontId} onChange={(event) => props.onSubtitleFontIdChange(event.target.value)} placeholder="输入蝉镜返回的 font_id" />
                    </label>
                  ) : null}
                  <div className="digital-human-creator-v2__slider-grid">
                    <label className="digital-human-creator-v2__slider-field">
                      <span>X 坐标</span>
                      <div>
                        <input type="range" min="0" max={String(screenWidthNumber)} value={props.subtitlePositionX} onChange={(event) => props.onSubtitlePositionXChange(event.target.value)} />
                        <strong>{props.subtitlePositionX}</strong>
                      </div>
                    </label>
                    <label className="digital-human-creator-v2__slider-field">
                      <span>Y 坐标</span>
                      <div>
                        <input type="range" min="0" max={String(screenHeightNumber)} value={props.subtitlePositionY} onChange={(event) => props.onSubtitlePositionYChange(event.target.value)} />
                        <strong>{props.subtitlePositionY}</strong>
                      </div>
                    </label>
                    <label className="digital-human-creator-v2__slider-field">
                      <span>宽度</span>
                      <div>
                        <input type="range" min="200" max={String(screenWidthNumber)} value={props.subtitleWidth} onChange={(event) => props.onSubtitleWidthChange(event.target.value)} />
                        <strong>{props.subtitleWidth}</strong>
                      </div>
                    </label>
                    <label className="digital-human-creator-v2__slider-field">
                      <span>高度</span>
                      <div>
                        <input type="range" min="80" max={String(screenHeightNumber)} value={props.subtitleHeight} onChange={(event) => props.onSubtitleHeightChange(event.target.value)} />
                        <strong>{props.subtitleHeight}</strong>
                      </div>
                    </label>
                    <label className="digital-human-creator-v2__slider-field">
                      <span>字号</span>
                      <div>
                        <input type="range" min="24" max="120" value={props.subtitleFontSize} onChange={(event) => props.onSubtitleFontSizeChange(event.target.value)} />
                        <strong>{props.subtitleFontSize}</strong>
                      </div>
                    </label>
                    <label className="digital-human-creator-v2__slider-field">
                      <span>描边宽度</span>
                      <div>
                        <input type="range" min="0" max="8" value={props.subtitleStrokeWidth} onChange={(event) => props.onSubtitleStrokeWidthChange(event.target.value)} />
                        <strong>{props.subtitleStrokeWidth}</strong>
                      </div>
                    </label>
                  </div>
                  <div className="digital-human-creator-v2__color-grid">
                    <section className="digital-human-creator-v2__color-card">
                      <div className="digital-human-creator-v2__color-card-head">
                        <strong>字体颜色</strong>
                        <input type="color" value={props.subtitleTextColor || "#ffffff"} onChange={(event) => props.onSubtitleTextColorChange(event.target.value.toUpperCase())} />
                      </div>
                      <input value={props.subtitleTextColor} onChange={(event) => props.onSubtitleTextColorChange(event.target.value.toUpperCase())} placeholder="#FFFFFF" />
                      <div className="digital-human-creator-v2__swatches">
                        {SUBTITLE_COLOR_SWATCHES.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`digital-human-creator-v2__swatch ${props.subtitleTextColor.toUpperCase() === color ? "is-active" : ""}`}
                            style={{ backgroundColor: color }}
                            onClick={() => props.onSubtitleTextColorChange(color)}
                            aria-label={`选择字体颜色 ${color}`}
                          />
                        ))}
                      </div>
                    </section>
                    <section className="digital-human-creator-v2__color-card">
                      <div className="digital-human-creator-v2__color-card-head">
                        <strong>描边颜色</strong>
                        <input type="color" value={props.subtitleStrokeColor || "#000000"} onChange={(event) => props.onSubtitleStrokeColorChange(event.target.value.toUpperCase())} />
                      </div>
                      <input value={props.subtitleStrokeColor} onChange={(event) => props.onSubtitleStrokeColorChange(event.target.value.toUpperCase())} placeholder="#000000" />
                      <div className="digital-human-creator-v2__swatches">
                        {SUBTITLE_STROKE_SWATCHES.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`digital-human-creator-v2__swatch ${props.subtitleStrokeColor.toUpperCase() === color ? "is-active" : ""}`}
                            style={{ backgroundColor: color }}
                            onClick={() => props.onSubtitleStrokeColorChange(color)}
                            aria-label={`选择描边颜色 ${color}`}
                          />
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isBackgroundDialogOpen ? (
        <div className="digital-human-template-modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsBackgroundDialogOpen(false)}>
          <div className="digital-human-template-modal digital-human-creator-v2-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="digital-human-creator-v2-dialog__head">
              <div>
                <strong>更换背景</strong>
                <p>支持上传自定义背景，也支持直接选择预设背景图；提交时会按蝉镜 `bg` 参数生成。</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setIsBackgroundDialogOpen(false)}>
                关闭
              </button>
            </div>
            <div className="digital-human-creator-v2__background-layout">
              <div className="digital-human-creator-v2__background-preview">
                {currentBackgroundPreviewUrl ? (
                  <img src={currentBackgroundPreviewUrl} alt={currentBackgroundLabel || "背景预览"} />
                ) : (
                  <div className="digital-human-creator-v2__background-empty">当前未设置背景图，将继续使用背景底色。</div>
                )}
                <div className="digital-human-creator-v2__background-meta">
                  <strong>{currentBackgroundLabel || "仅背景色模式"}</strong>
                  <span>{selectedBackgroundPreset?.description || (props.backgroundImageFile ? "当前为本地上传背景" : "可上传背景或选择预设图")}</span>
                </div>
              </div>
              <div className="digital-human-creator-v2__background-panel">
                <div className="digital-human-creator-v2__settings-grid">
                  <label className="digital-human-creator-v2__mini-field">
                    <span>背景底色</span>
                    <input value={props.backgroundColor} onChange={(event) => props.onBackgroundColorChange(event.target.value)} placeholder="#ffffff" />
                  </label>
                  <label className="digital-human-creator-v2__mini-field digital-human-creator-v2__mini-field--wide">
                    <span>上传背景图片</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/*" onChange={(event) => handleBackgroundFileChange(event.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="digital-human-creator-v2__background-actions">
                  <button type="button" className="secondary-button" onClick={handleClearBackground}>
                    清空背景图
                  </button>
                </div>
                <div className="digital-human-creator-v2__preset-grid">
                  {DIGITAL_HUMAN_BACKGROUND_PRESETS.map((preset) => (
                    <button key={preset.key} type="button" className={`digital-human-creator-v2__preset-card ${props.backgroundImageUrl === preset.url ? "is-active" : ""}`} onClick={() => handleSelectBackgroundPreset(preset)}>
                      <img src={preset.url} alt={preset.name} />
                      <strong>{preset.name}</strong>
                      <span>{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCopyDialogOpen ? (
        <div className="digital-human-template-modal-overlay" role="dialog" aria-modal="true" onClick={() => setIsCopyDialogOpen(false)}>
          <div className="digital-human-template-modal digital-human-creator-v2-dialog digital-human-creator-v2-dialog--voice" onClick={(event) => event.stopPropagation()}>
            <div className="digital-human-creator-v2-dialog__head">
              <div>
                <strong>选择文案</strong>
                <p>把抖音工作台里最近生成的原创文案和二创文案，直接带入当前数字人片段。</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setIsCopyDialogOpen(false)}>
                关闭
              </button>
            </div>
            <div className="digital-human-creator-v2-dialog__tabs">
              <button type="button" className={`personal-reference-tab ${copyDialogTab === "ORIGINAL" ? "is-active" : ""}`} onClick={() => setCopyDialogTab("ORIGINAL")}>
                原创文案
              </button>
              <button type="button" className={`personal-reference-tab ${copyDialogTab === "REMIX" ? "is-active" : ""}`} onClick={() => setCopyDialogTab("REMIX")}>
                二创文案
              </button>
            </div>
            <div className="digital-human-creator-v2-dialog__grid">
              {copyDialogTab === "ORIGINAL"
                ? recentOriginalCopies.length
                  ? recentOriginalCopies.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="digital-human-creator-v2-picker-card is-material"
                        onClick={() => {
                          props.onApplyOriginalCopy(item);
                          setIsCopyDialogOpen(false);
                        }}
                      >
                        <div className="digital-human-creator-v2-picker-card__empty">{item.copyTypeLabel}</div>
                        <strong>{item.title}</strong>
                        <span>{item.topicContent}</span>
                      </button>
                    ))
                  : <div className="empty-state">当前还没有可带入的原创文案，请先到“原创文案”板块生成。</div>
                : null}
              {copyDialogTab === "REMIX"
                ? recentRemixCopies.length
                  ? recentRemixCopies.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="digital-human-creator-v2-picker-card is-material"
                        onClick={() => {
                          props.onApplyRemixCopy(item);
                          setIsCopyDialogOpen(false);
                        }}
                      >
                        <div className="digital-human-creator-v2-picker-card__empty">二创素材</div>
                        <strong>{item.title}</strong>
                        <span>{item.sourceMaterialTitle}</span>
                      </button>
                    ))
                  : <div className="empty-state">当前还没有可带入的二创文案，请先到“二创文案”板块生成。</div>
                : null}
            </div>
            <div className="digital-human-creator-v2__advanced" style={{ marginTop: 16 }}>
              {copyDialogTab === "ORIGINAL" ? (
                <>
                  <div className="personal-grid">
                    <label className="field">
                      <span>文案类型</span>
                      <select value={originalCopyType} onChange={(event) => setOriginalCopyType(event.target.value as typeof originalCopyType)}>
                        {originalTypeOptions.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>营销日历</span>
                      <select value={originalCalendarId} onChange={(event) => setOriginalCalendarId(event.target.value)}>
                        <option value="">不选择</option>
                        {props.originalCopyCalendarOptions.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>选题</span>
                      <select value={originalTopicId} onChange={(event) => setOriginalTopicId(event.target.value)}>
                        <option value="">不选择</option>
                        {props.originalCopyTopicOptions.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>植入营销策划</span>
                      <select value={originalInjectPlan ? "yes" : "no"} onChange={(event) => setOriginalInjectPlan(event.target.value === "yes")}>
                        <option value="yes">是</option>
                        <option value="no">否</option>
                      </select>
                    </label>
                    <label className="field field-full">
                      <span>附加要求</span>
                      <textarea value={originalRequirement} onChange={(event) => setOriginalRequirement(event.target.value)} placeholder="例如：更偏口播感、更像知识分享、控制在 45 秒内" />
                    </label>
                  </div>
                  <div className="strategy-inline-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="primary-button" onClick={() => void handleCreateOriginalCopy()} disabled={!props.canEdit || props.isSubmitting}>
                      直接生成原创文案
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="personal-grid">
                    <label className="field">
                      <span>来源素材</span>
                      <select value={remixMaterialId} onChange={(event) => setRemixMaterialId(event.target.value)}>
                        <option value="">请选择素材</option>
                        {props.materialLibraryItems.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>产品</span>
                      <select value={remixProductId} onChange={(event) => setRemixProductId(event.target.value)}>
                        <option value="">不选择</option>
                        {props.remixCopyProductOptions.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>植入品牌资料</span>
                      <select value={remixInjectBrandProfile ? "yes" : "no"} onChange={(event) => setRemixInjectBrandProfile(event.target.value === "yes")}>
                        <option value="yes">是</option>
                        <option value="no">否</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>植入营销策划</span>
                      <select value={remixInjectPlan ? "yes" : "no"} onChange={(event) => setRemixInjectPlan(event.target.value === "yes")}>
                        <option value="yes">是</option>
                        <option value="no">否</option>
                      </select>
                    </label>
                    <label className="field field-full">
                      <span>附加要求</span>
                      <textarea value={remixRequirement} onChange={(event) => setRemixRequirement(event.target.value)} placeholder="例如：更像自然口播、避开太强销售感、保留素材开头的钩子" />
                    </label>
                  </div>
                  <div className="strategy-inline-actions" style={{ marginTop: 12 }}>
                    <button type="button" className="primary-button" onClick={() => void handleCreateRemixCopy()} disabled={!props.canEdit || props.isSubmitting || !remixMaterialId}>
                      直接生成二创文案
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {props.isAudioDriveDialogOpen ? (
        <div className="digital-human-template-modal-overlay" role="dialog" aria-modal="true" onClick={props.onCloseAudioDriveDialog}>
          <div className="digital-human-template-modal digital-human-home-dialog digital-human-creator-v2-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="report-editor-head">
              <div>
                <strong>音频驱动</strong>
                <p>上传驱动视频和音频后，将继续复用现有口型驱动链路提交任务；音频时长会作为预计时长参考。</p>
              </div>
              <button type="button" className="secondary-button" onClick={props.onCloseAudioDriveDialog} disabled={props.isSubmitting}>
                关闭
              </button>
            </div>

            <div className="personal-grid" style={{ marginTop: 16 }}>
              <label className="field">
                <span>任务标题</span>
                <input value={props.audioDriveTitle} onChange={(event) => props.onAudioDriveTitleChange(event.target.value)} placeholder="例如：品牌讲解片段 1 音频驱动" />
              </label>
              <label className="field">
                <span>预计时长</span>
                <input value={props.audioDriveAudioDurationLabel || "等待读取音频时长"} readOnly />
              </label>
              <label className="field field-full">
                <span>驱动视频</span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/*"
                  onChange={(event) => props.onAudioDriveSourceVideoFileChange(event.target.files?.[0] || null)}
                  disabled={props.isSubmitting || !props.canEdit}
                />
              </label>
              <label className="field field-full">
                <span>驱动音频</span>
                <input
                  type="file"
                  accept="audio/mp3,audio/mpeg,audio/wav,audio/x-wav,audio/m4a,audio/*"
                  onChange={(event) => props.onAudioDriveAudioFileChange(event.target.files?.[0] || null)}
                  disabled={props.isSubmitting || !props.canEdit}
                />
                {props.audioDriveAudioPreviewUrl ? <audio controls preload="metadata" src={props.audioDriveAudioPreviewUrl} style={{ width: "100%", marginTop: 12 }} /> : null}
              </label>
            </div>

            <div className="digital-human-home-dialog__actions">
              <button type="button" className="secondary-button" onClick={props.onCloseAudioDriveDialog} disabled={props.isSubmitting}>
                取消
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void props.onSubmitAudioDrive()}
                disabled={!props.canEdit || props.isSubmitting || !props.audioDriveSourceVideoFile || !props.audioDriveAudioFile}
              >
                {props.isSubmitting ? "提交中..." : "提交音频驱动"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

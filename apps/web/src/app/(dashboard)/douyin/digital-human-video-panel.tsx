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
  previewImageUrl?: string;
  previewVideoUrl?: string;
  materialPreviewVideoUrl?: string;
};

type DigitalHumanVideoPanelMaterialItem = {
  id: string;
  label: string;
  videoUrl?: string;
};

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
  subtitleEnabled: boolean;
  subtitleTextColor: string;
  subtitleStrokeColor: string;
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
  onSubtitleEnabledChange: (value: boolean) => void;
  onSubtitleTextColorChange: (value: string) => void;
  onSubtitleStrokeColorChange: (value: string) => void;
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
  onLoadMoreTemplates?: () => Promise<void>;
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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showScriptAssets, setShowScriptAssets] = useState(false);

  const hasTemplates = props.filteredTemplates.length > 0;
  const estimatedDurationLabel = useMemo(() => {
    const textLength = props.script.trim().length;
    const durationSeconds = textLength ? Math.max(6, Math.ceil(textLength / 6)) : 0;
    if (!durationSeconds) {
      return "待输入文案";
    }
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return minutes ? `${minutes}分${seconds}秒` : `${seconds}秒`;
  }, [props.script]);
  const selectedAuditionUrl =
    props.selectedVoiceMode === "PUBLIC"
      ? props.selectedPublicVoice?.audition
      : props.selectedVoiceMode === "CUSTOM"
        ? props.selectedCustomVoice?.audioPath
        : props.personSource === "COMMON"
          ? props.selectedTemplate?.audioPreview
          : undefined;

  const selectedVoiceSummary =
    props.selectedVoiceMode === "DEFAULT"
      ? props.personSource === "CUSTOM"
        ? props.selectedCustomPerson?.audioManId
          ? `默认沿用当前数字人返回的克隆音色：${props.selectedCustomPerson.audioManId}`
          : "当前数字人暂无默认克隆音色，提交时会沿用平台默认语音策略。"
        : props.selectedTemplate?.audioName
          ? `默认音色：${props.selectedTemplate.audioName}`
          : "当前模板未返回默认音色。"
      : props.selectedVoiceMode === "PUBLIC"
        ? props.selectedPublicVoice
          ? `已选择公共声音：${props.selectedPublicVoice.name}${props.selectedPublicVoice.lang ? ` / ${props.selectedPublicVoice.lang}` : ""}`
          : "当前没有可用公共声音。"
        : props.selectedCustomVoice
          ? `已选择我的声音：${props.selectedCustomVoice.name}`
          : "当前没有可用我的声音。";
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
    props.onSelectedTemplateChange(templateId);
    props.onSelectedFigureTypeChange(target?.figures[0]?.type || "sit_body");
    setIsPersonDialogOpen(false);
  };

  const handlePickCustomPerson = (customPersonId: string) => {
    props.onPersonSourceChange("CUSTOM");
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

  useEffect(() => {
    if (!remixMaterialId && props.materialLibraryItems[0]?.id) {
      setRemixMaterialId(props.materialLibraryItems[0].id);
    }
  }, [props.materialLibraryItems, remixMaterialId]);

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

  const renderSegmentCard = (item: DigitalHumanVideoPanelDraftCard, index: number) => {
    const isActive = item.id === props.activeDraftCardId;
    const activeMaterialVideoUrl = isActive ? props.selectedMaterialLibraryItem?.videoUrl : undefined;
    const isMaterialMode = isActive ? Boolean(props.selectedMaterialLibraryItemId && props.selectedMaterialLibraryItem) : Boolean(item.materialLabel);
    const previewVideoUrl = isMaterialMode ? (activeMaterialVideoUrl || item.materialPreviewVideoUrl) : item.previewVideoUrl;
    const previewTitle = isMaterialMode ? item.materialLabel || "素材片段" : item.personLabel;
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
              {isActive && !isMaterialMode ? <button type="button" className="digital-human-creator-v2-card__change-bg">更换背景</button> : null}
              {previewVideoUrl && isMaterialMode ? (
                <video src={previewVideoUrl} className="digital-human-creator-v2-card__preview-video" controls preload="metadata" />
              ) : item.previewImageUrl ? (
                <img src={item.previewImageUrl} alt={item.personLabel} className="digital-human-creator-v2-card__preview-image" />
              ) : (
                <div className="digital-human-creator-v2-card__preview-empty">{isMaterialMode ? "未选择素材视频" : "未选择数字人"}</div>
              )}
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
                ) : null}
              </div>
            ) : item.materialLabel ? (
              <div className="digital-human-creator-v2-card__material">
                <strong>我的素材库</strong>
                <p>{item.materialLabel}</p>
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
                  <button type="button" className="secondary-button" onClick={() => setShowAdvancedSettings((current) => !current)}>
                    调整字幕样式
                  </button>
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

      <div className="digital-human-creator-v2__summary">
        <div className="entity-card personal-card">
          <strong>当前声音说明</strong>
          <p className="personal-meta">{selectedVoiceSummary}</p>
          <p className="panel-subtext">声音统一从“我的声音 / 公共声音”弹窗里选择，避免长下拉框影响创作节奏。</p>
        </div>
        <div className="entity-card personal-card">
          <strong>当前素材说明</strong>
          <p className="personal-meta">{props.selectedMaterialLibraryItem?.label || "暂未关联素材"}</p>
          <p className="panel-subtext">选中我的素材库后，当前片段左侧主预览会直接切换成素材视频，不再显示数字人预览。</p>
        </div>
      </div>

      {showAdvancedSettings ? (
        <div className="digital-human-creator-v2__advanced">
          <div className="personal-grid">
            <label className="field">
              <span>语速</span>
              <input value={props.speechRate} onChange={(event) => props.onSpeechRateChange(event.target.value)} />
            </label>
            <label className="field">
              <span>音调</span>
              <input value={props.pitch} onChange={(event) => props.onPitchChange(event.target.value)} />
            </label>
            <label className="field">
              <span>音量</span>
              <input value={props.volume} onChange={(event) => props.onVolumeChange(event.target.value)} />
            </label>
            <label className="field">
              <span>背景色</span>
              <input value={props.backgroundColor} onChange={(event) => props.onBackgroundColorChange(event.target.value)} />
            </label>
            <label className="field">
              <span>字幕颜色</span>
              <input value={props.subtitleTextColor} onChange={(event) => props.onSubtitleTextColorChange(event.target.value)} />
            </label>
            <label className="field">
              <span>描边颜色</span>
              <input value={props.subtitleStrokeColor} onChange={(event) => props.onSubtitleStrokeColorChange(event.target.value)} />
            </label>
            <label className="field">
              <span>画布宽度</span>
              <input value={props.screenWidth} onChange={(event) => props.onScreenWidthChange(event.target.value)} />
            </label>
            <label className="field">
              <span>画布高度</span>
              <input value={props.screenHeight} onChange={(event) => props.onScreenHeightChange(event.target.value)} />
            </label>
          </div>
        </div>
      ) : null}

      {showScriptAssets ? (
        <div className="digital-human-creator-v2__script-assets">
          <div className="strategy-inline-actions" style={{ flexWrap: "wrap" }}>
            {props.scriptPresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className="secondary-button"
                onClick={() => props.onScriptChange((current) => (current.trim() ? `${current.trim()}\n\n${preset.content}` : preset.content))}
              >
                {preset.label}
              </button>
            ))}
            <button type="button" className="secondary-button" onClick={() => void props.onCopyScript()}>
              复制脚本
            </button>
            <button type="button" className="secondary-button" onClick={props.onExportScript}>
              导出脚本
            </button>
            <button type="button" className="secondary-button" onClick={() => void props.onSaveCurrentScriptTemplate()}>
              保存脚本模板
            </button>
            <button type="button" className="secondary-button" onClick={props.onApplyPersonalScriptTemplate} disabled={!props.selectedPersonalScriptTemplateId}>
              套用已选模板
            </button>
          </div>
          <div className="personal-grid" style={{ marginTop: 12 }}>
            <label className="field">
              <span>保存范围</span>
              <select value={props.scriptTemplateVisibility} onChange={(event) => props.onScriptTemplateVisibilityChange(event.target.value as "SELF" | "SHARED")}>
                <option value="SELF">个人模板</option>
                <option value="SHARED">团队共享</option>
              </select>
            </label>
            <label className="field">
              <span>模板分类</span>
              <select value={props.scriptTemplateCategory} onChange={(event) => props.onScriptTemplateCategoryChange(event.target.value as ScriptTemplateCategory)}>
                {props.scriptTemplateCategories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field-full">
              <span>协作备注</span>
              <textarea value={props.personalScriptTemplateNote} onChange={(event) => props.onPersonalScriptTemplateNoteChange(event.target.value.slice(0, 200))} />
            </label>
          </div>
          {props.scriptActionMessage ? <p className="panel-subtext">{props.scriptActionMessage}</p> : null}
          {props.editorActionMessage ? <p className="panel-subtext">{props.editorActionMessage}</p> : null}
        </div>
      ) : null}

      <div className="digital-human-creator-v2__bottom-bar">
        <button type="button" className="secondary-button" onClick={() => setShowAdvancedSettings((current) => !current)}>
          高级设置
        </button>
        <button type="button" className="secondary-button" onClick={() => setShowScriptAssets((current) => !current)}>
          脚本资产
        </button>
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
                      <div className="digital-human-creator-v2-picker-card__empty">素材参考</div>
                      <strong>{item.label}</strong>
                    </button>
                  ))
                : null}
            </div>
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

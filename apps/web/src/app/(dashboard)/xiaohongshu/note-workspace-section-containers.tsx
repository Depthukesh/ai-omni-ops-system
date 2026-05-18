"use client";

import { type XhsCollectedNoteRecord } from "../../../services/collectors";
import { type TaskRecord } from "../../../services/personal-center";
import {
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
  type VideoProviderOptionRecord,
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";
import { buildNoteWorkspaceSectionsProps } from "./note-workspace-section-props";
import { NoteWorkspaceSections } from "./note-workspace-sections";
import { type ProductOption, type SelectOption, type OptionalDateFormatter } from "./shared-types";
import { type useNoteComposerForms } from "./use-note-composer-forms";
import { type useWorkComposerActions } from "./use-work-composer-actions";
import { type useWorkEditors } from "./use-work-editors";
import { type useWorkMutationActions } from "./use-work-mutation-actions";
import { type useXiaohongshuWorkspaceTasks } from "./use-xiaohongshu-workspace-tasks";

type NoteSectionKey = "original" | "remix" | "video";

type NoteComposerFormsState = Pick<
  ReturnType<typeof useNoteComposerForms>,
  | "isOriginalModalOpen"
  | "originalCalendarValue"
  | "originalCustomTopic"
  | "originalProductValue"
  | "originalAccountRoleValue"
  | "originalImageCountValue"
  | "originalInjectMarketingPlanValue"
  | "originalAdditionalInstruction"
  | "coverReferenceFile"
  | "galleryReferenceFiles"
  | "isRewriteModalOpen"
  | "rewriteMaterialValue"
  | "rewriteProductValue"
  | "rewriteAccountRoleValue"
  | "rewriteInjectMarketingPlanValue"
  | "rewriteAdditionalInstruction"
  | "isVideoModalOpen"
  | "videoCalendarValue"
  | "videoCustomTopic"
  | "videoProductValue"
  | "videoMaterialValue"
  | "videoAccountRoleValue"
  | "videoReferenceImageFile"
  | "videoKindValue"
  | "videoCopyAdditionalInstruction"
  | "videoProviderValue"
  | "videoCustomProviderValue"
  | "videoCustomModelName"
  | "videoDurationValue"
  | "videoInjectMarketingPlanValue"
  | "videoAdditionalInstruction"
  | "customVideoProviderOption"
  | "setOriginalCalendarValue"
  | "setOriginalCustomTopic"
  | "setOriginalProductValue"
  | "setOriginalAccountRoleValue"
  | "setOriginalImageCountValue"
  | "setOriginalInjectMarketingPlanValue"
  | "setOriginalAdditionalInstruction"
  | "setCoverReferenceFile"
  | "setGalleryReferenceFiles"
  | "setRewriteMaterialValue"
  | "setRewriteProductValue"
  | "setRewriteAccountRoleValue"
  | "setRewriteInjectMarketingPlanValue"
  | "setRewriteAdditionalInstruction"
  | "setVideoCalendarValue"
  | "setVideoCustomTopic"
  | "setVideoProductValue"
  | "setVideoMaterialValue"
  | "setVideoAccountRoleValue"
  | "setVideoReferenceImageFile"
  | "setVideoKindValue"
  | "setVideoCopyAdditionalInstruction"
  | "setVideoProviderValue"
  | "setVideoCustomProviderValue"
  | "setVideoCustomModelName"
  | "setVideoDurationValue"
  | "setVideoInjectMarketingPlanValue"
  | "setVideoAdditionalInstruction"
  | "openOriginalModal"
  | "closeOriginalModal"
  | "openRewriteModal"
  | "closeRewriteModal"
  | "openVideoModal"
  | "closeVideoModal"
>;

type WorkEditorsState = Pick<
  ReturnType<typeof useWorkEditors>,
  | "editingOriginalWorkId"
  | "editingOriginalTitle"
  | "editingOriginalContent"
  | "savingOriginalWorkId"
  | "editingRewriteWorkId"
  | "editingRewriteTitle"
  | "editingRewriteContent"
  | "savingRewriteWorkId"
  | "editingVideoWorkId"
  | "editingVideoTitle"
  | "editingVideoContent"
  | "editingVideoStoryboardPrompt"
  | "savingVideoWorkId"
  | "setEditingOriginalTitle"
  | "setEditingOriginalContent"
  | "setEditingRewriteTitle"
  | "setEditingRewriteContent"
  | "setEditingVideoTitle"
  | "setEditingVideoContent"
  | "setEditingVideoStoryboardPrompt"
  | "startEditOriginalWork"
  | "cancelEditOriginalWork"
  | "startEditRewriteWork"
  | "cancelEditRewriteWork"
  | "startEditVideoWork"
  | "cancelEditVideoWork"
>;

type WorkComposerActionsState = Pick<
  ReturnType<typeof useWorkComposerActions>,
  | "isPublishing"
  | "isRewriteSubmitting"
  | "rewriteSubmittingLabel"
  | "isVideoSubmitting"
  | "videoSubmittingLabel"
  | "createOriginalWork"
  | "createRewriteWork"
  | "createVideoWork"
>;

type WorkMutationActionsState = Pick<
  ReturnType<typeof useWorkMutationActions>,
  | "saveOriginalWork"
  | "deleteOriginalWork"
  | "saveRewriteWork"
  | "deleteRewriteWork"
  | "saveVideoWork"
  | "deleteVideoWork"
  | "regenerateVideoStoryboard"
  | "generateVideoFromStoryboard"
>;

type WorkspaceTasksState = Pick<
  ReturnType<typeof useXiaohongshuWorkspaceTasks>,
  | "originalTaskCount"
  | "latestOriginalTask"
  | "isOriginalTaskActive"
  | "originalInlineError"
  | "originalTaskStatusText"
  | "canCancelOriginalTask"
  | "isCancellingOriginalTask"
  | "rewriteTaskCount"
  | "latestRewriteTask"
  | "isRewriteTaskActive"
  | "showRewriteSubmittingState"
  | "rewriteInlineError"
  | "rewriteTaskStatusText"
  | "canCancelRewriteTask"
  | "isCancellingRewriteTask"
  | "videoTaskCount"
  | "latestVideoTask"
  | "isVideoTaskActive"
  | "showVideoSubmittingState"
  | "videoInlineError"
  | "videoTaskStatusText"
  | "canCancelVideoTask"
  | "isCancellingVideoTask"
  | "latestOriginalPublishTask"
  | "latestRewritePublishTask"
  | "publishTaskMap"
>;

interface NoteWorkspaceSectionContainersProps {
  activeSection: NoteSectionKey;
  currentSection: {
    label: string;
    description: string;
  };
  isLoading: boolean;
  products: ProductOption[];
  materialNotes: XhsCollectedNoteRecord[];
  calendarAllItems: Array<{ id: string; date: string; topicName: string }>;
  originalAccountRoleOptions: SelectOption[];
  originalWorks: XiaohongshuOriginalWorkRecord[];
  rewriteWorks: XiaohongshuRewriteWorkRecord[];
  videoWorks: XiaohongshuVideoWorkRecord[];
  selectedVideoWorkId: string;
  setSelectedVideoWorkId: (value: string) => void;
  previewIndexMap: Record<string, number>;
  deletingOriginalWorkId: string;
  deletingRewriteWorkId: string;
  deletingVideoWorkId: string;
  originalReferenceTemplateCategories: XhsOriginalReferenceTemplateCategoryRecord[];
  originalReferenceTemplateItems: XhsOriginalReferenceTemplateRecord[];
  isLoadingOriginalReferenceTemplates: boolean;
  originalReferenceTemplatesError: string;
  videoProviderOptions: VideoProviderOptionRecord[];
  noProductOption: string;
  autoImageCountOption: string;
  customTopicOption: string;
  composerForms: NoteComposerFormsState;
  workEditors: WorkEditorsState;
  workComposerActions: WorkComposerActionsState;
  workMutationActions: WorkMutationActionsState;
  workspaceTasks: WorkspaceTasksState;
  shiftMaterialPreview: (noteId: string, total: number, delta: number) => void;
  openOriginalWorkLightbox: (item: XiaohongshuOriginalWorkRecord, index: number) => void;
  openRewriteWorkLightbox: (item: XiaohongshuRewriteWorkRecord, index: number) => void;
  openVideoWorkLightbox: (item: XiaohongshuVideoWorkRecord) => void;
  loadWorkspace: () => void | Promise<void>;
  reloadOriginalReferenceTemplates: () => void | Promise<void>;
  handleCancelComposeTask: (
    task: TaskRecord | undefined,
    label: "原创笔记" | "二创笔记" | "视频笔记",
  ) => void | Promise<void>;
  handleOpenPublishModal: (target: {
    id: string;
    workKind: "ORIGINAL" | "REWRITE";
    noteCategory: "原创" | "二创";
    title: string;
    sourceLabel: string;
  }) => void;
  getTaskStatusClass: (status?: TaskRecord["taskStatus"]) => string;
  getOriginalTaskStatusClass: (status?: XiaohongshuOriginalWorkRecord["taskStatus"]) => string;
  getOriginalTaskStatusText: (status?: XiaohongshuOriginalWorkRecord["taskStatus"]) => string;
  getPublishTaskStatusText: (task?: TaskRecord) => string;
  getPublishTaskSummaryText: (task: TaskRecord, noteCategory: "原创" | "二创") => string;
  getWorkPublishTaskLabel: (task?: TaskRecord) => string;
  formatDateTime: OptionalDateFormatter;
}

export function NoteWorkspaceSectionContainers(props: NoteWorkspaceSectionContainersProps) {
  const {
    activeSection,
    currentSection,
    isLoading,
    products,
    materialNotes,
    calendarAllItems,
    originalAccountRoleOptions,
    originalWorks,
    rewriteWorks,
    videoWorks,
    selectedVideoWorkId,
    setSelectedVideoWorkId,
    previewIndexMap,
    deletingOriginalWorkId,
    deletingRewriteWorkId,
    deletingVideoWorkId,
    originalReferenceTemplateCategories,
    originalReferenceTemplateItems,
    isLoadingOriginalReferenceTemplates,
    originalReferenceTemplatesError,
    videoProviderOptions,
    noProductOption,
    autoImageCountOption,
    customTopicOption,
    composerForms,
    workEditors,
    workComposerActions,
    workMutationActions,
    workspaceTasks,
    shiftMaterialPreview,
    openOriginalWorkLightbox,
    openRewriteWorkLightbox,
    openVideoWorkLightbox,
    loadWorkspace,
    reloadOriginalReferenceTemplates,
    handleCancelComposeTask,
    handleOpenPublishModal,
    getTaskStatusClass,
    getOriginalTaskStatusClass,
    getOriginalTaskStatusText,
    getPublishTaskStatusText,
    getPublishTaskSummaryText,
    getWorkPublishTaskLabel,
    formatDateTime,
  } = props;

  const originalEditingWork = originalWorks.find((item) => item.id === workEditors.editingOriginalWorkId);
  const rewriteEditingWork = rewriteWorks.find((item) => item.id === workEditors.editingRewriteWorkId);
  const videoSelectedWork = videoWorks.find((item) => item.id === selectedVideoWorkId) || videoWorks[0];
  const videoEditingWork = videoWorks.find((item) => item.id === workEditors.editingVideoWorkId);
  const originalCalendarOptions = calendarAllItems.map((item) => ({
    value: item.id,
    label: `${item.date}｜${item.topicName}`,
  }));

  function handleOpenOriginalModal() {
    composerForms.openOriginalModal(calendarAllItems, products);
  }

  function handleOpenRewriteModal() {
    composerForms.openRewriteModal(materialNotes, products);
  }

  function handleOpenVideoModal() {
    composerForms.openVideoModal(calendarAllItems, products);
  }

  function handleStartEditOriginalWork(item: XiaohongshuOriginalWorkRecord) {
    workEditors.startEditOriginalWork(item);
  }

  function handleStartEditRewriteWork(item: XiaohongshuRewriteWorkRecord) {
    workEditors.startEditRewriteWork(item);
  }

  function handleStartEditVideoWork(item: XiaohongshuVideoWorkRecord) {
    workEditors.startEditVideoWork(item, setSelectedVideoWorkId);
  }

  function handleSelectVideoWork(item: XiaohongshuVideoWorkRecord) {
    setSelectedVideoWorkId(item.id);
    workEditors.setEditingVideoStoryboardPrompt(item.storyboardPrompt || "");
  }

  const { originalWorkspaceProps, rewriteWorkspaceProps, videoWorkspaceProps } = buildNoteWorkspaceSectionsProps({
    original: {
      sectionLabel: currentSection.label,
      sectionDescription: currentSection.description,
      isLoading,
      isPublishing: workComposerActions.isPublishing,
      isTaskActive: workspaceTasks.isOriginalTaskActive,
      taskCount: workspaceTasks.originalTaskCount,
      latestTask: workspaceTasks.latestOriginalTask,
      taskStatusText: workspaceTasks.originalTaskStatusText,
      inlineError: workspaceTasks.originalInlineError,
      isCancellingTask: workspaceTasks.isCancellingOriginalTask,
      canCancelTask: workspaceTasks.canCancelOriginalTask,
      latestPublishTask: workspaceTasks.latestOriginalPublishTask,
      items: originalWorks,
      previewIndexMap,
      deletingWorkId: deletingOriginalWorkId,
      editingWork: originalEditingWork,
      editingTitle: workEditors.editingOriginalTitle,
      editingContent: workEditors.editingOriginalContent,
      savingWorkId: workEditors.savingOriginalWorkId,
      isCreateModalOpen: composerForms.isOriginalModalOpen,
      calendarOptions: originalCalendarOptions,
      customTopicOption,
      noProductOption,
      autoImageCountOption,
      products,
      calendarValue: composerForms.originalCalendarValue,
      customTopic: composerForms.originalCustomTopic,
      productValue: composerForms.originalProductValue,
      accountRoleValue: composerForms.originalAccountRoleValue,
      accountRoleOptions: originalAccountRoleOptions,
      imageCountValue: composerForms.originalImageCountValue,
      injectMarketingPlanValue: composerForms.originalInjectMarketingPlanValue,
      additionalInstruction: composerForms.originalAdditionalInstruction,
      coverReferenceFile: composerForms.coverReferenceFile,
      galleryReferenceFiles: composerForms.galleryReferenceFiles,
      referenceTemplateCategories: originalReferenceTemplateCategories,
      referenceTemplateItems: originalReferenceTemplateItems,
      isReferenceTemplatesLoading: isLoadingOriginalReferenceTemplates,
      referenceTemplatesError: originalReferenceTemplatesError,
      onOpenCreate: handleOpenOriginalModal,
      onShiftPreview: shiftMaterialPreview,
      onOpenLightbox: openOriginalWorkLightbox,
      onEdit: handleStartEditOriginalWork,
      onCloseEdit: workEditors.cancelEditOriginalWork,
      onSaveEdit: workMutationActions.saveOriginalWork,
      onEditTitleChange: workEditors.setEditingOriginalTitle,
      onEditContentChange: workEditors.setEditingOriginalContent,
      onCloseCreate: composerForms.closeOriginalModal,
      onCreate: workComposerActions.createOriginalWork,
      onCalendarChange: composerForms.setOriginalCalendarValue,
      onCustomTopicChange: composerForms.setOriginalCustomTopic,
      onProductChange: composerForms.setOriginalProductValue,
      onAccountRoleChange: composerForms.setOriginalAccountRoleValue,
      onImageCountChange: composerForms.setOriginalImageCountValue,
      onInjectMarketingPlanChange: composerForms.setOriginalInjectMarketingPlanValue,
      onAdditionalInstructionChange: composerForms.setOriginalAdditionalInstruction,
      onCoverReferenceFileChange: composerForms.setCoverReferenceFile,
      onGalleryReferenceFilesChange: composerForms.setGalleryReferenceFiles,
      onReloadReferenceTemplates: reloadOriginalReferenceTemplates,
      getTaskStatusClass,
      getOriginalTaskStatusClass,
      getOriginalTaskStatusText,
      getPublishTaskStatusText,
      getPublishTaskSummaryText,
      formatDateTime,
      loadWorkspace,
      handleCancelComposeTask,
      handleOpenPublishModal,
      publishTaskMap: workspaceTasks.publishTaskMap,
      getWorkPublishTaskLabel,
      handleDeleteOriginalWork: workMutationActions.deleteOriginalWork,
    },
    rewrite: {
      sectionLabel: currentSection.label,
      sectionDescription: currentSection.description,
      isLoading,
      isPublishing: workComposerActions.isPublishing,
      isTaskActive: workspaceTasks.isRewriteTaskActive,
      taskCount: workspaceTasks.rewriteTaskCount,
      showSubmittingState: workspaceTasks.showRewriteSubmittingState,
      submittingLabel: workComposerActions.rewriteSubmittingLabel,
      latestTask: workspaceTasks.latestRewriteTask,
      taskStatusText: workspaceTasks.rewriteTaskStatusText,
      inlineError: workspaceTasks.rewriteInlineError,
      isCancellingTask: workspaceTasks.isCancellingRewriteTask,
      canCancelTask: workspaceTasks.canCancelRewriteTask,
      latestPublishTask: workspaceTasks.latestRewritePublishTask,
      items: rewriteWorks,
      materialNotes,
      previewIndexMap,
      deletingWorkId: deletingRewriteWorkId,
      editingWork: rewriteEditingWork,
      editingTitle: workEditors.editingRewriteTitle,
      editingContent: workEditors.editingRewriteContent,
      savingWorkId: workEditors.savingRewriteWorkId,
      isCreateModalOpen: composerForms.isRewriteModalOpen,
      noProductOption,
      products,
      materialValue: composerForms.rewriteMaterialValue,
      productValue: composerForms.rewriteProductValue,
      accountRoleValue: composerForms.rewriteAccountRoleValue,
      accountRoleOptions: originalAccountRoleOptions,
      injectMarketingPlanValue: composerForms.rewriteInjectMarketingPlanValue,
      additionalInstruction: composerForms.rewriteAdditionalInstruction,
      onOpenCreate: handleOpenRewriteModal,
      onShiftPreview: shiftMaterialPreview,
      onOpenLightbox: openRewriteWorkLightbox,
      onEdit: handleStartEditRewriteWork,
      onCloseEdit: workEditors.cancelEditRewriteWork,
      onSaveEdit: workMutationActions.saveRewriteWork,
      onEditTitleChange: workEditors.setEditingRewriteTitle,
      onEditContentChange: workEditors.setEditingRewriteContent,
      onCloseCreate: composerForms.closeRewriteModal,
      onCreate: workComposerActions.createRewriteWork,
      onMaterialChange: composerForms.setRewriteMaterialValue,
      onProductChange: composerForms.setRewriteProductValue,
      onAccountRoleChange: composerForms.setRewriteAccountRoleValue,
      onInjectMarketingPlanChange: composerForms.setRewriteInjectMarketingPlanValue,
      onAdditionalInstructionChange: composerForms.setRewriteAdditionalInstruction,
      getTaskStatusClass,
      getOriginalTaskStatusClass,
      getOriginalTaskStatusText,
      getPublishTaskStatusText,
      getPublishTaskSummaryText,
      formatDateTime,
      loadWorkspace,
      handleCancelComposeTask,
      handleOpenPublishModal,
      publishTaskMap: workspaceTasks.publishTaskMap,
      getWorkPublishTaskLabel,
      handleDeleteRewriteWork: workMutationActions.deleteRewriteWork,
    },
    video: {
      sectionLabel: currentSection.label,
      sectionDescription: currentSection.description,
      isLoading,
      isPublishing: workComposerActions.isPublishing,
      isTaskActive: workspaceTasks.isVideoTaskActive,
      taskCount: workspaceTasks.videoTaskCount,
      showSubmittingState: workspaceTasks.showVideoSubmittingState,
      submittingLabel: workComposerActions.videoSubmittingLabel,
      latestTask: workspaceTasks.latestVideoTask,
      taskStatusText: workspaceTasks.videoTaskStatusText,
      inlineError: workspaceTasks.videoInlineError,
      isCancellingTask: workspaceTasks.isCancellingVideoTask,
      canCancelTask: workspaceTasks.canCancelVideoTask,
      items: videoWorks,
      materialNotes,
      selectedWork: videoSelectedWork,
      deletingWorkId: deletingVideoWorkId,
      editingWork: videoEditingWork,
      editingTitle: workEditors.editingVideoTitle,
      editingContent: workEditors.editingVideoContent,
      editingStoryboardPrompt: workEditors.editingVideoStoryboardPrompt,
      savingWorkId: workEditors.savingVideoWorkId,
      isCreateModalOpen: composerForms.isVideoModalOpen,
      calendarOptions: originalCalendarOptions,
      customTopicOption,
      noProductOption,
      customVideoProviderOption: composerForms.customVideoProviderOption,
      videoProviderOptions,
      products,
      calendarValue: composerForms.videoCalendarValue,
      customTopic: composerForms.videoCustomTopic,
      productValue: composerForms.videoProductValue,
      materialValue: composerForms.videoMaterialValue,
      accountRoleValue: composerForms.videoAccountRoleValue,
      accountRoleOptions: originalAccountRoleOptions,
      referenceImageFile: composerForms.videoReferenceImageFile,
      videoKindValue: composerForms.videoKindValue,
      copyAdditionalInstruction: composerForms.videoCopyAdditionalInstruction,
      providerValue: composerForms.videoProviderValue,
      customProviderValue: composerForms.videoCustomProviderValue,
      customModelName: composerForms.videoCustomModelName,
      durationValue: composerForms.videoDurationValue,
      injectMarketingPlanValue: composerForms.videoInjectMarketingPlanValue,
      additionalInstruction: composerForms.videoAdditionalInstruction,
      onOpenCreate: handleOpenVideoModal,
      onSelectWork: handleSelectVideoWork,
      onPreview: openVideoWorkLightbox,
      onEdit: handleStartEditVideoWork,
      onCloseEdit: workEditors.cancelEditVideoWork,
      onSaveEdit: workMutationActions.saveVideoWork,
      onEditTitleChange: workEditors.setEditingVideoTitle,
      onEditContentChange: workEditors.setEditingVideoContent,
      onEditStoryboardPromptChange: workEditors.setEditingVideoStoryboardPrompt,
      onCloseCreate: composerForms.closeVideoModal,
      onCreate: workComposerActions.createVideoWork,
      onCalendarChange: composerForms.setVideoCalendarValue,
      onMaterialChange: composerForms.setVideoMaterialValue,
      onAccountRoleChange: composerForms.setVideoAccountRoleValue,
      onCustomTopicChange: composerForms.setVideoCustomTopic,
      onVideoKindChangeBase: composerForms.setVideoKindValue,
      onCopyAdditionalInstructionChange: composerForms.setVideoCopyAdditionalInstruction,
      onProviderChange: composerForms.setVideoProviderValue,
      onCustomProviderChange: composerForms.setVideoCustomProviderValue,
      onCustomModelNameChange: composerForms.setVideoCustomModelName,
      onDurationChange: composerForms.setVideoDurationValue,
      onInjectMarketingPlanChange: composerForms.setVideoInjectMarketingPlanValue,
      onAdditionalInstructionChange: composerForms.setVideoAdditionalInstruction,
      getTaskStatusClass,
      getOriginalTaskStatusClass,
      getOriginalTaskStatusText,
      formatDateTime,
      loadWorkspace,
      handleCancelComposeTask,
      handleDeleteVideoWork: workMutationActions.deleteVideoWork,
      handleRegenerateVideoStoryboard: workMutationActions.regenerateVideoStoryboard,
      handleGenerateVideoFromStoryboard: workMutationActions.generateVideoFromStoryboard,
      setVideoProductValue: composerForms.setVideoProductValue,
      setVideoReferenceImageFile: composerForms.setVideoReferenceImageFile,
      setVideoMaterialValue: composerForms.setVideoMaterialValue,
    },
  });

  return (
    <NoteWorkspaceSections
      activeSection={activeSection}
      originalWorkspaceProps={originalWorkspaceProps}
      rewriteWorkspaceProps={rewriteWorkspaceProps}
      videoWorkspaceProps={videoWorkspaceProps}
    />
  );
}

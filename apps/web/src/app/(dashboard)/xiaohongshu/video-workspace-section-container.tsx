"use client";

import { buildVideoWorkspaceProps } from "./note-workspace-section-props";
import { VideoWorkspace } from "./note-workspaces";
import { type NoteWorkspaceSectionContainerSharedProps } from "./note-workspace-section-containers";

export function VideoWorkspaceSectionContainer(props: NoteWorkspaceSectionContainerSharedProps) {
  const {
    currentSection,
    isLoading,
    products,
    materialNotes,
    calendarAllItems,
    originalAccountRoleOptions,
    videoWorks,
    selectedVideoWorkId,
    setSelectedVideoWorkId,
    deletingVideoWorkId,
    videoProviderOptions,
    composerForms,
    workEditors,
    workComposerActions,
    workMutationActions,
    workspaceTasks,
    openVideoWorkLightbox,
    loadWorkspace,
    handleCancelComposeTask,
    getTaskStatusClass,
    getOriginalTaskStatusClass,
    getOriginalTaskStatusText,
    formatDateTime,
  } = props;

  const videoSelectedWork = videoWorks.find((item) => item.id === selectedVideoWorkId) || videoWorks[0];
  const videoEditingWork = videoWorks.find((item) => item.id === workEditors.editingVideoWorkId);
  const originalCalendarOptions = calendarAllItems.map((item) => ({
    value: item.id,
    label: `${item.date}｜${item.topicName}`,
  }));

  function handleOpenVideoModal() {
    composerForms.openVideoModal(calendarAllItems, products);
  }

  function handleStartEditVideoWork(item: (typeof videoWorks)[number]) {
    workEditors.startEditVideoWork(item, setSelectedVideoWorkId);
  }

  function handleSelectVideoWork(item: (typeof videoWorks)[number]) {
    setSelectedVideoWorkId(item.id);
    workEditors.setEditingVideoStoryboardPrompt(item.storyboardPrompt || "");
  }

  const videoWorkspaceProps = buildVideoWorkspaceProps({
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
    customTopicOption: props.customTopicOption,
    noProductOption: props.noProductOption,
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
  });

  return <VideoWorkspace {...videoWorkspaceProps} />;
}

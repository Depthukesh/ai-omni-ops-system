"use client";

import { buildOriginalWorkspaceProps } from "./note-workspace-section-props";
import { OriginalWorkspace } from "./note-workspaces";
import { type NoteWorkspaceSectionContainerSharedProps } from "./note-workspace-section-containers";

export function OriginalWorkspaceSectionContainer(props: NoteWorkspaceSectionContainerSharedProps) {
  const {
    currentSection,
    isLoading,
    products,
    calendarAllItems,
    originalAccountRoleOptions,
    originalWorks,
    previewIndexMap,
    deletingOriginalWorkId,
    originalReferenceTemplateCategories,
    originalReferenceTemplateItems,
    isLoadingOriginalReferenceTemplates,
    originalReferenceTemplatesError,
    composerForms,
    workEditors,
    workComposerActions,
    workMutationActions,
    workspaceTasks,
    shiftMaterialPreview,
    openOriginalWorkLightbox,
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
  const originalCalendarOptions = calendarAllItems.map((item) => ({
    value: item.id,
    label: `${item.date}｜${item.topicName}`,
  }));

  function handleOpenOriginalModal() {
    composerForms.openOriginalModal(calendarAllItems, products);
  }

  function handleStartEditOriginalWork(item: (typeof originalWorks)[number]) {
    workEditors.startEditOriginalWork(item);
  }

  const originalWorkspaceProps = buildOriginalWorkspaceProps({
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
    customTopicOption: props.customTopicOption,
    noProductOption: props.noProductOption,
    autoImageCountOption: props.autoImageCountOption,
    products,
    calendarValue: composerForms.originalCalendarValue,
    customTopic: composerForms.originalCustomTopic,
    productValue: composerForms.originalProductValue,
    accountRoleValue: composerForms.originalAccountRoleValue,
    noteModeValue: composerForms.originalNoteModeValue,
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
    onNoteModeChange: composerForms.setOriginalNoteModeValue,
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
  });

  return <OriginalWorkspace {...originalWorkspaceProps} />;
}

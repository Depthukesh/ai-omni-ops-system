"use client";

import { buildRewriteWorkspaceProps } from "./note-workspace-section-props";
import { RewriteWorkspace } from "./note-workspaces";
import { type NoteWorkspaceSectionContainerSharedProps } from "./note-workspace-section-containers";

export function RewriteWorkspaceSectionContainer(props: NoteWorkspaceSectionContainerSharedProps) {
  const {
    currentSection,
    isLoading,
    products,
    materialNotes,
    originalAccountRoleOptions,
    rewriteWorks,
    previewIndexMap,
    deletingRewriteWorkId,
    composerForms,
    workEditors,
    workComposerActions,
    workMutationActions,
    workspaceTasks,
    shiftMaterialPreview,
    openRewriteWorkLightbox,
    loadWorkspace,
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

  const rewriteEditingWork = rewriteWorks.find((item) => item.id === workEditors.editingRewriteWorkId);

  function handleOpenRewriteModal() {
    composerForms.openRewriteModal(materialNotes, products);
  }

  function handleStartEditRewriteWork(item: (typeof rewriteWorks)[number]) {
    workEditors.startEditRewriteWork(item);
  }

  const rewriteWorkspaceProps = buildRewriteWorkspaceProps({
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
    noProductOption: props.noProductOption,
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
  });

  return <RewriteWorkspace {...rewriteWorkspaceProps} />;
}

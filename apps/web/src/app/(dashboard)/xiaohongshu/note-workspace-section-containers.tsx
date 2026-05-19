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
import { type OptionalDateFormatter, type ProductOption, type SelectOption } from "./shared-types";
import { type useNoteComposerForms } from "./use-note-composer-forms";
import { OriginalWorkspaceSectionContainer } from "./original-workspace-section-container";
import { RewriteWorkspaceSectionContainer } from "./rewrite-workspace-section-container";
import { type useWorkComposerActions } from "./use-work-composer-actions";
import { type useWorkEditors } from "./use-work-editors";
import { type useWorkMutationActions } from "./use-work-mutation-actions";
import { type useXiaohongshuWorkspaceTasks } from "./use-xiaohongshu-workspace-tasks";
import { VideoWorkspaceSectionContainer } from "./video-workspace-section-container";

type NoteSectionKey = "original" | "remix" | "video";

export type NoteComposerFormsState = Pick<
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

export type WorkEditorsState = Pick<
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

export type WorkComposerActionsState = Pick<
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

export type WorkMutationActionsState = Pick<
  ReturnType<typeof useWorkMutationActions>,
  | "saveOriginalWork"
  | "deleteOriginalWork"
  | "saveRewriteWork"
  | "deleteRewriteWork"
  | "saveVideoWork"
  | "deleteVideoWork"
  | "regenerateVideoStoryboard"
  | "generateVideoFromStoryboard"
  | "recoverVideoResult"
>;

export type WorkspaceTasksState = Pick<
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

export interface NoteWorkspaceSectionContainerSharedProps {
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

export interface NoteWorkspaceSectionContainersProps extends NoteWorkspaceSectionContainerSharedProps {
  activeSection: NoteSectionKey;
}

export function NoteWorkspaceSectionContainers(props: NoteWorkspaceSectionContainersProps) {
  if (props.activeSection === "original") {
    return <OriginalWorkspaceSectionContainer {...props} />;
  }

  if (props.activeSection === "remix") {
    return <RewriteWorkspaceSectionContainer {...props} />;
  }

  return <VideoWorkspaceSectionContainer {...props} />;
}

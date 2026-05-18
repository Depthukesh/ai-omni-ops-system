import { type TaskRecord } from "../../../services/personal-center";
import { type XiaohongshuOriginalWorkRecord, type XiaohongshuRewriteWorkRecord, type XiaohongshuVideoWorkRecord } from "../../../services/works";
import { type OriginalWorkspaceProps, type RewriteWorkspaceProps, type VideoWorkspaceProps } from "./note-workspaces";
import { type PublishableWorkTarget } from "./publish-types";

type ComposeTaskLabel = "原创笔记" | "二创笔记" | "视频笔记";

interface BuildOriginalWorkspacePropsOptions
  extends Omit<OriginalWorkspaceProps, "onRefresh" | "onCancelTask" | "onPublish" | "getPublishLabel" | "onDelete"> {
  loadWorkspace: () => void | Promise<void>;
  handleCancelComposeTask: (task: TaskRecord | undefined, label: ComposeTaskLabel) => void | Promise<void>;
  handleOpenPublishModal: (target: PublishableWorkTarget) => void;
  publishTaskMap: Record<string, TaskRecord>;
  getWorkPublishTaskLabel: (task?: TaskRecord) => string;
  handleDeleteOriginalWork: (workId: string) => void | Promise<void>;
}

export function buildOriginalWorkspaceProps(options: BuildOriginalWorkspacePropsOptions): OriginalWorkspaceProps {
  return {
    ...options,
    onRefresh: () => options.loadWorkspace(),
    onCancelTask: () => options.handleCancelComposeTask(options.latestTask, "原创笔记"),
    onPublish: (item: XiaohongshuOriginalWorkRecord) =>
      options.handleOpenPublishModal({
        id: item.id,
        workKind: "ORIGINAL",
        noteCategory: "原创",
        title: item.title,
        sourceLabel: item.calendarLabel || item.customTopicName || "原创笔记",
      }),
    getPublishLabel: (workId: string) => options.getWorkPublishTaskLabel(options.publishTaskMap[workId]),
    onDelete: (workId: string) => options.handleDeleteOriginalWork(workId),
  };
}

interface BuildRewriteWorkspacePropsOptions
  extends Omit<RewriteWorkspaceProps, "onRefresh" | "onCancelTask" | "onPublish" | "getPublishLabel" | "onDelete"> {
  loadWorkspace: () => void | Promise<void>;
  handleCancelComposeTask: (task: TaskRecord | undefined, label: ComposeTaskLabel) => void | Promise<void>;
  handleOpenPublishModal: (target: PublishableWorkTarget) => void;
  publishTaskMap: Record<string, TaskRecord>;
  getWorkPublishTaskLabel: (task?: TaskRecord) => string;
  handleDeleteRewriteWork: (workId: string) => void | Promise<void>;
}

export function buildRewriteWorkspaceProps(options: BuildRewriteWorkspacePropsOptions): RewriteWorkspaceProps {
  return {
    ...options,
    onRefresh: () => options.loadWorkspace(),
    onCancelTask: () => options.handleCancelComposeTask(options.latestTask, "二创笔记"),
    onPublish: (item: XiaohongshuRewriteWorkRecord) =>
      options.handleOpenPublishModal({
        id: item.id,
        workKind: "REWRITE",
        noteCategory: "二创",
        title: item.title,
        sourceLabel: item.sourceMaterialTitle,
      }),
    getPublishLabel: (workId: string) => options.getWorkPublishTaskLabel(options.publishTaskMap[workId]),
    onDelete: (workId: string) => options.handleDeleteRewriteWork(workId),
  };
}

interface BuildVideoWorkspacePropsOptions
  extends Omit<
    VideoWorkspaceProps,
    "onRefresh" | "onCancelTask" | "onDelete" | "onRegenerateStoryboard" | "onGenerateVideo" | "onProductChange" | "onReferenceImageFileChange" | "onVideoKindChange"
  > {
  loadWorkspace: () => void | Promise<void>;
  handleCancelComposeTask: (task: TaskRecord | undefined, label: ComposeTaskLabel) => void | Promise<void>;
  handleDeleteVideoWork: (workId: string) => void | Promise<void>;
  handleRegenerateVideoStoryboard: (workId: string, storyboardPrompt: string) => void | Promise<void>;
  handleGenerateVideoFromStoryboard: (workId: string, modelName: string) => void | Promise<void>;
  setVideoProductValue: (value: string) => void;
  setVideoReferenceImageFile: (file: File | null) => void;
  setVideoMaterialValue: (value: string) => void;
  onVideoKindChangeBase: (value: string) => void;
}

export function buildVideoWorkspaceProps(options: BuildVideoWorkspacePropsOptions): VideoWorkspaceProps {
  return {
    ...options,
    onRefresh: () => options.loadWorkspace(),
    onCancelTask: () => options.handleCancelComposeTask(options.latestTask, "视频笔记"),
    onDelete: (workId: string) => options.handleDeleteVideoWork(workId),
    onRegenerateStoryboard: () => {
      if (!options.selectedWork) {
        return Promise.resolve();
      }
      return options.handleRegenerateVideoStoryboard(options.selectedWork.id, options.editingStoryboardPrompt);
    },
    onGenerateVideo: () => {
      if (!options.selectedWork) {
        return Promise.resolve();
      }
      return options.handleGenerateVideoFromStoryboard(options.selectedWork.id, options.customModelName);
    },
    onProductChange: (value: string) => {
      options.setVideoProductValue(value);
      if (value !== options.noProductOption && options.referenceImageFile) {
        options.setVideoReferenceImageFile(null);
      }
    },
    onReferenceImageFileChange: (file: File | null) => {
      options.setVideoReferenceImageFile(file);
      if (file) {
        options.setVideoProductValue(options.noProductOption);
      }
    },
    onVideoKindChange: (value: string) => {
      options.onVideoKindChangeBase(value);
      if (value !== "REMIX") {
        options.setVideoMaterialValue("");
      }
    },
  };
}

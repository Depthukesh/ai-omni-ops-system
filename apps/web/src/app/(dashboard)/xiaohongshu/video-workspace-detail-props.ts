"use client";

import { type VideoWorkspaceDetailPanelProps } from "./video-workspace-detail-panel";
import { type VideoWorkspaceStageFlags } from "./video-workspace-stage-flags";
import { type VideoWorkspaceProps } from "./note-workspaces";

export function buildVideoWorkspaceDetailPanelProps(
  props: VideoWorkspaceProps,
  selectedItem: NonNullable<VideoWorkspaceProps["selectedWork"]>,
  stageFlags: VideoWorkspaceStageFlags,
): VideoWorkspaceDetailPanelProps {
  return {
    selectedItem,
    editingStoryboardPrompt: props.editingStoryboardPrompt,
    savingWorkId: props.savingWorkId,
    canRegenerateStoryboard: stageFlags.canRegenerateStoryboard,
    canGenerateVideo: stageFlags.canGenerateVideo,
    canRecoverVideo: stageFlags.canRecoverVideo,
    onEditStoryboardPromptChange: props.onEditStoryboardPromptChange,
    onRegenerateStoryboard: props.onRegenerateStoryboard,
    onGenerateVideo: props.onGenerateVideo,
    onRecoverVideo: props.onRecoverVideo,
    onPreview: props.onPreview,
    getOriginalTaskStatusClass: props.getOriginalTaskStatusClass,
    getOriginalTaskStatusText: props.getOriginalTaskStatusText,
    formatDateTime: props.formatDateTime,
  };
}

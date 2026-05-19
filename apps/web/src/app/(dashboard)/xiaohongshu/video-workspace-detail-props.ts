"use client";

import { type VideoWorkspaceDetailPanelProps } from "./video-workspace-detail-panel";
import { type VideoWorkspaceStageFlags } from "./video-workspace-stage-flags";

export interface VideoWorkspaceDetailBuilderProps {
  editingStoryboardPrompt: string;
  savingWorkId?: string;
  onEditStoryboardPromptChange: VideoWorkspaceDetailPanelProps["onEditStoryboardPromptChange"];
  onRegenerateStoryboard: VideoWorkspaceDetailPanelProps["onRegenerateStoryboard"];
  onGenerateVideo: VideoWorkspaceDetailPanelProps["onGenerateVideo"];
  onRecoverVideo: VideoWorkspaceDetailPanelProps["onRecoverVideo"];
  onPreview: VideoWorkspaceDetailPanelProps["onPreview"];
  getOriginalTaskStatusClass: VideoWorkspaceDetailPanelProps["getOriginalTaskStatusClass"];
  getOriginalTaskStatusText: VideoWorkspaceDetailPanelProps["getOriginalTaskStatusText"];
  formatDateTime: VideoWorkspaceDetailPanelProps["formatDateTime"];
}

export function buildVideoWorkspaceDetailPanelProps(
  props: VideoWorkspaceDetailBuilderProps,
  selectedItem: VideoWorkspaceDetailPanelProps["selectedItem"],
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

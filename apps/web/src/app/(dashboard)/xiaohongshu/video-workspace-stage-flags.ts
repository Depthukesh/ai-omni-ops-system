"use client";

import { type XiaohongshuVideoWorkRecord } from "../../../services/works";

export interface VideoWorkspaceStageFlags {
  canRegenerateStoryboard: boolean;
  canGenerateVideo: boolean;
  canRecoverVideo: boolean;
}

export function getVideoWorkspaceStageFlags(
  selectedItem?: XiaohongshuVideoWorkRecord,
): VideoWorkspaceStageFlags {
  const canRegenerateStoryboard = Boolean(
    selectedItem?.storyboardPrompt
      && selectedItem.workflowStage !== "QUEUED"
      && selectedItem.workflowStage !== "GENERATING_SCRIPT"
      && selectedItem.workflowStage !== "GENERATING_STORYBOARD",
  );

  const canGenerateVideo = Boolean(
    selectedItem?.storyboardPrompt
      && selectedItem.storyboardImageUrl
      && selectedItem.workflowStage !== "QUEUED"
      && selectedItem.workflowStage !== "GENERATING_SCRIPT"
      && selectedItem.workflowStage !== "GENERATING_STORYBOARD"
      && selectedItem.workflowStage !== "GENERATING_VIDEO",
  );

  const canRecoverVideo = Boolean(
    selectedItem?.providerTaskId
      && !selectedItem.videoUrl
      && (selectedItem.workflowStage === "FAILED"
        || selectedItem.workflowStage === "GENERATING_VIDEO"
        || selectedItem.workflowStage === "WAITING_VIDEO"),
  );

  return {
    canRegenerateStoryboard,
    canGenerateVideo,
    canRecoverVideo,
  };
}

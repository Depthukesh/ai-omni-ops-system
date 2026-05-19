"use client";

import { type VideoWorkspaceProps } from "./note-workspaces";
import {
  buildVideoWorkspaceDetailPanelProps,
  type VideoWorkspaceDetailBuilderProps,
} from "./video-workspace-detail-props";
import { VideoWorkspaceDetailPanel } from "./video-workspace-detail-panel";
import { getVideoWorkspaceStageFlags } from "./video-workspace-stage-flags";

export type VideoWorkspaceDetailSectionProps = Pick<VideoWorkspaceProps, "selectedWork"> & VideoWorkspaceDetailBuilderProps;

export function VideoWorkspaceDetailSection(props: VideoWorkspaceDetailSectionProps) {
  const selectedItem = props.selectedWork;

  if (!selectedItem) {
    return null;
  }

  const stageFlags = getVideoWorkspaceStageFlags(selectedItem);

  return <VideoWorkspaceDetailPanel {...buildVideoWorkspaceDetailPanelProps(props, selectedItem, stageFlags)} />;
}

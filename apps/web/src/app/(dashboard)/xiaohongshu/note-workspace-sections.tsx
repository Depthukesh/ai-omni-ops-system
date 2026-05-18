"use client";

import { OriginalWorkspace, RewriteWorkspace, VideoWorkspace, type OriginalWorkspaceProps, type RewriteWorkspaceProps, type VideoWorkspaceProps } from "./note-workspaces";

interface NoteWorkspaceSectionsProps {
  activeSection: "original" | "remix" | "video";
  originalWorkspaceProps: OriginalWorkspaceProps;
  rewriteWorkspaceProps: RewriteWorkspaceProps;
  videoWorkspaceProps: VideoWorkspaceProps;
}

export function NoteWorkspaceSections(props: NoteWorkspaceSectionsProps) {
  if (props.activeSection === "original") {
    return <OriginalWorkspace {...props.originalWorkspaceProps} />;
  }

  if (props.activeSection === "remix") {
    return <RewriteWorkspace {...props.rewriteWorkspaceProps} />;
  }

  return <VideoWorkspace {...props.videoWorkspaceProps} />;
}

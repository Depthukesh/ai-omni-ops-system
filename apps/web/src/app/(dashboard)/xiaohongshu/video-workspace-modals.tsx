"use client";

import { VideoCreateModal, type VideoCreateModalProps } from "./note-create-modals";
import { VideoEditModal, type VideoEditModalProps } from "./note-edit-modals";

export interface VideoWorkspaceModalsProps {
  editModalProps: VideoEditModalProps;
  createModalProps: VideoCreateModalProps;
}

export function VideoWorkspaceModals(props: VideoWorkspaceModalsProps) {
  return (
    <>
      <VideoEditModal {...props.editModalProps} />
      <VideoCreateModal {...props.createModalProps} />
    </>
  );
}

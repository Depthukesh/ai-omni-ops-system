"use client";

import { type ComponentType } from "react";
import {
  OriginalCreateModal,
  RewriteCreateModal,
  VideoCreateModal,
  type OriginalCreateModalProps,
  type RewriteCreateModalProps,
  type VideoCreateModalProps,
} from "./note-create-modals";
import {
  OriginalEditModal,
  RewriteEditModal,
  VideoEditModal,
  type OriginalEditModalProps,
  type RewriteEditModalProps,
  type VideoEditModalProps,
} from "./note-edit-modals";

interface WorkspaceModalMountProps<EditProps extends object, CreateProps extends object> {
  EditModal: ComponentType<EditProps>;
  CreateModal: ComponentType<CreateProps>;
  editModalProps: EditProps;
  createModalProps: CreateProps;
}

function WorkspaceModalMount<EditProps extends object, CreateProps extends object>(
  props: WorkspaceModalMountProps<EditProps, CreateProps>,
) {
  const { EditModal, CreateModal, editModalProps, createModalProps } = props;

  return (
    <>
      <EditModal {...editModalProps} />
      <CreateModal {...createModalProps} />
    </>
  );
}

export interface OriginalWorkspaceModalsProps {
  editModalProps: OriginalEditModalProps;
  createModalProps: OriginalCreateModalProps;
}

export function OriginalWorkspaceModals(props: OriginalWorkspaceModalsProps) {
  return (
    <WorkspaceModalMount
      EditModal={OriginalEditModal}
      CreateModal={OriginalCreateModal}
      editModalProps={props.editModalProps}
      createModalProps={props.createModalProps}
    />
  );
}

export interface RewriteWorkspaceModalsProps {
  editModalProps: RewriteEditModalProps;
  createModalProps: RewriteCreateModalProps;
}

export function RewriteWorkspaceModals(props: RewriteWorkspaceModalsProps) {
  return (
    <WorkspaceModalMount
      EditModal={RewriteEditModal}
      CreateModal={RewriteCreateModal}
      editModalProps={props.editModalProps}
      createModalProps={props.createModalProps}
    />
  );
}

export interface VideoWorkspaceModalsProps {
  editModalProps: VideoEditModalProps;
  createModalProps: VideoCreateModalProps;
}

export function VideoWorkspaceModals(props: VideoWorkspaceModalsProps) {
  return (
    <WorkspaceModalMount
      EditModal={VideoEditModal}
      CreateModal={VideoCreateModal}
      editModalProps={props.editModalProps}
      createModalProps={props.createModalProps}
    />
  );
}

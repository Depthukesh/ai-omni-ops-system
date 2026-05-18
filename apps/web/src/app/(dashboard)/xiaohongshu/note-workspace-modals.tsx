"use client";

import { OriginalCreateModal, RewriteCreateModal, type OriginalCreateModalProps, type RewriteCreateModalProps } from "./note-create-modals";
import { OriginalEditModal, RewriteEditModal, type OriginalEditModalProps, type RewriteEditModalProps } from "./note-edit-modals";

export interface OriginalWorkspaceModalsProps {
  editModalProps: OriginalEditModalProps;
  createModalProps: OriginalCreateModalProps;
}

export function OriginalWorkspaceModals(props: OriginalWorkspaceModalsProps) {
  return (
    <>
      <OriginalEditModal {...props.editModalProps} />
      <OriginalCreateModal {...props.createModalProps} />
    </>
  );
}

export interface RewriteWorkspaceModalsProps {
  editModalProps: RewriteEditModalProps;
  createModalProps: RewriteCreateModalProps;
}

export function RewriteWorkspaceModals(props: RewriteWorkspaceModalsProps) {
  return (
    <>
      <RewriteEditModal {...props.editModalProps} />
      <RewriteCreateModal {...props.createModalProps} />
    </>
  );
}

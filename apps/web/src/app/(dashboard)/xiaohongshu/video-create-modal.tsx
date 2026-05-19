"use client";

import {
  type AsyncAction,
  type MaterialOption,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
import { type VideoProviderOptionRecord } from "../../../services/works";
import { VIDEO_CREATE_MODAL_COPY } from "./note-create-modal-copy";
import { NoteCreateModalShell } from "./note-create-modal-shell";
import { VideoCreateBasicFields } from "./video-create-basic-fields";
import { VideoCreateConfigFields } from "./video-create-config-fields";

export interface VideoCreateModalProps {
  open: boolean;
  isPublishing: boolean;
  calendarOptions: SelectOption[];
  customTopicOption: string;
  noProductOption: string;
  customVideoProviderOption: string;
  videoProviderOptions: VideoProviderOptionRecord[];
  products: ProductOption[];
  materialNotes: MaterialOption[];
  calendarValue: string;
  customTopic: string;
  productValue: string;
  materialValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  referenceImageFile: File | null;
  videoKindValue: string;
  copyAdditionalInstruction: string;
  providerValue: string;
  customProviderValue: string;
  customModelName: string;
  durationValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onClose: () => void;
  onCreate: AsyncAction;
  onCalendarChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onMaterialChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onCustomTopicChange: StringChangeHandler;
  onReferenceImageFileChange: (file: File | null) => void;
  onVideoKindChange: StringChangeHandler;
  onCopyAdditionalInstructionChange: StringChangeHandler;
  onProviderChange: StringChangeHandler;
  onCustomProviderChange: StringChangeHandler;
  onCustomModelNameChange: StringChangeHandler;
  onDurationChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
}

export function VideoCreateModal(props: VideoCreateModalProps) {
  return (
    <NoteCreateModalShell
      open={props.open}
      copy={VIDEO_CREATE_MODAL_COPY}
      isPublishing={props.isPublishing}
      onClose={props.onClose}
      onCreate={props.onCreate}
    >
      <VideoCreateBasicFields
        calendarOptions={props.calendarOptions}
        customTopicOption={props.customTopicOption}
        noProductOption={props.noProductOption}
        products={props.products}
        calendarValue={props.calendarValue}
        customTopic={props.customTopic}
        productValue={props.productValue}
        accountRoleValue={props.accountRoleValue}
        accountRoleOptions={props.accountRoleOptions}
        onCalendarChange={props.onCalendarChange}
        onProductChange={props.onProductChange}
        onAccountRoleChange={props.onAccountRoleChange}
        onCustomTopicChange={props.onCustomTopicChange}
      />
      <VideoCreateConfigFields
        noProductOption={props.noProductOption}
        customVideoProviderOption={props.customVideoProviderOption}
        videoProviderOptions={props.videoProviderOptions}
        materialNotes={props.materialNotes}
        productValue={props.productValue}
        materialValue={props.materialValue}
        referenceImageFile={props.referenceImageFile}
        videoKindValue={props.videoKindValue}
        copyAdditionalInstruction={props.copyAdditionalInstruction}
        providerValue={props.providerValue}
        customProviderValue={props.customProviderValue}
        customModelName={props.customModelName}
        durationValue={props.durationValue}
        injectMarketingPlanValue={props.injectMarketingPlanValue}
        additionalInstruction={props.additionalInstruction}
        onMaterialChange={props.onMaterialChange}
        onReferenceImageFileChange={props.onReferenceImageFileChange}
        onVideoKindChange={props.onVideoKindChange}
        onCopyAdditionalInstructionChange={props.onCopyAdditionalInstructionChange}
        onProviderChange={props.onProviderChange}
        onCustomProviderChange={props.onCustomProviderChange}
        onCustomModelNameChange={props.onCustomModelNameChange}
        onDurationChange={props.onDurationChange}
        onInjectMarketingPlanChange={props.onInjectMarketingPlanChange}
        onAdditionalInstructionChange={props.onAdditionalInstructionChange}
      />
    </NoteCreateModalShell>
  );
}

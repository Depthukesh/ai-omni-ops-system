"use client";

import {
  type AsyncAction,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
import {
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";
import { ORIGINAL_CREATE_MODAL_COPY } from "./note-create-modal-copy";
import { NoteCreateModalShell } from "./note-create-modal-shell";
import { OriginalCreateBasicFields } from "./original-create-basic-fields";
import { OriginalCreateReferenceFields } from "./original-create-reference-fields";
import { OriginalCreateTailFields } from "./original-create-tail-fields";

export interface OriginalCreateModalProps {
  open: boolean;
  isPublishing: boolean;
  calendarOptions: SelectOption[];
  customTopicOption: string;
  noProductOption: string;
  autoImageCountOption: string;
  products: ProductOption[];
  calendarValue: string;
  customTopic: string;
  productValue: string;
  accountRoleValue: string;
  noteModeValue: string;
  accountRoleOptions: SelectOption[];
  imageCountValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  coverReferenceFile: File | null;
  galleryReferenceFiles: File[];
  referenceTemplateCategories: XhsOriginalReferenceTemplateCategoryRecord[];
  referenceTemplateItems: XhsOriginalReferenceTemplateRecord[];
  isReferenceTemplatesLoading: boolean;
  referenceTemplatesError: string;
  onClose: () => void;
  onCreate: AsyncAction;
  onCalendarChange: StringChangeHandler;
  onCustomTopicChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onNoteModeChange: StringChangeHandler;
  onImageCountChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
  onCoverReferenceFileChange: (file: File | null) => void;
  onGalleryReferenceFilesChange: (files: File[]) => void;
  onReloadReferenceTemplates: () => void | Promise<void>;
}

export function OriginalCreateModal(props: OriginalCreateModalProps) {
  return (
    <NoteCreateModalShell
      open={props.open}
      copy={ORIGINAL_CREATE_MODAL_COPY}
      isPublishing={props.isPublishing}
      onClose={props.onClose}
      onCreate={props.onCreate}
    >
      <OriginalCreateBasicFields
        calendarOptions={props.calendarOptions}
        customTopicOption={props.customTopicOption}
        noProductOption={props.noProductOption}
        products={props.products}
        calendarValue={props.calendarValue}
        customTopic={props.customTopic}
        productValue={props.productValue}
        accountRoleValue={props.accountRoleValue}
        noteModeValue={props.noteModeValue}
        accountRoleOptions={props.accountRoleOptions}
        onCalendarChange={props.onCalendarChange}
        onCustomTopicChange={props.onCustomTopicChange}
        onProductChange={props.onProductChange}
        onAccountRoleChange={props.onAccountRoleChange}
        onNoteModeChange={props.onNoteModeChange}
      />
      <OriginalCreateReferenceFields
        coverReferenceFile={props.coverReferenceFile}
        galleryReferenceFiles={props.galleryReferenceFiles}
        referenceTemplateCategories={props.referenceTemplateCategories}
        referenceTemplateItems={props.referenceTemplateItems}
        isReferenceTemplatesLoading={props.isReferenceTemplatesLoading}
        referenceTemplatesError={props.referenceTemplatesError}
        onCoverReferenceFileChange={props.onCoverReferenceFileChange}
        onGalleryReferenceFilesChange={props.onGalleryReferenceFilesChange}
        onReloadReferenceTemplates={props.onReloadReferenceTemplates}
      />
      <OriginalCreateTailFields
        autoImageCountOption={props.autoImageCountOption}
        imageCountValue={props.imageCountValue}
        injectMarketingPlanValue={props.injectMarketingPlanValue}
        additionalInstruction={props.additionalInstruction}
        onImageCountChange={props.onImageCountChange}
        onInjectMarketingPlanChange={props.onInjectMarketingPlanChange}
        onAdditionalInstructionChange={props.onAdditionalInstructionChange}
      />
    </NoteCreateModalShell>
  );
}

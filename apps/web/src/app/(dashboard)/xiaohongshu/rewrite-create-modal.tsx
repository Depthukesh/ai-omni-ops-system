"use client";

import {
  type AsyncAction,
  type MaterialOption,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
import { REWRITE_CREATE_MODAL_COPY } from "./note-create-modal-copy";
import { NoteCreateModalShell } from "./note-create-modal-shell";
import { RewriteCreateBasicFields } from "./rewrite-create-basic-fields";
import { RewriteCreateTailFields } from "./rewrite-create-tail-fields";

export interface RewriteCreateModalProps {
  open: boolean;
  isPublishing: boolean;
  noProductOption: string;
  materials: MaterialOption[];
  products: ProductOption[];
  materialValue: string;
  productValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onClose: () => void;
  onCreate: AsyncAction;
  onMaterialChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
}

export function RewriteCreateModal(props: RewriteCreateModalProps) {
  return (
    <NoteCreateModalShell
      open={props.open}
      copy={REWRITE_CREATE_MODAL_COPY}
      isPublishing={props.isPublishing}
      createDisabled={!props.materials.length}
      onClose={props.onClose}
      onCreate={props.onCreate}
    >
      <RewriteCreateBasicFields
        noProductOption={props.noProductOption}
        materials={props.materials}
        products={props.products}
        materialValue={props.materialValue}
        productValue={props.productValue}
        accountRoleValue={props.accountRoleValue}
        accountRoleOptions={props.accountRoleOptions}
        onMaterialChange={props.onMaterialChange}
        onProductChange={props.onProductChange}
        onAccountRoleChange={props.onAccountRoleChange}
      />
      <RewriteCreateTailFields
        injectMarketingPlanValue={props.injectMarketingPlanValue}
        additionalInstruction={props.additionalInstruction}
        onInjectMarketingPlanChange={props.onInjectMarketingPlanChange}
        onAdditionalInstructionChange={props.onAdditionalInstructionChange}
      />
    </NoteCreateModalShell>
  );
}

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
  onImageCountChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
  onCoverReferenceFileChange: (file: File | null) => void;
  onGalleryReferenceFilesChange: (files: File[]) => void;
  onReloadReferenceTemplates: () => void | Promise<void>;
}

export function OriginalCreateModal(props: OriginalCreateModalProps) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="media-preview-overlay" onClick={props.onClose}>
      <div className="media-preview-dialog calendar-detail-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-preview-close" onClick={props.onClose}>
          关闭
        </button>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>添加原创笔记</strong>
              <p className="personal-meta">选择营销日历选题、产品与参考图后，直接触发完整原创图文生成链路。</p>
            </div>
          </div>
          <div className="personal-grid">
            <OriginalCreateBasicFields
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
              onCustomTopicChange={props.onCustomTopicChange}
              onProductChange={props.onProductChange}
              onAccountRoleChange={props.onAccountRoleChange}
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
          </div>
          <div className="strategy-inline-actions">
            <button type="button" className="primary-button" onClick={() => void props.onCreate()} disabled={props.isPublishing}>
              {props.isPublishing ? "创作中..." : "一键创作"}
            </button>
            <button type="button" className="secondary-button" onClick={props.onClose} disabled={props.isPublishing}>
              取消
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

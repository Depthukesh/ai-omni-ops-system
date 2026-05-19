"use client";

import {
  type AsyncAction,
  type MaterialOption,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
import {
  type VideoProviderOptionRecord,
  type XhsOriginalReferenceTemplateCategoryRecord,
  type XhsOriginalReferenceTemplateRecord,
} from "../../../services/works";
import { OriginalCreateBasicFields } from "./original-create-basic-fields";
import { OriginalCreateReferenceFields } from "./original-create-reference-fields";
import { OriginalCreateTailFields } from "./original-create-tail-fields";
import { RewriteCreateBasicFields } from "./rewrite-create-basic-fields";
import { RewriteCreateTailFields } from "./rewrite-create-tail-fields";
import { VideoCreateBasicFields } from "./video-create-basic-fields";
import { VideoCreateConfigFields } from "./video-create-config-fields";

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
              <strong>添加二创笔记</strong>
              <p className="personal-meta">从素材库选择参考作品，结合产品与用户要求，直接触发完整二创图文生成链路。</p>
            </div>
          </div>
          <div className="personal-grid">
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
          </div>
          <div className="strategy-inline-actions">
            <button type="button" className="primary-button" onClick={() => void props.onCreate()} disabled={props.isPublishing || !props.materials.length}>
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
              <strong>添加视频笔记</strong>
              <p className="personal-meta">提交后先生成创意剧本和故事板，故事板确认后再继续生成短视频。</p>
            </div>
          </div>
          <div className="personal-grid">
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

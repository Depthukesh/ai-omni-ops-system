"use client";

import {
  type AsyncAction,
  type MaterialOption,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
import { type VideoProviderOptionRecord } from "../../../services/works";
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

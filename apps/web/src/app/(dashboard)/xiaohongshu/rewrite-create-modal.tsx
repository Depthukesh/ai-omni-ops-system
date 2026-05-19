"use client";

import {
  type AsyncAction,
  type MaterialOption,
  type ProductOption,
  type SelectOption,
  type StringChangeHandler,
} from "./shared-types";
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

"use client";

import { NoteCreateModalShell } from "../xiaohongshu/note-create-modal-shell";
import { type NoteCreateModalCopy } from "../xiaohongshu/note-create-modal-copy";
import { type SelectOption } from "../xiaohongshu/shared-types";

const DOUYIN_REMIX_COPY_MODAL_COPY: NoteCreateModalCopy = {
  title: "创建二创文案",
  metaText: "选择素材、品牌资料、产品和营销策划植入方式后，生成抖音二创文案。",
};

export interface DouyinRemixCopyCreateModalProps {
  open: boolean;
  isPublishing: boolean;
  materialOptions: SelectOption[];
  injectBrandProfileOptions: SelectOption[];
  productOptions: SelectOption[];
  marketingPlanOptions: SelectOption[];
  materialValue: string;
  injectBrandProfileValue: string;
  productValue: string;
  injectMarketingPlanValue: string;
  userRequirementValue: string;
  hasMarketingPlan: boolean;
  marketingPlanTitle?: string;
  onClose: () => void;
  onCreate: () => void | Promise<void>;
  onMaterialChange: (value: string) => void;
  onInjectBrandProfileChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onInjectMarketingPlanChange: (value: string) => void;
  onUserRequirementChange: (value: string) => void;
}

export function DouyinRemixCopyCreateModal(props: DouyinRemixCopyCreateModalProps) {
  const createDisabled = !props.materialValue || (props.injectMarketingPlanValue === "yes" && !props.hasMarketingPlan);

  return (
    <NoteCreateModalShell
      open={props.open}
      copy={DOUYIN_REMIX_COPY_MODAL_COPY}
      isPublishing={props.isPublishing}
      createDisabled={createDisabled}
      onClose={props.onClose}
      onCreate={props.onCreate}
    >
      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">素材选择</span>
        <select value={props.materialValue} onChange={(event) => props.onMaterialChange(event.target.value)} disabled={props.isPublishing}>
          {props.materialOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">植入品牌资料</span>
        <select
          value={props.injectBrandProfileValue}
          onChange={(event) => props.onInjectBrandProfileChange(event.target.value)}
          disabled={props.isPublishing}
        >
          {props.injectBrandProfileOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">产品</span>
        <select value={props.productValue} onChange={(event) => props.onProductChange(event.target.value)} disabled={props.isPublishing}>
          {props.productOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">植入营销策划</span>
        <select
          value={props.injectMarketingPlanValue}
          onChange={(event) => props.onInjectMarketingPlanChange(event.target.value)}
          disabled={props.isPublishing}
        >
          {props.marketingPlanOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="panel-subtext" style={{ margin: 0 }}>
          {props.hasMarketingPlan
            ? `当前可用方案：${props.marketingPlanTitle || "最新抖音营销策划方案"}`
            : "当前品牌还没有抖音营销策划方案，选择“是”时将无法提交。"}
        </span>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">用户要求</span>
        <textarea
          value={props.userRequirementValue}
          onChange={(event) => props.onUserRequirementChange(event.target.value)}
          disabled={props.isPublishing}
          rows={4}
          placeholder="可补充指定语气、结构、卖点或禁用词要求"
        />
      </label>
    </NoteCreateModalShell>
  );
}

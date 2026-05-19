"use client";

import type { StringChangeHandler } from "./shared-types";

export interface OriginalCreateTailFieldsProps {
  autoImageCountOption: string;
  imageCountValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onImageCountChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
}

export function OriginalCreateTailFields(props: OriginalCreateTailFieldsProps) {
  return (
    <>
      <label>
        <span>配图数量</span>
        <select value={props.imageCountValue} onChange={(event) => props.onImageCountChange(event.target.value)}>
          <option value={props.autoImageCountOption}>自由发挥</option>
          {Array.from({ length: 9 }, (_, index) => index + 2).map((count) => (
            <option key={count} value={String(count)}>
              {count}张
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>植入营销策划方案</span>
        <select value={props.injectMarketingPlanValue} onChange={(event) => props.onInjectMarketingPlanChange(event.target.value)}>
          <option value="yes">是</option>
          <option value="no">否</option>
        </select>
      </label>
      <label className="field-full">
        <span>用户要求</span>
        <textarea
          className="report-markdown-textarea"
          value={props.additionalInstruction}
          onChange={(event) => props.onAdditionalInstructionChange(event.target.value)}
          placeholder="例如：更偏生活方式感、门店场景感更强、语气更克制。"
        />
      </label>
    </>
  );
}

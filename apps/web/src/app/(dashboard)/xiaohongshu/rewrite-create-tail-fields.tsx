"use client";

import type { StringChangeHandler } from "./shared-types";

export interface RewriteCreateTailFieldsProps {
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
}

export function RewriteCreateTailFields(props: RewriteCreateTailFieldsProps) {
  return (
    <>
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
          placeholder="例如：保留原作品的爆点结构，但语气更像品牌官方账号，图片更高级一点。"
        />
      </label>
    </>
  );
}

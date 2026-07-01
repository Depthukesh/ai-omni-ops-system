"use client";

import type { StringChangeHandler } from "./shared-types";

export interface OriginalCreateTailFieldsProps {
  autoImageCountOption: string;
  imageCountValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  noteTitle: string;
  noteContent: string;
  onImageCountChange: StringChangeHandler;
  onInjectMarketingPlanChange: StringChangeHandler;
  onAdditionalInstructionChange: StringChangeHandler;
  onNoteTitleChange: StringChangeHandler;
  onNoteContentChange: StringChangeHandler;
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
          style={{ minHeight: "200px", height: "200px" }}
          value={props.additionalInstruction}
          onChange={(event) => props.onAdditionalInstructionChange(event.target.value)}
          placeholder="例如：更偏生活方式感、门店场景感更强、语气更克制。"
        />
      </label>
      <label className="field-full">
        <span>笔记标题</span>
        <input
          type="text"
          value={props.noteTitle}
          onChange={(event) => props.onNoteTitleChange(event.target.value)}
          placeholder="可选。填写后会优先作为最终笔记标题使用。"
        />
      </label>
      <label className="field-full">
        <span>笔记内容</span>
        <textarea
          className="report-markdown-textarea"
          value={props.noteContent}
          onChange={(event) => props.onNoteContentChange(event.target.value)}
          placeholder="如果这里直接填写了原创笔记正文，将跳过原创笔记文案技能，直接进入原创配图提示词和图片生成链路。"
        />
      </label>
    </>
  );
}

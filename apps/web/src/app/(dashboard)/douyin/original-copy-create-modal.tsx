"use client";

import { NoteCreateModalShell } from "../xiaohongshu/note-create-modal-shell";
import { type NoteCreateModalCopy } from "../xiaohongshu/note-create-modal-copy";
import { type SelectOption } from "../xiaohongshu/shared-types";

const DOUYIN_ORIGINAL_COPY_MODAL_COPY: NoteCreateModalCopy = {
  title: "添加原创笔记",
  metaText: "选择品牌营销日历、选题（可不选）、策划方案植入方式和文案类型后，生成抖音原创文案。",
};

export interface DouyinOriginalCopyCreateModalProps {
  open: boolean;
  isPublishing: boolean;
  calendarOptions: SelectOption[];
  topicOptions: SelectOption[];
  marketingPlanOptions: SelectOption[];
  copyTypeOptions: SelectOption[];
  calendarValue: string;
  topicValue: string;
  injectMarketingPlanValue: string;
  copyTypeValue: string;
  userRequirementValue: string;
  hasMarketingPlan: boolean;
  marketingPlanTitle?: string;
  onClose: () => void;
  onCreate: () => void | Promise<void>;
  onCalendarChange: (value: string) => void;
  onTopicChange: (value: string) => void;
  onInjectMarketingPlanChange: (value: string) => void;
  onCopyTypeChange: (value: string) => void;
  onUserRequirementChange: (value: string) => void;
}

export function DouyinOriginalCopyCreateModal(props: DouyinOriginalCopyCreateModalProps) {
  const createDisabled = !props.copyTypeValue || (props.injectMarketingPlanValue === "yes" && !props.hasMarketingPlan);

  return (
    <NoteCreateModalShell
      open={props.open}
      copy={DOUYIN_ORIGINAL_COPY_MODAL_COPY}
      isPublishing={props.isPublishing}
      createDisabled={createDisabled}
      onClose={props.onClose}
      onCreate={props.onCreate}
    >
      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">营销日历</span>
        <select value={props.calendarValue} onChange={(event) => props.onCalendarChange(event.target.value)} disabled={props.isPublishing}>
          {props.calendarOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">选题</span>
        <select value={props.topicValue} onChange={(event) => props.onTopicChange(event.target.value)} disabled={props.isPublishing}>
          {props.topicOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">营销策划方案</span>
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
            : "当前品牌还没有抖音营销策划方案，选择“植入”时将无法提交。"}
        </span>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">文案类型</span>
        <select value={props.copyTypeValue} onChange={(event) => props.onCopyTypeChange(event.target.value)} disabled={props.isPublishing}>
          {props.copyTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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

"use client";

import { NoteCreateModalShell } from "../xiaohongshu/note-create-modal-shell";
import { type NoteCreateModalCopy } from "../xiaohongshu/note-create-modal-copy";

type OpportunityInsightStep = 1 | 2 | 3;

const STEP_MODAL_COPY: Record<OpportunityInsightStep, NoteCreateModalCopy> = {
  1: {
    title: "第 1 步补充要求",
    metaText: "补充品牌背景、重点平台、指定账号或必须回答的问题，提交后开始品牌账号分析与竞品账号分析。",
  },
  2: {
    title: "第 2 步补充要求",
    metaText: "补充希望重点分析的评论主题、痛点、情绪、关键词或样本范围，提交后开始评论洞察分析。",
  },
  3: {
    title: "第 3 步补充要求",
    metaText: "补充总报告希望强调的机会判断、市场切入口、产品组合拳或最终输出偏好，提交后开始机会洞察总报告。",
  },
};

export interface OpportunityInsightStepInputModalProps {
  open: boolean;
  step: OpportunityInsightStep;
  isSubmitting: boolean;
  isRetry: boolean;
  value: string;
  onClose: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
}

export function OpportunityInsightStepInputModal(props: OpportunityInsightStepInputModalProps) {
  const actionLabel = props.isRetry ? `重试第 ${props.step} 步` : `开始第 ${props.step} 步`;

  return (
    <NoteCreateModalShell
      open={props.open}
      copy={STEP_MODAL_COPY[props.step]}
      isPublishing={props.isSubmitting}
      createLabel={actionLabel}
      onClose={props.onClose}
      onCreate={props.onSubmit}
    >
      <label style={{ display: "grid", gap: 6 }}>
        <span className="status-text">用户要求</span>
        <textarea
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          disabled={props.isSubmitting}
          rows={6}
          placeholder="可留空；如有特别要求、补充背景、指定关注点或额外资料说明，请在这里输入。"
        />
        <span className="panel-subtext" style={{ margin: 0 }}>
          点击“{actionLabel}”后会将这段补充要求一并带入当前步骤的生成任务。
        </span>
      </label>
    </NoteCreateModalShell>
  );
}

"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { DEMO_BRAND_ID } from "../../../services/brand-growth";
import { type XhsCollectedNoteRecord } from "../../../services/collectors";
import {
  generateXiaohongshuVideoWork,
  generateXiaohongshuOriginalWork,
  generateXiaohongshuRewriteWork,
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
} from "../../../services/works";
import { type CalendarOption, type ProductOption } from "./shared-types";

type OriginalComposerState = {
  calendarValue: string;
  customTopic: string;
  productValue: string;
  imageCountValue: string;
  additionalInstruction: string;
  coverReferenceFile: File | null;
  galleryReferenceFiles: File[];
  closeModal: () => void;
  resetComposer: (calendarItems: CalendarOption[], products: ProductOption[]) => void;
  cancelEdit: () => void;
  setWorks: Dispatch<SetStateAction<XiaohongshuOriginalWorkRecord[]>>;
  setSelectedWorkId: (workId: string) => void;
};

type RewriteComposerState = {
  materialValue: string;
  productValue: string;
  additionalInstruction: string;
  closeModal: () => void;
  resetComposer: (materials: XhsCollectedNoteRecord[], products: ProductOption[]) => void;
  cancelEdit: () => void;
  setWorks: Dispatch<SetStateAction<XiaohongshuRewriteWorkRecord[]>>;
  setSelectedWorkId: (workId: string) => void;
};

type VideoComposerState = {
  calendarValue: string;
  customTopic: string;
  productValue: string;
  referenceImageFile: File | null;
  copyAdditionalInstruction: string;
  providerValue: string;
  customProviderValue: string;
  customModelName: string;
  durationValue: string;
  customDurationValue: string;
  injectMarketingPlanValue: string;
  outputPromptValue: string;
  additionalInstruction: string;
  closeModal: () => void;
  resetComposer: (calendarItems: CalendarOption[], products: ProductOption[]) => void;
  cancelEdit: () => void;
  setWorks: Dispatch<SetStateAction<XiaohongshuVideoWorkRecord[]>>;
  setSelectedWorkId: (workId: string) => void;
};

export function useWorkComposerActions(options: {
  brandId?: string;
  calendarItems: CalendarOption[];
  products: ProductOption[];
  materialNotes: XhsCollectedNoteRecord[];
  noProductOption: string;
  customTopicOption: string;
  customVideoProviderOption: string;
  customVideoDurationOption: string;
  autoImageCountOption: string;
  setNotice: (value: string) => void;
  setErrorMessage: (value: string) => void;
  onRefreshWorkspace: () => Promise<void>;
  original: OriginalComposerState;
  rewrite: RewriteComposerState;
  video: VideoComposerState;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRewriteSubmitting, setIsRewriteSubmitting] = useState(false);
  const [rewriteSubmittingLabel, setRewriteSubmittingLabel] = useState("");
  const [isVideoSubmitting, setIsVideoSubmitting] = useState(false);
  const [videoSubmittingLabel, setVideoSubmittingLabel] = useState("");

  async function createOriginalWork() {
    const isCustomTopic = options.original.calendarValue === options.customTopicOption;
    const customTopicName = options.original.customTopic.trim();

    if (isCustomTopic && !customTopicName) {
      options.setErrorMessage("请选择营销日历选题，或填写你自己的选题。");
      return;
    }

    if (!isCustomTopic && !options.original.calendarValue) {
      options.setErrorMessage("请先选择一个营销日历选题。");
      return;
    }

    setIsPublishing(true);
    options.setNotice("");
    options.setErrorMessage("");

    try {
      const result = await generateXiaohongshuOriginalWork(options.brandId || DEMO_BRAND_ID, {
        calendarItemId: isCustomTopic ? undefined : options.original.calendarValue,
        customTopicName: isCustomTopic ? customTopicName : undefined,
        productId: options.original.productValue === options.noProductOption ? undefined : options.original.productValue,
        imageCount:
          options.original.imageCountValue === options.autoImageCountOption
            ? undefined
            : Number(options.original.imageCountValue),
        additionalInstruction: options.original.additionalInstruction.trim() || undefined,
        coverReferenceFile: options.original.coverReferenceFile,
        galleryReferenceFiles: options.original.galleryReferenceFiles,
      });

      options.original.setWorks((current) => [result.item, ...current.filter((item) => item.id !== result.item.id)]);
      options.original.setSelectedWorkId(result.item.id);
      options.original.closeModal();
      options.original.cancelEdit();
      await options.onRefreshWorkspace();
      options.setNotice("原创笔记已创作完成，任务状态和“我的作品”已同步刷新。");
      options.original.resetComposer(options.calendarItems, options.products);
    } catch (error) {
      const message = error instanceof Error ? error.message : "原创笔记创作失败";
      options.setErrorMessage(`创作失败：${message}`);
    } finally {
      setIsPublishing(false);
    }
  }

  async function createRewriteWork() {
    if (!options.rewrite.materialValue) {
      options.setErrorMessage("请先从素材库里选择一个二创作品。");
      return;
    }

    setIsPublishing(true);
    setIsRewriteSubmitting(true);
    setRewriteSubmittingLabel(
      options.materialNotes.find((item) => item.id === options.rewrite.materialValue)?.title || "二创笔记任务已提交",
    );
    options.setNotice("");
    options.setErrorMessage("");
    options.rewrite.closeModal();

    try {
      const result = await generateXiaohongshuRewriteWork(options.brandId || DEMO_BRAND_ID, {
        sourceMaterialId: options.rewrite.materialValue,
        productId: options.rewrite.productValue === options.noProductOption ? undefined : options.rewrite.productValue,
        additionalInstruction: options.rewrite.additionalInstruction.trim() || undefined,
      });

      options.rewrite.setWorks((current) => [result.item, ...current.filter((item) => item.id !== result.item.id)]);
      options.rewrite.setSelectedWorkId(result.item.id);
      options.rewrite.cancelEdit();
      await options.onRefreshWorkspace();
      options.setNotice("二创笔记已创作完成，任务状态和“我的作品”已同步刷新。");
      options.rewrite.resetComposer(options.materialNotes, options.products);
    } catch (error) {
      const message = error instanceof Error ? error.message : "二创笔记创作失败";
      options.setErrorMessage(`创作失败：${message}`);
    } finally {
      setIsRewriteSubmitting(false);
      setRewriteSubmittingLabel("");
      setIsPublishing(false);
    }
  }

  async function createVideoWork() {
    const isCustomTopic = options.video.calendarValue === options.customTopicOption;
    const customTopicName = options.video.customTopic.trim();

    if (isCustomTopic && !customTopicName) {
      options.setErrorMessage("请选择营销日历选题，或填写你自己的选题。");
      return;
    }

    if (!isCustomTopic && !options.video.calendarValue) {
      options.setErrorMessage("请先选择一个营销日历选题。");
      return;
    }

    if (options.video.referenceImageFile && options.video.productValue !== options.noProductOption) {
      options.setErrorMessage("参考图和产品不能同时选择，请二选一。");
      return;
    }

    const resolvedProvider = options.video.providerValue === options.customVideoProviderOption
      ? options.video.customProviderValue
      : options.video.providerValue;
    const resolvedDuration = options.video.durationValue === options.customVideoDurationOption
      ? Number(options.video.customDurationValue)
      : Number(options.video.durationValue);

    if (!resolvedProvider) {
      options.setErrorMessage("请先选择一个视频大模型。");
      return;
    }

    if (!Number.isFinite(resolvedDuration) || resolvedDuration <= 0) {
      options.setErrorMessage("请输入有效的视频时长。");
      return;
    }

    setIsPublishing(true);
    setIsVideoSubmitting(true);
    setVideoSubmittingLabel(
      customTopicName || options.calendarItems.find((item) => item.id === options.video.calendarValue)?.topicName || "视频笔记任务已提交",
    );
    options.setNotice("");
    options.setErrorMessage("");
    options.video.closeModal();

    try {
      const result = await generateXiaohongshuVideoWork(options.brandId || DEMO_BRAND_ID, {
        calendarItemId: isCustomTopic ? undefined : options.video.calendarValue,
        customTopicName: isCustomTopic ? customTopicName : undefined,
        productId: options.video.productValue === options.noProductOption ? undefined : options.video.productValue,
        referenceImageFile: options.video.referenceImageFile,
        copyAdditionalInstruction: options.video.copyAdditionalInstruction.trim() || undefined,
        videoProvider: resolvedProvider,
        customVideoModelName: options.video.customModelName.trim() || undefined,
        durationSec: resolvedDuration,
        includeMarketingPlan: options.video.injectMarketingPlanValue === "yes",
        outputVideoPrompt: options.video.outputPromptValue === "yes",
        videoAdditionalInstruction: options.video.additionalInstruction.trim() || undefined,
      });

      options.video.setWorks((current) => [result.item, ...current.filter((item) => item.id !== result.item.id)]);
      options.video.setSelectedWorkId(result.item.id);
      options.video.cancelEdit();
      await options.onRefreshWorkspace();
      options.setNotice("视频笔记已创作完成，任务状态和“我的作品”已同步刷新。");
      options.video.resetComposer(options.calendarItems, options.products);
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频笔记创作失败";
      options.setErrorMessage(`创作失败：${message}`);
    } finally {
      setIsVideoSubmitting(false);
      setVideoSubmittingLabel("");
      setIsPublishing(false);
    }
  }

  return {
    isPublishing,
    isRewriteSubmitting,
    rewriteSubmittingLabel,
    isVideoSubmitting,
    videoSubmittingLabel,
    createOriginalWork,
    createRewriteWork,
    createVideoWork,
  };
}

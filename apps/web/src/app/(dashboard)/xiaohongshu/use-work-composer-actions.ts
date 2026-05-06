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

type CalendarOption = {
  id?: string;
  topicName?: string;
};

type ProductOption = {
  id?: string;
};

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
  customModelName: string;
  durationValue: string;
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
  autoImageCountOption: string;
  setNotice: (value: string) => void;
  setErrorMessage: (value: string) => void;
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
      options.setNotice("原创笔记已创作完成，并已同步保存到“我的作品”。");
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
      options.setNotice("二创笔记已创作完成，并已同步保存到“我的作品”。");
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
        videoProvider: options.video.providerValue,
        customVideoModelName: options.video.customModelName.trim() || undefined,
        durationSec: Number(options.video.durationValue),
        outputVideoPrompt: options.video.outputPromptValue === "yes",
        videoAdditionalInstruction: options.video.additionalInstruction.trim() || undefined,
      });

      options.video.setWorks((current) => [result.item, ...current.filter((item) => item.id !== result.item.id)]);
      options.video.setSelectedWorkId(result.item.id);
      options.video.cancelEdit();
      options.setNotice("视频笔记已创作完成，并已同步保存到“我的作品”。");
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

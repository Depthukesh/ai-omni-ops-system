"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import {
  generateXiaohongshuVideoWork,
  generateXiaohongshuOriginalWork,
  generateXiaohongshuRewriteWork,
  type StoryboardImageModelOptionRecord,
  type VideoProviderOptionRecord,
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
} from "../../../services/works";
import { type CalendarOption, type MaterialOption, type ProductOption } from "./shared-types";

type OriginalComposerState = {
  calendarValue: string;
  customTopic: string;
  productValue: string;
  accountRoleValue: string;
  noteModeValue: string;
  imageCountValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  noteContent: string;
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
  accountRoleValue: string;
  injectMarketingPlanValue: string;
  additionalInstruction: string;
  closeModal: () => void;
  resetComposer: (materials: MaterialOption[], products: ProductOption[]) => void;
  cancelEdit: () => void;
  setWorks: Dispatch<SetStateAction<XiaohongshuRewriteWorkRecord[]>>;
  setSelectedWorkId: (workId: string) => void;
};

type VideoComposerState = {
  calendarValue: string;
  customTopic: string;
  productValue: string;
  materialValue: string;
  accountRoleValue: string;
  referenceImageFile: File | null;
  videoKindValue: string;
  copyAdditionalInstruction: string;
  providerValue: string;
  customProviderValue: string;
  customModelName: string;
  storyboardImageModelValue: string;
  durationValue: string;
  injectMarketingPlanValue: string;
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
  materialNotes: MaterialOption[];
  videoProviderOptions: VideoProviderOptionRecord[];
  storyboardImageModelOptions: StoryboardImageModelOptionRecord[];
  noProductOption: string;
  customTopicOption: string;
  customVideoProviderOption: string;
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
  const videoCreateInFlightRef = useRef(false);
  const resolvedBrandId = getStoredCurrentBrandId(options.brandId);

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
      const result = await generateXiaohongshuOriginalWork(resolvedBrandId || "", {
        calendarItemId: isCustomTopic ? undefined : options.original.calendarValue,
        customTopicName: isCustomTopic ? customTopicName : undefined,
        productId: options.original.productValue === options.noProductOption ? undefined : options.original.productValue,
        accountRole: options.original.accountRoleValue as "BRAND" | "STAFF" | "TALENT",
        noteMode: options.original.noteModeValue as "GENERAL" | "SCIENCE" | "REVIEW" | "AVOID_PITFALL",
        imageCount:
          options.original.imageCountValue === options.autoImageCountOption
            ? undefined
            : Number(options.original.imageCountValue),
        includeMarketingPlan: options.original.injectMarketingPlanValue === "yes",
        additionalInstruction: options.original.additionalInstruction.trim() || undefined,
        noteContent: options.original.noteContent.trim() || undefined,
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
      const result = await generateXiaohongshuRewriteWork(resolvedBrandId || "", {
        sourceMaterialId: options.rewrite.materialValue,
        productId: options.rewrite.productValue === options.noProductOption ? undefined : options.rewrite.productValue,
        accountRole: options.rewrite.accountRoleValue as "BRAND" | "STAFF" | "TALENT",
        includeMarketingPlan: options.rewrite.injectMarketingPlanValue === "yes",
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
    if (videoCreateInFlightRef.current || isPublishing || isVideoSubmitting) {
      return;
    }
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
    const resolvedDuration = Number(options.video.durationValue);
    const resolvedStoryboardImageModel = options.video.storyboardImageModelValue.trim();
    const selectedMaterial = options.materialNotes.find((item) => item.id === options.video.materialValue);
    const selectedProduct = options.products.find((item) => item.id === options.video.productValue);
    const selectedProviderOption = options.videoProviderOptions.find((item) => item.backendKey === resolvedProvider);
    const hasReferenceImageSource = Boolean(options.video.referenceImageFile || selectedProduct?.imageUrl);
    const shouldShowFallbackNotice = Boolean(
      selectedProviderOption
      && ((hasReferenceImageSource && !selectedProviderOption.supportsImageToVideo)
        || (!hasReferenceImageSource && !selectedProviderOption.supportsTextToVideo)),
    );
    const fallbackProviderNotice = shouldShowFallbackNotice
      ? "当前输入条件与所选视频模型不匹配时，系统会自动切换到兼容的视频模型继续生成。"
      : "";

    if (!resolvedProvider) {
      options.setErrorMessage("请先选择一个视频大模型。");
      return;
    }

    if (![10, 15].includes(resolvedDuration)) {
      options.setErrorMessage("视频时长只支持 10 秒或 15 秒。");
      return;
    }

    if (
      options.storyboardImageModelOptions.length
      && !options.storyboardImageModelOptions.some((item) => item.selectionKey === resolvedStoryboardImageModel)
    ) {
      options.setErrorMessage("请先选择一个有效的故事板生图大模型。");
      return;
    }

    videoCreateInFlightRef.current = true;
    setIsPublishing(true);
    setIsVideoSubmitting(true);
    setVideoSubmittingLabel(
      customTopicName || options.calendarItems.find((item) => item.id === options.video.calendarValue)?.topicName || "视频笔记任务已提交",
    );
    options.setNotice("");
    options.setErrorMessage("");
    options.video.closeModal();

    try {
      const result = await generateXiaohongshuVideoWork(resolvedBrandId || "", {
        calendarItemId: isCustomTopic ? undefined : options.video.calendarValue,
        customTopicName: isCustomTopic ? customTopicName : undefined,
        productId: options.video.productValue === options.noProductOption ? undefined : options.video.productValue,
        materialId: options.video.materialValue || undefined,
        accountRole: options.video.accountRoleValue as "BRAND" | "STAFF" | "TALENT",
        referenceImageFile: options.video.referenceImageFile,
        videoKind: options.video.videoKindValue as "BRAND_PROMO" | "SPOKEN_SELLING" | "SKIT_SELLING",
        copyAdditionalInstruction: options.video.copyAdditionalInstruction.trim() || undefined,
        videoProvider: resolvedProvider,
        customVideoModelName: options.video.customModelName.trim() || undefined,
        storyboardImageModel: resolvedStoryboardImageModel || undefined,
        durationSec: resolvedDuration,
        includeMarketingPlan: options.video.injectMarketingPlanValue === "yes",
        videoAdditionalInstruction: options.video.additionalInstruction.trim() || undefined,
      });

      options.video.setWorks((current) => [result.item, ...current.filter((item) => item.id !== result.item.id)]);
      options.video.setSelectedWorkId(result.item.id);
      options.video.cancelEdit();
      await options.onRefreshWorkspace();
      options.setNotice(
        `${fallbackProviderNotice}${fallbackProviderNotice ? " " : ""}视频笔记任务已提交，系统会先生成故事板，完成后你可以继续修改并生成短视频。`,
      );
      options.video.resetComposer(options.calendarItems, options.products);
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频笔记创作失败";
      options.setErrorMessage(`创作失败：${message}`);
    } finally {
      videoCreateInFlightRef.current = false;
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

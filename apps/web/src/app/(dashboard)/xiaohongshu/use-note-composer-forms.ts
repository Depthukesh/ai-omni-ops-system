"use client";

import { useEffect, useState } from "react";
import { type CalendarOption, type MaterialOption, type ProductOption } from "./shared-types";

export function useNoteComposerForms(options: {
  defaultProductId?: string;
  noProductOption: string;
  autoImageCountOption: string;
  customTopicOption: string;
  defaultOriginalAccountRoleValue?: string;
  availableOriginalAccountRoleValues?: string[];
  defaultVideoProviderValue?: string;
  availableVideoProviderValues?: string[];
}) {
  const customVideoProviderOption = "__custom_video_provider__";
  const customVideoDurationOption = "__custom_video_duration__";
  const defaultVideoProviderValue = options.defaultVideoProviderValue || "seedance";
  const [isOriginalModalOpen, setIsOriginalModalOpen] = useState(false);
  const [originalCalendarValue, setOriginalCalendarValue] = useState("");
  const [originalCustomTopic, setOriginalCustomTopic] = useState("");
  const [originalProductValue, setOriginalProductValue] = useState(options.defaultProductId || options.noProductOption);
  const [originalAccountRoleValue, setOriginalAccountRoleValue] = useState(options.defaultOriginalAccountRoleValue || "BRAND");
  const [originalImageCountValue, setOriginalImageCountValue] = useState(options.autoImageCountOption);
  const [originalInjectMarketingPlanValue, setOriginalInjectMarketingPlanValue] = useState("yes");
  const [originalAdditionalInstruction, setOriginalAdditionalInstruction] = useState("");
  const [coverReferenceFile, setCoverReferenceFile] = useState<File | null>(null);
  const [galleryReferenceFiles, setGalleryReferenceFiles] = useState<File[]>([]);

  function resolveDefaultOriginalAccountRoleValue() {
    const availableValues = options.availableOriginalAccountRoleValues?.filter(Boolean) || [];
    const preferredValue = options.defaultOriginalAccountRoleValue || "BRAND";
    if (!availableValues.length) {
      return preferredValue;
    }
    return availableValues.includes(preferredValue) ? preferredValue : availableValues[0];
  }

  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [rewriteMaterialValue, setRewriteMaterialValue] = useState("");
  const [rewriteProductValue, setRewriteProductValue] = useState(options.defaultProductId || options.noProductOption);
  const [rewriteInjectMarketingPlanValue, setRewriteInjectMarketingPlanValue] = useState("yes");
  const [rewriteAdditionalInstruction, setRewriteAdditionalInstruction] = useState("");

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoCalendarValue, setVideoCalendarValue] = useState("");
  const [videoCustomTopic, setVideoCustomTopic] = useState("");
  const [videoProductValue, setVideoProductValue] = useState(options.defaultProductId || options.noProductOption);
  const [videoReferenceImageFile, setVideoReferenceImageFile] = useState<File | null>(null);
  const [videoCopyAdditionalInstruction, setVideoCopyAdditionalInstruction] = useState("");
  const [videoProviderValue, setVideoProviderValue] = useState(defaultVideoProviderValue);
  const [videoCustomProviderValue, setVideoCustomProviderValue] = useState(defaultVideoProviderValue);
  const [videoCustomModelName, setVideoCustomModelName] = useState("");
  const [videoDurationValue, setVideoDurationValue] = useState("10");
  const [videoCustomDurationValue, setVideoCustomDurationValue] = useState("10");
  const [videoInjectMarketingPlanValue, setVideoInjectMarketingPlanValue] = useState("yes");
  const [videoOutputPromptValue, setVideoOutputPromptValue] = useState("yes");
  const [videoAdditionalInstruction, setVideoAdditionalInstruction] = useState("");

  function resetOriginalComposer(calendarItems: CalendarOption[], products: ProductOption[]) {
    setOriginalCalendarValue(calendarItems[0]?.id || options.customTopicOption);
    setOriginalCustomTopic("");
    setOriginalProductValue(products[0]?.id || options.noProductOption);
    setOriginalAccountRoleValue(resolveDefaultOriginalAccountRoleValue());
    setOriginalImageCountValue(options.autoImageCountOption);
    setOriginalInjectMarketingPlanValue("yes");
    setOriginalAdditionalInstruction("");
    setCoverReferenceFile(null);
    setGalleryReferenceFiles([]);
  }

  useEffect(() => {
    const availableValues = options.availableOriginalAccountRoleValues?.filter(Boolean) || [];
    if (!availableValues.length) {
      return;
    }
    if (!availableValues.includes(originalAccountRoleValue)) {
      setOriginalAccountRoleValue(resolveDefaultOriginalAccountRoleValue());
    }
  }, [options.availableOriginalAccountRoleValues, options.defaultOriginalAccountRoleValue, originalAccountRoleValue]);

  function openOriginalModal(calendarItems: CalendarOption[], products: ProductOption[]) {
    resetOriginalComposer(calendarItems, products);
    setIsOriginalModalOpen(true);
  }

  function closeOriginalModal() {
    setIsOriginalModalOpen(false);
  }

  function resetRewriteComposer(materials: MaterialOption[], products: ProductOption[]) {
    setRewriteMaterialValue(materials[0]?.id || "");
    setRewriteProductValue(products[0]?.id || options.noProductOption);
    setRewriteInjectMarketingPlanValue("yes");
    setRewriteAdditionalInstruction("");
  }

  function openRewriteModal(materials: MaterialOption[], products: ProductOption[]) {
    resetRewriteComposer(materials, products);
    setIsRewriteModalOpen(true);
  }

  function closeRewriteModal() {
    setIsRewriteModalOpen(false);
  }

  useEffect(() => {
    const availableValues = options.availableVideoProviderValues?.filter(Boolean) || [];
    const resolvedDefaultProvider = availableValues.includes(defaultVideoProviderValue)
      ? defaultVideoProviderValue
      : availableValues[0] || defaultVideoProviderValue;
    if (!availableValues.length) {
      return;
    }
    if (!availableValues.includes(videoProviderValue) && videoProviderValue !== customVideoProviderOption) {
      setVideoProviderValue(resolvedDefaultProvider);
    }
    if (!availableValues.includes(videoCustomProviderValue)) {
      setVideoCustomProviderValue(resolvedDefaultProvider);
    }
  }, [
    customVideoProviderOption,
    defaultVideoProviderValue,
    options.availableVideoProviderValues,
    videoCustomProviderValue,
    videoProviderValue,
  ]);

  function resetVideoComposer(calendarItems: CalendarOption[], products: ProductOption[]) {
    const availableValues = options.availableVideoProviderValues?.filter(Boolean) || [];
    const resolvedDefaultProvider = availableValues.includes(defaultVideoProviderValue)
      ? defaultVideoProviderValue
      : availableValues[0] || defaultVideoProviderValue;
    setVideoCalendarValue(calendarItems[0]?.id || options.customTopicOption);
    setVideoCustomTopic("");
    setVideoProductValue(products[0]?.id || options.noProductOption);
    setVideoReferenceImageFile(null);
    setVideoCopyAdditionalInstruction("");
    setVideoProviderValue(resolvedDefaultProvider);
    setVideoCustomProviderValue(resolvedDefaultProvider);
    setVideoCustomModelName("");
    setVideoDurationValue("10");
    setVideoCustomDurationValue("10");
    setVideoInjectMarketingPlanValue("yes");
    setVideoOutputPromptValue("yes");
    setVideoAdditionalInstruction("");
  }

  function openVideoModal(calendarItems: CalendarOption[], products: ProductOption[]) {
    resetVideoComposer(calendarItems, products);
    setIsVideoModalOpen(true);
  }

  function closeVideoModal() {
    setIsVideoModalOpen(false);
  }

  return {
    isOriginalModalOpen,
    originalCalendarValue,
    originalCustomTopic,
    originalProductValue,
    originalAccountRoleValue,
    originalImageCountValue,
    originalInjectMarketingPlanValue,
    originalAdditionalInstruction,
    coverReferenceFile,
    galleryReferenceFiles,
    isRewriteModalOpen,
    rewriteMaterialValue,
    rewriteProductValue,
    rewriteInjectMarketingPlanValue,
    rewriteAdditionalInstruction,
    isVideoModalOpen,
    videoCalendarValue,
    videoCustomTopic,
    videoProductValue,
    videoReferenceImageFile,
    videoCopyAdditionalInstruction,
    videoProviderValue,
    videoCustomProviderValue,
    videoCustomModelName,
    videoDurationValue,
    videoCustomDurationValue,
    videoInjectMarketingPlanValue,
    videoOutputPromptValue,
    videoAdditionalInstruction,
    customVideoProviderOption,
    customVideoDurationOption,
    setOriginalCalendarValue,
    setOriginalCustomTopic,
    setOriginalProductValue,
    setOriginalAccountRoleValue,
    setOriginalImageCountValue,
    setOriginalInjectMarketingPlanValue,
    setOriginalAdditionalInstruction,
    setCoverReferenceFile,
    setGalleryReferenceFiles,
    setIsOriginalModalOpen,
    setRewriteMaterialValue,
    setRewriteProductValue,
    setRewriteInjectMarketingPlanValue,
    setRewriteAdditionalInstruction,
    setIsRewriteModalOpen,
    setVideoCalendarValue,
    setVideoCustomTopic,
    setVideoProductValue,
    setVideoReferenceImageFile,
    setVideoCopyAdditionalInstruction,
    setVideoProviderValue,
    setVideoCustomProviderValue,
    setVideoCustomModelName,
    setVideoDurationValue,
    setVideoCustomDurationValue,
    setVideoInjectMarketingPlanValue,
    setVideoOutputPromptValue,
    setVideoAdditionalInstruction,
    setIsVideoModalOpen,
    resetOriginalComposer,
    openOriginalModal,
    closeOriginalModal,
    resetRewriteComposer,
    openRewriteModal,
    closeRewriteModal,
    resetVideoComposer,
    openVideoModal,
    closeVideoModal,
  };
}

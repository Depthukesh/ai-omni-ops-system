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
  defaultRewriteAccountRoleValue?: string;
  availableRewriteAccountRoleValues?: string[];
  defaultVideoAccountRoleValue?: string;
  availableVideoAccountRoleValues?: string[];
  defaultVideoProviderValue?: string;
  availableVideoProviderValues?: string[];
  defaultStoryboardImageModelValue?: string;
  availableStoryboardImageModelValues?: string[];
}) {
  const customVideoProviderOption = "__custom_video_provider__";
  const defaultVideoProviderValue = options.defaultVideoProviderValue || "volcengine_seedance_20";
  const defaultStoryboardImageModelValue = options.defaultStoryboardImageModelValue || "";
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

  function resolveDefaultRewriteAccountRoleValue() {
    const availableValues = options.availableRewriteAccountRoleValues?.filter(Boolean) || [];
    const preferredValue = options.defaultRewriteAccountRoleValue || "BRAND";
    if (!availableValues.length) {
      return preferredValue;
    }
    return availableValues.includes(preferredValue) ? preferredValue : availableValues[0];
  }

  function resolveDefaultVideoAccountRoleValue() {
    const availableValues = options.availableVideoAccountRoleValues?.filter(Boolean) || [];
    const preferredValue = options.defaultVideoAccountRoleValue || "BRAND";
    if (!availableValues.length) {
      return preferredValue;
    }
    return availableValues.includes(preferredValue) ? preferredValue : availableValues[0];
  }

  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [rewriteMaterialValue, setRewriteMaterialValue] = useState("");
  const [rewriteProductValue, setRewriteProductValue] = useState(options.defaultProductId || options.noProductOption);
  const [rewriteAccountRoleValue, setRewriteAccountRoleValue] = useState(options.defaultRewriteAccountRoleValue || "BRAND");
  const [rewriteInjectMarketingPlanValue, setRewriteInjectMarketingPlanValue] = useState("yes");
  const [rewriteAdditionalInstruction, setRewriteAdditionalInstruction] = useState("");

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoCalendarValue, setVideoCalendarValue] = useState("");
  const [videoCustomTopic, setVideoCustomTopic] = useState("");
  const [videoProductValue, setVideoProductValue] = useState(options.defaultProductId || options.noProductOption);
  const [videoMaterialValue, setVideoMaterialValue] = useState("");
  const [videoAccountRoleValue, setVideoAccountRoleValue] = useState(options.defaultVideoAccountRoleValue || "BRAND");
  const [videoReferenceImageFile, setVideoReferenceImageFile] = useState<File | null>(null);
  const [videoKindValue, setVideoKindValue] = useState("BRAND_PROMO");
  const [videoCopyAdditionalInstruction, setVideoCopyAdditionalInstruction] = useState("");
  const [videoProviderValue, setVideoProviderValue] = useState(defaultVideoProviderValue);
  const [videoCustomProviderValue, setVideoCustomProviderValue] = useState(defaultVideoProviderValue);
  const [videoCustomModelName, setVideoCustomModelName] = useState("");
  const [videoStoryboardImageModelValue, setVideoStoryboardImageModelValue] = useState(defaultStoryboardImageModelValue);
  const [videoDurationValue, setVideoDurationValue] = useState("10");
  const [videoInjectMarketingPlanValue, setVideoInjectMarketingPlanValue] = useState("yes");
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
    setRewriteAccountRoleValue(resolveDefaultRewriteAccountRoleValue());
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
    const availableValues = options.availableRewriteAccountRoleValues?.filter(Boolean) || [];
    if (!availableValues.length) {
      return;
    }
    if (!availableValues.includes(rewriteAccountRoleValue)) {
      setRewriteAccountRoleValue(resolveDefaultRewriteAccountRoleValue());
    }
  }, [options.availableRewriteAccountRoleValues, options.defaultRewriteAccountRoleValue, rewriteAccountRoleValue]);

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

  useEffect(() => {
    const availableValues = options.availableStoryboardImageModelValues?.filter(Boolean) || [];
    const resolvedDefaultValue = availableValues.includes(defaultStoryboardImageModelValue)
      ? defaultStoryboardImageModelValue
      : availableValues[0] || defaultStoryboardImageModelValue;
    if (!availableValues.length) {
      return;
    }
    if (!availableValues.includes(videoStoryboardImageModelValue)) {
      setVideoStoryboardImageModelValue(resolvedDefaultValue);
    }
  }, [
    defaultStoryboardImageModelValue,
    options.availableStoryboardImageModelValues,
    videoStoryboardImageModelValue,
  ]);

  function resetVideoComposer(calendarItems: CalendarOption[], products: ProductOption[]) {
    const availableValues = options.availableVideoProviderValues?.filter(Boolean) || [];
    const resolvedDefaultProvider = availableValues.includes(defaultVideoProviderValue)
      ? defaultVideoProviderValue
      : availableValues[0] || defaultVideoProviderValue;
    setVideoCalendarValue(calendarItems[0]?.id || options.customTopicOption);
    setVideoCustomTopic("");
    setVideoProductValue(products[0]?.id || options.noProductOption);
    setVideoMaterialValue("");
    setVideoAccountRoleValue(resolveDefaultVideoAccountRoleValue());
    setVideoReferenceImageFile(null);
    setVideoKindValue("BRAND_PROMO");
    setVideoCopyAdditionalInstruction("");
    setVideoProviderValue(resolvedDefaultProvider);
    setVideoCustomProviderValue(resolvedDefaultProvider);
    setVideoCustomModelName("");
    setVideoStoryboardImageModelValue(
      options.availableStoryboardImageModelValues?.includes(defaultStoryboardImageModelValue)
        ? defaultStoryboardImageModelValue
        : options.availableStoryboardImageModelValues?.[0] || defaultStoryboardImageModelValue,
    );
    setVideoDurationValue("10");
    setVideoInjectMarketingPlanValue("yes");
    setVideoAdditionalInstruction("");
  }

  function openVideoModal(calendarItems: CalendarOption[], products: ProductOption[]) {
    resetVideoComposer(calendarItems, products);
    setIsVideoModalOpen(true);
  }

  function closeVideoModal() {
    setIsVideoModalOpen(false);
  }

  useEffect(() => {
    const availableValues = options.availableVideoAccountRoleValues?.filter(Boolean) || [];
    if (!availableValues.length) {
      return;
    }
    if (!availableValues.includes(videoAccountRoleValue)) {
      setVideoAccountRoleValue(resolveDefaultVideoAccountRoleValue());
    }
  }, [options.availableVideoAccountRoleValues, options.defaultVideoAccountRoleValue, videoAccountRoleValue]);

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
    rewriteAccountRoleValue,
    rewriteInjectMarketingPlanValue,
    rewriteAdditionalInstruction,
    isVideoModalOpen,
    videoCalendarValue,
    videoCustomTopic,
    videoProductValue,
    videoMaterialValue,
    videoAccountRoleValue,
    videoReferenceImageFile,
    videoKindValue,
    videoCopyAdditionalInstruction,
    videoProviderValue,
    videoCustomProviderValue,
    videoCustomModelName,
    videoStoryboardImageModelValue,
    videoDurationValue,
    videoInjectMarketingPlanValue,
    videoAdditionalInstruction,
    customVideoProviderOption,
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
    setRewriteAccountRoleValue,
    setRewriteInjectMarketingPlanValue,
    setRewriteAdditionalInstruction,
    setIsRewriteModalOpen,
    setVideoCalendarValue,
    setVideoCustomTopic,
    setVideoProductValue,
    setVideoMaterialValue,
    setVideoAccountRoleValue,
    setVideoReferenceImageFile,
    setVideoKindValue,
    setVideoCopyAdditionalInstruction,
    setVideoProviderValue,
    setVideoCustomProviderValue,
    setVideoCustomModelName,
    setVideoStoryboardImageModelValue,
    setVideoDurationValue,
    setVideoInjectMarketingPlanValue,
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

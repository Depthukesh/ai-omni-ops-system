"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { XiaohongshuMarketingCalendarItem } from "../../../services/reports";
import type {
  XiaohongshuOriginalWorkRecord,
  XiaohongshuRewriteWorkRecord,
  XiaohongshuVideoWorkRecord,
} from "../../../services/works";
import type { MediaRecord } from "../../../services/personal-center";
import type { MaterialOption, PlatformAccount, ProductOption } from "./shared-types";

type StringSetter = Dispatch<SetStateAction<string>>;

export function useWorkspaceSelectionSync(options: {
  products: ProductOption[];
  platformAccounts: PlatformAccount[];
  media: MediaRecord[];
  xhsMedia: MediaRecord[];
  setSelectedProductId: StringSetter;
  setSelectedAccountId: StringSetter;
  selectedWorkId: string;
  setSelectedWorkId: StringSetter;
  originalWorks: XiaohongshuOriginalWorkRecord[];
  selectedOriginalWorkId: string;
  setSelectedOriginalWorkId: StringSetter;
  rewriteWorks: XiaohongshuRewriteWorkRecord[];
  selectedRewriteWorkId: string;
  setSelectedRewriteWorkId: StringSetter;
  videoWorks: XiaohongshuVideoWorkRecord[];
  selectedVideoWorkId: string;
  setSelectedVideoWorkId: StringSetter;
  noProductOption: string;
  customTopicOption: string;
  originalProductValue: string;
  setOriginalProductValue: StringSetter;
  originalCalendarValue: string;
  setOriginalCalendarValue: StringSetter;
  rewriteProductValue: string;
  setRewriteProductValue: StringSetter;
  materialNotes: MaterialOption[];
  selectedMaterialId: string;
  setSelectedMaterialId: StringSetter;
  rewriteMaterialValue: string;
  setRewriteMaterialValue: StringSetter;
  videoProductValue: string;
  setVideoProductValue: StringSetter;
  videoCalendarValue: string;
  setVideoCalendarValue: StringSetter;
  calendarAllItems: XiaohongshuMarketingCalendarItem[];
  selectedCalendarItemId: string;
  setSelectedCalendarItemId: StringSetter;
  activeCalendarMonth: string;
  setActiveCalendarMonth: StringSetter;
  calendarMonthKeys: string[];
}) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("productId");
    const accountId = params.get("accountId");
    const workId = params.get("workId");

    if (productId && options.products.some((item) => item.id === productId)) {
      options.setSelectedProductId(productId);
    }

    if (accountId && options.platformAccounts.some((item) => item.id === accountId)) {
      options.setSelectedAccountId(accountId);
    }

    if (workId && options.media.some((item) => item.id === workId)) {
      options.setSelectedWorkId(workId);
    }
  }, [options.media, options.platformAccounts, options.products, options.setSelectedAccountId, options.setSelectedProductId, options.setSelectedWorkId]);

  useEffect(() => {
    if (!options.selectedWorkId && options.xhsMedia[0]) {
      options.setSelectedWorkId(options.xhsMedia[0].id);
    }
  }, [options.selectedWorkId, options.setSelectedWorkId, options.xhsMedia]);

  useEffect(() => {
    if (!options.selectedOriginalWorkId && options.originalWorks[0]) {
      options.setSelectedOriginalWorkId(options.originalWorks[0].id);
    }
  }, [options.originalWorks, options.selectedOriginalWorkId, options.setSelectedOriginalWorkId]);

  useEffect(() => {
    if (!options.selectedRewriteWorkId && options.rewriteWorks[0]) {
      options.setSelectedRewriteWorkId(options.rewriteWorks[0].id);
    }
  }, [options.rewriteWorks, options.selectedRewriteWorkId, options.setSelectedRewriteWorkId]);

  useEffect(() => {
    if (!options.videoWorks.length) {
      if (options.selectedVideoWorkId) {
        options.setSelectedVideoWorkId("");
      }
      return;
    }
    if (!options.selectedVideoWorkId || !options.videoWorks.some((item) => item.id === options.selectedVideoWorkId)) {
      options.setSelectedVideoWorkId(options.videoWorks[0].id);
    }
  }, [options.selectedVideoWorkId, options.setSelectedVideoWorkId, options.videoWorks]);

  useEffect(() => {
    if (!options.originalProductValue || options.originalProductValue === options.noProductOption) {
      return;
    }
    if (!options.products.some((item) => item.id === options.originalProductValue)) {
      options.setOriginalProductValue(options.products[0]?.id || options.noProductOption);
    }
  }, [options.noProductOption, options.originalProductValue, options.products, options.setOriginalProductValue]);

  useEffect(() => {
    if (options.originalCalendarValue === options.customTopicOption) {
      return;
    }
    if (!options.originalCalendarValue || !options.calendarAllItems.some((item) => item.id === options.originalCalendarValue)) {
      options.setOriginalCalendarValue(options.calendarAllItems[0]?.id || options.customTopicOption);
    }
  }, [options.calendarAllItems, options.customTopicOption, options.originalCalendarValue, options.setOriginalCalendarValue]);

  useEffect(() => {
    if (!options.rewriteProductValue || options.rewriteProductValue === options.noProductOption) {
      return;
    }
    if (!options.products.some((item) => item.id === options.rewriteProductValue)) {
      options.setRewriteProductValue(options.products[0]?.id || options.noProductOption);
    }
  }, [options.noProductOption, options.products, options.rewriteProductValue, options.setRewriteProductValue]);

  useEffect(() => {
    if (!options.materialNotes.length) {
      if (options.selectedMaterialId) {
        options.setSelectedMaterialId("");
      }
      return;
    }

    if (!options.selectedMaterialId || !options.materialNotes.some((item) => item.id === options.selectedMaterialId)) {
      options.setSelectedMaterialId(options.materialNotes[0]?.id || "");
    }
  }, [options.materialNotes, options.selectedMaterialId, options.setSelectedMaterialId]);

  useEffect(() => {
    if (!options.materialNotes.length) {
      if (options.rewriteMaterialValue) {
        options.setRewriteMaterialValue("");
      }
      return;
    }

    if (!options.rewriteMaterialValue || !options.materialNotes.some((item) => item.id === options.rewriteMaterialValue)) {
      options.setRewriteMaterialValue(options.materialNotes[0]?.id || "");
    }
  }, [options.materialNotes, options.rewriteMaterialValue, options.setRewriteMaterialValue]);

  useEffect(() => {
    if (!options.products.length) {
      options.setVideoProductValue(options.noProductOption);
      return;
    }
    if (options.videoProductValue !== options.noProductOption && !options.products.some((item) => item.id === options.videoProductValue)) {
      options.setVideoProductValue(options.products[0]?.id || options.noProductOption);
    }
  }, [options.noProductOption, options.products, options.setVideoProductValue, options.videoProductValue]);

  useEffect(() => {
    if (options.videoCalendarValue === options.customTopicOption) {
      return;
    }
    if (!options.videoCalendarValue || !options.calendarAllItems.some((item) => item.id === options.videoCalendarValue)) {
      options.setVideoCalendarValue(options.calendarAllItems[0]?.id || options.customTopicOption);
    }
  }, [options.calendarAllItems, options.customTopicOption, options.setVideoCalendarValue, options.videoCalendarValue]);

  useEffect(() => {
    if (!options.calendarAllItems.length) {
      if (options.selectedCalendarItemId) {
        options.setSelectedCalendarItemId("");
      }
      return;
    }

    if (!options.selectedCalendarItemId || !options.calendarAllItems.some((item) => item.id === options.selectedCalendarItemId)) {
      options.setSelectedCalendarItemId(options.calendarAllItems[0].id);
    }
  }, [options.calendarAllItems, options.selectedCalendarItemId, options.setSelectedCalendarItemId]);

  useEffect(() => {
    if (!options.calendarMonthKeys.length) {
      if (options.activeCalendarMonth) {
        options.setActiveCalendarMonth("");
      }
      return;
    }

    if (!options.activeCalendarMonth || !options.calendarMonthKeys.includes(options.activeCalendarMonth)) {
      options.setActiveCalendarMonth(options.calendarMonthKeys[options.calendarMonthKeys.length - 1]);
    }
  }, [options.activeCalendarMonth, options.calendarMonthKeys, options.setActiveCalendarMonth]);
}

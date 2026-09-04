"use client";

import { useEffect, useMemo, useState } from "react";
import {
  generateXiaohongshuMarketingCalendar,
  getXiaohongshuMarketingCalendarWorkspace,
  upsertXiaohongshuMarketingCalendarItem,
  type XiaohongshuMarketingCalendarItem,
  type XiaohongshuMarketingCalendarWorkspace,
} from "../../../services/reports";
import { formatCalendarDate, formatCalendarListValue } from "./calendar-helpers";
import { CalendarWorkspace } from "./calendar-workspace";
import {
  cloneMarketingCalendarItem,
  createEmptyMarketingCalendarItem,
  normalizeEditableMarketingCalendarItem,
  updateMarketingCalendarItemByPath,
  type MarketingCalendarPlatformView,
} from "./marketing-calendar-item-helpers";

type EmptyWorkspace = { history: [] };

const EMPTY_WORKSPACE: EmptyWorkspace = { history: [] };

export interface ContentMarketingCalendarWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  brandId: string;
  platformView: MarketingCalendarPlatformView;
  canEditCalendar: boolean;
  initialWorkspace?: XiaohongshuMarketingCalendarWorkspace;
  autoLoad?: boolean;
  externalLoading?: boolean;
  onWorkspaceChange?: (workspace: XiaohongshuMarketingCalendarWorkspace) => void;
  onNotice?: (message: string) => void;
  onError?: (message: string) => void;
}

export function ContentMarketingCalendarWorkspace(props: ContentMarketingCalendarWorkspaceProps) {
  const {
    sectionLabel,
    sectionDescription,
    brandId,
    platformView,
    canEditCalendar,
    initialWorkspace,
    autoLoad = true,
    externalLoading = false,
    onWorkspaceChange,
    onNotice,
    onError,
  } = props;

  const [workspace, setWorkspace] = useState<XiaohongshuMarketingCalendarWorkspace>(initialWorkspace || EMPTY_WORKSPACE);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingCalendar, setIsGeneratingCalendar] = useState(false);
  const [isCalendarDetailOpen, setIsCalendarDetailOpen] = useState(false);
  const [selectedCalendarItemId, setSelectedCalendarItemId] = useState("");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState("");
  const [isEditingCalendarItem, setIsEditingCalendarItem] = useState(false);
  const [isSavingCalendarItem, setIsSavingCalendarItem] = useState(false);
  const [calendarItemDraft, setCalendarItemDraft] = useState<XiaohongshuMarketingCalendarItem | null>(null);
  const isLoading = externalLoading || isRefreshing;

  useEffect(() => {
    if (!initialWorkspace) {
      return;
    }
    setWorkspace(initialWorkspace);
  }, [initialWorkspace]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }
    void refreshWorkspace();
  }, [autoLoad, brandId]);

  const latestCalendar = workspace.latest;
  const latestCalendarTask = workspace.latestTask;
  const calendarTaskStatusText = latestCalendarTask?.phaseText || "";
  const calendarAllItems = useMemo(() => {
    const records = latestCalendar
      ? [latestCalendar, ...workspace.history.filter((item) => item.id !== latestCalendar.id)]
      : workspace.history;
    const byDate = new Map<string, XiaohongshuMarketingCalendarItem>();

    for (const record of records) {
      for (const item of record.items) {
        if (!item.date || byDate.has(item.date)) {
          continue;
        }
        byDate.set(item.date, item);
      }
    }

    return Array.from(byDate.values()).sort((left, right) => left.date.localeCompare(right.date));
  }, [latestCalendar, workspace.history]);
  const selectedCalendarItem = useMemo(
    () => calendarAllItems.find((item) => item.id === selectedCalendarItemId),
    [calendarAllItems, selectedCalendarItemId],
  );

  useEffect(() => {
    if (!isCalendarDetailOpen || !selectedCalendarItem || isEditingCalendarItem) {
      return;
    }
    setCalendarItemDraft(cloneMarketingCalendarItem(selectedCalendarItem));
  }, [isCalendarDetailOpen, isEditingCalendarItem, selectedCalendarItem]);

  async function refreshWorkspace() {
    setIsRefreshing(true);
    emitError("");
    try {
      const nextWorkspace = await getXiaohongshuMarketingCalendarWorkspace(brandId, { force: true });
      applyWorkspace(nextWorkspace);
    } catch (error) {
      emitError(readErrorMessage(error, "营销日历读取失败。"));
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleGenerateCalendar() {
    if (!canEditCalendar) {
      emitError("当前账号没有营销日历板块的编辑权限。");
      return;
    }
    setIsGeneratingCalendar(true);
    emitError("");
    emitNotice("");
    try {
      const nextWorkspace = await generateXiaohongshuMarketingCalendar(undefined, brandId);
      applyWorkspace(nextWorkspace);
      emitNotice("已提交后台生成任务，正在生成营销日历。");
    } catch (error) {
      emitError(`生成失败：${readErrorMessage(error, "营销日历生成失败。")}`);
    } finally {
      setIsGeneratingCalendar(false);
    }
  }

  function handleOpenCalendarDetail(date: string, itemId?: string) {
    const item = itemId ? calendarAllItems.find((entry) => entry.id === itemId) : calendarAllItems.find((entry) => entry.date === date);
    setSelectedCalendarItemId(item?.id || "");
    setSelectedCalendarDate(item?.date || date);
    setCalendarItemDraft(item ? cloneMarketingCalendarItem(item) : createEmptyMarketingCalendarItem(date));
    setIsEditingCalendarItem(!item);
    setIsCalendarDetailOpen(true);
  }

  function handleCloseCalendarDetail() {
    setIsCalendarDetailOpen(false);
    setSelectedCalendarItemId("");
    setSelectedCalendarDate("");
    setIsEditingCalendarItem(false);
    setCalendarItemDraft(null);
  }

  function handleStartEditCalendarItem() {
    if (!selectedCalendarItem && !calendarItemDraft) {
      return;
    }
    setCalendarItemDraft(cloneMarketingCalendarItem(selectedCalendarItem || calendarItemDraft!));
    setIsEditingCalendarItem(true);
  }

  function handleCancelEditCalendarItem() {
    if (selectedCalendarItem) {
      setCalendarItemDraft(cloneMarketingCalendarItem(selectedCalendarItem));
      setIsEditingCalendarItem(false);
      return;
    }
    if (selectedCalendarDate) {
      setCalendarItemDraft(createEmptyMarketingCalendarItem(selectedCalendarDate));
      setIsEditingCalendarItem(true);
    }
  }

  function handleCalendarItemFieldChange(path: string, value: string) {
    setCalendarItemDraft((current) => (current ? updateMarketingCalendarItemByPath(current, path, value) : current));
  }

  function handleCalendarItemListFieldChange(path: string, value: string) {
    setCalendarItemDraft((current) =>
      current
        ? updateMarketingCalendarItemByPath(
            current,
            path,
            value
              .split(/\n|,|，/)
              .map((item) => item.trim())
              .filter(Boolean),
          )
        : current,
    );
  }

  async function handleSaveCalendarItem() {
    if (!canEditCalendar) {
      emitError("当前账号没有营销日历板块的编辑权限。");
      return;
    }
    if (!latestCalendar || !calendarItemDraft) {
      emitError("当前还没有可保存的营销日历内容。");
      return;
    }
    const normalizedDraft = normalizeEditableMarketingCalendarItem(calendarItemDraft);
    if (!normalizedDraft.date.trim()) {
      emitError("请先填写日期。");
      return;
    }
    const hasPrimaryTopic = Boolean(
      normalizedDraft.brandMarketing.theme
      || normalizedDraft.xiaohongshu.brandAccount.topic
      || normalizedDraft.xiaohongshu.employeeAccount.topic
      || normalizedDraft.douyin.brandAccount.topic
      || normalizedDraft.douyin.ipAccount.topic
      || normalizedDraft.douyin.employeeAccount.topic
      || normalizedDraft.moments.topic,
    );
    if (!hasPrimaryTopic) {
      emitError("请至少填写一个当天营销主题或平台选题。");
      return;
    }

    setIsSavingCalendarItem(true);
    emitError("");
    emitNotice("");
    try {
      const nextWorkspace = await upsertXiaohongshuMarketingCalendarItem(
        latestCalendar.id,
        normalizedDraft.date,
        normalizedDraft,
        latestCalendar.title,
        brandId,
      );
      applyWorkspace(nextWorkspace);
      const nextSelectedItem =
        nextWorkspace.latest?.items.find((item) => item.id === normalizedDraft.id || item.date === normalizedDraft.date)
        || normalizedDraft;
      setSelectedCalendarItemId(nextSelectedItem.id);
      setSelectedCalendarDate(nextSelectedItem.date);
      setCalendarItemDraft(cloneMarketingCalendarItem(nextSelectedItem));
      setIsEditingCalendarItem(false);
      emitNotice("营销日历已保存。");
    } catch (error) {
      emitError(`保存失败：${readErrorMessage(error, "营销日历保存失败。")}`);
    } finally {
      setIsSavingCalendarItem(false);
    }
  }

  function applyWorkspace(nextWorkspace: XiaohongshuMarketingCalendarWorkspace) {
    setWorkspace(nextWorkspace);
    onWorkspaceChange?.(nextWorkspace);
  }

  function emitNotice(message: string) {
    onNotice?.(message);
  }

  function emitError(message: string) {
    onError?.(message);
  }

  return (
    <CalendarWorkspace
      sectionLabel={sectionLabel}
      sectionDescription={sectionDescription}
      platformView={platformView}
      isLoading={isLoading}
      isPublishing={false}
      isGeneratingCalendar={isGeneratingCalendar}
      canGenerateCalendar
      isCalendarTaskActive={Boolean(latestCalendarTask && ["PENDING", "QUEUED", "RUNNING"].includes(latestCalendarTask.taskStatus))}
      latestCalendar={latestCalendar}
      latestCalendarTask={latestCalendarTask}
      calendarTaskStatusText={calendarTaskStatusText}
      calendarInlineError=""
      calendarAllItems={calendarAllItems}
      isCalendarDetailOpen={isCalendarDetailOpen}
      selectedCalendarDate={selectedCalendarDate}
      selectedCalendarItem={selectedCalendarItem}
      calendarItemDraft={calendarItemDraft}
      isEditingCalendarItem={isEditingCalendarItem}
      isSavingCalendarItem={isSavingCalendarItem}
      canEditCalendar={canEditCalendar}
      onRefresh={refreshWorkspace}
      onGenerate={handleGenerateCalendar}
      onOpenDetail={handleOpenCalendarDetail}
      onCloseDetail={handleCloseCalendarDetail}
      onStartEditDetail={handleStartEditCalendarItem}
      onCancelEditDetail={handleCancelEditCalendarItem}
      onSaveDetail={handleSaveCalendarItem}
      onDetailFieldChange={handleCalendarItemFieldChange}
      onDetailListFieldChange={handleCalendarItemListFieldChange}
      formatCalendarDate={formatCalendarDate}
      formatCalendarListValue={formatCalendarListValue}
    />
  );
}

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

"use client";

import { useMemo } from "react";
import { type TaskRecord, type TaskStatus } from "../../../services/personal-center";
import { findLatestTaskByTypes, isTaskActive, useDelayedTaskPolling } from "./task-polling";
import { getComposeTaskStatusText, getPhaseTaskStatusText } from "./task-status-text-helpers";
import { buildPublishTaskMap, readTaskWorkKind } from "./work-task-helpers";

type PhaseTaskRecordLike = {
  taskStatus?: TaskStatus;
  updatedAt?: string;
  errorMessage?: string;
  phaseText?: string;
};

interface UseXiaohongshuWorkspaceTasksOptions {
  tasks: TaskRecord[];
  marketingPlanTask?: PhaseTaskRecordLike;
  calendarTask?: PhaseTaskRecordLike;
  isRewriteSubmitting: boolean;
  isVideoSubmitting: boolean;
  isCancellingTaskId: string;
  loadWorkspace: (options?: { preserveMessages?: boolean }) => void | Promise<void>;
  refreshMarketingPlanWorkspace: (silent?: boolean) => void | Promise<void>;
  refreshCalendarWorkspace: (silent?: boolean) => void | Promise<void>;
}

export function useXiaohongshuWorkspaceTasks(options: UseXiaohongshuWorkspaceTasksOptions) {
  const {
    originalTaskCount,
    latestOriginalTask,
    rewriteTaskCount,
    latestRewriteTask,
    videoTaskCount,
    latestVideoTask,
    latestOriginalPublishTask,
    latestRewritePublishTask,
    publishTaskMap,
    pollingOriginalTask,
    pollingRewriteTask,
    pollingVideoTask,
    pollingPublishTask,
  } = useMemo(() => {
    const originalTaskCount = options.tasks.filter((item) => item.taskType === "XHS_ORIGINAL_NOTE").length;
    const latestOriginalTask = findLatestTaskByTypes(options.tasks, "XHS_ORIGINAL_NOTE");
    const rewriteTaskCount = options.tasks.filter((item) => item.taskType === "XHS_REWRITE_NOTE").length;
    const latestRewriteTask = findLatestTaskByTypes(options.tasks, "XHS_REWRITE_NOTE");
    const videoTaskCount = options.tasks.filter((item) => item.taskType === "XHS_VIDEO_NOTE").length;
    const latestVideoTask = findLatestTaskByTypes(options.tasks, "XHS_VIDEO_NOTE");
    const mobilePublishTasks = options.tasks
      .filter((item) => item.taskType === "XHS_PUBLISH_MOBILE_DRAFT" || item.taskType === "XHS_PUBLISH_DESKTOP_DRAFT")
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

    return {
      originalTaskCount,
      latestOriginalTask,
      rewriteTaskCount,
      latestRewriteTask,
      videoTaskCount,
      latestVideoTask,
      latestOriginalPublishTask: mobilePublishTasks.find((item) => readTaskWorkKind(item) === "ORIGINAL"),
      latestRewritePublishTask: mobilePublishTasks.find((item) => readTaskWorkKind(item) === "REWRITE"),
      publishTaskMap: buildPublishTaskMap(mobilePublishTasks),
      pollingOriginalTask: latestOriginalTask,
      pollingRewriteTask: latestRewriteTask,
      pollingVideoTask: latestVideoTask,
      pollingPublishTask: findLatestTaskByTypes(options.tasks, ["XHS_PUBLISH_MOBILE_DRAFT", "XHS_PUBLISH_DESKTOP_DRAFT"]),
    };
  }, [options.tasks]);

  useDelayedTaskPolling({
    active: isTaskActive(options.marketingPlanTask?.taskStatus),
    updatedAt: options.marketingPlanTask?.updatedAt,
    onPoll: () => options.refreshMarketingPlanWorkspace(true),
  });

  useDelayedTaskPolling({
    active: isTaskActive(options.calendarTask?.taskStatus),
    updatedAt: options.calendarTask?.updatedAt,
    onPoll: () => options.refreshCalendarWorkspace(true),
  });

  useDelayedTaskPolling({
    active: isTaskActive(pollingOriginalTask?.taskStatus),
    updatedAt: pollingOriginalTask?.updatedAt,
    onPoll: () => options.loadWorkspace(),
  });

  useDelayedTaskPolling({
    active: isTaskActive(pollingRewriteTask?.taskStatus),
    updatedAt: pollingRewriteTask?.updatedAt,
    onPoll: () => options.loadWorkspace(),
  });

  useDelayedTaskPolling({
    active: isTaskActive(pollingVideoTask?.taskStatus),
    updatedAt: pollingVideoTask?.updatedAt,
    onPoll: () => options.loadWorkspace(),
  });

  useDelayedTaskPolling({
    active: isTaskActive(pollingPublishTask?.taskStatus),
    updatedAt: pollingPublishTask?.updatedAt,
    onPoll: () => options.loadWorkspace(),
  });

  const isMarketingPlanTaskActive = Boolean(options.marketingPlanTask && isTaskActive(options.marketingPlanTask.taskStatus));
  const marketingPlanInlineError =
    options.marketingPlanTask?.taskStatus === "FAILED" ? options.marketingPlanTask.errorMessage?.trim() || "" : "";
  const marketingPlanTaskStatusText = getPhaseTaskStatusText(options.marketingPlanTask);

  const isCalendarTaskActive = Boolean(options.calendarTask && isTaskActive(options.calendarTask.taskStatus));
  const calendarInlineError = options.calendarTask?.taskStatus === "FAILED" ? options.calendarTask.errorMessage?.trim() || "" : "";
  const calendarTaskStatusText = getPhaseTaskStatusText(options.calendarTask);

  const isOriginalTaskActive = Boolean(latestOriginalTask && isTaskActive(latestOriginalTask.taskStatus));
  const originalInlineError = latestOriginalTask?.taskStatus === "FAILED" ? latestOriginalTask.errorMessage?.trim() || "" : "";
  const originalTaskStatusText = getComposeTaskStatusText(latestOriginalTask);
  const isCancellingOriginalTask = options.isCancellingTaskId === latestOriginalTask?.id;

  const isRewriteTaskActive = Boolean(latestRewriteTask && isTaskActive(latestRewriteTask.taskStatus));
  const showRewriteSubmittingState = options.isRewriteSubmitting && !isRewriteTaskActive;
  const rewriteInlineError = latestRewriteTask?.taskStatus === "FAILED" ? latestRewriteTask.errorMessage?.trim() || "" : "";
  const rewriteTaskStatusText = getComposeTaskStatusText(latestRewriteTask);
  const isCancellingRewriteTask = options.isCancellingTaskId === latestRewriteTask?.id;

  const isVideoTaskActive = Boolean(latestVideoTask && isTaskActive(latestVideoTask.taskStatus));
  const showVideoSubmittingState = options.isVideoSubmitting && !isVideoTaskActive;
  const videoInlineError = latestVideoTask?.taskStatus === "FAILED" ? latestVideoTask.errorMessage?.trim() || "" : "";
  const videoTaskStatusText = getComposeTaskStatusText(latestVideoTask);
  const isCancellingVideoTask = options.isCancellingTaskId === latestVideoTask?.id;

  return {
    originalTaskCount,
    latestOriginalTask,
    isOriginalTaskActive,
    originalInlineError,
    originalTaskStatusText,
    canCancelOriginalTask: isOriginalTaskActive,
    isCancellingOriginalTask,
    rewriteTaskCount,
    latestRewriteTask,
    isRewriteTaskActive,
    showRewriteSubmittingState,
    rewriteInlineError,
    rewriteTaskStatusText,
    canCancelRewriteTask: isRewriteTaskActive,
    isCancellingRewriteTask,
    videoTaskCount,
    latestVideoTask,
    isVideoTaskActive,
    showVideoSubmittingState,
    videoInlineError,
    videoTaskStatusText,
    canCancelVideoTask: isVideoTaskActive,
    isCancellingVideoTask,
    latestOriginalPublishTask,
    latestRewritePublishTask,
    publishTaskMap,
    isMarketingPlanTaskActive,
    marketingPlanInlineError,
    marketingPlanTaskStatusText,
    isCalendarTaskActive,
    calendarInlineError,
    calendarTaskStatusText,
  };
}

"use client";

import { type MediaRecord, type TaskRecord } from "../../../services/personal-center";
import { type XiaohongshuNoteDraft } from "../../../services/xiaohongshu";

export function getMatchedDraft(work: MediaRecord | undefined, drafts: XiaohongshuNoteDraft[]) {
  if (!work) {
    return undefined;
  }

  const baseTitle = getWorkBaseTitle(work.title);
  return drafts.find((item) => item.title === baseTitle || work.title.includes(item.title));
}

export function getRelatedWorks(media: MediaRecord[], selectedWork?: MediaRecord) {
  if (!selectedWork) {
    return [];
  }

  if (selectedWork.taskId) {
    return media.filter((item) => item.taskId === selectedWork.taskId);
  }

  const baseTitle = getWorkBaseTitle(selectedWork.title);
  return media.filter((item) => getWorkBaseTitle(item.title) === baseTitle);
}

export function getWorkBaseTitle(title: string) {
  return title.replace(/^小红书(?:笔记|封面图)\s*-\s*/, "");
}

export function buildPublishTaskMap(tasks: TaskRecord[]) {
  const map: Record<string, TaskRecord> = {};
  for (const task of tasks) {
    const workId = readTaskWorkId(task);
    if (workId && !map[workId]) {
      map[workId] = task;
    }
  }
  return map;
}

export function readTaskWorkId(task?: TaskRecord) {
  const inputJson = task?.inputJson;
  if (!inputJson || typeof inputJson !== "object" || Array.isArray(inputJson)) {
    return "";
  }
  return String(inputJson.workId ?? "").trim();
}

export function readTaskWorkKind(task?: TaskRecord) {
  const inputJson = task?.inputJson;
  if (!inputJson || typeof inputJson !== "object" || Array.isArray(inputJson)) {
    return "";
  }
  return String(inputJson.workKind ?? "").trim();
}

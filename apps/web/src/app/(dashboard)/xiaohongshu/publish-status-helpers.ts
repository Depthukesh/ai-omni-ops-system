"use client";

import { type TaskRecord } from "../../../services/personal-center";
import {
  type XiaohongshuOriginalWorkRecord,
  type XiaohongshuRewriteWorkRecord,
  type XiaohongshuVideoWorkRecord,
} from "../../../services/works";

type WorkTaskStatus =
  | XiaohongshuOriginalWorkRecord["taskStatus"]
  | XiaohongshuRewriteWorkRecord["taskStatus"]
  | XiaohongshuVideoWorkRecord["taskStatus"];

export function getTaskStatusClass(status?: TaskRecord["taskStatus"]) {
  if (status === "SUCCESS") {
    return "status-ready";
  }

  if (status === "RUNNING" || status === "QUEUED") {
    return "status-in_progress";
  }

  return "status-pending";
}

export function getWorkTaskStatusClass(status?: WorkTaskStatus) {
  if (status === "SUCCESS") {
    return "status-ready";
  }

  if (status === "RUNNING" || status === "QUEUED" || status === "PENDING") {
    return "status-in_progress";
  }

  if (status === "FAILED" || status === "CANCELLED") {
    return "status-pending";
  }

  return "status-pending";
}

export function getWorkTaskStatusText(status?: WorkTaskStatus) {
  if (status === "SUCCESS") {
    return "已完成";
  }

  if (status === "RUNNING") {
    return "生成中";
  }

  if (status === "QUEUED" || status === "PENDING") {
    return "排队中";
  }

  if (status === "FAILED") {
    return "失败";
  }

  if (status === "CANCELLED") {
    return "已取消";
  }

  return "状态未知";
}

export function getPublishTaskStatusText(task?: TaskRecord) {
  if (!task) {
    return "暂无发布任务";
  }

  const desktop = isDesktopPublishTask(task);
  if (task.taskStatus === "SUCCESS") {
    return desktop ? "电脑端草稿已保存" : "手机接力已完成";
  }
  if (task.taskStatus === "FAILED" || task.taskStatus === "CANCELLED") {
    return desktop ? "电脑端发布失败" : "手机接力失败";
  }
  if (task.taskStatus === "RUNNING") {
    return desktop ? "电脑端发布中" : "接力进行中";
  }
  if (task.taskStatus === "QUEUED" || task.taskStatus === "PENDING") {
    return desktop ? "等待扩展执行" : "等待扫码接力";
  }
  return task.taskStatus;
}

export function getWorkPublishTaskLabel(task?: TaskRecord) {
  if (!task) {
    return "一键发布";
  }

  const desktop = isDesktopPublishTask(task);
  if (task.taskStatus === "SUCCESS") {
    return "再次发布";
  }
  if (task.taskStatus === "FAILED" || task.taskStatus === "CANCELLED") {
    return "重新发布";
  }
  return desktop ? "继续发布" : "查看发布码";
}

export function getPublishTaskSummaryText(task: TaskRecord, noteCategory: "原创" | "二创") {
  const desktop = isDesktopPublishTask(task);
  if (task.taskStatus === "SUCCESS") {
    return desktop
      ? `最近一次${noteCategory}笔记已由电脑端自动写入小红书草稿箱。`
      : `最近一次${noteCategory}笔记手机接力已标记为完成。`;
  }
  if (task.taskStatus === "FAILED" || task.taskStatus === "CANCELLED") {
    return desktop
      ? `最近一次${noteCategory}笔记电脑端一键发布失败：${task.errorMessage || "请检查扩展是否已安装，并确认当前浏览器已登录小红书创作者中心。"}`
      : `最近一次${noteCategory}笔记手机接力失败：${task.errorMessage || "请重新生成二维码后再试。"}`
  }
  return desktop
    ? `最近一次${noteCategory}笔记电脑端一键发布任务已创建，等待浏览器扩展自动写入草稿箱。`
    : `最近一次${noteCategory}笔记手机接力二维码已生成，等待手机扫码接力。`;
}

export function isDesktopPublishTask(task?: TaskRecord) {
  return task?.taskType === "XHS_PUBLISH_DESKTOP_DRAFT";
}

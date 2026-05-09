"use client";

type BasicTaskStatus = "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED" | undefined;

export function getPhaseTaskStatusText(task?: {
  taskStatus?: BasicTaskStatus;
  phaseText?: string;
}) {
  if (!task) {
    return "";
  }

  if (task.taskStatus === "QUEUED") {
    return "排队中";
  }

  if (task.taskStatus === "RUNNING") {
    return task.phaseText || "生成中";
  }

  if (task.taskStatus === "SUCCESS") {
    return "已完成";
  }

  if (task.taskStatus === "FAILED") {
    return "生成失败";
  }

  if (task.taskStatus === "CANCELLED") {
    return "已取消";
  }

  return task.taskStatus || "";
}

export function getComposeTaskStatusText(task?: {
  taskStatus?: BasicTaskStatus;
}) {
  if (!task) {
    return "";
  }

  if (task.taskStatus === "QUEUED") {
    return "排队中";
  }

  if (task.taskStatus === "RUNNING") {
    return "创作中";
  }

  if (task.taskStatus === "SUCCESS") {
    return "已完成";
  }

  if (task.taskStatus === "FAILED") {
    return "创作失败";
  }

  if (task.taskStatus === "CANCELLED") {
    return "已取消";
  }

  return task.taskStatus || "";
}

import type { BrandArchiveBundle } from "../../../services/brand-growth";

type BrandArchiveStatus = BrandArchiveBundle["steps"][number]["status"];
type ReportTaskStatus = "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED" | undefined;

export function getBrandArchiveStatusText(status: BrandArchiveStatus) {
  if (status === "ready") {
    return "已完成";
  }
  if (status === "in_progress") {
    return "进行中";
  }
  return "待开始";
}

export function getReportTaskStatusText(taskStatus?: ReportTaskStatus) {
  if (taskStatus === "QUEUED") {
    return "排队中";
  }
  if (taskStatus === "RUNNING") {
    return "生成中";
  }
  if (taskStatus === "FAILED") {
    return "生成失败";
  }
  if (taskStatus === "SUCCESS") {
    return "已完成";
  }
  return "";
}

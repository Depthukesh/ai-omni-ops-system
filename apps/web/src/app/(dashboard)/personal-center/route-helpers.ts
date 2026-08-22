import type { OrderRecord, SystemUpdateStatus, TaskRecord } from "../../../services/personal-center";
import { getRuntimeMode } from "../../../lib/runtime-mode";

export const personalTaskStatusClassMap: Record<TaskRecord["taskStatus"], string> = {
  PENDING: "status-pending",
  QUEUED: "status-in_progress",
  RUNNING: "status-in_progress",
  SUCCESS: "status-ready",
  FAILED: "status-pending",
  CANCELLED: "status-paused",
};

export const personalOrderStatusClassMap: Record<OrderRecord["orderStatus"], string> = {
  PENDING: "status-in_progress",
  PAID: "status-ready",
  FAILED: "status-pending",
  REFUNDED: "status-paused",
  CANCELLED: "status-paused",
};

export const brandInviteReadStateChangedEvent = "brand-invite-read-state-changed";

export function formatDateTime(value?: string) {
  if (!value) {
    return "未记录";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isAuthFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return ["请先登录", "登录态", "访问凭证", "refresh token", "Unauthorized", "401"].some((keyword) => message.includes(keyword));
}

export function buildPersonalCenterLoginPath(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

export function getBrandDisplayName(brand?: { id?: string; brandName?: string } | null, fallbackBrandId?: string) {
  const name = brand?.brandName?.trim();
  if (name) {
    return name;
  }
  return brand?.id || fallbackBrandId ? "已绑定品牌" : "未绑定品牌";
}

export function formatCollaboratorRoleLabel(role?: string | null) {
  switch (role) {
    case "ADMIN":
    case "OWNER":
      return "管理员";
    case "STAFF":
    case "EDITOR":
    case "OPERATOR":
      return "员工";
    case "TALENT":
    case "VIEWER":
      return "达人";
    default:
      return role || "未设置";
  }
}

export function emitBrandInviteReadStateChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(brandInviteReadStateChangedEvent));
}

export function shouldShowVersionWorkspace(status?: SystemUpdateStatus | null) {
  const runtimeMode = getRuntimeMode();
  if (runtimeMode === "local-single-user" || runtimeMode === "standard") {
    return true;
  }
  return Boolean(status?.supported);
}

export function resolveVersionWorkspaceBadge(status?: SystemUpdateStatus | null) {
  if (!status?.supported) {
    return null;
  }
  if (status.phase === "APPLYING") {
    return { label: "升级中", className: "status-in_progress" };
  }
  if (status.phase === "FAILED") {
    return { label: "需处理", className: "status-pending" };
  }
  if (status.updateAvailable) {
    return { label: "有新版本", className: "status-in_progress" };
  }
  return { label: "已同步", className: "status-ready" };
}

export function resolveVersionWorkspaceSummary(status?: SystemUpdateStatus | null) {
  const latestVersion = status?.latest?.appVersion || status?.latest?.tagName || status?.current?.version || "未获取";
  const guideOnlyMode = status?.source?.executionMode === "guide-only";
  if (!status?.supported) {
    return {
      value: "更新通知",
      description: "查看当前版本、更新方法和同步说明。",
    };
  }
  if (status.phase === "APPLYING") {
    return {
      value: "升级进行中",
      description: guideOnlyMode
        ? "更新步骤已经确认，请等待容器重建或页面刷新最终状态。"
        : "安装态升级已启动，请等待本地工作台自动重启后再确认版本。",
    };
  }
  if (status.phase === "FAILED") {
    return {
      value: "上次更新失败",
      description: status.message || "进入版本与升级查看失败原因，并按当前运行模式重试。",
    };
  }
  if (status.updateAvailable) {
    return {
      value: `最新 ${latestVersion}`,
      description: guideOnlyMode
        ? "检测到新版本，进入版本与升级查看 git pull、容器重建和 Skill 同步步骤。"
        : "检测到新版本，进入版本与升级完成下载校验和一键升级。",
    };
  }
  return {
    value: "已是最新",
    description: guideOnlyMode
      ? "当前版本已同步；后续有新版本时，这里会提醒 git pull 和容器重建方法。"
      : "当前版本已同步；后续有新版本时，这里会提醒下载安装并执行升级。",
  };
}

import type { OrderRecord, TaskRecord } from "../../../services/personal-center";

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
  return `/?next=${encodeURIComponent(nextPath)}`;
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

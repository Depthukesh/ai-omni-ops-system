import type { PromptTemplateRecord, SkillConfigRecord } from "./admin";
import { jsonRequest, request } from "./http";

export type TaskStatus = "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
export type MediaType = "IMAGE" | "VIDEO" | "DOCUMENT" | "HTML" | "ARCHIVE";

export type TaskRecord = {
  id: string;
  userId: string;
  brandId?: string;
  taskType: string;
  taskTitle: string;
  taskStatus: TaskStatus;
  modelName: string;
  pointsCost: number;
  errorMessage?: string;
  startedAt?: string;
  finishedAt?: string;
  inputJson?: Record<string, unknown>;
  outputJson?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type MediaRecord = {
  id: string;
  userId: string;
  brandId?: string;
  taskId?: string;
  title: string;
  mediaType: MediaType;
  sourceUrl?: string;
  storageKey: string;
  mimeType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt?: string;
};

export type UserProfile = {
  id: string;
  mobile: string;
  email: string;
  nickname: string;
  avatarUrl: string;
  emailVerified?: boolean;
  status: "ACTIVE" | "DISABLED";
  membership: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  pointsBalance: number;
};

export type PointLedgerRecord = {
  id: string;
  userId: string;
  changeType: string;
  pointsDelta: number;
  balanceAfter: number;
  description?: string;
  relatedTaskId?: string;
  createdAt: string;
};

export type OrderRecord = {
  id: string;
  userId: string;
  orderNo: string;
  orderType: string;
  orderStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
  membership?: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  pointsAmount?: number;
  amountYuan: number;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    nickname: string;
    mobile: string;
    membership: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
    pointsBalance: number;
  };
};

export type UserSkillPromptRecord = {
  id: string;
  isCustomized: boolean;
  basePrompt: PromptTemplateRecord;
  effectivePrompt: PromptTemplateRecord;
};

export type UserSkillRecord = {
  id: string;
  brandId?: string;
  isCustomized: boolean;
  lastResetAt?: string;
  baseSkill: SkillConfigRecord;
  effectiveSkill: SkillConfigRecord & {
    name: string;
  };
  prompts: UserSkillPromptRecord[];
};

export type UpdateUserSkillPayload = {
  displayName?: string | null;
  defaultModel?: string | null;
  description?: string | null;
  promptOverrides?: Array<{
    promptId: string;
    content?: string | null;
    modelName?: string | null;
    temperature?: number | null;
    maxTokens?: number | null;
  }>;
};

export const profileSeed: UserProfile = {
  id: "usr_demo_001",
  mobile: "13800000000",
  email: "demo@ai-omni.local",
  nickname: "演示账号",
  avatarUrl: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=clean%20minimal%20professional%20user%20avatar%20portrait%2C%20asian%20young%20adult%2C%20soft%20studio%20lighting%2C%20blue%20gray%20background%2C%20realistic%20headshot&image_size=square",
  emailVerified: true,
  status: "ACTIVE",
  membership: "PRO",
  pointsBalance: 14240,
};

export const taskSeed: TaskRecord[] = [
  {
    id: "tsk_demo_001",
    userId: "usr_demo_001",
    brandId: "br_demo_001",
    taskType: "BRAND_GROWTH_REPORT",
    taskTitle: "生成品牌增长报告",
    taskStatus: "SUCCESS",
    modelName: "gpt-5.5",
    pointsCost: 320,
    createdAt: "2026-05-01T09:20:00.000Z",
    updatedAt: "2026-05-01T09:25:00.000Z",
  },
  {
    id: "tsk_demo_002",
    userId: "usr_demo_001",
    brandId: "br_demo_001",
    taskType: "XHS_MARKETING_PLAN",
    taskTitle: "生成小红书营销策划方案",
    taskStatus: "RUNNING",
    modelName: "gpt-5.5",
    pointsCost: 260,
    createdAt: "2026-05-02T02:00:00.000Z",
    updatedAt: "2026-05-02T02:03:00.000Z",
  },
  {
    id: "tsk_demo_003",
    userId: "usr_demo_001",
    brandId: "br_demo_001",
    taskType: "XHS_NOTE_GENERATION",
    taskTitle: "生成小红书笔记：武汉仟吉爆浆提拉米苏值得买吗？",
    taskStatus: "SUCCESS",
    modelName: "gpt-5.5",
    pointsCost: 180,
    createdAt: "2026-05-02T04:15:00.000Z",
    updatedAt: "2026-05-02T04:22:00.000Z",
  },
];

export const mediaSeed: MediaRecord[] = [
  {
    id: "med_demo_001",
    userId: "usr_demo_001",
    brandId: "br_demo_001",
    taskId: "tsk_demo_001",
    title: "品牌增长可视化报告",
    mediaType: "HTML",
    storageKey: "reports/br_demo_001/growth-report.html",
    sourceUrl: "https://oss.example.com/reports/br_demo_001/growth-report.html",
    mimeType: "text/html",
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
  },
  {
    id: "med_demo_002",
    userId: "usr_demo_001",
    brandId: "br_demo_001",
    title: "爆浆提拉米苏封面图",
    mediaType: "IMAGE",
    storageKey: "works/br_demo_001/post-cover-001.png",
    sourceUrl: "https://oss.example.com/works/br_demo_001/post-cover-001.png",
    mimeType: "image/png",
    createdAt: "2026-05-02T03:10:00.000Z",
    updatedAt: "2026-05-02T03:10:00.000Z",
  },
  {
    id: "med_demo_003",
    userId: "usr_demo_001",
    brandId: "br_demo_001",
    taskId: "tsk_demo_003",
    title: "小红书笔记 - 武汉仟吉爆浆提拉米苏值得买吗？",
    mediaType: "HTML",
    storageKey: "works/br_demo_001/xiaohongshu-note-demo-001.html",
    sourceUrl: "https://oss.example.com/works/br_demo_001/xiaohongshu-note-demo-001.html",
    mimeType: "text/html",
    createdAt: "2026-05-02T04:22:00.000Z",
    updatedAt: "2026-05-02T04:22:00.000Z",
  },
  {
    id: "med_demo_004",
    userId: "usr_demo_001",
    brandId: "br_demo_001",
    taskId: "tsk_demo_003",
    title: "小红书封面图 - 武汉仟吉爆浆提拉米苏值得买吗？",
    mediaType: "IMAGE",
    storageKey: "works/br_demo_001/xiaohongshu-cover-demo-001.png",
    sourceUrl: "https://oss.example.com/works/br_demo_001/xiaohongshu-cover-demo-001.png",
    mimeType: "image/png",
    createdAt: "2026-05-02T04:22:00.000Z",
    updatedAt: "2026-05-02T04:22:00.000Z",
  },
];

export const pointLedgerSeed: PointLedgerRecord[] = [
  {
    id: "ptl_demo_001",
    userId: "usr_demo_001",
    changeType: "SYSTEM_GRANT",
    pointsDelta: 10000,
    balanceAfter: 10000,
    description: "新用户演示点数发放",
    createdAt: "2026-04-30T10:00:00.000Z",
  },
  {
    id: "ptl_demo_002",
    userId: "usr_demo_001",
    changeType: "TASK_CONSUME",
    pointsDelta: -320,
    balanceAfter: 9680,
    description: "生成品牌增长报告",
    relatedTaskId: "tsk_demo_001",
    createdAt: "2026-05-01T09:25:00.000Z",
  },
  {
    id: "ptl_demo_003",
    userId: "usr_demo_001",
    changeType: "POINTS_RECHARGE",
    pointsDelta: 5000,
    balanceAfter: 14680,
    description: "点数充值到账",
    createdAt: "2026-05-02T01:40:00.000Z",
  },
  {
    id: "ptl_demo_004",
    userId: "usr_demo_001",
    changeType: "TASK_CONSUME",
    pointsDelta: -260,
    balanceAfter: 14420,
    description: "生成小红书营销策划方案",
    relatedTaskId: "tsk_demo_002",
    createdAt: "2026-05-02T02:03:00.000Z",
  },
  {
    id: "ptl_demo_005",
    userId: "usr_demo_001",
    changeType: "TASK_CONSUME",
    pointsDelta: -180,
    balanceAfter: 14240,
    description: "生成小红书笔记：武汉仟吉爆浆提拉米苏值得买吗？",
    relatedTaskId: "tsk_demo_003",
    createdAt: "2026-05-02T04:22:00.000Z",
  },
];

export const orderSeed: OrderRecord[] = [
  {
    id: "ord_demo_001",
    userId: "usr_demo_001",
    orderNo: "MO202605010001",
    orderType: "MEMBERSHIP_PURCHASE",
    orderStatus: "PAID",
    membership: "PRO",
    amountYuan: 699,
    paidAt: "2026-05-01T08:50:00.000Z",
    createdAt: "2026-05-01T08:45:00.000Z",
    updatedAt: "2026-05-01T08:50:00.000Z",
  },
  {
    id: "ord_demo_002",
    userId: "usr_demo_001",
    orderNo: "PO202605020001",
    orderType: "POINTS_RECHARGE",
    orderStatus: "PAID",
    pointsAmount: 5000,
    amountYuan: 50,
    paidAt: "2026-05-02T01:40:00.000Z",
    createdAt: "2026-05-02T01:35:00.000Z",
    updatedAt: "2026-05-02T01:40:00.000Z",
  },
];

export async function getProfile() {
  return request<UserProfile>("/auth/profile");
}

export async function getPointLedgers() {
  return request<PointLedgerRecord[]>("/auth/point-ledgers");
}

export async function getOrders() {
  return request<OrderRecord[]>("/orders");
}

export async function getOrderById(orderId: string) {
  return request<OrderRecord>(`/orders/${orderId}`);
}

export async function getOrderStatus(orderId: string) {
  return request<Pick<OrderRecord, "id" | "orderNo" | "orderStatus" | "paidAt" | "updatedAt">>(`/orders/${orderId}/status`);
}

export async function createOrder(payload: {
  orderType: string;
  membership?: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  pointsAmount?: number;
  amountYuan: number;
}) {
  return jsonRequest<OrderRecord>("/orders", "POST", payload);
}

export async function payOrder(orderId: string) {
  return request<OrderRecord>(`/orders/${orderId}/pay`, {
    method: "PATCH",
  });
}

export async function cancelOrder(orderId: string) {
  return request<OrderRecord>(`/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
}

export async function getTasks() {
  return request<TaskRecord[]>("/tasks");
}

export async function retryTask(taskId: string) {
  return request<TaskRecord>(`/tasks/${taskId}/retry`, {
    method: "PATCH",
  });
}

export async function cancelTask(taskId: string) {
  return request<TaskRecord>(`/tasks/${taskId}/cancel`, {
    method: "PATCH",
  });
}

export async function createTask(payload: {
  brandId?: string;
  taskType: string;
  taskTitle: string;
  modelName?: string;
  pointsCost?: number;
}) {
  return jsonRequest<TaskRecord>("/tasks", "POST", payload);
}

export async function getMedia() {
  return request<MediaRecord[]>("/media");
}

export async function getUserSkills() {
  return request<UserSkillRecord[]>("/user-skills");
}

export async function getUserSkill(skillId: string) {
  return request<UserSkillRecord>(`/user-skills/${skillId}`);
}

export async function updateUserSkill(skillId: string, payload: UpdateUserSkillPayload) {
  return jsonRequest<UserSkillRecord>(`/user-skills/${skillId}`, "PATCH", payload);
}

export async function resetUserSkill(skillId: string) {
  return jsonRequest<UserSkillRecord>(`/user-skills/${skillId}/reset`, "POST", {});
}

export async function createMedia(payload: {
  brandId?: string;
  taskId?: string;
  title: string;
  mediaType: MediaType;
  sourceUrl?: string;
  storageKey: string;
  mimeType?: string;
  fileSize?: number;
}) {
  return jsonRequest<MediaRecord>("/media", "POST", payload);
}

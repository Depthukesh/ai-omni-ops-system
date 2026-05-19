import { jsonRequest, request, requestBlobByUrl } from "./http";

export type ImageTextPlanEntry = {
  title: string;
  badges: string[];
};

export type VideoSegmentAssetEntry = {
  order: number;
  prompt: string;
  videoUrl: string;
  coverImageUrl?: string;
  provider: string;
  modelName?: string;
  providerTaskId?: string;
  renderedDurationSec?: number;
  referenceImageUrl?: string;
  videoAssetId?: string;
};

export type VideoProviderOptionRecord = {
  backendKey: string;
  label: string;
  defaultModel: string;
  recommended: boolean;
  supportsTextToVideo: boolean;
  supportsImageToVideo: boolean;
  displayOrder: number;
};

export type XhsOriginalReferenceTemplateCategoryRecord = {
  id: string;
  label: string;
  count: number;
};

export type XhsOriginalReferenceTemplateRecord = {
  id: string;
  title: string;
  order: number;
  categoryId: string;
  categoryLabel: string;
  fileName: string;
  sourcePath: string;
  assetUrl: string;
};

export type XiaohongshuAccountRole = "BRAND" | "STAFF" | "TALENT";
export type VideoNoteKind = "BRAND_PROMO" | "SPOKEN_SELLING" | "SKIT_SELLING" | "REMIX";
export type VideoWorkflowStage =
  | "QUEUED"
  | "GENERATING_SCRIPT"
  | "GENERATING_STORYBOARD"
  | "WAITING_VIDEO"
  | "GENERATING_VIDEO"
  | "SUCCESS"
  | "FAILED";

export type VideoProgressStepEntry = {
  key: "SCRIPT" | "STORYBOARD" | "VIDEO";
  label: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
};

export type VideoStoryboardRevisionEntry = {
  taskId: string;
  prompt: string;
  imageUrl?: string;
  createdAt: string;
};

export function formatXiaohongshuAccountRoleLabel(role?: XiaohongshuAccountRole | null) {
  switch (role) {
    case "BRAND":
      return "品牌号";
    case "STAFF":
      return "员工号";
    case "TALENT":
      return "达人号";
    default:
      return "品牌号";
  }
}

export type XiaohongshuOriginalWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  accountRole: XiaohongshuAccountRole;
  title: string;
  content: string;
  coverImageUrl?: string;
  imageUrls: string[];
  noteCategory: "原创";
  noteType: "图文";
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  includeMarketingPlan: boolean;
  additionalInstruction?: string;
  hashtags: string[];
  coverText?: ImageTextPlanEntry;
  imageTexts: ImageTextPlanEntry[];
  coverPrompt: string;
  imagePrompts: string[];
  coverReferenceStyle?: string;
  galleryReferenceStyles: string[];
  copyModel?: string;
  imagePromptModel?: string;
  imageGenerationModel?: string;
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type XiaohongshuRewriteWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  accountRole: XiaohongshuAccountRole;
  title: string;
  content: string;
  coverImageUrl?: string;
  imageUrls: string[];
  noteCategory: "二创";
  noteType: "图文";
  sourceMaterialId: string;
  sourceMaterialTitle: string;
  sourceMaterialDescription?: string;
  sourceMaterialUrl?: string;
  sourceMaterialImageUrls: string[];
  productId?: string;
  productName?: string;
  includeMarketingPlan: boolean;
  additionalInstruction?: string;
  hashtags: string[];
  coverText?: ImageTextPlanEntry;
  imageTexts: ImageTextPlanEntry[];
  coverPrompt: string;
  imagePrompts: string[];
  copyModel?: string;
  imagePromptModel?: string;
  imageGenerationModel?: string;
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type XiaohongshuVideoWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  providerTaskId?: string;
  accountRole: XiaohongshuAccountRole;
  videoKind: VideoNoteKind;
  workflowStage: VideoWorkflowStage;
  title: string;
  content: string;
  coverImageUrl?: string;
  storyboardImageUrl?: string;
  videoUrl?: string;
  noteCategory: "原创";
  noteType: "视频";
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  materialId?: string;
  materialTitle?: string;
  materialVideoUrl?: string;
  referenceImageUrl?: string;
  copyAdditionalInstruction?: string;
  videoAdditionalInstruction?: string;
  includeMarketingPlan: boolean;
  requestedVideoProvider: string;
  resolvedVideoProvider: string;
  resolvedVideoModel?: string;
  requestedDurationSec: number;
  renderedDurationSec?: number;
  creativeScript?: string;
  storyboardPrompt?: string;
  progressSteps: VideoProgressStepEntry[];
  storyboardRevisions: VideoStoryboardRevisionEntry[];
  videoPrompt?: string;
  fullVideoPrompt?: string;
  videoReasoning?: string;
  businessScene?: string;
  videoType?: string;
  segmentBrief?: string;
  referenceStrategy?: string;
  padImageStrategy?: string;
  continuityRules: string[];
  segmentPrompts: string[];
  segmentExecutionStatus?: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
  segmentExecutionError?: string;
  segmentAssets: VideoSegmentAssetEntry[];
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export type GenerateXiaohongshuOriginalNoteForm = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  accountRole?: XiaohongshuAccountRole;
  imageCount?: number;
  includeMarketingPlan?: boolean;
  additionalInstruction?: string;
  coverReferenceFile?: File | null;
  galleryReferenceFiles?: File[];
};

export type GenerateXiaohongshuRewriteNoteForm = {
  sourceMaterialId?: string;
  productId?: string;
  accountRole?: XiaohongshuAccountRole;
  includeMarketingPlan?: boolean;
  additionalInstruction?: string;
};

export type GenerateXiaohongshuVideoNoteForm = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  materialId?: string;
  accountRole?: XiaohongshuAccountRole;
  referenceImageFile?: File | null;
  videoKind?: VideoNoteKind;
  copyAdditionalInstruction?: string;
  videoProvider?: string;
  customVideoModelName?: string;
  durationSec?: number;
  includeMarketingPlan?: boolean;
  videoAdditionalInstruction?: string;
};

export async function getXiaohongshuOriginalWorks(brandId: string) {
  return request<{ items: XiaohongshuOriginalWorkRecord[] }>(`/works/brands/${brandId}/xiaohongshu/original`);
}

export async function generateXiaohongshuOriginalWork(brandId: string, form: GenerateXiaohongshuOriginalNoteForm) {
  const coverReferenceImage = form.coverReferenceFile ? await toUploadPayload(form.coverReferenceFile) : undefined;
  const galleryReferenceImages = form.galleryReferenceFiles?.length
    ? await Promise.all(form.galleryReferenceFiles.map((file) => toUploadPayload(file)))
    : undefined;

  return jsonRequest<{ item: XiaohongshuOriginalWorkRecord }>(`/works/brands/${brandId}/xiaohongshu/original/generate`, "POST", {
    calendarItemId: form.calendarItemId,
    customTopicName: form.customTopicName,
    productId: form.productId,
    accountRole: form.accountRole,
    imageCount: form.imageCount,
    includeMarketingPlan: form.includeMarketingPlan,
    additionalInstruction: form.additionalInstruction,
    coverReferenceImage,
    galleryReferenceImages,
  });
}

export async function updateXiaohongshuOriginalWork(
  brandId: string,
  workId: string,
  payload: {
    title?: string;
    content?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuOriginalWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/original/${workId}`,
    "PATCH",
    payload,
  );
}

export async function deleteXiaohongshuOriginalWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/xiaohongshu/original/${workId}`, {
    method: "DELETE",
  });
}

export async function getXiaohongshuRewriteWorks(brandId: string) {
  return request<{ items: XiaohongshuRewriteWorkRecord[] }>(`/works/brands/${brandId}/xiaohongshu/rewrite`);
}

export async function generateXiaohongshuRewriteWork(brandId: string, form: GenerateXiaohongshuRewriteNoteForm) {
  return jsonRequest<{ item: XiaohongshuRewriteWorkRecord }>(`/works/brands/${brandId}/xiaohongshu/rewrite/generate`, "POST", {
    sourceMaterialId: form.sourceMaterialId,
    productId: form.productId,
    accountRole: form.accountRole,
    includeMarketingPlan: form.includeMarketingPlan,
    additionalInstruction: form.additionalInstruction,
  });
}

export async function updateXiaohongshuRewriteWork(
  brandId: string,
  workId: string,
  payload: {
    title?: string;
    content?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuRewriteWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/rewrite/${workId}`,
    "PATCH",
    payload,
  );
}

export async function deleteXiaohongshuRewriteWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/xiaohongshu/rewrite/${workId}`, {
    method: "DELETE",
  });
}

export async function getXiaohongshuVideoWorks(brandId: string) {
  return request<{ items: XiaohongshuVideoWorkRecord[] }>(`/works/brands/${brandId}/xiaohongshu/video`);
}

export async function getXiaohongshuVideoProviders(brandId: string) {
  return request<{ items: VideoProviderOptionRecord[] }>(`/works/brands/${brandId}/xiaohongshu/video/providers`);
}

export async function getXiaohongshuOriginalReferenceTemplates() {
  return request<{
    generatedAt: string;
    storageMode: string;
    categories: XhsOriginalReferenceTemplateCategoryRecord[];
    items: XhsOriginalReferenceTemplateRecord[];
  }>("/works/xiaohongshu/original/reference-templates");
}

export async function downloadXiaohongshuOriginalReferenceTemplateFile(template: XhsOriginalReferenceTemplateRecord) {
  const { blob, fileName, contentType } = await requestBlobByUrl(template.assetUrl);
  return new File([blob], fileName || template.fileName, {
    type: contentType || template.fileName || "image/jpeg",
  });
}

export async function generateXiaohongshuVideoWork(brandId: string, form: GenerateXiaohongshuVideoNoteForm) {
  const referenceImage = form.referenceImageFile ? await toUploadPayload(form.referenceImageFile) : undefined;

  return jsonRequest<{ item: XiaohongshuVideoWorkRecord }>(`/works/brands/${brandId}/xiaohongshu/video/generate`, "POST", {
    calendarItemId: form.calendarItemId,
    customTopicName: form.customTopicName,
    productId: form.productId,
    materialId: form.materialId,
    accountRole: form.accountRole,
    referenceImage,
    videoKind: form.videoKind,
    copyAdditionalInstruction: form.copyAdditionalInstruction,
    videoProvider: form.videoProvider,
    customVideoModelName: form.customVideoModelName,
    durationSec: form.durationSec,
    includeMarketingPlan: form.includeMarketingPlan,
    videoAdditionalInstruction: form.videoAdditionalInstruction,
  });
}

export async function regenerateXiaohongshuVideoStoryboard(
  brandId: string,
  workId: string,
  payload: {
    storyboardPrompt?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuVideoWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/video/${workId}/storyboard/regenerate`,
    "POST",
    payload,
  );
}

export async function continueXiaohongshuVideoGeneration(
  brandId: string,
  workId: string,
  payload?: {
    customVideoModelName?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuVideoWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/video/${workId}/video/generate`,
    "POST",
    payload || {},
  );
}

export async function recoverXiaohongshuVideoGeneration(
  brandId: string,
  payload: {
    workId?: string;
    providerTaskId: string;
    requestedVideoProvider?: string;
  },
) {
  return jsonRequest<{
    recovered: boolean;
    providerTaskId: string;
    thirdPartyStatus: string;
    item: XiaohongshuVideoWorkRecord;
  }>(`/works/brands/${brandId}/xiaohongshu/video/recover`, "POST", payload);
}

export async function updateXiaohongshuVideoWork(
  brandId: string,
  workId: string,
  payload: {
    title?: string;
    content?: string;
    storyboardPrompt?: string;
  },
) {
  return jsonRequest<{ item: XiaohongshuVideoWorkRecord }>(
    `/works/brands/${brandId}/xiaohongshu/video/${workId}`,
    "PATCH",
    payload,
  );
}

export async function deleteXiaohongshuVideoWork(brandId: string, workId: string) {
  return request<{ success: boolean }>(`/works/brands/${brandId}/xiaohongshu/video/${workId}`, {
    method: "DELETE",
  });
}

async function toUploadPayload(file: File) {
  const dataBase64 = await readFileAsBase64(file);
  return {
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    dataBase64,
  };
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

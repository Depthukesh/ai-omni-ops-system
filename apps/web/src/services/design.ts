import { getStoredCurrentBrandId } from "./auth-session";
import { jsonRequest, request } from "./http";

export type DesignModuleKey = "image" | "html" | "deck" | "video";

export type DesignModelOptionRecord = {
  selectionKey: string;
  label: string;
  providerName: string;
  modelName: string;
  recommended: boolean;
};

export type DesignWorkspaceOptionsRecord = {
  brandId: string;
  brandName: string;
  brandProfileSummary: string;
  calendarOptions: Array<{
    id: string;
    label: string;
    topicName: string;
    date: string;
  }>;
  productOptions: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  brandOptions: Array<{
    value: "inject" | "skip";
    label: string;
    description: string;
  }>;
  moduleOptions: Record<
    DesignModuleKey,
    {
      types: string[];
      models: DesignModelOptionRecord[];
      providerCount: number;
      providerLabels: string[];
    }
  >;
};

export type GenerateDesignWorkPayload = {
  module: DesignModuleKey;
  skillSlug?: string;
  title?: string;
  calendarItemId?: string;
  productId?: string;
  injectBrandProfile?: boolean;
  designType?: string;
  referenceImage?: {
    fileName: string;
    contentType: string;
    dataBase64: string;
  };
  modelSelection?: string;
  spec?: string;
  additionalInstruction?: string;
};

export type DesignGeneratedWorkRecord = {
  id: string;
  taskId?: string;
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  module: DesignModuleKey;
  skillSlug?: string;
  skillLabel?: string;
  title: string;
  status: string;
  updatedAt: string;
  summary: string;
  errorDetail?: string;
  spec?: string;
  tags: string[];
  assetUrl?: string;
  htmlContent?: string;
};

export type DesignWorkspaceHistoryRecord = {
  items: DesignGeneratedWorkRecord[];
};

export type DeleteDesignWorkResponse = {
  success: boolean;
};

export type OperationsPromptTemplateCardRecord = {
  id: string;
  title: string;
  preview: string;
  sourceCategory: string;
  sourceFileName: string;
  businessStage: string;
  outputType: string;
  scenarioLabel: string;
  tags: string[];
};

export type OperationsPromptTemplateDetailRecord = OperationsPromptTemplateCardRecord & {
  content: string;
};

export type OperationsPromptCenterOptionsRecord = {
  brandId: string;
  brandName: string;
  brandProfileSummary: string;
  modelSequence: string[];
  calendarOptions: Array<{
    id: string;
    label: string;
    topicName: string;
    date: string;
  }>;
  productOptions: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  brandOptions: Array<{
    value: "inject" | "skip";
    label: string;
    description: string;
  }>;
  filters: {
    businessStages: Array<{ value: string; label: string; count: number }>;
    outputTypes: Array<{ value: string; label: string; count: number }>;
    scenarios: Array<{ value: string; label: string; count: number }>;
  };
  templates: OperationsPromptTemplateCardRecord[];
};

export type GenerateOperationsPromptWorkPayload = {
  templateId: string;
  title?: string;
  injectBrandProfile?: boolean;
  productId?: string;
  calendarItemId?: string;
  userRequirement?: string;
  editedPrompt: string;
};

export type OperationsPromptWorkRecord = {
  id: string;
  taskId?: string;
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  errorDetail?: string;
  tags: string[];
  templateId: string;
  templateTitle: string;
  generatedText?: string;
  promptSnapshot?: string;
  userRequirement?: string;
  modelName?: string;
  usedBrandProfile: boolean;
  usedProductLabel?: string;
  usedCalendarLabel?: string;
};

export type OperationsPromptWorkHistoryRecord = {
  items: OperationsPromptWorkRecord[];
};

export type ImagePromptTemplateCardRecord = {
  id: string;
  title: string;
  preview: string;
  sourceCategory: string;
  sourceFileName: string;
  categoryLabel: string;
  tags: string[];
  previewImageUrl?: string;
};

export type ImagePromptTemplateDetailRecord = ImagePromptTemplateCardRecord & {
  content: string;
};

export type ImagePromptCenterOptionsRecord = {
  brandId: string;
  brandName: string;
  brandProfileSummary: string;
  modelLabel: string;
  calendarOptions: Array<{
    id: string;
    label: string;
    topicName: string;
    date: string;
  }>;
  productOptions: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  brandOptions: Array<{
    value: "inject" | "skip";
    label: string;
    description: string;
  }>;
  filters: {
    categories: Array<{ value: string; label: string; count: number }>;
  };
  templates: ImagePromptTemplateCardRecord[];
};

export type GenerateImagePromptWorkPayload = {
  templateId: string;
  title?: string;
  injectBrandProfile?: boolean;
  productId?: string;
  calendarItemId?: string;
  userRequirement?: string;
  editedPrompt?: string;
};

export type ImagePromptWorkRecord = {
  id: string;
  taskId?: string;
  taskStatus?: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  errorDetail?: string;
  tags: string[];
  templateId: string;
  templateTitle: string;
  assetUrl?: string;
  promptSnapshot?: string;
  userRequirement?: string;
  modelName?: string;
  usedBrandProfile: boolean;
  usedProductLabel?: string;
  usedCalendarLabel?: string;
};

export type ImagePromptWorkHistoryRecord = {
  items: ImagePromptWorkRecord[];
};

const DEMO_BRAND_ID = "br_demo_001";

function resolveBrandId(brandId?: string) {
  return getStoredCurrentBrandId(brandId || DEMO_BRAND_ID) || DEMO_BRAND_ID;
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

export async function getDesignWorkspaceOptions(brandId?: string) {
  return request<DesignWorkspaceOptionsRecord>(`/works/brands/${resolveBrandId(brandId)}/design/options`);
}

export async function getDesignWorkspaceHistory(brandId?: string) {
  return request<DesignWorkspaceHistoryRecord>(`/works/brands/${resolveBrandId(brandId)}/design/history`);
}

export async function deleteDesignHistoryWork(workId: string, brandId?: string) {
  return request<DeleteDesignWorkResponse>(`/works/brands/${resolveBrandId(brandId)}/design/history/${encodeURIComponent(workId)}`, {
    method: "DELETE",
  });
}

export async function generateDesignWork(
  payload: Omit<GenerateDesignWorkPayload, "referenceImage"> & {
    referenceImageFile?: File | null;
  },
  brandId?: string,
) {
  const referenceImage = payload.referenceImageFile ? await toUploadPayload(payload.referenceImageFile) : undefined;
  return jsonRequest<DesignGeneratedWorkRecord>(`/works/brands/${resolveBrandId(brandId)}/design/generate`, "POST", {
    ...payload,
    referenceImage,
  });
}

export async function getOperationsPromptCenterOptions(brandId?: string) {
  return request<OperationsPromptCenterOptionsRecord>(
    `/works/brands/${resolveBrandId(brandId)}/design/operations-prompt-center/options`,
  );
}

export async function getOperationsPromptTemplateDetail(templateId: string, brandId?: string) {
  return request<OperationsPromptTemplateDetailRecord>(
    `/works/brands/${resolveBrandId(brandId)}/design/operations-prompt-center/templates/${encodeURIComponent(templateId)}`,
  );
}

export async function getOperationsPromptWorks(brandId?: string) {
  return request<OperationsPromptWorkHistoryRecord>(
    `/works/brands/${resolveBrandId(brandId)}/design/operations-prompt-center/works`,
  );
}

export async function deleteOperationsPromptWork(workId: string, brandId?: string) {
  return request<DeleteDesignWorkResponse>(
    `/works/brands/${resolveBrandId(brandId)}/design/operations-prompt-center/works/${encodeURIComponent(workId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function generateOperationsPromptWork(payload: GenerateOperationsPromptWorkPayload, brandId?: string) {
  return jsonRequest<OperationsPromptWorkRecord>(
    `/works/brands/${resolveBrandId(brandId)}/design/operations-prompt-center/generate`,
    "POST",
    payload,
  );
}

export async function getImagePromptCenterOptions(brandId?: string) {
  return request<ImagePromptCenterOptionsRecord>(
    `/works/brands/${resolveBrandId(brandId)}/design/image-prompt-center/options`,
  );
}

export async function getImagePromptTemplateDetail(templateId: string, brandId?: string) {
  return request<ImagePromptTemplateDetailRecord>(
    `/works/brands/${resolveBrandId(brandId)}/design/image-prompt-center/templates/${encodeURIComponent(templateId)}`,
  );
}

export async function getImagePromptWorks(brandId?: string) {
  return request<ImagePromptWorkHistoryRecord>(
    `/works/brands/${resolveBrandId(brandId)}/design/image-prompt-center/works`,
  );
}

export async function deleteImagePromptWork(workId: string, brandId?: string) {
  return request<DeleteDesignWorkResponse>(
    `/works/brands/${resolveBrandId(brandId)}/design/image-prompt-center/works/${encodeURIComponent(workId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function generateImagePromptWork(
  payload: GenerateImagePromptWorkPayload & {
    referenceImageFile?: File | null;
  },
  brandId?: string,
) {
  const referenceImage = payload.referenceImageFile ? await toUploadPayload(payload.referenceImageFile) : undefined;
  return jsonRequest<ImagePromptWorkRecord>(
    `/works/brands/${resolveBrandId(brandId)}/design/image-prompt-center/generate`,
    "POST",
    {
      ...payload,
      referenceImage,
    },
  );
}

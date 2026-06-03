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
    }
  >;
};

export type GenerateDesignWorkPayload = {
  module: DesignModuleKey;
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
  module: DesignModuleKey;
  title: string;
  status: string;
  updatedAt: string;
  summary: string;
  tags: string[];
  assetUrl?: string;
  htmlContent?: string;
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

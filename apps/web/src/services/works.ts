import { jsonRequest, request } from "./http";

export type XiaohongshuOriginalWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
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
  additionalInstruction?: string;
  hashtags: string[];
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

export type GenerateXiaohongshuOriginalNoteForm = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  imageCount?: number;
  additionalInstruction?: string;
  coverReferenceFile?: File | null;
  galleryReferenceFiles?: File[];
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
    imageCount: form.imageCount,
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

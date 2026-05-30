import { Buffer } from "node:buffer";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";

const CHANJING_BASE_URL = "https://open-api.chanjing.cc";

export type ChanjingTemplateFigure = {
  type: "whole_body" | "sit_body" | "circle_view";
  cover: string;
  width: number;
  height: number;
  previewVideoUrl?: string;
  bgReplace?: boolean;
};

export type ChanjingTemplateRecord = {
  id: string;
  name: string;
  gender?: string;
  audioManId?: string;
  audioName?: string;
  audioPreview?: string;
  audioLang?: string;
  tagIds: number[];
  tagNames: string[];
  figures: ChanjingTemplateFigure[];
};

export type ChanjingTemplateTagGroup = {
  id: number;
  name: string;
  businessType: number;
  tagList: Array<{
    id: number;
    name: string;
  }>;
};

export type ChanjingCreateVideoPayload = {
  person: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    figure_type?: "whole_body" | "sit_body" | "circle_view";
  };
  audio: {
    type: "tts";
    tts: {
      text: string[];
      speed: number;
      audio_man?: string;
      pitch?: number;
    };
    volume: number;
    language: string;
  };
  bg_color?: string;
  subtitle_config?: {
    show: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    font_size: number;
    color?: string;
    stroke_color?: string;
    stroke_width?: number;
  };
  screen_width: number;
  screen_height: number;
  add_compliance_watermark?: boolean;
};

export type ChanjingVideoDetail = {
  id: string;
  status: number;
  progress: number;
  msg?: string;
  videoUrl?: string;
  subtitleDataUrl?: string;
  createTime?: number;
  previewUrl?: string;
  duration?: number;
  queueStatus?: string;
  queueDesc?: string;
  audioUrls: string[];
};

export type ChanjingUploadService =
  | "customised_person"
  | "prompt_audio"
  | "make_video_audio"
  | "make_video_background"
  | "lip_sync_video"
  | "lip_sync_audio"
  | "ai_creation";

export type ChanjingUploadUrlRecord = {
  signUrl: string;
  fullPath?: string;
  key?: string;
  mimeType: string;
  fileId: string;
};

export type ChanjingFileRecord = {
  id: string;
  service?: string;
  bytes?: number;
  createTime?: number;
  filePath?: string;
  status: number;
  msg?: string;
};

export type ChanjingCustomisedPersonRecord = {
  id: string;
  name: string;
  type?: string;
  picUrl?: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  audioManId?: string;
  status: number;
  errReason?: string;
  isOpen?: boolean;
  reason?: string;
  progress: number;
  createTime?: number;
  support4k?: boolean;
  height4k?: number;
  width4k?: number;
};

type ChanjingResponse<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

@Injectable()
export class ChanjingOpenApiService {
  private readonly tokenCache = new Map<string, { accessToken: string; expireAtMs: number }>();

  async listTemplateTags(credential: string) {
    const accessToken = await this.getAccessToken(credential);
    const response = await this.requestJson<{ list?: unknown[] }>(
      "/open/v1/common/tag_list?business_type=1",
      {
        method: "GET",
        accessToken,
      },
    );
    return (Array.isArray(response.list) ? response.list : []).map((item) => this.normalizeTemplateTagGroup(item));
  }

  async listCommonDigitalPersons(
    credential: string,
    options?: {
      page?: number;
      size?: number;
      sort?: string;
      tagIds?: number[];
    },
  ) {
    const accessToken = await this.getAccessToken(credential);
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(Math.max(1, options?.page || 1)));
    searchParams.set("size", String(Math.min(50, Math.max(1, options?.size || 50))));
    if (options?.sort) {
      searchParams.set("sort", options.sort);
    }
    if (options?.tagIds?.length) {
      searchParams.set("tag_ids", options.tagIds.join(","));
    }
    const response = await this.requestJson<{ list?: unknown[]; page_info?: unknown }>(
      `/open/v1/list_common_dp?${searchParams.toString()}`,
      {
        method: "GET",
        accessToken,
      },
    );
    return {
      list: (Array.isArray(response.list) ? response.list : []).map((item) => this.normalizeTemplate(item)),
      pageInfo: this.normalizePageInfo(response.page_info),
    };
  }

  async createVideo(credential: string, payload: ChanjingCreateVideoPayload) {
    const accessToken = await this.getAccessToken(credential);
    const response = await this.requestJson<string>("/open/v1/create_video", {
      method: "POST",
      accessToken,
      body: payload,
    });
    const taskId = String(response || "").trim();
    if (!taskId) {
      throw new ServiceUnavailableException("蝉镜创建数字人视频失败：未返回任务 ID");
    }
    return taskId;
  }

  async getVideoDetail(credential: string, id: string) {
    const accessToken = await this.getAccessToken(credential);
    const response = await this.requestJson<unknown>(`/open/v1/video?id=${encodeURIComponent(id)}`, {
      method: "GET",
      accessToken,
    });
    return this.normalizeVideoDetail(response);
  }

  async createUploadUrl(
    credential: string,
    options: {
      service: ChanjingUploadService;
      name: string;
    },
  ) {
    const accessToken = await this.getAccessToken(credential);
    const searchParams = new URLSearchParams();
    searchParams.set("service", String(options.service || "").trim());
    searchParams.set("name", String(options.name || "").trim());
    const response = await this.requestJson<unknown>(
      `/open/v1/common/create_upload_url?${searchParams.toString()}`,
      {
        method: "GET",
        accessToken,
      },
    );
    return this.normalizeUploadUrlRecord(response);
  }

  async uploadSignedFile(signUrl: string, payload: { dataBase64: string }, contentType: string) {
    const normalizedUrl = String(signUrl || "").trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      throw new ServiceUnavailableException("蝉镜上传文件失败：未返回有效的签名上传地址。");
    }
    const response = await fetch(normalizedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
      body: Buffer.from(String(payload?.dataBase64 || ""), "base64"),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`蝉镜上传文件失败：${response.status}`);
    }
  }

  async getFileDetail(credential: string, id: string) {
    const accessToken = await this.getAccessToken(credential);
    const response = await this.requestJson<unknown>(
      `/open/v1/common/file_detail?id=${encodeURIComponent(String(id || "").trim())}`,
      {
        method: "GET",
        accessToken,
      },
    );
    return this.normalizeFileRecord(response);
  }

  async createCustomisedPerson(
    credential: string,
    payload: {
      name?: string;
      callback?: string;
      trainType?: "figure" | "voice" | "both";
      language?: string;
      fileId: string;
      errorSkip?: boolean;
      resolutionRate?: 0 | 1;
    },
  ) {
    const accessToken = await this.getAccessToken(credential);
    const response = await this.requestJson<string>("/open/v1/create_customised_person", {
      method: "POST",
      accessToken,
      body: {
        name: payload.name,
        callback: payload.callback,
        train_type: payload.trainType,
        language: payload.language,
        file_id: payload.fileId,
        error_skip: payload.errorSkip,
        resolution_rate: payload.resolutionRate,
      },
    });
    const personId = String(response || "").trim();
    if (!personId) {
      throw new ServiceUnavailableException("蝉镜创建定制数字人失败：未返回数字人 ID");
    }
    return personId;
  }

  async listCustomisedPersons(
    credential: string,
    options?: {
      page?: number;
      pageSize?: number;
    },
  ) {
    const accessToken = await this.getAccessToken(credential);
    const response = await this.requestJson<{ list?: unknown[]; page_info?: unknown }>("/open/v1/list_customised_person", {
      method: "POST",
      accessToken,
      body: {
        page: Math.max(1, options?.page || 1),
        page_size: Math.min(50, Math.max(1, options?.pageSize || 20)),
      },
    });
    return {
      list: (Array.isArray(response.list) ? response.list : []).map((item) => this.normalizeCustomisedPerson(item)),
      pageInfo: this.normalizePageInfo(response.page_info),
    };
  }

  async getCustomisedPersonDetail(credential: string, id: string) {
    const accessToken = await this.getAccessToken(credential);
    const response = await this.requestJson<unknown>(
      `/open/v1/customised_person?id=${encodeURIComponent(String(id || "").trim())}`,
      {
        method: "GET",
        accessToken,
      },
    );
    return this.normalizeCustomisedPerson(response);
  }

  async deleteCustomisedPerson(credential: string, id: string) {
    const accessToken = await this.getAccessToken(credential);
    await this.requestJson<string>("/open/v1/delete_customised_person", {
      method: "POST",
      accessToken,
      body: {
        id: String(id || "").trim(),
      },
    });
    return { success: true };
  }

  private async getAccessToken(credential: string) {
    const { appId, secretKey } = this.parseCredential(credential);
    const cacheKey = `${appId}::${secretKey}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.accessToken && cached.expireAtMs > Date.now() + 60_000) {
      return cached.accessToken;
    }
    const response = await this.requestJson<{ access_token?: string; expire_in?: number }>("/open/v1/access_token", {
      method: "POST",
      body: {
        app_id: appId,
        secret_key: secretKey,
      },
    });
    const accessToken = String(response.access_token || "").trim();
    if (!accessToken) {
      throw new ServiceUnavailableException("蝉镜 AccessToken 获取失败：未返回 access_token");
    }
    const expireAtMs = Number(response.expire_in || 0) * 1000 || Date.now() + 24 * 60 * 60 * 1000;
    this.tokenCache.set(cacheKey, {
      accessToken,
      expireAtMs,
    });
    return accessToken;
  }

  private parseCredential(credential: string) {
    const raw = String(credential || "").trim();
    const [appId = "", secretKey = ""] = raw.split("::");
    if (!appId.trim() || !secretKey.trim()) {
      throw new ServiceUnavailableException("蝉镜凭证格式不正确，请在第三方接口配置中填写 `appId::secretKey`。");
    }
    return {
      appId: appId.trim(),
      secretKey: secretKey.trim(),
    };
  }

  private async requestJson<T>(
    requestPath: string,
    options: {
      method: "GET" | "POST";
      accessToken?: string;
      body?: Record<string, unknown>;
      timeoutMs?: number;
    },
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
    try {
      const response = await fetch(`${CHANJING_BASE_URL}${requestPath}`, {
        method: options.method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(options.accessToken ? { access_token: options.accessToken } : {}),
        },
        body: options.method === "POST" ? JSON.stringify(options.body || {}) : undefined,
        signal: controller.signal,
      });
      const payload = await response.json() as ChanjingResponse<T>;
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `蝉镜接口请求失败：${options.method} ${requestPath} ${response.status}${payload?.msg ? `，${payload.msg}` : ""}`,
        );
      }
      if (Number(payload?.code || 0) !== 0) {
        throw new ServiceUnavailableException(`蝉镜接口返回异常：${payload?.msg || "未知错误"}`);
      }
      return payload.data as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      const message = error instanceof Error && error.name === "AbortError"
        ? "请求超时"
        : error instanceof Error
          ? error.message
          : "未知错误";
      throw new ServiceUnavailableException(`蝉镜接口请求失败：${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeTemplateTagGroup(input: unknown): ChanjingTemplateTagGroup {
    const record = this.asRecord(input);
    const tagList = Array.isArray(record?.tag_list)
      ? record.tag_list.map((item) => {
          const tag = this.asRecord(item);
          return {
            id: Number(tag?.id || 0),
            name: String(tag?.name || "").trim(),
          };
        }).filter((item) => item.id > 0 && item.name)
      : [];
    return {
      id: Number(record?.id || 0),
      name: String(record?.name || "").trim(),
      businessType: Number(record?.business_type || 0),
      tagList,
    };
  }

  private normalizeTemplate(input: unknown): ChanjingTemplateRecord {
    const record = this.asRecord(input);
    const figures = Array.isArray(record?.figures)
      ? record.figures.map((item) => {
          const figure = this.asRecord(item);
          return {
            type: (String(figure?.type || "sit_body").trim() || "sit_body") as ChanjingTemplateFigure["type"],
            cover: String(figure?.cover || figure?.pic_path || "").trim(),
            width: Number(figure?.width || 0),
            height: Number(figure?.height || 0),
            previewVideoUrl: String(figure?.preview_video_url || "").trim() || undefined,
            bgReplace: typeof figure?.bg_replace === "boolean" ? figure.bg_replace : undefined,
          };
        }).filter((item) => item.cover)
      : [];
    return {
      id: String(record?.id || "").trim(),
      name: String(record?.name || "").trim(),
      gender: String(record?.gender || "").trim() || undefined,
      audioManId: String(record?.audio_man_id || "").trim() || undefined,
      audioName: String(record?.audio_name || "").trim() || undefined,
      audioPreview: String(record?.audio_preview || "").trim() || undefined,
      audioLang: String(record?.audio_lang || "").trim() || undefined,
      tagIds: Array.isArray(record?.tag_ids) ? record.tag_ids.map((item) => Number(item || 0)).filter((item) => item > 0) : [],
      tagNames: Array.isArray(record?.tag_names) ? record.tag_names.map((item) => String(item || "").trim()).filter(Boolean) : [],
      figures,
    };
  }

  private normalizeVideoDetail(input: unknown): ChanjingVideoDetail {
    const record = this.asRecord(input);
    return {
      id: String(record?.id || "").trim(),
      status: Number(record?.status || 0),
      progress: Number(record?.progress || 0),
      msg: String(record?.msg || "").trim() || undefined,
      videoUrl: String(record?.video_url || "").trim() || undefined,
      subtitleDataUrl: String(record?.subtitle_data_url || "").trim() || undefined,
      createTime: Number(record?.create_time || 0) || undefined,
      previewUrl: String(record?.preview_url || "").trim() || undefined,
      duration: Number(record?.duration || 0) || undefined,
      queueStatus: String(record?.queue_status || "").trim() || undefined,
      queueDesc: String(record?.queue_desc || "").trim() || undefined,
      audioUrls: Array.isArray(record?.audio_urls) ? record.audio_urls.map((item) => String(item || "").trim()).filter(Boolean) : [],
    };
  }

  private normalizeUploadUrlRecord(input: unknown): ChanjingUploadUrlRecord {
    const record = this.asRecord(input);
    const signUrl = String(record?.sign_url || "").trim();
    const fileId = String(record?.file_id || "").trim();
    if (!signUrl || !fileId) {
      throw new ServiceUnavailableException("蝉镜上传文件失败：未返回完整的上传地址或文件 ID。");
    }
    return {
      signUrl,
      fullPath: String(record?.full_path || "").trim() || undefined,
      key: String(record?.key || "").trim() || undefined,
      mimeType: String(record?.mime_type || "").trim() || "application/octet-stream",
      fileId,
    };
  }

  private normalizeFileRecord(input: unknown): ChanjingFileRecord {
    const record = this.asRecord(input);
    return {
      id: String(record?.id || "").trim(),
      service: String(record?.service || "").trim() || undefined,
      bytes: Number(record?.bytes || 0) || undefined,
      createTime: Number(record?.create_time || 0) || undefined,
      filePath: String(record?.file_path || "").trim() || undefined,
      status: Number(record?.status || 0),
      msg: String(record?.msg || "").trim() || undefined,
    };
  }

  private normalizeCustomisedPerson(input: unknown): ChanjingCustomisedPersonRecord {
    const record = this.asRecord(input);
    return {
      id: String(record?.id || "").trim(),
      name: String(record?.name || "").trim(),
      type: String(record?.type || "").trim() || undefined,
      picUrl: String(record?.pic_url || "").trim() || undefined,
      previewUrl: String(record?.preview_url || "").trim() || undefined,
      width: Number(record?.width || 0) || undefined,
      height: Number(record?.height || 0) || undefined,
      audioManId: String(record?.audio_man_id || "").trim() || undefined,
      status: Number(record?.status || 0),
      errReason: String(record?.err_reason || "").trim() || undefined,
      isOpen: typeof record?.is_open === "number" ? record.is_open === 1 : undefined,
      reason: String(record?.reason || "").trim() || undefined,
      progress: Number(record?.progress || 0),
      createTime: Number(record?.create_time || 0) || undefined,
      support4k: typeof record?.support_4k === "boolean" ? record.support_4k : undefined,
      height4k: Number(record?.height_4k || 0) || undefined,
      width4k: Number(record?.width_4k || 0) || undefined,
    };
  }

  private normalizePageInfo(input: unknown) {
    const record = this.asRecord(input);
    return {
      page: Number(record?.page || 1),
      size: Number(record?.size || 50),
      totalCount: Number(record?.total_count || 0),
      totalPage: Number(record?.total_page || 0),
    };
  }

  private asRecord(input: unknown) {
    return input && typeof input === "object" && !Array.isArray(input)
      ? input as Record<string, unknown>
      : undefined;
  }
}

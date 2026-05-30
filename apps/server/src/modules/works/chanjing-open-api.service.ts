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

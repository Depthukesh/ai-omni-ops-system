import { Buffer } from "node:buffer";
import type { ReadStream } from "node:fs";
import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

const CHANJING_BASE_URL = "https://open-api.chanjing.cc";
const CHANJING_WEB_API_BASE_URL = "https://www.chanjing.cc/api";
const CHANJING_RETRYABLE_STATUSES = new Set([502, 503, 504, 524]);
const CHANJING_REQUEST_MAX_RETRIES = 2;
const CHANJING_REQUEST_RETRY_DELAY_MS = 1_500;

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
  bg?: {
    src_url?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    file_id?: string;
  };
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
    font_id?: string;
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

export type ChanjingCreateLipSyncPayload = {
  video_file_id: string;
  screen_width?: number;
  screen_height?: number;
  backway?: 1 | 2;
  drive_mode?: "" | "random";
  callback?: string;
  model?: 0 | 1;
  audio_type?: "tts" | "audio";
  tts_config?: {
    text: string;
    audio_man_id?: string;
    speed?: number;
    pitch?: number;
  };
  audio_file_id?: string;
  volume?: number;
};

export type ChanjingLipSyncDetail = {
  id: string;
  status: number;
  progress: number;
  msg?: string;
  videoUrl?: string;
  previewUrl?: string;
  duration?: number;
  createTime?: number;
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

export type ChanjingCommonAudioRecord = {
  id: string;
  grade?: number;
  name: string;
  gender?: string;
  lang?: string;
  desc?: string;
  speed?: number;
  pitch?: number;
  audition?: string;
};

export type ChanjingCustomisedAudioRecord = {
  id: string;
  name: string;
  type?: string;
  progress: number;
  audioPath?: string;
  errMsg?: string;
  status?: number;
};

export type ChanjingCreateCustomisedAudioPayload = {
  name: string;
  url: string;
  modelType?: "cicada1.0" | "cicada3.0" | "cicada3.0-turbo";
  language?: "cn" | "en";
  text?: string;
  callback?: string;
};

export type ChanjingCreateAudioTaskPayload = {
  audioMan: string;
  speed: number;
  pitch: number;
  text: {
    text: string;
    plainText?: string;
  };
  fontSize?: number;
  width?: number;
  height?: number;
  callback?: string;
  aigcWatermark?: boolean;
  dialect?: number;
};

export type ChanjingAudioTaskSubtitle = {
  key: string;
  startTime: number;
  endTime: number;
  subtitle: string;
};

export type ChanjingAudioTaskDetail = {
  id: string;
  type?: string;
  status: number;
  text: string[];
  full?: {
    url?: string;
    path?: string;
    duration?: number;
  };
  errMsg?: string;
  errReason?: string;
  subtitles: ChanjingAudioTaskSubtitle[];
};

type ChanjingResponse<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

@Injectable()
export class ChanjingOpenApiService {
  private readonly tokenCache = new Map<string, { accessToken: string; expireAtMs: number }>();
  private readonly logger = new Logger(ChanjingOpenApiService.name);

  async listTemplateTags(credential: string) {
    try {
      const response = await this.requestCredentialJson<{ list?: unknown[] }>(
        credential,
        "/open/v1/common/tag_list?business_type=1",
        {
          method: "GET",
        },
      );
      return this.normalizeTemplateTagGroups(response.list);
    } catch {
      const fallbackResponse = await this.requestCredentialJson<{ list?: unknown[] }>(
        credential,
        "/open/v1/common/tag_list?business_type=1",
        {
          method: "GET",
          baseUrl: CHANJING_WEB_API_BASE_URL,
        },
      );
      return this.normalizeTemplateTagGroups(fallbackResponse.list);
    }
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
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(Math.max(1, options?.page || 1)));
    searchParams.set("size", String(Math.min(50, Math.max(1, options?.size || 50))));
    const normalizedSort = this.normalizeCommonDigitalPersonSort(options?.sort);
    if (normalizedSort) {
      searchParams.set("sort", normalizedSort);
    }
    if (options?.tagIds?.length) {
      searchParams.set("tag_ids", options.tagIds.join(","));
    }
    const requestPath = `/open/v1/list_common_dp?${searchParams.toString()}`;
    // #region debug-point C:chanjing-template-request
    fetch("http://127.0.0.1:7777/event", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "digital-human-502-list",
        runId: "pre-fix",
        hypothesisId: "C",
        location: "apps/server/src/modules/works/chanjing-open-api.service.ts:listCommonDigitalPersons",
        msg: "[DEBUG] 蝉镜模板列表请求开始",
        data: { requestPath, options },
        ts: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    try {
      const response = await this.requestCredentialJson<{ list?: unknown[]; page_info?: unknown }>(
        credential,
        requestPath,
        {
          method: "GET",
        },
      );
      const normalizedList = (Array.isArray(response.list) ? response.list : []).map((item) => this.normalizeTemplate(item));
      const normalizedPageInfo = this.normalizePageInfo(response.page_info);
      // #region debug-point C:chanjing-template-success
      fetch("http://127.0.0.1:7777/event", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "digital-human-502-list",
          runId: "pre-fix",
          hypothesisId: "C",
          location: "apps/server/src/modules/works/chanjing-open-api.service.ts:listCommonDigitalPersons",
          msg: "[DEBUG] 蝉镜模板列表请求成功",
          data: { requestPath, count: normalizedList.length, pageInfo: normalizedPageInfo },
          ts: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return {
        list: normalizedList,
        pageInfo: normalizedPageInfo,
      };
    } catch (error) {
      try {
        const fallbackResponse = await this.requestCredentialJson<{ list?: unknown[]; page_info?: unknown }>(
          credential,
          requestPath,
          {
            method: "GET",
            baseUrl: CHANJING_WEB_API_BASE_URL,
          },
        );
        const normalizedList = (Array.isArray(fallbackResponse.list) ? fallbackResponse.list : []).map((item) => this.normalizeTemplate(item));
        const normalizedPageInfo = this.normalizePageInfo(fallbackResponse.page_info);
        return {
          list: normalizedList,
          pageInfo: normalizedPageInfo,
        };
      } catch {
        // #region debug-point C:chanjing-template-error
        fetch("http://127.0.0.1:7777/event", {
          method: "POST",
          body: JSON.stringify({
            sessionId: "digital-human-502-list",
            runId: "pre-fix",
            hypothesisId: "C",
            location: "apps/server/src/modules/works/chanjing-open-api.service.ts:listCommonDigitalPersons",
            msg: "[DEBUG] 蝉镜模板列表请求失败",
            data: { requestPath, message: error instanceof Error ? error.message : String(error) },
            ts: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        throw error;
      }
    }
  }

  private normalizeCommonDigitalPersonSort(sort?: string) {
    switch (String(sort || "").trim().toLowerCase()) {
      case "":
        return undefined;
      case "latest":
      case "latest_desc":
        return "latest";
      case "hottest":
      case "hot_desc":
        return "hottest";
      default:
        return undefined;
    }
  }

  async createVideo(credential: string, payload: ChanjingCreateVideoPayload) {
    const response = await this.requestCredentialJson<string>(credential, "/open/v1/create_video", {
      method: "POST",
      body: payload,
    });
    const taskId = String(response || "").trim();
    if (!taskId) {
      throw new ServiceUnavailableException("蝉镜创建数字人视频失败：未返回任务 ID");
    }
    return taskId;
  }

  async getVideoDetail(credential: string, id: string) {
    const response = await this.requestCredentialJson<unknown>(credential, `/open/v1/video?id=${encodeURIComponent(id)}`, {
      method: "GET",
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
    const searchParams = new URLSearchParams();
    searchParams.set("service", String(options.service || "").trim());
    searchParams.set("name", String(options.name || "").trim());
    const response = await this.requestCredentialJson<unknown>(
      credential,
      `/open/v1/common/create_upload_url?${searchParams.toString()}`,
      {
        method: "GET",
      },
    );
    return this.normalizeUploadUrlRecord(response);
  }

  async uploadSignedFile(
    signUrl: string,
    payload: { dataBase64?: string } | { stream: ReadStream },
    contentType: string,
  ) {
    const normalizedUrl = String(signUrl || "").trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      throw new ServiceUnavailableException("蝉镜上传文件失败：未返回有效的签名上传地址。");
    }
    const body = "stream" in payload
      ? payload.stream
      : Buffer.from(String(payload?.dataBase64 || ""), "base64");
    const requestInit: RequestInit & { duplex?: "half" } = {
      method: "PUT",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
      body: body as BodyInit,
      duplex: "half",
    };
    const response = await fetch(normalizedUrl, requestInit);
    if (!response.ok) {
      throw new ServiceUnavailableException(`蝉镜上传文件失败：${response.status}`);
    }
  }

  async getFileDetail(credential: string, id: string) {
    const response = await this.requestCredentialJson<unknown>(
      credential,
      `/open/v1/common/file_detail?id=${encodeURIComponent(String(id || "").trim())}`,
      {
        method: "GET",
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
    const response = await this.requestCredentialJson<string>(credential, "/open/v1/create_customised_person", {
      method: "POST",
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
    const response = await this.requestCredentialJson<{ list?: unknown[]; page_info?: unknown }>(credential, "/open/v1/list_customised_person", {
      method: "POST",
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
    const response = await this.requestCredentialJson<unknown>(
      credential,
      `/open/v1/customised_person?id=${encodeURIComponent(String(id || "").trim())}`,
      {
        method: "GET",
      },
    );
    return this.normalizeCustomisedPerson(response);
  }

  async deleteCustomisedPerson(credential: string, id: string) {
    await this.requestCredentialJson<string>(credential, "/open/v1/delete_customised_person", {
      method: "POST",
      body: {
        id: String(id || "").trim(),
      },
    });
    return { success: true };
  }

  async listCommonAudios(
    credential: string,
    options?: {
      page?: number;
      size?: number;
    },
  ) {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(Math.max(1, options?.page || 1)));
    searchParams.set("size", String(Math.min(50, Math.max(1, options?.size || 24))));
    const response = await this.requestCredentialJson<{ list?: unknown[]; page_info?: unknown }>(
      credential,
      `/open/v1/list_common_audio?${searchParams.toString()}`,
      {
        method: "GET",
      },
    );
    return {
      list: (Array.isArray(response.list) ? response.list : []).map((item) => this.normalizeCommonAudio(item)),
      pageInfo: this.normalizePageInfo(response.page_info),
    };
  }

  async createCustomisedAudio(credential: string, payload: ChanjingCreateCustomisedAudioPayload) {
    const response = await this.requestCredentialJson<string>(credential, "/open/v1/create_customised_audio", {
      method: "POST",
      body: {
        name: payload.name,
        url: payload.url,
        model_type: payload.modelType,
        language: payload.language,
        text: payload.text,
        callback: payload.callback,
      },
    });
    const audioId = String(response || "").trim();
    if (!audioId) {
      throw new ServiceUnavailableException("蝉镜创建定制声音失败：未返回声音 ID");
    }
    return audioId;
  }

  async getCustomisedAudioDetail(credential: string, id: string) {
    const response = await this.requestCredentialJson<unknown>(
      credential,
      `/open/v1/customised_audio?id=${encodeURIComponent(String(id || "").trim())}`,
      {
        method: "GET",
      },
    );
    return this.normalizeCustomisedAudio(response);
  }

  async listCustomisedAudios(
    credential: string,
    options?: {
      page?: number;
      pageSize?: number;
    },
  ) {
    const response = await this.requestCredentialJson<{ list?: unknown[]; page_info?: unknown }>(
      credential,
      "/open/v1/list_customised_audio",
      {
        method: "POST",
        body: {
          page: Math.max(1, options?.page || 1),
          page_size: Math.min(50, Math.max(1, options?.pageSize || 24)),
        },
      },
    );
    return {
      list: (Array.isArray(response.list) ? response.list : []).map((item) => this.normalizeCustomisedAudio(item)),
      pageInfo: this.normalizePageInfo(response.page_info),
    };
  }

  async deleteCustomisedAudio(credential: string, id: string) {
    await this.requestCredentialJson<string>(credential, "/open/v1/delete_customised_audio", {
      method: "POST",
      body: {
        id: String(id || "").trim(),
      },
    });
    return { success: true };
  }

  async createAudioTask(credential: string, payload: ChanjingCreateAudioTaskPayload) {
    const response = await this.requestCredentialJson<{ task_id?: string }>(credential, "/open/v1/create_audio_task", {
      method: "POST",
      body: {
        audio_man: payload.audioMan,
        speed: payload.speed,
        pitch: payload.pitch,
        text: {
          text: payload.text.text,
          plain_text: payload.text.plainText,
        },
        font_size: payload.fontSize,
        width: payload.width,
        height: payload.height,
        callback: payload.callback,
        aigc_watermark: payload.aigcWatermark,
        dialect: payload.dialect,
      },
    });
    const taskId = String(response?.task_id || "").trim();
    if (!taskId) {
      throw new ServiceUnavailableException("蝉镜语音合成失败：未返回任务 ID");
    }
    return taskId;
  }

  async getAudioTaskDetail(credential: string, taskId: string) {
    const response = await this.requestCredentialJson<unknown>(credential, "/open/v1/audio_task_state", {
      method: "POST",
      body: {
        task_id: String(taskId || "").trim(),
      },
    });
    return this.normalizeAudioTaskDetail(response);
  }

  async createLipSyncVideo(credential: string, payload: ChanjingCreateLipSyncPayload) {
    const response = await this.requestCredentialJson<string>(credential, "/open/v1/video_lip_sync/create", {
      method: "POST",
      body: payload,
    });
    const taskId = String(response || "").trim();
    if (!taskId) {
      throw new ServiceUnavailableException("蝉镜创建口型驱动任务失败：未返回任务 ID");
    }
    return taskId;
  }

  async listLipSyncVideos(
    credential: string,
    options?: {
      page?: number;
      pageSize?: number;
    },
  ) {
    const response = await this.requestCredentialJson<{ list?: unknown[]; page_info?: unknown }>(credential, "/open/v1/video_lip_sync/list", {
      method: "POST",
      body: {
        page: Math.max(1, options?.page || 1),
        page_size: Math.min(50, Math.max(1, options?.pageSize || 20)),
      },
    });
    return {
      list: (Array.isArray(response.list) ? response.list : []).map((item) => this.normalizeLipSyncDetail(item)),
      pageInfo: this.normalizePageInfo(response.page_info),
    };
  }

  async getLipSyncVideoDetail(credential: string, id: string) {
    const response = await this.requestCredentialJson<unknown>(
      credential,
      `/open/v1/video_lip_sync/detail?id=${encodeURIComponent(String(id || "").trim())}`,
      {
        method: "GET",
      },
    );
    return this.normalizeLipSyncDetail(response);
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

  private async requestCredentialJson<T>(
    credential: string,
    requestPath: string,
    options: {
      method: "GET" | "POST";
      body?: Record<string, unknown>;
      timeoutMs?: number;
      baseUrl?: string;
    },
  ) {
    try {
      return await this.requestJson<T>(requestPath, {
        ...options,
        accessToken: await this.getAccessToken(credential),
      });
    } catch (error) {
      if (!this.isExpiredAccessTokenError(error)) {
        throw error;
      }
      this.clearAccessTokenCache(credential);
      return this.requestJson<T>(requestPath, {
        ...options,
        accessToken: await this.getAccessToken(credential),
      });
    }
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

  private clearAccessTokenCache(credential: string) {
    const { appId, secretKey } = this.parseCredential(credential);
    this.tokenCache.delete(`${appId}::${secretKey}`);
  }

  private isExpiredAccessTokenError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    const normalized = message.toLowerCase();
    return normalized.includes("accesstoken已失效")
      || normalized.includes("access token已失效")
      || normalized.includes("access_token已失效")
      || normalized.includes("access token invalid")
      || normalized.includes("invalid access_token")
      || normalized.includes("token已失效");
  }

  private async requestJson<T>(
    requestPath: string,
    options: {
      method: "GET" | "POST";
      accessToken?: string;
      body?: Record<string, unknown>;
      timeoutMs?: number;
      baseUrl?: string;
    },
  ) {
    for (let attempt = 0; attempt <= CHANJING_REQUEST_MAX_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
      try {
        const response = await fetch(`${options.baseUrl || CHANJING_BASE_URL}${requestPath}`, {
          method: options.method,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(options.accessToken ? { access_token: options.accessToken } : {}),
          },
          body: options.method === "POST" ? JSON.stringify(options.body || {}) : undefined,
          signal: controller.signal,
        });
        const rawText = await response.text();
        const payload = this.tryParseResponsePayload<T>(rawText, response.headers.get("content-type"));
        const responseMessage = this.buildResponseMessage(payload?.msg, rawText);

        if (!response.ok) {
          if (this.shouldRetryGatewayFailure(response.status, responseMessage, rawText) && attempt < CHANJING_REQUEST_MAX_RETRIES) {
            await this.waitBeforeRetry(options.method, requestPath, attempt + 1, response.status, responseMessage);
            continue;
          }
          throw new ServiceUnavailableException(
            `蝉镜接口请求失败：${options.method} ${requestPath} ${response.status}${responseMessage ? `，${responseMessage}` : ""}`,
          );
        }
        if (!payload) {
          if (this.shouldRetryGatewayFailure(undefined, "", rawText) && attempt < CHANJING_REQUEST_MAX_RETRIES) {
            await this.waitBeforeRetry(options.method, requestPath, attempt + 1, undefined, this.buildPlainTextSummary(rawText));
            continue;
          }
          throw new ServiceUnavailableException(
            `蝉镜接口返回非 JSON：${options.method} ${requestPath}${rawText ? `，${this.buildPlainTextSummary(rawText)}` : ""}`,
          );
        }
        if (Number(payload?.code || 0) !== 0) {
          const apiMessage = String(payload?.msg || "未知错误").trim();
          if (this.shouldRetryGatewayFailure(undefined, apiMessage, rawText) && attempt < CHANJING_REQUEST_MAX_RETRIES) {
            await this.waitBeforeRetry(options.method, requestPath, attempt + 1, undefined, apiMessage);
            continue;
          }
          throw new ServiceUnavailableException(`蝉镜接口返回异常：${apiMessage || "未知错误"}`);
        }
        return payload.data as T;
      } catch (error) {
        if (error instanceof ServiceUnavailableException) {
          if (this.shouldRetryGatewayFailure(undefined, error.message, "") && attempt < CHANJING_REQUEST_MAX_RETRIES) {
            await this.waitBeforeRetry(options.method, requestPath, attempt + 1, undefined, error.message);
            continue;
          }
          throw error;
        }
        const message = error instanceof Error && error.name === "AbortError"
          ? "请求超时"
          : error instanceof Error
            ? error.message
            : "未知错误";
        if (this.shouldRetryGatewayFailure(undefined, message, "") && attempt < CHANJING_REQUEST_MAX_RETRIES) {
          await this.waitBeforeRetry(options.method, requestPath, attempt + 1, undefined, message);
          continue;
        }
        throw new ServiceUnavailableException(`蝉镜接口请求失败：${message}`);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new ServiceUnavailableException(`蝉镜接口请求失败：${options.method} ${requestPath} 超过重试次数`);
  }

  private tryParseResponsePayload<T>(rawText: string, contentType: string | null) {
    const normalizedText = String(rawText || "").trim();
    const normalizedContentType = String(contentType || "").toLowerCase();
    if (!normalizedText) {
      return undefined;
    }
    const looksLikeJson = normalizedContentType.includes("application/json")
      || normalizedText.startsWith("{")
      || normalizedText.startsWith("[");
    if (!looksLikeJson) {
      return undefined;
    }
    try {
      return JSON.parse(normalizedText) as ChanjingResponse<T>;
    } catch {
      return undefined;
    }
  }

  private buildResponseMessage(apiMessage: string | undefined, rawText: string) {
    const normalizedApiMessage = String(apiMessage || "").trim();
    if (normalizedApiMessage) {
      return normalizedApiMessage;
    }
    return this.buildPlainTextSummary(rawText);
  }

  private buildPlainTextSummary(rawText: string) {
    const normalized = String(rawText || "").replace(/\s+/g, " ").trim();
    if (!normalized) {
      return "";
    }
    return normalized.length > 160 ? `${normalized.slice(0, 160)}...` : normalized;
  }

  private shouldRetryGatewayFailure(status?: number, message?: string, rawText?: string) {
    if (typeof status === "number" && CHANJING_RETRYABLE_STATUSES.has(status)) {
      return true;
    }
    const normalized = `${message || ""} ${rawText || ""}`.toLowerCase();
    return normalized.includes("502 bad gateway")
      || normalized.includes("503 service unavailable")
      || normalized.includes("504 gateway timeout")
      || normalized.includes("524")
      || normalized.includes("upstream")
      || normalized.includes("fetch failed")
      || normalized.includes("socket hang up")
      || normalized.includes("econnreset")
      || normalized.includes("request timeout")
      || normalized.includes("请求超时");
  }

  private async waitBeforeRetry(
    method: string,
    requestPath: string,
    attemptNumber: number,
    status?: number,
    message?: string,
  ) {
    this.logger.warn(
      `蝉镜接口重试第 ${attemptNumber} 次：${method} ${requestPath}${status ? ` ${status}` : ""}${message ? `，${message}` : ""}`,
    );
    await new Promise((resolve) => setTimeout(resolve, CHANJING_REQUEST_RETRY_DELAY_MS * attemptNumber));
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

  private normalizeTemplateTagGroups(input: unknown[] | undefined) {
    return (Array.isArray(input) ? input : []).map((item) => this.normalizeTemplateTagGroup(item));
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

  private normalizeCommonAudio(input: unknown): ChanjingCommonAudioRecord {
    const record = this.asRecord(input);
    return {
      id: String(record?.id || "").trim(),
      grade: Number(record?.grade || 0) || undefined,
      name: String(record?.name || "").trim(),
      gender: String(record?.gender || "").trim() || undefined,
      lang: String(record?.lang || "").trim() || undefined,
      desc: String(record?.desc || "").trim() || undefined,
      speed: typeof record?.speed === "number" ? record.speed : Number(record?.speed || 0) || undefined,
      pitch: typeof record?.pitch === "number" ? record.pitch : Number(record?.pitch || 0) || undefined,
      audition: String(record?.audition || "").trim() || undefined,
    };
  }

  private normalizeCustomisedAudio(input: unknown): ChanjingCustomisedAudioRecord {
    const record = this.asRecord(input);
    return {
      id: String(record?.id || "").trim(),
      name: String(record?.name || "").trim(),
      type: String(record?.type || "").trim() || undefined,
      progress: Number(record?.progress || 0),
      audioPath: String(record?.audio_path || "").trim() || undefined,
      errMsg: String(record?.err_msg || "").trim() || undefined,
      status: typeof record?.status === "number" ? record.status : Number(record?.status || 0) || undefined,
    };
  }

  private normalizeAudioTaskDetail(input: unknown): ChanjingAudioTaskDetail {
    const record = this.asRecord(input);
    const full = this.asRecord(record?.full);
    return {
      id: String(record?.id || "").trim(),
      type: String(record?.type || "").trim() || undefined,
      status: Number(record?.status || 0),
      text: Array.isArray(record?.text) ? record.text.map((item) => String(item || "").trim()).filter(Boolean) : [],
      full: full
        ? {
            url: String(full.url || "").trim() || undefined,
            path: String(full.path || "").trim() || undefined,
            duration: typeof full.duration === "number" ? full.duration : Number(full.duration || 0) || undefined,
          }
        : undefined,
      errMsg: String(record?.errMsg || "").trim() || undefined,
      errReason: String(record?.errReason || "").trim() || undefined,
      subtitles: Array.isArray(record?.subtitles)
        ? record.subtitles.map((item) => {
            const subtitle = this.asRecord(item);
            return {
              key: String(subtitle?.key || "").trim(),
              startTime: Number(subtitle?.start_time || 0),
              endTime: Number(subtitle?.end_time || 0),
              subtitle: String(subtitle?.subtitle || "").trim(),
            };
          }).filter((item) => item.subtitle)
        : [],
    };
  }

  private normalizeLipSyncDetail(input: unknown): ChanjingLipSyncDetail {
    const record = this.asRecord(input);
    return {
      id: String(record?.id || "").trim(),
      status: Number(record?.status || 0),
      progress: Number(record?.progress || 0),
      msg: String(record?.msg || "").trim() || undefined,
      videoUrl: String(record?.video_url || "").trim() || undefined,
      previewUrl: String(record?.preview_url || "").trim() || undefined,
      duration: Number(record?.duration || 0) || undefined,
      createTime: Number(record?.create_time || 0) || undefined,
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

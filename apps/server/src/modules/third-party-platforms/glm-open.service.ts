import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ThirdPartyPlatformsService } from "./third-party-platforms.service";

type GlmRequestOptions = {
  requestId?: string;
  userId?: string;
  timeoutMs?: number;
};

type GlmAudioOptions = GlmRequestOptions & {
  fileName?: string;
  mimeType?: string;
  model?: string;
};

type GlmFileParserOptions = GlmAudioOptions & {
  fileType?: string;
};

export type GlmTranscriptResult = {
  requestId: string;
  model: string;
  text: string;
  segments: Array<{
    text: string;
    startTime?: number;
    endTime?: number;
  }>;
};

export type GlmReaderResult = {
  requestId: string;
  title: string;
  description: string;
  content: string;
  url: string;
};

export type GlmFileParserResult = {
  requestId: string;
  taskId: string;
  status: string;
  content: string;
  parsingResultUrl?: string;
};

@Injectable()
export class GlmOpenService {
  private static readonly BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
  private static readonly CHAT_COMPLETIONS_PATH = "/chat/completions";
  private static readonly AUDIO_TRANSCRIPTIONS_PATH = "/audio/transcriptions";
  private static readonly FILE_PARSER_SYNC_PATH = "/files/parser/sync";
  private static readonly READER_PATH = "/reader";
  private static readonly DEFAULT_TIMEOUT_MS = 180000;
  private static readonly VIDEO_TIMEOUT_MS = 300000;
  private static readonly READER_TIMEOUT_MS = 120000;

  constructor(private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService) {}

  async extractVideoTranscript(
    brandId: string,
    videoUrl: string,
    options: GlmRequestOptions = {},
  ): Promise<GlmTranscriptResult> {
    const normalizedVideoUrl = this.normalizeHttpUrl(videoUrl);
    if (!normalizedVideoUrl) {
      throw new BadRequestException("视频地址无效，暂时无法提取文案");
    }
    const { apiKey } = await this.resolveCredential(brandId);
    const requestId = this.buildRequestId(options.requestId);
    const payload = await this.requestJson(
      GlmOpenService.CHAT_COMPLETIONS_PATH,
      apiKey,
      {
        model: "glm-5v-turbo",
        stream: false,
        request_id: requestId,
        user_id: this.normalizeUserId(options.userId, brandId),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "video_url",
                video_url: {
                  url: normalizedVideoUrl,
                },
              },
              {
                type: "text",
                text: "请只提取这个视频中的中文语音文案。要求：1. 只输出可听到的口播/对白，不要描述画面；2. 去掉语气词和明显口误；3. 按自然段整理；4. 如果没有清晰语音，就返回“未识别到清晰语音内容”。",
              },
            ],
          },
        ],
      },
      options.timeoutMs || GlmOpenService.VIDEO_TIMEOUT_MS,
    );
    return {
      requestId: this.readString(payload, "request_id") || requestId,
      model: this.readString(payload, "model") || "glm-5v-turbo",
      text: this.extractChatMessageText(payload),
      segments: [],
    };
  }

  async transcribeAudioFile(
    brandId: string,
    audioBuffer: Buffer,
    options: GlmAudioOptions = {},
  ): Promise<GlmTranscriptResult> {
    if (!audioBuffer?.length) {
      throw new BadRequestException("音频内容为空，暂时无法识别");
    }
    const { apiKey } = await this.resolveCredential(brandId);
    const requestId = this.buildRequestId(options.requestId);
    const model = String(options.model || "").trim() || "glm-4-voice";
    const form = new FormData();
    form.append("model", model);
    form.append("stream", "false");
    form.append("request_id", requestId);
    form.append("user_id", this.normalizeUserId(options.userId, brandId));
    form.append(
      "file",
      new Blob([audioBuffer], {
        type: options.mimeType || "audio/wav",
      }),
      options.fileName || "audio.wav",
    );

    const payload = await this.requestForm(
      GlmOpenService.AUDIO_TRANSCRIPTIONS_PATH,
      apiKey,
      form,
      options.timeoutMs || GlmOpenService.DEFAULT_TIMEOUT_MS,
    );
    return {
      requestId: this.readString(payload, "request_id") || requestId,
      model: this.readString(payload, "model") || model,
      text: this.readString(payload, "text") || this.extractChatMessageText(payload),
      segments: this.readSegments(payload),
    };
  }

  async parseFile(
    brandId: string,
    buffer: Buffer,
    options: GlmFileParserOptions = {},
  ): Promise<GlmFileParserResult> {
    if (!buffer?.length) {
      throw new BadRequestException("文件内容为空，暂时无法解析");
    }
    const glmFileType = this.normalizeFileParserType(options.fileType || options.fileName || "");
    if (!glmFileType) {
      throw new BadRequestException("当前文件类型暂不支持通过 GLM 文件解析");
    }
    const { apiKey } = await this.resolveCredential(brandId);
    const form = new FormData();
    form.append("tool_type", "prime-sync");
    form.append("file_type", glmFileType);
    form.append(
      "file",
      new Blob([buffer], {
        type: options.mimeType || "application/octet-stream",
      }),
      options.fileName || `knowledge-file.${glmFileType.toLowerCase()}`,
    );
    const payload = await this.requestForm(
      GlmOpenService.FILE_PARSER_SYNC_PATH,
      apiKey,
      form,
      options.timeoutMs || GlmOpenService.DEFAULT_TIMEOUT_MS,
    );
    return {
      requestId: this.readString(payload, "request_id") || "",
      taskId: this.readString(payload, "task_id") || "",
      status: this.readString(payload, "status") || "",
      content: this.readString(payload, "content") || "",
      parsingResultUrl: this.readString(payload, "parsing_result_url") || undefined,
    };
  }

  async readWebpage(
    brandId: string,
    url: string,
    options: GlmRequestOptions = {},
  ): Promise<GlmReaderResult> {
    const normalizedUrl = this.normalizeHttpUrl(url);
    if (!normalizedUrl) {
      throw new BadRequestException("网页地址无效，暂时无法读取");
    }
    const { apiKey } = await this.resolveCredential(brandId);
    const requestId = this.buildRequestId(options.requestId);
    const payload = await this.requestJson(
      GlmOpenService.READER_PATH,
      apiKey,
      {
        url: normalizedUrl,
        timeout: 20,
        no_cache: false,
        return_format: "text",
        retain_images: false,
      },
      options.timeoutMs || GlmOpenService.READER_TIMEOUT_MS,
    );
    const readerResult = this.readObject(payload, "reader_result");
    return {
      requestId: this.readString(payload, "request_id") || requestId,
      title: this.readString(readerResult, "title") || "",
      description: this.readString(readerResult, "description") || "",
      content: this.readString(readerResult, "content") || "",
      url: this.readString(readerResult, "url") || normalizedUrl,
    };
  }

  private async resolveCredential(brandId: string) {
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(brandId, [GlmOpenService.BASE_URL]);
    if (resolution.status === "resolved" && resolution.apiKeys.length) {
      return {
        apiKey: this.normalizeApiKey(resolution.apiKeys[0]),
      };
    }
    if (resolution.status === "brand-api-key-missing") {
      throw new ServiceUnavailableException("当前品牌尚未配置 GLM 平台共享 API Key");
    }
    throw new ServiceUnavailableException("当前品牌未匹配到可用的 GLM 平台配置");
  }

  private normalizeApiKey(value: string) {
    return String(value || "").trim().replace(/^Bearer\s+/i, "");
  }

  private normalizeUserId(userId: string | undefined, brandId: string) {
    const normalized = String(userId || "").trim();
    return normalized && normalized.length >= 6 ? normalized.slice(0, 128) : `brand-${brandId}`.slice(0, 128);
  }

  private buildRequestId(explicit?: string) {
    const normalized = String(explicit || "").trim();
    return normalized || randomUUID();
  }

  private normalizeHttpUrl(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "";
    }
    try {
      const target = new URL(normalized);
      if (target.protocol !== "http:" && target.protocol !== "https:") {
        return "";
      }
      return target.toString();
    } catch {
      return "";
    }
  }

  private normalizeFileParserType(value: string) {
    const target = String(value || "").trim().toLowerCase();
    if (!target) {
      return "";
    }
    if (target.endsWith(".pdf")) {
      return "PDF";
    }
    if (target.endsWith(".docx")) {
      return "DOCX";
    }
    if (target.endsWith(".doc")) {
      return "DOC";
    }
    if (target.endsWith(".xls")) {
      return "XLS";
    }
    if (target.endsWith(".xlsx")) {
      return "XLSX";
    }
    if (target.endsWith(".ppt")) {
      return "PPT";
    }
    if (target.endsWith(".pptx")) {
      return "PPTX";
    }
    if (target.endsWith(".csv")) {
      return "CSV";
    }
    if (target.endsWith(".txt")) {
      return "TXT";
    }
    if (target.endsWith(".md") || target.endsWith(".markdown")) {
      return "MD";
    }
    if (target.endsWith(".html") || target.endsWith(".htm")) {
      return "HTML";
    }
    if (target.endsWith(".png")) {
      return "PNG";
    }
    if (target.endsWith(".jpg")) {
      return "JPG";
    }
    if (target.endsWith(".jpeg")) {
      return "JPEG";
    }
    if (target.endsWith(".bmp")) {
      return "BMP";
    }
    if (target.endsWith(".gif")) {
      return "GIF";
    }
    if (target.endsWith(".webp")) {
      return "WEBP";
    }
    if (target.endsWith(".heic")) {
      return "HEIC";
    }
    if (target.endsWith(".heif")) {
      return "HEIF";
    }
    if (target.endsWith(".jp2")) {
      return "JP2";
    }
    if (target.endsWith(".tif") || target.endsWith(".tiff")) {
      return "TIFF";
    }
    return "";
  }

  private async requestJson(
    requestPath: string,
    apiKey: string,
    body: Record<string, unknown>,
    timeoutMs: number,
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${GlmOpenService.BASE_URL}${requestPath}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return await this.readJsonResponse(response, requestPath);
    } catch (error) {
      throw this.describeRequestError(error, requestPath);
    } finally {
      clearTimeout(timer);
    }
  }

  private async requestForm(
    requestPath: string,
    apiKey: string,
    form: FormData,
    timeoutMs: number,
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${GlmOpenService.BASE_URL}${requestPath}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
        signal: controller.signal,
      });
      return await this.readJsonResponse(response, requestPath);
    } catch (error) {
      throw this.describeRequestError(error, requestPath);
    } finally {
      clearTimeout(timer);
    }
  }

  private async readJsonResponse(response: Response, requestPath: string) {
    if (!response.ok) {
      const snippet = await this.readResponseSnippet(response);
      const normalizedMessage = this.normalizeProviderErrorMessage(response.status, snippet);
      throw new ServiceUnavailableException(
        normalizedMessage || `GLM 请求失败 ${requestPath}：${response.status}${snippet ? `，${snippet}` : ""}`,
      );
    }
    return await response.json() as Record<string, unknown>;
  }

  private async readResponseSnippet(response: Response) {
    try {
      const text = (await response.text()).trim();
      if (!text) {
        return "";
      }
      return text.length > 200 ? `${text.slice(0, 200)}...` : text;
    } catch {
      return "";
    }
  }

  private describeRequestError(error: unknown, requestPath: string) {
    if (error instanceof ServiceUnavailableException) {
      return error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      return new ServiceUnavailableException(`GLM 请求超时：${requestPath}`);
    }
    const message = error instanceof Error ? error.message : "未知错误";
    return new ServiceUnavailableException(`GLM 网络请求失败：${requestPath}${message ? `，${message}` : ""}`);
  }

  private normalizeProviderErrorMessage(status: number, snippet: string) {
    const normalized = String(snippet || "").toLowerCase();
    if (
      status === 402
      || /余额|欠费|充值|insufficient|quota|credit|balance|bill|payment/i.test(normalized)
    ) {
      return "GLM 平台当前 API Key 余额不足，请充值后重新提取视频文案。";
    }
    if (status === 401 || /invalid api key|unauthorized|鉴权|token/i.test(normalized)) {
      return "GLM 平台 API Key 无效或未授权，请先到个人中心检查第三方接口配置。";
    }
    if (status === 429 || /rate limit|too many requests|频率|限流/i.test(normalized)) {
      return "GLM 平台当前请求过于频繁，请稍后重试。";
    }
    return "";
  }

  private extractChatMessageText(payload: Record<string, unknown>) {
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const firstChoice = choices[0];
    const message = this.readObject(firstChoice as Record<string, unknown>, "message");
    const content = message?.content;
    if (typeof content === "string") {
      return content.trim();
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (!item || typeof item !== "object") {
            return "";
          }
          const block = item as Record<string, unknown>;
          return this.readString(block, "text")
            || this.readString(block, "content")
            || this.readString(block, "output_text")
            || "";
        })
        .filter(Boolean)
        .join("\n")
        .trim();
    }
    return "";
  }

  private readSegments(payload: Record<string, unknown>) {
    const segments = Array.isArray(payload.segments) ? payload.segments : [];
    return segments
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Record<string, unknown>;
        const text = this.readString(record, "text");
        if (!text) {
          return null;
        }
        return {
          text,
          startTime: this.readNumber(record, "start"),
          endTime: this.readNumber(record, "end"),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  private readObject(record: Record<string, unknown> | undefined, key: string) {
    const value = record?.[key];
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  }

  private readString(record: Record<string, unknown> | undefined, key: string) {
    const value = record?.[key];
    return typeof value === "string" ? value.trim() : "";
  }

  private readNumber(record: Record<string, unknown> | undefined, key: string) {
    const value = Number(record?.[key]);
    return Number.isFinite(value) ? value : undefined;
  }
}

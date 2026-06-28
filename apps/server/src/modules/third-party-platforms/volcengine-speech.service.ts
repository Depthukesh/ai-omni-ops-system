import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ThirdPartyPlatformsService } from "./third-party-platforms.service";

type SpeechCredential =
  | {
      mode: "apiKey";
      apiKey: string;
    }
  | {
      mode: "legacy";
      appId: string;
      accessKey: string;
    };

type SpeechRequestOptions = {
  language?: string;
  userId?: string;
  requestId?: string;
  mimeType?: string;
  fileName?: string;
};

export type VolcengineSpeechTranscriptResult = {
  requestId: string;
  text: string;
  durationMs?: number;
  utterances: Array<{
    text: string;
    startTime?: number;
    endTime?: number;
  }>;
};

@Injectable()
export class VolcengineSpeechService {
  private static readonly BASE_URL = "https://openspeech.bytedance.com";
  private static readonly FLASH_PATH = "/api/v3/auc/bigmodel/recognize/flash";
  private static readonly FILE_SUBMIT_PATH = "/api/v3/auc/bigmodel/submit";
  private static readonly FILE_QUERY_PATH = "/api/v3/auc/bigmodel/query";
  private static readonly FLASH_RESOURCE_ID = "volc.bigasr.auc_turbo";
  private static readonly FILE_RESOURCE_ID = "volc.seedasr.auc";
  private static readonly DEFAULT_TIMEOUT_MS = 120000;
  private static readonly FILE_QUERY_INTERVAL_MS = 2000;
  private static readonly FILE_QUERY_MAX_ATTEMPTS = 30;

  constructor(private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService) {}

  async transcribeShortAudio(
    brandId: string,
    audioBuffer: Buffer,
    options: SpeechRequestOptions = {},
  ): Promise<VolcengineSpeechTranscriptResult> {
    const requestId = options.requestId || randomUUID();
    const credential = await this.resolveBrandCredential(brandId);
    const response = await this.postJson(
      VolcengineSpeechService.FLASH_PATH,
      this.buildHeaders(credential, VolcengineSpeechService.FLASH_RESOURCE_ID, requestId),
      {
        user: {
          uid: options.userId || brandId || "ai-omni-ops-system",
        },
        audio: {
          data: audioBuffer.toString("base64"),
          format: this.resolveAudioFormat(options),
          language: options.language || "zh-CN",
        },
        request: {
          model_name: "bigmodel",
        },
      },
      VolcengineSpeechService.DEFAULT_TIMEOUT_MS,
    );
    return this.normalizeTranscriptResult(requestId, response);
  }

  async transcribeAudioFile(
    brandId: string,
    audioBuffer: Buffer,
    options: SpeechRequestOptions = {},
  ): Promise<VolcengineSpeechTranscriptResult> {
    const requestId = options.requestId || randomUUID();
    const credential = await this.resolveBrandCredential(brandId);
    const headers = this.buildHeaders(credential, VolcengineSpeechService.FILE_RESOURCE_ID, requestId);
    await this.postJson(
      VolcengineSpeechService.FILE_SUBMIT_PATH,
      headers,
      {
        user: {
          uid: options.userId || brandId || "ai-omni-ops-system",
        },
        audio: {
          data: audioBuffer.toString("base64"),
          format: this.resolveAudioFormat(options),
          language: options.language || "zh-CN",
        },
        request: {
          model_name: "bigmodel",
        },
      },
      VolcengineSpeechService.DEFAULT_TIMEOUT_MS,
    );

    for (let attempt = 0; attempt < VolcengineSpeechService.FILE_QUERY_MAX_ATTEMPTS; attempt += 1) {
      await this.sleep(VolcengineSpeechService.FILE_QUERY_INTERVAL_MS);
      const response = await this.postJson(
        VolcengineSpeechService.FILE_QUERY_PATH,
        headers,
        {},
        VolcengineSpeechService.DEFAULT_TIMEOUT_MS,
      );
      const result = this.normalizeTranscriptResult(requestId, response, { allowEmpty: true });
      if (result.text) {
        return result;
      }
    }

    throw new ServiceUnavailableException("豆包语音录音文件识别超时，请稍后重试");
  }

  private async resolveBrandCredential(brandId: string): Promise<SpeechCredential> {
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(brandId, [
      VolcengineSpeechService.BASE_URL,
    ]);
    if (resolution.status !== "resolved") {
      throw new ServiceUnavailableException(
        `当前品牌尚未配置${resolution.platform?.name || "豆包语音平台"}共享凭证，无法执行语音识别`,
      );
    }
    const rawCredential = String(resolution.apiKeys[0] || "").trim();
    if (!rawCredential) {
      throw new ServiceUnavailableException("当前品牌尚未配置豆包语音凭证，无法执行语音识别");
    }
    return this.parseCredential(rawCredential);
  }

  private parseCredential(value: string): SpeechCredential {
    const normalized = String(value || "").trim();
    const composite = normalized.split("::").map((item) => item.trim()).filter(Boolean);
    if (composite.length >= 2) {
      return {
        mode: "legacy",
        appId: composite[0],
        accessKey: composite[1],
      };
    }
    return {
      mode: "apiKey",
      apiKey: normalized,
    };
  }

  private buildHeaders(credential: SpeechCredential, resourceId: string, requestId: string) {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Api-Request-Id": requestId,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Sequence": "-1",
    };
    if (credential.mode === "apiKey") {
      headers["X-Api-Key"] = credential.apiKey;
      return headers;
    }
    headers["X-Api-App-Key"] = credential.appId;
    headers["X-Api-Access-Key"] = credential.accessKey;
    return headers;
  }

  private resolveAudioFormat(options: Pick<SpeechRequestOptions, "mimeType" | "fileName">) {
    const candidates = [
      String(options.fileName || "").trim().toLowerCase(),
      String(options.mimeType || "").trim().toLowerCase(),
    ];
    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }
      if (candidate.endsWith(".wav") || candidate.includes("audio/wav") || candidate.includes("audio/x-wav")) {
        return "wav";
      }
      if (candidate.endsWith(".mp3") || candidate.includes("audio/mpeg") || candidate.includes("audio/mp3")) {
        return "mp3";
      }
      if (candidate.endsWith(".ogg") || candidate.includes("audio/ogg") || candidate.includes("opus")) {
        return "ogg";
      }
      if (candidate.endsWith(".m4a") || candidate.includes("audio/mp4") || candidate.includes("audio/m4a")) {
        return "m4a";
      }
      if (candidate.endsWith(".aac") || candidate.includes("audio/aac")) {
        return "aac";
      }
      if (candidate.endsWith(".flac") || candidate.includes("audio/flac")) {
        return "flac";
      }
    }
    return "wav";
  }

  private async postJson(
    requestPath: string,
    headers: Record<string, string>,
    body: Record<string, unknown>,
    timeoutMs: number,
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${VolcengineSpeechService.BASE_URL}${requestPath}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `${requestPath} 请求失败：${response.status}${responseText ? `，${this.trimMessage(responseText)}` : ""}`,
        );
      }
      return this.parseJsonSafely(responseText);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new ServiceUnavailableException(`${requestPath} 请求超时`);
      }
      throw new ServiceUnavailableException(
        `${requestPath} 网络请求失败：${error instanceof Error ? error.message : "未知错误"}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private normalizeTranscriptResult(
    requestId: string,
    payload: Record<string, unknown>,
    options: { allowEmpty?: boolean } = {},
  ): VolcengineSpeechTranscriptResult {
    const result = this.asObject(payload.result);
    const utterances = this.asArray(result.utterances)
      .map((item) => {
        const record = this.asObject(item);
        const text = String(record.text || "").trim();
        if (!text) {
          return null;
        }
        return {
          text,
          startTime: this.toNumber(record.start_time),
          endTime: this.toNumber(record.end_time),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const text = String(result.text || "").trim() || utterances.map((item) => item.text).join(" ").trim();
    if (!text && !options.allowEmpty) {
      throw new ServiceUnavailableException("豆包语音识别成功返回，但未解析到可用文本");
    }
    const audioInfo = this.asObject(payload.audio_info);
    return {
      requestId,
      text,
      durationMs: this.toNumber(audioInfo.duration),
      utterances,
    };
  }

  private parseJsonSafely(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized || normalized === "{}") {
      return {};
    }
    try {
      return JSON.parse(normalized) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException(`豆包语音返回了无法解析的响应：${this.trimMessage(normalized)}`);
    }
  }

  private trimMessage(value: string) {
    const normalized = String(value || "").trim();
    return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized;
  }

  private asObject(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  }

  private asArray(value: unknown) {
    return Array.isArray(value) ? value : [];
  }

  private toNumber(value: unknown) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : undefined;
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

import { createHash, createHmac } from "node:crypto";
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ThirdPartyPlatformsService } from "./third-party-platforms.service";

const VOLCENGINE_MUSIC_OPENAPI_DEFAULT_REGION = "cn-beijing";
const VOLCENGINE_MUSIC_OPENAPI_DEFAULT_SERVICE = "imagination";
const VOLCENGINE_MUSIC_OPENAPI_DEFAULT_HOST = "open.volcengineapi.com";
const VOLCENGINE_MUSIC_OPENAPI_VERSION = "2024-08-12";

type VolcengineMusicCredential = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  host: string;
  service: string;
};

type VolcengineMusicTaskType = "song" | "bgm";

export type VolcengineMusicCreateTaskResult = {
  taskType: VolcengineMusicTaskType;
  taskId: string;
  predictedWaitTime?: number;
  request: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export type VolcengineMusicQueryTaskResult = {
  taskId: string;
  status?: number;
  progress?: number;
  failureReason?: {
    code?: number;
    message?: string;
    raw?: Record<string, unknown>;
  };
  songDetail: {
    audioUrl?: string;
    captions?: string;
    lyrics?: string;
    duration?: number;
    genre?: string;
    mood?: string;
    gender?: string;
    tosPath?: string;
    callbackUrl?: string;
    timbre?: string;
    prompt?: string;
    instrument?: string;
    genreExtra?: string;
    key?: string;
    kmode?: string;
    tempo?: string;
    scene?: string;
    lang?: string;
    styleInfo?: string;
    raw: Record<string, unknown>;
  };
  raw: Record<string, unknown>;
};

@Injectable()
export class VolcengineMusicService {
  constructor(private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService) {}

  async createSongTask(brandId: string, payload?: Record<string, unknown>): Promise<VolcengineMusicCreateTaskResult> {
    const credential = await this.resolveCredential(brandId);
    const request = this.normalizeSongPayload(payload);
    const raw = await this.callOpenApi(credential, "GenSongForTime", request);
    const result = this.asRecord(raw.Result);
    const taskId = this.readOptionalString(result.TaskID);
    if (!taskId) {
      throw new ServiceUnavailableException("火山音乐生成接口未返回 TaskID，请稍后重试。");
    }
    return {
      taskType: "song",
      taskId,
      predictedWaitTime: this.readOptionalNumber(result.PredictedWaitTime),
      request,
      raw,
    };
  }

  async createBgmTask(brandId: string, payload?: Record<string, unknown>): Promise<VolcengineMusicCreateTaskResult> {
    const credential = await this.resolveCredential(brandId);
    const request = this.normalizeBgmPayload(payload);
    const raw = await this.callOpenApi(credential, "GenBGMForTime", request);
    const result = this.asRecord(raw.Result);
    const taskId = this.readOptionalString(result.TaskID);
    if (!taskId) {
      throw new ServiceUnavailableException("火山纯音乐生成接口未返回 TaskID，请稍后重试。");
    }
    return {
      taskType: "bgm",
      taskId,
      predictedWaitTime: this.readOptionalNumber(result.PredictedWaitTime),
      request,
      raw,
    };
  }

  async querySongTask(brandId: string, taskId: string): Promise<VolcengineMusicQueryTaskResult> {
    const normalizedTaskId = String(taskId || "").trim();
    if (!normalizedTaskId) {
      throw new BadRequestException("请提供 taskId");
    }
    const credential = await this.resolveCredential(brandId);
    const raw = await this.callOpenApi(credential, "QuerySong", { TaskID: normalizedTaskId });
    const result = this.asRecord(raw.Result);
    const detail = this.asRecord(result.SongDetail);
    const failureReason = this.asRecord(result.FailureReason);
    return {
      taskId: this.readOptionalString(result.TaskID) || normalizedTaskId,
      status: this.readOptionalNumber(result.Status),
      progress: this.readOptionalNumber(result.Progress),
      failureReason: Object.keys(failureReason).length
        ? {
            code: this.readOptionalNumber(failureReason.Code),
            message: this.readOptionalString(failureReason.Msg) || this.readOptionalString(failureReason.Message),
            raw: failureReason,
          }
        : undefined,
      songDetail: {
        audioUrl: this.readOptionalString(detail.AudioUrl),
        captions: this.readOptionalString(detail.Captions),
        lyrics: this.readOptionalString(detail.Lyrics),
        duration: this.readOptionalNumber(detail.Duration),
        genre: this.readOptionalString(detail.Genre),
        mood: this.readOptionalString(detail.Mood),
        gender: this.readOptionalString(detail.Gender),
        tosPath: this.readOptionalString(detail.TosPath),
        callbackUrl: this.readOptionalString(detail.CallbackURL),
        timbre: this.readOptionalString(detail.Timbre),
        prompt: this.readOptionalString(detail.Prompt),
        instrument: this.readOptionalString(detail.Instrument),
        genreExtra: this.readOptionalString(detail.GenreExtra),
        key: this.readOptionalString(detail.Key),
        kmode: this.readOptionalString(detail.Kmode),
        tempo: this.readOptionalString(detail.Tempo),
        scene: this.readOptionalString(detail.Scene),
        lang: this.readOptionalString(detail.Lang),
        styleInfo: this.readOptionalString(detail.StyleInfo),
        raw: detail,
      },
      raw,
    };
  }

  private async resolveCredential(brandId: string): Promise<VolcengineMusicCredential> {
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(brandId, [
      "https://open.volcengineapi.com",
    ]);
    if (resolution.status === "resolved") {
      const apiKey = String(resolution.apiKeys[0] || "").trim();
      if (apiKey) {
        return this.parseCredential(apiKey);
      }
    }
    throw new ServiceUnavailableException(
      "当前品牌尚未配置火山音乐 OpenAPI 凭证，请先在个人中心第三方平台中按 `accessKeyId::secretAccessKey` 格式填写，必要时可追加 `::cn-beijing::open.volcengineapi.com::imagination`。",
    );
  }

  private parseCredential(rawCredential: string): VolcengineMusicCredential {
    const parts = String(rawCredential || "").split("::").map((item) => item.trim()).filter(Boolean);
    if (parts.length < 2) {
      throw new ServiceUnavailableException(
        "火山音乐 OpenAPI 凭证格式不正确，请按 `accessKeyId::secretAccessKey` 重新填写。",
      );
    }
    return {
      accessKeyId: parts[0],
      secretAccessKey: parts[1],
      region: parts[2] || VOLCENGINE_MUSIC_OPENAPI_DEFAULT_REGION,
      host: parts[3] || VOLCENGINE_MUSIC_OPENAPI_DEFAULT_HOST,
      service: parts[4] || VOLCENGINE_MUSIC_OPENAPI_DEFAULT_SERVICE,
    };
  }

  private async callOpenApi(
    credential: VolcengineMusicCredential,
    action: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const bodyText = JSON.stringify(body || {});
    const query = this.buildOpenApiQuery({
      Action: action,
      Version: VOLCENGINE_MUSIC_OPENAPI_VERSION,
    });
    const headers = this.signOpenApiRequest(credential, {
      method: "POST",
      canonicalQuery: query,
      bodyText,
      contentType: "application/json",
    });
    const response = await fetch(`https://${credential.host}/?${query}`, {
      method: "POST",
      headers,
      body: bodyText,
    });
    const rawText = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = rawText ? JSON.parse(rawText) as Record<string, unknown> : {};
    } catch {
      payload = {};
    }
    const responseMetadata = this.asRecord(payload.ResponseMetadata);
    const errorRecord = this.asRecord(responseMetadata.Error);
    const code = this.readOptionalNumber(payload.Code);
    const message = this.readOptionalString(errorRecord.Message)
      || this.readOptionalString(payload.Message)
      || this.readOptionalString(responseMetadata.ErrorMessage)
      || rawText.trim();
    if (!response.ok || errorRecord.Message || (typeof code === "number" && code !== 0)) {
      throw new ServiceUnavailableException(message || `${action} 调用失败，请稍后重试。`);
    }
    return payload;
  }

  private normalizeSongPayload(payload?: Record<string, unknown>) {
    const source = this.asRecord(payload);
    const lyrics = this.pickText(source, ["Lyrics", "lyrics"]);
    const prompt = this.pickText(source, ["Prompt", "prompt", "Text", "text"]);
    if (!lyrics && !prompt) {
      throw new BadRequestException("生成人声歌曲时，请至少提供 Lyrics 或 Prompt。");
    }
    return this.compactRecord({
      ...(lyrics ? { Lyrics: lyrics } : {}),
      ...(prompt ? { Prompt: prompt } : {}),
      ModelVersion: this.pickText(source, ["ModelVersion", "modelVersion", "Version", "version"]),
      Genre: this.pickText(source, ["Genre", "genre"]),
      Mood: this.pickText(source, ["Mood", "mood"]),
      Gender: this.pickText(source, ["Gender", "gender"]),
      Timbre: this.pickText(source, ["Timbre", "timbre"]),
      Duration: this.pickInteger(source, ["Duration", "duration"]),
      CallbackURL: this.pickText(source, ["CallbackURL", "callbackUrl"]),
      SkipCopyCheck: this.pickBoolean(source, ["SkipCopyCheck", "skipCopyCheck"]),
      TosBucket: this.pickText(source, ["TosBucket", "tosBucket"]),
      ImplicitWaterMark: this.pickImplicitWaterMark(source, ["ImplicitWaterMark", "implicitWaterMark"]),
      GenreExtra: this.pickText(source, ["GenreExtra", "genreExtra"]),
      Key: this.pickText(source, ["Key", "key"]),
      Kmode: this.pickText(source, ["Kmode", "kmode"]),
      Tempo: this.pickText(source, ["Tempo", "tempo"]),
      Instrument: this.pickText(source, ["Instrument", "instrument"]),
      Scene: this.pickText(source, ["Scene", "scene"]),
      Lang: this.pickText(source, ["Lang", "lang"]),
      VodFormat: this.pickText(source, ["VodFormat", "vodFormat"]),
    });
  }

  private normalizeBgmPayload(payload?: Record<string, unknown>) {
    const source = this.asRecord(payload);
    const text = this.pickText(source, ["Text", "text", "Prompt", "prompt"]);
    if (!text) {
      throw new BadRequestException("生成纯音乐时，请提供 Text。");
    }
    return this.compactRecord({
      Text: text,
      TosBucket: this.pickText(source, ["TosBucket", "tosBucket"]),
      CallbackURL: this.pickText(source, ["CallbackURL", "callbackUrl"]),
      Duration: this.pickInteger(source, ["Duration", "duration"]),
      EnableInputRewrite: this.pickBoolean(source, ["EnableInputRewrite", "enableInputRewrite"]),
      Segments: this.pickSegments(source, ["Segments", "segments"]),
      Version: this.pickText(source, ["Version", "version", "ModelVersion", "modelVersion"]),
      ImplicitWaterMark: this.pickImplicitWaterMark(source, ["ImplicitWaterMark", "implicitWaterMark"]),
    });
  }

  private pickImplicitWaterMark(source: Record<string, unknown>, keys: string[]) {
    const value = this.pickValue(source, keys);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    const watermark = this.compactRecord({
      ContentProducer: this.pickText(record, ["ContentProducer", "contentProducer"]),
      ProduceId: this.pickText(record, ["ProduceId", "produceId"]),
      ContentPropagator: this.pickText(record, ["ContentPropagator", "contentPropagator"]),
      PropagateId: this.pickText(record, ["PropagateId", "propagateId"]),
      Enable: this.pickBoolean(record, ["Enable", "enable"]),
    });
    return Object.keys(watermark).length ? watermark : undefined;
  }

  private pickSegments(source: Record<string, unknown>, keys: string[]) {
    const value = this.pickValue(source, keys);
    if (!Array.isArray(value)) {
      return undefined;
    }
    const segments = value
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return undefined;
        }
        const record = item as Record<string, unknown>;
        const normalized = this.compactRecord({
          Name: this.pickText(record, ["Name", "name"]),
          Duration: this.pickInteger(record, ["Duration", "duration"]),
        });
        return normalized.Name && typeof normalized.Duration === "number" ? normalized : undefined;
      })
      .filter((item): item is Record<string, unknown> => Boolean(item));
    return segments.length ? segments : undefined;
  }

  private signOpenApiRequest(
    credential: VolcengineMusicCredential,
    params: {
      method: "POST";
      canonicalQuery: string;
      bodyText: string;
      contentType: string;
    },
  ) {
    const xDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const shortDate = xDate.slice(0, 8);
    const contentSha = createHash("sha256").update(params.bodyText || "", "utf8").digest("hex");
    const canonicalHeaderEntries = [
      `content-type:${params.contentType}`,
      `host:${credential.host}`,
      `x-content-sha256:${contentSha}`,
      `x-date:${xDate}`,
    ];
    const signedHeaders = canonicalHeaderEntries
      .map((item) => item.split(":")[0])
      .join(";");
    const canonicalHeaders = canonicalHeaderEntries.join("\n");
    const canonicalRequest = [
      params.method,
      "/",
      params.canonicalQuery,
      `${canonicalHeaders}\n`,
      signedHeaders,
      contentSha,
    ].join("\n");
    const credentialScope = `${shortDate}/${credential.region}/${credential.service}/request`;
    const stringToSign = [
      "HMAC-SHA256",
      xDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
    ].join("\n");
    const dateKey = createHmac("sha256", credential.secretAccessKey).update(shortDate, "utf8").digest();
    const regionKey = createHmac("sha256", dateKey).update(credential.region, "utf8").digest();
    const serviceKey = createHmac("sha256", regionKey).update(credential.service, "utf8").digest();
    const signingKey = createHmac("sha256", serviceKey).update("request", "utf8").digest();
    const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
    return {
      "Content-Type": params.contentType,
      Host: credential.host,
      "X-Date": xDate,
      "X-Content-Sha256": contentSha,
      Authorization: `HMAC-SHA256 Credential=${credential.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
  }

  private buildOpenApiQuery(params: Record<string, string>) {
    return Object.keys(params)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => `${this.encodeOpenApiComponent(key)}=${this.encodeOpenApiComponent(params[key] || "")}`)
      .join("&");
  }

  private encodeOpenApiComponent(value: string) {
    return encodeURIComponent(String(value || ""))
      .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  }

  private compactRecord(record: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ""),
    );
  }

  private pickValue(source: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
        return source[key];
      }
    }
    return undefined;
  }

  private pickText(source: Record<string, unknown>, keys: string[]) {
    const value = this.pickValue(source, keys);
    return this.readOptionalString(value);
  }

  private pickInteger(source: Record<string, unknown>, keys: string[]) {
    const value = this.pickValue(source, keys);
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
    }
    return undefined;
  }

  private pickBoolean(source: Record<string, unknown>, keys: string[]) {
    const value = this.pickValue(source, keys);
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "y"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no", "n"].includes(normalized)) {
        return false;
      }
    }
    return undefined;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private readOptionalString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private readOptionalNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }
}

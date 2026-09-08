import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { BadRequestException, Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service";

const execFileAsync = promisify(execFile);

type LocalAsrEngine = "paraformer" | "whisper";

type LocalAsrRequestOptions = {
  requestId?: string;
  fileName?: string;
  mimeType?: string;
  language?: string;
};

export type LocalAsrTranscriptResult = {
  requestId: string;
  text: string;
  engine: LocalAsrEngine;
  model: string;
  attemptedEngines: LocalAsrEngine[];
  fallbackUsed: boolean;
};

@Injectable()
export class LocalAsrService {
  private readonly logger = new Logger(LocalAsrService.name);

  constructor(
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
  ) {}

  async transcribeVideoFromUrl(videoUrl: string, options: LocalAsrRequestOptions = {}): Promise<LocalAsrTranscriptResult> {
    const normalizedUrl = this.normalizeHttpUrl(videoUrl);
    if (!normalizedUrl) {
      throw new BadRequestException("视频地址无效，暂时无法提取文案");
    }
    const requestId = options.requestId || randomUUID();
    const downloaded = await this.downloadRemoteVideo(normalizedUrl);
    return this.transcribeVideoBuffer(downloaded.buffer, {
      ...options,
      requestId,
      fileName: options.fileName || downloaded.fileName,
      mimeType: options.mimeType || downloaded.contentType,
    });
  }

  async transcribeVideoBuffer(videoBuffer: Buffer, options: LocalAsrRequestOptions = {}): Promise<LocalAsrTranscriptResult> {
    if (!videoBuffer?.length) {
      throw new BadRequestException("视频内容为空，暂时无法提取文案");
    }
    const requestId = options.requestId || randomUUID();
    const tempRoot = await mkdtemp(join(tmpdir(), "ai-omni-local-asr-"));
    const inputExt = this.resolveInputExtension(options.fileName, options.mimeType);
    const inputPath = join(tempRoot, `source${inputExt}`);
    const audioPath = join(tempRoot, "audio.wav");
    try {
      await writeFile(inputPath, videoBuffer);
      await this.extractAudioTrack(inputPath, audioPath);
      return await this.transcribeAudioFile(audioPath, requestId, options.language);
    } finally {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async transcribeAudioFile(audioPath: string, requestId: string, language?: string) {
    const engines = this.resolveEngineSequence();
    const errors: string[] = [];
    for (const [index, engine] of engines.entries()) {
      try {
        const payload = await this.runLocalAsrScript(engine, audioPath, requestId, language);
        const text = String(payload.text || "").trim();
        if (!text) {
          throw new ServiceUnavailableException(`${engine} 未返回可用文案`);
        }
        return {
          requestId,
          text,
          engine,
          model: String(payload.model || "").trim() || this.getEngineModelName(engine),
          attemptedEngines: engines.slice(0, index + 1),
          fallbackUsed: index > 0,
        } satisfies LocalAsrTranscriptResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误";
        errors.push(`${engine}: ${message}`);
        this.logger.warn(`Local ASR engine ${engine} failed: ${message}`);
      }
    }
    throw new ServiceUnavailableException(`本地视频文案提取失败：${errors.join("；")}`);
  }

  private resolveEngineSequence() {
    const primary = this.appConfigService.getVideoTranscriptAsrPrimary();
    const fallback = this.appConfigService.getVideoTranscriptAsrFallback();
    const sequence = [primary, fallback].filter(Boolean) as LocalAsrEngine[];
    if (!sequence.length) {
      throw new ServiceUnavailableException("当前未启用任何本地视频文案提取引擎，请先配置 Paraformer 或 Whisper。");
    }
    return Array.from(new Set(sequence));
  }

  private async runLocalAsrScript(engine: LocalAsrEngine, audioPath: string, requestId: string, language?: string) {
    const pythonBin = this.appConfigService.getLocalAsrPythonBin();
    const scriptPath = this.appConfigService.getLocalAsrScriptPath();
    const args = [
      scriptPath,
      "--engine",
      engine,
      "--audio",
      audioPath,
      "--request-id",
      requestId,
      "--language",
      String(language || this.appConfigService.getDefaultTranscriptLanguage() || "zh"),
    ];
    if (engine === "paraformer") {
      args.push("--model", this.appConfigService.getParaformerModelName());
    }
    if (engine === "whisper") {
      args.push("--model", this.appConfigService.getWhisperModelName());
      args.push("--device", this.appConfigService.getWhisperDevice());
      args.push("--compute-type", this.appConfigService.getWhisperComputeType());
    }
    const result = await execFileAsync(pythonBin, args, {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
      env: {
        ...process.env,
        HF_HUB_DISABLE_XET: process.env.HF_HUB_DISABLE_XET || "1",
      },
    });
    const rawOutput = String(result.stdout || "").trim();
    if (!rawOutput) {
      const stderr = String(result.stderr || "").trim();
      throw new ServiceUnavailableException(stderr || `${engine} 未返回可解析结果`);
    }
    const candidates = Array.from(
      new Set([
        rawOutput,
        ...rawOutput
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .reverse(),
      ]),
    );
    for (const candidate of candidates) {
      if (!candidate.startsWith("{") || !candidate.endsWith("}")) {
        continue;
      }
      try {
        return JSON.parse(candidate) as { text?: string; model?: string };
      } catch {
        // Continue trying other candidate lines.
      }
    }
    throw new ServiceUnavailableException(`${engine} 返回结果无法解析：${rawOutput.slice(0, 240)}`);
  }

  private async extractAudioTrack(inputPath: string, outputPath: string) {
    const binary = ffmpegInstaller.path;
    if (!binary) {
      throw new ServiceUnavailableException("当前环境未找到 ffmpeg，无法从视频中抽取音频");
    }
    try {
      await execFileAsync(
        binary,
        [
          "-y",
          "-i",
          inputPath,
          "-vn",
          "-ac",
          "1",
          "-ar",
          "16000",
          "-c:a",
          "pcm_s16le",
          outputPath,
        ],
        {
          encoding: "utf8",
          windowsHide: true,
          maxBuffer: 8 * 1024 * 1024,
          timeout: 5 * 60 * 1000,
        },
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      throw new ServiceUnavailableException(`抽取视频音频失败：${detail}`);
    }
  }

  private async downloadRemoteVideo(videoUrl: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5 * 60 * 1000);
    try {
      const response = await fetch(videoUrl, {
        method: "GET",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ServiceUnavailableException(`下载视频失败：${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "video/mp4";
      const parsedUrl = new URL(videoUrl);
      const fileName = basename(parsedUrl.pathname || "") || "video.mp4";
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType,
        fileName,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      throw new ServiceUnavailableException(`下载视频失败：${detail}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private resolveInputExtension(fileName?: string, mimeType?: string) {
    const explicitExt = extname(String(fileName || "").trim()).toLowerCase();
    if (explicitExt) {
      return explicitExt;
    }
    const normalizedMime = String(mimeType || "").trim().toLowerCase();
    if (normalizedMime.includes("quicktime")) {
      return ".mov";
    }
    if (normalizedMime.includes("webm")) {
      return ".webm";
    }
    if (normalizedMime.includes("mpeg") || normalizedMime.includes("mpg")) {
      return ".mpeg";
    }
    return ".mp4";
  }

  private normalizeHttpUrl(value: string) {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return "";
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "";
      }
      parsed.hash = "";
      return parsed.toString();
    } catch {
      return "";
    }
  }

  private getEngineModelName(engine: LocalAsrEngine) {
    return engine === "paraformer"
      ? this.appConfigService.getParaformerModelName()
      : this.appConfigService.getWhisperModelName();
  }
}

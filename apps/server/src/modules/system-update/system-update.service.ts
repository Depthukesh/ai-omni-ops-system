import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { BadGatewayException, BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service";

type PersistedUpdatePhase =
  | "IDLE"
  | "AVAILABLE"
  | "DOWNLOADING"
  | "READY_TO_APPLY"
  | "APPLYING"
  | "SUCCEEDED"
  | "FAILED"
  | "UNSUPPORTED";

type PersistedUpdateState = {
  phase: PersistedUpdatePhase;
  message?: string;
  checkedAt?: string;
  downloadedAt?: string;
  appliedAt?: string;
  failedAt?: string;
  latestTagName?: string;
  downloadedReleaseTag?: string;
  downloadedZipPath?: string;
  downloadedChecksumPath?: string;
  expectedSha256?: string;
  updaterRunPath?: string;
  updaterConfigPath?: string;
};

type RemoteReleaseAsset = {
  name: string;
  size: number;
  downloadUrl: string;
};

type RemoteReleaseInfo = {
  tagName: string;
  name: string;
  htmlUrl: string;
  publishedAt: string;
  body: string;
  zipAsset: RemoteReleaseAsset | null;
  checksumAsset: RemoteReleaseAsset | null;
  checksumValue: string | null;
};

type CurrentBuildInfo = {
  version: string;
  runtimeMode: "standard" | "local-single-user";
  generatedAt: string | null;
  buildName: string | null;
  installRoot: string | null;
  projectRoot: string;
  canApplyUpdate: boolean;
  applyBlockedReason: string | null;
};

type LatestReleaseResult = {
  release: RemoteReleaseInfo | null;
  errorMessage: string | null;
  checkedAt: string;
};

type ApplyUpdateResult = {
  accepted: boolean;
  phase: PersistedUpdatePhase;
  message: string;
  updaterRunPath: string;
};

type DownloadReleaseResult = {
  tagName: string;
  zipPath: string;
  checksumPath: string;
  checksumValue: string;
};

const LATEST_RELEASE_CACHE_TTL_MS = 30_000;
const LOCAL_SINGLE_USER_ZIP_NAME = "AiOmniOps-local-single-user-win-x64.zip";
const LOCAL_SINGLE_USER_CHECKSUM_NAME = `${LOCAL_SINGLE_USER_ZIP_NAME}.sha256`;

function safeReadJson<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function normalizeIsoDate(value: string | undefined | null) {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveDateTime(value: string | null | undefined) {
  const normalized = normalizeIsoDate(value);
  return normalized ? new Date(normalized).getTime() : 0;
}

function parseChecksumValue(content: string) {
  const match = String(content || "").match(/\b([a-fA-F0-9]{64})\b/);
  return match?.[1]?.toLowerCase() || null;
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "未知错误");
}

@Injectable()
export class SystemUpdateService {
  private latestReleaseCache:
    | {
        expiresAt: number;
        value: LatestReleaseResult;
      }
    | undefined;

  constructor(private readonly appConfigService: AppConfigService) {}

  async getStatus(options?: { forceRemote?: boolean }) {
    const current = this.getCurrentBuildInfo();
    const persistedState = this.readPersistedState();
    const latestResult = await this.getLatestRelease({
      force: Boolean(options?.forceRemote),
    });

    const latest = latestResult.release;
    const updateAvailable = this.computeUpdateAvailable(current, latest);
    const phase = this.resolvePhase(current, persistedState, latest, updateAvailable);

    return {
      supported: current.runtimeMode === "local-single-user",
      current,
      latest,
      phase,
      updateAvailable,
      message: this.resolveMessage(current, persistedState, latestResult.errorMessage, updateAvailable),
      checkedAt: latestResult.checkedAt,
      downloadedReleaseTag: persistedState?.downloadedReleaseTag || null,
      downloadedAt: persistedState?.downloadedAt || null,
      appliedAt: persistedState?.appliedAt || null,
      failedAt: persistedState?.failedAt || null,
      githubRepo: this.getReleaseRepository(),
    };
  }

  async checkForUpdates() {
    return this.getStatus({ forceRemote: true });
  }

  async downloadLatestUpdate() {
    this.ensureLocalSingleUserMode();
    const current = this.getCurrentBuildInfo();
    this.ensureUpdateApplyReady(current);

    const latestResult = await this.getLatestRelease({ force: true });
    const latest = latestResult.release;
    if (!latest) {
      throw new BadGatewayException(latestResult.errorMessage || "当前无法获取最新发布信息");
    }
    if (!latest.zipAsset || !latest.checksumValue) {
      throw new BadGatewayException("最新发布缺少可下载安装包或 SHA256 校验文件");
    }

    await this.writePersistedState({
      ...(this.readPersistedState() || {}),
      phase: "DOWNLOADING",
      message: "正在下载最新安装包并校验完整性。",
      checkedAt: latestResult.checkedAt,
      latestTagName: latest.tagName,
      failedAt: undefined,
    });

    try {
      const result = await this.downloadRelease(latest);
      await this.writePersistedState({
        phase: "READY_TO_APPLY",
        message: `安装包已准备完成，可开始升级：${latest.tagName}`,
        checkedAt: latestResult.checkedAt,
        downloadedAt: new Date().toISOString(),
        latestTagName: latest.tagName,
        downloadedReleaseTag: result.tagName,
        downloadedZipPath: result.zipPath,
        downloadedChecksumPath: result.checksumPath,
        expectedSha256: result.checksumValue,
        appliedAt: undefined,
        failedAt: undefined,
      });
    } catch (error) {
      await this.writePersistedState({
        ...(this.readPersistedState() || {}),
        phase: "FAILED",
        message: `下载安装包失败：${readErrorMessage(error)}`,
        checkedAt: latestResult.checkedAt,
        latestTagName: latest.tagName,
        failedAt: new Date().toISOString(),
      });
      throw error;
    }

    return this.getStatus({ forceRemote: false });
  }

  async applyLatestUpdate(): Promise<ApplyUpdateResult> {
    this.ensureLocalSingleUserMode();
    const current = this.getCurrentBuildInfo();
    this.ensureUpdateApplyReady(current);

    let persistedState = this.readPersistedState();
    const latestResult = await this.getLatestRelease({ force: true });
    const latest = latestResult.release;
    if (!latest) {
      throw new BadGatewayException(latestResult.errorMessage || "当前无法获取最新发布信息");
    }

    const downloadedReady =
      persistedState?.phase === "READY_TO_APPLY"
      && persistedState.downloadedReleaseTag === latest.tagName
      && persistedState.downloadedZipPath
      && existsSync(persistedState.downloadedZipPath)
      && persistedState.expectedSha256;

    if (!downloadedReady) {
      await this.downloadLatestUpdate();
      persistedState = this.readPersistedState();
    }

    if (!persistedState?.downloadedZipPath || !persistedState.expectedSha256) {
      throw new InternalServerErrorException("升级安装包尚未准备完成，请先重新检查更新");
    }

    const updaterScriptSourcePath = join(current.projectRoot, "scripts", "local-single-user-updater.ps1");
    if (!existsSync(updaterScriptSourcePath)) {
      throw new InternalServerErrorException(`缺少升级脚本：${updaterScriptSourcePath}`);
    }

    const now = new Date();
    const runId = `${now.toISOString().replace(/[:.]/g, "-")}-${latest.tagName}`;
    const runRoot = join(this.appConfigService.getLocalUpdatesRoot(), "apply-runs", runId);
    await mkdir(runRoot, { recursive: true });

    const updaterRunPath = join(runRoot, "local-single-user-updater.ps1");
    const updaterConfigPath = join(runRoot, "local-single-user-updater.config.json");
    const updaterScriptContent = await readFile(updaterScriptSourcePath, "utf8");
    await writeFile(updaterRunPath, updaterScriptContent, "utf8");
    await writeFile(
      updaterConfigPath,
      `${JSON.stringify(
        {
          installRoot: current.installRoot,
          localAppRoot: this.appConfigService.getLocalAppRoot(),
          updatesRoot: this.appConfigService.getLocalUpdatesRoot(),
          releaseTag: latest.tagName,
          releaseName: latest.name,
          zipPath: persistedState.downloadedZipPath,
          expectedSha256: persistedState.expectedSha256,
          statusFilePath: this.getPersistedStatePath(),
          restartCommandPath: current.installRoot ? join(current.installRoot, "start-local-single-user.cmd") : null,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await this.writePersistedState({
      ...persistedState,
      phase: "APPLYING",
      message: `升级进程已启动，正在准备替换到 ${latest.tagName}。`,
      latestTagName: latest.tagName,
      updaterRunPath,
      updaterConfigPath,
      failedAt: undefined,
    });

    const powershellExe = this.resolvePowerShellExe();
    const child = spawn(
      powershellExe,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", updaterRunPath, "-ConfigPath", updaterConfigPath],
      {
        cwd: runRoot,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      },
    );
    child.unref();

    return {
      accepted: true,
      phase: "APPLYING",
      message: "升级进程已启动，当前工作台会在后台完成停机、安装和重启。",
      updaterRunPath,
    };
  }

  private getCurrentBuildInfo(): CurrentBuildInfo {
    const projectRoot = resolve(process.cwd(), "..", "..");
    const installRootCandidate = resolve(projectRoot, "..");
    const packageJsonPath = join(projectRoot, "package.json");
    const manifestPath = join(installRootCandidate, "meta", "release-manifest.json");
    const startCommandPath = join(installRootCandidate, "start-local-single-user.cmd");
    const bundledNodePath = join(installRootCandidate, "bin", "node.exe");
    const runtimeMode = this.appConfigService.getRuntimeMode();

    const packageJson = safeReadJson<{ version?: string }>(packageJsonPath);
    const manifest = safeReadJson<{ generatedAt?: string; name?: string }>(manifestPath);
    const canApplyUpdate =
      process.platform === "win32"
      && runtimeMode === "local-single-user"
      && existsSync(startCommandPath)
      && existsSync(bundledNodePath);

    let applyBlockedReason: string | null = null;
    if (runtimeMode !== "local-single-user") {
      applyBlockedReason = "当前不是 local-single-user 运行模式。";
    } else if (process.platform !== "win32") {
      applyBlockedReason = "当前升级链只支持 Windows 安装态。";
    } else if (!existsSync(startCommandPath) || !existsSync(bundledNodePath)) {
      applyBlockedReason = "当前运行环境不是已安装的 local-single-user 发布包。";
    }

    return {
      version: String(packageJson?.version || "").trim() || "0.1.0",
      runtimeMode,
      generatedAt: normalizeIsoDate(manifest?.generatedAt),
      buildName: String(manifest?.name || "").trim() || null,
      installRoot: canApplyUpdate ? installRootCandidate : null,
      projectRoot,
      canApplyUpdate,
      applyBlockedReason,
    };
  }

  private async getLatestRelease(options?: { force?: boolean }): Promise<LatestReleaseResult> {
    const now = Date.now();
    if (!options?.force && this.latestReleaseCache && this.latestReleaseCache.expiresAt > now) {
      return this.latestReleaseCache.value;
    }

    const checkedAt = new Date().toISOString();
    try {
      const { owner, repo } = this.getReleaseRepository();
      const response = await this.fetchJson<{
        tag_name?: string;
        name?: string;
        html_url?: string;
        published_at?: string;
        body?: string;
        assets?: Array<{
          name?: string;
          size?: number;
          browser_download_url?: string;
        }>;
      }>(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);

      const assets = Array.isArray(response.assets) ? response.assets : [];
      const zipAsset = this.normalizeAsset(assets.find((item) => item?.name === LOCAL_SINGLE_USER_ZIP_NAME));
      const checksumAsset = this.normalizeAsset(assets.find((item) => item?.name === LOCAL_SINGLE_USER_CHECKSUM_NAME));
      let checksumValue: string | null = null;
      if (checksumAsset?.downloadUrl) {
        const checksumText = await this.fetchText(checksumAsset.downloadUrl);
        checksumValue = parseChecksumValue(checksumText);
      }

      const result: LatestReleaseResult = {
        checkedAt,
        errorMessage: null,
        release: {
          tagName: String(response.tag_name || "").trim(),
          name: String(response.name || response.tag_name || "").trim(),
          htmlUrl: String(response.html_url || "").trim(),
          publishedAt: normalizeIsoDate(response.published_at) || checkedAt,
          body: String(response.body || ""),
          zipAsset,
          checksumAsset,
          checksumValue,
        },
      };

      this.latestReleaseCache = {
        expiresAt: now + LATEST_RELEASE_CACHE_TTL_MS,
        value: result,
      };
      return result;
    } catch (error) {
      const result: LatestReleaseResult = {
        checkedAt,
        release: null,
        errorMessage: `检查 GitHub Release 失败：${readErrorMessage(error)}`,
      };
      this.latestReleaseCache = {
        expiresAt: now + 5_000,
        value: result,
      };
      return result;
    }
  }

  private async downloadRelease(release: RemoteReleaseInfo): Promise<DownloadReleaseResult> {
    if (!release.zipAsset?.downloadUrl || !release.checksumValue) {
      throw new BadGatewayException("最新发布缺少安装包或校验值");
    }

    const releaseRoot = join(this.appConfigService.getLocalUpdatesRoot(), "downloads", sanitizeFileName(release.tagName));
    await rm(releaseRoot, { recursive: true, force: true }).catch(() => undefined);
    await mkdir(releaseRoot, { recursive: true });

    const zipPath = join(releaseRoot, LOCAL_SINGLE_USER_ZIP_NAME);
    const checksumPath = join(releaseRoot, LOCAL_SINGLE_USER_CHECKSUM_NAME);
    await this.downloadFile(release.zipAsset.downloadUrl, zipPath);
    await writeFile(checksumPath, `${release.checksumValue}  ${LOCAL_SINGLE_USER_ZIP_NAME}\n`, "utf8");

    const actualHash = await this.hashFileSha256(zipPath);
    if (actualHash !== release.checksumValue) {
      throw new BadGatewayException(`安装包 SHA256 校验失败：期望 ${release.checksumValue}，实际 ${actualHash}`);
    }

    return {
      tagName: release.tagName,
      zipPath,
      checksumPath,
      checksumValue: release.checksumValue,
    };
  }

  private normalizeAsset(
    asset:
      | {
          name?: string;
          size?: number;
          browser_download_url?: string;
        }
      | undefined,
  ): RemoteReleaseAsset | null {
    if (!asset?.name || !asset.browser_download_url) {
      return null;
    }
    return {
      name: asset.name,
      size: Number(asset.size || 0),
      downloadUrl: asset.browser_download_url,
    };
  }

  private computeUpdateAvailable(current: CurrentBuildInfo, latest: RemoteReleaseInfo | null) {
    if (!latest) {
      return false;
    }
    if (!current.generatedAt) {
      return true;
    }
    return resolveDateTime(latest.publishedAt) > resolveDateTime(current.generatedAt) + 60_000;
  }

  private resolvePhase(
    current: CurrentBuildInfo,
    persistedState: PersistedUpdateState | null,
    latest: RemoteReleaseInfo | null,
    updateAvailable: boolean,
  ): PersistedUpdatePhase {
    if (current.runtimeMode !== "local-single-user") {
      return "UNSUPPORTED";
    }
    if (persistedState?.phase === "DOWNLOADING") {
      return "DOWNLOADING";
    }
    if (persistedState?.phase === "APPLYING") {
      return "APPLYING";
    }
    if (persistedState?.phase === "READY_TO_APPLY" && persistedState.downloadedReleaseTag === latest?.tagName) {
      return "READY_TO_APPLY";
    }
    if (persistedState?.phase === "FAILED") {
      return "FAILED";
    }
    if (persistedState?.phase === "SUCCEEDED" && !updateAvailable) {
      return "SUCCEEDED";
    }
    if (updateAvailable) {
      return "AVAILABLE";
    }
    return "IDLE";
  }

  private resolveMessage(
    current: CurrentBuildInfo,
    persistedState: PersistedUpdateState | null,
    latestErrorMessage: string | null,
    updateAvailable: boolean,
  ) {
    if (persistedState?.message) {
      return persistedState.message;
    }
    if (current.applyBlockedReason) {
      return current.applyBlockedReason;
    }
    if (latestErrorMessage) {
      return latestErrorMessage;
    }
    if (updateAvailable) {
      return "检测到可用新版本，可以先下载校验，再执行一键升级。";
    }
    return "当前已经是最新发布版本。";
  }

  private readPersistedState() {
    return safeReadJson<PersistedUpdateState>(this.getPersistedStatePath());
  }

  private async writePersistedState(state: PersistedUpdateState) {
    await mkdir(dirname(this.getPersistedStatePath()), { recursive: true });
    await writeFile(this.getPersistedStatePath(), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }

  private getPersistedStatePath() {
    return join(this.appConfigService.getLocalUpdatesRoot(), "system-update-status.json");
  }

  private getReleaseRepository() {
    return {
      owner: String(process.env.LOCAL_SINGLE_USER_UPDATE_REPO_OWNER || "allentry").trim(),
      repo: String(process.env.LOCAL_SINGLE_USER_UPDATE_REPO_NAME || "local-ai-omni-ops-system").trim(),
    };
  }

  private ensureLocalSingleUserMode() {
    if (this.appConfigService.getRuntimeMode() !== "local-single-user") {
      throw new BadRequestException("当前升级能力只面向 local-single-user 运行模式");
    }
  }

  private ensureUpdateApplyReady(current: CurrentBuildInfo) {
    if (!current.canApplyUpdate) {
      throw new BadRequestException(current.applyBlockedReason || "当前环境不支持自动升级");
    }
  }

  private async fetchJson<T>(url: string) {
    const response = await this.fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });
    return response.json() as Promise<T>;
  }

  private async fetchText(url: string) {
    const response = await this.fetch(url, {
      headers: {
        Accept: "text/plain",
      },
    });
    return response.text();
  }

  private async fetch(url: string, init?: RequestInit, options?: { timeoutMs?: number }) {
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 15_000;
    const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
      const headers = new Headers(init?.headers);
      headers.set("User-Agent", "ai-omni-ops-system-updater");
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(url, {
        ...init,
        headers,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return response;
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private async downloadFile(url: string, filePath: string) {
    const response = await this.fetch(url, undefined, {
      timeoutMs: 30 * 60_000,
    });
    if (!response.body) {
      throw new Error(`下载响应为空：${url}`);
    }
    await mkdir(dirname(filePath), { recursive: true });
    await pipeline(
      Readable.fromWeb(response.body as any),
      createWriteStream(filePath),
    );
  }

  private async hashFileSha256(filePath: string) {
    return new Promise<string>((resolvePromise, rejectPromise) => {
      const hash = createHash("sha256");
      const stream = createReadStream(filePath);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("error", rejectPromise);
      stream.on("end", () => resolvePromise(hash.digest("hex")));
    });
  }

  private resolvePowerShellExe() {
    if (process.platform !== "win32") {
      return "powershell";
    }
    const systemRoot = String(process.env.SystemRoot || "C:\\Windows").trim() || "C:\\Windows";
    return resolve(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  }
}

function sanitizeFileName(value: string) {
  return String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "latest";
}

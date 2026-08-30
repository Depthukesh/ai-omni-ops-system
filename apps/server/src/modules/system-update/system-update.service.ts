import { createHash } from "node:crypto";
import { closeSync, createReadStream, createWriteStream, existsSync, openSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";
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
  appVersion: string | null;
  name: string;
  htmlUrl: string;
  publishedAt: string;
  body: string;
  summary: string | null;
  changeLogs: Array<{
    releaseTag: string | null;
    appVersion: string | null;
    publishedAt: string;
    content: string;
  }>;
  zipAsset: RemoteReleaseAsset | null;
  checksumAsset: RemoteReleaseAsset | null;
  checksumValue: string | null;
  updateGuide: {
    commands: string[];
    notices: string[];
    requires: {
      server: boolean;
      web: boolean;
      skillPackage: boolean;
      migration: boolean;
    };
    changeLogUrl: string | null;
    skillPackageUrl: string | null;
  } | null;
  isValid: boolean;
  invalidReason: string | null;
};

type OssLatestManifest = {
  version?: string;
  appVersion?: string;
  name?: string;
  publishedAt?: string;
  zipUrl?: string;
  sha256Url?: string;
  checksumValue?: string;
  notes?: string;
  source?: string;
  history?: Array<{
    releaseTag?: string;
    version?: string;
    appVersion?: string;
    publishedAt?: string;
    content?: string;
    notes?: string;
  }>;
};

type StandardRuntimeLatestManifest = {
  latestVersion?: string;
  appVersion?: string;
  releaseTag?: string;
  name?: string;
  releaseDate?: string;
  summary?: string;
  notes?: string;
  changeLogUrl?: string;
  skillPackageUrl?: string;
  commands?: string[];
  notices?: string[];
  requires?: {
    server?: boolean;
    web?: boolean;
    skillPackage?: boolean;
    migration?: boolean;
  };
  history?: Array<{
    releaseTag?: string;
    latestVersion?: string;
    appVersion?: string;
    releaseDate?: string;
    content?: string;
    summary?: string;
    notes?: string;
  }>;
};

type CurrentBuildInfo = {
  version: string;
  runtimeMode: "standard" | "local-single-user";
  generatedAt: string | null;
  buildName: string | null;
  releaseTag: string | null;
  installRoot: string | null;
  projectRoot: string;
  canApplyUpdate: boolean;
  applyBlockedReason: string | null;
};

type UpdateExecutionMode = "auto-apply" | "guide-only";

type LatestReleaseResult = {
  release: RemoteReleaseInfo | null;
  errorMessage: string | null;
  checkedAt: string;
};

type UpdateSourceInfo = {
  kind: "oss" | "manifest" | "repo";
  label: string;
  manifestUrl: string;
  publicBaseUrl: string;
  executionMode: UpdateExecutionMode;
};

type GitHubReleaseApiResponse = {
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
};

type GitWorkspaceInfo = {
  branchName: string | null;
  shortCommitSha: string | null;
  fullCommitSha: string | null;
  remoteUrl: string | null;
};

type ChangeDocEntry = {
  fileName: string;
  title: string;
  appVersion: string | null;
  publishedAt: string;
  content: string;
  changeLogUrl: string | null;
  likelyRequires: {
    server: boolean;
    web: boolean;
    skillPackage: boolean;
    migration: boolean;
  };
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
const DEFAULT_LOCAL_SINGLE_USER_UPDATE_MANIFEST_URL = "https://bucketwangxiaodong.oss-cn-beijing.aliyuncs.com/ai-omni-ops/local-single-user/win-x64/latest.json";
const APPLYING_STALE_TIMEOUT_MS = 30 * 60 * 1000;
const DOWNLOAD_STALE_TIMEOUT_MS = 10 * 60 * 1000;
const UPDATER_BOOTSTRAP_TIMEOUT_MS = 15_000;
const SYSTEM_UPDATE_DEBUG_SESSION_ID = "install-upgrade-stall";
const SYSTEM_UPDATE_DEBUG_ENV_PATH = resolve(process.cwd(), ".dbg", `${SYSTEM_UPDATE_DEBUG_SESSION_ID}.env`);

function reportSystemUpdateDebugEvent(hypothesisId: string, location: string, msg: string, data?: Record<string, unknown>) {
  void (async () => {
    let debugServerUrl = "http://127.0.0.1:7777/event";
    let debugSessionId = SYSTEM_UPDATE_DEBUG_SESSION_ID;
    try {
      const envText = await readFile(SYSTEM_UPDATE_DEBUG_ENV_PATH, "utf8");
      debugServerUrl = envText.match(/^DEBUG_SERVER_URL=(.+)$/m)?.[1]?.trim() || debugServerUrl;
      debugSessionId = envText.match(/^DEBUG_SESSION_ID=(.+)$/m)?.[1]?.trim() || debugSessionId;
    } catch {
      // Ignore missing local debug env.
    }
    await fetch(debugServerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: debugSessionId,
        runId: "pre-fix",
        hypothesisId,
        location,
        msg,
        data: data || {},
        ts: Date.now(),
      }),
    }).catch(() => undefined);
  })();
}
async function writeUtf8BomFile(filePath: string, content: string) {
  const normalizedContent = content.replace(/^\uFEFF+/, "");
  await writeFile(filePath, Buffer.from(`\uFEFF${normalizedContent}`, "utf8"));
}

async function pathExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function safeReadJson<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    return JSON.parse(readFileSync(filePath, "utf8").replace(/^\uFEFF+/, "")) as T;
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

function normalizeChangeLogs(
  manifest: OssLatestManifest,
  fallbackPublishedAt: string,
  fallbackTagName: string,
) {
  const normalized = Array.isArray(manifest.history)
    ? manifest.history
        .map((item) => {
          const content = String(item?.content || item?.notes || "").trim();
          if (!content) {
            return null;
          }
          return {
            releaseTag: String(item?.releaseTag || item?.version || "").trim() || null,
            appVersion: String(item?.appVersion || "").trim() || null,
            publishedAt: normalizeIsoDate(item?.publishedAt) || fallbackPublishedAt,
            content,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  if (normalized.length > 0) {
    return normalized;
  }

  const fallbackContent = String(manifest.notes || "").trim();
  if (!fallbackContent) {
    return [];
  }
  return [
    {
      releaseTag: fallbackTagName || null,
      appVersion: String(manifest.appVersion || "").trim() || null,
      publishedAt: fallbackPublishedAt,
      content: fallbackContent,
    },
  ];
}

function normalizeStandardRuntimeChangeLogs(
  manifest: StandardRuntimeLatestManifest,
  fallbackPublishedAt: string,
  fallbackTagName: string,
) {
  const normalized = Array.isArray(manifest.history)
    ? manifest.history
        .map((item) => {
          const content = String(item?.content || item?.summary || item?.notes || "").trim();
          if (!content) {
            return null;
          }
          return {
            releaseTag: String(item?.releaseTag || item?.latestVersion || "").trim() || null,
            appVersion: String(item?.appVersion || item?.latestVersion || "").trim() || null,
            publishedAt: normalizeIsoDate(item?.releaseDate) || fallbackPublishedAt,
            content,
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  if (normalized.length > 0) {
    return normalized;
  }

  const fallbackContent = String(manifest.summary || manifest.notes || "").trim();
  if (!fallbackContent) {
    return [];
  }
  return [
    {
      releaseTag: fallbackTagName || null,
      appVersion: String(manifest.appVersion || manifest.latestVersion || "").trim() || null,
      publishedAt: fallbackPublishedAt,
      content: fallbackContent,
    },
  ];
}

function normalizeUpdateGuideFlags(
  requires: StandardRuntimeLatestManifest["requires"],
) {
  return {
    server: Boolean(requires?.server),
    web: Boolean(requires?.web),
    skillPackage: Boolean(requires?.skillPackage),
    migration: Boolean(requires?.migration),
  };
}

function escapePowerShellSingleQuotedString(value: string) {
  return String(value || "").replace(/'/g, "''");
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "未知错误");
}

function isProcessAlive(pid?: number | null) {
  if (!pid || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readFileNameFromUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    const name = basename(url.pathname);
    return name || null;
  } catch {
    return null;
  }
}

function findNearestPackageJsonRoot(startPath: string) {
  let current = resolve(startPath);
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, "package.json"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return resolve(startPath);
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
    const latestResult = await this.getLatestRelease({
      force: Boolean(options?.forceRemote),
      current,
    });

    const latest = latestResult.release;
    const persistedState = await this.reconcilePersistedState(current, this.readPersistedState(), latest);
    let updateAvailable = this.computeUpdateAvailable(current, latest);
    if (
      persistedState?.downloadedReleaseTag
      && persistedState.downloadedReleaseTag === latest?.tagName
      && (persistedState.phase === "READY_TO_APPLY" || persistedState.phase === "APPLYING" || persistedState.phase === "SUCCEEDED")
    ) {
      updateAvailable = false;
    }
    const phase = this.resolvePhase(current, persistedState, latest, updateAvailable);

    return {
      supported: this.supportsUpdateWorkspace(current),
      current,
      latest,
      source: this.getUpdateSourceInfo(current),
      phase,
      updateAvailable,
      message: this.resolveMessage(current, persistedState, latestResult.errorMessage, updateAvailable, latest),
      checkedAt: latestResult.checkedAt,
      downloadedReleaseTag: persistedState?.downloadedReleaseTag || null,
      downloadedAt: persistedState?.downloadedAt || null,
      appliedAt: persistedState?.appliedAt || null,
      failedAt: persistedState?.failedAt || null,
    };
  }

  async checkForUpdates() {
    return this.getStatus({ forceRemote: true });
  }

  async downloadLatestUpdate() {
    this.ensureLocalSingleUserMode();
    const current = this.getCurrentBuildInfo();
    this.ensureUpdateApplyReady(current);

    const latestResult = await this.getLatestRelease();
    const latest = latestResult.release;
    if (!latest) {
      throw new BadGatewayException(latestResult.errorMessage || "当前无法获取最新发布信息");
    }
    if (this.isCurrentBuildAligned(current, latest) && !this.computeUpdateAvailable(current, latest)) {
      throw new BadRequestException("当前已经是最新版本，无需重复预下载安装包。");
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
    const latestResult = await this.getLatestRelease();
    const latest = latestResult.release;
    // #region debug-point A:apply-entry
    reportSystemUpdateDebugEvent("A", "system-update.service.ts:applyLatestUpdate:entry", "[DEBUG] enter applyLatestUpdate", {
      currentVersion: current.version,
      currentReleaseTag: current.releaseTag,
      canApplyUpdate: current.canApplyUpdate,
      persistedPhase: persistedState?.phase || null,
      persistedLatestTagName: persistedState?.latestTagName || null,
      persistedDownloadedReleaseTag: persistedState?.downloadedReleaseTag || null,
      latestTagName: latest?.tagName || null,
      latestCheckError: latestResult.errorMessage,
    });
    // #endregion
    if (!latest) {
      throw new BadGatewayException(latestResult.errorMessage || "当前无法获取最新发布信息");
    }
    persistedState = await this.reconcilePersistedState(current, persistedState, latest);
    if (this.isCurrentBuildAligned(current, latest) && !this.computeUpdateAvailable(current, latest)) {
      throw new BadRequestException("当前安装版本已经和最新版本对齐，无需再次执行升级。");
    }
    if (persistedState?.phase === "APPLYING") {
      throw new BadRequestException("上一轮升级仍在后台执行，请勿重复点击；如果长时间无进展，页面会自动转成失败状态。");
    }

    const downloadedReady =
      persistedState?.phase === "READY_TO_APPLY"
      && persistedState.downloadedReleaseTag === latest.tagName
      && persistedState.downloadedZipPath
      && existsSync(persistedState.downloadedZipPath)
      && persistedState.expectedSha256;
    // #region debug-point B:download-readiness
    reportSystemUpdateDebugEvent("B", "system-update.service.ts:applyLatestUpdate:download-readiness", "[DEBUG] applyLatestUpdate download readiness evaluated", {
      persistedPhase: persistedState?.phase || null,
      latestTagName: latest.tagName,
      downloadedReleaseTag: persistedState?.downloadedReleaseTag || null,
      downloadedZipPath: persistedState?.downloadedZipPath || null,
      downloadedZipExists: Boolean(persistedState?.downloadedZipPath && existsSync(persistedState.downloadedZipPath)),
      hasExpectedSha256: Boolean(persistedState?.expectedSha256),
      downloadedReady: Boolean(downloadedReady),
    });
    // #endregion

    if (!downloadedReady) {
      await this.downloadLatestUpdate();
      persistedState = this.readPersistedState();
      // #region debug-point B:download-after-trigger
      reportSystemUpdateDebugEvent("B", "system-update.service.ts:applyLatestUpdate:download-after-trigger", "[DEBUG] applyLatestUpdate triggered downloadLatestUpdate", {
        latestTagName: latest.tagName,
        nextPersistedPhase: persistedState?.phase || null,
        nextDownloadedReleaseTag: persistedState?.downloadedReleaseTag || null,
        nextDownloadedZipPath: persistedState?.downloadedZipPath || null,
      });
      // #endregion
    }

    const candidateDownloadedReleaseTag = persistedState?.downloadedReleaseTag || null;
    const candidateDownloadedZipPath = persistedState?.downloadedZipPath || null;
    const candidateExpectedSha256 = persistedState?.expectedSha256 || null;
    const latestDownloadReady = Boolean(
      persistedState?.phase === "READY_TO_APPLY"
      && candidateDownloadedReleaseTag === latest.tagName
      && candidateDownloadedZipPath
      && existsSync(candidateDownloadedZipPath)
      && candidateExpectedSha256,
    );
    if (!latestDownloadReady) {
      throw new InternalServerErrorException("升级安装包尚未准备完成，或当前仍停留在旧版本下载状态，请先重新检查更新后再试。");
    }
    const downloadedZipPath = candidateDownloadedZipPath as string;
    const expectedSha256 = candidateExpectedSha256 as string;

    const updaterScriptSourcePath = join(current.projectRoot, "scripts", "local-single-user-updater.ps1");

    const now = new Date();
    const runId = `${now.toISOString().replace(/[:.]/g, "-")}-${latest.tagName}`;
    const runRoot = join(this.appConfigService.getLocalUpdatesRoot(), "apply-runs", runId);
    await mkdir(runRoot, { recursive: true });

    const updaterRunPath = join(runRoot, "local-single-user-updater.ps1");
    const updaterConfigPath = join(runRoot, "local-single-user-updater.config.json");
    const updaterLauncherPath = join(runRoot, "run-local-single-user-updater.cmd");
    const updaterStdoutPath = join(runRoot, "local-single-user-updater.stdout.log");
    const updaterStderrPath = join(runRoot, "local-single-user-updater.stderr.log");
    const updaterTracePath = join(runRoot, "local-single-user-updater.trace.log");
    const updaterScriptContent = await this.resolveUpdaterScriptContentFromDownloadedRelease(
      downloadedZipPath,
      runRoot,
      updaterScriptSourcePath,
    );
    await writeUtf8BomFile(updaterRunPath, updaterScriptContent);
    await writeUtf8BomFile(
      updaterConfigPath,
      `${JSON.stringify(
        {
          installRoot: current.installRoot,
          localAppRoot: this.appConfigService.getLocalAppRoot(),
          updatesRoot: this.appConfigService.getLocalUpdatesRoot(),
          debugServerUrl: await this.resolveSystemUpdateDebugServerUrl(),
          debugSessionId: SYSTEM_UPDATE_DEBUG_SESSION_ID,
          releaseTag: latest.tagName,
          releaseName: latest.name,
          zipPath: downloadedZipPath,
          expectedSha256,
          statusFilePath: this.getPersistedStatePath(),
          restartCommandPath: current.installRoot ? join(current.installRoot, "start-local-single-user.cmd") : null,
          fallbackStopPids: [process.pid],
        },
        null,
        2,
      )}\n`,
    );
    const powershellExe = this.resolvePowerShellExe();
    await writeFile(
      updaterLauncherPath,
      `@echo off\r\n"${powershellExe}" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0local-single-user-updater.ps1" -ConfigPath "%~dp0local-single-user-updater.config.json" 1>>"%~dp0local-single-user-updater.stdout.log" 2>>"%~dp0local-single-user-updater.stderr.log"\r\n`,
      "utf8",
    );

    const initialApplyingMessage = `升级进程已启动，正在准备替换到 ${latest.tagName}。`;
    await this.writePersistedState({
      ...persistedState,
      phase: "APPLYING",
      message: initialApplyingMessage,
      checkedAt: new Date().toISOString(),
      latestTagName: latest.tagName,
      updaterRunPath,
      updaterConfigPath,
      failedAt: undefined,
    });
    // #region debug-point B:updater-config-written
    reportSystemUpdateDebugEvent("B", "system-update.service.ts:applyLatestUpdate:updater-config", "[DEBUG] updater config prepared", {
      runId,
      runRoot,
      latestTagName: latest.tagName,
      updaterRunPath,
      updaterConfigPath,
      downloadedZipPath,
    });
    // #endregion

    const updaterStdoutFd = openSync(updaterStdoutPath, "a");
    const updaterStderrFd = openSync(updaterStderrPath, "a");
    let updaterPid: number | null = null;
    try {
      const child = spawn(
        powershellExe,
        [
          "-NoProfile",
          "-WindowStyle",
          "Hidden",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          updaterRunPath,
          "-ConfigPath",
          updaterConfigPath,
        ],
        {
          cwd: runRoot,
          detached: true,
          stdio: ["ignore", updaterStdoutFd, updaterStderrFd],
          windowsHide: true,
        },
      );
      await new Promise<void>((resolvePromise, rejectPromise) => {
        child.once("spawn", () => resolvePromise());
        child.once("error", (error) => rejectPromise(error));
      });
      updaterPid = child.pid ?? null;
      child.unref();
      // #region debug-point B:updater-spawned
      reportSystemUpdateDebugEvent("B", "system-update.service.ts:applyLatestUpdate:updater-spawned", "[DEBUG] updater process spawned", {
        runId,
        childPid: child.pid,
        updaterRunPath,
      });
      // #endregion
    } catch (error) {
      // #region debug-point B:updater-spawn-failed
      reportSystemUpdateDebugEvent("B", "system-update.service.ts:applyLatestUpdate:updater-spawn-failed", "[DEBUG] updater process spawn failed", {
        runId,
        error: readErrorMessage(error),
        updaterRunPath,
      });
      // #endregion
      const failureMessage = `升级器启动失败：${readErrorMessage(error)}`;
      await this.writePersistedState({
        ...(this.readPersistedState() || {}),
        phase: "FAILED",
        message: failureMessage,
        failedAt: new Date().toISOString(),
      });
      throw new InternalServerErrorException(failureMessage);
    } finally {
      closeSync(updaterStdoutFd);
      closeSync(updaterStderrFd);
    }

    const bootstrapResult = await this.waitForUpdaterBootstrap({
      initialApplyingMessage,
      updaterRunPath,
      updaterStdoutPath,
      updaterStderrPath,
      updaterTracePath,
      updaterPid,
      timeoutMs: UPDATER_BOOTSTRAP_TIMEOUT_MS,
    });
    // #region debug-point C:bootstrap-result
    reportSystemUpdateDebugEvent("C", "system-update.service.ts:applyLatestUpdate:bootstrap-result", "[DEBUG] updater bootstrap result", {
      runId,
      started: bootstrapResult.started,
      message: bootstrapResult.message,
      updaterRunPath,
      updaterStdoutPath,
      updaterStderrPath,
      updaterTracePath,
    });
    // #endregion
    if (!bootstrapResult.started) {
      const failureMessage = bootstrapResult.message || "升级器未能成功启动，请稍后重试。";
      await this.writePersistedState({
        ...(this.readPersistedState() || {}),
        phase: "FAILED",
        message: failureMessage,
        failedAt: new Date().toISOString(),
      });
      throw new InternalServerErrorException(failureMessage);
    }

    return {
      accepted: true,
      phase: "APPLYING",
      message: "升级进程已启动，当前工作台会在后台静默完成停机、安装和重启；升级期间请勿重复点击。",
      updaterRunPath,
    };
  }

  private getCurrentBuildInfo(): CurrentBuildInfo {
    const projectRoot = findNearestPackageJsonRoot(process.cwd());
    const installRootCandidate = resolve(projectRoot, "..");
    const packageJsonPath = join(projectRoot, "package.json");
    const manifestPath = join(installRootCandidate, "meta", "release-manifest.json");
    const startCommandPath = join(installRootCandidate, "start-local-single-user.cmd");
    const bundledNodePath = join(installRootCandidate, "bin", "node.exe");
    const runtimeMode = this.appConfigService.getRuntimeMode();

    const packageJson = safeReadJson<{ version?: string }>(packageJsonPath);
    const manifest = safeReadJson<{ generatedAt?: string; name?: string; releaseTag?: string; appVersion?: string }>(manifestPath);
    const gitInfo = this.readGitWorkspaceInfo(projectRoot);
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
      version: String(manifest?.appVersion || packageJson?.version || "").trim() || "0.1.0",
      runtimeMode,
      generatedAt: normalizeIsoDate(manifest?.generatedAt),
      buildName: String(manifest?.name || "").trim() || this.buildGitDisplayName(gitInfo),
      releaseTag: String(manifest?.releaseTag || "").trim() || this.buildGitReleaseTag(gitInfo),
      installRoot: canApplyUpdate ? installRootCandidate : null,
      projectRoot,
      canApplyUpdate,
      applyBlockedReason,
    };
  }

  private async getLatestRelease(options?: { force?: boolean; current?: CurrentBuildInfo }): Promise<LatestReleaseResult> {
    const now = Date.now();
    if (!options?.force && this.latestReleaseCache && this.latestReleaseCache.expiresAt > now) {
      return this.latestReleaseCache.value;
    }

    const checkedAt = new Date().toISOString();
    try {
      const current = options?.current || this.getCurrentBuildInfo();
      const source = this.getUpdateSourceInfo(current);
      if (!source) {
        return {
          checkedAt,
          errorMessage: null,
          release: null,
        };
      }
      const result = source.executionMode === "guide-only"
        ? source.kind === "manifest"
          ? await this.fetchStandardRuntimeLatestRelease(source, checkedAt)
          : await this.buildStandardRuntimeFallbackRelease(source, current, checkedAt)
        : await this.fetchLocalSingleUserLatestRelease(source, checkedAt);

      this.latestReleaseCache = {
        expiresAt: now + LATEST_RELEASE_CACHE_TTL_MS,
        value: result,
      };
      return result;
    } catch (error) {
      const result: LatestReleaseResult = {
        checkedAt,
        release: null,
        errorMessage: `检查更新清单失败：${readErrorMessage(error)}`,
      };
      this.latestReleaseCache = {
        expiresAt: now + 5_000,
        value: result,
      };
      return result;
    }
  }

  private async fetchLocalSingleUserLatestRelease(source: UpdateSourceInfo, checkedAt: string): Promise<LatestReleaseResult> {
    const response = await this.fetchOssLatestManifestPayload(source.manifestUrl);
    const zipUrl = String(response.zipUrl || "").trim();
    const sha256Url = String(response.sha256Url || "").trim();
    const zipAsset = zipUrl
      ? {
          name: readFileNameFromUrl(zipUrl) || LOCAL_SINGLE_USER_ZIP_NAME,
          size: 0,
          downloadUrl: zipUrl,
        }
      : null;
    const checksumAsset = sha256Url
      ? {
          name: readFileNameFromUrl(sha256Url) || LOCAL_SINGLE_USER_CHECKSUM_NAME,
          size: 0,
          downloadUrl: sha256Url,
        }
      : null;
    const releaseBody = String(response.notes || "");
    let checksumValue: string | null = String(response.checksumValue || "").trim().toLowerCase() || null;
    if (!checksumValue && checksumAsset?.downloadUrl) {
      const checksumText = await this.fetchText(checksumAsset.downloadUrl, "text/plain");
      checksumValue = parseChecksumValue(checksumText);
    }
    const publishedAt = normalizeIsoDate(response.publishedAt) || checkedAt;
    const tagName = String(response.version || "").trim();
    const changeLogs = normalizeChangeLogs(response, publishedAt, tagName);

    const result: LatestReleaseResult = {
      checkedAt,
      errorMessage: null,
      release: {
        tagName,
        appVersion: String(response.appVersion || "").trim() || null,
        name: String(response.name || response.version || "").trim(),
        htmlUrl: zipUrl || source.manifestUrl,
        publishedAt,
        body: releaseBody,
        summary: releaseBody || null,
        changeLogs,
        zipAsset,
        checksumAsset,
        checksumValue,
        updateGuide: null,
        isValid: Boolean(
          tagName
          && String(response.appVersion || "").trim()
          && zipAsset?.downloadUrl
          && checksumAsset?.downloadUrl
          && checksumValue,
        ),
        invalidReason: null,
      },
    };
    if (result.release && !result.release.isValid) {
      result.release.invalidReason = "远端 latest.json 缺少 releaseTag、appVersion、zipUrl、sha256Url 或 checksumValue，当前版本元数据不完整。";
    }
    return result;
  }

  private async fetchStandardRuntimeLatestRelease(source: UpdateSourceInfo, checkedAt: string): Promise<LatestReleaseResult> {
    const response = await this.fetchJson<StandardRuntimeLatestManifest>(source.manifestUrl, "application/json");
    const publishedAt = normalizeIsoDate(response.releaseDate) || checkedAt;
    const tagName = String(response.releaseTag || response.latestVersion || response.appVersion || "").trim();
    const summary = String(response.summary || "").trim() || null;
    const notes = String(response.notes || "").trim();
    const changeLogs = normalizeStandardRuntimeChangeLogs(response, publishedAt, tagName);
    const commands = Array.isArray(response.commands)
      ? response.commands.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const notices = Array.isArray(response.notices)
      ? response.notices.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    const result: LatestReleaseResult = {
      checkedAt,
      errorMessage: null,
      release: {
        tagName,
        appVersion: String(response.appVersion || response.latestVersion || "").trim() || null,
        name: String(response.name || response.latestVersion || response.appVersion || "").trim(),
        htmlUrl: String(response.changeLogUrl || source.manifestUrl).trim() || source.manifestUrl,
        publishedAt,
        body: [summary, notes].filter(Boolean).join("\n\n"),
        summary,
        changeLogs,
        zipAsset: null,
        checksumAsset: null,
        checksumValue: null,
        updateGuide: {
          commands,
          notices,
          requires: normalizeUpdateGuideFlags(response.requires),
          changeLogUrl: String(response.changeLogUrl || "").trim() || null,
          skillPackageUrl: String(response.skillPackageUrl || "").trim() || null,
        },
        isValid: Boolean(tagName && String(response.latestVersion || response.appVersion || "").trim() && commands.length > 0),
        invalidReason: null,
      },
    };
    if (result.release && !result.release.isValid) {
      result.release.invalidReason = "远端 standard 更新清单缺少 latestVersion/appVersion、releaseTag 或 commands，当前无法生成更新指引。";
    }
    return result;
  }

  private async buildStandardRuntimeFallbackRelease(
    source: UpdateSourceInfo,
    current: CurrentBuildInfo,
    checkedAt: string,
  ): Promise<LatestReleaseResult> {
    const gitInfo = this.readGitWorkspaceInfo(current.projectRoot);
    const changeDocs = await this.readRecentChangeDocs(current.projectRoot, gitInfo, 8);
    const recentSkillRelated = changeDocs.some((item) => item.likelyRequires.skillPackage);
    const recentMigrationRelated = changeDocs.some((item) => item.likelyRequires.migration);
    const branchName = this.resolveRecommendedGitUpdateBranch(current.projectRoot, gitInfo);
    const composePath = "docker/docker-compose.local-postgres.yml";
    const releaseTag = current.releaseTag || this.buildGitReleaseTag(gitInfo) || "current-workspace";
    const summary = [
      "当前标准运行态未配置远端更新清单，先展示仓库内最近版本记录、Docker 更新命令和同步提醒。",
      "如果希望页面自动提示“有新版本”，请继续配置 STANDARD_RUNTIME_UPDATE_MANIFEST_URL。",
    ].join(" ");

    return {
      checkedAt,
      errorMessage: null,
      release: {
        tagName: releaseTag,
        appVersion: current.version || null,
        name: "标准运行态本地更新指引",
        htmlUrl: source.publicBaseUrl || gitInfo.remoteUrl || "",
        publishedAt: changeDocs[0]?.publishedAt || current.generatedAt || checkedAt,
        body: summary,
        summary,
        changeLogs: changeDocs.map((item) => ({
          releaseTag: item.title,
          appVersion: item.appVersion,
          publishedAt: item.publishedAt,
          content: item.content,
        })),
        zipAsset: null,
        checksumAsset: null,
        checksumValue: null,
        updateGuide: {
          commands: [
            "git fetch --all --prune",
            `git pull origin ${branchName}`,
            `docker compose -f "${composePath}" up -d --build server web`,
            recentMigrationRelated ? `docker compose -f "${composePath}" run --rm db-init` : "如本次更新涉及 schema 或初始化链，再执行：docker compose -f \"docker/docker-compose.local-postgres.yml\" run --rm db-init",
          ],
          notices: [
            "Docker 标准运行态只负责版本提醒和更新指引，不会直接替你升级容器。",
            recentSkillRelated
              ? "最近版本记录里包含 Skill / MCP 相关改动，更新后请到个人中心 -> OpenClaw 安装中心重新同步对应 Skill 或安装说明。"
              : "如果本次改动涉及 Skill / MCP，请在更新完成后到个人中心 -> OpenClaw 安装中心同步最新 Skill 安装方式。",
            gitInfo.branchName && gitInfo.branchName !== branchName
              ? `检测到当前本地分支是 ${gitInfo.branchName}，但远端有效更新分支为 ${branchName}，已按远端分支生成 git pull 命令。`
              : `当前更新命令默认跟随远端有效分支：${branchName}。`,
            gitInfo.remoteUrl
              ? `当前仓库远端：${gitInfo.remoteUrl}`
              : "当前仓库远端地址未能自动识别，若你的代码来自其它分支，请把 git pull 的分支名改成你自己的部署分支。",
          ],
          requires: {
            server: true,
            web: true,
            skillPackage: recentSkillRelated,
            migration: recentMigrationRelated,
          },
          changeLogUrl: changeDocs[0]?.changeLogUrl || null,
          skillPackageUrl: null,
        },
        isValid: true,
        invalidReason: null,
      },
    };
  }

  private async fetchLatestReleasePayload(owner: string, repo: string): Promise<GitHubReleaseApiResponse> {
    const latestUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    try {
      return await this.fetchJson<GitHubReleaseApiResponse>(latestUrl);
    } catch (latestError) {
      const fallbackUrl = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=1`;
      const releases = await this.fetchJson<GitHubReleaseApiResponse[]>(fallbackUrl);
      const fallbackRelease = Array.isArray(releases) ? releases[0] : null;
      if (fallbackRelease) {
        return fallbackRelease;
      }
      throw latestError;
    }
  }

  private async downloadRelease(release: RemoteReleaseInfo): Promise<DownloadReleaseResult> {
    if (!release.zipAsset?.downloadUrl || !release.checksumValue) {
      throw new BadGatewayException("最新发布缺少安装包或校验值");
    }

    const releaseRoot = join(this.appConfigService.getLocalUpdatesRoot(), "downloads", sanitizeFileName(release.tagName));
    await mkdir(releaseRoot, { recursive: true });

    const zipPath = join(releaseRoot, LOCAL_SINGLE_USER_ZIP_NAME);
    const checksumPath = join(releaseRoot, LOCAL_SINGLE_USER_CHECKSUM_NAME);
    const initialZipDownloadUrl = process.platform === "win32"
      ? release.zipAsset.downloadUrl
      : await this.resolveDirectAssetDownloadUrl(release.zipAsset.downloadUrl);
    await this.downloadFile(initialZipDownloadUrl, zipPath, release.zipAsset.size, {
      sourceUrl: release.zipAsset.downloadUrl,
    });
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

  private async resolveUpdaterScriptContentFromDownloadedRelease(
    zipPath: string,
    runRoot: string,
    fallbackSourcePath: string,
  ) {
    const startedAt = Date.now();
    if (existsSync(fallbackSourcePath)) {
      return (await readFile(fallbackSourcePath, "utf8")).replace(/^\uFEFF+/, "");
    }
    const extractedRoot = join(runRoot, "release-script-source");
    await rm(extractedRoot, { recursive: true, force: true }).catch(() => undefined);
    // #region debug-point C:updater-extract-entry
    reportSystemUpdateDebugEvent("C", "system-update.service.ts:resolveUpdaterScriptContentFromDownloadedRelease:entry", "[DEBUG] enter lightweight updater extraction", {
      zipPath,
      runRoot,
      fallbackSourcePath,
    });
    // #endregion

    try {
      if (process.platform === "win32") {
        const powershellExe = this.resolvePowerShellExe();
        await mkdir(extractedRoot, { recursive: true });
        const packagedUpdaterPath = join(extractedRoot, "local-single-user-updater.ps1");
        await new Promise<void>((resolvePromise, rejectPromise) => {
          const child = spawn(
            powershellExe,
            [
              "-NoProfile",
              "-ExecutionPolicy",
              "Bypass",
              "-Command",
              [
                "Add-Type -AssemblyName System.IO.Compression.FileSystem",
                `$zip = [System.IO.Compression.ZipFile]::OpenRead('${escapePowerShellSingleQuotedString(zipPath)}')`,
                "try {",
                `  $entry = $zip.GetEntry('app\\scripts\\local-single-user-updater.ps1')`,
                "  if (-not $entry) { throw 'missing app\\\\scripts\\\\local-single-user-updater.ps1' }",
                `  $outputPath = '${escapePowerShellSingleQuotedString(packagedUpdaterPath)}'`,
                "  $outputDir = Split-Path -Parent $outputPath",
                "  if ($outputDir) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }",
                "  $entryStream = $entry.Open()",
                "  try {",
                "    $fileStream = [System.IO.File]::Create($outputPath)",
                "    try { $entryStream.CopyTo($fileStream) } finally { $fileStream.Dispose() }",
                "  } finally { $entryStream.Dispose() }",
                "} finally {",
                "  $zip.Dispose()",
                "}",
              ].join("; "),
            ],
            {
              stdio: ["ignore", "pipe", "pipe"],
              windowsHide: true,
            },
          );
          const stderrChunks: Buffer[] = [];
          child.stderr?.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
          child.on("error", rejectPromise);
          child.on("close", (code) => {
            if (code === 0) {
              resolvePromise();
              return;
            }
            rejectPromise(
              new Error(
                `Expand-Archive failed: ${Buffer.concat(stderrChunks).toString("utf8").trim() || `exit=${code ?? "null"}`}`,
              ),
            );
          });
        });
        if (await pathExists(packagedUpdaterPath)) {
          // #region debug-point C:updater-extract-finished
          reportSystemUpdateDebugEvent("C", "system-update.service.ts:resolveUpdaterScriptContentFromDownloadedRelease:finished", "[DEBUG] lightweight updater extraction finished", {
            zipPath,
            runRoot,
            packagedUpdaterPath,
            durationMs: Date.now() - startedAt,
          });
          // #endregion
          return (await readFile(packagedUpdaterPath, "utf8")).replace(/^\uFEFF+/, "");
        }
      }
    } catch (error) {
      // #region debug-point C:updater-extract-failed
      reportSystemUpdateDebugEvent("C", "system-update.service.ts:resolveUpdaterScriptContentFromDownloadedRelease:failed", "[DEBUG] lightweight updater extraction failed and will fall back to bundled updater", {
        zipPath,
        runRoot,
        fallbackSourcePath,
        durationMs: Date.now() - startedAt,
        error: readErrorMessage(error),
      });
      // #endregion
      // Fall back to the current installed updater when the downloaded package cannot be expanded.
    } finally {
      await rm(extractedRoot, { recursive: true, force: true }).catch(() => undefined);
    }

    if (!existsSync(fallbackSourcePath)) {
      throw new InternalServerErrorException(`缺少升级脚本：${fallbackSourcePath}`);
    }
    return (await readFile(fallbackSourcePath, "utf8")).replace(/^\uFEFF+/, "");
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
    if (!latest.isValid) {
      return false;
    }
    if (current.releaseTag) {
      return current.releaseTag !== latest.tagName;
    }
    if (latest.appVersion && current.version) {
      return current.version !== latest.appVersion;
    }
    if (!current.generatedAt) {
      return true;
    }
    return resolveDateTime(latest.publishedAt) > resolveDateTime(current.generatedAt) + 60_000;
  }

  private isCurrentBuildAligned(current: CurrentBuildInfo, latest: RemoteReleaseInfo | null) {
    if (!latest) {
      return false;
    }
    if (!latest.isValid) {
      return false;
    }
    if (current.releaseTag) {
      return current.releaseTag === latest.tagName;
    }
    if (latest.appVersion && current.version) {
      return current.version === latest.appVersion;
    }
    if (!current.generatedAt) {
      return false;
    }
    return resolveDateTime(current.generatedAt) >= resolveDateTime(latest.publishedAt) - 60_000;
  }

  private resolvePhase(
    current: CurrentBuildInfo,
    persistedState: PersistedUpdateState | null,
    latest: RemoteReleaseInfo | null,
    updateAvailable: boolean,
  ): PersistedUpdatePhase {
    if (!this.supportsUpdateWorkspace(current)) {
      return "UNSUPPORTED";
    }
    if (current.runtimeMode !== "local-single-user") {
      return updateAvailable ? "AVAILABLE" : "SUCCEEDED";
    }
    if (this.isCurrentBuildAligned(current, latest) && !updateAvailable) {
      return "SUCCEEDED";
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
    if (updateAvailable) {
      return "AVAILABLE";
    }
    if (persistedState?.phase === "FAILED") {
      return "FAILED";
    }
    if (persistedState?.phase === "SUCCEEDED" && !updateAvailable) {
      return "SUCCEEDED";
    }
    return "IDLE";
  }

  private resolveMessage(
    current: CurrentBuildInfo,
    persistedState: PersistedUpdateState | null,
    latestErrorMessage: string | null,
    updateAvailable: boolean,
    latest?: RemoteReleaseInfo | null,
  ) {
    if (current.runtimeMode === "local-single-user" && current.applyBlockedReason) {
      return current.applyBlockedReason;
    }
    if (latestErrorMessage) {
      return latestErrorMessage;
    }
    if (latest && !latest.isValid) {
      return latest.invalidReason || "远端升级版本元数据不完整，当前已阻止继续推荐该版本。";
    }
    if (current.runtimeMode !== "local-single-user" && !this.appConfigService.getStandardRuntimeUpdateManifestUrl()) {
      return "当前展示的是仓库内最近版本记录、Docker 更新命令和同步提醒；如需自动检测新版本，请配置 STANDARD_RUNTIME_UPDATE_MANIFEST_URL。";
    }
    if (this.isCurrentBuildAligned(current, latest || null) && !updateAvailable) {
      return "当前安装版本已经和最新版本对齐。";
    }
    if (persistedState?.phase === "DOWNLOADING") {
      return persistedState.message || "正在下载最新安装包并校验完整性。";
    }
    if (persistedState?.phase === "APPLYING") {
      return persistedState.message || "升级进程已启动，正在后台替换安装目录。";
    }
    if (persistedState?.phase === "READY_TO_APPLY" && !updateAvailable) {
      return persistedState.message || "安装包已准备完成，可开始升级。";
    }
    if (updateAvailable) {
      if (current.runtimeMode !== "local-single-user") {
        return "检测到可用新版本，请按下方引导执行 git pull、重建容器，并按需重新导入 Skill 包。";
      }
      return "检测到可用新版本，可以先下载校验，再执行一键升级。";
    }
    if (persistedState?.phase === "FAILED") {
      return persistedState.message || "上一次升级失败，请重新检查更新。";
    }
    if (persistedState?.phase === "SUCCEEDED" && !updateAvailable) {
      return "当前已经是最新发布版本。";
    }
    return "当前已经是最新发布版本。";
  }

  private async reconcilePersistedState(
    current: CurrentBuildInfo,
    persistedState: PersistedUpdateState | null,
    latest: RemoteReleaseInfo | null,
  ) {
    if (current.runtimeMode !== "local-single-user") {
      return null;
    }
    if (!persistedState) {
      return persistedState;
    }
    if (persistedState.phase === "DOWNLOADING" || persistedState.phase === "READY_TO_APPLY") {
      const lastDownloadActivityAt = resolveDateTime(
        persistedState.checkedAt || persistedState.downloadedAt || persistedState.failedAt,
      );
      if (
        latest
        && persistedState.downloadedReleaseTag
        && persistedState.downloadedReleaseTag !== latest.tagName
      ) {
        const nextState: PersistedUpdateState = {
          ...persistedState,
          phase: "FAILED",
          message: `检测到旧版本下载状态残留（${persistedState.downloadedReleaseTag}），已自动结束。请重新检查更新后再试。`,
          failedAt: new Date().toISOString(),
        };
        await this.writePersistedState(nextState);
        return nextState;
      }
      if (!lastDownloadActivityAt || Date.now() - lastDownloadActivityAt < DOWNLOAD_STALE_TIMEOUT_MS) {
        return persistedState;
      }
      const nextState: PersistedUpdateState = {
        ...persistedState,
        phase: "FAILED",
        message: "上一轮安装包下载长时间没有新进展，已自动结束。请重新检查更新后再试。",
        failedAt: new Date().toISOString(),
      };
      await this.writePersistedState(nextState);
      return nextState;
    }
    if (persistedState.phase !== "APPLYING") {
      return persistedState;
    }
    if (this.isCurrentBuildAligned(current, latest) && !this.computeUpdateAvailable(current, latest)) {
      return persistedState;
    }
    const lastHeartbeatAt = resolveDateTime(persistedState.checkedAt || persistedState.downloadedAt || persistedState.appliedAt);
    if (!lastHeartbeatAt || Date.now() - lastHeartbeatAt < APPLYING_STALE_TIMEOUT_MS) {
      return persistedState;
    }

    const runRoot = this.resolveUpdaterRunRoot(persistedState.updaterRunPath);
    const failureMessage = runRoot
      ? `上一次升级长时间没有新进展，已自动结束。请重新点击升级；如仍失败，请查看 ${runRoot} 下的日志。`
      : "上一次升级长时间没有新进展，已自动结束。请重新点击升级。";
    const nextState: PersistedUpdateState = {
      ...persistedState,
      phase: "FAILED",
      message: failureMessage,
      failedAt: new Date().toISOString(),
    };
    // #region debug-point D:stale-applying-auto-fail
    reportSystemUpdateDebugEvent("D", "system-update.service.ts:reconcilePersistedState:stale-applying", "[DEBUG] stale APPLYING state auto-failed", {
      persistedPhase: persistedState.phase,
      runRoot,
      lastHeartbeatAt: persistedState.checkedAt || persistedState.downloadedAt || persistedState.appliedAt || null,
      failureMessage,
    });
    // #endregion
    await this.writePersistedState(nextState);
    return nextState;
  }

  private async waitForUpdaterBootstrap(options: {
    initialApplyingMessage: string;
    updaterRunPath: string;
    updaterStdoutPath: string;
    updaterStderrPath: string;
    updaterTracePath: string;
    updaterPid: number | null;
    timeoutMs: number;
  }) {
    const deadline = Date.now() + Math.max(3_000, options.timeoutMs);
    while (Date.now() < deadline) {
      const persistedState = this.readPersistedState();
      if (persistedState?.phase === "FAILED") {
        return {
          started: false,
          message: persistedState.message || "升级器启动失败。",
        };
      }
      if (
        persistedState?.phase === "APPLYING"
        && String(persistedState.message || "").trim()
        && String(persistedState.message || "").trim() !== options.initialApplyingMessage
      ) {
        return { started: true, message: "" };
      }

      const stderrSnippet = await this.readLogSnippet(options.updaterStderrPath);
      if (stderrSnippet) {
        return {
          started: false,
          message: `升级器启动失败：${stderrSnippet}`,
        };
      }

      if (
        await this.hasNonEmptyFile(options.updaterTracePath)
        || await this.hasNonEmptyFile(options.updaterStdoutPath)
      ) {
        return { started: true, message: "" };
      }

      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }

    if (isProcessAlive(options.updaterPid)) {
      return {
        started: true,
        message: "",
      };
    }

    const hint = await this.readLogSnippet(options.updaterStderrPath) || await this.readLogSnippet(options.updaterStdoutPath);
    return {
      started: false,
      message: hint
        ? `升级器未成功启动：${hint}`
        : `升级器未成功启动，请检查 ${this.resolveUpdaterRunRoot(options.updaterRunPath)} 下的日志。`,
    };
  }

  private async hasNonEmptyFile(filePath: string) {
    try {
      const fileStat = await stat(filePath);
      return fileStat.size > 0;
    } catch {
      return false;
    }
  }

  private async readLogSnippet(filePath: string) {
    try {
      const text = (await readFile(filePath, "utf8")).replace(/^\uFEFF+/, "").trim();
      if (!text) {
        return "";
      }
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return lines.slice(-3).join(" | ").slice(0, 500);
    } catch {
      return "";
    }
  }

  private resolveUpdaterRunRoot(updaterRunPath?: string | null) {
    return updaterRunPath ? dirname(updaterRunPath) : "";
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

  private supportsUpdateWorkspace(current: CurrentBuildInfo) {
    return current.runtimeMode === "local-single-user" || current.runtimeMode === "standard";
  }

  private getUpdateSourceInfo(current: CurrentBuildInfo): UpdateSourceInfo | null {
    if (current.runtimeMode !== "local-single-user") {
      const manifestUrl = String(this.appConfigService.getStandardRuntimeUpdateManifestUrl() || "").trim();
      if (!manifestUrl) {
        const gitInfo = this.readGitWorkspaceInfo(current.projectRoot);
        return {
          kind: "repo",
          label: "仓库更新指引",
          manifestUrl: "",
          publicBaseUrl: gitInfo.remoteUrl || current.projectRoot,
          executionMode: "guide-only",
        };
      }
      return {
        kind: "manifest",
        label: "远端更新清单",
        manifestUrl,
        publicBaseUrl: manifestUrl,
        executionMode: "guide-only",
      };
    }
    const manifestUrl = String(process.env.LOCAL_SINGLE_USER_UPDATE_MANIFEST_URL || DEFAULT_LOCAL_SINGLE_USER_UPDATE_MANIFEST_URL).trim();
    let publicBaseUrl = manifestUrl;
    try {
      const parsed = new URL(manifestUrl);
      publicBaseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/latest\.json$/i, "")}`;
    } catch {
      publicBaseUrl = manifestUrl.replace(/\/latest\.json$/i, "");
    }
    return {
      kind: "oss",
      label: "阿里云 OSS",
      manifestUrl,
      publicBaseUrl,
      executionMode: "auto-apply",
    };
  }

  private readGitWorkspaceInfo(projectRoot: string): GitWorkspaceInfo {
    const gitRoot = join(projectRoot, ".git");
    const headPath = join(gitRoot, "HEAD");
    try {
      const headContent = readFileSync(headPath, "utf8").replace(/^\uFEFF+/, "").trim();
      if (!headContent) {
        return { branchName: null, shortCommitSha: null, fullCommitSha: null, remoteUrl: this.readGitRemoteUrl(projectRoot) };
      }

      if (headContent.startsWith("ref:")) {
        const ref = headContent.replace(/^ref:\s*/, "").trim();
        const fullCommitSha = this.readGitRefCommit(projectRoot, ref);
        return {
          branchName: ref.split("/").pop() || null,
          shortCommitSha: fullCommitSha ? fullCommitSha.slice(0, 8) : null,
          fullCommitSha,
          remoteUrl: this.readGitRemoteUrl(projectRoot),
        };
      }

      const fullCommitSha = headContent || null;
      return {
        branchName: null,
        shortCommitSha: fullCommitSha ? fullCommitSha.slice(0, 8) : null,
        fullCommitSha,
        remoteUrl: this.readGitRemoteUrl(projectRoot),
      };
    } catch {
      return { branchName: null, shortCommitSha: null, fullCommitSha: null, remoteUrl: this.readGitRemoteUrl(projectRoot) };
    }
  }

  private readGitRefCommit(projectRoot: string, ref: string) {
    const gitRoot = join(projectRoot, ".git");
    const refPath = join(gitRoot, ...ref.split("/"));
    try {
      const value = readFileSync(refPath, "utf8").replace(/^\uFEFF+/, "").trim();
      if (value) {
        return value;
      }
    } catch {
      // Fall back to packed-refs when the loose ref file does not exist.
    }

    try {
      const packedRefs = readFileSync(join(gitRoot, "packed-refs"), "utf8").replace(/^\uFEFF+/, "");
      const line = packedRefs
        .split(/\r?\n/)
        .find((item) => item && !item.startsWith("#") && !item.startsWith("^") && item.endsWith(` ${ref}`));
      if (!line) {
        return null;
      }
      return line.split(" ")[0]?.trim() || null;
    } catch {
      return null;
    }
  }

  private readGitRemoteUrl(projectRoot: string) {
    try {
      const configPath = join(projectRoot, ".git", "config");
      const content = readFileSync(configPath, "utf8").replace(/^\uFEFF+/, "");
      const match = content.match(/\[remote "origin"\][^\[]*?url = (.+)/m);
      return match?.[1]?.trim() || null;
    } catch {
      return null;
    }
  }

  private buildGitReleaseTag(gitInfo: GitWorkspaceInfo) {
    if (gitInfo.branchName && gitInfo.shortCommitSha) {
      return `${gitInfo.branchName}@${gitInfo.shortCommitSha}`;
    }
    return gitInfo.shortCommitSha || gitInfo.branchName || null;
  }

  private buildGitDisplayName(gitInfo: GitWorkspaceInfo) {
    if (gitInfo.branchName && gitInfo.shortCommitSha) {
      return `${gitInfo.branchName} (${gitInfo.shortCommitSha})`;
    }
    return gitInfo.shortCommitSha || gitInfo.branchName || null;
  }

  private async readRecentChangeDocs(projectRoot: string, gitInfo: GitWorkspaceInfo, limit: number): Promise<ChangeDocEntry[]> {
    const changesRoot = join(projectRoot, "docs", "changes");
    try {
      const entries = await readdir(changesRoot, { withFileTypes: true });
      const markdownFiles = entries
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
        .map((entry) => entry.name)
        .sort((left, right) => right.localeCompare(left, "zh-CN"));

      const selected = markdownFiles.slice(0, Math.max(1, limit));
      const docs = await Promise.all(
        selected.map(async (fileName) => {
          const content = (await readFile(join(changesRoot, fileName), "utf8")).replace(/^\uFEFF+/, "");
          const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileName.replace(/\.md$/i, "");
          const preview = this.extractChangeDocPreview(content);
          const appVersion = this.extractChangeDocAppVersion(content);
          const publishedAt = this.extractChangeDocPublishedAt(fileName) || new Date().toISOString();
          return {
            fileName,
            title,
            appVersion,
            publishedAt,
            content: preview,
            changeLogUrl: this.buildChangeDocUrl(projectRoot, gitInfo, fileName),
            likelyRequires: this.detectChangeDocRequirements(`${title}\n${preview}`),
          } satisfies ChangeDocEntry;
        }),
      );
      return docs;
    } catch {
      return [];
    }
  }

  private extractChangeDocPreview(content: string) {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("#") && !line.startsWith("##"));
    return lines.slice(0, 4).join("\n");
  }

  private extractChangeDocAppVersion(content: string) {
    const normalized = String(content || "");
    const match = normalized.match(
      /(?:appVersion\s*[:=]\s*|版本号\s*)(\d+\.\d+\.\d+)|"(?:appVersion|version)"\s*:\s*"(\d+\.\d+\.\d+)"/i,
    );
    const version = match?.[1] || match?.[2] || "";
    return version.trim() || null;
  }

  private extractChangeDocPublishedAt(fileName: string) {
    const match = fileName.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      return null;
    }
    return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+08:00`).toISOString();
  }

  private buildChangeDocUrl(projectRoot: string, gitInfo: GitWorkspaceInfo, fileName: string) {
    const remoteUrl = String(gitInfo.remoteUrl || "").trim();
    if (!remoteUrl.includes("github.com")) {
      return null;
    }
    const normalizedRemote = remoteUrl.replace(/\.git$/i, "").replace(/^git@github\.com:/i, "https://github.com/");
    const branchName = this.resolveRecommendedGitUpdateBranch(projectRoot, gitInfo);
    return `${normalizedRemote}/blob/${encodeURIComponent(branchName)}/docs/changes/${encodeURIComponent(fileName)}`;
  }

  private resolveRecommendedGitUpdateBranch(projectRoot: string, gitInfo: GitWorkspaceInfo) {
    const remoteHeadBranch = this.readGitRemoteHeadBranch(projectRoot);
    if (remoteHeadBranch) {
      return remoteHeadBranch;
    }
    return gitInfo.branchName || "main";
  }

  private readGitRemoteHeadBranch(projectRoot: string) {
    try {
      const output = execFileSync("git", ["ls-remote", "--symref", "origin", "HEAD"], {
        cwd: projectRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 5000,
      }).replace(/^\uFEFF+/, "");
      const match = output.match(/ref:\s+refs\/heads\/([^\s]+)\s+HEAD/);
      return match?.[1]?.trim() || null;
    } catch {
      return null;
    }
  }

  private detectChangeDocRequirements(text: string) {
    const normalized = String(text || "").toLowerCase();
    return {
      server: /(server|api|后端|controller|service|docker|compose|启动|upgrade|更新)/.test(normalized),
      web: /(web|页面|前端|个人中心|工作台|ui|layout|workspace)/.test(normalized),
      skillPackage: /(skill|mcp|openclaw)/.test(normalized),
      migration: /(schema|迁移|migration|db-init|数据库|prisma)/.test(normalized),
    };
  }

  private async fetchOssLatestManifestPayload(manifestUrl: string): Promise<OssLatestManifest> {
    return this.fetchJson<OssLatestManifest>(manifestUrl, "application/json");
  }

  private async resolveSystemUpdateDebugServerUrl() {
    try {
      const envText = await readFile(SYSTEM_UPDATE_DEBUG_ENV_PATH, "utf8");
      return envText.match(/^DEBUG_SERVER_URL=(.+)$/m)?.[1]?.trim() || "http://127.0.0.1:7777/event";
    } catch {
      return "http://127.0.0.1:7777/event";
    }
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

  private async fetchJson<T>(url: string, accept = "application/json") {
    if (process.platform === "win32") {
      try {
        const responseText = await this.fetchTextWithWindowsCurl(url, accept);
        return JSON.parse(responseText) as T;
      } catch {
        // Fall back to Node fetch when curl cannot reach the update source in the current network path.
      }
    }
    const response = await this.fetch(url, {
      headers: {
        Accept: accept,
      },
    });
    return response.json() as Promise<T>;
  }

  private async fetchText(url: string, accept = "text/plain") {
    if (process.platform === "win32") {
      try {
        return await this.fetchTextWithWindowsCurl(url, accept);
      } catch {
        // Fall back to Node fetch when curl cannot reach the update source in the current network path.
      }
    }
    const response = await this.fetch(url, {
      headers: {
        Accept: accept,
      },
    });
    return response.text();
  }

  private async fetchTextWithWindowsCurl(url: string, accept: string, timeoutMs = 60_000) {
    const curlExe = this.resolveCurlExe();
    if (!existsSync(curlExe)) {
      throw new Error("curl.exe not found");
    }
    const githubToken = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
    const maxTimeSeconds = Math.max(60, Math.ceil(timeoutMs / 1000));
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const args = [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--connect-timeout",
        "30",
        "--max-time",
        String(maxTimeSeconds),
        "--header",
        "User-Agent: ai-omni-ops-system-updater",
        "--header",
        `Accept: ${accept}`,
      ];
      if (githubToken) {
        args.push("--header", `Authorization: Bearer ${githubToken}`);
      }
      args.push(url);

      try {
        return await this.runWindowsCurlCapture(curlExe, args, timeoutMs + 5_000, "curl fetch failed");
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !this.shouldRetryFetchError(error)) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError || "fetch failed"));
  }

  private async fetch(url: string, init?: RequestInit, options?: { timeoutMs?: number }) {
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeoutMs = options?.timeoutMs ?? 60_000;
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
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !this.shouldRetryFetchError(error)) {
          throw error;
        }
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError || "fetch failed"));
  }

  private async resolveDirectAssetDownloadUrl(url: string) {
    if (process.platform === "win32") {
      try {
        return await this.resolveDirectAssetDownloadUrlWithWindowsCurl(url);
      } catch {
        return url;
      }
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
      const headers = new Headers();
      headers.set("User-Agent", "ai-omni-ops-system-updater");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        headers,
        signal: controller.signal,
      });
      const redirectedUrl = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && redirectedUrl) {
        return redirectedUrl;
      }
      return url;
    } catch {
      return url;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async resolveDirectAssetDownloadUrlWithWindowsCurl(url: string) {
    const curlExe = this.resolveCurlExe();
    if (!existsSync(curlExe)) {
      return url;
    }
    const githubToken = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
    const maxAttempts = 20;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const args = [
        "--silent",
        "--show-error",
        "--location",
        "--range",
        "0-0",
        "--output",
        "NUL",
        "--connect-timeout",
        "30",
        "--max-time",
        "60",
        "--write-out",
        "%{url_effective}",
        "--header",
        "User-Agent: ai-omni-ops-system-updater",
      ];
      if (githubToken) {
        args.push("--header", `Authorization: Bearer ${githubToken}`);
      }
      args.push(url);

      try {
        const resolvedUrl = (await this.runWindowsCurlCapture(
          curlExe,
          args,
          65_000,
          "curl resolve asset url failed",
        )).trim();
        return resolvedUrl || url;
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !this.shouldRetryDownloadError(error)) {
          break;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError || "resolve asset url failed"));
  }

  private shouldRetryFetchError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }
    const causeCode =
      typeof (error as Error & { cause?: { code?: unknown } }).cause?.code === "string"
        ? (error as Error & { cause?: { code?: string } }).cause?.code
        : null;
    const statusCodeMatch = error.message.match(/^(\d{3})\b/);
    const statusCode = statusCodeMatch ? Number(statusCodeMatch[1]) : null;
    return error.name === "AbortError"
      || error.message === "fetch failed"
      || error.message.startsWith("curl fetch failed:")
      || causeCode === "ECONNRESET"
      || statusCode === 408
      || statusCode === 429
      || (statusCode !== null && statusCode >= 500);
  }

  private async downloadFile(url: string, filePath: string, expectedSize?: number, options?: { sourceUrl?: string }) {
    if (process.platform === "win32") {
      await this.downloadFileWithWindowsPowerShell(url, filePath, expectedSize, options);
      return;
    }

    const maxAttempts = 20;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const existingSize = await this.readExistingDownloadSize(filePath, expectedSize);
      if (expectedSize && existingSize === expectedSize) {
        return;
      }

      try {
        const response = await this.fetch(
          url,
          existingSize > 0
            ? {
                headers: {
                  Range: `bytes=${existingSize}-`,
                },
              }
            : undefined,
          {
          timeoutMs: 30 * 60_000,
          },
        );
        if (!response.body) {
          throw new Error(`下载响应为空：${url}`);
        }
        const appendMode = existingSize > 0 && response.status === 206;
        await mkdir(dirname(filePath), { recursive: true });
        if (!appendMode) {
          await rm(filePath, { force: true }).catch(() => undefined);
        }
        await pipeline(
          Readable.fromWeb(response.body as any),
          createWriteStream(filePath, appendMode ? { flags: "a" } : undefined),
        );
        await this.assertDownloadedFileSize(filePath, expectedSize);
        return;
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !this.shouldRetryDownloadError(error)) {
          throw error;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError || "download failed"));
  }

  private async downloadFileWithWindowsPowerShell(
    url: string,
    filePath: string,
    expectedSize?: number,
    options?: { sourceUrl?: string },
  ) {
    const maxAttempts = 5;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const existingSize = await this.readExistingDownloadSize(filePath, expectedSize);
      if (expectedSize && existingSize === expectedSize) {
        return;
      }
      try {
        const curlExe = this.resolveCurlExe();
        if (existsSync(curlExe)) {
          await this.runWindowsCurlDownload(curlExe, options?.sourceUrl || url, filePath, 45 * 60_000);
        } else {
          await this.runWindowsPowerShellDownload(url, filePath, expectedSize, 45 * 60_000);
        }
        await this.assertDownloadedFileSize(filePath, expectedSize);
        return;
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts || !this.shouldRetryDownloadError(error)) {
          throw error;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError || "download failed"));
  }

  private async runWindowsCurlDownload(curlExe: string, url: string, filePath: string, timeoutMs: number) {
    await mkdir(dirname(filePath), { recursive: true });
    const githubToken = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
    const maxTimeSeconds = Math.max(60, Math.ceil(timeoutMs / 1000));
    const args = [
      "--fail",
      "--silent",
      "--show-error",
      "--location",
      "--continue-at",
      "-",
      "--output",
      filePath,
      "--connect-timeout",
      "30",
      "--max-time",
      String(maxTimeSeconds),
      "--header",
      "User-Agent: ai-omni-ops-system-updater",
    ];
    if (githubToken) {
      args.push("--header", `Authorization: Bearer ${githubToken}`);
    }
    args.push(url);

    await this.runWindowsCurlCommand(curlExe, args, timeoutMs + 5_000, "curl download failed");
  }

  private async runWindowsParallelCurlDownload(
    curlExe: string,
    url: string,
    filePath: string,
    expectedSize: number,
    timeoutMs: number,
    sourceUrl: string,
  ) {
    await mkdir(dirname(filePath), { recursive: true });
    const partsRoot = `${filePath}.parts`;
    await rm(partsRoot, { recursive: true, force: true }).catch(() => undefined);
    await rm(filePath, { force: true }).catch(() => undefined);
    await mkdir(partsRoot, { recursive: true });

    const chunkSize = 4 * 1024 * 1024;
    const chunkCount = Math.ceil(expectedSize / chunkSize);
    const chunks = Array.from({ length: chunkCount }, (_, index) => {
      const start = index * chunkSize;
      const end = Math.min(expectedSize - 1, start + chunkSize - 1);
      return {
        index,
        start,
        end,
        expectedBytes: end - start + 1,
        partPath: join(partsRoot, `part-${String(index).padStart(4, "0")}.bin`),
      };
    });
    let currentChunkUrl = url;

    try {
      for (const chunk of chunks) {
        currentChunkUrl = await this.downloadWindowsCurlChunk(
          curlExe,
          currentChunkUrl,
          sourceUrl,
          chunk.partPath,
          chunk.start,
          chunk.end,
          timeoutMs,
        );
        const partStat = await stat(chunk.partPath);
        if (partStat.size !== chunk.expectedBytes) {
          throw new Error(`curl chunk size mismatch: expected ${chunk.expectedBytes}, got ${partStat.size}`);
        }
      }

      for (const chunk of chunks) {
        const chunkBuffer = await readFile(chunk.partPath);
        await writeFile(filePath, chunkBuffer, { flag: chunk.index === 0 ? "w" : "a" });
      }
    } finally {
      await rm(partsRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async downloadWindowsCurlChunk(
    curlExe: string,
    url: string,
    sourceUrl: string,
    partPath: string,
    start: number,
    end: number,
    timeoutMs: number,
  ) {
    const githubToken = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
    const commandTimeoutMs = Math.min(timeoutMs, 90_000);
    const maxTimeSeconds = Math.max(60, Math.ceil(commandTimeoutMs / 1000));
    const maxAttempts = 6;
    let lastError: unknown;
    let chunkUrl = url;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await rm(partPath, { force: true }).catch(() => undefined);
      const args = [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--range",
        `${start}-${end}`,
        "--output",
        partPath,
        "--connect-timeout",
        "30",
        "--max-time",
        String(maxTimeSeconds),
        "--header",
        "User-Agent: ai-omni-ops-system-updater",
      ];
      if (githubToken) {
        args.push("--header", `Authorization: Bearer ${githubToken}`);
      }
      args.push(chunkUrl);

      try {
        await this.runWindowsCurlCommand(curlExe, args, commandTimeoutMs + 5_000, "curl chunk download failed", partPath);
        return chunkUrl;
      } catch (error) {
        lastError = error;
        if (sourceUrl && this.shouldRefreshDirectAssetUrl(error)) {
          try {
            const refreshedUrl = await this.resolveDirectAssetDownloadUrl(sourceUrl);
            if (refreshedUrl && refreshedUrl !== chunkUrl) {
              chunkUrl = refreshedUrl;
            }
          } catch {
            chunkUrl = sourceUrl;
          }
        } else if (sourceUrl && chunkUrl !== sourceUrl && this.shouldRetryDownloadError(error)) {
          chunkUrl = sourceUrl;
        }
        if (attempt >= maxAttempts || !this.shouldRetryDownloadError(error)) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError || "download failed"));
  }

  private async runWindowsCurlCommand(
    curlExe: string,
    args: string[],
    timeoutMs: number,
    label: string,
    progressFilePath?: string,
  ) {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn(curlExe, args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      const requestChildTermination = () => {
        try {
          child.kill();
        } catch {
          // Ignore already-exited child processes.
        }
        void this.terminateChildProcess(child.pid);
      };
      const timeout = timeoutMs > 0
        ? setTimeout(() => {
            requestChildTermination();
          }, timeoutMs + 5_000)
        : null;
      let lastObservedSize = -1;
      let lastGrowthAt = Date.now();
      const progressWatch = progressFilePath
        ? setInterval(async () => {
            try {
              const fileStat = await stat(progressFilePath);
              if (fileStat.size > lastObservedSize) {
                lastObservedSize = fileStat.size;
                lastGrowthAt = Date.now();
                return;
              }
            } catch {
              // Ignore missing progress files until the first bytes land.
            }
            if (Date.now() - lastGrowthAt >= 45_000) {
              requestChildTermination();
            }
          }, 10_000)
        : null;

      child.stdout?.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
      child.stderr?.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
      child.on("error", (error) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        if (progressWatch) {
          clearInterval(progressWatch);
        }
        rejectPromise(error);
      });
      child.on("close", (code, signal) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        if (progressWatch) {
          clearInterval(progressWatch);
        }
        if (code === 0) {
          resolvePromise();
          return;
        }
        const stderrText = Buffer.concat(stderrChunks).toString("utf8").trim();
        const stdoutText = Buffer.concat(stdoutChunks).toString("utf8").trim();
        const details = stderrText || stdoutText || `exit=${code ?? "null"}, signal=${signal ?? "null"}`;
        rejectPromise(new Error(`${label}: ${details}`));
      });
    });
  }

  private async terminateChildProcess(pid: number | undefined) {
    if (!pid) {
      return;
    }
    if (process.platform === "win32") {
      await new Promise<void>((resolvePromise) => {
        const cmdExe = this.resolveCmdExe();
        const killer = spawn(cmdExe, ["/d", "/c", "taskkill", "/PID", String(pid), "/T", "/F"], {
          stdio: "ignore",
          windowsHide: true,
        });
        killer.on("error", () => resolvePromise());
        killer.on("close", () => resolvePromise());
      });
      return;
    }
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Ignore already-exited processes.
    }
  }

  private async runWindowsCurlCapture(curlExe: string, args: string[], timeoutMs: number, label: string) {
    return new Promise<string>((resolvePromise, rejectPromise) => {
      const child = spawn(curlExe, args, {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      const timeout = timeoutMs > 0
        ? setTimeout(() => {
            child.kill();
          }, timeoutMs)
        : null;

      child.stdout?.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
      child.stderr?.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
      child.on("error", (error) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        rejectPromise(error);
      });
      child.on("close", (code, signal) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        if (code === 0) {
          resolvePromise(Buffer.concat(stdoutChunks).toString("utf8"));
          return;
        }
        const stderrText = Buffer.concat(stderrChunks).toString("utf8").trim();
        const stdoutText = Buffer.concat(stdoutChunks).toString("utf8").trim();
        const details = stderrText || stdoutText || `exit=${code ?? "null"}, signal=${signal ?? "null"}`;
        rejectPromise(new Error(`${label}: ${details}`));
      });
    });
  }

  private async runWindowsPowerShellDownload(url: string, filePath: string, expectedSize: number | undefined, timeoutMs: number) {
    await mkdir(dirname(filePath), { recursive: true });
    const powershellExe = this.resolvePowerShellExe();
    const githubToken = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
    const expectedSizeArgument = expectedSize && expectedSize > 0 ? Math.trunc(expectedSize) : 0;
    const scriptPath = `${filePath}.download.ps1`;
    const scriptContent = [
      `param(`,
      `  [Parameter(Mandatory = $true)][string]$DownloadUrl,`,
      `  [Parameter(Mandatory = $true)][string]$DestinationPath,`,
      `  [string]$GitHubToken = '',`,
      `  [Int64]$ExpectedSize = 0`,
      `)`,
      ``,
      `$ErrorActionPreference = 'Stop'`,
      `$ProgressPreference = 'SilentlyContinue'`,
      `Add-Type -AssemblyName System.Net.Http`,
      ``,
      `$handler = [System.Net.Http.HttpClientHandler]::new()`,
      `$handler.AllowAutoRedirect = $false`,
      `$client = [System.Net.Http.HttpClient]::new($handler)`,
      `$client.Timeout = [TimeSpan]::FromMinutes(10)`,
      ``,
      `try {`,
      `  $headRequest = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Head, $DownloadUrl)`,
      `  $headRequest.Headers.UserAgent.ParseAdd('ai-omni-ops-system-updater')`,
      `  if ($GitHubToken) {`,
      `    $headRequest.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $GitHubToken)`,
      `  }`,
      `  $headResponse = $client.SendAsync($headRequest).Result`,
      `  try {`,
      `    $resolvedUrl = if ($headResponse.StatusCode.value__ -ge 300 -and $headResponse.StatusCode.value__ -lt 400 -and $headResponse.Headers.Location) {`,
      `      $headResponse.Headers.Location.ToString()`,
      `    } else {`,
      `      $DownloadUrl`,
      `    }`,
      `    $resolvedContentLength = if ($headResponse.Content -and $headResponse.Content.Headers -and $headResponse.Content.Headers.ContentLength) {`,
      `      [Int64]$headResponse.Content.Headers.ContentLength`,
      `    } else {`,
      `      0`,
      `    }`,
      `  } finally {`,
      `    $headResponse.Dispose()`,
      `    $headRequest.Dispose()`,
      `  }`,
      ``,
      `  $targetSize = if ($ExpectedSize -gt 0) { $ExpectedSize } elseif ($resolvedContentLength -gt 0) { $resolvedContentLength } else { 0 }`,
      `  if ($targetSize -le 0) {`,
      `    throw 'Unable to determine expected download size.'`,
      `  }`,
      ``,
      `  $destinationDir = Split-Path -Parent $DestinationPath`,
      `  if ($destinationDir) {`,
      `    New-Item -ItemType Directory -Force -Path $destinationDir | Out-Null`,
      `  }`,
      ``,
      `  $existingLength = if (Test-Path $DestinationPath) { [Int64](Get-Item $DestinationPath).Length } else { 0 }`,
      `  if ($existingLength -gt $targetSize) {`,
      `    Remove-Item -Force $DestinationPath`,
      `    $existingLength = 0`,
      `  }`,
      ``,
      `  $chunkSize = [Int64](8MB)`,
      `  $buffer = New-Object byte[] (1024 * 1024)`,
      `  $maxChunkAttempts = 8`,
      ``,
      `  while ($existingLength -lt $targetSize) {`,
      `    $chunkStart = $existingLength`,
      `    $chunkEnd = [Math]::Min($chunkStart + $chunkSize - 1, $targetSize - 1)`,
      `    $expectedChunkBytes = $chunkEnd - $chunkStart + 1`,
      `    $chunkCompleted = $false`,
      ``,
      `    for ($chunkAttempt = 1; $chunkAttempt -le $maxChunkAttempts -and -not $chunkCompleted; $chunkAttempt += 1) {`,
      `      $request = $null`,
      `      $response = $null`,
      `      $stream = $null`,
      `      $fileStream = $null`,
      `      $bytesWritten = 0`,
      `      try {`,
      `        $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $resolvedUrl)`,
      `        $request.Headers.UserAgent.ParseAdd('ai-omni-ops-system-updater')`,
      `        if ($GitHubToken) {`,
      `          $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $GitHubToken)`,
      `        }`,
      `        $request.Headers.Range = [System.Net.Http.Headers.RangeHeaderValue]::new($chunkStart, $chunkEnd)`,
      `        $response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).Result`,
      `        if ($response.StatusCode -ne [System.Net.HttpStatusCode]::PartialContent) {`,
      `          throw ('Unexpected status code for ranged download: ' + [int]$response.StatusCode.value__)`,
      `        }`,
      `        $stream = $response.Content.ReadAsStreamAsync().Result`,
      `        $fileStream = [System.IO.File]::Open($DestinationPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)`,
      `        $fileStream.Seek($chunkStart, [System.IO.SeekOrigin]::Begin) | Out-Null`,
      `        while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {`,
      `          $fileStream.Write($buffer, 0, $read)`,
      `          $bytesWritten += $read`,
      `        }`,
      `        if ($bytesWritten -ne $expectedChunkBytes) {`,
      `          throw ('chunk size mismatch: expected ' + $expectedChunkBytes + ', got ' + $bytesWritten)`,
      `        }`,
      `        $existingLength += $bytesWritten`,
      `        $chunkCompleted = $true`,
      `      } catch {`,
      `        if ($fileStream) {`,
      `          $fileStream.SetLength($chunkStart)`,
      `        }`,
      `        if ($chunkAttempt -ge $maxChunkAttempts) {`,
      `          throw`,
      `        }`,
      `      } finally {`,
      `        if ($fileStream) { $fileStream.Dispose() }`,
      `        if ($stream) { $stream.Dispose() }`,
      `        if ($response) { $response.Dispose() }`,
      `        if ($request) { $request.Dispose() }`,
      `      }`,
      `    }`,
      `  }`,
      `} finally {`,
      `  $client.Dispose()`,
      `  $handler.Dispose()`,
      `}`,
      ``,
    ].join("\r\n");
    await writeFile(scriptPath, scriptContent, "utf8");

    try {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        const child = spawn(
          powershellExe,
          [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            scriptPath,
            "-DownloadUrl",
            url,
            "-DestinationPath",
            filePath,
            "-GitHubToken",
            githubToken,
            "-ExpectedSize",
            String(expectedSizeArgument),
          ],
          {
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
          },
        );
        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];
        const timeout = timeoutMs > 0
          ? setTimeout(() => {
              child.kill();
            }, timeoutMs)
          : null;

        child.stdout?.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
        child.stderr?.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
        child.on("error", (error) => {
          if (timeout) {
            clearTimeout(timeout);
          }
          rejectPromise(error);
        });
        child.on("close", (code, signal) => {
          if (timeout) {
            clearTimeout(timeout);
          }
          if (code === 0) {
            resolvePromise();
            return;
          }
          const stderrText = Buffer.concat(stderrChunks).toString("utf8").trim();
          const stdoutText = Buffer.concat(stdoutChunks).toString("utf8").trim();
          const details = stderrText || stdoutText || `exit=${code ?? "null"}, signal=${signal ?? "null"}`;
          rejectPromise(new Error(`PowerShell download failed: ${details}`));
        });
      });
    } finally {
      await rm(scriptPath, { force: true }).catch(() => undefined);
    }
  }

  private async readExistingDownloadSize(filePath: string, expectedSize?: number) {
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat) {
      return 0;
    }
    if (expectedSize && fileStat.size > expectedSize) {
      await rm(filePath, { force: true }).catch(() => undefined);
      return 0;
    }
    return fileStat.size;
  }

  private async assertDownloadedFileSize(filePath: string, expectedSize?: number) {
    if (!expectedSize || expectedSize <= 0) {
      return;
    }
    const fileStat = await stat(filePath);
    if (fileStat.size !== expectedSize) {
      throw new Error(`downloaded file size mismatch: expected ${expectedSize}, got ${fileStat.size}`);
    }
  }

  private shouldRetryDownloadError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }
    const causeCode =
      typeof (error as Error & { cause?: { code?: unknown } }).cause?.code === "string"
        ? (error as Error & { cause?: { code?: string } }).cause?.code
        : null;
    return error.message === "terminated"
      || error.message.startsWith("downloaded file size mismatch:")
      || error.message.startsWith("curl chunk download failed:")
      || error.message.startsWith("curl download failed:")
      || error.message.startsWith("PowerShell download failed:")
      || causeCode === "ECONNRESET"
      || this.shouldRetryFetchError(error);
  }

  private shouldRefreshDirectAssetUrl(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }
    return /returned error:\s*(401|403)\b/i.test(error.message) || /\b(401|403)\b/.test(error.message);
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

  private resolveCurlExe() {
    if (process.platform !== "win32") {
      return "curl";
    }
    const systemRoot = String(process.env.SystemRoot || "C:\\Windows").trim() || "C:\\Windows";
    return resolve(systemRoot, "System32", "curl.exe");
  }

  private resolveCmdExe() {
    if (process.platform !== "win32") {
      return "cmd";
    }
    const systemRoot = String(process.env.SystemRoot || "C:\\Windows").trim() || "C:\\Windows";
    return resolve(systemRoot, "System32", "cmd.exe");
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

const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const http = require("node:http");
const { spawn, spawnSync } = require("node:child_process");
const {
  DEFAULT_API_PORT,
  DEFAULT_WEB_PORT,
  buildLocalSingleUserEnv,
  findAvailablePort,
  getLifecycleStatePath,
  isProcessAlive,
  openBrowser,
  projectRoot,
  writeLifecycleState,
  shouldAutoOpenBrowser,
  sleep,
} = require("./local-single-user-runtime.cjs");
const { generateLocalSchema, targetSchemaPath } = require("./generate-local-prisma-schema.cjs");
const {
  resolvePowerShellExecutable,
  resolveTaskkillExecutable,
} = require("./local-single-user-platform.cjs");

const URL_READY_TIMEOUT_MS = 90_000;
const URL_READY_POLL_INTERVAL_MS = 1_000;
const LAUNCHER_LOCK_STALE_MS = 3 * 60 * 1_000;
const DEFAULT_SELF_HEAL_MAX_ATTEMPTS = 2;
const SELF_HEAL_RETRY_DELAY_MS = 2_000;
const WORKER_RESTART_DELAY_MS = 2_000;
const WORKER_RESTART_WINDOW_MS = 10 * 60 * 1_000;
const WORKER_MAX_RESTARTS_PER_WINDOW = 3;

// #region debug-point A:report-helper
function emitLauncherDebug(hypothesisId, msg, data = {}) {
  try {
    const line = `[${new Date().toISOString()}] [debug:${hypothesisId}] ${msg} ${JSON.stringify(data)}\n`;
    fs.appendFileSync(getBootstrapLogPath(), line, "utf8");
  } catch {
    // Ignore local debug log failures.
  }
  const envCandidates = [
    path.join(projectRoot, ".dbg", "local-root-500.env"),
    path.join(projectRoot, ".dbg", "install-upgrade-stall.env"),
    path.join(projectRoot, ".dbg", "reboot-page-unreachable.env"),
    path.join(projectRoot, ".dbg", "local-runtime-exit.env"),
  ];
  let debugServerUrl = "http://127.0.0.1:7777/event";
  let sessionId = "install-upgrade-stall";
  for (const envPath of envCandidates) {
    try {
      if (!fs.existsSync(envPath)) {
        continue;
      }
      const envText = fs.readFileSync(envPath, "utf8");
      debugServerUrl =
        envText.match(/^DEBUG_SERVER_URL=(.+)$/m)?.[1]?.trim() ||
        debugServerUrl;
      sessionId =
        envText.match(/^DEBUG_SESSION_ID=(.+)$/m)?.[1]?.trim() ||
        sessionId;
      break;
    } catch {
      // Ignore missing debug env.
    }
  }
  if (typeof fetch !== "function") {
    return;
  }
  fetch(debugServerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      runId: "pre-fix",
      hypothesisId,
      location: "scripts/local-single-user-launcher.cjs",
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

function getBootstrapLogPath() {
  const runtime = buildLocalSingleUserEnv({
    apiPort: DEFAULT_API_PORT,
    webPort: DEFAULT_WEB_PORT,
  });
  fs.mkdirSync(runtime.paths.logsRoot, { recursive: true });
  return path.join(runtime.paths.logsRoot, "launcher.log");
}

function appendBootstrapLog(message) {
  try {
    const line = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(getBootstrapLogPath(), line, "utf8");
  } catch {
    // Ignore bootstrap logging failures.
  }
}

function recordLifecycleState(snapshot, env = process.env) {
  try {
    const statePath = writeLifecycleState(snapshot, env);
    appendBootstrapLog(`Lifecycle state written: ${statePath}; phase=${snapshot.phase || "unknown"}`);
    return statePath;
  } catch (error) {
    appendBootstrapLog(`Lifecycle state write skipped: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function removePathIfExists(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function removeEmptyDirectoryIfExists(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }
  try {
    if (fs.readdirSync(targetPath).length === 0) {
      fs.rmSync(targetPath, { recursive: false, force: true });
    }
  } catch {
    // Ignore empty-dir cleanup failures.
  }
}

function cleanupHistoricalUpdateArtifacts(paths) {
  const updatesRoot = paths?.updatesRoot;
  if (!updatesRoot || !fs.existsSync(updatesRoot)) {
    return;
  }

  const updateEntries = fs.readdirSync(updatesRoot, { withFileTypes: true });
  for (const entry of updateEntries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const fullPath = path.join(updatesRoot, entry.name);
    const shouldRemove =
      entry.name === "downloads"
      || entry.name === "apply-runs"
      || entry.name.startsWith("extract-");
    if (!shouldRemove) {
      continue;
    }
    try {
      removePathIfExists(fullPath);
      appendBootstrapLog(`Clean startup update artifact: ${fullPath}`);
    } catch (error) {
      appendBootstrapLog(`Skip startup update artifact cleanup: ${fullPath}; reason=${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function cleanupLegacyLocalAppDataArtifacts() {
  if (process.platform !== "win32" || !process.env.LOCALAPPDATA) {
    return;
  }

  const legacyRoot = path.join(process.env.LOCALAPPDATA, "AiOmniOps");
  if (!fs.existsSync(legacyRoot)) {
    return;
  }

  const cleanupTargets = [
    path.join(legacyRoot, "updates"),
    path.join(legacyRoot, "downloads"),
    path.join(legacyRoot, "apply-runs"),
    path.join(legacyRoot, "extract"),
  ];

  for (const targetPath of cleanupTargets) {
    try {
      removePathIfExists(targetPath);
      appendBootstrapLog(`Clean legacy local appdata artifact: ${targetPath}`);
    } catch (error) {
      appendBootstrapLog(`Skip legacy local appdata cleanup: ${targetPath}; reason=${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const legacyLogsRoot = path.join(legacyRoot, "logs");
  if (fs.existsSync(legacyLogsRoot)) {
    const logEntries = fs.readdirSync(legacyLogsRoot, { withFileTypes: true });
    for (const entry of logEntries) {
      if (!entry.isFile()) {
        continue;
      }
      if (!/^install-local-single-user\.log$|^local-single-user-updater.*\.log$|^updater-launcher.*\.log$/i.test(entry.name)) {
        continue;
      }
      const fullPath = path.join(legacyLogsRoot, entry.name);
      try {
        removePathIfExists(fullPath);
        appendBootstrapLog(`Clean legacy local appdata log: ${fullPath}`);
      } catch (error) {
        appendBootstrapLog(`Skip legacy local appdata log cleanup: ${fullPath}; reason=${error instanceof Error ? error.message : String(error)}`);
      }
    }
    removeEmptyDirectoryIfExists(legacyLogsRoot);
  }

  removeEmptyDirectoryIfExists(legacyRoot);
}

function resolveNpmCli() {
  const candidates = [
    process.env.npm_execpath,
    path.resolve(process.execPath, "..", "..", "node_modules", "npm", "bin", "npm-cli.js"),
    path.resolve(process.execPath, "..", "node_modules", "npm", "bin", "npm-cli.js"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("未找到 npm-cli.js，无法执行本地单机构建。");
}

function resolveInstalledReleaseMetadata() {
  const releaseManifestPath = path.resolve(projectRoot, "..", "meta", "release-manifest.json");
  if (!fs.existsSync(releaseManifestPath)) {
    return {
      releaseManifestPath,
      releaseTag: null,
      appVersion: null,
    };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(releaseManifestPath, "utf8"));
    return {
      releaseManifestPath,
      releaseTag: String(manifest?.releaseTag || "").trim() || null,
      appVersion: String(manifest?.appVersion || "").trim() || null,
    };
  } catch {
    return {
      releaseManifestPath,
      releaseTag: null,
      appVersion: null,
    };
  }
}

function isPrebuiltOnlyLauncherMode(env = process.env) {
  const value = String(env.LOCAL_SINGLE_USER_PREBUILT_ONLY || "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function getSelfHealMaxAttempts(env = process.env) {
  const parsed = Number.parseInt(String(env.LOCAL_SINGLE_USER_SELF_HEAL_MAX_ATTEMPTS || "").trim(), 10);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_SELF_HEAL_MAX_ATTEMPTS;
}

function resolveNextBin() {
  const candidates = [
    path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"),
    path.join(projectRoot, "apps", "web", "node_modules", "next", "dist", "bin", "next"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return require.resolve("next/dist/bin/next", { paths: [projectRoot] });
}

function resolveNativeNextSwcBinaryPath() {
  const candidates = [
    path.join(projectRoot, "node_modules", "@next", "swc-win32-x64-msvc", "next-swc.win32-x64-msvc.node"),
    path.join(projectRoot, "apps", "web", "node_modules", "@next", "swc-win32-x64-msvc", "next-swc.win32-x64-msvc.node"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function ensureCompatibleNextSwcEnv(env) {
  if (process.platform !== "win32") {
    return;
  }
  if (String(env.NEXT_FORCE_WASM_BINARY || "").trim() === "1") {
    return;
  }
  const nativeSwcBinaryPath = resolveNativeNextSwcBinaryPath();
  if (!nativeSwcBinaryPath) {
    return;
  }
  const probeScript = [
    `try { require(${JSON.stringify(nativeSwcBinaryPath)}); process.stdout.write("native-swc-ok"); }`,
    "catch (error) {",
    '  process.stderr.write(String(error && error.code ? error.code : "ERR_NATIVE_SWC_PROBE_FAILED") + "\\n");',
    '  process.stderr.write(String(error && error.message ? error.message : error) + "\\n");',
    "  process.exit(1);",
    "}",
  ].join("\n");
  const probeResult = spawnSync(process.execPath, ["-e", probeScript], {
    cwd: projectRoot,
    env,
    stdio: "pipe",
    windowsHide: true,
    encoding: "utf8",
    timeout: 5_000,
  });
  if (probeResult.status === 0) {
    return;
  }
  const failureSummary = [probeResult.stderr, probeResult.stdout]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" | ")
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" | ");
  env.NEXT_FORCE_WASM_BINARY = "1";
  console.warn(
    `[warn] Native Next SWC unavailable on current Windows runtime; forcing wasm binary for this launcher run.${failureSummary ? ` ${failureSummary}` : ""}`,
  );
}

function canBootStandaloneServer(serverPath) {
  if (!fs.existsSync(serverPath)) {
    return false;
  }

  let currentDir = path.dirname(serverPath);
  for (let index = 0; index < 6; index += 1) {
    const nextPackagePath = path.join(currentDir, "node_modules", "next", "package.json");
    if (fs.existsSync(nextPackagePath)) {
      return true;
    }
    const parentDir = path.dirname(currentDir);
    if (!parentDir || parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return false;
}

function resolveStandaloneServer(webRoot) {
  const candidates = [
    path.join(webRoot, ".next", "standalone", path.basename(projectRoot), "apps", "web", "server.js"),
    path.join(webRoot, ".next", "standalone", "apps", "web", "server.js"),
    path.join(webRoot, ".next", "standalone", "server.js"),
  ];

  for (const candidate of candidates) {
    if (canBootStandaloneServer(candidate)) {
      return candidate;
    }
  }

  const standaloneRoot = path.join(webRoot, ".next", "standalone");
  if (!fs.existsSync(standaloneRoot)) {
    return null;
  }

  const pending = [standaloneRoot];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === "server.js" && canBootStandaloneServer(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

function syncDirectoryIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return;
  }
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
  if (process.platform === "win32") {
    const powershellExe = resolvePowerShellExecutable(process.env);
    const copyResult = spawnSync(
      powershellExe,
      [
        "-NoProfile",
        "-Command",
        [
          `$src = ${JSON.stringify(sourcePath)}`,
          `$dst = ${JSON.stringify(targetPath)}`,
          "New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null",
          "Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force",
        ].join("; "),
      ],
      {
        stdio: "pipe",
        windowsHide: true,
        encoding: "utf8",
      },
    );
    if (copyResult.status === 0) {
      return;
    }
    throw new Error(
      [
        `同步目录失败：${sourcePath} -> ${targetPath}`,
        copyResult.stderr?.trim() ? `stderr:\n${copyResult.stderr.trim()}` : "",
        copyResult.stdout?.trim() ? `stdout:\n${copyResult.stdout.trim()}` : "",
      ].filter(Boolean).join("\n\n"),
    );
  }
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
  });
}

function syncStandaloneAssets(webRoot, standaloneServer) {
  if (!standaloneServer) {
    return;
  }
  const standaloneAppRoot = path.dirname(standaloneServer);
  syncDirectoryIfExists(path.join(webRoot, ".next", "static"), path.join(standaloneAppRoot, ".next", "static"));
  syncDirectoryIfExists(path.join(webRoot, "public"), path.join(standaloneAppRoot, "public"));
}

function getRuntimeWebBundleRoot(paths) {
  return path.join(paths.runtimeRoot, "web-standalone-current");
}

function stageStandaloneWebRuntime(webRoot, paths) {
  restoreWebStaticFromStandalone(webRoot);
  const sourceStandaloneServer = resolveStandaloneServer(webRoot);
  if (!sourceStandaloneServer) {
    return null;
  }
  const sourceStandaloneRoot = path.join(webRoot, ".next", "standalone");
  if (!fs.existsSync(sourceStandaloneRoot)) {
    return null;
  }
  const runtimeStandaloneRoot = getRuntimeWebBundleRoot(paths);
  syncDirectoryIfExists(sourceStandaloneRoot, runtimeStandaloneRoot);
  const relativeServerPath = path.relative(sourceStandaloneRoot, sourceStandaloneServer);
  const runtimeStandaloneServer = path.join(runtimeStandaloneRoot, relativeServerPath);
  syncStandaloneAssets(webRoot, runtimeStandaloneServer);
  return {
    sourceStandaloneServer,
    sourceStandaloneRoot,
    runtimeStandaloneRoot,
    runtimeStandaloneServer,
  };
}

function restoreWebStaticFromStandalone(webRoot) {
  const webStaticPath = path.join(webRoot, ".next", "static");
  if (fs.existsSync(webStaticPath)) {
    return false;
  }
  const standaloneServer = resolveStandaloneServer(webRoot);
  if (!standaloneServer) {
    return false;
  }
  const standaloneStaticPath = path.join(path.dirname(standaloneServer), ".next", "static");
  if (!fs.existsSync(standaloneStaticPath)) {
    return false;
  }
  syncDirectoryIfExists(standaloneStaticPath, webStaticPath);
  console.log("[info] Restored .next/static from existing standalone output.");
  return true;
}

function resolvePrismaCli() {
  const candidate = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return require.resolve("prisma/build/index.js", { paths: [projectRoot] });
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function getLocalPrismaGenerateStatePath(paths) {
  return path.join(paths.runtimeRoot, "local-prisma-generate-state.json");
}

function getLocalPrismaDbPushStatePath(paths) {
  return path.join(paths.runtimeRoot, "local-prisma-db-push-state.json");
}

function getSharedLocalPrismaGenerateStatePath() {
  return path.join(projectRoot, ".runtime", "local-prisma-generate-state.json");
}

function findLegacyLocalPrismaGenerateStatePath() {
  const runtimeRoot = path.join(projectRoot, ".runtime");
  if (!fs.existsSync(runtimeRoot)) {
    return null;
  }
  const entries = fs.readdirSync(runtimeRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const candidate = path.join(runtimeRoot, entry.name, "runtime", "local-prisma-generate-state.json");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function readLocalPrismaGenerateState(paths) {
  const runtimeStatePath = getLocalPrismaGenerateStatePath(paths);
  const runtimeState = readJsonIfExists(runtimeStatePath);
  if (runtimeState) {
    return runtimeState;
  }
  const sharedState = readJsonIfExists(getSharedLocalPrismaGenerateStatePath());
  if (sharedState) {
    return sharedState;
  }
  const legacyStatePath = findLegacyLocalPrismaGenerateStatePath();
  if (!legacyStatePath) {
    return null;
  }
  return readJsonIfExists(legacyStatePath);
}

function getWebBuildStatePath(webRoot) {
  return path.join(webRoot, ".next", "local-launcher-web-build-state.json");
}

function getServerBuildStatePath(serverRoot) {
  return path.join(serverRoot, "dist", "local-launcher-server-build-state.json");
}

function getLocalSchemaHash() {
  return crypto.createHash("sha1").update(fs.readFileSync(targetSchemaPath)).digest("hex");
}

function hasGeneratedPrismaClient() {
  const prismaClientRoot = path.join(projectRoot, "node_modules", ".prisma", "client");
  if (!fs.existsSync(prismaClientRoot)) {
    return false;
  }
  const requiredFiles = [
    path.join(prismaClientRoot, "index.js"),
    path.join(prismaClientRoot, "default.js"),
  ];
  if (!requiredFiles.every((filePath) => fs.existsSync(filePath))) {
    return false;
  }
  const entries = fs.readdirSync(prismaClientRoot);
  if (!entries.some((entry) => entry.startsWith("query_engine"))) {
    return false;
  }
  return readGeneratedPrismaClientDatasourceProvider(prismaClientRoot) === "sqlite";
}

function readGeneratedPrismaClientDatasourceProvider(prismaClientRoot) {
  try {
    const generatedSchemaPath = path.join(prismaClientRoot, "schema.prisma");
    if (!fs.existsSync(generatedSchemaPath)) {
      return null;
    }
    const schemaText = fs.readFileSync(generatedSchemaPath, "utf8");
    const datasourceBlockMatch = schemaText.match(/datasource\s+db\s*\{([\s\S]*?)\}/i);
    if (!datasourceBlockMatch) {
      return null;
    }
    const providerMatch = datasourceBlockMatch[1].match(/provider\s*=\s*"([^"]+)"/i);
    if (!providerMatch) {
      return null;
    }
    return String(providerMatch[1] || "").trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

function shouldRunLocalPrismaGenerate(paths) {
  if (!hasGeneratedPrismaClient()) {
    return true;
  }
  const state = readLocalPrismaGenerateState(paths);
  if (!state || typeof state.schemaHash !== "string") {
    return true;
  }
  return state.schemaHash !== getLocalSchemaHash();
}

function recordLocalPrismaGenerate(paths) {
  const payload = {
    schemaHash: getLocalSchemaHash(),
    generatedAt: new Date().toISOString(),
  };
  writeJsonFile(getLocalPrismaGenerateStatePath(paths), payload);
  writeJsonFile(getSharedLocalPrismaGenerateStatePath(), payload);
}

function hasLocalDatabaseFile(paths) {
  return fs.existsSync(paths.dbPath);
}

function shouldRunLocalPrismaDbPush(paths, env) {
  if (!hasLocalDatabaseFile(paths)) {
    return true;
  }
  const state = readJsonIfExists(getLocalPrismaDbPushStatePath(paths));
  if (!state || typeof state.schemaHash !== "string") {
    return true;
  }
  if (state.schemaHash !== getLocalSchemaHash()) {
    return true;
  }
  if (String(state.databasePath || "") !== String(paths.dbPath)) {
    return true;
  }
  if (String(state.databaseUrl || "") !== String(env.DATABASE_URL || "")) {
    return true;
  }
  return false;
}

function recordLocalPrismaDbPush(paths, env) {
  writeJsonFile(getLocalPrismaDbPushStatePath(paths), {
    schemaHash: getLocalSchemaHash(),
    databasePath: paths.dbPath,
    databaseUrl: env.DATABASE_URL,
    pushedAt: new Date().toISOString(),
  });
}

function updateHashWithPathEntry(hash, rootPath) {
  if (!fs.existsSync(rootPath)) {
    hash.update(`missing:${rootPath}\n`);
    return;
  }
  const stats = fs.statSync(rootPath);
  const relativePath = path.relative(projectRoot, rootPath).replace(/\\/g, "/");
  if (stats.isDirectory()) {
    hash.update(`dir:${relativePath}\n`);
    const entries = fs.readdirSync(rootPath, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      updateHashWithPathEntry(hash, path.join(rootPath, entry.name));
    }
    return;
  }
  const fileHash = crypto.createHash("sha1").update(fs.readFileSync(rootPath)).digest("hex");
  hash.update(`file:${relativePath}:${stats.size}:${fileHash}\n`);
}

function getWebBuildFingerprint(webRoot) {
  const hash = crypto.createHash("sha1");
  const fingerprintTargets = [
    path.join(projectRoot, "package.json"),
    path.join(projectRoot, "package-lock.json"),
    path.join(webRoot, "package.json"),
    path.join(webRoot, "tsconfig.json"),
    path.join(webRoot, "next.config.ts"),
    path.join(webRoot, "src"),
    path.join(webRoot, "public"),
    path.join(projectRoot, "packages"),
  ];
  for (const target of fingerprintTargets) {
    updateHashWithPathEntry(hash, target);
  }
  return hash.digest("hex");
}

function getServerBuildFingerprint(serverRoot) {
  const hash = crypto.createHash("sha1");
  const fingerprintTargets = [
    path.join(projectRoot, "package.json"),
    path.join(projectRoot, "package-lock.json"),
    path.join(projectRoot, "tsconfig.base.json"),
    path.join(serverRoot, "package.json"),
    path.join(serverRoot, "tsconfig.json"),
    path.join(serverRoot, "src"),
    path.join(projectRoot, "packages"),
  ];
  for (const target of fingerprintTargets) {
    updateHashWithPathEntry(hash, target);
  }
  return hash.digest("hex");
}

function getLatestModifiedTime(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return 0;
  }
  const stats = fs.statSync(targetPath);
  let latest = stats.mtimeMs;
  if (!stats.isDirectory()) {
    return latest;
  }
  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    latest = Math.max(latest, getLatestModifiedTime(path.join(targetPath, entry.name)));
  }
  return latest;
}

function getWebBuildInputLatestModifiedTime(webRoot) {
  const fingerprintTargets = [
    path.join(projectRoot, "package.json"),
    path.join(projectRoot, "package-lock.json"),
    path.join(webRoot, "package.json"),
    path.join(webRoot, "tsconfig.json"),
    path.join(webRoot, "next.config.ts"),
    path.join(webRoot, "src"),
    path.join(webRoot, "public"),
    path.join(projectRoot, "packages"),
  ];
  return fingerprintTargets.reduce((latest, target) => Math.max(latest, getLatestModifiedTime(target)), 0);
}

function getWebBuildOutputLatestModifiedTime(webRoot) {
  const outputTargets = [
    path.join(webRoot, ".next", "standalone"),
    path.join(webRoot, ".next", "static"),
  ];
  return outputTargets.reduce((latest, target) => Math.max(latest, getLatestModifiedTime(target)), 0);
}

function getServerBuildInputLatestModifiedTime(serverRoot) {
  const fingerprintTargets = [
    path.join(projectRoot, "package.json"),
    path.join(projectRoot, "package-lock.json"),
    path.join(projectRoot, "tsconfig.base.json"),
    path.join(serverRoot, "package.json"),
    path.join(serverRoot, "tsconfig.json"),
    path.join(serverRoot, "src"),
    path.join(projectRoot, "packages"),
  ];
  return fingerprintTargets.reduce((latest, target) => Math.max(latest, getLatestModifiedTime(target)), 0);
}

function getServerBuildOutputLatestModifiedTime(serverRoot) {
  return getLatestModifiedTime(path.join(serverRoot, "dist"));
}

function hasWebBuildOutputs(webRoot) {
  restoreWebStaticFromStandalone(webRoot);
  const standaloneServer = resolveStandaloneServer(webRoot);
  if (!standaloneServer) {
    return false;
  }
  return fs.existsSync(path.join(webRoot, ".next", "static"));
}

function shouldRunWebBuild(webRoot) {
  if (!hasWebBuildOutputs(webRoot)) {
    return true;
  }
  const fingerprint = getWebBuildFingerprint(webRoot);
  const state = readJsonIfExists(getWebBuildStatePath(webRoot));
  if (state && typeof state.fingerprint === "string") {
    return state.fingerprint !== fingerprint;
  }
  if (getWebBuildOutputLatestModifiedTime(webRoot) >= getWebBuildInputLatestModifiedTime(webRoot)) {
    recordWebBuild(webRoot, fingerprint);
    return false;
  }
  return true;
}

function hasServerBuildOutputs(serverRoot) {
  const candidates = [
    path.join(serverRoot, "dist", "apps", "server", "src", "main.js"),
    path.join(serverRoot, "dist", "main.js"),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function shouldRunServerBuild(serverRoot) {
  if (!hasServerBuildOutputs(serverRoot)) {
    return true;
  }
  const fingerprint = getServerBuildFingerprint(serverRoot);
  const state = readJsonIfExists(getServerBuildStatePath(serverRoot));
  if (state && typeof state.fingerprint === "string") {
    return state.fingerprint !== fingerprint;
  }
  if (getServerBuildOutputLatestModifiedTime(serverRoot) >= getServerBuildInputLatestModifiedTime(serverRoot)) {
    recordServerBuild(serverRoot, fingerprint);
    return false;
  }
  return true;
}

function recordWebBuild(webRoot, fingerprint = getWebBuildFingerprint(webRoot)) {
  if (!fingerprint) {
    return;
  }
  writeJsonFile(getWebBuildStatePath(webRoot), {
    fingerprint,
    builtAt: new Date().toISOString(),
  });
}

function recordServerBuild(serverRoot, fingerprint = getServerBuildFingerprint(serverRoot)) {
  if (!fingerprint) {
    return;
  }
  writeJsonFile(getServerBuildStatePath(serverRoot), {
    fingerprint,
    builtAt: new Date().toISOString(),
  });
}

function resolveServerBuiltEntry() {
  const candidates = [
    path.join(projectRoot, "apps", "server", "dist", "apps", "server", "src", "main.js"),
    path.join(projectRoot, "apps", "server", "dist", "main.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    [
      "未找到后端编译产物。",
      ...candidates.map((candidate) => `- ${candidate}`),
    ].join("\n"),
  );
}

function runStep(label, command, args, cwd, env) {
  const startedAt = Date.now();
  console.log(`[step] ${label}...`);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const heartbeat = setInterval(() => {
      console.log(`[wait] ${label} still running (${Date.now() - startedAt}ms)`);
    }, 30_000);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", (error) => {
      clearInterval(heartbeat);
      reject(error);
    });
    child.once("close", (code) => {
      clearInterval(heartbeat);
      if (code === 0) {
        console.log(`[done] ${label} (${Date.now() - startedAt}ms)`);
        resolve();
        return;
      }
      reject(
        new Error(
          [
            `${label}失败，退出码=${code ?? "unknown"}`,
            stderr.trim() ? `stderr:\n${stderr.trim()}` : "",
            stdout.trim() ? `stdout:\n${stdout.trim()}` : "",
          ].filter(Boolean).join("\n\n"),
        ),
      );
    });
  });
}

function requestStatus(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.setTimeout(1500, () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", () => resolve(0));
  });
}

async function waitForUrl(url, pid, acceptedStatusCodes) {
  return waitForUrlWithTimeout(url, pid, acceptedStatusCodes, URL_READY_TIMEOUT_MS);
}

async function waitForUrlWithTimeout(url, pid, acceptedStatusCodes, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    const status = await requestStatus(url);
    if (acceptedStatusCodes.includes(status)) {
      if (attempts > 1) {
        // #region debug-point E:url-ready-after-retry
        emitLauncherDebug("E", "waitForUrl succeeded after retries", {
          url,
          pid,
          status,
          attempts,
          timeoutMs,
        });
        // #endregion
      }
      return true;
    }
    if (!isProcessAlive(pid)) {
      // #region debug-point B:url-wait-process-exited
      emitLauncherDebug("B", "waitForUrl aborted because process exited", {
        url,
        pid,
        status,
        attempts,
        timeoutMs,
      });
      // #endregion
      return false;
    }
    await sleep(URL_READY_POLL_INTERVAL_MS);
  }
  // #region debug-point E:url-wait-timeout
  emitLauncherDebug("E", "waitForUrl timed out", {
    url,
    pid,
    attempts,
    timeoutMs,
    acceptedStatusCodes,
  });
  // #endregion
  return false;
}

async function tryReuseExistingRuntime(runtimeMetadata, fallbackPaths) {
  if (!runtimeMetadata || runtimeMetadata.appRuntimeMode !== "local-single-user") {
    return null;
  }

  const processes = runtimeMetadata.processes || {};
  const serverPid = Number(processes.serverPid || 0);
  const webPid = Number(processes.webPid || 0);
  const workerPid = Number(processes.workerPid || 0);
  if (!Number.isInteger(serverPid) || serverPid <= 0 || !isProcessAlive(serverPid)) {
    return null;
  }
  if (!Number.isInteger(webPid) || webPid <= 0 || !isProcessAlive(webPid)) {
    return null;
  }
  if (Number.isInteger(workerPid) && workerPid > 0 && !isProcessAlive(workerPid)) {
    return null;
  }

  const browserUrl = String(runtimeMetadata.browserUrl || "").trim();
  const previewUrl = String(runtimeMetadata.previewUrl || browserUrl).trim();
  const apiHealthUrl = String(runtimeMetadata.apiHealthUrl || "").trim();
  if (!browserUrl || !previewUrl || !apiHealthUrl) {
    return null;
  }

  const apiReady = await waitForUrlWithTimeout(apiHealthUrl, serverPid, [200], 5_000);
  if (!apiReady) {
    return null;
  }
  const webReady = await waitForUrlWithTimeout(previewUrl, webPid, [200, 307, 308], 5_000);
  if (!webReady) {
    return null;
  }

  return {
    browserUrl,
    previewUrl,
    apiHealthUrl,
    databasePath: String(runtimeMetadata.databasePath || "").trim() || fallbackPaths.dbPath,
    runtimeMetadataPath: path.join(fallbackPaths.runtimeRoot, "local-single-user-runtime.json"),
    logsRoot:
      runtimeMetadata.logs?.serverLog && fs.existsSync(path.dirname(runtimeMetadata.logs.serverLog))
        ? path.dirname(runtimeMetadata.logs.serverLog)
        : fallbackPaths.logsRoot,
  };
}

function printRuntimeSummary(summary, options = {}) {
  if (options.reusedExistingRuntime) {
    console.log("[info] 检测到本地工作台已在运行，直接复用当前实例。");
  }
  console.log("local-single-user 已启动");
  console.log(`工作台入口：${summary.browserUrl}`);
  console.log(`工作台预览：${summary.previewUrl}`);
  console.log(`API 健康检查：${summary.apiHealthUrl}`);
  console.log(`SQLite：${summary.databasePath}`);
  console.log(`运行时信息：${summary.runtimeMetadataPath}`);
  console.log(`日志目录：${summary.logsRoot}`);
}

function getLauncherLockPath(paths) {
  return path.join(paths.runtimeRoot, "local-single-user-launcher.lock");
}

function readLauncherLockInfo(lockPath) {
  if (!fs.existsSync(lockPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(lockPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearLauncherLock(lockPath) {
  if (!fs.existsSync(lockPath)) {
    return;
  }
  fs.unlinkSync(lockPath);
}

function tryClearStaleLauncherLock(lockPath) {
  if (!fs.existsSync(lockPath)) {
    return false;
  }

  const lockStat = fs.statSync(lockPath);
  const lockInfo = readLauncherLockInfo(lockPath);
  const lockPid = Number(lockInfo?.pid || 0);
  const lockAgeMs = Math.max(0, Date.now() - lockStat.mtimeMs);
  const hasAliveOwner = Number.isInteger(lockPid) && lockPid > 0 && isProcessAlive(lockPid);
  const shouldClear =
    !hasAliveOwner
    && (
      lockPid > 0
      || lockAgeMs >= LAUNCHER_LOCK_STALE_MS
      || !Number.isInteger(lockPid)
      || lockPid <= 0
      || !lockInfo
      || !lockInfo.acquiredAt
    );

  if (!shouldClear) {
    return false;
  }

  clearLauncherLock(lockPath);
  appendBootstrapLog(`Removed stale launcher lock: path=${lockPath}; pid=${lockPid || "unknown"}; ageMs=${lockAgeMs}`);
  // #region debug-point D:stale-lock-cleared
  emitLauncherDebug("D", "stale launcher lock cleared", {
    lockPath,
    lockPid: lockPid || null,
    lockAgeMs,
    hadAliveOwner: hasAliveOwner,
  });
  // #endregion
  return true;
}

function tryAcquireLauncherLock(lockPath) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  try {
    const fd = fs.openSync(lockPath, "wx");
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }, null, 2), "utf8");
    return fd;
  } catch (error) {
    if (error && error.code === "EEXIST") {
      if (tryClearStaleLauncherLock(lockPath)) {
        return tryAcquireLauncherLock(lockPath);
      }
      return null;
    }
    throw error;
  }
}

function releaseLauncherLock(lockPath, lockFd) {
  if (typeof lockFd === "number") {
    try {
      fs.closeSync(lockFd);
    } catch {
      // Ignore close failure.
    }
  }
  try {
    clearLauncherLock(lockPath);
  } catch {
    // Ignore cleanup failure.
  }
}

async function waitForExistingRuntimeReady(runtimeMetadataPath, fallbackPaths) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const runtimeMetadata = readJsonIfExists(runtimeMetadataPath);
    const reusedRuntime = await tryReuseExistingRuntime(runtimeMetadata, fallbackPaths);
    if (reusedRuntime) {
      return reusedRuntime;
    }
    await sleep(1_000);
  }
  return null;
}

function createLogStream(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  return fs.openSync(filePath, "a");
}

function startLoggedProcess({ label, command, args, cwd, env, outLog, errLog }) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", createLogStream(outLog), createLogStream(errLog)],
    windowsHide: true,
  });
  child.once("error", (error) => {
    console.error(`[${label}] 启动失败: ${error.message}`);
  });
  return child;
}

function killProcessTree(pid, reason = "unspecified") {
  if (!pid || !Number.isInteger(pid)) {
    return;
  }
  // #region debug-point A:kill-process-tree
  emitLauncherDebug("A", "killProcessTree invoked", {
    pid,
    reason,
    platform: process.platform,
    launcherPid: process.pid,
  });
  // #endregion
  if (process.platform === "win32") {
    spawnSync(resolveTaskkillExecutable(process.env), ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignore.
    }
  }
}

function listInstallRootProcessIds(installRoot) {
  if (process.platform !== "win32" || !installRoot) {
    return [];
  }

  const powershellExe = resolvePowerShellExecutable(process.env);
  const script = [
    `$target = ${JSON.stringify(String(installRoot))}`,
    "$processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue",
    "$processes | Where-Object {",
    "  $commandLine = [string]$_.CommandLine",
    "  $executablePath = [string]$_.ExecutablePath",
    "  (($commandLine -and $commandLine.IndexOf($target, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) -or ($executablePath -and $executablePath.IndexOf($target, [System.StringComparison]::OrdinalIgnoreCase) -ge 0))",
    "} | ForEach-Object { $_.ProcessId }",
  ].join("; ");
  const result = spawnSync(powershellExe, [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script,
  ], {
    cwd: projectRoot,
    windowsHide: true,
    encoding: "utf8",
  });

  if (result.error || result.status !== 0) {
    appendBootstrapLog(`List install-root processes skipped: ${result.error?.message || result.stderr || `exit=${result.status}`}`);
    return [];
  }

  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((value) => Number.parseInt(String(value || "").trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0 && value !== process.pid);
}

function cleanupRuntimeForSelfHeal({ paths, runtimeMetadataPath, reason }) {
  appendBootstrapLog(`Self-heal cleanup start: reason=${reason}`);
  const runtimeMetadata = readJsonIfExists(runtimeMetadataPath);
  const metadataPids = [
    Number(runtimeMetadata?.processes?.launcherPid || runtimeMetadata?.launcherPid || 0),
    Number(runtimeMetadata?.processes?.serverPid || 0),
    Number(runtimeMetadata?.processes?.workerPid || 0),
    Number(runtimeMetadata?.processes?.webPid || 0),
  ].filter((value) => Number.isInteger(value) && value > 0 && value !== process.pid);
  const installRootPids = listInstallRootProcessIds(path.resolve(projectRoot, ".."));
  const targetPids = Array.from(new Set([...metadataPids, ...installRootPids]));

  for (const pid of targetPids) {
    if (!isProcessAlive(pid)) {
      continue;
    }
    killProcessTree(pid, `${reason}:self-heal-cleanup`);
  }

  removePathIfExists(runtimeMetadataPath);
  removePathIfExists(getRuntimeWebBundleRoot(paths));
  cleanupHistoricalUpdateArtifacts(paths);
  cleanupLegacyLocalAppDataArtifacts();
  appendBootstrapLog(`Self-heal cleanup done: reason=${reason}; killedPids=${targetPids.join(",") || "none"}`);
}

async function main() {
  const initialRuntime = buildLocalSingleUserEnv({
    apiPort: DEFAULT_API_PORT,
    webPort: DEFAULT_WEB_PORT,
  });
  const initialPaths = initialRuntime.paths;
  const runtimeMetadataPath = path.join(initialPaths.runtimeRoot, "local-single-user-runtime.json");
  const lifecycleStatePath = getLifecycleStatePath(initialRuntime.env);
  const launcherLog = path.join(initialPaths.logsRoot, "launcher.log");
  const launcherLockPath = getLauncherLockPath(initialPaths);
  fs.mkdirSync(initialPaths.logsRoot, { recursive: true });
  appendBootstrapLog(`Launcher start: projectRoot=${projectRoot}`);
  recordLifecycleState({
    phase: "STARTING",
    launcherPid: process.pid,
    runtimeMetadataPath,
    lifecycleStatePath,
    logsRoot: initialPaths.logsRoot,
  }, initialRuntime.env);
  const existingRuntimeMetadata = readJsonIfExists(runtimeMetadataPath);
  const reusedRuntime = await tryReuseExistingRuntime(existingRuntimeMetadata, initialPaths);
  if (reusedRuntime) {
    appendBootstrapLog(`Reuse existing runtime: browser=${reusedRuntime.browserUrl}; api=${reusedRuntime.apiHealthUrl}`);
    // #region debug-point C:reuse-existing-runtime
    emitLauncherDebug("C", "reuse existing runtime succeeded", {
      browserUrl: reusedRuntime.browserUrl,
      apiHealthUrl: reusedRuntime.apiHealthUrl,
    });
    // #endregion
    recordLifecycleState({
      phase: "READY",
      reuseMode: "existing-runtime",
      launcherPid: process.pid,
      browserUrl: reusedRuntime.browserUrl,
      previewUrl: reusedRuntime.previewUrl,
      apiHealthUrl: reusedRuntime.apiHealthUrl,
      runtimeMetadataPath,
      lifecycleStatePath,
      logsRoot: reusedRuntime.logsRoot,
    }, initialRuntime.env);
    printRuntimeSummary(reusedRuntime, { reusedExistingRuntime: true });
    if (shouldAutoOpenBrowser(process.env)) {
      appendBootstrapLog(`Open browser: ${reusedRuntime.browserUrl}`);
      openBrowser(reusedRuntime.browserUrl);
    } else {
      console.log("[skip] Auto open browser (disabled by current environment)");
      appendBootstrapLog("Skip auto open browser");
    }
    return;
  }
  let launcherLockFd = tryAcquireLauncherLock(launcherLockPath);
  if (launcherLockFd === null) {
    appendBootstrapLog(`Launcher lock already exists, waiting for active startup: ${launcherLockPath}`);
    const currentLockInfo = readLauncherLockInfo(launcherLockPath);
    // #region debug-point D:lock-wait-begin
    emitLauncherDebug("D", "launcher lock already exists; waiting for active startup", {
      launcherLockPath,
      currentLockInfo,
    });
    // #endregion
    const readyRuntime = await waitForExistingRuntimeReady(runtimeMetadataPath, initialPaths);
    if (readyRuntime) {
      appendBootstrapLog(`Reuse runtime after waiting for active startup: browser=${readyRuntime.browserUrl}; api=${readyRuntime.apiHealthUrl}`);
      // #region debug-point E:lock-wait-reused-runtime
      emitLauncherDebug("E", "reused runtime after waiting for launcher lock", {
        launcherLockPath,
        browserUrl: readyRuntime.browserUrl,
        apiHealthUrl: readyRuntime.apiHealthUrl,
      });
      // #endregion
      recordLifecycleState({
        phase: "READY",
        reuseMode: "wait-for-lock-runtime",
        launcherPid: process.pid,
        browserUrl: readyRuntime.browserUrl,
        previewUrl: readyRuntime.previewUrl,
        apiHealthUrl: readyRuntime.apiHealthUrl,
        runtimeMetadataPath,
        lifecycleStatePath,
        logsRoot: readyRuntime.logsRoot,
      }, initialRuntime.env);
      printRuntimeSummary(readyRuntime, { reusedExistingRuntime: true });
      if (shouldAutoOpenBrowser(process.env)) {
        appendBootstrapLog(`Open browser: ${readyRuntime.browserUrl}`);
        openBrowser(readyRuntime.browserUrl);
      } else {
        console.log("[skip] Auto open browser (disabled by current environment)");
        appendBootstrapLog("Skip auto open browser");
      }
      return;
    }
    launcherLockFd = tryAcquireLauncherLock(launcherLockPath);
    if (launcherLockFd !== null) {
      appendBootstrapLog(`Recovered launcher lock after wait timeout: ${launcherLockPath}`);
      // #region debug-point D:lock-recovered-after-wait
      emitLauncherDebug("D", "recovered launcher lock after waiting for active startup", {
        launcherLockPath,
      });
      // #endregion
    } else {
    // #region debug-point D:lock-still-held-after-wait
    emitLauncherDebug("D", "launcher lock still held after wait timeout", {
      launcherLockPath,
      currentLockInfo: readLauncherLockInfo(launcherLockPath),
      runtimeMetadataPath,
      runtimeMetadata: readJsonIfExists(runtimeMetadataPath),
    });
    // #endregion
    throw new Error("本地工作台正在启动中，请稍候再试。");
    }
  }
  const prebuiltOnlyMode = isPrebuiltOnlyLauncherMode();
  const maxSelfHealAttempts = getSelfHealMaxAttempts(process.env);
  const npmCli = prebuiltOnlyMode ? null : resolveNpmCli();
  const nextBin = prebuiltOnlyMode ? null : resolveNextBin();
  const prismaCli = resolvePrismaCli();

  async function stopPreviousRuntime() {
    const runtimeMetadata = readJsonIfExists(runtimeMetadataPath);
    const processes = runtimeMetadata?.processes || {};
    const pids = [
      { label: "launcher", pid: Number(processes.launcherPid || runtimeMetadata?.launcherPid || 0) },
      { label: "server", pid: Number(processes.serverPid || 0) },
      { label: "worker", pid: Number(processes.workerPid || 0) },
      { label: "web", pid: Number(processes.webPid || 0) },
    ];
    const aliveTargets = [];
    for (const target of pids) {
      if (!Number.isInteger(target.pid) || target.pid <= 0 || target.pid === process.pid) {
        continue;
      }
      if (!isProcessAlive(target.pid)) {
        continue;
      }
      aliveTargets.push(target);
    }
    if (!aliveTargets.length) {
      appendBootstrapLog("Stop previous runtime skipped: no alive targets from runtime metadata");
      // #region debug-point C:stop-previous-skipped
      emitLauncherDebug("C", "stopPreviousRuntime skipped", {
        runtimeMetadataPath,
        recordedPids: pids,
        hasRuntimeMetadata: Boolean(runtimeMetadata),
      });
      // #endregion
      return;
    }
    console.log("[step] Stop previous local-single-user runtime...");
    appendBootstrapLog(`Stop previous runtime: ${aliveTargets.map((item) => `${item.label}=${item.pid}`).join(", ")}`);
    // #region debug-point A:stop-previous-runtime
    emitLauncherDebug("A", "stopPreviousRuntime will kill alive targets", {
      runtimeMetadataPath,
      aliveTargets,
      recordedPids: pids,
    });
    // #endregion
    for (const target of aliveTargets) {
      console.log(`[info] stop previous ${target.label} pid=${target.pid}`);
      killProcessTree(target.pid, `stop-previous-runtime:${target.label}`);
    }
    await sleep(1500);
    console.log("[done] Stop previous local-single-user runtime");
  }

  async function recoverFromStartupFailure(attemptIndex, error) {
    const detail = error instanceof Error ? error.stack || error.message : String(error);
    appendBootstrapLog(`Startup attempt failed: attempt=${attemptIndex}/${maxSelfHealAttempts}; error=${detail}`);
    emitLauncherDebug("D", "startup attempt failed", {
      attemptIndex,
      maxSelfHealAttempts,
      error: detail,
    });
    if (attemptIndex >= maxSelfHealAttempts) {
      throw error;
    }
    console.warn(`[warn] 本地工作台启动失败，正在自动自愈后重试（${attemptIndex + 1}/${maxSelfHealAttempts}）...`);
    cleanupRuntimeForSelfHeal({
      paths: initialPaths,
      runtimeMetadataPath,
      reason: `attempt-${attemptIndex}-failed`,
    });
    await sleep(SELF_HEAL_RETRY_DELAY_MS);
  }

  async function runStartupAttempt(attemptIndex) {
    appendBootstrapLog(`Startup attempt begin: attempt=${attemptIndex}/${maxSelfHealAttempts}`);
    await stopPreviousRuntime();
    const apiPort = await findAvailablePort(DEFAULT_API_PORT);
    const webPort = await findAvailablePort(DEFAULT_WEB_PORT);
    appendBootstrapLog(`Resolved ports: api=${apiPort}, web=${webPort}`);
    const { env, paths } = buildLocalSingleUserEnv({
      apiPort,
      webPort,
      env: {
        NODE_ENV: "",
      },
    });
    const serverRoot = path.join(projectRoot, "apps", "server");
    const webRoot = path.join(projectRoot, "apps", "web");
    const previewUrl = `${env.WEB_PUBLIC_BASE_URL}/brand-growth`;
    const browserUrl = env.WEB_PUBLIC_BASE_URL;
    const apiHealthUrl = `${env.API_PUBLIC_BASE_URL}/health`;
    const serverLog = path.join(paths.logsRoot, "server.log");
    const workerLog = path.join(paths.logsRoot, "worker.log");
    const webLog = path.join(paths.logsRoot, "web.log");
    const serverErrLog = path.join(paths.logsRoot, "server.err.log");
    const workerErrLog = path.join(paths.logsRoot, "worker.err.log");
    const webErrLog = path.join(paths.logsRoot, "web.err.log");
    appendBootstrapLog(`Runtime paths: logs=${paths.logsRoot}; runtime=${paths.runtimeRoot}; db=${paths.dbPath}`);
    recordLifecycleState({
      phase: "STARTING",
      attemptIndex,
      maxSelfHealAttempts,
      launcherPid: process.pid,
      apiPort,
      webPort,
      runtimeMetadataPath,
      lifecycleStatePath: getLifecycleStatePath(env),
      logsRoot: paths.logsRoot,
      databasePath: paths.dbPath,
    }, env);
    ensureCompatibleNextSwcEnv(env);

    appendBootstrapLog("Prepare local Prisma schema");
    generateLocalSchema();
    if (shouldRunLocalPrismaGenerate(paths)) {
      appendBootstrapLog("Run local Prisma generate");
      await runStep("Local Prisma generate", process.execPath, [prismaCli, "generate", "--schema", targetSchemaPath], projectRoot, env);
      recordLocalPrismaGenerate(paths);
    } else {
      console.log("[skip] Local Prisma generate (schema unchanged and generated client already exists)");
      appendBootstrapLog("Skip local Prisma generate");
    }
    if (shouldRunLocalPrismaDbPush(paths, env)) {
      appendBootstrapLog("Run local Prisma db push");
      await runStep(
        "Local Prisma db push",
        process.execPath,
        [prismaCli, "db", "push", "--schema", targetSchemaPath, "--skip-generate", "--accept-data-loss"],
        projectRoot,
        env,
      );
      recordLocalPrismaDbPush(paths, env);
    } else {
      console.log("[skip] Local Prisma db push (schema unchanged and current runtime database already aligned)");
      appendBootstrapLog("Skip local Prisma db push");
    }
    if (prebuiltOnlyMode) {
      if (!hasServerBuildOutputs(serverRoot)) {
        throw new Error("当前发布物处于预构建运行时模式，但缺少后端 dist 产物。");
      }
      console.log("[skip] Server build (prebuilt-only runtime mode)");
      appendBootstrapLog("Skip server build (prebuilt-only runtime mode)");
    } else if (shouldRunServerBuild(serverRoot)) {
      appendBootstrapLog("Run server build");
      await runStep("Server build", process.execPath, [npmCli, "--workspace", "apps/server", "run", "build"], projectRoot, env);
      recordServerBuild(serverRoot);
    } else {
      console.log("[skip] Server build (sources unchanged and dist output already exists)");
      appendBootstrapLog("Skip server build");
    }
    if (prebuiltOnlyMode) {
      if (!hasWebBuildOutputs(webRoot)) {
        throw new Error("当前发布物处于预构建运行时模式，但缺少 Web standalone 产物。");
      }
      console.log("[skip] Web build (prebuilt-only runtime mode)");
      appendBootstrapLog("Skip web build (prebuilt-only runtime mode)");
    } else if (shouldRunWebBuild(webRoot)) {
      appendBootstrapLog("Run web build");
      await runStep("Web build", process.execPath, [nextBin, "build"], webRoot, env);
      recordWebBuild(webRoot);
    } else {
      console.log("[skip] Web build (sources unchanged and standalone output already exists)");
      appendBootstrapLog("Skip web build");
    }
    const stagedWebRuntime = stageStandaloneWebRuntime(webRoot, paths);
    const standaloneServer = stagedWebRuntime?.runtimeStandaloneServer || null;
    const sourceStandaloneServer = stagedWebRuntime?.sourceStandaloneServer || null;
    appendBootstrapLog(`Stage standalone web runtime: runtimeServer=${standaloneServer || "null"}`);
    if (prebuiltOnlyMode && !standaloneServer) {
      throw new Error("当前发布物处于预构建运行时模式，但未找到可启动的 standalone server.js。");
    }

    const serverEntry = resolveServerBuiltEntry();
    const children = [];
    let shuttingDown = false;
    let startupPhase = true;
    const workerRestartAtTimestamps = [];

    function trimWorkerRestartHistory(now = Date.now()) {
      while (workerRestartAtTimestamps.length && (now - workerRestartAtTimestamps[0]) > WORKER_RESTART_WINDOW_MS) {
        workerRestartAtTimestamps.shift();
      }
    }

    function stopChildren(reason) {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      for (const item of children) {
        killProcessTree(item.child.pid, `${reason}:${item.label}`);
      }
    }

    function registerChild(label, child) {
      children.push({ label, child });
      child.once("exit", (code, signal) => {
        emitLauncherDebug("B", "child exit observed", {
          label,
          pid: child.pid || null,
          code: code ?? null,
          signal: signal ?? null,
          shuttingDown,
          startupPhase,
          knownChildren: children.map((item) => ({
            label: item.label,
            pid: item.child.pid || null,
          })),
        });
        if (shuttingDown) {
          return;
        }
        if (startupPhase) {
          appendBootstrapLog(`Child exited during startup: label=${label}; code=${code ?? "null"}; signal=${signal ?? "null"}`);
          return;
        }
        if (label === "worker") {
          const now = Date.now();
          workerRestartAtTimestamps.push(now);
          trimWorkerRestartHistory(now);
          appendBootstrapLog(
            `Worker exited after startup: code=${code ?? "null"}; signal=${signal ?? "null"}; restartAttemptsInWindow=${workerRestartAtTimestamps.length}/${WORKER_MAX_RESTARTS_PER_WINDOW}`,
          );
          emitLauncherDebug("C", "worker exit after startup", {
            pid: child.pid || null,
            code: code ?? null,
            signal: signal ?? null,
            restartAttemptsInWindow: workerRestartAtTimestamps.length,
            restartWindowMs: WORKER_RESTART_WINDOW_MS,
          });
          if (workerRestartAtTimestamps.length > WORKER_MAX_RESTARTS_PER_WINDOW) {
            console.error(
              `worker 已连续退出超过 ${WORKER_MAX_RESTARTS_PER_WINDOW} 次，暂不再自动重启；页面继续保持可用，请检查日志：${workerErrLog}`,
            );
            appendBootstrapLog(
              `Worker auto restart disabled after repeated exits: count=${workerRestartAtTimestamps.length}; windowMs=${WORKER_RESTART_WINDOW_MS}`,
            );
            return;
          }
          console.error(`worker 已退出，code=${code ?? "null"} signal=${signal ?? "null"}，正在自动重启后台 worker...`);
          setTimeout(() => {
            if (shuttingDown) {
              return;
            }
            startWorkerChild();
          }, WORKER_RESTART_DELAY_MS);
          return;
        }
        shuttingDown = true;
        console.error(`${label} 已退出，code=${code ?? "null"} signal=${signal ?? "null"}，准备关闭其余进程。`);
        for (const item of children) {
          if (item.child.pid && item.child.pid !== child.pid) {
            killProcessTree(item.child.pid, `child-exit:${label}`);
          }
        }
        process.exit(code || 1);
      });
    }

    function startWorkerChild() {
      const workerChild = startLoggedProcess({
        label: "worker",
        command: process.execPath,
        args: [serverEntry],
        cwd: projectRoot,
        env: {
          ...env,
          SERVER_BOOT_MODE: "worker",
        },
        outLog: workerLog,
        errLog: workerErrLog,
      });
      registerChild("worker", workerChild);
      appendBootstrapLog(`Worker process started: pid=${workerChild.pid || "null"}; errLog=${workerErrLog}`);
      emitLauncherDebug("A", "worker process started", {
        pid: workerChild.pid || null,
        workerErrLog,
      });
      return workerChild;
    }

    try {
      const serverChild = startLoggedProcess({
        label: "server",
        command: process.execPath,
        args: [serverEntry],
        cwd: projectRoot,
        env,
        outLog: serverLog,
        errLog: serverErrLog,
      });
      registerChild("server", serverChild);
      appendBootstrapLog(`Server process started: pid=${serverChild.pid || "null"}; errLog=${serverErrLog}`);
      emitLauncherDebug("A", "server process started", {
        pid: serverChild.pid || null,
        serverErrLog,
        apiHealthUrl,
      });

      const apiReady = await waitForUrl(apiHealthUrl, serverChild.pid, [200]);
      if (!apiReady) {
        emitLauncherDebug("E", "apiReady check failed", {
          pid: serverChild.pid || null,
          apiHealthUrl,
          serverErrLog,
        });
        killProcessTree(serverChild.pid, "api-ready-failed");
        throw new Error(`本地 API 未能成功启动，请检查日志：${serverErrLog}`);
      }

      const workerChild = startWorkerChild();
      await sleep(1500);
      if (!isProcessAlive(workerChild.pid)) {
        emitLauncherDebug("B", "worker died before startup completed", {
          pid: workerChild.pid || null,
          workerErrLog,
        });
        killProcessTree(serverChild.pid, "worker-not-alive");
        throw new Error(`本地 worker 未能成功启动，请检查日志：${workerErrLog}`);
      }

      const webChild = startLoggedProcess({
        label: "web",
        command: process.execPath,
        args: standaloneServer ? [standaloneServer] : [nextBin, "start", "-H", "127.0.0.1", "-p", String(webPort)],
        cwd: standaloneServer ? path.dirname(standaloneServer) : webRoot,
        env: {
          ...env,
          NODE_ENV: "production",
          PORT: String(webPort),
          HOSTNAME: "127.0.0.1",
        },
        outLog: webLog,
        errLog: webErrLog,
      });
      registerChild("web", webChild);
      appendBootstrapLog(`Web process started: pid=${webChild.pid || "null"}; errLog=${webErrLog}`);
      emitLauncherDebug("A", "web process started", {
        pid: webChild.pid || null,
        webErrLog,
        previewUrl,
      });
      console.log(
        `[step] Web process started via ${standaloneServer ? "runtime-isolated standalone server.js" : "next start"} on ${env.WEB_PUBLIC_BASE_URL}`,
      );

      const webReady = await waitForUrl(previewUrl, webChild.pid, [200, 307, 308]);
      if (!webReady) {
        emitLauncherDebug("E", "webReady check failed", {
          pid: webChild.pid || null,
          previewUrl,
          webErrLog,
        });
        killProcessTree(serverChild.pid, "web-ready-failed:server");
        killProcessTree(workerChild.pid, "web-ready-failed:worker");
        killProcessTree(webChild.pid, "web-ready-failed:web");
        throw new Error(`本地 Web 未能成功启动，请检查日志：${webErrLog}`);
      }

      const runtimeMetadata = {
        appRuntimeMode: "local-single-user",
        release: resolveInstalledReleaseMetadata(),
        processes: {
          launcherPid: process.pid,
          serverPid: serverChild.pid || null,
          workerPid: workerChild.pid || null,
          webPid: webChild.pid || null,
        },
        apiPort,
        webPort,
        browserUrl,
        previewUrl,
        apiHealthUrl,
        databaseUrl: env.DATABASE_URL,
        databasePath: paths.dbPath,
        webRuntime: {
          sourceStandaloneServer,
          runtimeStandaloneServer: standaloneServer,
          runtimeStandaloneRoot: stagedWebRuntime?.runtimeStandaloneRoot || null,
        },
        logs: {
          serverLog,
          serverErrLog,
          workerLog,
          workerErrLog,
          webLog,
          webErrLog,
        },
        startedAt: new Date().toISOString(),
      };
      fs.writeFileSync(runtimeMetadataPath, JSON.stringify(runtimeMetadata, null, 2), "utf8");
      appendBootstrapLog(`Runtime metadata written: ${runtimeMetadataPath}`);
      emitLauncherDebug("A", "runtime metadata written after all services ready", {
        runtimeMetadataPath,
        processes: runtimeMetadata.processes,
        browserUrl,
        previewUrl,
        apiHealthUrl,
      });
      recordLifecycleState({
        phase: "READY",
        attemptIndex,
        maxSelfHealAttempts,
        launcherPid: process.pid,
        apiPort,
        webPort,
        browserUrl,
        previewUrl,
        apiHealthUrl,
        runtimeMetadataPath,
        lifecycleStatePath: getLifecycleStatePath(env),
        logsRoot: paths.logsRoot,
        databasePath: paths.dbPath,
        processes: runtimeMetadata.processes,
      }, env);
      startupPhase = false;

      printRuntimeSummary({
        browserUrl,
        previewUrl,
        apiHealthUrl,
        databasePath: paths.dbPath,
        runtimeMetadataPath,
        logsRoot: paths.logsRoot,
      });
      if (shouldAutoOpenBrowser(env)) {
        appendBootstrapLog(`Open browser: ${browserUrl}`);
        openBrowser(browserUrl);
      } else {
        console.log("[skip] Auto open browser (disabled by current environment)");
        appendBootstrapLog("Skip auto open browser");
      }

      const shutdown = (signal) => {
        if (shuttingDown) {
          return;
        }
        shuttingDown = true;
        emitLauncherDebug("D", "launcher shutdown invoked", {
          signal,
          children: children.map((item) => ({
            label: item.label,
            pid: item.child.pid || null,
          })),
        });
        releaseLauncherLock(launcherLockPath, launcherLockFd);
        console.log(`收到 ${signal}，正在关闭 local-single-user 进程...`);
        for (const item of children) {
          killProcessTree(item.child.pid, `launcher-shutdown:${signal}:${item.label}`);
        }
        process.exit(0);
      };

      process.once("SIGINT", () => shutdown("SIGINT"));
      process.once("SIGTERM", () => shutdown("SIGTERM"));
      setInterval(() => {}, 60_000);
    } catch (error) {
      startupPhase = false;
      recordLifecycleState({
        phase: "FAILED",
        attemptIndex,
        maxSelfHealAttempts,
        launcherPid: process.pid,
        runtimeMetadataPath,
        lifecycleStatePath: getLifecycleStatePath(env),
        logsRoot: paths.logsRoot,
        databasePath: paths.dbPath,
        error: error instanceof Error ? error.stack || error.message : String(error),
      }, env);
      stopChildren(`startup-attempt-${attemptIndex}`);
      throw error;
    }
  }

  for (let attemptIndex = 1; attemptIndex <= maxSelfHealAttempts; attemptIndex += 1) {
    try {
      await runStartupAttempt(attemptIndex);
      return;
    } catch (error) {
      await recoverFromStartupFailure(attemptIndex, error);
    }
  }
}

process.on("uncaughtException", (error) => {
  appendBootstrapLog(`uncaughtException: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  // #region debug-point B:uncaught-exception
  emitLauncherDebug("B", "launcher uncaughtException", {
    error: error instanceof Error ? error.stack || error.message : String(error),
  });
  // #endregion
});

process.on("unhandledRejection", (reason) => {
  appendBootstrapLog(`unhandledRejection: ${reason instanceof Error ? reason.stack || reason.message : String(reason)}`);
  // #region debug-point B:unhandled-rejection
  emitLauncherDebug("B", "launcher unhandledRejection", {
    reason: reason instanceof Error ? reason.stack || reason.message : String(reason),
  });
  // #endregion
});

main().catch((error) => {
  try {
    const initialRuntime = buildLocalSingleUserEnv({
      apiPort: DEFAULT_API_PORT,
      webPort: DEFAULT_WEB_PORT,
    });
    releaseLauncherLock(getLauncherLockPath(initialRuntime.paths));
    recordLifecycleState({
      phase: "FAILED",
      launcherPid: process.pid,
      runtimeMetadataPath: path.join(initialRuntime.paths.runtimeRoot, "local-single-user-runtime.json"),
      lifecycleStatePath: getLifecycleStatePath(initialRuntime.env),
      logsRoot: initialRuntime.paths.logsRoot,
      databasePath: initialRuntime.paths.dbPath,
      error: error instanceof Error ? error.stack || error.message : String(error),
    }, initialRuntime.env);
  } catch {
    // Ignore lock cleanup failure.
  }
  appendBootstrapLog(`main.catch: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  // #region debug-point D:main-catch
  emitLauncherDebug("D", "launcher main.catch reached", {
    error: error instanceof Error ? error.stack || error.message : String(error),
  });
  // #endregion
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

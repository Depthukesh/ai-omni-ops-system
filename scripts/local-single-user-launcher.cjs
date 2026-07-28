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
  isProcessAlive,
  openBrowser,
  projectRoot,
  shouldAutoOpenBrowser,
  sleep,
} = require("./local-single-user-runtime.cjs");
const { generateLocalSchema, targetSchemaPath } = require("./generate-local-prisma-schema.cjs");

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
    const copyResult = spawnSync(
      "powershell",
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
  return entries.some((entry) => entry.startsWith("query_engine"));
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
  hash.update(`file:${relativePath}:${stats.size}:${Math.trunc(stats.mtimeMs)}\n`);
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
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const status = await requestStatus(url);
    if (acceptedStatusCodes.includes(status)) {
      return true;
    }
    if (!isProcessAlive(pid)) {
      return false;
    }
    await sleep(1000);
  }
  return false;
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

function killProcessTree(pid) {
  if (!pid || !Number.isInteger(pid)) {
    return;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
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

async function main() {
  const initialRuntime = buildLocalSingleUserEnv({
    apiPort: DEFAULT_API_PORT,
    webPort: DEFAULT_WEB_PORT,
    env: {
      NODE_ENV: "production",
    },
  });
  const initialPaths = initialRuntime.paths;
  const runtimeMetadataPath = path.join(initialPaths.runtimeRoot, "local-single-user-runtime.json");
  const npmCli = resolveNpmCli();
  const nextBin = resolveNextBin();
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
      return;
    }
    console.log("[step] Stop previous local-single-user runtime...");
    for (const target of aliveTargets) {
      console.log(`[info] stop previous ${target.label} pid=${target.pid}`);
      killProcessTree(target.pid);
    }
    await sleep(1500);
    console.log("[done] Stop previous local-single-user runtime");
  }

  await stopPreviousRuntime();
  const apiPort = await findAvailablePort(DEFAULT_API_PORT);
  const webPort = await findAvailablePort(DEFAULT_WEB_PORT);
  const { env, paths } = buildLocalSingleUserEnv({
    apiPort,
    webPort,
    env: {
      NODE_ENV: "production",
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
  ensureCompatibleNextSwcEnv(env);

  generateLocalSchema();
  if (shouldRunLocalPrismaGenerate(paths)) {
    await runStep("Local Prisma generate", process.execPath, [prismaCli, "generate", "--schema", targetSchemaPath], projectRoot, env);
    recordLocalPrismaGenerate(paths);
  } else {
    console.log("[skip] Local Prisma generate (schema unchanged and generated client already exists)");
  }
  if (shouldRunLocalPrismaDbPush(paths, env)) {
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
  }
  if (shouldRunServerBuild(serverRoot)) {
    await runStep("Server build", process.execPath, [npmCli, "--workspace", "apps/server", "run", "build"], projectRoot, env);
    recordServerBuild(serverRoot);
  } else {
    console.log("[skip] Server build (sources unchanged and dist output already exists)");
  }
  if (shouldRunWebBuild(webRoot)) {
    await runStep("Web build", process.execPath, [nextBin, "build"], webRoot, env);
    recordWebBuild(webRoot);
  } else {
    console.log("[skip] Web build (sources unchanged and standalone output already exists)");
  }
  const stagedWebRuntime = stageStandaloneWebRuntime(webRoot, paths);
  const standaloneServer = stagedWebRuntime?.runtimeStandaloneServer || null;
  const sourceStandaloneServer = stagedWebRuntime?.sourceStandaloneServer || null;

  const serverEntry = resolveServerBuiltEntry();
  const children = [];
  let shuttingDown = false;

  function registerChild(label, child) {
    children.push({ label, child });
    child.once("exit", (code, signal) => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      console.error(`${label} 已退出，code=${code ?? "null"} signal=${signal ?? "null"}，准备关闭其余进程。`);
      for (const item of children) {
        if (item.child.pid && item.child.pid !== child.pid) {
          killProcessTree(item.child.pid);
        }
      }
      process.exit(code || 1);
    });
  }

  const serverChild = startLoggedProcess({
    label: "server",
    command: process.execPath,
    args: [serverEntry],
    cwd: serverRoot,
    env,
    outLog: serverLog,
    errLog: serverErrLog,
  });
  registerChild("server", serverChild);

  const apiReady = await waitForUrl(apiHealthUrl, serverChild.pid, [200]);
  if (!apiReady) {
    killProcessTree(serverChild.pid);
    throw new Error(`本地 API 未能成功启动，请检查日志：${serverErrLog}`);
  }

  const workerChild = startLoggedProcess({
    label: "worker",
    command: process.execPath,
    args: [serverEntry],
    cwd: serverRoot,
    env: {
      ...env,
      SERVER_BOOT_MODE: "worker",
    },
    outLog: workerLog,
    errLog: workerErrLog,
  });
  registerChild("worker", workerChild);
  await sleep(1500);
  if (!isProcessAlive(workerChild.pid)) {
    killProcessTree(serverChild.pid);
    throw new Error(`本地 worker 未能成功启动，请检查日志：${workerErrLog}`);
  }

  const webChild = startLoggedProcess({
    label: "web",
    command: process.execPath,
    args: standaloneServer ? [standaloneServer] : [nextBin, "start", "-H", "127.0.0.1", "-p", String(webPort)],
    cwd: standaloneServer ? path.dirname(standaloneServer) : webRoot,
    env: {
      ...env,
      PORT: String(webPort),
      HOSTNAME: "127.0.0.1",
    },
    outLog: webLog,
    errLog: webErrLog,
  });
  registerChild("web", webChild);
  console.log(
    `[step] Web process started via ${standaloneServer ? "runtime-isolated standalone server.js" : "next start"} on ${env.WEB_PUBLIC_BASE_URL}`,
  );

  const webReady = await waitForUrl(previewUrl, webChild.pid, [200, 307, 308]);
  if (!webReady) {
    killProcessTree(serverChild.pid);
    killProcessTree(workerChild.pid);
    killProcessTree(webChild.pid);
    throw new Error(`本地 Web 未能成功启动，请检查日志：${webErrLog}`);
  }

  const runtimeMetadata = {
    appRuntimeMode: "local-single-user",
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

  console.log(`local-single-user 已启动`);
  console.log(`工作台入口：${browserUrl}`);
  console.log(`工作台预览：${previewUrl}`);
  console.log(`API 健康检查：${apiHealthUrl}`);
  console.log(`SQLite：${paths.dbPath}`);
  console.log(`运行时信息：${runtimeMetadataPath}`);
  console.log(`日志目录：${paths.logsRoot}`);
  if (shouldAutoOpenBrowser(env)) {
    openBrowser(browserUrl);
  } else {
    console.log("[skip] Auto open browser (disabled by current environment)");
  }

  const shutdown = (signal) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`收到 ${signal}，正在关闭 local-single-user 进程...`);
    for (const item of children) {
      killProcessTree(item.child.pid);
    }
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  setInterval(() => {}, 60_000);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

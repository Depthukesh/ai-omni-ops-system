const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const DEFAULT_WEB_PORT = 3001;
const DEFAULT_API_PORT = 3011;

function resolveLocalAppRoot(env = process.env) {
  const explicit = String(env.LOCAL_APP_DATA_ROOT || env.AI_OMNI_LOCAL_ROOT || "").trim();
  if (explicit) {
    return path.resolve(explicit);
  }

  if (process.platform === "win32" && env.APPDATA) {
    return path.resolve(env.APPDATA, "AiOmniOps");
  }
  if (process.platform === "darwin") {
    return path.resolve(os.homedir(), "Library", "Application Support", "AiOmniOps");
  }
  return path.resolve(os.homedir(), ".local", "share", "ai-omni-ops");
}

function resolveLocalPaths(env = process.env) {
  const appRoot = resolveLocalAppRoot(env);
  return {
    appRoot,
    dataRoot: path.join(appRoot, "data"),
    dbRoot: path.join(appRoot, "db"),
    dbPath: path.join(appRoot, "db", "local-single-user.sqlite"),
    logsRoot: path.join(appRoot, "logs"),
    storageRoot: path.join(appRoot, "storage"),
    cacheRoot: path.join(appRoot, "cache"),
    runtimeRoot: path.join(appRoot, "runtime"),
    backupRoot: path.join(appRoot, "backup"),
    updatesRoot: path.join(appRoot, "updates"),
  };
}

function ensureLocalDirectories(env = process.env) {
  const paths = resolveLocalPaths(env);
  const localAppDataRoot = path.join(paths.runtimeRoot, "localappdata");
  const tempRoot = path.join(paths.runtimeRoot, "temp");
  [
    paths.appRoot,
    paths.dataRoot,
    paths.dbRoot,
    paths.logsRoot,
    paths.storageRoot,
    paths.cacheRoot,
    paths.runtimeRoot,
    paths.backupRoot,
    paths.updatesRoot,
    localAppDataRoot,
    tempRoot,
  ].forEach((targetPath) => {
    fs.mkdirSync(targetPath, { recursive: true });
  });
  return paths;
}

function toPrismaSqliteUrl(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/g, "/");
  return `file:${normalized}`;
}

function buildLocalSingleUserEnv(options = {}) {
  const webPort = Number(options.webPort || process.env.WEB_PORT || DEFAULT_WEB_PORT);
  const apiPort = Number(options.apiPort || process.env.PORT || DEFAULT_API_PORT);
  const baseEnv = {
    ...process.env,
    ...options.env,
  };
  const paths = ensureLocalDirectories(baseEnv);
  const webBaseUrl = `http://127.0.0.1:${webPort}`;
  const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`;

  return {
    paths,
    webPort,
    apiPort,
    env: {
      ...baseEnv,
      APP_RUNTIME_MODE: "local-single-user",
      LOCAL_APP_DATA_ROOT: paths.appRoot,
      DATABASE_URL: toPrismaSqliteUrl(paths.dbPath),
      LOCALAPPDATA: path.join(paths.runtimeRoot, "localappdata"),
      SERVER_HOST: "127.0.0.1",
      TEMP: path.join(paths.runtimeRoot, "temp"),
      TMP: path.join(paths.runtimeRoot, "temp"),
      PORT: String(apiPort),
      WEB_PORT: String(webPort),
      WORKS_HEAVY_SUBMISSION_WORKER_ENABLED: "true",
      WEB_PUBLIC_BASE_URL: webBaseUrl,
      NEXT_PUBLIC_WEB_BASE_URL: webBaseUrl,
      API_PUBLIC_BASE_URL: apiBaseUrl,
      INTERNAL_API_BASE_URL: apiBaseUrl,
      API_PROXY_TARGET: apiBaseUrl,
      NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
      NEXT_PUBLIC_APP_RUNTIME_MODE: "local-single-user",
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessAlive(pid) {
  if (!pid || !Number.isInteger(pid)) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function probePort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(800);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function findAvailablePort(startPort, host = "127.0.0.1") {
  let current = startPort;
  while (await probePort(current, host)) {
    current += 1;
  }
  return current;
}

function openBrowser(url) {
  if (process.platform === "win32") {
    const child = spawn("powershell", ["-NoProfile", "-Command", "Start-Process", url], {
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return;
  }
  if (process.platform === "darwin") {
    const child = spawn("open", [url], { stdio: "ignore" });
    child.unref();
    return;
  }
  const child = spawn("xdg-open", [url], { stdio: "ignore" });
  child.unref();
}

function shouldAutoOpenBrowser(env = process.env) {
  const explicit = String(env.LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER || "").trim().toLowerCase();
  if (explicit === "false" || explicit === "0" || explicit === "no" || explicit === "off") {
    return false;
  }
  if (explicit === "true" || explicit === "1" || explicit === "yes" || explicit === "on") {
    return true;
  }
  if (env.TRAE_SANDBOX_CLI_PATH || env.TRAE_SANDBOX_CONFIG_NAME || env.TRAE_AI_SHELL_ID) {
    return false;
  }
  return true;
}

module.exports = {
  DEFAULT_API_PORT,
  DEFAULT_WEB_PORT,
  buildLocalSingleUserEnv,
  ensureLocalDirectories,
  findAvailablePort,
  isProcessAlive,
  openBrowser,
  probePort,
  projectRoot,
  resolveLocalAppRoot,
  resolveLocalPaths,
  sleep,
  shouldAutoOpenBrowser,
  toPrismaSqliteUrl,
};

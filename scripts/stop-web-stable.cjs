const fs = require("node:fs");
const path = require("node:path");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const DEFAULT_PORT = 3001;
const port = readPortFromEnv("WEB_PORT", DEFAULT_PORT);
const pidFile = path.join(projectRoot, ".runtime", `web-${port}.pid`);

function readPortFromEnv(key, fallback) {
  const raw = String(process.env[key] || "").trim();
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readPidFile() {
  try {
    const raw = fs.readFileSync(pidFile, "utf8").trim();
    const pid = Number(raw);
    return Number.isInteger(pid) ? pid : undefined;
  } catch {
    return undefined;
  }
}

function removePidFile() {
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // Ignore missing pid file.
  }
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

function main() {
  const pid = readPidFile();
  if (!pid) {
    console.log(`未找到受管的 ${port} 前端进程。`);
    return;
  }

  if (!isProcessAlive(pid)) {
    removePidFile();
    console.log(`PID=${pid} 已不存在，已清理 pid 文件。`);
    return;
  }

  process.kill(pid);
  removePidFile();
  console.log(`已停止前端服务，PID=${pid}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

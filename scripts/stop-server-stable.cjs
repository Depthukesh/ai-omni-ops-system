const fs = require("node:fs");
const path = require("node:path");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const pidFile = path.join(projectRoot, ".runtime", "server-3011.pid");

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
    console.log("未找到受管的 3011 后端进程。");
    return;
  }

  if (!isProcessAlive(pid)) {
    removePidFile();
    console.log(`PID=${pid} 已不存在，已清理 pid 文件。`);
    return;
  }

  process.kill(pid);
  removePidFile();
  console.log(`已停止后端服务，PID=${pid}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

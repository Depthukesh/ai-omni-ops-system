const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const net = require("node:net");
const { spawn } = require("node:child_process");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const webRoot = path.join(projectRoot, "apps", "web");
const runtimeRoot = path.join(projectRoot, ".runtime");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const DEFAULT_PORT = 3001;
const port = readPortFromEnv("WEB_PORT", DEFAULT_PORT);
const outLog = path.join(runtimeRoot, `web-${port}.out.log`);
const errLog = path.join(runtimeRoot, `web-${port}.err.log`);
const pidFile = path.join(runtimeRoot, `web-${port}.pid`);
const previewUrl = `http://localhost:${port}/brand-growth`;

function readPortFromEnv(key, fallback) {
  const raw = String(process.env[key] || "").trim();
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
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

function isPortOpen(host = "127.0.0.1") {
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

function requestPage() {
  return new Promise((resolve) => {
    const req = http.get(previewUrl, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.setTimeout(1500, () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", () => resolve(0));
  });
}

function tailLog(filePath, maxBytes = 4000) {
  try {
    const stats = fs.statSync(filePath);
    const start = Math.max(0, stats.size - maxBytes);
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(stats.size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    fs.closeSync(fd);
    return buffer.toString("utf8").trim();
  } catch {
    return "";
  }
}

function runStep(args, label) {
  const result = spawn(process.execPath, [nextBin, ...args], {
    cwd: webRoot,
    env: {
      ...process.env,
      BROWSER: "none",
    },
    stdio: "pipe",
    windowsHide: true,
  });

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    result.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    result.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    result.on("error", reject);
    result.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
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

async function waitUntilReady(pid) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const [portOpen, statusCode] = await Promise.all([isPortOpen(), requestPage()]);
    if (portOpen && (statusCode === 200 || statusCode === 404)) {
      return true;
    }
    if (!isProcessAlive(pid)) {
      return false;
    }
    await sleep(1000);
  }
  return false;
}

async function main() {
  ensureDirectory(runtimeRoot);

  if (!fs.existsSync(nextBin)) {
    throw new Error(`未找到 Next.js 启动文件：${nextBin}`);
  }

  const existingPid = readPidFile();
  if (existingPid && isProcessAlive(existingPid)) {
    console.log(`前端服务已在运行，PID=${existingPid}`);
    console.log(previewUrl);
    return;
  }
  removePidFile();

  const existingStatusCode = await requestPage();
  if (await isPortOpen()) {
    throw new Error(
      `检测到 ${port} 已被未托管进程占用，页面状态码：${existingStatusCode || "未知"}。请先释放端口后再重试。`,
    );
  }

  console.log("开始构建前端生产预览资源...");
  await runStep(["build"], "Next build");
  console.log("构建完成，启动 next start 预览服务...");

  const outFd = fs.openSync(outLog, "a");
  const errFd = fs.openSync(errLog, "a");
  const child = spawn(process.execPath, [nextBin, "start", "-H", "0.0.0.0", "-p", String(port)], {
    cwd: webRoot,
    env: {
      ...process.env,
      PORT: String(port),
      BROWSER: "none",
    },
    detached: true,
    stdio: ["ignore", outFd, errFd],
    windowsHide: true,
  });

  child.unref();
  fs.writeFileSync(pidFile, String(child.pid));

  const ready = await waitUntilReady(child.pid);
  if (!ready) {
    const errorTail = tailLog(errLog);
    const outputTail = tailLog(outLog);
    removePidFile();
    throw new Error(
      [
        "前端服务启动失败或超时。",
        errorTail ? `错误日志：\n${errorTail}` : "",
        outputTail ? `输出日志：\n${outputTail}` : "",
      ].filter(Boolean).join("\n\n"),
    );
  }

  console.log(`前端服务已稳定启动，PID=${child.pid}`);
  console.log(`页面地址：${previewUrl}`);
  console.log(`标准输出日志：${outLog}`);
  console.log(`错误日志：${errLog}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

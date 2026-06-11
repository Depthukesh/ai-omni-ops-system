const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const serverRoot = path.join(projectRoot, "apps", "server");
const builtEntryCandidates = [
  path.join(serverRoot, "dist", "apps", "server", "src", "main.js"),
  path.join(serverRoot, "dist", "main.js"),
];

function resolveTypeScriptCli() {
  const candidates = [
    path.join(projectRoot, "node_modules", "typescript", "bin", "tsc"),
    path.join(serverRoot, "node_modules", "typescript", "bin", "tsc"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("未找到 TypeScript CLI，无法启动后端 watch 模式。");
}

function resolveBuiltEntry() {
  for (const candidate of builtEntryCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    [
      "未找到后端编译入口，无法启动开发态服务。",
      "已检查：",
      ...builtEntryCandidates.map((candidate) => `- ${candidate}`),
    ].join("\n"),
  );
}

function runStep(command, args, cwd, label) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label}失败，退出码=${code ?? "unknown"}`));
    });
  });
}

function spawnManagedProcess(command, args, cwd, label) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });

  child.on("error", (error) => {
    console.error(`[${label}] 启动失败：${error instanceof Error ? error.message : String(error)}`);
  });

  child.on("close", (code, signal) => {
    if (shuttingDown) {
      return;
    }
    console.error(`[${label}] 已退出，code=${code ?? "null"} signal=${signal ?? "null"}`);
    shutdown(code ?? 1);
  });

  return child;
}

let shuttingDown = false;
let watcherProcess;
let serverProcess;

function stopChild(child) {
  if (!child || child.killed) {
    return;
  }
  try {
    child.kill("SIGTERM");
  } catch {
    // Ignore kill errors during shutdown.
  }
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  stopChild(serverProcess);
  stopChild(watcherProcess);
  setTimeout(() => process.exit(exitCode), 50);
}

async function main() {
  const typeScriptCli = resolveTypeScriptCli();

  console.log("开始进行后端首次编译...");
  await runStep(process.execPath, [typeScriptCli, "-p", "tsconfig.json"], serverRoot, "Server initial build");

  const builtEntry = resolveBuiltEntry();
  console.log(`首次编译完成，运行入口：${builtEntry}`);
  console.log("启动 TypeScript watch 与 Node --watch 开发态服务...");

  watcherProcess = spawnManagedProcess(
    process.execPath,
    [typeScriptCli, "-p", "tsconfig.json", "--watch", "--preserveWatchOutput", "false"],
    serverRoot,
    "tsc-watch",
  );

  serverProcess = spawnManagedProcess(
    process.execPath,
    ["--watch", builtEntry],
    serverRoot,
    "node-watch",
  );
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("exit", () => {
  stopChild(serverProcess);
  stopChild(watcherProcess);
});

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  shutdown(1);
});

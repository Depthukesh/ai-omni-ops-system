const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const webRoot = path.join(projectRoot, "apps", "web");

function resolveStandaloneServer() {
  const candidates = [
    path.join(webRoot, ".next", "standalone", path.basename(projectRoot), "apps", "web", "server.js"),
    path.join(webRoot, ".next", "standalone", "apps", "web", "server.js"),
    path.join(webRoot, ".next", "standalone", "server.js"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
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
      if (entry.isFile() && entry.name === "server.js") {
        return fullPath;
      }
    }
  }

  return null;
}

function resolveNextBin() {
  const candidates = [
    path.join(projectRoot, "node_modules", "next", "dist", "bin", "next"),
    path.join(webRoot, "node_modules", "next", "dist", "bin", "next"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    return require.resolve("next/dist/bin/next", { paths: [webRoot, projectRoot] });
  } catch {
    return candidates[0];
  }
}

function spawnAndPipe(command, args, options) {
  const child = spawn(command, args, {
    stdio: "inherit",
    windowsHide: true,
    ...options,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

function buildWebRuntimeEnv() {
  return {
    ...process.env,
    PORT: process.env.PORT || "3001",
    HOSTNAME: process.env.HOSTNAME || "127.0.0.1",
  };
}

const standaloneServer = resolveStandaloneServer();

if (standaloneServer) {
  const standaloneAppRoot = path.dirname(standaloneServer);
  spawnAndPipe(process.execPath, [standaloneServer], {
    cwd: standaloneAppRoot,
    env: buildWebRuntimeEnv(),
  });
} else {
  const nextBin = resolveNextBin();

  if (!fs.existsSync(nextBin)) {
    console.error(`未找到 Next.js CLI：${nextBin}`);
    process.exit(1);
  }

  spawnAndPipe(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", "3001"], {
    cwd: webRoot,
    env: buildWebRuntimeEnv(),
  });
}

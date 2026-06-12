const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const webRoot = path.join(projectRoot, "apps", "web");
const forwardedArgs = process.argv.slice(2);

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

const nextBin = resolveNextBin();

if (!forwardedArgs.length) {
  console.error("缺少 Next.js 命令参数，例如：build / start / lint");
  process.exit(1);
}

if (!fs.existsSync(nextBin)) {
  console.error(`未找到 Next.js CLI：${nextBin}`);
  process.exit(1);
}

const child = spawn(process.execPath, [nextBin, ...forwardedArgs], {
  cwd: webRoot,
  env: process.env,
  stdio: "inherit",
  windowsHide: true,
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

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const releaseRoot = path.join(projectRoot, ".release", "local-single-user-win-x64");
const artifactsRoot = path.join(projectRoot, ".release", "artifacts");
const zipFilePath = path.join(artifactsRoot, "AiOmniOps-local-single-user-win-x64.zip");
const checksumFilePath = `${zipFilePath}.sha256`;

const args = new Set(process.argv.slice(2).map((value) => String(value || "").trim().toLowerCase()));
const dryRun = args.has("--dry-run");
const skipRebuild = args.has("--skip-rebuild");

function ensurePowerShell() {
  const powershellExe = process.env.SystemRoot
    ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
    : "powershell.exe";
  return powershellExe;
}

function runNodeScript(scriptPath, extraArgs = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function runPowerShell(script) {
  const powershellExe = ensurePowerShell();
  const result = spawnSync(
    powershellExe,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
    {
      cwd: projectRoot,
      stdio: "inherit",
      windowsHide: true,
    },
  );
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function main() {
  const buildScriptPath = path.join(projectRoot, "scripts", "build-local-single-user-release.cjs");
  const releaseRootExists = fs.existsSync(releaseRoot);
  const shouldRebuild = !skipRebuild || !releaseRootExists;

  if (shouldRebuild) {
    if (dryRun) {
      console.log(`[dry-run] would rebuild release bundle via ${buildScriptPath}`);
    } else {
      console.log(`[step] rebuild release bundle via ${buildScriptPath}`);
      runNodeScript(buildScriptPath);
    }
  } else if (!dryRun) {
    console.log("[skip] Reusing existing release bundle due to --skip-rebuild");
  }

  if (dryRun) {
    console.log("[dry-run] local-single-user release package plan");
    console.log(`source release root: ${releaseRoot}`);
    console.log(`zip artifact: ${zipFilePath}`);
    console.log(`checksum file: ${checksumFilePath}`);
    if (!releaseRootExists && skipRebuild) {
      console.log("[dry-run] release bundle is missing now; real packaging will build it first.");
    }
    return;
  }

  if (!fs.existsSync(releaseRoot)) {
    throw new Error(`缺少发布目录：${releaseRoot}`);
  }

  fs.mkdirSync(artifactsRoot, { recursive: true });

  const archiveScript = [
    `$releaseRoot = ${JSON.stringify(releaseRoot)}`,
    `$zipFile = ${JSON.stringify(zipFilePath)}`,
    "if (Test-Path $zipFile) { Remove-Item -LiteralPath $zipFile -Force }",
    "Compress-Archive -LiteralPath $releaseRoot -DestinationPath $zipFile -CompressionLevel Optimal",
  ].join("; ");

  runPowerShell(archiveScript);
  const checksum = hashFile(zipFilePath);
  fs.writeFileSync(checksumFilePath, `${checksum}  ${path.basename(zipFilePath)}\n`, "utf8");

  console.log(`local-single-user 压缩包已生成：${zipFilePath}`);
  console.log(`SHA256：${checksumFilePath}`);
}

main();

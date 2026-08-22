const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { resolveNextAppVersion } = require("./local-single-user-semver.cjs");
const { resolvePowerShellExecutable } = require("./local-single-user-platform.cjs");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const releaseRoot = path.join(projectRoot, ".release", "local-single-user-win-x64");
const artifactsRoot = path.join(projectRoot, ".release", "artifacts");
const zipFilePath = path.join(artifactsRoot, "AiOmniOps-local-single-user-win-x64.zip");
const checksumFilePath = `${zipFilePath}.sha256`;
const validateScriptPath = path.join(projectRoot, "scripts", "validate-local-single-user-release.cjs");

function parseArgs(argv) {
  const normalizedFlags = new Set();
  let releaseTag = "";
  for (let index = 0; index < argv.length; index += 1) {
    const current = String(argv[index] || "").trim();
    const lower = current.toLowerCase();
    if (!current) {
      continue;
    }
    if (lower === "--release-tag") {
      releaseTag = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    normalizedFlags.add(lower);
  }
  return {
    flags: normalizedFlags,
    releaseTag,
  };
}

const parsedArgs = parseArgs(process.argv.slice(2));
const dryRun = parsedArgs.flags.has("--dry-run");
const skipRebuild = parsedArgs.flags.has("--skip-rebuild");

function ensurePowerShell() {
  return resolvePowerShellExecutable(process.env);
}

function resolveReleaseBuildContext() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const latestJsonPath = path.join(artifactsRoot, "latest.json");
  const latestJson = fs.existsSync(latestJsonPath)
    ? JSON.parse(fs.readFileSync(latestJsonPath, "utf8"))
    : null;
  const nextAppVersion = resolveNextAppVersion(
    String(packageJson.version || "").trim() || "0.1.0",
    String(latestJson?.appVersion || "").trim(),
  );
  return {
    nextAppVersion,
    latestJsonPath,
  };
}

function runNodeScript(scriptPath, extraArgs = []) {
  const { nextAppVersion } = resolveReleaseBuildContext();
  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      LOCAL_SINGLE_USER_APP_VERSION: nextAppVersion,
      LOCAL_SINGLE_USER_RELEASE_TAG: parsedArgs.releaseTag || process.env.LOCAL_SINGLE_USER_RELEASE_TAG || "",
    },
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function runReleaseValidation(extraArgs = []) {
  const result = spawnSync(process.execPath, [validateScriptPath, ...extraArgs], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
    env: process.env,
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
  const { nextAppVersion } = resolveReleaseBuildContext();

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
    if (parsedArgs.releaseTag) {
      console.log(`release tag: ${parsedArgs.releaseTag}`);
    }
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
    "Add-Type -AssemblyName System.IO.Compression.FileSystem",
    "if (Test-Path $zipFile) { Remove-Item -LiteralPath $zipFile -Force }",
    '[System.IO.Compression.ZipFile]::CreateFromDirectory($releaseRoot, $zipFile, [System.IO.Compression.CompressionLevel]::Optimal, $false)',
  ].join("; ");

  runPowerShell(archiveScript);
  const checksum = hashFile(zipFilePath);
  fs.writeFileSync(checksumFilePath, `${checksum}  ${path.basename(zipFilePath)}\n`, "utf8");
  console.log("[step] validate packaged release artifacts");
  runReleaseValidation([
    "--release-root",
    releaseRoot,
    "--zip-file",
    zipFilePath,
    "--checksum-file",
    checksumFilePath,
    "--expected-release-tag",
    parsedArgs.releaseTag || process.env.LOCAL_SINGLE_USER_RELEASE_TAG || "",
    "--expected-app-version",
    nextAppVersion,
  ]);

  console.log(`local-single-user 压缩包已生成：${zipFilePath}`);
  console.log(`SHA256：${checksumFilePath}`);
}

main();

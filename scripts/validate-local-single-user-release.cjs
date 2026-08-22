const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { resolvePowerShellExecutable } = require("./local-single-user-platform.cjs");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const defaultReleaseRoot = path.join(projectRoot, ".release", "local-single-user-win-x64");
const defaultZipFilePath = path.join(projectRoot, ".release", "artifacts", "AiOmniOps-local-single-user-win-x64.zip");
const defaultChecksumFilePath = `${defaultZipFilePath}.sha256`;
const defaultLatestJsonPath = path.join(projectRoot, ".release", "artifacts", "latest.json");

const REQUIRED_RELEASE_PATHS = [
  "start-local-single-user.cmd",
  "install-local-single-user.cmd",
  "install-local-single-user.ps1",
  "bin/node.exe",
  "meta/release-manifest.json",
  "app/scripts/local-single-user-launcher.cjs",
  "app/scripts/local-single-user-launch-settings.cjs",
  "app/scripts/local-single-user-platform.cjs",
  "app/scripts/local-single-user-runtime.cjs",
  "app/scripts/local-single-user-prisma.cjs",
  "app/scripts/local-single-user-autostart.cjs",
  "app/scripts/local-single-user-autostart.ps1",
  "app/scripts/local-single-user-updater.ps1",
  "app/apps/server/dist",
  "app/apps/web/.next/standalone",
  "app/apps/web/.next/static",
];

const REQUIRED_MANIFEST_COPIED_PATHS = [
  "scripts\\local-single-user-platform.cjs",
  "scripts\\local-single-user-runtime.cjs",
  "scripts\\local-single-user-launcher.cjs",
  "scripts\\local-single-user-launch-settings.cjs",
  "scripts\\local-single-user-updater.ps1",
  "apps\\server\\dist",
  "apps\\web\\.next\\standalone",
];

const REQUIRED_ZIP_ENTRY_PATHS = [
  "meta/release-manifest.json",
  "bin/node.exe",
  "app/scripts/local-single-user-platform.cjs",
  "app/scripts/local-single-user-runtime.cjs",
  "app/scripts/local-single-user-launcher.cjs",
  "app/scripts/local-single-user-updater.ps1",
];

function parseArgs(argv) {
  const result = {
    releaseRoot: defaultReleaseRoot,
    zipFilePath: "",
    checksumFilePath: "",
    latestJsonPath: "",
    expectedReleaseTag: "",
    expectedAppVersion: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const current = String(argv[index] || "").trim();
    if (!current) {
      continue;
    }
    if (current === "--release-root") {
      result.releaseRoot = path.resolve(String(argv[index + 1] || "").trim());
      index += 1;
      continue;
    }
    if (current === "--zip-file") {
      result.zipFilePath = path.resolve(String(argv[index + 1] || "").trim());
      index += 1;
      continue;
    }
    if (current === "--checksum-file") {
      result.checksumFilePath = path.resolve(String(argv[index + 1] || "").trim());
      index += 1;
      continue;
    }
    if (current === "--latest-json") {
      result.latestJsonPath = path.resolve(String(argv[index + 1] || "").trim());
      index += 1;
      continue;
    }
    if (current === "--expected-release-tag") {
      result.expectedReleaseTag = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (current === "--expected-app-version") {
      result.expectedAppVersion = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    throw new Error(`未知参数：${current}`);
  }
  return result;
}

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label}不存在：${targetPath}`);
  }
}

function ensureNonEmptyText(value, label) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`${label}不能为空`);
  }
  return normalized;
}

function readJsonFile(filePath, label) {
  ensureExists(filePath, label);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label}不是合法 JSON：${error instanceof Error ? error.message : String(error)}`);
  }
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function validateReleaseRoot(releaseRoot, expectedReleaseTag, expectedAppVersion) {
  ensureExists(releaseRoot, "发布目录");
  for (const relativePath of REQUIRED_RELEASE_PATHS) {
    ensureExists(path.join(releaseRoot, relativePath), "发布物关键文件");
  }

  const manifestPath = path.join(releaseRoot, "meta", "release-manifest.json");
  const manifest = readJsonFile(manifestPath, "release-manifest.json");
  const releaseTag = String(manifest.releaseTag || "").trim();
  const appVersion = String(manifest.appVersion || "").trim();
  ensureNonEmptyText(appVersion, "release-manifest.appVersion");
  if (expectedReleaseTag && releaseTag !== expectedReleaseTag) {
    throw new Error(`release-manifest.releaseTag 不匹配：期望 ${expectedReleaseTag}，实际 ${releaseTag || "<empty>"}`);
  }
  if (expectedAppVersion && appVersion !== expectedAppVersion) {
    throw new Error(`release-manifest.appVersion 不匹配：期望 ${expectedAppVersion}，实际 ${appVersion}`);
  }

  const copiedPaths = Array.isArray(manifest.copiedPaths) ? manifest.copiedPaths.map((item) => String(item || "").trim()) : [];
  for (const relativePath of REQUIRED_MANIFEST_COPIED_PATHS) {
    if (!copiedPaths.includes(relativePath)) {
      throw new Error(`release-manifest.copiedPaths 缺少关键条目：${relativePath}`);
    }
  }

  const bundledNodePath = path.join(releaseRoot, "bin", "node.exe");
  const smokeRoot = path.join(projectRoot, ".release", "release-smoke", `${Date.now()}`);
  fs.mkdirSync(smokeRoot, { recursive: true });
  const smokeScript = [
    "require('./app/scripts/local-single-user-runtime.cjs');",
    "console.log('runtime-smoke-ok');",
  ].join(" ");
  const smokeResult = spawnSync(
    bundledNodePath,
    ["-e", smokeScript],
    {
      cwd: releaseRoot,
      encoding: "utf8",
      windowsHide: true,
      env: {
        ...process.env,
        LOCAL_APP_DATA_ROOT: smokeRoot,
        AI_OMNI_LOCAL_ROOT: smokeRoot,
        APPDATA: smokeRoot,
      },
    },
  );
  fs.rmSync(smokeRoot, { recursive: true, force: true });
  if (smokeResult.status !== 0) {
    const detail = [smokeResult.stdout, smokeResult.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`运行时 smoke test 失败：${detail || `exit=${smokeResult.status || 1}`}`);
  }

  return {
    releaseTag,
    appVersion,
  };
}

function readZipEntries(zipFilePath) {
  const powershellExe = resolvePowerShellExecutable(process.env);
  const tempOutputPath = path.join(projectRoot, ".release", `zip-entries-${Date.now()}-${process.pid}.txt`);
  fs.mkdirSync(path.dirname(tempOutputPath), { recursive: true });
  const command = [
    "Add-Type -AssemblyName System.IO.Compression.FileSystem",
    `$zip = [System.IO.Compression.ZipFile]::OpenRead('${String(zipFilePath).replace(/'/g, "''")}')`,
    "try {",
    `  $outputPath = '${String(tempOutputPath).replace(/'/g, "''")}'`,
    "  $lines = $zip.Entries | ForEach-Object { $_.FullName }",
    "  [System.IO.File]::WriteAllLines($outputPath, $lines)",
    "} finally {",
    "  $zip.Dispose()",
    "}",
  ].join("; ");
  const result = spawnSync(
    powershellExe,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`读取 zip 条目失败：${detail || `exit=${result.status || 1}`}`);
  }
  const text = fs.existsSync(tempOutputPath) ? fs.readFileSync(tempOutputPath, "utf8") : "";
  fs.rmSync(tempOutputPath, { force: true });
  return String(text || "")
    .split(/\r?\n/u)
    .map((line) => line.trim().replace(/\//g, "\\"))
    .filter(Boolean);
}

function validateZipArtifacts(zipFilePath, checksumFilePath) {
  ensureExists(zipFilePath, "发布 zip");
  ensureExists(checksumFilePath, "发布 zip 摘要");
  const actualHash = hashFile(zipFilePath);
  const checksumText = fs.readFileSync(checksumFilePath, "utf8").trim();
  if (!checksumText.startsWith(actualHash)) {
    throw new Error(`zip SHA256 与摘要文件不一致：${actualHash}`);
  }

  const zipEntries = readZipEntries(zipFilePath);
  for (const relativePath of REQUIRED_ZIP_ENTRY_PATHS) {
    if (!zipEntries.includes(relativePath.replace(/\//g, "\\"))) {
      throw new Error(`zip 缺少关键条目：${relativePath}`);
    }
  }

  return {
    checksumValue: actualHash,
  };
}

function validateLatestJson(latestJsonPath, expectedReleaseTag, expectedAppVersion, checksumValue) {
  if (!latestJsonPath) {
    return;
  }
  const latest = readJsonFile(latestJsonPath, "latest.json");
  const version = ensureNonEmptyText(latest.version, "latest.json.version");
  const appVersion = ensureNonEmptyText(latest.appVersion, "latest.json.appVersion");
  if (expectedReleaseTag && version !== expectedReleaseTag) {
    throw new Error(`latest.json.version 不匹配：期望 ${expectedReleaseTag}，实际 ${version}`);
  }
  if (expectedAppVersion && appVersion !== expectedAppVersion) {
    throw new Error(`latest.json.appVersion 不匹配：期望 ${expectedAppVersion}，实际 ${appVersion}`);
  }
  if (checksumValue && String(latest.checksumValue || "").trim().toLowerCase() !== checksumValue.toLowerCase()) {
    throw new Error(`latest.json.checksumValue 不匹配：期望 ${checksumValue}，实际 ${String(latest.checksumValue || "").trim() || "<empty>"}`);
  }
  if (expectedReleaseTag) {
    const zipUrl = String(latest.zipUrl || "").trim();
    const sha256Url = String(latest.sha256Url || "").trim();
    if (!zipUrl.includes(`/${expectedReleaseTag}/`)) {
      throw new Error(`latest.json.zipUrl 未指向目标版本：${zipUrl || "<empty>"}`);
    }
    if (!sha256Url.includes(`/${expectedReleaseTag}/`)) {
      throw new Error(`latest.json.sha256Url 未指向目标版本：${sha256Url || "<empty>"}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const releaseInfo = validateReleaseRoot(args.releaseRoot, args.expectedReleaseTag, args.expectedAppVersion);
  let checksumValue = "";
  if (args.zipFilePath || args.checksumFilePath) {
    const zipInfo = validateZipArtifacts(
      args.zipFilePath || defaultZipFilePath,
      args.checksumFilePath || defaultChecksumFilePath,
    );
    checksumValue = zipInfo.checksumValue;
  }
  if (args.latestJsonPath) {
    validateLatestJson(args.latestJsonPath, args.expectedReleaseTag, args.expectedAppVersion, checksumValue);
  }

  console.log(`release-validate-ok releaseTag=${releaseInfo.releaseTag || "<empty>"} appVersion=${releaseInfo.appVersion}`);
  if (checksumValue) {
    console.log(`release-validate-checksum ${checksumValue}`);
  }
}

main();

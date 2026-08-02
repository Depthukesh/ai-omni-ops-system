const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const OSS = require("ali-oss");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const artifactsRoot = path.join(projectRoot, ".release", "artifacts");
const zipFilePath = path.join(artifactsRoot, "AiOmniOps-local-single-user-win-x64.zip");
const checksumFilePath = `${zipFilePath}.sha256`;
const latestJsonPath = path.join(artifactsRoot, "latest.json");
const MULTIPART_UPLOAD_THRESHOLD_BYTES = 64 * 1024 * 1024;
const MULTIPART_UPLOAD_PART_SIZE_BYTES = 8 * 1024 * 1024;
const OSS_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_RELEASE_NOTES = "版本页改为合并展示当前版本与最新版本，并收口为系统更新日志视图";

function parseArgs(argv) {
  const result = {
    dryRun: false,
    version: "",
    notes: "",
    prefix: "ai-omni-ops/local-single-user/win-x64",
    publicBaseUrl: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const current = String(argv[index] || "");
    if (current === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (current === "--version") {
      result.version = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (current === "--notes") {
      result.notes = String(argv[index + 1] || "").trim();
      index += 1;
      continue;
    }
    if (current === "--prefix") {
      result.prefix = String(argv[index + 1] || "").trim().replace(/^\/+|\/+$/g, "");
      index += 1;
      continue;
    }
    if (current === "--public-base-url") {
      result.publicBaseUrl = String(argv[index + 1] || "").trim().replace(/\/+$/g, "");
      index += 1;
      continue;
    }
    throw new Error(`未知参数：${current}`);
  }
  return result;
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`缺少文件：${filePath}`);
  }
}

function readRequiredEnv(key) {
  const value = String(process.env[key] || "").trim();
  if (!value) {
    throw new Error(`缺少环境变量：${key}`);
  }
  return value;
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function buildPublicBaseUrl(bucket, region, explicit) {
  if (explicit) {
    return explicit.replace(/\/+$/g, "");
  }
  return `https://${bucket}.${region}.aliyuncs.com`;
}

function readAppVersion() {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return String(packageJson.version || "").trim() || "0.1.0";
}

async function readExistingLatestJson(publicBaseUrl, prefix) {
  const latestUrl = `${publicBaseUrl}/${prefix}/latest.json`;
  try {
    const response = await fetch(latestUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ai-omni-ops-system-release-uploader",
      },
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeHistoryEntries(existingLatestJson) {
  const entries = [];
  const history = Array.isArray(existingLatestJson?.history) ? existingLatestJson.history : [];
  for (const item of history) {
    const content = String(item?.content || item?.notes || "").trim();
    if (!content) {
      continue;
    }
    entries.push({
      releaseTag: String(item?.releaseTag || item?.version || "").trim() || "",
      appVersion: String(item?.appVersion || "").trim() || "",
      publishedAt: String(item?.publishedAt || "").trim() || "",
      content,
    });
  }

  if (entries.length === 0) {
    const legacyContent = String(existingLatestJson?.notes || "").trim();
    const legacyVersion = String(existingLatestJson?.version || "").trim();
    if (legacyContent && legacyVersion) {
      entries.push({
        releaseTag: legacyVersion,
        appVersion: String(existingLatestJson?.appVersion || "").trim() || "",
        publishedAt: String(existingLatestJson?.publishedAt || "").trim() || "",
        content: legacyContent,
      });
    }
  }
  return entries;
}

function buildLatestJson(version, appVersion, publicBaseUrl, prefix, notes, existingLatestJson) {
  const versionRoot = `${prefix}/${version}`;
  const publishedAt = new Date().toISOString();
  const content = notes || DEFAULT_RELEASE_NOTES;
  const currentEntry = {
    releaseTag: version,
    appVersion,
    publishedAt,
    content,
  };
  const existingEntries = normalizeHistoryEntries(existingLatestJson).filter((item) => item.releaseTag !== version);
  return {
    version,
    appVersion,
    name: version,
    publishedAt,
    zipUrl: `${publicBaseUrl}/${versionRoot}/AiOmniOps-local-single-user-win-x64.zip`,
    sha256Url: `${publicBaseUrl}/${versionRoot}/AiOmniOps-local-single-user-win-x64.zip.sha256`,
    checksumValue: hashFile(zipFilePath),
    source: "oss",
    notes: content,
    history: [currentEntry, ...existingEntries].slice(0, 20),
  };
}

async function uploadFile(client, objectKey, localFilePath, contentType, cacheControl) {
  const headers = {
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
  };
  const fileSize = fs.statSync(localFilePath).size;
  if (fileSize >= MULTIPART_UPLOAD_THRESHOLD_BYTES) {
    await client.multipartUpload(objectKey, localFilePath, {
      headers,
      timeout: OSS_TIMEOUT_MS,
      partSize: MULTIPART_UPLOAD_PART_SIZE_BYTES,
      parallel: 4,
    });
    return;
  }
  await client.put(objectKey, localFilePath, {
    headers,
    timeout: OSS_TIMEOUT_MS,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.version) {
    throw new Error("缺少 --version，例如：--version local-single-user-win-x64-2026-08-01-hotfix-1");
  }

  ensureFile(zipFilePath);
  ensureFile(checksumFilePath);

  const accessKeyId = readRequiredEnv("OSS_ACCESS_KEY_ID");
  const accessKeySecret = readRequiredEnv("OSS_ACCESS_KEY_SECRET");
  const bucket = readRequiredEnv("OSS_BUCKET");
  const region = readRequiredEnv("OSS_REGION");
  const publicBaseUrl = buildPublicBaseUrl(bucket, region, args.publicBaseUrl);
  const appVersion = readAppVersion();
  const existingLatestJson = await readExistingLatestJson(publicBaseUrl, args.prefix);
  const latestJson = buildLatestJson(args.version, appVersion, publicBaseUrl, args.prefix, args.notes, existingLatestJson);
  const versionRoot = `${args.prefix}/${args.version}`;

  const expectedSha256 = hashFile(zipFilePath);
  const checksumText = fs.readFileSync(checksumFilePath, "utf8").trim();
  if (!checksumText.startsWith(expectedSha256)) {
    throw new Error(`sha256 文件内容与 zip 实际摘要不一致：${expectedSha256}`);
  }

  fs.writeFileSync(latestJsonPath, `${JSON.stringify(latestJson, null, 2)}\n`, "utf8");

  console.log(`zip: ${zipFilePath}`);
  console.log(`sha256: ${expectedSha256}`);
  console.log(`latest.json: ${latestJsonPath}`);
  console.log(`bucket: ${bucket}`);
  console.log(`prefix: ${args.prefix}`);
  console.log(`version: ${args.version}`);

  if (args.dryRun) {
    console.log("[dry-run] skip OSS upload");
    return;
  }

  const client = new OSS({
    region,
    bucket,
    accessKeyId,
    accessKeySecret,
    internal: false,
    secure: true,
    timeout: OSS_TIMEOUT_MS,
  });

  await uploadFile(
    client,
    `${versionRoot}/AiOmniOps-local-single-user-win-x64.zip`,
    zipFilePath,
    "application/zip",
    "public, max-age=31536000, immutable",
  );
  await uploadFile(
    client,
    `${versionRoot}/AiOmniOps-local-single-user-win-x64.zip.sha256`,
    checksumFilePath,
    "text/plain; charset=utf-8",
    "public, max-age=31536000, immutable",
  );
  await uploadFile(
    client,
    `${args.prefix}/latest.json`,
    latestJsonPath,
    "application/json; charset=utf-8",
    "no-store",
  );

  console.log(`zipUrl=${latestJson.zipUrl}`);
  console.log(`sha256Url=${latestJson.sha256Url}`);
  console.log(`latestUrl=${publicBaseUrl}/${args.prefix}/latest.json`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});

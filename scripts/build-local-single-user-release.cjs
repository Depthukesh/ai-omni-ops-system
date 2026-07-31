const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { generateLocalSchema } = require("./generate-local-prisma-schema.cjs");

const projectRoot = fs.realpathSync.native(path.resolve(__dirname, ".."));
const releaseRoot = path.join(projectRoot, ".release", "local-single-user-win-x64");
const releaseAppRoot = path.join(releaseRoot, "app");
const releaseBinRoot = path.join(releaseRoot, "bin");
const releaseMetaRoot = path.join(releaseRoot, "meta");

const forwardedArgs = new Set(process.argv.slice(2).map((value) => String(value || "").trim().toLowerCase()));
const dryRun = forwardedArgs.has("--dry-run");

function ensureExists(targetPath) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`缺少发布物必需路径：${targetPath}`);
  }
}

function exists(targetPath) {
  return fs.existsSync(targetPath);
}

function listRelativePaths(targetPath) {
  const normalized = targetPath.replace(/\//g, "\\");
  return normalized;
}

function removePath(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function copyPath(sourcePath, destinationPath) {
  const stats = fs.statSync(sourcePath);
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  if (stats.isDirectory()) {
    copyDirectory(sourcePath, destinationPath);
    return;
  }
  if (/\.ps1$/i.test(sourcePath)) {
    writeUtf8BomFile(destinationPath, fs.readFileSync(sourcePath, "utf8"));
    return;
  }
  fs.copyFileSync(sourcePath, destinationPath);
}

function copyDirectory(sourcePath, destinationPath) {
  fs.mkdirSync(destinationPath, { recursive: true });
  const result = spawnSync(
    "robocopy",
    [
      sourcePath,
      destinationPath,
      "/E",
      "/R:2",
      "/W:1",
      "/NFL",
      "/NDL",
      "/NJH",
      "/NJS",
      "/NP",
    ],
    {
      cwd: projectRoot,
      encoding: "utf8",
      windowsHide: true,
    },
  );

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (output) {
    console.log(output);
  }

  if (typeof result.status !== "number" || result.status >= 8) {
    throw new Error(`目录复制失败：${sourcePath} -> ${destinationPath}${output ? `\n${output}` : ""}`);
  }
}

function hashFile(filePath) {
  return crypto.createHash("sha1").update(fs.readFileSync(filePath)).digest("hex");
}

function writeTextFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function writeUtf8BomFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const normalizedContent = content.startsWith("\uFEFF") ? content.slice(1) : content;
  fs.writeFileSync(filePath, `\uFEFF${normalizedContent}`, "utf8");
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function updateHashWithPathEntry(hash, rootBase, targetPath) {
  if (!fs.existsSync(targetPath)) {
    hash.update(`missing:${targetPath}\n`);
    return;
  }
  const stats = fs.statSync(targetPath);
  const relativePath = path.relative(rootBase, targetPath).replace(/\\/g, "/");
  if (stats.isDirectory()) {
    hash.update(`dir:${relativePath}\n`);
    const entries = fs.readdirSync(targetPath, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      updateHashWithPathEntry(hash, rootBase, path.join(targetPath, entry.name));
    }
    return;
  }
  const fileHash = crypto.createHash("sha1").update(fs.readFileSync(targetPath)).digest("hex");
  hash.update(`file:${relativePath}:${stats.size}:${fileHash}\n`);
}

function getServerBuildFingerprint(rootBase) {
  const hash = crypto.createHash("sha1");
  const serverRoot = path.join(rootBase, "apps", "server");
  const fingerprintTargets = [
    path.join(rootBase, "package.json"),
    path.join(rootBase, "package-lock.json"),
    path.join(rootBase, "tsconfig.base.json"),
    path.join(serverRoot, "package.json"),
    path.join(serverRoot, "tsconfig.json"),
    path.join(serverRoot, "src"),
    path.join(rootBase, "packages"),
  ];
  for (const target of fingerprintTargets) {
    updateHashWithPathEntry(hash, rootBase, target);
  }
  return hash.digest("hex");
}

function getWebBuildFingerprint(rootBase) {
  const hash = crypto.createHash("sha1");
  const webRoot = path.join(rootBase, "apps", "web");
  const fingerprintTargets = [
    path.join(rootBase, "package.json"),
    path.join(rootBase, "package-lock.json"),
    path.join(webRoot, "package.json"),
    path.join(webRoot, "tsconfig.json"),
    path.join(webRoot, "next.config.ts"),
    path.join(webRoot, "src"),
    path.join(webRoot, "public"),
    path.join(rootBase, "packages"),
  ];
  for (const target of fingerprintTargets) {
    updateHashWithPathEntry(hash, rootBase, target);
  }
  return hash.digest("hex");
}

function writeLauncherBuildState(rootBase) {
  const builtAt = new Date().toISOString();
  writeJsonFile(
    path.join(rootBase, "apps", "server", "dist", "local-launcher-server-build-state.json"),
    {
      fingerprint: getServerBuildFingerprint(rootBase),
      builtAt,
    },
  );
  writeJsonFile(
    path.join(rootBase, "apps", "web", ".next", "local-launcher-web-build-state.json"),
    {
      fingerprint: getWebBuildFingerprint(rootBase),
      builtAt,
    },
  );
}

function resolveBundledNpmRoot(nodeExecutablePath) {
  const candidates = [
    path.join(path.dirname(nodeExecutablePath), "node_modules", "npm"),
    path.join(path.dirname(path.dirname(nodeExecutablePath)), "node_modules", "npm"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "bin", "npm-cli.js"))) {
      return candidate;
    }
  }
  throw new Error(`未找到可随包分发的 npm 目录：${nodeExecutablePath}`);
}

function buildLauncherCmd() {
  return [
    "@echo off",
    "setlocal",
    'set "SCRIPT_DIR=%~dp0"',
    'set "APP_DIR=%SCRIPT_DIR%app"',
    'set "NODE_EXE=%SCRIPT_DIR%bin\\node.exe"',
    'if not exist "%NODE_EXE%" set "NODE_EXE=node"',
    'set "LOCAL_SINGLE_USER_PREBUILT_ONLY=true"',
    'if not defined LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER set "LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER=true"',
    'pushd "%APP_DIR%"',
    '"%NODE_EXE%" "scripts\\local-single-user-launcher.cjs"',
    "set EXIT_CODE=%ERRORLEVEL%",
    "popd",
    "exit /b %EXIT_CODE%",
    "",
  ].join("\r\n");
}

function buildAutostartInstallCmd() {
  return [
    "@echo off",
    "setlocal",
    'set "SCRIPT_DIR=%~dp0"',
    'set "APP_DIR=%SCRIPT_DIR%app"',
    'set "NODE_EXE=%SCRIPT_DIR%bin\\node.exe"',
    'if not exist "%NODE_EXE%" set "NODE_EXE=node"',
    'pushd "%APP_DIR%"',
    '"%NODE_EXE%" "scripts\\local-single-user-autostart.cjs" install',
    "set EXIT_CODE=%ERRORLEVEL%",
    "popd",
    "exit /b %EXIT_CODE%",
    "",
  ].join("\r\n");
}

function buildAutostartRemoveCmd() {
  return [
    "@echo off",
    "setlocal",
    'set "SCRIPT_DIR=%~dp0"',
    'set "APP_DIR=%SCRIPT_DIR%app"',
    'set "NODE_EXE=%SCRIPT_DIR%bin\\node.exe"',
    'if not exist "%NODE_EXE%" set "NODE_EXE=node"',
    'pushd "%APP_DIR%"',
    '"%NODE_EXE%" "scripts\\local-single-user-autostart.cjs" remove',
    "set EXIT_CODE=%ERRORLEVEL%",
    "popd",
    "exit /b %EXIT_CODE%",
    "",
  ].join("\r\n");
}

function buildAutostartStatusCmd() {
  return [
    "@echo off",
    "setlocal",
    'set "SCRIPT_DIR=%~dp0"',
    'set "APP_DIR=%SCRIPT_DIR%app"',
    'set "NODE_EXE=%SCRIPT_DIR%bin\\node.exe"',
    'if not exist "%NODE_EXE%" set "NODE_EXE=node"',
    'pushd "%APP_DIR%"',
    '"%NODE_EXE%" "scripts\\local-single-user-autostart.cjs" status',
    "set EXIT_CODE=%ERRORLEVEL%",
    "popd",
    "exit /b %EXIT_CODE%",
    "",
  ].join("\r\n");
}

function buildInstallPowerShellScript() {
  return [
    'param(',
    '  [string]$InstallRoot = $(Join-Path $env:LOCALAPPDATA "Programs\\AiOmniOps"),',
    '  [switch]$NoDesktopShortcut',
    ')',
    "",
    '$ErrorActionPreference = "Stop"',
    "",
    '$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path',
    '$releaseName = Split-Path -Leaf $sourceRoot',
    '$backupRoot = Join-Path (Split-Path -Parent $InstallRoot) ("AiOmniOps-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))',
    "",
    'Write-Host "Installing $releaseName to $InstallRoot"',
    "",
    'if (Test-Path $InstallRoot) {',
    '  Write-Host "Existing install detected; moving to backup: $backupRoot"',
    '  Move-Item -LiteralPath $InstallRoot -Destination $backupRoot',
    '}',
    "",
    'New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null',
    "",
    "$copyTargets = @(",
    '  "app",',
    '  "bin",',
    '  "meta",',
    '  "README.txt",',
    '  "start-local-single-user.cmd",',
    '  "install-autostart.cmd",',
    '  "remove-autostart.cmd",',
    '  "status-autostart.cmd"',
    ")",
    "",
    "foreach ($name in $copyTargets) {",
    "  $sourcePath = Join-Path $sourceRoot $name",
    "  if (-not (Test-Path $sourcePath)) {",
    '    throw "Missing release payload entry: $sourcePath"',
    "  }",
    "  Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $InstallRoot $name) -Recurse -Force",
    "}",
    "",
    '$autostartInstaller = Join-Path $InstallRoot "install-autostart.cmd"',
    'if (-not (Test-Path $autostartInstaller)) {',
    '  throw "Missing autostart installer: $autostartInstaller"',
    '}',
    'Write-Host "Configuring autostart for current user..."',
    '& $autostartInstaller',
    'if ($LASTEXITCODE -ne 0) {',
    '  throw "Autostart install failed with exit code $LASTEXITCODE"',
    '}',
    "",
    "if (-not $NoDesktopShortcut) {",
    '  $desktopPath = [Environment]::GetFolderPath("Desktop")',
    '  if ($desktopPath) {',
    '    $shortcutPath = Join-Path $desktopPath "AiOmniOps Local Workspace.lnk"',
    '    $shell = New-Object -ComObject WScript.Shell',
    '    $shortcut = $shell.CreateShortcut($shortcutPath)',
    '    $shortcut.TargetPath = Join-Path $InstallRoot "start-local-single-user.cmd"',
    '    $shortcut.WorkingDirectory = $InstallRoot',
    '    $shortcut.Description = "Start AiOmniOps local-single-user workspace"',
    '    $shortcut.Save()',
    "  }",
    "}",
    "",
    'Write-Host "Install completed."',
    'Write-Host ("Launch: " + (Join-Path $InstallRoot "start-local-single-user.cmd"))',
    'Write-Host ("Autostart status: " + (Join-Path $InstallRoot "status-autostart.cmd"))',
    'Write-Host ("Autostart remove: " + (Join-Path $InstallRoot "remove-autostart.cmd"))',
    "",
  ].join("\r\n");
}

function buildInstallCmd() {
  return [
    "@echo off",
    "setlocal",
    'set "SCRIPT_DIR=%~dp0"',
    'powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install-local-single-user.ps1"',
    "set EXIT_CODE=%ERRORLEVEL%",
    "exit /b %EXIT_CODE%",
    "",
  ].join("\r\n");
}

function buildReadme(releaseManifest) {
  return [
    "# AiOmniOps local-single-user 发布物",
    "",
    "## 1. 目录说明",
    "",
    "- `app/`：应用运行目录，包含 launcher、server dist、web standalone、node_modules 与 Prisma schema",
    "- `bin/node.exe`：随包 Node 运行时",
    "- `start-local-single-user.cmd`：本地单机版启动入口",
    "- `install-local-single-user.cmd`：将当前发布目录安装到 `%LOCALAPPDATA%\\Programs\\AiOmniOps`",
    "- `install-autostart.cmd` / `remove-autostart.cmd` / `status-autostart.cmd`：Windows 自启动辅助入口",
    "- `meta/release-manifest.json`：本次发布物清单与构建信息",
    "",
    "## 2. 启动方式",
    "",
    "1. 双击 `start-local-single-user.cmd`",
    "2. launcher 会在本机拉起 Web / API / worker",
    "3. 浏览器默认打开本机工作台地址",
    "",
    "## 3. 安装方式",
    "",
    "1. 双击 `install-local-single-user.cmd`",
    "2. 发布物会被复制到 `%LOCALAPPDATA%\\Programs\\AiOmniOps`",
    "3. 安装过程会默认为当前用户配置开机自启",
    "4. 桌面会创建 `AiOmniOps 本地工作台` 快捷方式",
    "5. 如需查看或移除开机自启，可在安装目录里执行 `status-autostart.cmd` 或 `remove-autostart.cmd`",
    "",
    "## 4. 交付约束",
    "",
    "- 当前发布物默认针对 Windows 本机交付",
    "- `node.exe` 已随包携带，用户机器不再要求预装 Node",
    "- 启动链默认走预构建运行时模式，不再依赖源码兜底构建",
    "- 当前发布物目录由脚本自动生成，请勿手工改动 `app/` 内文件结构",
    "",
    "## 5. 本次发布摘要",
    "",
    `- 生成时间：${releaseManifest.generatedAt}`,
    `- Node 版本：${releaseManifest.node.version}`,
    `- 平台：${releaseManifest.platform} ${releaseManifest.arch}`,
    `- 关键入口：${releaseManifest.entrypoints.launcher}`,
    "",
  ].join("\r\n");
}

function pruneReleaseNodeModules() {
  const removableRelativePaths = [
    "node_modules\\.cache",
    "node_modules\\@esbuild",
    "node_modules\\@img",
    "node_modules\\@next",
    "node_modules\\@types",
    "node_modules\\caniuse-lite",
    "node_modules\\fast-check",
    "node_modules\\lucide-react",
    "node_modules\\lunar-javascript",
    "node_modules\\next",
    "node_modules\\qrcode",
    "node_modules\\react",
    "node_modules\\react-dom",
    "node_modules\\tsx",
    "node_modules\\typescript",
  ];
  for (const relativePath of removableRelativePaths) {
    const targetPath = path.join(releaseAppRoot, relativePath);
    if (!exists(targetPath)) {
      continue;
    }
    console.log(`[step] prune ${listRelativePaths(relativePath)}`);
    removePath(targetPath);
  }
}

function main() {
  generateLocalSchema();

  const requiredRelativePaths = [
    "package.json",
    "prisma\\schema.prisma",
    "prisma\\schema.local.prisma",
    "node_modules",
    "apps\\server\\dist",
    "apps\\web\\public",
    "apps\\web\\.next\\standalone",
    "apps\\web\\.next\\static",
    "scripts\\generate-local-prisma-schema.cjs",
    "scripts\\local-single-user-launcher.cjs",
    "scripts\\local-single-user-runtime.cjs",
    "scripts\\local-single-user-prisma.cjs",
    "scripts\\local-single-user-autostart.cjs",
    "scripts\\local-single-user-autostart.ps1",
    "scripts\\local-single-user-updater.ps1",
  ];
  const optionalRelativePaths = [
    "apps\\web\\.next\\local-launcher-web-build-state.json",
  ];

  const copyOperations = requiredRelativePaths.map((relativePath) => {
    const sourcePath = path.join(projectRoot, relativePath);
    ensureExists(sourcePath);
    return {
      relativePath,
      sourcePath,
      destinationPath: path.join(releaseAppRoot, relativePath),
    };
  });
  const optionalCopyOperations = optionalRelativePaths
    .map((relativePath) => {
      const sourcePath = path.join(projectRoot, relativePath);
      if (!exists(sourcePath)) {
        return null;
      }
      return {
        relativePath,
        sourcePath,
        destinationPath: path.join(releaseAppRoot, relativePath),
      };
    })
    .filter(Boolean);
  const allCopyOperations = copyOperations.concat(optionalCopyOperations);

  const nodeExecutablePath = process.execPath;
  ensureExists(nodeExecutablePath);
  const bundledNpmRoot = resolveBundledNpmRoot(nodeExecutablePath);

  if (dryRun) {
    console.log("[dry-run] local-single-user release bundle plan");
    console.log(`release root: ${releaseRoot}`);
    for (const operation of allCopyOperations) {
      console.log(`- ${listRelativePaths(operation.relativePath)}`);
    }
    console.log(`- bin\\node.exe <= ${nodeExecutablePath}`);
    console.log(`- bin\\node_modules\\npm <= ${bundledNpmRoot}`);
    return;
  }

  removePath(releaseRoot);
  fs.mkdirSync(releaseAppRoot, { recursive: true });
  fs.mkdirSync(releaseBinRoot, { recursive: true });
  fs.mkdirSync(releaseMetaRoot, { recursive: true });

  allCopyOperations.forEach((operation, index) => {
    console.log(
      `[step ${index + 1}/${allCopyOperations.length}] copy ${listRelativePaths(operation.relativePath)}`,
    );
    copyPath(operation.sourcePath, operation.destinationPath);
  });
  pruneReleaseNodeModules();

  const bundledNodePath = path.join(releaseBinRoot, "node.exe");
  console.log("[step] copy bundled node.exe");
  copyPath(nodeExecutablePath, bundledNodePath);
  const bundledReleaseNpmRoot = path.join(releaseBinRoot, "node_modules", "npm");
  console.log("[step] copy bundled npm");
  copyPath(bundledNpmRoot, bundledReleaseNpmRoot);
  console.log("[step] write launcher build state");
  writeLauncherBuildState(releaseAppRoot);

  const releaseManifest = {
    name: "local-single-user-win-x64",
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    node: {
      executable: nodeExecutablePath,
      version: process.version,
      sha1: hashFile(nodeExecutablePath),
    },
    npm: {
      sourceRoot: bundledNpmRoot,
      bundledCli: path.join("bin", "node_modules", "npm", "bin", "npm-cli.js"),
    },
    entrypoints: {
      launcher: "start-local-single-user.cmd",
      installer: "install-local-single-user.cmd",
      autostartInstall: "install-autostart.cmd",
      autostartRemove: "remove-autostart.cmd",
      autostartStatus: "status-autostart.cmd",
    },
    runtimeMode: "prebuilt-only",
    copiedPaths: allCopyOperations.map((operation) => operation.relativePath),
  };

  writeTextFile(path.join(releaseRoot, "start-local-single-user.cmd"), buildLauncherCmd());
  writeUtf8BomFile(path.join(releaseRoot, "install-local-single-user.ps1"), buildInstallPowerShellScript());
  writeTextFile(path.join(releaseRoot, "install-local-single-user.cmd"), buildInstallCmd());
  writeTextFile(path.join(releaseRoot, "install-autostart.cmd"), buildAutostartInstallCmd());
  writeTextFile(path.join(releaseRoot, "remove-autostart.cmd"), buildAutostartRemoveCmd());
  writeTextFile(path.join(releaseRoot, "status-autostart.cmd"), buildAutostartStatusCmd());
  writeTextFile(path.join(releaseRoot, "README.txt"), buildReadme(releaseManifest));
  writeTextFile(path.join(releaseMetaRoot, "release-manifest.json"), `${JSON.stringify(releaseManifest, null, 2)}\n`);

  console.log(`local-single-user 发布物已生成：${releaseRoot}`);
  console.log(`启动入口：${path.join(releaseRoot, "start-local-single-user.cmd")}`);
  console.log(`Manifest：${path.join(releaseMetaRoot, "release-manifest.json")}`);
}

main();

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
const skipPrebuild = forwardedArgs.has("--skip-prebuild");
const releaseTag = String(process.env.LOCAL_SINGLE_USER_RELEASE_TAG || "").trim();
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const releaseAppVersion = String(process.env.LOCAL_SINGLE_USER_APP_VERSION || packageJson.version || "").trim() || "0.1.0";

if (!dryRun) {
  if (!releaseTag) {
    throw new Error("缺少 LOCAL_SINGLE_USER_RELEASE_TAG，禁止在没有 releaseTag 的前提下生成正式发布物。请通过 package-local-single-user-release.cjs 发起打包。");
  }
  if (!process.env.LOCAL_SINGLE_USER_APP_VERSION) {
    throw new Error("缺少 LOCAL_SINGLE_USER_APP_VERSION，禁止在没有 appVersion 的前提下生成正式发布物。请通过 package-local-single-user-release.cjs 发起打包。");
  }
}

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
  const normalizedContent = content.replace(/^\uFEFF+/, "");
  fs.writeFileSync(filePath, `\uFEFF${normalizedContent}`, "utf8");
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function resolveHostNpmCliPath() {
  const explicit = String(process.env.npm_execpath || "").trim();
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  const candidates = [
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(path.dirname(path.dirname(process.execPath)), "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`未找到当前环境可用的 npm-cli.js：${process.execPath}`);
}

function runCommand(command, args, label, envOverrides = null) {
  console.log(`[step] ${label}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
    env: envOverrides
      ? {
          ...process.env,
          ...envOverrides,
        }
      : process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} 失败，退出码：${result.status || 1}`);
  }
  console.log(`[done] ${label}`);
}

function runReleaseValidation(extraArgs = []) {
  const validateScriptPath = path.join(projectRoot, "scripts", "validate-local-single-user-release.cjs");
  const result = spawnSync(process.execPath, [validateScriptPath, ...extraArgs], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`发布物校验失败，退出码：${result.status || 1}`);
  }
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
    'set "NODE_SOURCE=bundled"',
    'if not exist "%NODE_EXE%" (',
    '  set "NODE_EXE=node"',
    '  set "NODE_SOURCE=path"',
    ")",
    'set "LOG_DIR=%APPDATA%\\AiOmniOps\\logs"',
    'if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1',
    'set "START_LOG=%LOG_DIR%\\start-local-single-user.log"',
    'set "SESSION_LOG=%LOG_DIR%\\start-local-single-user-session-%RANDOM%%RANDOM%.log"',
    'echo ==== [%date% %time%] start-local-single-user.cmd ==== >> "%START_LOG%"',
    'echo SCRIPT_DIR=%SCRIPT_DIR% >> "%START_LOG%"',
    'echo APP_DIR=%APP_DIR% >> "%START_LOG%"',
    'echo NODE_SOURCE=%NODE_SOURCE% >> "%START_LOG%"',
    'echo NODE_EXE=%NODE_EXE% >> "%START_LOG%"',
    'echo APPDATA=%APPDATA% >> "%START_LOG%"',
    'echo SESSION_LOG=%SESSION_LOG% >> "%START_LOG%"',
    'if not exist "%APP_DIR%\\scripts\\local-single-user-launcher.cjs" (',
    '  echo Missing launcher script: %APP_DIR%\\scripts\\local-single-user-launcher.cjs >> "%START_LOG%"',
    "  exit /b 1",
    ")",
    'set "LOCAL_SINGLE_USER_PREBUILT_ONLY=true"',
    'if not defined LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER set "LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER=true"',
    'pushd "%APP_DIR%" >> "%SESSION_LOG%" 2>&1',
    "if errorlevel 1 (",
    '  echo Failed to enter APP_DIR >> "%START_LOG%"',
    "  exit /b 1",
    ")",
    '"%NODE_EXE%" "scripts\\local-single-user-launcher.cjs" >> "%SESSION_LOG%" 2>&1',
    "set EXIT_CODE=%ERRORLEVEL%",
    'echo EXIT_CODE=%EXIT_CODE% >> "%START_LOG%"',
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
    'if not exist "%NODE_EXE%" (',
    '  echo Missing bundled node.exe: %NODE_EXE%',
    "  exit /b 1",
    ")",
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
    'if not exist "%NODE_EXE%" (',
    '  echo Missing bundled node.exe: %NODE_EXE%',
    "  exit /b 1",
    ")",
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
    'if not exist "%NODE_EXE%" (',
    '  echo Missing bundled node.exe: %NODE_EXE%',
    "  exit /b 1",
    ")",
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
    '  [switch]$NoDesktopShortcut,',
    '  [switch]$NoLaunch',
    ')',
    "",
    '$ErrorActionPreference = "Stop"',
    "",
    '$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path',
    '$releaseName = Split-Path -Leaf $sourceRoot',
    '$backupRoot = Join-Path (Split-Path -Parent $InstallRoot) ("AiOmniOps-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))',
    '$runtimeMetadataPath = Join-Path (Join-Path $env:APPDATA "AiOmniOps") "runtime\\local-single-user-runtime.json"',
    '$cmdExe = if ($env:SystemRoot) { Join-Path $env:SystemRoot "System32\\cmd.exe" } else { "cmd.exe" }',
    '$debugEnvPath = Join-Path (Split-Path -Parent (Split-Path -Parent $sourceRoot)) ".dbg\\install-backup-lock.env"',
    "",
    "function Resolve-InitialBrowserUrl {",
    "  param(",
    "    [string]$RuntimeMetadataFile,",
    '    [string]$FallbackBrowserUrl = "http://127.0.0.1:3001"',
    "  )",
    "",
    "  if (-not (Test-Path $RuntimeMetadataFile)) {",
    "    return $FallbackBrowserUrl",
    "  }",
    "",
    "  try {",
    "    $raw = [System.IO.File]::ReadAllText($RuntimeMetadataFile)",
    '    if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 65279) { $raw = $raw.Substring(1) }',
    "    if (-not $raw.Trim()) {",
    "      return $FallbackBrowserUrl",
    "    }",
    "    $metadata = $raw | ConvertFrom-Json",
    "    if ([string]$metadata.browserUrl) {",
    "      return [string]$metadata.browserUrl",
    "    }",
    "    if ([string]$metadata.previewUrl) {",
    "      return ([Uri][string]$metadata.previewUrl).GetLeftPart([System.UriPartial]::Authority)",
    "    }",
    "  } catch {}",
    "",
    "  return $FallbackBrowserUrl",
    "}",
    "",
    '$defaultBrowserUrl = Resolve-InitialBrowserUrl -RuntimeMetadataFile $runtimeMetadataPath',
    "",
    "function Send-InstallDebugEvent {",
    "  param(",
    "    [string]$HypothesisId,",
    "    [string]$Location,",
    "    [string]$Message,",
    "    [hashtable]$Data = @{}",
    "  )",
    "",
    '  $debugServerUrl = "http://127.0.0.1:7777/event"',
    '  $debugSessionId = "install-backup-lock"',
    "",
    "  try {",
    "    if (Test-Path $debugEnvPath) {",
    "      $envLines = Get-Content -Path $debugEnvPath -ErrorAction Stop",
    "      foreach ($line in $envLines) {",
    '        if ($line -like "DEBUG_SERVER_URL=*") {',
    '          $debugServerUrl = $line.Substring("DEBUG_SERVER_URL=".Length).Trim()',
    "          continue",
    "        }",
    '        if ($line -like "DEBUG_SESSION_ID=*") {',
    '          $debugSessionId = $line.Substring("DEBUG_SESSION_ID=".Length).Trim()',
    "        }",
    "      }",
    "    }",
    "  } catch {",
    "    # Ignore debug env read failures.",
    "  }",
    "",
    "  try {",
    '    Invoke-WebRequest -UseBasicParsing -Uri $debugServerUrl -Method Post -ContentType "application/json" -Body (@{',
    "        sessionId = $debugSessionId",
    '        runId = "pre-fix"',
    "        hypothesisId = $HypothesisId",
    "        location = $Location",
    "        msg = $Message",
    "        data = $Data",
    "        ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()",
    "      } | ConvertTo-Json -Compress) | Out-Null",
    "  } catch {",
    "    # Ignore debug upload failures.",
    "  }",
    "}",
    "",
    "# #region debug-point B:install-ps1-entry",
    'Send-InstallDebugEvent -HypothesisId "B" -Location "install-local-single-user.ps1:entry" -Message "[DEBUG] install powershell script entered" -Data @{ installRoot = $InstallRoot; sourceRoot = $sourceRoot; cmdExe = $cmdExe; runtimeMetadataPath = $runtimeMetadataPath }',
    "# #endregion",
    "",
    "function Stop-ExistingInstallProcesses {",
    "  param(",
    "    [string]$TargetInstallRoot,",
    "    [string]$RuntimeMetadataFile",
    "  )",
    "",
    "  $pids = New-Object System.Collections.Generic.List[int]",
    "",
    "  if (Test-Path -LiteralPath $RuntimeMetadataFile) {",
    "    try {",
    "      $metadata = Get-Content -LiteralPath $RuntimeMetadataFile -Raw | ConvertFrom-Json",
    "      if ($metadata -and $metadata.processes) {",
    "        foreach ($processId in @($metadata.processes.launcherPid, $metadata.processes.serverPid, $metadata.processes.workerPid, $metadata.processes.webPid)) {",
    "          if ($processId -as [int]) { $pids.Add([int]$processId) }",
    "        }",
    '        # #region debug-point A:runtime-metadata-pids',
    '        Send-InstallDebugEvent -HypothesisId "A" -Location "install-local-single-user.ps1:stop-read-metadata" -Message "[DEBUG] runtime metadata pids loaded" -Data @{ launcherPid = $metadata.processes.launcherPid; serverPid = $metadata.processes.serverPid; workerPid = $metadata.processes.workerPid; webPid = $metadata.processes.webPid }',
    '        # #endregion',
    "      }",
    "    } catch {",
    "      Write-Host \"Skipping runtime metadata stop; metadata unreadable.\"",
    "    }",
    "  }",
    "",
    "  $normalizedInstallRoot = [string]$TargetInstallRoot",
    '  $startCommandPath = Join-Path $normalizedInstallRoot "start-local-single-user.cmd"',
    "  $installProcesses = @()",
    "  try {",
    "    $installProcesses = @(Get-CimInstance Win32_Process -ErrorAction Stop)",
    "    foreach ($processInfo in $installProcesses) {",
    "      $processId = 0",
    "      try { $processId = [int]$processInfo.ProcessId } catch { $processId = 0 }",
    "      if ($processId -le 0 -or $processId -eq $PID) {",
    "        continue",
    "      }",
    "      $commandLine = [string]$processInfo.CommandLine",
    "      $executablePath = [string]$processInfo.ExecutablePath",
      "      $processName = [string]$processInfo.Name",
    "      $matchesInstallRoot = $false",
    "      if ($commandLine -and $commandLine.IndexOf($normalizedInstallRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {",
    "        $matchesInstallRoot = $true",
    "      } elseif ($executablePath -and $executablePath.IndexOf($normalizedInstallRoot, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {",
    "        $matchesInstallRoot = $true",
      '      } elseif ($commandLine -and $commandLine.IndexOf($startCommandPath, [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {',
      "        $matchesInstallRoot = $true",
      '      } elseif ($processName -ieq "cmd.exe" -and $commandLine -and $commandLine.IndexOf("start-local-single-user.cmd", [System.StringComparison]::OrdinalIgnoreCase) -ge 0) {',
      "        $matchesInstallRoot = $true",
    "      }",
    "      if ($matchesInstallRoot) {",
    "        $pids.Add($processId)",
    "      }",
    "    }",
    "  } catch {",
    "    Write-Host \"Skipping Win32 process scan for install root; process query failed.\"",
    "  }",
    "",
    "  if ($installProcesses.Count) {",
    "    $processMap = @{}",
    "    foreach ($processInfo in $installProcesses) {",
    "      $mappedPid = 0",
    "      try { $mappedPid = [int]$processInfo.ProcessId } catch { $mappedPid = 0 }",
    "      if ($mappedPid -gt 0) {",
    "        $processMap[$mappedPid] = $processInfo",
    "      }",
    "    }",
    "    foreach ($seedPid in @($pids | Where-Object { $_ -gt 0 } | Sort-Object -Unique)) {",
    "      $cursorPid = [int]$seedPid",
    "      for ($depth = 0; $depth -lt 4; $depth += 1) {",
    "        if (-not $processMap.ContainsKey($cursorPid)) {",
    "          break",
    "        }",
    "        $parentPid = 0",
    "        try { $parentPid = [int]$processMap[$cursorPid].ParentProcessId } catch { $parentPid = 0 }",
    "        if ($parentPid -le 0 -or $parentPid -eq $PID) {",
    "          break",
    "        }",
    "        $pids.Add($parentPid)",
    "        $cursorPid = $parentPid",
    "      }",
    "    }",
    "  }",
    "",
    "  $uniquePids = $pids | Where-Object { $_ -gt 0 } | Sort-Object -Unique",
    '  # #region debug-point A:stop-pid-candidates',
    '  Send-InstallDebugEvent -HypothesisId "A" -Location "install-local-single-user.ps1:stop-pid-candidates" -Message "[DEBUG] stop candidate pids resolved" -Data @{ pids = @($uniquePids) }',
    '  # #endregion',
    "  if (-not $uniquePids) {",
    "    Write-Host \"No runtime metadata PIDs found; proceeding without explicit task kill.\"",
    "    return",
    "  }",
    "",
    "  $remainingPids = @($uniquePids)",
    "  for ($attempt = 1; $attempt -le 3 -and $remainingPids.Count; $attempt += 1) {",
    "    Write-Host ((\"Stopping existing runtime PIDs (attempt #{0}): {1}\" -f $attempt, (($remainingPids | ForEach-Object { [string]$_ }) -join ', ')))",
    '    # #region debug-point A:stop-attempt-start',
    '    Send-InstallDebugEvent -HypothesisId "A" -Location "install-local-single-user.ps1:stop-attempt-start" -Message "[DEBUG] stop attempt started" -Data @{ attempt = $attempt; remainingPids = @($remainingPids) }',
    '    # #endregion',
    "    foreach ($processId in $remainingPids) {",
    "      try {",
    "        & $cmdExe /d /c \"taskkill /PID $processId /T /F >nul 2>&1\" | Out-Null",
    '        # #region debug-point A:taskkill-result',
    '        Send-InstallDebugEvent -HypothesisId "A" -Location "install-local-single-user.ps1:taskkill-result" -Message "[DEBUG] taskkill completed" -Data @{ attempt = $attempt; pid = $processId; lastExitCode = $LASTEXITCODE }',
    '        # #endregion',
    "      } catch {}",
    "      try { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue } catch {}",
    "      try { Wait-Process -Id $processId -Timeout 2 -ErrorAction SilentlyContinue } catch {}",
    "    }",
    "    Start-Sleep -Milliseconds (1200 * $attempt)",
    "    $stillAlive = @()",
    "    foreach ($processId in $uniquePids) {",
    "      try {",
    "        $null = Get-Process -Id $processId -ErrorAction Stop",
    "        $stillAlive += $processId",
    "      } catch {}",
    "    }",
    "    $remainingPids = @($stillAlive | Sort-Object -Unique)",
    "    if ($remainingPids.Count) {",
    "      Write-Host ((\"Runtime PIDs still alive after stop attempt #{0}: {1}\" -f $attempt, (($remainingPids | ForEach-Object { [string]$_ }) -join ', ')))",
    '      # #region debug-point B:still-alive-details',
    '      $aliveDetails = @()',
    '      foreach ($alivePid in $remainingPids) {',
    '        $aliveProcess = $null',
    '        try { $aliveProcess = Get-CimInstance Win32_Process -Filter ("ProcessId=" + [string]$alivePid) -ErrorAction Stop } catch {}',
    '        if ($aliveProcess) {',
    '          $aliveDetails += @{ pid = $alivePid; parentPid = $aliveProcess.ParentProcessId; name = $aliveProcess.Name; executablePath = $aliveProcess.ExecutablePath; commandLine = $aliveProcess.CommandLine }',
    '        } else {',
    '          $aliveDetails += @{ pid = $alivePid; state = "unresolved" }',
    '        }',
    '      }',
    '      Send-InstallDebugEvent -HypothesisId "B" -Location "install-local-single-user.ps1:still-alive-details" -Message "[DEBUG] runtime pids still alive after stop attempt" -Data @{ attempt = $attempt; aliveDetails = $aliveDetails }',
    '      # #endregion',
    "    }",
    "  }",
    "}",
    "",
    "function Move-ExistingInstallToBackup {",
    "  param(",
    "    [string]$TargetInstallRoot,",
    "    [string]$BackupRoot",
    "  )",
    "",
    "  $lastErrorMessage = $null",
    "  for ($attempt = 1; $attempt -le 3; $attempt += 1) {",
    "    $movedEntries = @()",
    "    $currentEntryName = $null",
    "    try {",
    "      if (Test-Path -LiteralPath $BackupRoot) {",
    "        Remove-Item -LiteralPath $BackupRoot -Recurse -Force -ErrorAction SilentlyContinue",
    "      }",
    "      New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null",
    "      $entries = @(Get-ChildItem -LiteralPath $TargetInstallRoot -Force)",
    "      foreach ($entry in $entries) {",
    "        $currentEntryName = $entry.Name",
    "        $destinationPath = Join-Path $BackupRoot $entry.Name",
    "        Move-Item -LiteralPath $entry.FullName -Destination $destinationPath -ErrorAction Stop",
    "        $movedEntries += $entry.Name",
    "      }",
    "      return",
    "    } catch {",
    "      $lastErrorMessage = $_.Exception.Message",
    '      # #region debug-point D:move-failure',
    '      Send-InstallDebugEvent -HypothesisId "D" -Location "install-local-single-user.ps1:move-failure" -Message "[DEBUG] move existing install attempt failed" -Data @{ attempt = $attempt; currentEntryName = $currentEntryName; movedEntries = @($movedEntries); backupRoot = $BackupRoot; installRoot = $TargetInstallRoot; error = $lastErrorMessage }',
    '      # #endregion',
    "      $rollbackEntries = @($movedEntries)",
    "      [array]::Reverse($rollbackEntries)",
    "      foreach ($entryName in $rollbackEntries) {",
    "        $movedPath = Join-Path $BackupRoot $entryName",
    "        $restorePath = Join-Path $TargetInstallRoot $entryName",
    "        if (-not (Test-Path -LiteralPath $movedPath)) {",
    "          continue",
    "        }",
    "        try {",
    "          Move-Item -LiteralPath $movedPath -Destination $restorePath -ErrorAction Stop",
    "        } catch {}",
    "      }",
    "      try {",
    "        if (Test-Path -LiteralPath $BackupRoot) {",
    "          $remainingEntries = @(Get-ChildItem -LiteralPath $BackupRoot -Force -ErrorAction SilentlyContinue)",
    "          if (-not $remainingEntries.Count) {",
    "            Remove-Item -LiteralPath $BackupRoot -Force -ErrorAction SilentlyContinue",
    "          }",
    "        }",
    "      } catch {}",
    "      Write-Host ((\"Move existing install attempt #{0} failed: {1}\" -f $attempt, $lastErrorMessage))",
    "      Start-Sleep -Milliseconds (800 * $attempt)",
    "    }",
    "  }",
    "  throw (\"Failed to move existing install to backup. InstallRoot={0}; BackupRoot={1}; Error={2}\" -f $TargetInstallRoot, $BackupRoot, $lastErrorMessage)",
    "}",
    "",
    "function Resolve-EffectiveLocalAppRoot {",
    "  param([string]$TargetInstallRoot)",
    "",
    '  $nodeExe = Join-Path $TargetInstallRoot "bin\\node.exe"',
    '  if (-not (Test-Path $nodeExe)) { $nodeExe = "node" }',
    '  $settingsScript = Join-Path $TargetInstallRoot "app\\scripts\\local-single-user-launch-settings.cjs"',
    '  if (-not (Test-Path $settingsScript)) {',
    '    return Join-Path $env:APPDATA "AiOmniOps"',
    "  }",
    "  try {",
    '    $resolvedRoot = (& $nodeExe $settingsScript resolve-root 2>$null | Out-String).Trim()',
    '    if ($resolvedRoot) { return $resolvedRoot }',
    "  } catch {}",
    '  return Join-Path $env:APPDATA "AiOmniOps"',
    "}",
    "",
    "function Read-LifecycleState {",
    "  param([string]$LifecycleStatePath)",
    "",
    "  if (-not (Test-Path $LifecycleStatePath)) {",
    "    return $null",
    "  }",
    "",
    "  try {",
    "    $raw = [System.IO.File]::ReadAllText($LifecycleStatePath)",
    '    if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 65279) { $raw = $raw.Substring(1) }',
    "    if (-not $raw.Trim()) {",
    "      return $null",
    "    }",
    "    return $raw | ConvertFrom-Json",
    "  } catch {",
    "    return $null",
    "  }",
    "}",
    "",
    "function Write-InstallLifecycleState {",
    "  param(",
    "    [string]$LocalAppRoot,",
    "    [string]$Phase,",
    "    [string]$InstallPath,",
    "    [string]$RuntimeMetadataFile,",
    "    [string]$Message = \"\"",
    "  )",
    "",
    '  $lifecycleStatePath = Join-Path $LocalAppRoot "runtime\\local-single-user-lifecycle.json"',
    "  $lifecycleDirectory = Split-Path -Parent $lifecycleStatePath",
    "  New-Item -ItemType Directory -Path $lifecycleDirectory -Force | Out-Null",
    "  $payload = @{",
    "    updatedAt = (Get-Date).ToString('o')",
    "    phase = $Phase",
    "    source = 'installer'",
    "    installRoot = $InstallPath",
    "    localAppRoot = $LocalAppRoot",
    "    runtimeMetadataPath = $RuntimeMetadataFile",
    "    message = $Message",
    "  }",
    "  ($payload | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $lifecycleStatePath -Encoding UTF8",
    "  return $lifecycleStatePath",
    "}",
    "",
    "function Install-StartupFolderAutostartFallback {",
    "  param([string]$TargetInstallRoot)",
    "",
    '  $startupDir = Join-Path $env:APPDATA "Microsoft\\Windows\\Start Menu\\Programs\\Startup"',
    '  $powershellExe = if ($env:SystemRoot) { Join-Path $env:SystemRoot "System32\\WindowsPowerShell\\v1.0\\powershell.exe" } else { "powershell.exe" }',
    '  $helperPath = Join-Path $TargetInstallRoot "app\\scripts\\local-single-user-autostart.ps1"',
    '  if (-not (Test-Path $helperPath)) {',
    '    throw "Missing autostart helper: $helperPath"',
    "  }",
    '  New-Item -ItemType Directory -Path $startupDir -Force | Out-Null',
    '  $startupCmdPath = Join-Path $startupDir "AiOmniOps Local Single User.cmd"',
    '  $legacyShortcutPath = Join-Path $startupDir "AiOmniOps Local Single User.lnk"',
    '  Remove-Item -LiteralPath $startupCmdPath -Force -ErrorAction SilentlyContinue',
    '  Remove-Item -LiteralPath $legacyShortcutPath -Force -ErrorAction SilentlyContinue',
    '  $commandLines = @(',
    '    "@echo off",',
    '    ("@`"{0}`" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"{1}`"" -f $powershellExe, $helperPath),',
    '    ""',
    '  )',
    '  [System.IO.File]::WriteAllText($startupCmdPath, ($commandLines -join "`r`n"), (New-Object System.Text.UTF8Encoding($false)))',
    '  return $startupCmdPath',
    "}",
    "",
    "function Get-HttpStatusCode {",
    "  param([string]$Url)",
    "",
    "  try {",
    "    $request = [System.Net.HttpWebRequest]::Create($Url)",
    '    $request.Method = "GET"',
    "    $request.Timeout = 2000",
    "    $request.ReadWriteTimeout = 2000",
    "    $request.AllowAutoRedirect = $false",
    "    $response = $request.GetResponse()",
    "    try {",
    "      return [int]$response.StatusCode",
    "    } finally {",
    "      $response.Close()",
    "    }",
    "  } catch [System.Net.WebException] {",
    "    if ($_.Exception.Response) {",
    "      try { return [int]$_.Exception.Response.StatusCode } finally { $_.Exception.Response.Close() }",
    "    }",
    "    return 0",
    "  } catch {",
    "    return 0",
    "  }",
    "}",
    "",
    "function Wait-LocalWorkspaceReady {",
    "  param(",
    "    [string]$LocalAppRoot,",
    "    [int]$TimeoutSeconds = 240",
    "  )",
    "",
    '  $metadataPath = Join-Path $LocalAppRoot "runtime\\local-single-user-runtime.json"',
    '  $lifecycleStatePath = Join-Path $LocalAppRoot "runtime\\local-single-user-lifecycle.json"',
    '  $fallbackApiHealthUrl = "http://127.0.0.1:3011/api/health"',
    '  $fallbackPreviewUrl = ($defaultBrowserUrl.TrimEnd("/") + "/brand-growth")',
    "  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)",
    "  $lastApiStatus = 0",
    "  $lastWebStatus = 0",
    "  $metadataSeen = $false",
    "  $lifecycleSeen = $false",
    "  $lastLifecyclePhase = ''",
    "  $lastLifecycleError = ''",
    "  $lastApiHealthUrl = $fallbackApiHealthUrl",
    "  $lastPreviewUrl = $fallbackPreviewUrl",
    "  $lastBrowserUrl = $defaultBrowserUrl",
    "  while ((Get-Date) -lt $deadline) {",
    "    $browserUrl = $defaultBrowserUrl",
    "    $previewUrl = $fallbackPreviewUrl",
    "    $apiHealthUrl = $fallbackApiHealthUrl",
    "    $lifecycleState = Read-LifecycleState -LifecycleStatePath $lifecycleStatePath",
    "    if ($lifecycleState) {",
    "      $lifecycleSeen = $true",
    "      $lastLifecyclePhase = [string]$lifecycleState.phase",
    "      $lastLifecycleError = [string]$lifecycleState.error",
    "      if ([string]$lifecycleState.browserUrl) { $browserUrl = [string]$lifecycleState.browserUrl }",
    "      if ([string]$lifecycleState.previewUrl) { $previewUrl = [string]$lifecycleState.previewUrl }",
    "      if ([string]$lifecycleState.apiHealthUrl) { $apiHealthUrl = [string]$lifecycleState.apiHealthUrl }",
    "      if ($lastLifecyclePhase -eq 'FAILED') {",
    "        # #region debug-point C:lifecycle-failed",
    '        Send-InstallDebugEvent -HypothesisId "C" -Location "install-local-single-user.ps1:lifecycle-failed" -Message "[DEBUG] lifecycle entered failed state during install wait" -Data @{ localAppRoot = $LocalAppRoot; lifecycleStatePath = $lifecycleStatePath; lifecyclePhase = $lastLifecyclePhase; lifecycleError = $lastLifecycleError }',
    "        # #endregion",
    "        return @{",
    "          Ready = $false;",
    "          BrowserUrl = $browserUrl;",
    "          PreviewUrl = $previewUrl;",
    "          ApiHealthUrl = $apiHealthUrl;",
    "          RuntimeMetadataPath = $(if (Test-Path $metadataPath) { $metadataPath } else { $null });",
    "          LifecycleStatePath = $lifecycleStatePath;",
    "          LifecycleSeen = $lifecycleSeen;",
    "          LifecyclePhase = $lastLifecyclePhase;",
    "          LifecycleError = $lastLifecycleError;",
    "          MetadataSeen = $metadataSeen;",
    "          ApiStatus = $lastApiStatus;",
    "          WebStatus = $lastWebStatus",
    "        }",
    "      }",
    "    }",
    "    if (Test-Path $metadataPath) {",
    "      $metadataSeen = $true",
    "      try {",
    "        $raw = [System.IO.File]::ReadAllText($metadataPath)",
    '        if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 65279) { $raw = $raw.Substring(1) }',
    "        $metadata = $raw | ConvertFrom-Json",
    '        $apiHealthUrl = [string]($metadata.apiHealthUrl)',
    '        $browserUrl = [string]($metadata.browserUrl)',
    '        $previewUrl = [string]($metadata.previewUrl)',
    '        if (-not $browserUrl) { $browserUrl = $defaultBrowserUrl }',
    '        if (-not $previewUrl) { $previewUrl = $browserUrl }',
    "      } catch {}",
    "    }",
    "    $apiStatus = if ($apiHealthUrl) { Get-HttpStatusCode -Url $apiHealthUrl } else { 0 }",
    "    $webStatus = if ($previewUrl) { Get-HttpStatusCode -Url $previewUrl } else { 0 }",
    "    $lastApiStatus = $apiStatus",
    "    $lastWebStatus = $webStatus",
    "    $lastApiHealthUrl = $apiHealthUrl",
    "    $lastPreviewUrl = $previewUrl",
    "    $lastBrowserUrl = $browserUrl",
    "    if ($apiStatus -eq 200 -and @(200, 307, 308) -contains $webStatus) {",
    "      # #region debug-point C:workspace-ready",
    '      Send-InstallDebugEvent -HypothesisId "C" -Location "install-local-single-user.ps1:wait-ready" -Message "[DEBUG] local workspace became ready during install" -Data @{ localAppRoot = $LocalAppRoot; metadataPath = $metadataPath; metadataSeen = $metadataSeen; apiStatus = $apiStatus; webStatus = $webStatus; apiHealthUrl = $apiHealthUrl; previewUrl = $previewUrl; browserUrl = $browserUrl }',
    "      # #endregion",
    "      return @{",
    "        Ready = $true;",
    "        BrowserUrl = $browserUrl;",
    "        PreviewUrl = $previewUrl;",
    "        ApiHealthUrl = $apiHealthUrl;",
    "        RuntimeMetadataPath = $(if (Test-Path $metadataPath) { $metadataPath } else { $null });",
    "        LifecycleStatePath = $(if (Test-Path $lifecycleStatePath) { $lifecycleStatePath } else { $null });",
    "        LifecycleSeen = $lifecycleSeen;",
    "        LifecyclePhase = $lastLifecyclePhase;",
    "        LifecycleError = $lastLifecycleError",
    "      }",
    "    }",
    "    Start-Sleep -Seconds 1",
    "  }",
    "  # #region debug-point C:workspace-timeout",
    '  Send-InstallDebugEvent -HypothesisId "C" -Location "install-local-single-user.ps1:wait-timeout" -Message "[DEBUG] local workspace did not become ready before install timeout" -Data @{ localAppRoot = $LocalAppRoot; metadataPath = $metadataPath; lifecycleStatePath = $lifecycleStatePath; metadataSeen = $metadataSeen; lifecycleSeen = $lifecycleSeen; lifecyclePhase = $lastLifecyclePhase; lifecycleError = $lastLifecycleError; apiStatus = $lastApiStatus; webStatus = $lastWebStatus; apiHealthUrl = $lastApiHealthUrl; previewUrl = $lastPreviewUrl; browserUrl = $lastBrowserUrl; timeoutSeconds = $TimeoutSeconds }',
    "  # #endregion",
    "  return @{",
    "    Ready = $false;",
    "    BrowserUrl = $lastBrowserUrl;",
    "    PreviewUrl = $lastPreviewUrl;",
    "    ApiHealthUrl = $lastApiHealthUrl;",
    "    RuntimeMetadataPath = $(if (Test-Path $metadataPath) { $metadataPath } else { $null });",
    "    LifecycleStatePath = $(if (Test-Path $lifecycleStatePath) { $lifecycleStatePath } else { $null });",
    "    LifecycleSeen = $lifecycleSeen;",
    "    LifecyclePhase = $lastLifecyclePhase;",
    "    LifecycleError = $lastLifecycleError;",
    "    MetadataSeen = $metadataSeen;",
    "    ApiStatus = $lastApiStatus;",
    "    WebStatus = $lastWebStatus",
    "  }",
    "}",
    "",
    'Write-Host "Installing $releaseName to $InstallRoot"',
    "",
    'if (Test-Path $InstallRoot) {',
    '  Write-Host "Existing install detected; moving to backup: $backupRoot"',
    '  Stop-ExistingInstallProcesses -TargetInstallRoot $InstallRoot -RuntimeMetadataFile $runtimeMetadataPath',
    '  Write-Host "Creating backup from existing install..."',
    '  Move-ExistingInstallToBackup -TargetInstallRoot $InstallRoot -BackupRoot $backupRoot',
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
    "try {",
    '  $autostartProcess = Start-Process -FilePath $cmdExe -ArgumentList @("/d", "/c", $autostartInstaller) -WorkingDirectory $InstallRoot -Wait -PassThru -WindowStyle Hidden',
    "  # #region debug-point B:autostart-installer-exit",
    '  Send-InstallDebugEvent -HypothesisId "B" -Location "install-local-single-user.ps1:autostart-installer" -Message "[DEBUG] autostart installer process completed" -Data @{ installRoot = $InstallRoot; autostartInstaller = $autostartInstaller; exitCode = $autostartProcess.ExitCode }',
    "  # #endregion",
    '  if ($autostartProcess.ExitCode -ne 0) {',
    '    throw "Autostart install failed with exit code $($autostartProcess.ExitCode)"',
    "  }",
    "} catch {",
    '  $fallbackReason = if ($_.Exception) { $_.Exception.Message } else { [string]$_ }',
    "  # #region debug-point B:autostart-installer-fallback",
    '  Send-InstallDebugEvent -HypothesisId "B" -Location "install-local-single-user.ps1:autostart-fallback" -Message "[DEBUG] autostart installer failed and install fell back to startup shortcut" -Data @{ installRoot = $InstallRoot; autostartInstaller = $autostartInstaller; reason = $fallbackReason }',
    "  # #endregion",
    '  Write-Host ("Autostart installer failed; falling back to Startup shortcut. " + $fallbackReason)',
    '  $startupFallbackPath = Install-StartupFolderAutostartFallback -TargetInstallRoot $InstallRoot',
    '  Write-Host ("Installed autostart fallback shortcut: " + $startupFallbackPath)',
    "}",
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
    '$launchPath = Join-Path $InstallRoot "start-local-single-user.cmd"',
    'if (-not (Test-Path $launchPath)) {',
    '  throw "Missing launcher entry: $launchPath"',
    '}',
    'if (-not $NoLaunch) {',
    '  Write-Host "Starting local workspace..."',
    '  $localAppRoot = Resolve-EffectiveLocalAppRoot -TargetInstallRoot $InstallRoot',
    '  Write-Host ("Resolved local app root: " + $localAppRoot)',
    '  $installLifecycleStatePath = Write-InstallLifecycleState -LocalAppRoot $localAppRoot -Phase "INSTALLING" -InstallPath $InstallRoot -RuntimeMetadataFile $runtimeMetadataPath -Message "Installer copied release payload and is about to launch local workspace."',
    '  Write-Host ("Lifecycle state path: " + $installLifecycleStatePath)',
    '  $previousAutoOpen = $env:LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER',
    '  $env:LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER = "false"',
    '  try {',
    "    # #region debug-point D:launch-start",
    '    Send-InstallDebugEvent -HypothesisId "D" -Location "install-local-single-user.ps1:launch-start" -Message "[DEBUG] install is starting local workspace entry" -Data @{ installRoot = $InstallRoot; localAppRoot = $localAppRoot; launchPath = $launchPath; cmdExe = $cmdExe }',
    "    # #endregion",
    '    $launchProcess = Start-Process -FilePath $cmdExe -ArgumentList @("/d", "/c", $launchPath) -WorkingDirectory $InstallRoot -WindowStyle Hidden -PassThru',
    "    # #region debug-point D:launch-spawned",
    '    Send-InstallDebugEvent -HypothesisId "D" -Location "install-local-single-user.ps1:launch-spawned" -Message "[DEBUG] install spawned local workspace entry process" -Data @{ installRoot = $InstallRoot; localAppRoot = $localAppRoot; launchPath = $launchPath; cmdExe = $cmdExe; launchPid = $launchProcess.Id; hasExited = $launchProcess.HasExited }',
    "    # #endregion",
    '  } finally {',
    '    if ($null -eq $previousAutoOpen) {',
    '      Remove-Item Env:LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER -ErrorAction SilentlyContinue',
    '    } else {',
    '      $env:LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER = $previousAutoOpen',
    '    }',
    '  }',
    '  Write-Host "Waiting for local workspace to become ready..."',
    '  $readyRuntime = Wait-LocalWorkspaceReady -LocalAppRoot $localAppRoot',
    '  if (-not $readyRuntime.Ready) {',
    '    throw ("Local workspace did not become ready after install. localAppRoot={0}; metadataSeen={1}; lifecycleSeen={2}; lifecyclePhase={3}; lifecycleError={4}; apiStatus={5}; webStatus={6}; apiHealthUrl={7}; previewUrl={8}; metadataPath={9}; lifecyclePath={10}. Review start-local-single-user.log and launcher.log under {0}\\logs" -f $localAppRoot, $readyRuntime.MetadataSeen, $readyRuntime.LifecycleSeen, $readyRuntime.LifecyclePhase, $readyRuntime.LifecycleError, $readyRuntime.ApiStatus, $readyRuntime.WebStatus, $readyRuntime.ApiHealthUrl, $readyRuntime.PreviewUrl, $readyRuntime.RuntimeMetadataPath, $readyRuntime.LifecycleStatePath)',
    '  }',
    '  Write-Host ("Local workspace is ready: " + $readyRuntime.BrowserUrl)',
    '  Start-Process $readyRuntime.BrowserUrl',
    '} else {',
    '  Write-Host "Skipping launch because -NoLaunch was provided."',
    '}',
    "",
    'Write-Host "Install completed."',
    'Write-Host ("Launch: " + $launchPath)',
    'Write-Host ("Autostart status: " + (Join-Path $InstallRoot "status-autostart.cmd"))',
    'Write-Host ("Autostart remove: " + (Join-Path $InstallRoot "remove-autostart.cmd"))',
    "",
  ].join("\r\n");
}

function buildInstallCmd() {
  return [
    "@echo off",
    "setlocal EnableExtensions EnableDelayedExpansion",
    'set "SELF_CMD=%~f0"',
    'set "SELF_ELEVATED=0"',
    'if /I "%~1"=="--elevated" (',
    '  set "SELF_ELEVATED=1"',
    "  shift /1",
    ")",
    'set "SCRIPT_DIR=%~dp0"',
    'set "LOG_DIR=%APPDATA%\\AiOmniOps\\logs"',
    'if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1',
    'set "INSTALL_LOG=%LOG_DIR%\\install-local-single-user.log"',
    'set "INSTALL_PS1=%SCRIPT_DIR%install-local-single-user.ps1"',
    'set "POWERSHELL_EXE=%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"',
    'if not exist "%POWERSHELL_EXE%" set "POWERSHELL_EXE=%ProgramFiles%\\PowerShell\\7\\pwsh.exe"',
    'echo ==== [%date% %time%] install-local-single-user.cmd ==== > "%INSTALL_LOG%"',
    'echo [AiOmniOps] Installing, live output is shown below and also saved to: %INSTALL_LOG%',
    'echo SYSTEMROOT=%SystemRoot% >> "%INSTALL_LOG%"',
    'echo POWERSHELL_EXE=%POWERSHELL_EXE% >> "%INSTALL_LOG%"',
    'if not exist "%POWERSHELL_EXE%" (',
    '  echo Missing PowerShell executable. >> "%INSTALL_LOG%"',
    '  set EXIT_CODE=9009',
    '  goto :after_install',
    ')',
    'if exist "%LOCALAPPDATA%\\Programs\\AiOmniOps" (',
    '  fltmc >nul 2>&1',
    '  if errorlevel 1 (',
    '    if "%SELF_ELEVATED%"=="0" (',
    '      echo Existing install detected; requesting Windows elevation. >> "%INSTALL_LOG%"',
    '      echo [AiOmniOps] Existing install detected, requesting Windows elevation...',
    `      "%POWERSHELL_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$proc = Start-Process -Verb RunAs -FilePath $env:POWERSHELL_EXE -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-Command','& { & ''%INSTALL_PS1%'' *>&1 | Tee-Object -FilePath ''%INSTALL_LOG%'' -Append }') -PassThru -Wait; exit $proc.ExitCode"`,
    '      set "EXIT_CODE=!ERRORLEVEL!"',
    "      goto :after_install",
    "    )",
    '    echo Existing install detected but installer is still not elevated. >> "%INSTALL_LOG%"',
    "  )",
    ")",
    "\"%POWERSHELL_EXE%\" -NoProfile -ExecutionPolicy Bypass -Command \"& { & '%INSTALL_PS1%' *>&1 | Tee-Object -FilePath '%INSTALL_LOG%' -Append }\"",
    'set "EXIT_CODE=!ERRORLEVEL!"',
    ':after_install',
    "if not \"%EXIT_CODE%\"==\"0\" (",
    '  echo.',
    '  echo [AiOmniOps] Install failed. Review log: %INSTALL_LOG%',
    '  echo.',
    '  type "%INSTALL_LOG%"',
    '  echo.',
    '  pause',
    ")",
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
    "3. 安装过程会默认为当前用户配置开机自启，并在完成后自动启动本地工作台",
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

  if (!dryRun && !skipPrebuild) {
    const npmCliPath = resolveHostNpmCliPath();
    runCommand(process.execPath, [npmCliPath, "run", "build:server"], "Build server dist");
    runCommand(
      process.execPath,
      [npmCliPath, "run", "build:web"],
      "Build web standalone",
      {
        APP_RUNTIME_MODE: "local-single-user",
        NEXT_PUBLIC_APP_RUNTIME_MODE: "local-single-user",
      },
    );
  }

  const requiredRelativePaths = [
    "package.json",
    "prisma\\schema.prisma",
    "prisma\\schema.local.prisma",
    "prisma\\seed-data\\registration-invite-codes.txt",
    "node_modules",
    "apps\\server\\dist",
    "apps\\web\\public",
    "提示词",
    ".trae\\skills",
    "apps\\web\\.next\\standalone",
    "apps\\web\\.next\\static",
    "scripts\\generate-local-prisma-schema.cjs",
    "scripts\\local-single-user-launcher.cjs",
    "scripts\\local-single-user-launch-settings.cjs",
    "scripts\\local-single-user-platform.cjs",
    "scripts\\local-single-user-runtime.cjs",
    "scripts\\local-single-user-prisma.cjs",
    "scripts\\local-single-user-autostart.cjs",
    "scripts\\local-single-user-autostart.ps1",
    "scripts\\local-single-user-updater.ps1",
  ];
  const optionalRelativePaths = [
    "apps\\web\\.next\\local-launcher-web-build-state.json",
    "技能",
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
    appVersion: releaseAppVersion,
    releaseTag: releaseTag || null,
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
  console.log("[step] validate release bundle");
  runReleaseValidation([
    "--release-root",
    releaseRoot,
    "--expected-release-tag",
    releaseManifest.releaseTag || "",
    "--expected-app-version",
    releaseManifest.appVersion || "",
  ]);

  console.log(`local-single-user 发布物已生成：${releaseRoot}`);
  console.log(`启动入口：${path.join(releaseRoot, "start-local-single-user.cmd")}`);
  console.log(`Manifest：${path.join(releaseMetaRoot, "release-manifest.json")}`);
}

main();

param(
  [Parameter(Mandatory = $true)]
  [string]$ConfigPath
)

$ErrorActionPreference = "Stop"

$RuntimeReadyTimeoutSeconds = 180

function Remove-PathIfExists {
  param(
    [string]$Path
  )

  if (-not $Path) {
    return
  }

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  $item = Get-Item -LiteralPath $Path -ErrorAction SilentlyContinue
  if (-not $item) {
    return
  }

  if ($item.PSIsContainer) {
    Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    return
  }

  Remove-Item -LiteralPath $Path -Force -ErrorAction Stop
}

function Write-Trace {
  param(
    [string]$Message
  )

  if (-not $script:TraceLogPath) {
    return
  }

  try {
    $directory = Split-Path -Parent $script:TraceLogPath
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    Add-Content -LiteralPath $script:TraceLogPath -Value ("[{0}] {1}" -f (Get-Date).ToString("o"), $Message) -Encoding UTF8
  } catch {
  }
}

function Send-DebugEvent {
  param(
    [string]$HypothesisId,
    [string]$Location,
    [string]$Message,
    [hashtable]$Data = @{}
  )

  $debugServerUrl = if ($script:Config -and $script:Config.debugServerUrl) { [string]$script:Config.debugServerUrl } else { "http://127.0.0.1:7777/event" }
  $debugSessionId = if ($script:Config -and $script:Config.debugSessionId) { [string]$script:Config.debugSessionId } else { "upgrade-apply-fail" }
  $payload = @{
    sessionId = $debugSessionId
    runId = "pre-fix"
    hypothesisId = $HypothesisId
    location = $Location
    msg = $Message
    data = $Data
    ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  } | ConvertTo-Json -Depth 8 -Compress

  try {
    Invoke-WebRequest -UseBasicParsing -Uri $debugServerUrl -Method Post -ContentType "application/json" -Body $payload -TimeoutSec 3 | Out-Null
  } catch {
  }
}

function Write-Status {
  param(
    [string]$Phase,
    [string]$Message,
    [hashtable]$Extra = @{}
  )

  $payload = @{
    phase = $Phase
    message = $Message
    latestTagName = $script:Config.releaseTag
    downloadedReleaseTag = $script:Config.releaseTag
    downloadedZipPath = $script:Config.zipPath
    expectedSha256 = $script:Config.expectedSha256
  }

  foreach ($key in $Extra.Keys) {
    $payload[$key] = $Extra[$key]
  }

  if ($Phase -eq "APPLYING") {
    $payload["checkedAt"] = (Get-Date).ToString("o")
  }
  if ($Phase -eq "READY_TO_APPLY") {
    $payload["downloadedAt"] = (Get-Date).ToString("o")
  }
  if ($Phase -eq "SUCCEEDED") {
    $payload["appliedAt"] = (Get-Date).ToString("o")
  }
  if ($Phase -eq "FAILED") {
    $payload["failedAt"] = (Get-Date).ToString("o")
  }

  if (-not $script:Config -or -not $script:Config.statusFilePath) {
    return
  }

  $statusFilePath = [string]$script:Config.statusFilePath
  $directory = Split-Path -Parent $statusFilePath
  $json = $payload | ConvertTo-Json -Depth 8

  for ($attempt = 1; $attempt -le 5; $attempt++) {
    try {
      New-Item -ItemType Directory -Path $directory -Force | Out-Null
      Set-Content -LiteralPath $statusFilePath -Value $json -Encoding UTF8
      return
    } catch {
      Write-Trace ("Write-Status retry failed. phase=" + $Phase + "; attempt=" + $attempt + "; error=" + $_.Exception.Message)
      if ($attempt -ge 5) {
        Send-DebugEvent -HypothesisId "U1" -Location "local-single-user-updater.ps1:Write-Status" -Message "[DEBUG] status write skipped after retries" -Data @{
          phase = $Phase
          statusFilePath = $statusFilePath
          attempt = $attempt
          error = $_.Exception.Message
        }
        return
      }
      Start-Sleep -Milliseconds 300
    }
  }
}

function Stop-RuntimeFromMetadata {
  $processes = @()
  $runtimeMetadataPath = Join-Path $script:Config.localAppRoot "runtime\local-single-user-runtime.json"
  if (Test-Path -LiteralPath $runtimeMetadataPath) {
    try {
      $metadata = Get-Content -LiteralPath $runtimeMetadataPath -Raw | ConvertFrom-Json
    } catch {
      $metadata = $null
    }

    if ($metadata -and $metadata.processes) {
      $processes += $metadata.processes.launcherPid
      $processes += $metadata.processes.serverPid
      $processes += $metadata.processes.workerPid
      $processes += $metadata.processes.webPid
    }
  }

  if ($script:Config.fallbackStopPids) {
    $processes += @($script:Config.fallbackStopPids)
  }

  if ($script:Config.restartCommandPath) {
    $restartCommandPath = [string]$script:Config.restartCommandPath
    $processes += @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -ieq "cmd.exe" -and $_.CommandLine -like "*$restartCommandPath*"
      } | ForEach-Object { $_.ProcessId })
  }

  if (-not ($processes | Where-Object { $_ })) {
    return
  }

  $targetPids = @()
  foreach ($pidValue in ($processes | Where-Object { $_ })) {
    $pidNumber = 0
    if (-not [int]::TryParse([string]$pidValue, [ref]$pidNumber)) {
      continue
    }
    if ($pidNumber -le 0 -or $pidNumber -eq $PID) {
      continue
    }
    $targetPids += $pidNumber
    try {
      Stop-Process -Id $pidNumber -Force -ErrorAction Stop
    } catch {
      try {
        & taskkill /PID $pidNumber /T /F 2>$null | Out-Null
      } catch {
      }
    }
  }

  foreach ($attempt in 1..20) {
    $remainingPids = @($targetPids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue })
    if (-not $remainingPids.Count) {
      return
    }
    Start-Sleep -Milliseconds 500
  }

  Start-Sleep -Seconds 2
}

function Get-BackupRootCandidates {
  $installParent = Split-Path -Parent $script:Config.installRoot
  if (-not (Test-Path -LiteralPath $installParent)) {
    return @()
  }

  return @(
    Get-ChildItem -LiteralPath $installParent -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "AiOmniOps-backup-*" } |
      Sort-Object LastWriteTimeUtc |
      Select-Object -ExpandProperty FullName
  )
}

function Resolve-NewBackupRoot {
  param(
    [string[]]$ExistingBackups = @()
  )

  $newBackups = @(
    Get-BackupRootCandidates |
      Where-Object { $ExistingBackups -notcontains $_ }
  )

  if ($newBackups.Count -gt 0) {
    return $newBackups[-1]
  }

  return $null
}

function Resolve-ReleaseRoot {
  param(
    [string]$ExtractionRoot
  )

  $installer = Get-ChildItem -Path $ExtractionRoot -Filter "install-local-single-user.ps1" -Recurse -File | Select-Object -First 1
  if (-not $installer) {
    throw "解压后的升级包中未找到 install-local-single-user.ps1"
  }
  return Split-Path -Parent $installer.FullName
}

function Start-RestartCommand {
  $cmdExe = Join-Path $env:SystemRoot "System32\cmd.exe"
  if (-not (Test-Path -LiteralPath $cmdExe)) {
    $cmdExe = "cmd.exe"
  }

  $restartCommandPath = if ($script:Config.restartCommandPath) { [string]$script:Config.restartCommandPath } else { "" }
  $installRoot = if ($script:Config.installRoot) { [string]$script:Config.installRoot } else { "" }
  $bundledNodePath = if ($installRoot) { Join-Path $installRoot "bin\node.exe" } else { "" }
  $launcherScriptPath = if ($installRoot) { Join-Path $installRoot "app\scripts\local-single-user-launcher.cjs" } else { "" }

  $workingDirectory = $null
  $command = $null

  if ($restartCommandPath -and (Test-Path -LiteralPath $restartCommandPath)) {
    $workingDirectory = Split-Path -Parent $restartCommandPath
    $command = "call ""$restartCommandPath"""
    Write-Trace ("Restart via start-local-single-user.cmd: " + $restartCommandPath)
  } elseif ((Test-Path -LiteralPath $bundledNodePath) -and (Test-Path -LiteralPath $launcherScriptPath)) {
    $workingDirectory = Split-Path -Parent $launcherScriptPath
    $escapedNodePath = [string]$bundledNodePath
    $escapedLauncherScriptPath = [string]$launcherScriptPath
    $command = """$escapedNodePath"" ""$escapedLauncherScriptPath"""
    Write-Trace ("Restart fallback via bundled node launcher: node=" + $bundledNodePath + "; launcher=" + $launcherScriptPath)
  } else {
    Write-Trace ("Skip restart command: start command missing and fallback launcher unavailable. restartCommandPath=" + $restartCommandPath + "; bundledNodePath=" + $bundledNodePath + "; launcherScriptPath=" + $launcherScriptPath)
    return
  }

  $localAppRoot = [string]$script:Config.localAppRoot
  $runtimeMode = if ($script:Config.appRuntimeMode) { [string]$script:Config.appRuntimeMode } else { "local-single-user" }
  $wrappedCommand = @(
    "set ""APP_RUNTIME_MODE=$runtimeMode""",
    "set ""LOCAL_APP_DATA_ROOT=$localAppRoot""",
    "set ""AI_OMNI_LOCAL_ROOT=$localAppRoot""",
    "set ""LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER=false""",
    $command
  ) -join " && "
  Write-Trace ("Start restart command via cmd.exe. installRoot=" + [string]$workingDirectory + "; localAppRoot=" + [string]$localAppRoot)
  Start-Process -FilePath $cmdExe -ArgumentList "/d", "/c", $wrappedCommand -WorkingDirectory $workingDirectory -WindowStyle Hidden
}

function Read-RuntimeMetadata {
  $runtimeMetadataPath = Join-Path $script:Config.localAppRoot "runtime\local-single-user-runtime.json"
  if (-not (Test-Path -LiteralPath $runtimeMetadataPath)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $runtimeMetadataPath -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Read-RuntimeNetworkTargets {
  $apiHealthUrl = "http://127.0.0.1:3011/api/health"
  $previewUrl = "http://127.0.0.1:3001/brand-growth"
  $browserUrl = "http://127.0.0.1:3001"
  $metadata = Read-RuntimeMetadata

  if ($metadata) {
    if ([string]$metadata.apiHealthUrl) {
      $apiHealthUrl = [string]$metadata.apiHealthUrl
    }
    if ([string]$metadata.previewUrl) {
      $previewUrl = [string]$metadata.previewUrl
    }
    if ([string]$metadata.browserUrl) {
      $browserUrl = [string]$metadata.browserUrl
    }
  }

  return @{
    metadata = $metadata
    apiHealthUrl = $apiHealthUrl
    previewUrl = $previewUrl
    browserUrl = $browserUrl
  }
}

function Read-ReleaseTagFromRuntimeMetadata {
  param(
    $Metadata
  )

  if (-not $Metadata) {
    return $null
  }

  try {
    $releaseTag = [string]$Metadata.release.releaseTag
    if ($releaseTag) {
      return $releaseTag
    }
  } catch {
  }

  return $null
}

function Read-ReleaseTagFromInstallRoot {
  param(
    [string]$InstallRoot
  )

  if (-not $InstallRoot) {
    return $null
  }

  $releaseManifestPath = Join-Path $InstallRoot "meta\release-manifest.json"
  if (-not (Test-Path -LiteralPath $releaseManifestPath)) {
    return $null
  }

  try {
    $manifest = Get-Content -LiteralPath $releaseManifestPath -Raw | ConvertFrom-Json
    return [string]$manifest.releaseTag
  } catch {
    return $null
  }
}

function Read-InstalledReleaseTag {
  return Read-ReleaseTagFromInstallRoot -InstallRoot $script:Config.installRoot
}

function Get-UrlStatusCode {
  param(
    [string]$Url
  )

  if (-not $Url) {
    return 0
  }

  try {
    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Method = "GET"
    $request.AllowAutoRedirect = $false
    $request.Timeout = 3000
    $request.ReadWriteTimeout = 3000
    $response = $request.GetResponse()
    try {
      return [int]$response.StatusCode
    } finally {
      $response.Close()
    }
  } catch [System.Net.WebException] {
    if ($_.Exception.Response) {
      $response = $_.Exception.Response
      try {
        return [int]$response.StatusCode
      } finally {
        $response.Close()
      }
    }
    return 0
  } catch {
    return 0
  }
}

function Wait-ForRuntimeReady {
  param(
    [datetime]$StartedAfter,
    [string]$ExpectedReleaseTag = $script:Config.releaseTag,
    [int]$TimeoutSeconds = 180
  )

  $runtimeMetadataPath = Join-Path $script:Config.localAppRoot "runtime\local-single-user-runtime.json"
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $startedAfterUtc = $StartedAfter.ToUniversalTime()
  $attempt = 0

  while ((Get-Date) -lt $deadline) {
    $attempt += 1
    $installedReleaseTag = Read-InstalledReleaseTag
    $runtimeTargets = Read-RuntimeNetworkTargets
    $metadata = $runtimeTargets.metadata
    $runtimeMetadataReleaseTag = $null
    $metadataFile = $null
    $apiHealthUrl = [string]$runtimeTargets.apiHealthUrl
    $previewUrl = [string]$runtimeTargets.previewUrl
    $browserUrl = [string]$runtimeTargets.browserUrl

    if (Test-Path -LiteralPath $runtimeMetadataPath) {
      $metadataFile = Get-Item -LiteralPath $runtimeMetadataPath -ErrorAction SilentlyContinue
      if ($metadata) {
        $runtimeMetadataReleaseTag = Read-ReleaseTagFromRuntimeMetadata -Metadata $metadata
        if (-not [string]$installedReleaseTag -and [string]$runtimeMetadataReleaseTag) {
          $installedReleaseTag = [string]$runtimeMetadataReleaseTag
        }
        if ([string]$metadata.apiHealthUrl) {
          $apiHealthUrl = [string]$metadata.apiHealthUrl
        }
        if ([string]$metadata.previewUrl) {
          $previewUrl = [string]$metadata.previewUrl
        }
        if ([string]$metadata.browserUrl) {
          $browserUrl = [string]$metadata.browserUrl
        }
      }
    }

    $apiStatus = Get-UrlStatusCode -Url $apiHealthUrl
    $webStatus = Get-UrlStatusCode -Url $previewUrl
    if (-not (@(200, 307, 308) -contains $webStatus) -and $browserUrl -and $browserUrl -ne $previewUrl) {
      $webStatus = Get-UrlStatusCode -Url $browserUrl
    }

    if ($attempt -eq 1 -or ($attempt % 5) -eq 0) {
      $metadataLastWriteUtc = if ($metadataFile) { $metadataFile.LastWriteTimeUtc.ToString("o") } else { "missing" }
      $metadataStartedAt = if ($metadata) { [string]$metadata.startedAt } else { "" }
      Write-Status -Phase "APPLYING" -Message ("新版本已安装，正在等待本地 API / Web 恢复（第 " + [string]$attempt + " 次探测）。")
      Write-Trace ("Runtime ready probe #{0}: installedReleaseTag={1}; runtimeMetadataReleaseTag={2}; expectedReleaseTag={3}; metadataLastWriteUtc={4}; metadataStartedAt={5}; startedAfterUtc={6}; apiStatus={7}; webStatus={8}; apiUrl={9}; webUrl={10}" -f $attempt, [string]$installedReleaseTag, [string]$runtimeMetadataReleaseTag, [string]$ExpectedReleaseTag, $metadataLastWriteUtc, $metadataStartedAt, $startedAfterUtc.ToString("o"), $apiStatus, $webStatus, $apiHealthUrl, $previewUrl)
    }

    $releaseTagMatches = (-not [string]$ExpectedReleaseTag) -or ([string]$installedReleaseTag -eq [string]$ExpectedReleaseTag)

    if (
      $releaseTagMatches `
      -and $apiStatus -eq 200 `
      -and @(200, 307, 308) -contains $webStatus
    ) {
      return @{
        metadata = $metadata
        apiStatus = $apiStatus
        webStatus = $webStatus
        browserUrl = $browserUrl
        previewUrl = $previewUrl
        apiHealthUrl = $apiHealthUrl
        installedReleaseTag = $installedReleaseTag
      }
    }

    Start-Sleep -Seconds 2
  }

  $finalInstalledReleaseTag = Read-InstalledReleaseTag
  $expectedLabel = if ([string]$ExpectedReleaseTag) { [string]$ExpectedReleaseTag } else { "未指定" }
  throw "升级后启动验活失败：本地 API / Web 未在 $TimeoutSeconds 秒内恢复可用。当前安装版本=$finalInstalledReleaseTag，期望版本=$expectedLabel。"
}

function Read-LogTail {
  param(
    [string]$Path,
    [int]$MaxLines = 3
  )

  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) {
    return ""
  }

  try {
    $content = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
    if (-not $content) {
      return ""
    }
    $lines = @(
      $content -split "`r?`n" |
        ForEach-Object { [string]$_ } |
        Where-Object { $_.Trim() }
    )
    if (-not $lines.Count) {
      return ""
    }
    return (($lines | Select-Object -Last $MaxLines) -join " | ").Trim()
  } catch {
    return ""
  }
}

function Invoke-PowerShellFileWithHeartbeat {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,
    [string[]]$ArgumentList = @(),
    [Parameter(Mandatory = $true)]
    [string]$ActivityMessage,
    [int]$HeartbeatSeconds = 5,
    [string]$StdoutPath,
    [string]$StderrPath
  )

  $powershellExe = if ($env:SystemRoot) { Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe" } else { "powershell.exe" }
  $resolvedStdoutPath = if ($StdoutPath) { $StdoutPath } else { Join-Path $script:RunRoot "child.stdout.log" }
  $resolvedStderrPath = if ($StderrPath) { $StderrPath } else { Join-Path $script:RunRoot "child.stderr.log" }

  Remove-PathIfExists -Path $resolvedStdoutPath
  Remove-PathIfExists -Path $resolvedStderrPath

  $fullArgumentList = @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $ScriptPath
  ) + $ArgumentList

  $process = Start-Process `
    -FilePath $powershellExe `
    -ArgumentList $fullArgumentList `
    -WindowStyle Hidden `
    -RedirectStandardOutput $resolvedStdoutPath `
    -RedirectStandardError $resolvedStderrPath `
    -PassThru

  try {
    while (-not $process.WaitForExit([Math]::Max(1000, $HeartbeatSeconds * 1000))) {
      Write-Status -Phase "APPLYING" -Message $ActivityMessage
      Write-Trace ($ActivityMessage + " processId=" + [string]$process.Id)
    }

    $exitCode = [int]$process.ExitCode
    if ($exitCode -ne 0) {
      $detail = Read-LogTail -Path $resolvedStderrPath
      if (-not $detail) {
        $detail = Read-LogTail -Path $resolvedStdoutPath
      }
      if ($detail) {
        throw ("子 PowerShell 退出码 " + $exitCode + "，详情：" + $detail)
      }
      throw ("子 PowerShell 退出码 " + $exitCode)
    }
  } finally {
    $process.Dispose()
  }
}

function Restore-BackupInstall {
  param(
    [Parameter(Mandatory = $true)]
    [string]$BackupRoot
  )

  Write-Status -Phase "APPLYING" -Message "新版本启动失败，正在自动回滚上一版本。"
  Stop-RuntimeFromMetadata

  if (Test-Path -LiteralPath $script:Config.installRoot) {
    Remove-Item -LiteralPath $script:Config.installRoot -Recurse -Force
  }

  Move-Item -LiteralPath $BackupRoot -Destination $script:Config.installRoot -ErrorAction Stop
}

function Start-DeferredDirectoryCleanup {
  param(
    [string]$TargetDirectory
  )

  if (-not $TargetDirectory) {
    return
  }

  $cmdExe = Join-Path $env:SystemRoot "System32\cmd.exe"
  if (-not (Test-Path -LiteralPath $cmdExe)) {
    $cmdExe = "cmd.exe"
  }

  $command = "ping 127.0.0.1 -n 6 >nul & for /l %i in (1,1,12) do (if not exist ""$TargetDirectory"" goto done & rmdir /s /q ""$TargetDirectory"" >nul 2>&1 & ping 127.0.0.1 -n 3 >nul) & :done"
  Start-Process -FilePath $cmdExe -ArgumentList "/d", "/c", $command -WindowStyle Hidden | Out-Null
}

function Remove-EmptyDirectoryIfExists {
  param(
    [string]$Path
  )

  if (-not $Path) {
    return
  }

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  try {
    $childItem = Get-ChildItem -LiteralPath $Path -Force -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $childItem) {
      Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
    }
  } catch {
  }
}

function Cleanup-UpdateArtifacts {
  param(
    [string]$ExtractRoot
  )

  $releaseRoot = if ($script:Config.zipPath) { Split-Path -Parent $script:Config.zipPath } else { $null }

  try {
    if ($ExtractRoot) {
      Write-Trace ("Cleanup extract root: " + [string]$ExtractRoot)
      Remove-PathIfExists -Path $ExtractRoot
    }

    if ($releaseRoot) {
      Write-Trace ("Cleanup downloaded release root: " + [string]$releaseRoot)
      Remove-PathIfExists -Path $releaseRoot
    }
  } catch {
    Write-Trace ("Cleanup warning: " + $_.Exception.Message)
  }

  try {
    $runRoot = if ($script:RunRoot) { [string]$script:RunRoot } else { Split-Path -Parent $script:ConfigPath }
    if ($runRoot) {
      Write-Trace ("Schedule deferred cleanup for apply run root: " + $runRoot)
      Start-DeferredDirectoryCleanup -TargetDirectory $runRoot
    }
  } catch {
    Write-Trace ("Deferred cleanup warning: " + $_.Exception.Message)
  }
}

function Cleanup-HistoricalUpdateArtifacts {
  if (-not $script:Config.updatesRoot) {
    return
  }

  $updatesRoot = [string]$script:Config.updatesRoot
  if (-not (Test-Path -LiteralPath $updatesRoot)) {
    return
  }

  $currentRunRoot = if ($script:RunRoot) { [string]$script:RunRoot } else { $null }
  $downloadsRoot = Join-Path $updatesRoot "downloads"
  $applyRunsRoot = Join-Path $updatesRoot "apply-runs"

  foreach ($extractDir in @(Get-ChildItem -LiteralPath $updatesRoot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "extract-*" })) {
    try {
      Write-Trace ("Cleanup historical extract root: " + [string]$extractDir.FullName)
      Remove-PathIfExists -Path $extractDir.FullName
    } catch {
      Write-Trace ("Historical extract cleanup warning: " + $_.Exception.Message)
    }
  }

  if (Test-Path -LiteralPath $downloadsRoot) {
    foreach ($downloadDir in @(Get-ChildItem -LiteralPath $downloadsRoot -Directory -ErrorAction SilentlyContinue)) {
      try {
        Write-Trace ("Cleanup historical downloaded release root: " + [string]$downloadDir.FullName)
        Remove-PathIfExists -Path $downloadDir.FullName
      } catch {
        Write-Trace ("Historical downloaded release cleanup warning: " + $_.Exception.Message)
      }
    }
    Remove-EmptyDirectoryIfExists -Path $downloadsRoot
  }

  if (Test-Path -LiteralPath $applyRunsRoot) {
    foreach ($runDir in @(Get-ChildItem -LiteralPath $applyRunsRoot -Directory -ErrorAction SilentlyContinue)) {
      if ($currentRunRoot -and ([string]$runDir.FullName).TrimEnd("\") -eq $currentRunRoot.TrimEnd("\")) {
        continue
      }
      try {
        Write-Trace ("Cleanup historical apply run root: " + [string]$runDir.FullName)
        Remove-PathIfExists -Path $runDir.FullName
      } catch {
        Write-Trace ("Historical apply run cleanup warning: " + $_.Exception.Message)
      }
    }
    Remove-EmptyDirectoryIfExists -Path $applyRunsRoot
  }
}

function Cleanup-InstallBackups {
  try {
    $backupRoots = @(Get-BackupRootCandidates)
    foreach ($backupPath in $backupRoots) {
      try {
        Write-Trace ("Cleanup install backup root: " + [string]$backupPath)
        Remove-PathIfExists -Path $backupPath
      } catch {
        Write-Trace ("Install backup cleanup warning: " + $_.Exception.Message)
      }

      try {
        if (Test-Path -LiteralPath $backupPath) {
          Write-Trace ("Schedule deferred cleanup for install backup root: " + [string]$backupPath)
          Start-DeferredDirectoryCleanup -TargetDirectory $backupPath
        }
      } catch {
        Write-Trace ("Deferred install backup cleanup warning: " + $_.Exception.Message)
      }
    }
  } catch {
    Write-Trace ("Install backup discovery warning: " + $_.Exception.Message)
  }
}

function Cleanup-LegacyLocalInstallerArtifacts {
  if (-not $env:LOCALAPPDATA) {
    return
  }

  $legacyRoot = Join-Path $env:LOCALAPPDATA "AiOmniOps"
  if (-not (Test-Path -LiteralPath $legacyRoot)) {
    return
  }

  $legacyTargets = @(
    (Join-Path $legacyRoot "updates"),
    (Join-Path $legacyRoot "downloads"),
    (Join-Path $legacyRoot "apply-runs"),
    (Join-Path $legacyRoot "extract")
  )

  foreach ($targetPath in $legacyTargets) {
    try {
      Write-Trace ("Cleanup legacy local installer artifact: " + [string]$targetPath)
      Remove-PathIfExists -Path $targetPath
    } catch {
      Write-Trace ("Legacy local installer artifact cleanup warning: " + $_.Exception.Message)
    }
  }

  $legacyLogsRoot = Join-Path $legacyRoot "logs"
  $legacyLogPatterns = @(
    "install-local-single-user.log",
    "local-single-user-updater*.log",
    "updater-launcher*.log"
  )

  if (Test-Path -LiteralPath $legacyLogsRoot) {
    foreach ($pattern in $legacyLogPatterns) {
      foreach ($logFile in @(Get-ChildItem -LiteralPath $legacyLogsRoot -Filter $pattern -File -ErrorAction SilentlyContinue)) {
        try {
          Write-Trace ("Cleanup legacy local installer log: " + [string]$logFile.FullName)
          Remove-PathIfExists -Path $logFile.FullName
        } catch {
          Write-Trace ("Legacy local installer log cleanup warning: " + $_.Exception.Message)
        }
      }
    }
  }

  Remove-EmptyDirectoryIfExists -Path $legacyLogsRoot
  Remove-EmptyDirectoryIfExists -Path $legacyRoot
}

function Cleanup-StaleInstallBackups {
  param(
    [string[]]$BackupRoots = @()
  )

  foreach ($backupPath in @($BackupRoots | Where-Object { $_ })) {
    try {
      Write-Trace ("Pre-clean stale install backup root: " + [string]$backupPath)
      Remove-PathIfExists -Path $backupPath
    } catch {
      Write-Trace ("Pre-clean stale install backup warning: " + $_.Exception.Message)
    }

    try {
      if (Test-Path -LiteralPath $backupPath) {
        Write-Trace ("Schedule deferred pre-clean for stale install backup root: " + [string]$backupPath)
        Start-DeferredDirectoryCleanup -TargetDirectory $backupPath
      }
    } catch {
      Write-Trace ("Deferred pre-clean stale install backup warning: " + $_.Exception.Message)
    }
  }
}

function Cleanup-StaleUpdateArtifactsBeforeInstall {
  if (-not $script:Config.updatesRoot) {
    return
  }

  $updatesRoot = [string]$script:Config.updatesRoot
  if (-not (Test-Path -LiteralPath $updatesRoot)) {
    return
  }

  $currentRunRoot = if ($script:RunRoot) { [string]$script:RunRoot } else { $null }
  $currentDownloadRoot = if ($script:Config.zipPath) { Split-Path -Parent ([string]$script:Config.zipPath) } else { $null }
  $downloadsRoot = Join-Path $updatesRoot "downloads"
  $applyRunsRoot = Join-Path $updatesRoot "apply-runs"

  foreach ($extractDir in @(Get-ChildItem -LiteralPath $updatesRoot -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "extract-*" })) {
    try {
      Write-Trace ("Pre-clean historical extract root: " + [string]$extractDir.FullName)
      Remove-PathIfExists -Path $extractDir.FullName
    } catch {
      Write-Trace ("Pre-clean historical extract warning: " + $_.Exception.Message)
    }
  }

  if (Test-Path -LiteralPath $downloadsRoot) {
    foreach ($downloadDir in @(Get-ChildItem -LiteralPath $downloadsRoot -Directory -ErrorAction SilentlyContinue)) {
      if ($currentDownloadRoot -and ([string]$downloadDir.FullName).TrimEnd("\") -eq $currentDownloadRoot.TrimEnd("\")) {
        continue
      }
      try {
        Write-Trace ("Pre-clean historical downloaded release root: " + [string]$downloadDir.FullName)
        Remove-PathIfExists -Path $downloadDir.FullName
      } catch {
        Write-Trace ("Pre-clean historical downloaded release warning: " + $_.Exception.Message)
      }
    }
  }

  if (Test-Path -LiteralPath $applyRunsRoot) {
    foreach ($runDir in @(Get-ChildItem -LiteralPath $applyRunsRoot -Directory -ErrorAction SilentlyContinue)) {
      if ($currentRunRoot -and ([string]$runDir.FullName).TrimEnd("\") -eq $currentRunRoot.TrimEnd("\")) {
        continue
      }
      try {
        Write-Trace ("Pre-clean historical apply run root: " + [string]$runDir.FullName)
        Remove-PathIfExists -Path $runDir.FullName
      } catch {
        Write-Trace ("Pre-clean historical apply run warning: " + $_.Exception.Message)
      }
    }
  }
}

try {
  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "升级配置文件不存在：$ConfigPath"
  }

  $script:ConfigPath = $ConfigPath
  $script:RunRoot = Split-Path -Parent $ConfigPath
  $script:TraceLogPath = Join-Path $script:RunRoot "local-single-user-updater.trace.log"
  Write-Output ("updater-bootstrap-start configPath=" + $ConfigPath)
  Write-Trace ("Updater bootstrap entry. configPath=" + $ConfigPath)
  $script:Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
  Write-Trace ("Updater start. configPath=" + $ConfigPath + "; statusFilePath=" + [string]$script:Config.statusFilePath)
  # #region debug-point B:updater-start
  Send-DebugEvent -HypothesisId "B" -Location "local-single-user-updater.ps1:start" -Message "[DEBUG] updater script started" -Data @{
    configPath = $ConfigPath
    runRoot = $script:RunRoot
    installRoot = [string]$script:Config.installRoot
    releaseTag = [string]$script:Config.releaseTag
    zipPath = [string]$script:Config.zipPath
    statusFilePath = [string]$script:Config.statusFilePath
  }
  # #endregion
  if (-not (Test-Path -LiteralPath $script:Config.zipPath)) {
    throw "待安装的升级包不存在：$($script:Config.zipPath)"
  }
  if (-not (Test-Path -LiteralPath $script:Config.installRoot)) {
    New-Item -ItemType Directory -Path $script:Config.installRoot -Force | Out-Null
  }
  $existingBackups = Get-BackupRootCandidates
  Cleanup-StaleInstallBackups -BackupRoots $existingBackups
  Cleanup-StaleUpdateArtifactsBeforeInstall
  Cleanup-LegacyLocalInstallerArtifacts

  Write-Status -Phase "APPLYING" -Message "升级器已启动，正在校验升级包。"
  Write-Trace ("Validate zip: " + [string]$script:Config.zipPath)

  $hash = (Get-FileHash -LiteralPath $script:Config.zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne ([string]$script:Config.expectedSha256).ToLowerInvariant()) {
    # #region debug-point B:sha256-mismatch
    Send-DebugEvent -HypothesisId "B" -Location "local-single-user-updater.ps1:sha256-mismatch" -Message "[DEBUG] updater zip sha256 mismatch" -Data @{
      expectedSha256 = [string]$script:Config.expectedSha256
      actualSha256 = [string]$hash
      zipPath = [string]$script:Config.zipPath
    }
    # #endregion
    throw "升级包 SHA256 校验失败。期望 $($script:Config.expectedSha256)，实际 $hash"
  }
  # #region debug-point B:sha256-ok
  Send-DebugEvent -HypothesisId "B" -Location "local-single-user-updater.ps1:sha256-ok" -Message "[DEBUG] updater zip sha256 verified" -Data @{
    expectedSha256 = [string]$script:Config.expectedSha256
    zipPath = [string]$script:Config.zipPath
  }
  # #endregion

  Write-Status -Phase "APPLYING" -Message "升级包校验通过，正在停止当前本地运行时。"
  Write-Trace "Zip validation passed. Stop current runtime."
  # Give the API request a brief window to flush its JSON response before we stop the current runtime.
  Start-Sleep -Seconds 3
  Stop-RuntimeFromMetadata

  $extractRoot = Join-Path $script:RunRoot ("release-extract-" + ((Get-Date).ToString("yyyyMMdd-HHmmss")) + "-" + $script:Config.releaseTag)
  if (Test-Path -LiteralPath $extractRoot) {
    Remove-Item -LiteralPath $extractRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null

  Write-Status -Phase "APPLYING" -Message "正在解压升级包。"
  Write-Trace ("Expand archive to " + $extractRoot)
  Expand-Archive -LiteralPath $script:Config.zipPath -DestinationPath $extractRoot -Force

  $releaseRoot = Resolve-ReleaseRoot -ExtractionRoot $extractRoot
  $installerPath = Join-Path $releaseRoot "install-local-single-user.ps1"
  if (-not (Test-Path -LiteralPath $installerPath)) {
    throw "升级包内缺少安装脚本：$installerPath"
  }

  Write-Status -Phase "APPLYING" -Message "正在替换本地安装目录。"
  Write-Trace ("Run installer from " + $installerPath)
  $installerStdoutPath = Join-Path $script:RunRoot "install-local-single-user.stdout.log"
  $installerStderrPath = Join-Path $script:RunRoot "install-local-single-user.stderr.log"
  # #region debug-point B:install-script-start
  Send-DebugEvent -HypothesisId "B" -Location "local-single-user-updater.ps1:install-script-start" -Message "[DEBUG] updater install script starting" -Data @{
    installRoot = [string]$script:Config.installRoot
    releaseRoot = [string]$releaseRoot
    backupRoot = [string]$backupRoot
    installerPath = [string]$installerPath
  }
  # #endregion
  Invoke-PowerShellFileWithHeartbeat `
    -ScriptPath $installerPath `
    -ArgumentList @("-InstallRoot", [string]$script:Config.installRoot, "-NoDesktopShortcut", "-NoLaunch") `
    -ActivityMessage "正在替换本地安装目录，慢机器可能需要更久，请不要关闭当前工作台。" `
    -HeartbeatSeconds 5 `
    -StdoutPath $installerStdoutPath `
    -StderrPath $installerStderrPath
  Write-Trace "Installer process exit code=0"
  # #region debug-point B:install-script-finished
  Send-DebugEvent -HypothesisId "B" -Location "local-single-user-updater.ps1:install-script-finished" -Message "[DEBUG] updater install script finished" -Data @{
    installRoot = [string]$script:Config.installRoot
    releaseTag = [string]$script:Config.releaseTag
    installerStdoutPath = [string]$installerStdoutPath
    installerStderrPath = [string]$installerStderrPath
  }
  # #endregion

  $backupRoot = Resolve-NewBackupRoot -ExistingBackups $existingBackups
  $restartStartedAt = Get-Date
  Write-Status -Phase "APPLYING" -Message "升级安装完成，正在重新启动并验活本地工作台。"
  Write-Trace ("Installer finished. backupRoot=" + [string]$backupRoot)
  Start-RestartCommand
  $runtimeReady = Wait-ForRuntimeReady -StartedAfter $restartStartedAt -TimeoutSeconds $RuntimeReadyTimeoutSeconds
  $readyMetadata = $runtimeReady.metadata
  # #region debug-point C:runtime-ready
  Send-DebugEvent -HypothesisId "C" -Location "local-single-user-updater.ps1:runtime-ready" -Message "[DEBUG] updater runtime ready confirmed" -Data @{
    installedReleaseTag = [string]$runtimeReady.installedReleaseTag
    apiStatus = [int]$runtimeReady.apiStatus
    webStatus = [int]$runtimeReady.webStatus
    apiHealthUrl = [string]$runtimeReady.apiHealthUrl
    previewUrl = [string]$runtimeReady.previewUrl
    browserUrl = [string]$runtimeReady.browserUrl
  }
  # #endregion
  Write-Status -Phase "SUCCEEDED" -Message "升级安装完成，新版本已通过本地 API / Web 验活。" -Extra @{
    downloadedReleaseTag = $null
    downloadedZipPath = $null
    downloadedChecksumPath = $null
    downloadedAt = $null
    expectedSha256 = $null
    browserUrl = if ($readyMetadata) { [string]$readyMetadata.browserUrl } else { [string]$runtimeReady.browserUrl }
    previewUrl = if ($readyMetadata) { [string]$readyMetadata.previewUrl } else { [string]$runtimeReady.previewUrl }
    apiHealthUrl = if ($readyMetadata) { [string]$readyMetadata.apiHealthUrl } else { [string]$runtimeReady.apiHealthUrl }
    rollbackAvailable = [bool]$backupRoot
  }
  Write-Trace ("Upgrade succeeded. installedReleaseTag=" + [string]$runtimeReady.installedReleaseTag)
  Cleanup-InstallBackups
  Cleanup-UpdateArtifacts -ExtractRoot $extractRoot
  Cleanup-HistoricalUpdateArtifacts
  Cleanup-LegacyLocalInstallerArtifacts
} catch {
  $rootErrorMessage = $_.Exception.Message
  Write-Trace ("Upgrade failed: " + $rootErrorMessage)
  $canAttemptRollback = $script:Config -and $script:Config.installRoot
  $backupRoot = if ($backupRoot) {
    $backupRoot
  } elseif ($canAttemptRollback) {
    Resolve-NewBackupRoot -ExistingBackups $existingBackups
  } else {
    $null
  }

  if ($backupRoot -and (Test-Path -LiteralPath $backupRoot)) {
    try {
      $rollbackExpectedReleaseTag = Read-ReleaseTagFromInstallRoot -InstallRoot $backupRoot
      # #region debug-point C:rollback-start
      Send-DebugEvent -HypothesisId "C" -Location "local-single-user-updater.ps1:rollback-start" -Message "[DEBUG] updater rollback starting" -Data @{
        backupRoot = [string]$backupRoot
        rootErrorMessage = [string]$rootErrorMessage
        expectedReleaseTag = [string]$rollbackExpectedReleaseTag
      }
      # #endregion
      Restore-BackupInstall -BackupRoot $backupRoot
      $rollbackRestartedAt = Get-Date
      Write-Status -Phase "APPLYING" -Message "上一版本已恢复，正在重新启动并验活。"
      Write-Trace ("Rollback restored backupRoot=" + $backupRoot)
      Start-RestartCommand
      $rollbackRuntime = Wait-ForRuntimeReady -StartedAfter $rollbackRestartedAt -ExpectedReleaseTag $rollbackExpectedReleaseTag -TimeoutSeconds $RuntimeReadyTimeoutSeconds
      $rollbackMetadata = $rollbackRuntime.metadata
      # #region debug-point C:rollback-ready
      Send-DebugEvent -HypothesisId "C" -Location "local-single-user-updater.ps1:rollback-ready" -Message "[DEBUG] updater rollback runtime ready confirmed" -Data @{
        installedReleaseTag = [string]$rollbackRuntime.installedReleaseTag
        apiStatus = [int]$rollbackRuntime.apiStatus
        webStatus = [int]$rollbackRuntime.webStatus
      }
      # #endregion
      Write-Status -Phase "FAILED" -Message ("升级失败，已自动回滚到上一版本。原因：" + $rootErrorMessage) -Extra @{
        rollbackSucceeded = $true
        restoredBackupRoot = $backupRoot
        restoredReleaseTag = $rollbackRuntime.installedReleaseTag
        browserUrl = if ($rollbackMetadata) { [string]$rollbackMetadata.browserUrl } else { [string]$rollbackRuntime.browserUrl }
        previewUrl = if ($rollbackMetadata) { [string]$rollbackMetadata.previewUrl } else { [string]$rollbackRuntime.previewUrl }
        apiHealthUrl = if ($rollbackMetadata) { [string]$rollbackMetadata.apiHealthUrl } else { [string]$rollbackRuntime.apiHealthUrl }
      }
      Write-Trace ("Rollback succeeded. installedReleaseTag=" + [string]$rollbackRuntime.installedReleaseTag)
      exit 1
    } catch {
      $rollbackErrorMessage = $_.Exception.Message
      # #region debug-point C:rollback-failed
      Send-DebugEvent -HypothesisId "C" -Location "local-single-user-updater.ps1:rollback-failed" -Message "[DEBUG] updater rollback failed" -Data @{
        rootErrorMessage = [string]$rootErrorMessage
        rollbackErrorMessage = [string]$rollbackErrorMessage
        backupRoot = [string]$backupRoot
      }
      # #endregion
      Write-Status -Phase "FAILED" -Message ("升级失败，且自动回滚失败。升级原因：" + $rootErrorMessage + "；回滚原因：" + $rollbackErrorMessage) -Extra @{
        rollbackSucceeded = $false
        restoredBackupRoot = $backupRoot
      }
      throw
    }
  }

  Write-Status -Phase "FAILED" -Message $rootErrorMessage -Extra @{
    rollbackSucceeded = $false
  }
  # #region debug-point B:updater-failed
  Send-DebugEvent -HypothesisId "B" -Location "local-single-user-updater.ps1:failed" -Message "[DEBUG] updater failed without rollback" -Data @{
    rootErrorMessage = [string]$rootErrorMessage
    releaseTag = [string]$script:Config.releaseTag
    zipPath = [string]$script:Config.zipPath
  }
  # #endregion
  throw
}

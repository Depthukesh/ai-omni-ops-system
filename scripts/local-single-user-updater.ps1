param(
  [Parameter(Mandatory = $true)]
  [string]$ConfigPath
)

$ErrorActionPreference = "Stop"

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

  $directory = Split-Path -Parent $script:Config.statusFilePath
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
  $json = $payload | ConvertTo-Json -Depth 8
  Set-Content -LiteralPath $script:Config.statusFilePath -Value $json -Encoding UTF8
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
  if (-not $script:Config.restartCommandPath) {
    return
  }
  if (-not (Test-Path -LiteralPath $script:Config.restartCommandPath)) {
    return
  }
  $workingDirectory = Split-Path -Parent $script:Config.restartCommandPath
  $cmdExe = Join-Path $env:SystemRoot "System32\cmd.exe"
  if (-not (Test-Path -LiteralPath $cmdExe)) {
    $cmdExe = "cmd.exe"
  }
  $localAppRoot = [string]$script:Config.localAppRoot
  $runtimeMode = if ($script:Config.appRuntimeMode) { [string]$script:Config.appRuntimeMode } else { "local-single-user" }
  $command = @(
    "set ""APP_RUNTIME_MODE=$runtimeMode""",
    "set ""LOCAL_APP_DATA_ROOT=$localAppRoot""",
    "set ""AI_OMNI_LOCAL_ROOT=$localAppRoot""",
    "set ""LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER=false""",
    "call ""$($script:Config.restartCommandPath)"""
  ) -join " && "
  Start-Process -FilePath $cmdExe -ArgumentList "/d", "/c", $command -WorkingDirectory $workingDirectory -WindowStyle Hidden
}

try {
  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "升级配置文件不存在：$ConfigPath"
  }

  $script:Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
  if (-not (Test-Path -LiteralPath $script:Config.zipPath)) {
    throw "待安装的升级包不存在：$($script:Config.zipPath)"
  }
  if (-not (Test-Path -LiteralPath $script:Config.installRoot)) {
    New-Item -ItemType Directory -Path $script:Config.installRoot -Force | Out-Null
  }

  Write-Status -Phase "APPLYING" -Message "升级器已启动，正在校验升级包。"

  $hash = (Get-FileHash -LiteralPath $script:Config.zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -ne ([string]$script:Config.expectedSha256).ToLowerInvariant()) {
    throw "升级包 SHA256 校验失败。期望 $($script:Config.expectedSha256)，实际 $hash"
  }

  Write-Status -Phase "APPLYING" -Message "升级包校验通过，正在停止当前本地运行时。"
  Stop-RuntimeFromMetadata

  $extractRoot = Join-Path $script:Config.updatesRoot ("extract-" + ((Get-Date).ToString("yyyyMMdd-HHmmss")) + "-" + $script:Config.releaseTag)
  if (Test-Path -LiteralPath $extractRoot) {
    Remove-Item -LiteralPath $extractRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null

  Write-Status -Phase "APPLYING" -Message "正在解压升级包。"
  Expand-Archive -LiteralPath $script:Config.zipPath -DestinationPath $extractRoot -Force

  $releaseRoot = Resolve-ReleaseRoot -ExtractionRoot $extractRoot
  $installerPath = Join-Path $releaseRoot "install-local-single-user.ps1"
  if (-not (Test-Path -LiteralPath $installerPath)) {
    throw "升级包内缺少安装脚本：$installerPath"
  }

  Write-Status -Phase "APPLYING" -Message "正在替换本地安装目录。"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath -InstallRoot $script:Config.installRoot -NoDesktopShortcut

  Write-Status -Phase "SUCCEEDED" -Message "升级安装完成，正在重新启动本地工作台。"
  Start-RestartCommand
} catch {
  Write-Status -Phase "FAILED" -Message $_.Exception.Message
  throw
}

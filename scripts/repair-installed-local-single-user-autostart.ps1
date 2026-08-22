$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceHelper = Join-Path $scriptRoot "local-single-user-autostart.ps1"
$installRoot = Join-Path $env:LOCALAPPDATA "Programs\AiOmniOps"
$targetHelper = Join-Path $installRoot "app\scripts\local-single-user-autostart.ps1"
$startCommand = Join-Path $installRoot "start-local-single-user.cmd"
$installAutostartCommand = Join-Path $installRoot "install-autostart.cmd"
$statusAutostartCommand = Join-Path $installRoot "status-autostart.cmd"
$backupPath = "$targetHelper.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$apiHealthUrl = "http://127.0.0.1:3011/api/health"
$previewUrl = "http://127.0.0.1:3001/brand-growth"
$runtimeMetadataPath = if ($env:APPDATA) { Join-Path $env:APPDATA "AiOmniOps\runtime\local-single-user-runtime.json" } else { "" }

function Read-RuntimeMetadata {
  if (-not $runtimeMetadataPath -or -not (Test-Path $runtimeMetadataPath)) {
    return $null
  }

  try {
    $raw = [System.IO.File]::ReadAllText($runtimeMetadataPath)
    if ($raw.Length -gt 0 -and [int][char]$raw[0] -eq 65279) {
      $raw = $raw.Substring(1)
    }
    if (-not $raw.Trim()) {
      return $null
    }
    return $raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

if (-not (Test-Path $sourceHelper)) {
  throw "Missing source helper: $sourceHelper"
}

if (-not (Test-Path $targetHelper)) {
  throw "Missing installed helper: $targetHelper"
}

if (-not (Test-Path $startCommand)) {
  throw "Missing start command: $startCommand"
}

if (-not (Test-Path $installAutostartCommand)) {
  throw "Missing autostart install command: $installAutostartCommand"
}

Copy-Item -LiteralPath $targetHelper -Destination $backupPath -Force
Copy-Item -LiteralPath $sourceHelper -Destination $targetHelper -Force

Write-Host "Backed up previous helper: $backupPath"
Write-Host "Patched installed helper: $targetHelper"
Write-Host "Re-registering autostart..."

& $installAutostartCommand
if ($LASTEXITCODE -ne 0) {
  throw "Autostart re-registration failed with exit code $LASTEXITCODE"
}

if (Test-Path $statusAutostartCommand) {
  Write-Host "Autostart status:"
  & $statusAutostartCommand
}

Start-Process -FilePath $startCommand -WorkingDirectory $installRoot -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds(90)
$apiReady = $false
$webReady = $false
$lastPreviewUrl = $previewUrl
$lastApiHealthUrl = $apiHealthUrl

while ((Get-Date) -lt $deadline) {
  $runtimeMetadata = Read-RuntimeMetadata
  if ($runtimeMetadata) {
    if ([string]$runtimeMetadata.apiHealthUrl) {
      $lastApiHealthUrl = [string]$runtimeMetadata.apiHealthUrl
    }
    if ([string]$runtimeMetadata.previewUrl) {
      $lastPreviewUrl = [string]$runtimeMetadata.previewUrl
    } elseif ([string]$runtimeMetadata.browserUrl) {
      $lastPreviewUrl = [string]$runtimeMetadata.browserUrl
    }
  }

  try {
    $apiStatus = (Invoke-WebRequest -UseBasicParsing $lastApiHealthUrl -TimeoutSec 3).StatusCode
    if ($apiStatus -eq 200) {
      $apiReady = $true
    }
  } catch {}

  try {
    $webStatus = (Invoke-WebRequest -UseBasicParsing $lastPreviewUrl -TimeoutSec 3).StatusCode
    if ($webStatus -in 200, 307, 308) {
      $webReady = $true
    }
  } catch {}

  if ($apiReady -and $webReady) {
    break
  }

  Start-Sleep -Seconds 2
}

if (-not $apiReady -or -not $webReady) {
  throw "Helper patch completed, but the local workspace did not become ready within 90 seconds. Check $env:APPDATA\AiOmniOps\logs"
}

Write-Host "Repair complete."
Write-Host "API: $lastApiHealthUrl"
Write-Host "Page: $lastPreviewUrl"

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$installRoot = Split-Path -Parent $projectRoot
$startCommand = Join-Path $installRoot "start-local-single-user.cmd"
$defaultLocalAppRoot = if ($env:APPDATA) { Join-Path $env:APPDATA "AiOmniOps" } else { "" }
$apiHealthUrl = "http://127.0.0.1:3011/api/health"
$webReadyUrl = "http://127.0.0.1:3001/brand-growth"
$debugEnvPath = Join-Path $projectRoot ".dbg\reboot-page-unreachable.env"

function Resolve-EffectiveLocalAppRoot {
  $nodeExe = Join-Path $installRoot "bin\node.exe"
  if (-not (Test-Path $nodeExe)) {
    $nodeExe = "node"
  }

  $settingsScript = Join-Path $scriptRoot "local-single-user-launch-settings.cjs"
  if (-not (Test-Path $settingsScript)) {
    return $defaultLocalAppRoot
  }

  try {
    $resolvedRoot = (& $nodeExe $settingsScript resolve-root 2>$null | Out-String).Trim()
    if ($resolvedRoot) {
      return $resolvedRoot
    }
  } catch {
  }

  return $defaultLocalAppRoot
}

$localAppRoot = Resolve-EffectiveLocalAppRoot
$logsRoot = if ($localAppRoot) { Join-Path $localAppRoot "logs" } else { "" }
$helperLogPath = if ($logsRoot) { Join-Path $logsRoot "autostart-helper.log" } else { "" }
$runtimeMetadataPath = if ($localAppRoot) { Join-Path $localAppRoot "runtime\local-single-user-runtime.json" } else { "" }
$lifecycleStatePath = if ($localAppRoot) { Join-Path $localAppRoot "runtime\local-single-user-lifecycle.json" } else { "" }

if (-not (Test-Path $startCommand)) {
  throw "Missing start command: $startCommand"
}

function Write-HelperLog {
  param(
    [string]$Message
  )

  if (-not $helperLogPath) {
    return
  }

  try {
    New-Item -ItemType Directory -Path $logsRoot -Force | Out-Null
    Add-Content -Path $helperLogPath -Value ("[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message) -Encoding UTF8
  } catch {
    # Ignore helper log failures.
  }
}

function Read-LifecycleState {
  if (-not $lifecycleStatePath -or -not (Test-Path $lifecycleStatePath)) {
    return $null
  }

  try {
    $raw = [System.IO.File]::ReadAllText($lifecycleStatePath)
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

function Write-AutostartLifecycleState {
  param(
    [string]$Phase,
    [string]$Message,
    [int]$Attempt = 0
  )

  if (-not $lifecycleStatePath) {
    return
  }

  try {
    $directory = Split-Path -Parent $lifecycleStatePath
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $existing = Read-LifecycleState
    $payload = @{}
    if ($existing) {
      foreach ($property in $existing.PSObject.Properties) {
        $payload[$property.Name] = $property.Value
      }
    }
    $payload["updatedAt"] = (Get-Date).ToString("o")
    $payload["phase"] = $Phase
    $payload["source"] = "autostart-helper"
    $payload["installRoot"] = $installRoot
    $payload["localAppRoot"] = $localAppRoot
    $payload["runtimeMetadataPath"] = $runtimeMetadataPath
    $payload["message"] = $Message
    if ($Attempt -gt 0) {
      $payload["autostartAttempt"] = $Attempt
    }
    ($payload | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $lifecycleStatePath -Encoding UTF8
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

  $debugServerUrl = "http://127.0.0.1:7777/event"
  $debugSessionId = "reboot-page-unreachable"

  try {
    if (Test-Path $debugEnvPath) {
      $envLines = Get-Content -Path $debugEnvPath -ErrorAction Stop
      foreach ($line in $envLines) {
        if ($line -like "DEBUG_SERVER_URL=*") {
          $debugServerUrl = $line.Substring("DEBUG_SERVER_URL=".Length).Trim()
          continue
        }
        if ($line -like "DEBUG_SESSION_ID=*") {
          $debugSessionId = $line.Substring("DEBUG_SESSION_ID=".Length).Trim()
        }
      }
    }
  } catch {
    # Ignore debug env read failures.
  }

  try {
    Invoke-WebRequest -UseBasicParsing -Uri $debugServerUrl -Method Post -ContentType "application/json" -Body (@{
        sessionId = $debugSessionId
        runId = "pre-fix"
        hypothesisId = $HypothesisId
        location = $Location
        msg = $Message
        data = $Data
        ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
      } | ConvertTo-Json -Compress) | Out-Null
  } catch {
    # Ignore debug upload failures.
  }
}

function Test-UrlReady {
  param(
    [string]$Url,
    [int[]]$AcceptedStatusCodes
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5 -MaximumRedirection 0 -ErrorAction Stop
    return $AcceptedStatusCodes -contains ([int]$response.StatusCode)
  } catch {
    $statusCode = $null
    if ($_.Exception -and $_.Exception.Response -and $_.Exception.Response.StatusCode) {
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode
      } catch {
        $statusCode = $null
      }
    }
    if ($null -ne $statusCode) {
      return $AcceptedStatusCodes -contains $statusCode
    }
    return $false
  }
}

function Test-WorkbenchReady {
  $effectiveApiHealthUrl = $apiHealthUrl
  $effectiveWebReadyUrl = $webReadyUrl
  $runtimeMetadata = Read-RuntimeMetadata
  if ($runtimeMetadata) {
    if ([string]$runtimeMetadata.apiHealthUrl) {
      $effectiveApiHealthUrl = [string]$runtimeMetadata.apiHealthUrl
    }
    if ([string]$runtimeMetadata.previewUrl) {
      $effectiveWebReadyUrl = [string]$runtimeMetadata.previewUrl
    } elseif ([string]$runtimeMetadata.browserUrl) {
      $effectiveWebReadyUrl = [string]$runtimeMetadata.browserUrl
    }
  }
  $lifecycleState = Read-LifecycleState
  if ($lifecycleState) {
    if ([string]$lifecycleState.apiHealthUrl) {
      $effectiveApiHealthUrl = [string]$lifecycleState.apiHealthUrl
    }
    if ([string]$lifecycleState.previewUrl) {
      $effectiveWebReadyUrl = [string]$lifecycleState.previewUrl
    } elseif ([string]$lifecycleState.browserUrl) {
      $effectiveWebReadyUrl = [string]$lifecycleState.browserUrl
    }
  }

  $apiReady = Test-UrlReady -Url $effectiveApiHealthUrl -AcceptedStatusCodes @(200)
  if (-not $apiReady) {
    return $false
  }
  return Test-UrlReady -Url $effectiveWebReadyUrl -AcceptedStatusCodes @(200, 307, 308)
}

function Wait-WorkbenchReady {
  param(
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $lifecycleState = Read-LifecycleState
    if ($lifecycleState -and [string]$lifecycleState.phase -eq "FAILED") {
      return @{
        Ready = $false
        LifecyclePhase = [string]$lifecycleState.phase
        LifecycleError = [string]$lifecycleState.error
      }
    }
    if (Test-WorkbenchReady) {
      return @{
        Ready = $true
        LifecyclePhase = if ($lifecycleState) { [string]$lifecycleState.phase } else { "" }
        LifecycleError = if ($lifecycleState) { [string]$lifecycleState.error } else { "" }
      }
    }
    Start-Sleep -Seconds 2
  }
  $lastLifecycleState = Read-LifecycleState
  return @{
    Ready = $false
    LifecyclePhase = if ($lastLifecycleState) { [string]$lastLifecycleState.phase } else { "" }
    LifecycleError = if ($lastLifecycleState) { [string]$lastLifecycleState.error } else { "" }
  }
}

function Start-WorkbenchHidden {
  Write-HelperLog ("Launching start command: " + $startCommand)
  # #region debug-point A:autostart-launch
  Send-DebugEvent -HypothesisId "A" -Location "scripts/local-single-user-autostart.ps1:Start-WorkbenchHidden" -Message "[DEBUG] autostart helper launching start command" -Data @{
    startCommand = $startCommand
    installRoot = $installRoot
  }
  # #endregion
  Start-Process -FilePath $startCommand -WorkingDirectory $installRoot -WindowStyle Hidden
}

# Do not pop the browser automatically on Windows logon.
$env:LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER = "false"
$env:LOCAL_SINGLE_USER_PREBUILT_ONLY = "true"

# #region debug-point A:autostart-env
Send-DebugEvent -HypothesisId "A" -Location "scripts/local-single-user-autostart.ps1" -Message "[DEBUG] autostart helper launching" -Data @{
  startCommand = $startCommand
  prebuiltOnly = [string]$env:LOCAL_SINGLE_USER_PREBUILT_ONLY
  autoOpenBrowser = [string]$env:LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER
  apiHealthUrl = $apiHealthUrl
  webReadyUrl = $webReadyUrl
  localAppRoot = $localAppRoot
  runtimeMetadataPath = $runtimeMetadataPath
  lifecycleStatePath = $lifecycleStatePath
}
# #endregion

if (Test-WorkbenchReady) {
  Write-HelperLog "Workbench already healthy; autostart helper exits without relaunch."
  Write-AutostartLifecycleState -Phase "READY" -Message "Autostart helper detected a healthy existing runtime before relaunch."
  # #region debug-point E:autostart-already-healthy
  Send-DebugEvent -HypothesisId "E" -Location "scripts/local-single-user-autostart.ps1:already-healthy" -Message "[DEBUG] autostart helper detected healthy runtime before relaunch"
  # #endregion
  exit 0
}

Write-AutostartLifecycleState -Phase "STARTING" -Message "Autostart helper is launching local workspace after Windows sign-in." -Attempt 1
Start-WorkbenchHidden

$firstWaitResult = Wait-WorkbenchReady -TimeoutSeconds 90
if ($firstWaitResult.Ready) {
  Write-HelperLog "Workbench became healthy after first autostart launch."
  Write-AutostartLifecycleState -Phase "READY" -Message "Autostart helper confirmed the runtime became healthy after first launch." -Attempt 1
  # #region debug-point A:first-launch-healthy
  Send-DebugEvent -HypothesisId "A" -Location "scripts/local-single-user-autostart.ps1:first-launch" -Message "[DEBUG] workbench became healthy after first autostart launch"
  # #endregion
  exit 0
}

Write-HelperLog "Workbench did not become healthy after first autostart launch; retrying once."
# #region debug-point B:first-launch-unhealthy
Send-DebugEvent -HypothesisId "B" -Location "scripts/local-single-user-autostart.ps1:first-launch-timeout" -Message "[DEBUG] workbench still unhealthy after first autostart launch; retrying once" -Data @{
  firstLaunchWaitSeconds = 90
  lifecyclePhase = [string]$firstWaitResult.LifecyclePhase
  lifecycleError = [string]$firstWaitResult.LifecycleError
}
# #endregion
Write-AutostartLifecycleState -Phase "STARTING" -Message "Autostart helper is retrying local workspace launch after first attempt did not become healthy." -Attempt 2
Start-WorkbenchHidden

$secondWaitResult = Wait-WorkbenchReady -TimeoutSeconds 60
if ($secondWaitResult.Ready) {
  Write-HelperLog "Workbench became healthy after second autostart launch."
  Write-AutostartLifecycleState -Phase "READY" -Message "Autostart helper confirmed the runtime became healthy after second launch." -Attempt 2
  # #region debug-point C:second-launch-healthy
  Send-DebugEvent -HypothesisId "C" -Location "scripts/local-single-user-autostart.ps1:second-launch" -Message "[DEBUG] workbench became healthy after second autostart launch"
  # #endregion
  exit 0
}

Write-HelperLog "Autostart helper finished but workbench is still not healthy."
Write-AutostartLifecycleState -Phase "FAILED" -Message ("Autostart helper did not observe a healthy runtime after retry. lifecyclePhase={0}; lifecycleError={1}" -f [string]$secondWaitResult.LifecyclePhase, [string]$secondWaitResult.LifecycleError) -Attempt 2
# #region debug-point D:autostart-finished-unhealthy
Send-DebugEvent -HypothesisId "D" -Location "scripts/local-single-user-autostart.ps1:finished-unhealthy" -Message "[DEBUG] autostart helper finished but workbench is still not healthy" -Data @{
  firstLaunchWaitSeconds = 90
  secondLaunchWaitSeconds = 60
  lifecyclePhase = [string]$secondWaitResult.LifecyclePhase
  lifecycleError = [string]$secondWaitResult.LifecycleError
  lifecycleStatePath = $lifecycleStatePath
}
# #endregion

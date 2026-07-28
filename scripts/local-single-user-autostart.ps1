$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$launcherScript = Join-Path $scriptRoot "local-single-user-launcher.cjs"
$bundledNode = Join-Path $projectRoot "bin\\node.exe"

Set-Location $projectRoot

# Do not pop the browser automatically on Windows logon.
$env:LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER = "false"

if (Test-Path $bundledNode) {
  & $bundledNode $launcherScript
  exit $LASTEXITCODE
}

$nodeCommand = Get-Command node -ErrorAction Stop
& $nodeCommand.Source $launcherScript

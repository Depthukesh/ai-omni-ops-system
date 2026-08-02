$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$installRoot = Split-Path -Parent $projectRoot
$startCommand = Join-Path $installRoot "start-local-single-user.cmd"

if (-not (Test-Path $startCommand)) {
  throw "Missing start command: $startCommand"
}

# Do not pop the browser automatically on Windows logon.
$env:LOCAL_SINGLE_USER_AUTO_OPEN_BROWSER = "false"

Start-Process -FilePath $startCommand -WorkingDirectory $installRoot -WindowStyle Hidden

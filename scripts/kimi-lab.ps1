$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $PSScriptRoot "kimi-lab.cjs"

if (-not (Test-Path $scriptPath)) {
  throw "未找到脚本: $scriptPath"
}

Push-Location $projectRoot
try {
  & node $scriptPath @args
} finally {
  Pop-Location
}

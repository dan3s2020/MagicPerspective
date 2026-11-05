$ErrorActionPreference = 'Stop'
$local = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'isolated\noise-space\START_WINDOWS.ps1'
if (-not (Test-Path -LiteralPath $local)) { throw "Isolated launcher missing: $local" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $local
if ($LASTEXITCODE -ne 0) { throw "Isolated launcher failed: $LASTEXITCODE" }

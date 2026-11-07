# MagicPerspective — Living Labyrinth. Separate, live, OBSERVED training.
# Does NOT overwrite original V17 UI/Brain, other agents, or existing checkpoints.
# Native original V17 CUDA worker remains available via START_V17.ps1.
param(
 [string]$Data = "D:\training\OpenThoughts3-1.2M",
 [string]$Text = "",
 [string]$Events = "",
 [string]$Out = "D:\MagicPerspective-Living-Labyrinth-Run",
 [int]$Port = 8877,
 [int]$Rate = 6,
 [int]$Batch = 2,
 [int]$MaxRows = 0,
 [int]$RowChars = 20000,
 [switch]$Resume,
 [switch]$Start,
 [switch]$NoBrowser
)
$ErrorActionPreference="Stop"
$script = Join-Path $PSScriptRoot "research\path-memory\magic-live.mjs"
$view = Join-Path $PSScriptRoot "research\path-memory\magic-live.html"
if(-not(Test-Path -LiteralPath $script -PathType Leaf)){throw "Real training script missing: $script"}
if(-not(Test-Path -LiteralPath $view -PathType Leaf)){throw "Magic UI missing: $view"}
if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js 22 or newer is required"}
$version = (& node -p 'process.versions.node.Split(".")[0]')
if([int]$version -lt 22){throw "Node.js 22+ required; installed major version: $version"}
if($Text -and $Events){throw "Choose one source: Parquet (-Data), text (-Text) or labeled transitions (-Events)."}
if($Text){$source=$Text;$field="text"}
elseif($Events){$source=$Events;$field="events"}
else {$source=$Data;$field="data"}
if(-not(Test-Path -LiteralPath $source)){throw "Actual observed training data not found: $source"}
if($Port -lt 1024 -or $Port -gt 65535){throw "Port must be 1024..65535"}
$argv=@(
  $script,
  "--$field", $source,
  "--out", $Out,
  "--port", "$Port",
  "--rate", "$Rate",
  "--batch", "$Batch",
  "--max-rows", "$MaxRows",
  "--row-chars", "$RowChars"
)
if($Resume){$argv+="--resume"}
if($Start){$argv+="--start"}
if(-not $NoBrowser){$argv+="--open"}
Write-Host ""
Write-Host "MAGICPERSPECTIVE — THE LIVING LABYRINTH" -ForegroundColor Magenta
Write-Host "Original V17 source: untouched" -ForegroundColor Cyan
Write-Host "Actual observations: $source"
Write-Host "Independent checkpoint: $Out"
Write-Host "Live interface: http://127.0.0.1:$Port/" -ForegroundColor Cyan
Write-Host "Mode: $field (CPU, not a CUDA implementation)" -ForegroundColor Yellow
Write-Host "Start / Pause / Save / Frozen Test are functional UI commands." -ForegroundColor Green
Write-Host "Ctrl+C saves current observation state when possible." -ForegroundColor Green
Write-Host ""
& node --max-old-space-size=6144 @argv
if($LASTEXITCODE -ne 0){throw "Magic training server exited with error code $LASTEXITCODE"}

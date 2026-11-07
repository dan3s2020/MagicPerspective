# MagicPerspective V30: Native original Brain world-atlas service.
# Reads genuine witnessed before/action/after events, never arbitrary Q/A.
# Original V17 checkpoint is read only, and is never overwritten.
param(
  [string]$OriginalBrain = "",
  [string]$Events = "",
  [string]$ParquetData = "",
  [int]$TextSaveEvery = 5000,
  [int]$TextLimit = 0,
  [string]$Out = "runtime-v30",
  [int]$Port = 8901,
  [int]$MaxStates = 256,
  [int]$MaxDepth = 8,
  [int]$SaveEvery = 250,
  [switch]$Resume
)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$major = & $node -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$major -lt 22) {
    throw "Node.js 22 or newer is required."
}
$runner = Join-Path $PSScriptRoot "research\text-hypermaze\native-atlas-server.mjs"
if (-not (Test-Path -LiteralPath $runner -PathType Leaf)) {
    throw "Native V30 atlas server is missing: $runner"
}
$dest = if ([IO.Path]::IsPathRooted($Out)) {
    $Out
} else {
    Join-Path $PSScriptRoot $Out
}
$checkpoint = Join-Path $dest "original-brain-v30.v8"
$arguments = @(
    $runner, "--out", $dest, "--port", [string]$Port,
    "--max-states", [string]$MaxStates, "--max-depth", [string]$MaxDepth,
    "--save-every", [string]$SaveEvery
)
if ($Resume) {
    if (-not (Test-Path -LiteralPath $checkpoint -PathType Leaf)) {
        throw "Cannot resume: no saved V30 Brain exists: $checkpoint"
    }
    $arguments += "--resume"
} else {
    if (-not $OriginalBrain) {
        throw "Supply -OriginalBrain with an existing trained V17/V29 .v8 checkpoint; no dummy Brain will be substituted."
    }
    if (-not (Test-Path -LiteralPath $OriginalBrain -PathType Leaf)) {
        throw "Original trained Brain checkpoint does not exist: $OriginalBrain"
    }
    if (Test-Path -LiteralPath $checkpoint) {
        throw "V30 checkpoint exists. Use -Resume; no Brain checkpoint is overwritten silently."
    }
    $arguments += @("--brain", (Resolve-Path -LiteralPath $OriginalBrain).Path)
}
if ($ParquetData) {
    if (-not (Test-Path -LiteralPath $ParquetData -PathType Container)) {
        throw "OpenThoughts3 Parquet dataset directory missing: $ParquetData"
    }
    if ($TextSaveEvery -lt 1 -or $TextLimit -lt 0) {
        throw "Invalid real text training interval or limit."
    }
    $arguments += @("--parquet", (Resolve-Path -LiteralPath $ParquetData).Path)
    $arguments += @("--text-save-every", [string]$TextSaveEvery, "--text-limit", [string]$TextLimit)
}
if ($Events) {
    if (-not (Test-Path -LiteralPath $Events -PathType Leaf)) {
        throw "Event log is missing: $Events"
    }
    $arguments += @("--events", (Resolve-Path -LiteralPath $Events).Path)
}
Write-Host "MagicPerspective V30 - native V17 Brain, all-world hypermaze atlas" -ForegroundColor Cyan
Write-Host "Original V17 checkpoint: $OriginalBrain"
Write-Host "Isolated checkpoint: $checkpoint"
Write-Host "Action-labelled physical witnesses and noncausal corpus text contrasts remain distinct." -ForegroundColor Yellow
if ($ParquetData) { Write-Host "Real text training dataset: $ParquetData (last 16 held out)" }
Write-Host "Known search frontier is EXPLICIT; this is not all of natural language." -ForegroundColor Yellow
Write-Host "Native atlas UI: http://127.0.0.1:$Port/"
& $node @arguments
if ($LASTEXITCODE -ne 0) {
    throw "Original native V30 atlas exited with code $LASTEXITCODE"
}

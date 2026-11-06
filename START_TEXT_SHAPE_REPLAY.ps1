# MagicPerspective V17 REAL text shape and per-step graph/action replay.
# Isolated D: output. The old V17 UI and original Brain remain intact.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Out = "D:\MagicPerspective-Text-Shape-Run",
  [int]$Port = 8875,
  [string]$Gpu = "cuda:0",
  [long]$GpuWorlds = 64,
  [int]$GpuTextBatch = 4,
  [double]$Vram = 3,
  [int]$GpuUtil = 100,
  [int]$ResearchEvery = 5,
  [string]$ImportPrevious = "D:\MagicPerspective-Multipath-Run",
  [switch]$Resume
)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$start = Join-Path $repo "START_LIVE_MULTIPATH_V17.ps1"
if (-not (Test-Path -LiteralPath $start -PathType Leaf)) {
  throw "The original V17 research launcher is missing."
}
if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
  throw "Real OpenThoughts Parquet data is missing: $Data"
}
if ($Port -lt 1024 -or $Port -gt 65535) {
  throw "Port must be between 1024 and 65535."
}
if ($Resume -and -not (Test-Path -LiteralPath (Join-Path $Out "brains") -PathType Container)) {
  throw "Requested -Resume but the isolated Brain directory does not exist: $Out"
}
if (-not $Resume -and (Test-Path -LiteralPath (Join-Path $Out "brains"))) {
  throw "Existing Brain checkpoint. Refusing overwrite. Use -Resume."
}
$opts = @{
  Data = $Data
  Out = $Out
  Port = $Port
  Gpu = $Gpu
  GpuWorlds = $GpuWorlds
  GpuTextBatch = $GpuTextBatch
  Vram = $Vram
  GpuUtil = $GpuUtil
  ResearchEvery = $ResearchEvery
  ResearchEntries = 3000
  ResearchEval = 4
  MazeEvery = 4000
  Every = 50000
  Mem = 3
}
if ($Resume) {
  $opts.Resume = $true
} elseif (-not [string]::IsNullOrWhiteSpace($ImportPrevious)) {
  if (-not (Test-Path -LiteralPath (Join-Path $ImportPrevious "brain.v8") -PathType Leaf)) {
    throw "The original previous Brain checkpoint is missing: $ImportPrevious"
  }
  $opts.ImportPrevious = $ImportPrevious
}
Write-Host "MAGICPERSPECTIVE V17 - REAL TEXT SHAPE REPLAY / ORIGINAL UI" -ForegroundColor Cyan
Write-Host ("Original UI + global/local/field/time/alternatives: http://127.0.0.1:" + $Port + "/")
Write-Host "No demo input. Model/source checkpoint not overwritten."
Write-Host "Training: original Brain V17 and observed-world adapter. Semantic transfer is NOT assumed."
& $start @opts
if ($LASTEXITCODE -ne 0) {
  throw "Original V17 real training or live graph server failed; inspect error above."
}

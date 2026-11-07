# Launch the ORIGINAL MagicPerspective V17 Brain + the real streaming text
# hypermaze observability sidecar. This is NOT a demo/screenshot/player.
# Its source comes from OpenThoughts Parquet or another actual text corpus.
#
# Example:
# powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Hypermaze-LIVE\v17\START_HYPERMAZE_REAL_CUDA.ps1"
#
# The original V17 UI remains intact; the new real-source panel is added
# alongside it. The PyTorch shared learner/world batches use the selected
# CUDA device. The original JavaScript V17 brain and this text-observation
# sidecar remain on CPU; NEVER claim 100% GPU-only execution.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Out = "",
  [int]$Port = 8877,
  [int]$Workers = 1,
  [string]$Arms = "winner",
  [int]$MazeEvery = 4000,
  [double]$Mem = 2,
  [string]$Gpu = "cuda:0",
  [double]$Vram = 2.5,
  [int]$GpuWorlds = 8,
  [int]$GpuTextBatch = 2,
  [int]$GpuTextChunk = 128,
  [int]$GpuUtil = 100,
  [switch]$Fresh,
  [switch]$TraceTransformations
)
$ErrorActionPreference = "Stop"
$launcher = Join-Path $PSScriptRoot "START_V17.ps1"
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) {
  throw "Missing actual original V17 launcher: $launcher"
}
if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
  throw "Training data not found: $Data. Specify the REAL OpenThoughts folder with -Data."
}
if ($Port -lt 1024 -or $Port -gt 65535) { throw "Port must be 1024..65535" }
if ($Workers -lt 1 -or $Workers -gt 16) { throw "Workers must be 1..16" }
if ($GpuWorlds -lt 0) { throw "GpuWorlds must be nonnegative" }
if ($Mem -lt 0.5) { throw "Mem must be at least 0.5 GB" }
if ([string]::IsNullOrWhiteSpace($Out)) {
  $Out = Join-Path $PSScriptRoot "runtime-hypermaze-real"
}
$Out = [System.IO.Path]::GetFullPath($Out)
$null = New-Item -ItemType Directory -Force -Path $Out
Write-Host ""
Write-Host "MAGICPERSPECTIVE V17 / REAL TEXT HYPERMAZE" -ForegroundColor Cyan
Write-Host "Original Brain: $launcher"
Write-Host "Real corpus: $Data"
Write-Host "Run output / independent checkpoints: $Out"
Write-Host "Original UI + new live corpus panel:" -ForegroundColor Green
Write-Host "http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "CUDA: $Gpu, world batch: $GpuWorlds, VRAM budget: $Vram GB, GPU utilization target: $GpuUtil %."
Write-Host "Original CPU JavaScript Graph + CPU text maze sidecar remain CPU: 100% of all code on CUDA is NOT asserted." -ForegroundColor Yellow
Write-Host "No demo: actual source rows train the original V17 Brain, with live pre-update text-route observations."
Write-Host ""
# Checkpoints belong to THIS isolated folder. Existing checkpoints are
# resumed instead of deleted, unless -Fresh was explicitly requested.
$launchParams = @{
  Workers = $Workers
  Arms = $Arms
  Data = $Data
  Out = $Out
  Port = $Port
  Worlds = "text,maze,transform"
  MazeEvery = $MazeEvery
  Mem = $Mem
  Gpu = $Gpu
  Vram = $Vram
  GpuWorlds = $GpuWorlds
  GpuTextBatch = $GpuTextBatch
  GpuTextChunk = $GpuTextChunk
  GpuUtil = $GpuUtil
  Every = 50000
}
if ($TraceTransformations) { $launchParams.TraceTransformations = $true }
$launchParams.Start = $true
if (-not $Fresh) { $launchParams.Resume = $true }
& $launcher @launchParams
if ($LASTEXITCODE -ne 0) { throw "Native V17 training returned exit code $LASTEXITCODE" }

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
  [string]$ResumeFrom = "",
  [int]$Port = 8877,
  [int]$Workers = 1,
  [int]$Every = 250000,
  [int]$CheckpointEvery = 100000,
  [int]$XdAtlasEvery = 16000,
  [string]$Arms = "winner",
  [int]$MazeEvery = 4000,
  [double]$Mem = 2,
  [string]$Gpu = "cuda:0",
  [double]$Vram = 2.2,
  [int]$GpuWorlds = 4,
  [int]$GpuTextBatch = 8,
  [int]$GpuTextChunk = 256,
  [double]$GpuPoolMB = 384,
  [int]$GpuPrefetchExercises = 32,
  [int]$GpuPrefetchBytes = 32000000,
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
if ($GpuPoolMB -lt 1 -or $GpuPoolMB -gt 2048) { throw "GpuPoolMB must be between 1 and 2048 MiB (capped automatically by actual CUDA free memory)" }
if ($GpuPrefetchExercises -lt 2 -or $GpuPrefetchExercises -gt 256) { throw "GpuPrefetchExercises must be 2..256" }
if ($GpuPrefetchBytes -lt 100000 -or $GpuPrefetchBytes -gt 256000000) { throw "GpuPrefetchBytes must be 100000..256000000" }
if ($Mem -lt 0.5) { throw "Mem must be at least 0.5 GB" }
if ($Every -lt 1000) { throw "Every must be at least 1000" }
if ($CheckpointEvery -lt 0) { throw "CheckpointEvery cannot be negative" }
if ($XdAtlasEvery -lt 0) { throw "XdAtlasEvery cannot be negative" }
if ($Fresh -and $ResumeFrom) { throw "-Fresh cannot be combined with -ResumeFrom. Refusing to lose checkpoints." }
# Unlike the original V17 server which prints a listen error and may keep
# training without a reachable UI, refuse to launch on an occupied port.
if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
  $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  if ($listeners.Count -gt 0) {
    $owners = ($listeners | Select-Object -ExpandProperty OwningProcess -Unique) -join ", "
    throw "Port $Port is already occupied by PID(s) $owners. Stop the previous V17 process or specify -Port before starting. No checkpoint was touched."
  }
}
if ([string]::IsNullOrWhiteSpace($Out)) {
  $Out = Join-Path $PSScriptRoot "runtime-hypermaze-real"
}
$Out = [System.IO.Path]::GetFullPath($Out)
$null = New-Item -ItemType Directory -Force -Path $Out
if (-not [string]::IsNullOrWhiteSpace($ResumeFrom)) {
  $previousOut = [System.IO.Path]::GetFullPath($ResumeFrom)
  $previousBrains = Join-Path $previousOut "brains"
  $newBrains = Join-Path $Out "brains"
  if (-not (Test-Path -LiteralPath $previousBrains -PathType Container)) {
    throw "No previous checkpoint folder: $previousBrains"
  }
  if (Test-Path -LiteralPath $newBrains) {
    throw "Target already has a brains folder: $newBrains. Refusing to overwrite. Omit -ResumeFrom to continue existing target checkpoints."
  }
  Copy-Item -LiteralPath $previousBrains -Destination $newBrains -Recurse
  Write-Host "Copied existing checkpoints into the NEW isolated runtime; previous saved model remains unchanged." -ForegroundColor Green
}
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
Write-Host "CUDA throughput: text batch $GpuTextBatch, chunk $GpuTextChunk, world batch $GpuWorlds, VRAM budget $Vram GB."
Write-Host "Persistent REAL future corpus VRAM pool up to $GpuPoolMB MB (further capped by actual GPU budget), $GpuPrefetchExercises queued exercises, $GpuPrefetchBytes source bytes maximum. NEVER pretrain from future answer labels."
Write-Host "Expensive frozen evaluation every $Every committed text chars; independent Brain checkpoint every $CheckpointEvery committed chars."
Write-Host "Complete finite xD world + unseen holdout every $XdAtlasEvery committed chars; real learned physics stored in ORIGINAL Brain."
Write-Host "Real status endpoint: http://127.0.0.1:$Port/health?w=0" -ForegroundColor Cyan
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
  GpuPoolMB = $GpuPoolMB
  GpuPrefetchExercises = $GpuPrefetchExercises
  GpuPrefetchBytes = $GpuPrefetchBytes
  GpuUtil = $GpuUtil
  Every = $Every
  CheckpointEvery = $CheckpointEvery
  XdAtlasEvery = $XdAtlasEvery
}
if ($TraceTransformations) { $launchParams.TraceTransformations = $true }
$launchParams.Start = $true
if (-not $Fresh) { $launchParams.Resume = $true }
& $launcher @launchParams
if ($LASTEXITCODE -ne 0) { throw "Native V17 training returned exit code $LASTEXITCODE" }

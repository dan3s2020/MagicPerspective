# Launch the ORIGINAL MagicPerspective V17 interface and training worker.
# Opt-in compact cross-world action/effect memory, using actual OpenThoughts
# corpus observations and actual maze/transform episodes. NO demo data.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Out = "D:\MagicPerspective-Unified-World-Run",
  [int]$Port = 8876,
  [string]$Gpu = "cuda:0",
  [long]$GpuWorlds = 64,
  [int]$GpuTextBatch = 2,
  [double]$Vram = 3,
  [int]$GpuUtil = 100,
  [int]$MazeEvery = 4000,
  [switch]$Resume
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$start = Join-Path $root "v17\START_V17.ps1"
if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
  throw "OpenThoughts real Parquet corpus not found: $Data"
}
if (-not (Test-Path -LiteralPath $start -PathType Leaf)) {
  throw "The original V17 PowerShell launcher was not found: $start"
}
if ($Port -lt 1024 -or $Port -gt 65535) {
  throw "Invalid port $Port"
}
$brains = Join-Path $Out "brains"
if (-not $Resume -and (Test-Path -LiteralPath $brains)) {
  throw "Existing saved brains in $Out. Refusing overwrite. Use -Resume or a NEW -Out."
}
if ($Resume -and -not (Test-Path -LiteralPath $brains)) {
  throw "No brain checkpoint at $brains. Do not use -Resume on a new run."
}
Write-Host "=== MAGIC PERSPECTIVE V17 ORIGINAL UI / SHARED WORLD CORE ===" -ForegroundColor Cyan
Write-Host "Source: $root"
Write-Host "Real training corpus: $Data"
Write-Host "Isolated checkpoints: $Out"
Write-Host "Real UI / Language Maze + Shared Core: http://127.0.0.1:$Port/"
Write-Host "The original V17 maze, text, and transformation training remain enabled."
Write-Host "Shared structural graph learns action/effect patterns. Semantic understanding is NOT claimed."
$opts = @{
  Workers = 1
  Arms = "stable+many"
  Worlds = "text,maze,transform"
  Data = $Data
  Out = $Out
  Port = $Port
  MazeEvery = $MazeEvery
  Mem = 3
  Every = 50000
  Gpu = $Gpu
  GpuWorlds = $GpuWorlds
  GpuTextBatch = $GpuTextBatch
  Vram = $Vram
  GpuUtil = $GpuUtil
  UnifiedWorld = $true
  Start = $true
  Resume = [bool]$Resume
}
& $start @opts
if ($LASTEXITCODE -ne 0) {
  throw "V17 trainer stopped with exit code $LASTEXITCODE. Review the preceding diagnostic."
}

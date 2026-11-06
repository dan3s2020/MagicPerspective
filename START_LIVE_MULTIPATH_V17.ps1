# Original MagicPerspective V17 + live research tab. No simulated data.
# Launch from a fresh isolated Git checkout on D:.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Out = "D:\MagicPerspective-Live-Multipath-Run",
  [int]$Port = 8874,
  [int]$Every = 50000,
  [double]$Mem = 3,
  [string]$Gpu = "cuda:0",
  [long]$GpuWorlds = 64,
  [int]$GpuTextBatch = 4,
  [double]$Vram = 3,
  [int]$GpuUtil = 100,
  [int]$MazeEvery = 4000,
  [int]$ResearchEvery = 5,
  [int]$ResearchEntries = 3000,
  [int]$ResearchEval = 4,
  [string]$ImportPrevious = "",
  [switch]$Resume
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$start = Join-Path $root "v17\START_V17.ps1"
$required = @(
  "v17\transcend\torus-aether\devour\worker.mjs",
  "v17\transcend\torus-aether\devour\devour.mjs",
  "v17\transcend\torus-aether\ui\index.html",
  "v17\transcend\torus-aether\ui\research-panel.mjs",
  "isolated\native-language-paths\live-research.mjs"
)
foreach($item in $required) {
  if(-not (Test-Path -LiteralPath (Join-Path $root $item) -PathType Leaf)) {
    throw "Missing required real backend/UI file: $item"
  }
}
if(-not (Test-Path -LiteralPath $Data -PathType Container)) {
  throw "Real OpenThoughts3 Parquet directory not found: $Data"
}
if($Port -lt 1024 -or $Port -gt 65535) { throw "Invalid port: $Port" }
if(-not $Resume -and (Test-Path -LiteralPath (Join-Path $Out "brains"))) {
  throw "Existing real V17 brain checkpoints at $Out. Re-run with -Resume to preserve them."
}
if(-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is missing; original V17 is not started."
}
$nodeMajor = [int](& node -p "Number(process.versions.node.split('.')[0])")
if($LASTEXITCODE -ne 0 -or $nodeMajor -lt 20) {
  throw "Node.js 20+ required."
}
$bootResume = [bool]$Resume
if(-not [string]::IsNullOrWhiteSpace($ImportPrevious)) {
  if($Resume) { throw "Use -ImportPrevious for first import, then -Resume for continuation." }
  $migration = Join-Path $root "isolated\native-language-paths\import-previous.mjs"
  if(-not (Test-Path -LiteralPath $migration -PathType Leaf)) { throw "Migration source missing." }
  Write-Host "Importing real previous Brain without modifying its source..." -ForegroundColor Cyan
  & node $migration --source $ImportPrevious --destination $Out
  if($LASTEXITCODE -ne 0) { throw "Import from previous real V17 run failed." }
  $bootResume = $true
}
Write-Host "=== MAGIC PERSPECTIVE V17 / ORIGINAL GRAPH + RESEARCH LIVE ===" -ForegroundColor Cyan
Write-Host "Source code: $root"
Write-Host "Real corpus: $Data"
Write-Host "Isolated checkpoints: $Out"
Write-Host ("Existing original V17 UI with LIVE tab: http://127.0.0.1:" + $Port + "/")
Write-Host "Learning uses the ORIGINAL V17 worker and the selected real GPU device." -ForegroundColor Cyan
Write-Host "Research compares against lexical-only and character baselines; unproven improvements show as ZERO."
$arg = @{
  Workers = 1
  Arms = "stable+many"
  Mem = $Mem
  Every = $Every
  Chars = 0
  Data = $Data
  Out = $Out
  Port = $Port
  Worlds = "text,maze"
  MazeEvery = $MazeEvery
  Gpu = $Gpu
  GpuWorlds = $GpuWorlds
  GpuTextBatch = $GpuTextBatch
  Vram = $Vram
  GpuUtil = $GpuUtil
  ResearchEvery = $ResearchEvery
  ResearchEntries = $ResearchEntries
  ResearchEval = $ResearchEval
}
# Windows PowerShell 5.1 supports splatting switch parameters as boolean.
$arg["Research"] = $true
$arg["AutoStart"] = $true
$arg["Resume"] = $bootResume
& $start @arg
if($LASTEXITCODE -ne 0) {
  throw "Original V17 trainer exited with code $LASTEXITCODE. The output above shows the cause."
}

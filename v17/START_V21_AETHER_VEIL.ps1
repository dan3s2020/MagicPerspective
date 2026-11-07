# MagicPerspective V21: original native V17 text + maze + transform learning,
# with V20 observed text hypermaze and V21 contextual Aether/Veil in ONE Brain.
# No original V17 UI/control code, other repo, or prior checkpoint is overwritten.
# Node-based V20/V21 graph processing is NOT 100% CUDA.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Text = "",
  [int]$Port = 8866,
  [int]$Workers = 1,
  [double]$Mem = 3,
  [string]$Out = "runtime-v21-aether-veil",
  [ValidateSet("off","cpu","cuda:0","cuda:1")][string]$Gpu = "off",
  [int]$GpuWorlds = 64,
  [int]$GpuTextBatch = 2,
  [int]$MazeEvery = 4000,
  [double]$Vram = 3,
  [switch]$IncludeCognitive,
  [ValidatePattern('^cu[0-9]{3}$')][string]$Cuda = "cu126",
  [string]$PythonExe = "",
  [switch]$Resume
)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$node = Get-Command node -ErrorAction Stop
$ver = & node -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$ver -lt 20) { throw "Node.js 20+ is required." }
$runner = Join-Path $PSScriptRoot "transcend\torus-aether\devour\devour.mjs"
if (-not (Test-Path -LiteralPath $runner -PathType Leaf)) { throw "Original V17 trainer missing: $runner" }
if ($GpuTextBatch -lt 1 -or $GpuTextBatch -gt 128) { throw "GpuTextBatch must be 1..128." }
if ($MazeEvery -lt 1) { throw "MazeEvery must be positive." }
if ($Workers -lt 1) { throw "Workers must be positive." }

if ($Text.Trim()) {
  if (-not (Test-Path -LiteralPath $Text -PathType Leaf)) { throw "TXT corpus not found: $Text" }
  $src = @("--text", $Text)
} else {
  if (-not (Test-Path -LiteralPath $Data -PathType Container)) { throw "Dataset directory not found: $Data" }
  $src = @("--data", $Data)
}

# Ensure a mistaken new session can never silently overwrite an existing save.
$saveDir = if ([IO.Path]::IsPathRooted($Out)) { Join-Path $Out "brains" } else { Join-Path $PSScriptRoot (Join-Path $Out "brains") }
$existing = @(Get-ChildItem -LiteralPath $saveDir -Filter "brain-*.v8" -File -ErrorAction SilentlyContinue)
if ($existing.Count -gt 0 -and -not $Resume) {
  throw "Found existing brain checkpoints in $saveDir. Use -Resume, or choose a NEW -Out. No checkpoint overwritten."
}

# This repairs the V21 CUDA regression: explicitly prepare and validate a
# CUDA-capable Python, rather than inheriting Hermes Agent's CPU-only PyTorch.
if ($Gpu -match '^cuda:[0-9]+$') {
  $preflight = Join-Path $PSScriptRoot "ENSURE_V21_CUDA.ps1"
  if (-not (Test-Path -LiteralPath $preflight -PathType Leaf)) { throw "Missing CUDA bootstrap: $preflight" }
  & $preflight -Device $Gpu -Cuda $Cuda -PythonExe $PythonExe
  if (-not $env:OCTOPUS_PY) { throw "CUDA bootstrap failed to set OCTOPUS_PY." }
}

# CRITICAL: the old V21 launcher accidentally omitted 'text'.
# 'hypertext' learns observed token graph edges; ONLY 'text' invokes the
# original Brain.learnTextGPU / AligningGraph and learns to write answers.
$selectedWorlds = if ($IncludeCognitive) {
  "text,hypertext,cognitivemap,maze,transform"
} else {
  "text,hypertext,maze,transform"
}
if ($selectedWorlds -notmatch '(^|,)text(,|$)') { throw "Refusing V21 startup without native text training." }

Write-Host "MAGICPERSPECTIVE V21 — REAL TEXT + AETHER/VEIL + MAZE/TRANSFORM" -ForegroundColor Cyan
Write-Host "Native V17 AligningGraph.write trains on ACTUAL Q/A corpus. V20/V21 observe same documents." -ForegroundColor Green
Write-Host "Worlds: $selectedWorlds"
Write-Host "GPU: $Gpu | worlds/batch: $GpuWorlds | text-batch: $GpuTextBatch | VRAM GB: $Vram"
Write-Host "Node-side V20/V21 observations remain CPU; CUDA processes native V17-compatible tensors." -ForegroundColor Yellow
Write-Host "UI: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Checkpoint directory (never deleted): $saveDir"

$heap = [int]([Math]::Ceiling($Mem * 1024 * 1.7))
$argsNative = @(
  "--max-old-space-size=$heap", $runner,
  "--workers", "$Workers",
  "--arms", "stable+many",
  "--mem", "$Mem",
  "--every", "50000",
  "--out", $Out,
  "--port", "$Port",
  "--worlds", $selectedWorlds,
  "--gpu", $Gpu,
  "--gpu-worlds", "$GpuWorlds",
  "--gpu-text-batch", "$GpuTextBatch",
  "--maze-every", "$MazeEvery",
  "--vram", "$Vram",
  "--gpu-util", "100",
  "--start"
) + $src
if ($Resume) { $argsNative += "--resume" }
& node @argsNative
if ($LASTEXITCODE -ne 0) { throw "Native V21 training engine failed ($LASTEXITCODE)." }

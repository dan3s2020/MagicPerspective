# MagicPerspective V17: isolated live stochastic controls on the unchanged original engine architecture.
# Requires a SEPARATE clone of branch fix/V17-LIVE-STOCHASTIC-CONTROLS-ISOLATED-20261105.
param(
  [ValidateRange(1,64)][int]$Workers = 2,
  [string]$Arms = "stable+many",
  [ValidateRange(0.2,32)][double]$Mem = 3,
  [ValidateRange(1,1000000000)][int]$Every = 200000,
  [long]$Chars = 0,
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Text = "",
  [ValidateSet("text","maze","transform","text,maze","text,transform","maze,transform","text,maze,transform")][string]$Worlds = "text,maze,transform",
  [ValidateRange(1,1000000)][int]$MazeEvery = 4000,
  [ValidateRange(1024,65535)][int]$Port = 8861,
  [ValidateSet("off","cpu","cuda:0","cuda:1")][string]$Gpu = "off",
  [ValidateRange(1,1000000)][int]$GpuWorlds = 1024,
  [ValidateRange(0,128)][double]$Vram = 0,
  [ValidateRange(1,100)][int]$GpuUtil = 100,
  [switch]$Start,
  [switch]$Fresh
)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$expected = "fix/V17-LIVE-STOCHASTIC-CONTROLS-ISOLATED-20261105"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git required to verify isolated branch." }
$actual = (& git -C $repo branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $actual -ne $expected) { throw "Refusing to run in '$actual'. Clone '$expected' to a NEW directory, not your original MagicPerspective checkout." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 20+ required." }
$major = [int]((& node -p "process.versions.node.split('.')[0]").Trim())
if ($major -lt 20) { throw "Node.js 20+ required, found $major." }
$engine = Join-Path $PSScriptRoot "transcend\torus-aether\devour\devour.mjs"
if (-not (Test-Path -LiteralPath $engine -PathType Leaf)) { throw "Missing V17 engine: $engine" }
if ($Chars -lt 0) { throw "Chars must be 0 or greater." }
$sourceArgs = @()
if ($Text -ne "") {
  foreach ($file in ($Text -split ",")) { if (-not (Test-Path -LiteralPath $file.Trim() -PathType Leaf)) { throw "Missing real corpus: $file" } }
  $sourceArgs = @("--text", $Text)
} else {
  if (-not (Test-Path -LiteralPath $Data -PathType Container)) { throw "Missing real parquet directory: $Data" }
  $sourceArgs = @("--data", $Data)
}
if ($Gpu -ne "off") {
  $candidate = Join-Path $PSScriptRoot "transcend\torus-aether\gpu\.venv\Scripts\python.exe"
  if ($env:OCTOPUS_PY) { $py = $env:OCTOPUS_PY }
  elseif (Test-Path -LiteralPath $candidate -PathType Leaf) { $py = $candidate }
  else { $py = "python" }
  if ($Gpu -like "cuda*") {
    & $py -c "import torch,numpy; assert torch.cuda.is_available(), 'CUDA not available'; print('GPU:',torch.cuda.get_device_name(0))"
    if ($LASTEXITCODE -ne 0) { throw "CUDA verification failed. Install a working isolated PyTorch CUDA environment and set OCTOPUS_PY." }
  }
  & $py (Join-Path $PSScriptRoot "transcend\torus-aether\gpu\worlds_gpu.py") --selftest $Gpu
  if ($LASTEXITCODE -ne 0) { throw "Real GPU world self-test failed. Training not launched." }
  $env:OCTOPUS_PY = $py
}
$runtime = Join-Path $PSScriptRoot "runtime-live-controls-isolated"
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
$memInvariant = $Mem.ToString([Globalization.CultureInfo]::InvariantCulture)
$vramInvariant = $Vram.ToString([Globalization.CultureInfo]::InvariantCulture)
$heap = [int][Math]::Ceiling($Mem * 1024 * 1.7)
$engineArgs = @("--max-old-space-size=$heap", $engine, "--workers", "$Workers", "--arms", $Arms, "--mem", $memInvariant,
  "--every", "$Every", "--chars", "$Chars", "--worlds", $Worlds, "--maze-every", "$MazeEvery",
  "--port", "$Port", "--out", $runtime, "--gpu", $Gpu, "--gpu-worlds", "$GpuWorlds", "--vram", $vramInvariant, "--gpu-util", "$GpuUtil")
$engineArgs += $sourceArgs
if (-not $Fresh) { $engineArgs += "--resume" }
if ($Start) { $engineArgs += "--start" }
Write-Host "MAGICPERSPECTIVE V17 - STOCHASTIC CONTROLS ISOLATED" -ForegroundColor Cyan
Write-Host "Git branch: $actual"
Write-Host "Runtime/checkpoints (isolated): $runtime"
Write-Host "Original full UI + real sliders: http://127.0.0.1:$Port/"
Write-Host "Observatory: http://127.0.0.1:$Port/transcend/torus-aether/devour/observatory.html"
Write-Host "Memory: $Workers workers x $Mem GB (per worker). No automatic reduction."
Set-Location $PSScriptRoot
& node @engineArgs
if ($LASTEXITCODE -ne 0) { throw "V17 training failed with exit code $LASTEXITCODE." }

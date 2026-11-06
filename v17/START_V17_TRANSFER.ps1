# MagicPerspective V17 transfer experiment — isolated native trainer
# Keeps the original V17 brain/UI. Does not overwrite D:\MagicPerspective.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [int]$Port = 8866,
  [string]$Gpu = "cuda:0",
  [double]$Vram = 2.0,
  [int]$GpuWorlds = 32,
  [int]$GpuTextBatch = 1,
  [int]$GpuTextChunk = 64,
  [switch]$Fresh,
  [switch]$Paused,
  [switch]$DisableEndogenousNoise
)
$ErrorActionPreference = "Stop"
if ($Port -in @(8841, 8862, 8897, 8898, 8899)) {
  throw "Use a separate port; the original sessions must not be interrupted."
}
$runtime = Join-Path $PSScriptRoot "runtime-transfer-20261106"
$cmd = @("-Workers", "1", "-Arms", "stable+many", "-Mem", "3",
  "-Worlds", "text,maze,transform", "-MazeEvery", "4000", "-Every", "60000",
  "-Data", "$Data", "-Out", "$runtime", "-Port", "$Port",
  "-Gpu", "$Gpu", "-GpuWorlds", "$GpuWorlds", "-GpuTextBatch", "$GpuTextBatch",
  "-GpuTextChunk", "$GpuTextChunk", "-Vram", "$Vram",
  "-GpuUtil", "100", "-Cuda", "cu126", "-TraceTransformations")
if (-not $Fresh) { $cmd += "-Resume" }
if (-not $Paused) { $cmd += "-Start" }
if (-not $DisableEndogenousNoise) { $cmd += "-EndogenousNoise" }
Write-Host "Original V17 living graph: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Isolated checkpoint/output: $runtime"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "START_V17.ps1") @cmd
if ($LASTEXITCODE -ne 0) { throw "Isolated V17 trainer exited with code $LASTEXITCODE" }

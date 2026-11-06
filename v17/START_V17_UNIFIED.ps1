# MagicPerspective V17 Unified Living Perspective — NEW clone only; leaves the old port and saves untouched.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [int]$Port = 8862,
  [int]$Workers = 1,
  [int]$GpuWorlds = 128,
  [double]$Vram = 3,
  [string]$Gpu = "cuda:0",
  [string]$Cuda = "cu126",
  [switch]$Fresh
)
$ErrorActionPreference = "Stop"
if ($Port -eq 8841 -or $Port -eq 8898 -or $Port -eq 8899) {
  throw "Choose a port separate from existing V17 and language experiments."
}
$runtime = Join-Path $PSScriptRoot "runtime-unified-20261106"
$cmd = @("-Workers", "$Workers", "-Arms", "stable+many", "-Mem", "3",
  "-Worlds", "text,maze,transform", "-MazeEvery", "4000", "-Every", "60000",
  "-Data", "$Data", "-Out", "$runtime", "-Port", "$Port",
  "-Gpu", "$Gpu", "-GpuWorlds", "$GpuWorlds", "-Vram", "$Vram",
  "-GpuUtil", "100", "-Cuda", "$Cuda")
if (-not $Fresh) { $cmd += "-Resume" }
Write-Host "V17 unified native viewer: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Isolated runtime: $runtime"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "START_V17.ps1") @cmd
if ($LASTEXITCODE -ne 0) { throw "V17 unified trainer failed (exit $LASTEXITCODE)." }

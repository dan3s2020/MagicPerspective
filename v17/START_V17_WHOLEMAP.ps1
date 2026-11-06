# Standalone isolated V17 whole-map text world. Original runtimes remain untouched.
param(
 [switch]$FullCUDA,
 [string]$Data = "D:\training\OpenThoughts3-1.2M",
 [int]$Port = 8868,
 [int]$GpuWorlds = 128,
 [double]$Vram = 3,
 [int]$GpuTextBatch = 8
)
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {throw "Node.js 20+ required"}
$root = $PSScriptRoot
$out = Join-Path $root "runtime-whole-map-text-20261106"
if (-not $FullCUDA) {
 Write-Host "WHOLE WORLD FIRST: a cursor navigates the entire map, no next-token trainer" -ForegroundColor Cyan
 Write-Host "NestView: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
 $arguments = @("--workers","1","--arms","stable+many","--mem","3",
  "--worlds","maptext","--out",$out,"--port","$Port","--gpu","off","--resume","--start")
 & node (Join-Path $root "transcend\torus-aether\devour\devour.mjs") @arguments
 if ($LASTEXITCODE -ne 0) {throw "Whole-map trainer failed"}
} else {
 if (-not (Test-Path -LiteralPath $Data)) {throw "Dataset not found at $Data"}
 Write-Host "Original V17 full CUDA worlds plus whole-map cursor" -ForegroundColor Cyan
 $arguments = @("-Workers","1","-Arms","stable+many","-Mem","3","-Data",$Data,
  "-Worlds","text,maze,transform,code,maptext","-Out",$out,"-Port","$Port",
  "-Gpu","cuda:0","-GpuWorlds","$GpuWorlds","-Vram","$Vram",
  "-GpuTextBatch","$GpuTextBatch","-GpuUtil","100","-Resume","-Start")
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "START_V17.ps1") @arguments
 if ($LASTEXITCODE -ne 0) {throw "Original CUDA trainer failed"}
}
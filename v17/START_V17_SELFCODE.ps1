# Isolated V17 self-code world, no writes to other branch runtime directories.
param(
 [switch]$CodeOnly,
 [switch]$Fresh,
 [string]$Data = "D:\training\OpenThoughts3-1.2M",
 [int]$Port = 8867,
 [int]$Workers = 1,
 [string]$Gpu = "cuda:0",
 [int]$GpuWorlds = 128,
 [double]$Vram = 3,
 [int]$TextBatch = 8
)
$ErrorActionPreference = "Stop"
if ($Port -in @(8841,8862,8898,8899)) {throw "Use a separate port from existing V17 instances"}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {throw "Node.js 20+ is required"}
$root = $PSScriptRoot
$out = Join-Path $root "runtime-selfcode-20261106"
if ($CodeOnly) {
 Write-Host "V17 code-only world, no dataset required, Node CPU."
 Write-Host "Native NestView: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
 $cmd = @("--workers","$Workers","--arms","stable+many","--mem","3",
    "--worlds","code","--out","$out","--port","$Port","--gpu","off","--start")
 if (-not $Fresh) {$cmd += "--resume"}
 & node (Join-Path $root "transcend\torus-aether\devour\devour.mjs") @cmd
 if ($LASTEXITCODE -ne 0) {throw "Native code-world worker failed"}
} else {
 Write-Host "V17 text+maze+transform+code, same native CUDA tests."
 Write-Host "Isolated runtime: $out | NestView: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
 $cmd = @("-Workers","$Workers","-Arms","stable+many","-Mem","3",
    "-Worlds","text,maze,transform,code","-MazeEvery","4000","-Every","60000",
    "-Data","$Data","-Out","$out","-Port","$Port","-Gpu","$Gpu",
    "-GpuWorlds","$GpuWorlds","-GpuTextBatch","$TextBatch","-Vram","$Vram",
    "-GpuUtil","100","-Start")
 if (-not $Fresh) {$cmd += "-Resume"}
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "START_V17.ps1") @cmd
 if ($LASTEXITCODE -ne 0) {throw "Native V17 trainer failed"}
}
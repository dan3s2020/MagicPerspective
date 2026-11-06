# MagicPerspective V19 / real cognitive learning from whole text worlds.
# Isolated checkout and runtime; no edits to other agent versions or their checkpoints.
param(
 [string]$Data = "D:\training\OpenThoughts3-1.2M",
 [string]$TextFile = "",
 [switch]$FullCUDA,
 [switch]$IncludeLegacyTextPredictor,
 [int]$Port = 8871,
 [int]$GpuWorlds = 64,
 [double]$Vram = 3,
 [int]$Workers = 1,
 [string]$Cuda = "cu126"
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$repo = Split-Path $root -Parent
$expected = "experiment/V19-LEARNED-COGNITIVE-WORLD-SHAPE-20261106"
$current = (git -C $repo branch --show-current).Trim()
if ($current -ne $expected) {throw "Wrong branch $current. Refusing to modify other agents."}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {throw "Install Node.js 20+."}
if ($Port -in @(8841,8862,8867,8868,8898,8899)) {throw "Select an isolated, unused port."}
if ($Workers -lt 1 -or $Workers -gt 32) {throw "Workers must be 1..32."}
$worlds = "cognitivemap"
if ($FullCUDA) {$worlds = "cognitivemap,maze,transform,code"}
if ($IncludeLegacyTextPredictor) {$worlds += ",text"}
$out = Join-Path $root "runtime-v19-learned-cognitive-20261106"
Write-Host "=== MAGIC PERSPECTIVE V19 / ORIGINAL SHAPE ON LEARNED COGNITIVE MAP ===" -ForegroundColor Cyan
Write-Host "Worlds: $worlds | checkpoint: $out"
if ($TextFile) {
 if (-not (Test-Path -LiteralPath $TextFile -PathType Leaf)) {throw "Text file absent: $TextFile"}
 if ($FullCUDA) {throw "For CUDA use a dataset folder with -Data; the original START_V17.ps1 CUDA self-tests and setup require -Data. Nothing was changed."}
 $args = @("--workers","$Workers","--arms","stable+many","--mem","3",
   "--worlds",$worlds,"--text",$TextFile,"--out",$out,
   "--port","$Port","--gpu","off","--resume","--start")
 & node (Join-Path $root "transcend\torus-aether\devour\devour.mjs") @args
 if ($LASTEXITCODE -ne 0) {throw "V19 native whole-text learning failed."}
} else {
 if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
  throw "Corpus not found: $Data . Use -Data with actual Parquet folder, or -TextFile with actual text file."
 }
 $args = @("-Workers","$Workers","-Arms","stable+many","-Mem","3",
   "-Worlds",$worlds,"-Data",$Data,"-Out",$out,"-Port","$Port",
   "-Gpu",$(if($FullCUDA){"cuda:0"}else{"off"}),
   "-GpuWorlds","$GpuWorlds","-Vram","$Vram","-GpuUtil","100",
   "-Cuda",$Cuda,"-Resume","-Start")
 & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "START_V17.ps1") @args
 if ($LASTEXITCODE -ne 0) {throw "Native V17 CUDA/CPU trainer failed."}
}

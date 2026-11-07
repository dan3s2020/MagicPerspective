# MagicPerspective V34 - SAFE real original V17 multiworld training + full xD/character atlas.
# A V31 mathematical research solver is added to this EXACT repository tree;
# it does not silently replace the original Brain, V17 UI, CUDA kernel or worker.
# This launcher REQUIRES a real corpus and existing original checkpoint.
# Does not overwrite OriginalOut or any other agent's folder.
param(
 [Parameter(Mandatory=$true)][string]$Data,
 [string]$OriginalOut = "",
 [string]$Out = "",
 [int]$Port = 8897,
 [int]$Workers = 1,
 [int]$CheckpointEvery = 100000,
 [int]$XdAtlasEvery = 16000,
 [int]$Every = 250000,
 [double]$Mem = 2,
 [string]$Gpu = "off",
 [double]$Vram = 2.2,
 [int]$GpuWorlds = 4,
 [int]$GpuTextBatch = 8,
 [int]$GpuTextChunk = 256,
 [switch]$TraceTransformations
)
$ErrorActionPreference = "Stop"
$launcher = Join-Path $PSScriptRoot "START_HYPERMAZE_REAL_CUDA.ps1"
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) {
 throw "Original V17 CUDA/text/xD launcher is absent: $launcher"
}
$node = Get-Command node -ErrorAction Stop
$major = & $node.Source -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$major -lt 22) {
 throw "Node.js 22+ required for verified V34 branch."
}
if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
 throw "Actual corpus folder absent: $Data"
}
$Data = (Resolve-Path -LiteralPath $Data).Path
if ($Port -lt 1024 -or $Port -gt 65535) { throw "Port outside 1024..65535." }
if ($Workers -ne 1) {
 throw "V34 integration runs ONE original persistent Brain. Use -Workers 1 for provenance and checkpoint safety."
}
if ($CheckpointEvery -lt 1 -or $XdAtlasEvery -lt 1 -or $Every -lt 1) {
 throw "Real checkpoints, frozen evaluation and full xD training must remain enabled."
}
if ($Mem -lt 1 -or $Mem -gt 64) { throw "Original Brain memory budget outside tested range." }
if ($Gpu -ne "off" -and $Gpu -ne "cuda:0") {
 throw "V34 accepts GPU off or the actual cuda:0 device; no fake all-GPU mode."
}
if ($Gpu -ne "off" -and ($Vram -lt 1 -or $Vram -gt 4)) {
 throw "On the 4GB laptop GPU the explicit VRAM budget must be 1..4 GB; do not force 100% physical VRAM."
}
if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
 $occupied = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
 if ($occupied.Count) { throw "Port $Port already occupied; cannot attach to another agent's worker." }
}
if ([string]::IsNullOrWhiteSpace($Out)) {
 $Out = Join-Path $PSScriptRoot "runtime-v34-original-safe"
}
$Out = [System.IO.Path]::GetFullPath($Out)
if ($OriginalOut) {
 $OriginalOut = [System.IO.Path]::GetFullPath($OriginalOut)
 if (-not (Test-Path -LiteralPath $OriginalOut -PathType Container)) {
  throw "Original runtime folder does not exist: $OriginalOut"
 }
 if ($Out.TrimEnd('\') -ieq $OriginalOut.TrimEnd('\')) {
  throw "Refusing to use ORIGINAL checkpoint directory as V34 destination."
 }
}
$destBrains = Join-Path $Out "brains"
$existing = @(Get-ChildItem -LiteralPath $destBrains -Filter 'brain-*.v8' -File -ErrorAction SilentlyContinue)
$oldBrains = if ($OriginalOut) { Join-Path $OriginalOut "brains" } else { "" }
$sourceBrains = if ($oldBrains -and (Test-Path -LiteralPath $oldBrains -PathType Container)) {
 @(Get-ChildItem -LiteralPath $oldBrains -Filter 'brain-*.v8' -File -ErrorAction Stop)
} else { @() }
if ($existing.Count -eq 0 -and $sourceBrains.Count -eq 0) {
 throw "No trained original V17 .v8 Brain found. Supply -OriginalOut with runtime/brains/brain-*.v8. No dummy Brain or silent restart from zero."
}
if ($existing.Count -eq 0 -and (Test-Path -LiteralPath $destBrains -PathType Container)) {
 throw "Destination brains folder exists without a usable Brain; refusing ambiguous overwrite."
}
if ($existing.Count -gt 0 -and $sourceBrains.Count -gt 0) {
 Write-Host "V34 destination already has trained Brain; will RESUME, not copy or overwrite original." -ForegroundColor Yellow
}
$opts = @{
 Data = $Data
 Out = $Out
 Port = $Port
 Workers = $Workers
 Every = $Every
 CheckpointEvery = $CheckpointEvery
 XdAtlasEvery = $XdAtlasEvery
 Mem = $Mem
 Gpu = $Gpu
 Vram = $Vram
 GpuWorlds = $GpuWorlds
 GpuTextBatch = $GpuTextBatch
 GpuTextChunk = $GpuTextChunk
}
if ($TraceTransformations) { $opts.TraceTransformations = $true }
# Original Brain native noise controls stay available in the existing UI.
if ($existing.Count -eq 0) {
 $opts.ResumeFrom = $OriginalOut
}
Write-Host "MagicPerspective V34 - original V17 CUDA + native xD + six-scale text-path atlas" -ForegroundColor Cyan
Write-Host "Original checkpoint directory NOT modified: $OriginalOut"
Write-Host "Separate V34 runtime: $Out"
Write-Host "Live ORIGINAL UI: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Real evidence: http://127.0.0.1:$Port/health?w=0"
Write-Host "V31 million-state numeric/log tests are verified research tools, NOT an automatic new semantic text trainer." -ForegroundColor Yellow
& $launcher @opts
if ($LASTEXITCODE -ne 0) { throw "Native original trainer returned exit code $LASTEXITCODE" }

# MAGIC PERSPECTIVE - one command: original V17 CUDA worker + real native graph + magical LIVE interface.
# This never runs the slow CPU-only train-real-text.mjs sidecar and never overwrites its output.
# Starts the ORIGINAL, complete V17 Brain (text + maze + transformation) and saves the original .v8.
param(
 [string]$Data = "D:\training\OpenThoughts3-1.2M",
 [string]$Out = "D:\MagicPerspective-Magic-Run",
 [int]$Port = 8874,
 [int]$Workers = 1,
 [string]$Arms = "stable+many",
 [string]$Worlds = "text,maze,transform",
 [double]$Mem = 3,
 [long]$Every = 50000,
 [string]$Gpu = "cuda:0",
 [double]$Vram = 2.6,
 [long]$GpuWorlds = 0,
 [int]$GpuTextBatch = 2,
 [int]$GpuTextChunk = 128,
 [string]$Cuda = "cu126",
 [switch]$TraceTransformations,
 [switch]$EndogenousNoise
)
$ErrorActionPreference = "Stop"
$launcher = Join-Path $PSScriptRoot "START_V17.ps1"
$branchTag = "experiment/V17-LIVE-PREDICTIVE-STATE-GATE-20261107"
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) {
 throw "Original complete CUDA V17 launcher missing: $launcher"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
 throw "Node.js 20+ must be installed and on PATH."
}
if (-not (Test-Path -LiteralPath $Data)) {
 throw "Real OpenThoughts3 corpus not found: $Data. No demo/fabricated fallback."
}
if ($Port -lt 1025 -or $Port -gt 65535) { throw "Port must be 1025..65535." }
if ($Workers -lt 1 -or $Workers -gt 24) { throw "Workers must be 1..24." }
if ($Vram -lt 0 -or $Mem -le 0) { throw "Invalid VRAM/RAM budget." }
$Out = [System.IO.Path]::GetFullPath($Out)
$marker = Join-Path $Out "magic-native-v17-run.json"
if (Test-Path -LiteralPath $Out) {
 $children = @(Get-ChildItem -LiteralPath $Out -Force)
 if ($children.Count -gt 0 -and -not (Test-Path -LiteralPath $marker)) {
  throw "Refusing to touch non-MagicPerspective output directory: $Out. Use a NEW -Out directory. The old sidecar output must remain untouched."
 }
 if (Test-Path -LiteralPath $marker) {
  $existing = Get-Content -LiteralPath $marker -Raw | ConvertFrom-Json
  if ($existing.kind -ne "magic-native-v17") { throw "Output directory does not contain a native MagicPerspective marker." }
  if ($existing.branch -and $existing.branch -ne $branchTag) {
   throw "Refusing to resume a DIFFERENT MagicPerspective branch in the same output folder. Use a NEW -Out directory."
  }
  if ($existing.corpus -ne [System.IO.Path]::GetFullPath($Data)) {
   throw "Cannot resume with different corpus; original progress preserved."
  }
 }
} else { New-Item -ItemType Directory -Path $Out -Force | Out-Null }
$portListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
try { $portListener.Start() }
catch { throw "Port $Port is already occupied. Pick another -Port; no headless training will start." }
finally { $portListener.Stop() }
if (-not (Test-Path -LiteralPath $marker)) {
 [pscustomobject]@{
  kind = "magic-native-v17"
  corpus = [System.IO.Path]::GetFullPath($Data)
  created = (Get-Date).ToString("o")
  branch = $branchTag
 } | ConvertTo-Json | Set-Content -LiteralPath $marker -Encoding UTF8
}
$magic = "http://127.0.0.1:$Port/transcend/torus-aether/ui/magic.html?live=1"
$original = "http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host ""
Write-Host "+==================================================================+" -ForegroundColor DarkYellow
Write-Host "|            MAGIC PERSPECTIVE * THE LIVING AETHER                 |" -ForegroundColor Yellow
Write-Host "+==================================================================+" -ForegroundColor DarkYellow
Write-Host "Real dataset: $Data"
Write-Host "Isolated native checkpoint: $Out\brains"
Write-Host "GPU requested: $Gpu (NO silent CPU fallback)" -ForegroundColor Cyan
Write-Host "Native worlds: $Worlds | Workers: $Workers | Interval: $Every observed characters"
Write-Host "LIVE MAGICAL UI: $magic" -ForegroundColor Green
Write-Host "Original V17 UI: $original" -ForegroundColor Green
Write-Host "The browser will open automatically when the original V17 HTTP server is listening."
Write-Host "Stop with Ctrl+C to save the native brain. Restart the SAME command to resume."
Write-Host "All saved legacy datasets and checkpoints in other directories remain untouched." -ForegroundColor Yellow
Write-Host ""
# The original script tests real CUDA through PyTorch and will throw if it is
# missing. Its native worker is the only training process; no fake data/world.
$launch = @{
 Data=$Data; Out=$Out; Port=$Port; Workers=$Workers; Arms=$Arms; Worlds=$Worlds
 Mem=$Mem; Every=$Every; Gpu=$Gpu; Vram=$Vram; GpuWorlds=$GpuWorlds
 GpuTextBatch=$GpuTextBatch; GpuTextChunk=$GpuTextChunk; Cuda=$Cuda
 Resume=$true; Start=$true; MagicUI=$true; MathAxes=$true
 TraceTransformations=[bool]$TraceTransformations
 EndogenousNoise=[bool]$EndogenousNoise
}
& $launcher @launch
if ($LASTEXITCODE -ne 0) { throw "Original V17 trainer failed with exit code $LASTEXITCODE." }

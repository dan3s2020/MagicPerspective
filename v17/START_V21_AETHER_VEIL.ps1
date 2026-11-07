# V21 Aether/Veil, SAFE isolated branch. Native V17 engine and V20 UI retained.
# Native contextual graph uses Node CPU. GPU is for original V17 maze/transform
# and optional shared PyTorch batches only; this is NOT 100% CUDA.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Text = "",
  [int]$Port = 8866,
  [int]$Workers = 1,
  [double]$Mem = 3,
  [string]$Out = "runtime-v21-aether-veil",
  [ValidateSet("off","cpu","cuda:0","cuda:1")][string]$Gpu = "off",
  [int]$GpuWorlds = 64,
  [double]$Vram = 3,
  [switch]$IncludeCognitive,
  [switch]$Resume
)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$node = Get-Command node -ErrorAction Stop
$ver = & node -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$ver -lt 20) { throw "Node.js 20+ required." }
$runner = Join-Path $PSScriptRoot "transcend\torus-aether\devour\devour.mjs"
if (-not (Test-Path -LiteralPath $runner)) { throw "Original V17 trainer missing." }
if ($Text.Trim()) {
  if (-not (Test-Path -LiteralPath $Text -PathType Leaf)) { throw "TXT corpus not found: $Text" }
  $src = @("--text", $Text)
} else {
  if (-not (Test-Path -LiteralPath $Data -PathType Container)) { throw "Dataset directory not found: $Data" }
  $src = @("--data", $Data)
}
Write-Host "MAGICPERSPECTIVE V21 - REAL AETHER / VEIL OBSERVATIONS" -ForegroundColor Cyan
Write-Host "Original native V17 Maze and Transform + real V20 Hypertext observations."
Write-Host "NEW contextual Veil graph is CPU Node; CUDA optional for native V17 worlds, not all model operations." -ForegroundColor Yellow
Write-Host "LIVE original UI: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Isolated save location: $Out"
$selectedWorlds = if ($IncludeCognitive) { "hypertext,cognitivemap,maze,transform" } else { "hypertext,maze,transform" }
Write-Host "Selected real worlds: $selectedWorlds"
$heap = [int]([Math]::Ceiling($Mem * 1024 * 1.7))
$argsNative = @(
  "--max-old-space-size=$heap", $runner,
  "--workers", "$Workers", "--arms", "stable+many",
  "--mem", "$Mem", "--every", "50000",
  "--out", $Out, "--port", "$Port",
  "--worlds", $selectedWorlds,
  "--gpu", $Gpu, "--gpu-worlds", "$GpuWorlds",
  "--vram", "$Vram", "--start"
) + $src
if ($Resume) { $argsNative += "--resume" }
& node @argsNative
if ($LASTEXITCODE -ne 0) { throw "Native V21 runner failed ($LASTEXITCODE)" }

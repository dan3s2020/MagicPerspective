# MagicPerspective V20 - REAL text hypermaze, isolated from V17 and V19 sessions.
# This world runs ONLY the observed-token graph; other worlds and V19 atlas are disabled.
# It does NOT claim CUDA training or semantic understanding of natural language.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Text = "",
  [int]$Port = 8864,
  [int]$Workers = 1,
  [double]$Mem = 3,
  [string]$Out = "runtime-v20-text-hypermaze",
  [switch]$Resume
)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$node = Get-Command node -ErrorAction Stop
$ver = & node -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$ver -lt 20) { throw "Node.js 20 or newer is required." }
$runner = Join-Path $PSScriptRoot "transcend\torus-aether\devour\devour.mjs"
if (-not (Test-Path -LiteralPath $runner)) { throw "Original V17 trainer missing: $runner" }
if ($Text.Trim()) {
  if (-not (Test-Path -LiteralPath $Text -PathType Leaf)) { throw "TXT corpus not found: $Text" }
  $src = @("--text", $Text)
} else {
  if (-not (Test-Path -LiteralPath $Data -PathType Container)) { throw "Corpus directory missing: $Data" }
  $src = @("--data", $Data)
}
Write-Host "MagicPerspective V20: real corpus -> one observed text hypermaze" -ForegroundColor Cyan
Write-Host "Native model: CPU/Node (NOT CUDA). No silent GPU claim." -ForegroundColor Yellow
Write-Host "UI: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Separate checkpoint folder: $Out"
$heap = [int]([Math]::Ceiling($Mem * 1024 * 1.7))
$argsNative = @(
  "--max-old-space-size=$heap", $runner, "--workers", "$Workers",
  "--arms", "stable+many", "--mem", "$Mem", "--every", "50000",
  "--out", $Out, "--port", "$Port", "--worlds", "hypertext",
  "--gpu", "off", "--start"
) + $src
if ($Resume) { $argsNative += "--resume" }
& node @argsNative
if ($LASTEXITCODE -ne 0) { throw "V20 native worker exited with code $LASTEXITCODE" }

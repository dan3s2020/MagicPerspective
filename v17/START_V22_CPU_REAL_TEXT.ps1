# V22 CPU ONLY - actual original V17 text learning + original maze navigator
# + V19 learned text action world and V20/V21 observed hypermaze, together.
# NO CUDA, NO Python process, NO GPU torch. Uses real supplied corpus only.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Text = "",
  [int]$Port = 8867,
  [double]$Mem = 3,
  [int]$MazeEvery = 4000,
  [string]$Out = "runtime-v22-cpu-real-text",
  [switch]$Resume
)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$node = Get-Command node -ErrorAction Stop
$version = & node -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$version -lt 20) {
  throw "Node.js 20 or newer required."
}
if ($Port -lt 1024 -or $Port -gt 65535) { throw "Invalid HTTP port." }
if ($Mem -lt 1 -or $Mem -gt 64) { throw "Memory GB must be 1..64." }
if ($MazeEvery -lt 1) { throw "MazeEvery must be >=1." }

$native = Join-Path $PSScriptRoot "transcend\torus-aether\devour\devour.mjs"
if (-not (Test-Path -LiteralPath $native -PathType Leaf)) {
  throw "Original native trainer missing: $native"
}
if ($Text.Trim()) {
  if (-not (Test-Path -LiteralPath $Text -PathType Leaf)) {
    throw "Actual TXT corpus missing: $Text"
  }
  $source = @("--text", $Text)
} else {
  if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
    throw "Actual OpenThoughts3 parquet directory missing: $Data"
  }
  $source = @("--data", $Data)
}

$saveFolder = if ([IO.Path]::IsPathRooted($Out)) {
  Join-Path $Out "brains"
} else {
  Join-Path $PSScriptRoot (Join-Path $Out "brains")
}
$oldSaves = @(Get-ChildItem -LiteralPath $saveFolder -File -Filter "brain-*.v8" -ErrorAction SilentlyContinue)
if ($oldSaves.Count -gt 0 -and -not $Resume) {
  throw "Existing V22 CPU checkpoint found. Use -Resume or a different -Out. No overwrite."
}
# On resume copy every checkpoint byte plus sidecars before restarting.
if ($oldSaves.Count -gt 0 -and $Resume) {
  $backup = Join-Path (Split-Path -Parent $saveFolder) ("brains-before-v22-cpu-resume-" + (Get-Date -Format yyyyMMdd-HHmmss))
  New-Item -ItemType Directory -Path $backup -ErrorAction Stop | Out-Null
  foreach ($item in (Get-ChildItem -LiteralPath $saveFolder -File -ErrorAction Stop)) {
    Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $backup $item.Name) -ErrorAction Stop
  }
  Write-Host "Checkpoint backup: $backup" -ForegroundColor Green
}

# "off" activates actual original JS CPU V17 text learning,
# NEVER an implicit CPU-only PyTorch setup. V19/V20/V21 observe SAME
# corpus in this native Brain; original maze/transform worlds stay active.
$worlds = "text,cognitivemap,hypertext,maze,transform"
$env:MP_NO_BROWSER = "1"
Write-Host "V22 CPU ONLY - ORIGINAL V17 + V19 ACTION MAP + V20/V21 HYPERMAZE" -ForegroundColor Cyan
Write-Host "GPU: OFF (no CUDA or Python)"
Write-Host "Worlds: $worlds"
Write-Host "Native UI: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Holdout goal: >=70% EXACT WHOLE ANSWERS written from question only."
Write-Host "IMPORTANT: This threshold is UNPROVEN on arbitrary unseen OpenThoughts3."
Write-Host "Checkpoint directory: $saveFolder"
$heap = [int][Math]::Ceiling($Mem * 1024 * 1.7)
$nodeArgs = @(
  "--max-old-space-size=$heap", $native,
  "--workers", "1", "--arms", "stable+many",
  "--mem", "$Mem", "--every", "50000",
  "--out", $Out, "--port", "$Port",
  "--worlds", $worlds, "--gpu", "off",
  "--maze-every", "$MazeEvery", "--start"
) + $source
if ($Resume) { $nodeArgs += "--resume" }
& node @nodeArgs
if ($LASTEXITCODE -ne 0) { throw "Native CPU trainer failed. Check logs above." }

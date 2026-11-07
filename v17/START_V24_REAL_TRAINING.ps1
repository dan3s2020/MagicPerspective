# MagicPerspective V24 - real corpus observational training.
# Original V17/V22/V23 sources are never changed by this launcher.
# V24 text graph executes on Node.js CPU; never claim 100% CUDA.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Jsonl = "",
  [string]$QaTxt = "",
  [string]$Out = "runtime-v24-real",
  [int]$Port = 8899,
  [int]$MaxRecords = 20000,
  [int]$MaxAnswerChars = 65536,
  [int]$SaveEvery = 5000,
  [int]$OnlineEvery = 25,
  [int]$HeldOut = 16,
  [int]$Limit = 0,
  [switch]$Resume,
  [switch]$NoStart
)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$exe = (Get-Command node -ErrorAction Stop).Source
$major = & $exe -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$major -lt 22) { throw "Node.js 22+ is required" }
$runner = Join-Path $PSScriptRoot "research\relational-hypermaze\real-trainer.mjs"
if (-not (Test-Path -LiteralPath $runner -PathType Leaf)) { throw "Real V24 trainer source missing: $runner" }
if ($Port -lt 1024 -or $Port -gt 65535) { throw "Invalid local port" }
if ($MaxRecords -lt 10 -or $SaveEvery -lt 1 -or $OnlineEvery -lt 1 -or $HeldOut -lt 1) { throw "Invalid numerical controls" }
$sourceArgs = @()
if ($Jsonl -and $QaTxt) { throw "Choose only one of -Jsonl or -QaTxt" }
if ($Jsonl) {
  if (-not (Test-Path -LiteralPath $Jsonl -PathType Leaf)) { throw "JSONL file missing: $Jsonl" }
  $sourceArgs = @("--jsonl", (Resolve-Path -LiteralPath $Jsonl).Path)
} elseif ($QaTxt) {
  if (-not (Test-Path -LiteralPath $QaTxt -PathType Leaf)) { throw "Q/A TXT file missing: $QaTxt" }
  $sourceArgs = @("--qa-txt", (Resolve-Path -LiteralPath $QaTxt).Path)
} else {
  if (-not (Test-Path -LiteralPath $Data -PathType Container)) { throw "Parquet folder missing: $Data" }
  $sourceArgs = @("--data", (Resolve-Path -LiteralPath $Data).Path)
}
$dest = if ([IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path $PSScriptRoot $Out }
$checkpoint = Join-Path $dest "atlas-v24.json"
if ((Test-Path -LiteralPath $checkpoint) -and -not $Resume) {
  throw "Existing checkpoint must be resumed explicitly with -Resume: $checkpoint"
}
if ($Resume -and -not (Test-Path -LiteralPath $checkpoint)) {
  throw "-Resume was requested, but checkpoint not found: $checkpoint"
}
$argsNative = @(
  $runner, "--out", $dest, "--port", "$Port",
  "--max-records", "$MaxRecords", "--max-answer-chars", "$MaxAnswerChars",
  "--save-every", "$SaveEvery", "--online-every", "$OnlineEvery",
  "--held", "$HeldOut", "--limit", "$Limit"
) + $sourceArgs
if ($Resume) { $argsNative += "--resume" }
if (-not $NoStart) { $argsNative += "--start" }
Write-Host "MagicPerspective V24 real Q/A training - original Discoverer.shape()" -ForegroundColor Cyan
Write-Host "Source: $($sourceArgs[0]) $($sourceArgs[1])"
Write-Host "New observational graph: CPU Node.js (no false CUDA claim)." -ForegroundColor Yellow
Write-Host "The original V17 UI and trained brains remain unchanged."
Write-Host "V24 live UI: http://127.0.0.1:$Port/"
Write-Host "Checkpoint: $checkpoint"
Write-Host "The original V17 page is embedded on the left when its existing server runs at port 8866."
& $exe @argsNative
if ($LASTEXITCODE -ne 0) { throw "V24 real training exited with code $LASTEXITCODE" }

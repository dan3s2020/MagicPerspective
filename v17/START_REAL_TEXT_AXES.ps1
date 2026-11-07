param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Text = "",
  [string]$Out = "D:\MagicPerspective-Real-Axes-Run",
  [string]$ImportBrain = "",
  [int]$MaxRows = 50000,
  [int]$EvalChars = 100000,
  [int]$SaveEvery = 5000,
  [switch]$Resume,
  [switch]$EvalOnly,
  [switch]$TrainConstructed
)
$ErrorActionPreference = "Stop"
$cli = Join-Path $PSScriptRoot "research\learned-axes\train-real-text.mjs"
if (-not (Test-Path -LiteralPath $cli -PathType Leaf)) {
  throw "Original real-corpus training script not found: $cli"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required to run this JavaScript research pipeline."
}
$sourcePath = if ($Text) { $Text } else { $Data }
if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Dataset path does not exist: $sourcePath"
}
$argv = @($cli, "--out", $Out, "--max-rows", "$MaxRows",
  "--eval-chars", "$EvalChars", "--save-every", "$SaveEvery")
if ($Text) { $argv += @("--text", $Text) }
else { $argv += @("--data", $Data) }
if ($ImportBrain) {
  if (-not (Test-Path -LiteralPath $ImportBrain -PathType Leaf)) {
    throw "Existing V17 Brain checkpoint not found: $ImportBrain"
  }
  $argv += @("--import-brain", $ImportBrain)
}
if ($Resume) { $argv += "--resume" }
if ($EvalOnly) { $argv += "--eval-only" }
if ($TrainConstructed) { $argv += "--train-constructed" }
Write-Host ""
Write-Host "=== MAGIC PERSPECTIVE: REAL CORPUS / OBSERVED PERSPECTIVES ===" -ForegroundColor Cyan
Write-Host "Input: $sourcePath"
Write-Host "Separate output: $Out"
Write-Host "Original V17 UI and worker remain unchanged." -ForegroundColor Yellow
Write-Host "This Node.js adapter is CPU; it does not claim CUDA."
& node @argv
if ($LASTEXITCODE -ne 0) {
  throw "Real-corpus trainer returned exit code $LASTEXITCODE."
}
Write-Host ""
Write-Host "Results: $(Join-Path $Out 'heldout-results.json')" -ForegroundColor Green
Write-Host "Live event log: $(Join-Path $Out 'train-events.jsonl')"
Write-Host "Saved Brain: $(Join-Path $Out 'brain-real-text.v8')"

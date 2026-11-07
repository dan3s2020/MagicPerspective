# Read-only native checkpoint experiment. Run ONLY in the separate checkout.
param(
 [string]$SourceBrains = "D:\MagicPerspective-Full-Training\brains",
 [string]$ResultsRoot = "",
 [int]$Max = 240,
 [long]$Seed = 20261107
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
if (-not $ResultsRoot) { $ResultsRoot = Join-Path $here "ablation-results" }
if (-not (Test-Path -LiteralPath $SourceBrains -PathType Container)) {
 throw "Training checkpoint folder is missing: $SourceBrains"
}
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js 20+ is required." }
$source = Get-ChildItem -LiteralPath $SourceBrains -File -Filter "brain-0-*.v8" |
 Sort-Object @{Expression={if ($_.Name -eq 'brain-0-stable+many.v8') {0} else {1}}}, @{Expression='LastWriteTimeUtc';Descending=$true} |
 Select-Object -First 1
if (-not $source) { throw "No native graph #0 .v8 checkpoint found in $SourceBrains. Save graph #0 in the original UI first." }

$stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$runDir = Join-Path $ResultsRoot ("graph0-" + $stamp + "-" + [guid]::NewGuid().ToString("N").Substring(0,8))
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
$checkpointCopy = Join-Path $runDir "graph0-checkpoint-copy.v8"

Write-Host "COPYING saved checkpoint, NOT live model memory..." -ForegroundColor Cyan
Write-Host "Source: $($source.FullName)"
Copy-Item -LiteralPath $source.FullName -Destination $checkpointCopy -ErrorAction Stop
$sourceHash = (Get-FileHash -LiteralPath $source.FullName -Algorithm SHA256).Hash
$copyHash = (Get-FileHash -LiteralPath $checkpointCopy -Algorithm SHA256).Hash
if ($sourceHash -ne $copyHash) {
 throw "Source checkpoint changed during copy. Rerun after a completed native save."
}
Write-Host "Checkpoint integrity: MATCH ($copyHash)" -ForegroundColor Green

$test = Join-Path $here "graph0-ablation-core.test.mjs"
Write-Host ""
Write-Host "RUNNING NATIVE ISOLATED UNIT TESTS..." -ForegroundColor Cyan
& $node.Source --test $test
if ($LASTEXITCODE -ne 0) { throw "Native ablation tests failed. No comparison reported." }

$script = Join-Path $here "graph0-self-path-ablation.mjs"
foreach ($arm in @("full","no-self","no-self-fself")) {
 Write-Host ""
 Write-Host "RUNNING $arm against the SAME checkpoint..." -ForegroundColor Yellow
 & $node.Source --max-old-space-size=6144 $script --checkpoint $checkpointCopy --arm $arm --out $runDir --max $Max --seed $Seed
 if ($LASTEXITCODE -ne 0) { throw "Experiment arm failed: $arm" }
}

$rows = @()
foreach ($arm in @("full","no-self","no-self-fself")) {
 $p = Join-Path $runDir ("graph0-" + $arm + ".json")
 $report = Get-Content -LiteralPath $p -Raw | ConvertFrom-Json
 if ($report.checkpoint.sha256.ToUpperInvariant() -ne $copyHash.ToUpperInvariant()) {
  throw "Checkpoint hash differs between experimental arms."
 }
 foreach ($run in $report.runs) {
  if ([double]$run.T -ne 0.6) { continue }
  $rows += [pscustomobject]@{
   Arm = $arm
   Question = $run.question
   OutputCharacters = $run.output.Length
   EightGramLoopPct = [math]::Round(100 * $run.outputRepeatedEightGramFraction,2)
   RevisitedContexts = $run.stats.repeatedContextSteps
   SingleCandidateSteps = $run.stats.singleCandidateSteps
   MultipleCandidateSteps = $run.stats.multiCandidateSteps
   Dominant95 = $run.stats.dominantStepsAt95Pct
   EntropyBits = $run.stats.meanEntropyBits
   EmptySuccessors = $run.stats.emptySuccessorSteps
  }
 }
}
$csv = Join-Path $runDir "comparison-T06.csv"
$rows | Export-Csv -LiteralPath $csv -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "===== SAME-CHECKPOINT CAUSAL COMPARISON (T=0.6) =====" -ForegroundColor Green
$rows | Format-Table -AutoSize -Wrap
Write-Host "Results: $runDir" -ForegroundColor Green
Write-Host "Summary CSV: $csv"
Write-Host "Original V17 launcher, checkpoint and live trainer untouched."

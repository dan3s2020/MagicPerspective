# Phase 2 on the EXISTING COPY made by phase 1. Do not run from the original folder.
param(
 [Parameter(Mandatory=$true)][string]$CheckpointCopy,
 [string]$ResultsRoot = "",
 [int]$Max = 240,
 [long]$Seed = 20261107
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $CheckpointCopy -PathType Leaf)) {
 throw "Frozen checkpoint COPY not found: $CheckpointCopy"
}
$CheckpointCopy = (Resolve-Path -LiteralPath $CheckpointCopy).Path
if ([System.IO.Path]::GetFileName($CheckpointCopy) -ne "graph0-checkpoint-copy.v8" -and
    [System.IO.Path]::GetFileName($CheckpointCopy) -ne "synthetic-graph0.v8" -and
    [System.IO.Path]::GetFileName($CheckpointCopy) -ne "brain-0-stable+many.v8") {
 throw "Unexpected checkpoint filename; choose the frozen copy created by phase1."
}
$here = $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js 20+ is required." }
if (-not $ResultsRoot) { $ResultsRoot = Join-Path $here "phase2-results" }
$stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$runDir = Join-Path $ResultsRoot ("graph0-phase2-" + $stamp + "-" + [guid]::NewGuid().ToString("N").Substring(0,8))
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
# An independent second copy: never write inside phase-1 results or running trainer.
$experimentCheckpoint = Join-Path $runDir "graph0-checkpoint-copy.v8"
Copy-Item -LiteralPath $CheckpointCopy -Destination $experimentCheckpoint -ErrorAction Stop
$hashSource = (Get-FileHash -LiteralPath $CheckpointCopy -Algorithm SHA256).Hash
$hashCopy = (Get-FileHash -LiteralPath $experimentCheckpoint -Algorithm SHA256).Hash
if ($hashSource -ne $hashCopy) {
 throw "Input checkpoint changed while copying; please stop and retry."
}
Write-Host "PHASE 2 CHECKPOINT MATCH: $hashCopy" -ForegroundColor Green
$test = Join-Path $here "graph0-phase2.test.mjs"
& $node.Source --test $test
if ($LASTEXITCODE -ne 0) { throw "Phase 2 unit tests failed." }
$arms = @("full","no-self","no-fself","no-self-fself","half-self-fself","half-fself")
$script = Join-Path $here "graph0-phase2.mjs"
foreach ($arm in $arms) {
 Write-Host "PHASE 2 ARM: $arm" -ForegroundColor Cyan
 & $node.Source --max-old-space-size=6144 $script --checkpoint $experimentCheckpoint --out $runDir --policy $arm --max $Max --seed $Seed
 if ($LASTEXITCODE -ne 0) { throw "Phase 2 policy failed: $arm" }
}
$rows = @()
foreach ($arm in $arms) {
 $reportFile = Join-Path $runDir ("phase2-" + $arm + "-seed" + $Seed + ".json")
 $report = Get-Content -LiteralPath $reportFile -Raw | ConvertFrom-Json
 if ($report.checkpointSha256.ToUpperInvariant() -ne $hashCopy.ToUpperInvariant()) {
  throw "Checkpoint hash was not identical across arms."
 }
 foreach ($entry in $report.rows) {
  $preview = $entry.first200.Substring(0,[Math]::Min(100,$entry.first200.Length))
  $preview = $preview.Replace([string][char]13," ").Replace([string][char]10," ")
  $rows += [pscustomobject]@{
   Arm = $arm
   Prompt = $entry.question
   Characters = $entry.textMetrics.bytes
   LoopPct = [math]::Round(100 * $entry.textMetrics.repeatedEightGramFraction,2)
   RepeatedContexts = $entry.traceMetrics.repeatedContextSteps
   Singletons = $entry.traceMetrics.singleCandidateSteps
   Dominant95 = $entry.traceMetrics.dominantStepsAt95Pct
   EntropyBits = $entry.traceMetrics.meanEntropyBits
   EmptyCandidates = $entry.traceMetrics.emptySuccessorSteps
   PromptUniqueOutputs = $report.promptUniqueOutputs
   First100 = $preview
  }
 }
}
$csv = Join-Path $runDir "phase2-fixed240-comparison.csv"
$rows | Export-Csv -LiteralPath $csv -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "=== PHASE 2: FIXED LENGTH, T=0.6, FROZEN SAME CHECKPOINT ===" -ForegroundColor Green
$rows | Select-Object Arm, Prompt, LoopPct, RepeatedContexts, Singletons, Dominant95, EntropyBits, PromptUniqueOutputs | Format-Table -AutoSize
Write-Host "CSV: $csv" -ForegroundColor Green
Write-Host "Full per-step JSON output: $runDir"
Write-Host "Original native trainer and all saved brains remain untouched."

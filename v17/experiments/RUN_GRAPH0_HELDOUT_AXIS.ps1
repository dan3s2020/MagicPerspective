# Third isolated experiment: actual OpenThoughts3 HELD-OUT next-character evaluation.
# Uses a NEW copy of the saved original checkpoint. No training, no new checkpoint writes.
param(
 [Parameter(Mandatory=$true)][string]$CheckpointCopy,
 [string]$Data = "D:\training\OpenThoughts3-1.2M\data",
 [string]$ResultsRoot = "",
 [int]$Rows = 4,
 [int]$MaxChars = 2048
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $CheckpointCopy -PathType Leaf)) {
 throw "Checkpoint copy missing: $CheckpointCopy"
}
if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
 throw "Dataset folder missing: $Data"
}
$CheckpointCopy = (Resolve-Path -LiteralPath $CheckpointCopy).Path
$here = $PSScriptRoot
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js 20+ required" }
if (-not $ResultsRoot) { $ResultsRoot = Join-Path $here "axis-heldout-results" }
$stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$runDir = Join-Path $ResultsRoot ("graph0-heldout-" + $stamp + "-" + [guid]::NewGuid().ToString("N").Substring(0,8))
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
$newCopy = Join-Path $runDir "graph0-heldout-checkpoint-copy.v8"
Copy-Item -LiteralPath $CheckpointCopy -Destination $newCopy -ErrorAction Stop
$h0 = (Get-FileHash -LiteralPath $CheckpointCopy -Algorithm SHA256).Hash
$h1 = (Get-FileHash -LiteralPath $newCopy -Algorithm SHA256).Hash
if ($h0 -ne $h1) { throw "Snapshot changed while being copied. Analysis refused." }
Write-Host "FROZEN V17 CHECKPOINT SHA256: $h1" -ForegroundColor Cyan
Write-Host "REAL HELD-OUT DATA: $Data"
Write-Host "NO TRAINING OR CHECKPOINT WRITES" -ForegroundColor Yellow
$test = Join-Path $here "graph0-heldout-axis-core.test.mjs"
& $node.Source --test $test
if ($LASTEXITCODE -ne 0) { throw "Native predictive-gating tests failed" }
$script = Join-Path $here "graph0-heldout-axis.mjs"
& $node.Source --max-old-space-size=6144 $script --checkpoint $newCopy --data $Data --out $runDir --rows $Rows --max-chars $MaxChars
if ($LASTEXITCODE -ne 0) { throw "Held-out native-axis evaluation failed" }
$reportFile = Join-Path $runDir "graph0-heldout-axis-score.json"
$report = Get-Content -LiteralPath $reportFile -Raw | ConvertFrom-Json
if ($report.checkpointSha256.ToUpperInvariant() -ne $h1.ToUpperInvariant()) {
 throw "Checkpoint mismatch between experiments"
}
$rowsOut = @()
foreach ($k in @("0","0.1","0.25","0.5","0.75","1")) {
 $normal = $report.aggregates.normal.$k
 $collapsed = $report.aggregates.collapsed.$k
 $rowsOut += [pscustomobject]@{
   GeometryWeight = [double]$k
   AlignedPercent = [math]::Round(100*[double]$normal.allAccuracy,2)
   AnswerPercent = [math]::Round(100*[double]$normal.answerAccuracy,2)
   AnswerWithCollapsedAxes = [math]::Round(100*[double]$collapsed.answerAccuracy,2)
   AnswerNLLBits = [math]::Round([double]$normal.meanAnswerNLL,3)
   AnswerBytes = $normal.answerTotal
   FieldCoveragePercent = [math]::Round(100*[double]$normal.fieldCoverageFraction,2)
 }
}
$csv = Join-Path $runDir "heldout-axis-comparison.csv"
$rowsOut | Export-Csv -LiteralPath $csv -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "=== REAL UNSEEN NEXT-BYTE / ANSWER AXIS COMPARISON ===" -ForegroundColor Green
Write-Host "Selected held-out rows: $($report.selectedRows) / $($report.heldoutRowsAvailable)"
$rowsOut | Format-Table -AutoSize
Write-Host "Metrics: $csv"
Write-Host "Full report: $reportFile"
Write-Host "Original checkpoint and training remain untouched."

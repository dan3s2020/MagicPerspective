# Shows REAL completed OpenThoughts throughput. Does not control or reset
# the original Brain. No synthetic counters or fake GPU percentages.
param(
  [int]$Port = 8877,
  [int]$Worker = 0,
  [int]$Samples = 12,
  [int]$EverySeconds = 5
)
$ErrorActionPreference = "Stop"
if ($Samples -lt 1 -or $Samples -gt 720) { throw "Samples must be 1..720" }
if ($EverySeconds -lt 1 -or $EverySeconds -gt 120) { throw "EverySeconds must be 1..120" }
$base = "http://127.0.0.1:$Port"
Write-Host "Real V17 CUDA/CPU training health; $Samples samples every $EverySeconds seconds" -ForegroundColor Cyan
Write-Host "No process restarts, no checkpoint deletion, no CUDA utilization invented." -ForegroundColor Gray
$lastChars = $null
$lastEx = $null
for ($i = 1; $i -le $Samples; $i++) {
  try {
    $h = Invoke-RestMethod "$base/health?w=$Worker" -TimeoutSec 8
    $state = $h.health.state
    $p = $h.health.phase
    $chars = [long]$h.health.lastReportedChars
    $ex = [long]$h.health.lastReportedExercises
    $mbps = $h.health.textMBps
    $eps = $h.health.exercisesPerSecond
    $batch = $h.health.batch
    $totalRows = $h.dataset.assignedTrainingRows
    $rowsDone = $h.dataset.completedTrainingRows
    $progress = if ($h.dataset) { "{0:N3}%" -f [double]$h.dataset.percent } else { "metadata not ready" }
    $rpc = if ($h.health.gpuRequest) { $h.health.gpuRequest.cmd } else { "none" }
    $deltaChars = if ($null -ne $lastChars) { $chars - $lastChars } else { "-" }
    $deltaEx = if ($null -ne $lastEx) { $ex - $lastEx } else { "-" }
    $lastChars = $chars
    $lastEx = $ex
    Write-Host ("[{0}/{1}] {2} | phase: {3}" -f $i,$Samples,$state,$p) -ForegroundColor $(if ($state -in "error","unresponsive") { "Red" } elseif ($state -eq "stale-snapshot") { "Yellow" } else { "Green" })
    Write-Host ("  text committed: {0:N0} chars (delta {1}) | exercises: {2:N0} (delta {3})" -f $chars,$deltaChars,$ex,$deltaEx)
    Write-Host ("  rate over REAL previous interval: {0:N4} MB/s | {1:N3} exercises/s | Parquet train {2} ({3}/{4})" -f [double]$mbps,[double]$eps,$progress,$rowsDone,$totalRows)
    Write-Host ("  heartbeat age: {0:N1}s | graph age: {1:N1}s | CUDA call: {2}" -f ([double]$h.health.heartbeatAgeMs/1000),([double]$h.health.snapshotAgeMs/1000),$rpc)
    if ($batch) { Write-Host ("  current batch: {0} {1}/{2}" -f $batch.phase,$batch.done,$batch.total) }
    if ($h.lastError) { Write-Host ("  ERROR: "+$h.lastError) -ForegroundColor Red }
  } catch {
    Write-Host "API UNAVAILABLE on port $Port. This server may not be running or has crashed. $($_.Exception.Message)" -ForegroundColor Red
  }
  if ($i -lt $Samples) { Start-Sleep -Seconds $EverySeconds }
}

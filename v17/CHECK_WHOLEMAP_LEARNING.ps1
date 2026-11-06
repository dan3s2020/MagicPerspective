# Read-only diagnostics of the ACTUAL running V17 whole-map experiment.
# No checkpoint reads/writes, no reset, no training mutations.
param(
    [int]$Port = 8868,
    [int]$Worker = 0,
    [int]$Count = 16
)
$ErrorActionPreference = "Stop"

if ($Port -lt 1 -or $Port -gt 65535 -or $Count -lt 1 -or $Count -gt 32) {
    throw "Invalid port or test count."
}

$base = "http://127.0.0.1:$Port"
$graph = Invoke-RestMethod -Method Get -Uri "$base/graph?w=$Worker" -TimeoutSec 30
$slots = Invoke-RestMethod -Method Get -Uri "$base/graphs" -TimeoutSec 30
$slot = @($slots.graphs | Where-Object { $_.w -eq $Worker })[0]

if ($null -eq $slot -or -not (@($slot.worlds) -contains "maptext")) {
    throw "Selected worker does not run maptext."
}
if ($null -eq $graph.wholeMap) {
    throw "No maptext telemetry in the latest live graph; check the worker."
}

$stateNodes = @($graph.nodes | Where-Object { $_[0] -like "whole:text:*" }).Count
$stateEdges = @($graph.edges | Where-Object { $_[0] -like "whole:text:*" -and $_[1] -like "whole:text:*" }).Count
$rawEdges = @($graph.edges).Count
$last = $graph.wholeMap.last

Write-Host ""
Write-Host "=== V17 WHOLE-MAP / LIVE BRAIN ===" -ForegroundColor Cyan
Write-Host "Graph $Worker; worlds: $($slot.worlds -join ', ')"
Write-Host "Lived character events: $($graph.lived); original text exercises: $($graph.exercises)"
Write-Host "Reported graph nodes: $(@($graph.nodes).Count); raw graph edges: $rawEdges"
Write-Host "Whole-map state nodes transmitted: $stateNodes; whole-map edges transmitted: $stateEdges"
Write-Host "Complete worlds navigated: $($graph.wholeMap.episodes); solved by built-in planner: $($graph.wholeMap.solved)"
Write-Host "Last world: $($last.dimensions)D; $($last.states) states; $($last.walls) walls"
Write-Host "Last route: $($last.steps) steps / optimum $($last.optimal); cursor movements: $($last.actualMovements)"
Write-Host "Route computed before first cursor movement: $($last.plannedBeforeFirstCharacter)"
if ($stateNodes -lt $last.states) {
    Write-Warning "Live graph contains fewer state nodes than the map. Inspect streaming/graph rendering."
}
Write-Host "Native learned navigation accuracy: NOT MEASURED (no learned planner is connected)" -ForegroundColor Yellow

$audit = Invoke-RestMethod -Method Get -Uri "$base/maptext-audit?w=$Worker&count=$Count&seed=1729" -TimeoutSec 120
if ($audit.error) {
    throw "Map audit error: $($audit.error)"
}
Write-Host ""
Write-Host "=== FROZEN REFERENCE ALGORITHM AUDIT ===" -ForegroundColor Cyan
Write-Host "World type: $($audit.observedWorldSource)"
Write-Host "Algorithm: $($audit.planner)"
Write-Host "Fresh worlds solved: $($audit.solved)/$($audit.count)"
Write-Host "Optimal routes: $([math]::Round($audit.optimalRate * 100, 1))%"
Write-Host "Learned model trained from raw text: $($audit.modelLearnedWorldFromText)"
Write-Host "Learned navigator metric: N/A; do not confuse this score with learning."

Write-Host ""
Write-Host "=== ACTION ===" -ForegroundColor Cyan
Write-Host "If native learned performance is needed: replace the fixed wavefront with a measured trainable discovery process."

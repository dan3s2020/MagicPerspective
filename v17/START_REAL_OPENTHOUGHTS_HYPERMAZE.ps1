# REAL OpenThoughts3 JSONL -> EXACT tested NativeGoalTextMaze +
# Discoverer.shapeGraph + original observed transformations / 5D/noise.
# Independent of legacy byte-predictor/AligningGraph training process.
# Existing TinyStories, Magic V17 and previous training remain untouched.
param(
 [string]$Data = "D:\training\OpenThoughts3-1.2M\train-00015-of-00120.jsonl",
 [string]$Out = "D:\MagicPerspective-OpenThoughts-Hypermaze-Run",
 [int]$Port = 8899,
 [int]$HoldoutEvery = 100,
 [int]$SaveEvery = 500,
 [int]$TransitionEvery = 128,
 [int]$WindowTokens = 96,
 [int]$MaxTokensPerSegment = 128,
 [int]$MaxObserved = 12000,
 [int]$MaxOperators = 80000,
 [int]$HeapMB = 4096
)
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
 throw "Node.js 20+ is required. Do not silently substitute a different learner."
}
if (-not (Test-Path -LiteralPath $Data)) {
 throw "REAL JSONL source does not exist: $Data"
}
if ($Port -lt 1025 -or $Port -gt 65535) {
 throw "Port must be 1025..65535."
}
if ($HeapMB -lt 1024 -or $HeapMB -gt 8192) {
 throw "HeapMB must be 1024..8192."
}
$server = Join-Path $PSScriptRoot "research\text-hypermaze\real-corpus-server.mjs"
if (-not (Test-Path -LiteralPath $server -PathType Leaf)) {
 throw "The tested native streaming server is missing: $server"
}
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
try { $listener.Start() }
catch { throw "Port $Port is already used. Choose another -Port." }
finally { $listener.Stop() }
$Out = [System.IO.Path]::GetFullPath($Out)
Write-Host "REAL NATIVE HYPERMAZE · OPENTHOUGHTS JSONL" -ForegroundColor Cyan
Write-Host "Actual UTF-8 source: $Data"
Write-Host "Independent original Brain checkpoint: $Out"
Write-Host "Model: NativeGoalTextMaze / Discoverer.shapeGraph / ObservedTransformations / NoiseAgency"
Write-Host "Old AligningGraph byte-predictor is NOT the primary training motor." -ForegroundColor Yellow
Write-Host "Device: CPU for this tested native motor. No false CUDA claim." -ForegroundColor Yellow
Write-Host "Frozen holdout: every $HoldoutEvery-th source row."
Write-Host "UI: http://127.0.0.1:$Port/transcend/torus-aether/ui/native-hypermaze.html" -ForegroundColor Green
Write-Host "Exact-byte source cursor is saved with each original Brain generation."
$arguments = @(
 "--data", $Data,
 "--out", $Out,
 "--port", "$Port",
 "--holdout-every", "$HoldoutEvery",
 "--save-every", "$SaveEvery",
 "--transition-every", "$TransitionEvery",
 "--window-tokens", "$WindowTokens",
 "--max-tokens-per-segment", "$MaxTokensPerSegment",
 "--max-observed", "$MaxObserved",
 "--max-operators", "$MaxOperators",
 "--start"
)
& node "--max-old-space-size=$HeapMB" $server @arguments
if ($LASTEXITCODE -ne 0) {
 throw "The real native hypermaze process exited with code $LASTEXITCODE."
}

# MagicPerspective V17 — frozen transfer evidence
# Does not mutate any brain or training record. The trace must be real observed events.
param(
  [string]$Trace = "",
  [ValidateSet("text", "maze", "transform")]
  [string]$Target = "text",
  [ValidateSet("cpu", "cuda:0")]
  [string]$Device = "cpu",
  [int]$Steps = 80,
  [int]$Batch = 16,
  [int]$Seed = 20261106,
  [string]$Out = ""
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$py = Join-Path $here "transcend\torus-aether\gpu\.venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $py -PathType Leaf)) {
  throw "Missing original V17 Python CUDA environment: $py. Run START_V17_TRANSFER.ps1 first."
}
if (-not $Trace) {
  $Trace = Join-Path $here "runtime-transfer-20261106\brains\brain-0-stable+many.v8.transitions.jsonl"
}
if (-not (Test-Path -LiteralPath $Trace -PathType Leaf)) {
  throw "No training transitions yet: $Trace. Train with -TraceTransformations before auditing."
}
if (-not $Out) {
  $Out = Join-Path $here ("runtime-transfer-20261106\frozen-transfer-" + $Target + ".json")
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Out) | Out-Null
$test = Join-Path $here "transcend\torus-aether\gpu\transfer_benchmark.py"
& $py $test --trace $Trace --target $Target --device $Device --steps $Steps --batch $Batch --seed $Seed --out $Out
if ($LASTEXITCODE -ne 0) { throw "Transfer audit failed with code $LASTEXITCODE" }
Write-Host "Frozen metrics: $Out"

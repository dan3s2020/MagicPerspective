# Native MagicPerspective V31 - real OpenThoughts3 multiworld training.
# Isolated V31 worktree only. Original V17 Brain / Discoverer / text writer unchanged.
# WARNING: Proven controlled topology transfer != verified unrestricted text answers.
# PowerShell 5.1+:
#   powershell -ExecutionPolicy Bypass -File .\v17\START_V31_REAL_TRAINING.ps1 -Data "D:\training\OpenThoughts3-1.2M"
# To continue only this output directory: add -Resume
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Out = "",
  [int]$Port = 8895,
  [int]$GpuWorlds = 16,
  [int]$GpuTextBatch = 2,
  [double]$Vram = 3.0,
  [double]$Mem = 3.0,
  [int]$MazeEvery = 4000,
  [string]$Cuda = "cu126",
  [string]$PythonExe = "",
  [switch]$Resume,
  [switch]$ValidateOnly
)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$expectedBranch = "experiment/V31-CAUSAL-PATH-TO-ANSWER-LEARNING-CURVE-20261107"
$branchNow = (& git -C $repo branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branchNow -ne $expectedBranch) {
  throw "This launcher is for isolated branch $expectedBranch; current branch: $branchNow. No other project or checkpoint was touched."
}
$startV17 = Join-Path $PSScriptRoot "START_V17.ps1"
$originalTrainer = Join-Path $PSScriptRoot "transcend\torus-aether\devour\devour.mjs"
foreach ($source in @($startV17, $originalTrainer)) {
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Original native training source is missing: $source"
  }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js >=20 required." }
$nodeMajor = & node -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$nodeMajor -lt 20) { throw "Node.js >=20 required." }
if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
  throw "Real dataset is missing: $Data. Use -Data with the actual OpenThoughts3 Parquet directory. No synthetic corpus will be substituted."
}
$parquet = Get-ChildItem -LiteralPath $Data -Filter "*.parquet" -File -Recurse -ErrorAction Stop | Select-Object -First 1
if (-not $parquet) { throw "No .parquet data found under $Data. Training not started." }
if ($Port -lt 1024 -or $Port -gt 65535) { throw "Port must be 1024..65535." }
if ($GpuWorlds -lt 1 -or $GpuWorlds -gt 4096) { throw "GpuWorlds must be 1..4096." }
if ($GpuTextBatch -lt 1 -or $GpuTextBatch -gt 128) { throw "GpuTextBatch must be 1..128." }
if ($Vram -lt 0.5 -or $Vram -gt 24) { throw "Vram must be 0.5..24 GiB. The RTX 3050 Ti 4GB default here is 3 GiB." }
if ($Mem -lt 1 -or $Mem -gt 64) { throw "Mem must be 1..64 GiB." }
if ($MazeEvery -lt 1) { throw "MazeEvery must be positive." }
if (-not $Out) { $Out = Join-Path $PSScriptRoot "runtime-v31-real-open-thoughts" }
$Out = [IO.Path]::GetFullPath($Out)
$originalSave = Join-Path $Out "brains"
$checkpointFiles = @(Get-ChildItem -LiteralPath $originalSave -File -ErrorAction SilentlyContinue)
if ($checkpointFiles.Count -gt 0 -and -not $Resume) {
  throw "Existing original checkpoint directory detected in $originalSave. Use -Resume to back up and continue it, or choose an EMPTY -Out. No files changed."
}
if ($Resume -and $checkpointFiles.Count -gt 0 -and -not $ValidateOnly) {
  $backupRoot = Join-Path $Out ("brains-before-v31-resume-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  New-Item -Path $backupRoot -ItemType Directory -ErrorAction Stop | Out-Null
  foreach ($item in $checkpointFiles) {
    Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $backupRoot $item.Name) -ErrorAction Stop
  }
  Write-Host "Original checkpoints and sidecars backed up to $backupRoot" -ForegroundColor Green
}
if ($ValidateOnly) {
  Write-Host "V31 preflight PASS: branch, code, dataset, Node.js, arguments, and checkpoint safety verified. CUDA not tested in -ValidateOnly." -ForegroundColor Green
  exit 0
}
$worlds = "text,cognitivemap,hypertext,maze,transform"
$arguments = @(
  "-Workers","1", "-Arms","stable+many", "-Mem",("$Mem"),
  "-Every","200000", "-Chars","0", "-Data",$Data,
  "-Out",$Out, "-Port",("$Port"), "-Worlds",$worlds,
  "-MazeEvery",("$MazeEvery"), "-Gpu","cuda:0",
  "-GpuWorlds",("$GpuWorlds"), "-GpuTextBatch",("$GpuTextBatch"),
  "-Vram",("$Vram"), "-GpuUtil","100", "-Cuda",$Cuda,
  "-Start"
)
if ($PythonExe) { $arguments += @("-PythonExe",$PythonExe) }
if ($Resume) { $arguments += "-Resume" }
$env:MP_NO_BROWSER = "1"
Write-Host "V31 REAL NATIVE MULTIWORLD TRAINING" -ForegroundColor Cyan
Write-Host "Corpus (no replacement): $Data"
Write-Host "Worlds: $worlds"
Write-Host "Original CUDA V17 text training + maze + transform on GPU; cognitive topology search remains CPU."
Write-Host "No background magic: original Q/A character writer is NOT yet causally connected to Discoverer.shape. No semantic success is promised."
Write-Host "Persistent out: $Out"
Write-Host "Full native V17 UI and original Atlas: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Native checkpoint, frozen evaluation, atlas and audit are from this actual process."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startV17 @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Original V17 training or its CUDA self-tests failed. No implicit fallback to CPU training."
}

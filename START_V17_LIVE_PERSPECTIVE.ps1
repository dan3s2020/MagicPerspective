# MagicPerspective REAL V17 live UI / global-to-body perspective learning.
# Uses the unmodified V17 server/UI path and shared Brain memory.
# Does NOT start the Termux benchmark or synthetic NoiseSpace observatory.
param(
  [int]$Port = 8862,
  [int]$Workers = 1,
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Text = "",
  [string]$Out = "",
  [string]$Gpu = "cuda:0",
  [int]$GpuWorlds = 32,
  [double]$Vram = 2.6,
  [int]$GpuUtil = 100,
  [int]$MazeEvery = 500,
  [string]$PythonExe = "",
  [switch]$NoAutoStart
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$v17 = Join-Path $root "v17"
$entry = Join-Path $v17 "transcend\torus-aether\devour\devour.mjs"
$ui = Join-Path $v17 "transcend\torus-aether\ui\index.html"
$perspective = Join-Path $v17 "transcend\torus-aether\worlds\perspective.mjs"
if (-not (Test-Path $entry) -or -not (Test-Path $ui) -or -not (Test-Path $perspective)) {
  throw "Incomplete V17 isolated clone. Need devour.mjs, the ORIGINAL ui/index.html and perspective.mjs."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required." }
if (-not $Out) { $Out=Join-Path $root "runtime-v17-live-perspective" }
$Out=[IO.Path]::GetFullPath($Out)
$projectOut=[IO.Path]::GetFullPath((Join-Path $root "runtime-v17-live-perspective"))
if ($Out -ne $projectOut) {
  throw "Refusing a custom -Out outside this isolated experiment. Trained brains must not share checkpoints with other versions."
}
$old = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($old) {
  $ownerPids=@($old|Select-Object -ExpandProperty OwningProcess -Unique)
  throw "PORT_IN_USE 127.0.0.1:$Port (PID $($ownerPids -join ',')). Save/stop the existing live session first. Nothing was killed."
}
$gpuPath = $PythonExe
if ($Gpu -ne "off") {
  if (-not $gpuPath) {
    $candidates=@(
      (Join-Path $root "isolated\noise-space\.venv\Scripts\python.exe"),
      "D:\MagicPerspective-NoiseSpace-Isolated\isolated\noise-space\.venv\Scripts\python.exe",
      (Join-Path $v17 "transcend\torus-aether\gpu\.venv\Scripts\python.exe")
    )
    foreach($p in $candidates) { if (Test-Path -LiteralPath $p -PathType Leaf) {$gpuPath=$p;break} }
  }
  if (-not $gpuPath -or -not (Test-Path $gpuPath)) {
    throw "No verified CUDA Python found. Supply -PythonExe <isolated CUDA venv python.exe> or use -Gpu off. No fake GPU fallback."
  }
  $probe = Join-Path $root "isolated\noise-space\CHECK_CUDA_ENV.py"
  if (-not (Test-Path $probe)) {throw "CUDA probe missing: $probe"}
  & $gpuPath $probe
  if ($LASTEXITCODE -ne 0) {throw "CUDA environment failed the tensor computation probe; original GPU model will not be falsely marked active."}
  $env:OCTOPUS_PY = $gpuPath
  Write-Host "Verified CUDA Python: $gpuPath" -ForegroundColor Green
} else {
  Remove-Item Env:OCTOPUS_PY -ErrorAction SilentlyContinue
}
$dataArgs = @()
if ($Text) {
  if (-not (Test-Path $Text -PathType Leaf)) {throw "Text corpus missing: $Text"}
  $dataArgs=@("--text",[IO.Path]::GetFullPath($Text))
} elseif (Test-Path $Data -PathType Container) {
  $dataArgs=@("--data",[IO.Path]::GetFullPath($Data))
} else {
  $alternative = "D:\octopus-text.txt"
  if (Test-Path $alternative -PathType Leaf) {
    Write-Host "Parquet data directory missing. Using the REAL local text corpus $alternative" -ForegroundColor Yellow
    $dataArgs=@("--text",$alternative)
  } else {
    throw "No real text source. Provide -Data <folder with Parquet> or -Text <real corpus>. Existing files were not modified."
  }
}
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$brainDir=Join-Path $Out "brains"
$resume = (Test-Path -LiteralPath $brainDir -PathType Container) -and (@(Get-ChildItem -LiteralPath $brainDir -Filter 'brain-*.v8' -ErrorAction SilentlyContinue).Count -gt 0)
$opts=@(
  "--workers",[string]$Workers,"--arms","winner",
  "--mem","3","--every","20000","--chars","0",
  "--out",$Out,"--port",[string]$Port,
  "--worlds","text,maze,transform","--maze-every",[string]$MazeEvery,
  "--gpu",$Gpu,"--gpu-worlds",[string]$GpuWorlds,
  "--vram",[string]$Vram,"--gpu-util",[string]$GpuUtil
)
$opts += $dataArgs
if($resume){$opts += "--resume"}
if(-not $NoAutoStart){$opts += "--start"}
Write-Host "=== ORIGINAL V17 LIVE TRAINING WITH GLOBAL ↔ BODY LEARNING ===" -ForegroundColor Cyan
Write-Host "UI: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Worlds: text + maze + transformations; perspective trains inside SAME Brain after each maze / GPU batch"
Write-Host "Output/checkpoints: $Out"
Write-Host "Resume existing isolated Brain: $resume"
Write-Host "GPU: $Gpu, original V17 maze physics batch $GpuWorlds; perspective-body updates use CPU"
Write-Host "Never select Reset unless intentionally starting a fresh Brain."
Push-Location $v17
try {
  & node --max-old-space-size=5120 $entry @opts
  if($LASTEXITCODE -ne 0){throw "V17 live server exited with code $LASTEXITCODE"}
} finally {Pop-Location}

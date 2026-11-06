# MagicPerspective V17 Body Perspective — standalone cloned branch only.
# Original V17 NestView, CUDA, training controls, save/resume, evaluation and graph remain.
# Runtime is unique to THIS checkout; no original agent branch or checkpoint is overwritten.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [int]$Port = 8876,
  [string]$Gpu = "cuda:0",
  [int]$GpuWorlds = 16,
  [int]$GpuTextBatch = 1,
  [int]$GpuTextChunk = 32,
  [double]$Vram = 1.8,
  [int]$Workers = 1,
  [string]$PythonExe = "",
  [switch]$Paused
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$runtime = Join-Path $root "runtime-body-perspective-20261106"
$branch = "experiment/ISOLATED-V17-BODY-PERSPECTIVE-20261106"
$server = Join-Path $root "transcend\torus-aether\devour\devour.mjs"
$gpuWorld = Join-Path $root "transcend\torus-aether\gpu\worlds_gpu.py"
$sharedModel = Join-Path $root "transcend\torus-aether\gpu\shared_perspective.py"

$gitRoot = Split-Path $root -Parent
if(-not (Test-Path -LiteralPath (Join-Path $gitRoot ".git"))){
  throw "Launcher must run inside its cloned MagicPerspective Git checkout."
}
$current = (& git -C $gitRoot branch --show-current).Trim()
if($LASTEXITCODE -ne 0 -or $current -ne $branch){
  throw "Wrong checkout ($current). Refusing to use another agent's version."
}
if(-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 20+ required." }
if(-not (Test-Path -LiteralPath $Data -PathType Container)){throw "Parquet corpus folder missing: $Data"}
if(-not (Test-Path -LiteralPath $server -PathType Leaf)){throw "Original V17 devour server missing: $server"}
if($Port -lt 1024 -or $Port -gt 65535){throw "Port must be between 1024 and 65535"}
# Never stop a pre-existing process (it may be training/checkpointing).
$active = @()
if(Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue){
  $active = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}
if($active.Count){
  $owners = (($active | Select-Object -ExpandProperty OwningProcess -Unique) -join ",")
  throw "PORT_IN_USE 127.0.0.1:$Port (PID $owners). Save and stop the existing instance in its own terminal. Nothing was killed."
}
$probeListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
try{ $probeListener.Start() }
catch [System.Net.Sockets.SocketException] {
  throw "PORT_IN_USE 127.0.0.1:$Port. Choose a different -Port or stop your own server after saving."
}finally{ $probeListener.Stop() }

if($Gpu -ne "off"){
  if($Gpu -notmatch "^cuda:\d+$"){throw "Use -Gpu cuda:0 or -Gpu off. CPU PyTorch mode requires deliberate separate setup."}
  if(-not $PythonExe){
    $candidates = @(
      $env:OCTOPUS_PY,
      "D:\MagicPerspective-NoiseSpace-Isolated\isolated\noise-space\.venv\Scripts\python.exe",
      (Join-Path $root "transcend\torus-aether\gpu\.venv\Scripts\python.exe")
    )
    $PythonExe = @($candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1)[0]
  }
  if(-not $PythonExe -or -not (Test-Path -LiteralPath $PythonExe -PathType Leaf)){
    throw "Verified PyTorch CUDA Python missing. Supply -PythonExe pointing to an existing verified CUDA venv. No packages were installed."
  }
  $old = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $PythonExe -c 'import torch,numpy; assert torch.cuda.is_available()'
    if($LASTEXITCODE -ne 0){throw "PyTorch CUDA import failed."}
    & $PythonExe $gpuWorld --selftest $Gpu
    if($LASTEXITCODE -ne 0){throw "Original V17 CUDA maze self-test failed."}
    & $PythonExe $sharedModel --selftest $Gpu
    if($LASTEXITCODE -ne 0){throw "Shared PyTorch perspective gradient CUDA self-test failed."}
  }finally{$ErrorActionPreference = $old}
  $env:OCTOPUS_PY = $PythonExe
  Write-Host "Verified CUDA Python selected: $PythonExe" -ForegroundColor Green
}else{
  Remove-Item Env:OCTOPUS_PY -ErrorAction SilentlyContinue
  Write-Host "Explicit CPU-only training; CUDA disabled." -ForegroundColor Yellow
}

$cmd = @(
  "--workers","$Workers",
  "--arms","stable+many",
  "--mem","3",
  "--every","60000",
  "--chars","0",
  "--data",$Data,
  "--out",$runtime,
  "--port","$Port",
  "--worlds","text,maze,transform",
  "--maze-every","4000",
  "--gpu",$Gpu,
  "--gpu-worlds","$GpuWorlds",
  "--gpu-text-batch","$GpuTextBatch",
  "--gpu-text-chunk","$GpuTextChunk",
  "--vram","$Vram",
  "--gpu-util","100",
  "--resume",
  "--trace-transformations"
)
if(-not $Paused){$cmd += "--start"}
$heap = 5223
Write-Host "=== MAGIC PERSPECTIVE / BODY PERSPECTIVE ISOLATED ===" -ForegroundColor Cyan
Write-Host "Branch: $branch"
Write-Host "Source: $gitRoot"
Write-Host "Checkpoint root: $runtime"
Write-Host "Native V17 graph + training + new tabs: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "To exit safely: Save in UI, Stop, then Ctrl+C once. Original processes and files are untouched."
Push-Location $root
try {
  & node "--max-old-space-size=$heap" $server @cmd
  if($LASTEXITCODE -ne 0){throw "Isolated V17 runtime exited with error code $LASTEXITCODE"}
}finally{Pop-Location}

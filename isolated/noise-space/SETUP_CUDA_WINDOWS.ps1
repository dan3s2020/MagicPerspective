param(
  [string]$Cuda = "cu126",
  [string]$PythonExe = ""
)
$ErrorActionPreference = "Stop"
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $base ".venv"
$py = Join-Path $venv "Scripts\python.exe"
$gpuScript = Join-Path $base "..\..\v17\transcend\torus-aether\gpu\worlds_gpu.py"
Write-Host "=== MAGIC PERSPECTIVE: ISOLATED CUDA SETUP ===" -ForegroundColor Cyan
Write-Host "Only changes: $venv"
if (@("cu124","cu126","cu128") -notcontains $Cuda) { throw "Unsupported CUDA wheel channel: $Cuda" }
if (-not (Test-Path $py)) {
  if (-not $PythonExe) {
    if (Get-Command py -ErrorAction SilentlyContinue) {
      $found = & py -3.12 -c 'import sys; print(sys.executable)' 2>$null
      if ($LASTEXITCODE -eq 0 -and $found) { $PythonExe = $found.Trim() }
    }
    if (-not $PythonExe -and (Get-Command python -ErrorAction SilentlyContinue)) {
      $PythonExe = (Get-Command python).Source
    }
  }
  if (-not $PythonExe -or -not (Test-Path $PythonExe)) {
    throw "Python 3.12 x64 is required. Install it or pass -PythonExe C:\...\python.exe"
  }
  $version = & $PythonExe --version 2>&1
  if ($LASTEXITCODE -ne 0 -or ([string]$version).Trim() -notmatch '^Python 3\.(10|11|12)\.') {
    throw "Use Python 3.10-3.12 x64 (found: $version)."
  }
  & $PythonExe -m venv $venv
  if ($LASTEXITCODE -ne 0) { throw "Failed to create isolated GPU virtual environment." }
}
if (-not (Test-Path $py)) { throw "Isolated Python not found after setup: $py" }
& $py -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "pip upgrade failed." }
& $py -m pip install numpy
if ($LASTEXITCODE -ne 0) { throw "NumPy installation failed; environment remains isolated." }
& $py -m pip install torch --index-url "https://download.pytorch.org/whl/$Cuda"
if ($LASTEXITCODE -ne 0) { throw "PyTorch CUDA installation failed; environment remains isolated." }
& $py -c 'import torch; assert torch.cuda.is_available(); print(torch.__version__,torch.version.cuda,torch.cuda.get_device_name(0))'
if ($LASTEXITCODE -ne 0) { throw "PyTorch did not confirm a real CUDA GPU. No silent CPU fallback." }
& $py $gpuScript --selftest cuda:0
if ($LASTEXITCODE -ne 0) { throw "The original V17 CUDA world self-test failed. Do not mark GPU ready." }
Write-Host "CUDA READY: $py" -ForegroundColor Green
Write-Host "Restart START_NOISE_SPACE.ps1 and enable CUDA in the dashboard."

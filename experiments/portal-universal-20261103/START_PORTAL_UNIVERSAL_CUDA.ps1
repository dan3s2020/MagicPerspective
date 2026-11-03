$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$venv = Join-Path $PSScriptRoot '.venv_portal'
$python = Join-Path $venv 'Scripts\python.exe'

Write-Host '=== MAGICPERSPECTIVE UNIVERSAL GRAPH / CUDA ===' -ForegroundColor Cyan
if (-not (Test-Path $python)) {
    & py -3.12 -m venv $venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 required: py -3.12' }
}

& $python -m pip install --disable-pip-version-check numpy
if ($LASTEXITCODE -ne 0) { throw 'NumPy installation failed' }

# Reuse existing CUDA torch, otherwise install NVIDIA wheels in THIS local venv.
& $python (Join-Path $PSScriptRoot 'cuda_probe.py') *> $null
if ($LASTEXITCODE -ne 0) {
    & $python -m pip install --index-url https://download.pytorch.org/whl/cu128 torch
    if ($LASTEXITCODE -ne 0) { throw 'PyTorch CUDA installation failed' }
}

if ($env:PORTAL_INSTALL_PARQUET -eq '1') {
    & $python -m pip install pyarrow
    if ($LASTEXITCODE -ne 0) { throw 'Optional pyarrow installation failed' }
}

$device = 'cuda'
if ($env:PORTAL_ALLOW_CPU_TEST -eq '1') { $device = 'cpu' }
if ($device -eq 'cuda') {
    & $python (Join-Path $PSScriptRoot 'cuda_probe.py')
    if ($LASTEXITCODE -ne 0) { throw 'Real CUDA compute probe failed. Not claiming GPU training.' }
} else {
    Write-Host 'CPU DIAGNOSTIC ONLY -- NOT CUDA' -ForegroundColor Yellow
}

$data = Join-Path $PSScriptRoot 'data'
if (Test-Path 'D:\training') { $data = 'D:\training\MagicPerspective-PortalUniversal' }
Write-Host "Checkpoint data: $data"
Write-Host 'UI: http://127.0.0.1:3050'
& $python (Join-Path $PSScriptRoot 'server.py') --host 127.0.0.1 --port 3050 --data $data --device $device
if ($LASTEXITCODE -ne 0) { throw 'Portal Universal server stopped with an error' }

# MagicPerspective GPU training launcher - Windows PowerShell 5.1/7.
# Original checkpoints and prior V1-V7 scripts are never modified.
param(
    [ValidateSet("cu126","cu128")][string]$TorchCuda = "cu126",
    [string]$PythonExe = "",
    [switch]$SkipInstall
)
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$studio = Join-Path $repo "experiments\brain-studio-20261103"
$worker = Join-Path $studio "cuda\cuda_worker.py"
if (-not (Test-Path $worker)) { throw "Fisierul CUDA nu exista: $worker. Actualizeaza git main." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js nu este instalat. Instaleaza Node.js 22+ si porneste scriptul din nou."
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Warning "Git nu este gasit. Versiunea existenta a repo-ului va fi folosita."
}
$venv = Join-Path $repo ".venv_graph_cuda"
$python = Join-Path $venv "Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Host "Creare venv Python separat; nu modific alte venv-uri..." -ForegroundColor Cyan
    if ($PythonExe -ne "") {
        & $PythonExe -m venv $venv
    } elseif (Get-Command py -ErrorAction SilentlyContinue) {
        & py -3.12 -m venv $venv
        if ($LASTEXITCODE -ne 0) {
            & py -3.11 -m venv $venv
        }
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
        & python -m venv $venv
    } else {
        throw "Instaleaza Python 3.12 x64, apoi ruleaza din nou."
    }
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $python)) {
        throw "Nu am putut crea mediul Python CUDA separat."
    }
}
& $python -c "import sys; assert (3,10)<=sys.version_info[:2]<=(3,12), 'Python 3.10-3.12 required on Windows'"
if ($LASTEXITCODE -ne 0) { throw "Mediul creat nu are Python compatibil cu PyTorch Windows (3.10-3.12)." }
$working = $false
try {
    & $python -c "import torch; assert torch.cuda.is_available(); print(torch.__version__,torch.cuda.get_device_name(0))" 2>$null
    if ($LASTEXITCODE -eq 0) { $working = $true }
} catch {
    # A missing or CPU-only torch is recoverable: install the CUDA wheel below.
    $working = $false
}
if (-not $working) {
    if ($SkipInstall) {
        throw "PyTorch CUDA lipseste sau driverul NVIDIA nu functioneaza. Scoate -SkipInstall."
    }
    Write-Host "Instalare PyTorch CUDA in .venv_graph_cuda (nu in Python global)..." -ForegroundColor Cyan
    & $python -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw "Actualizarea pip a esuat." }
    & $python -m pip install --upgrade --force-reinstall "torch==2.11.0" --index-url "https://download.pytorch.org/whl/$TorchCuda"
    if ($LASTEXITCODE -ne 0) { throw "PyTorch CUDA nu s-a instalat. Verifica driverul NVIDIA si versiunea Python." }
}
& $python -c "import torch; print('CUDA DISPONIBIL:',torch.cuda.is_available()); print('GPU:',torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'NICIUNUL'); print('VRAM GiB:',round(torch.cuda.get_device_properties(0).total_memory/2**30,2) if torch.cuda.is_available() else 0); assert torch.cuda.is_available(), 'CUDA nu este disponibil. CPU fallback interzis.'"
if ($LASTEXITCODE -ne 0) { throw "CUDA indisponibil: actualizeaza driverul NVIDIA. NU pornesc un CPU demo." }
& $python $worker --self-test
if ($LASTEXITCODE -ne 0) { throw "Testul real cu tensori CUDA a esuat. Nu pornesc antrenarea." }
Write-Host ""
Write-Host "=== MAGIC PERSPECTIVE GRAPH CELLS - CUDA REAL ===" -ForegroundColor Green
Write-Host "Dashboard original: http://127.0.0.1:3044"
Write-Host "Slider: 1-512 simulari GPU in paralel, default 64"
Write-Host "STOP in browser: PAUZA CUDA & SINCRONIZEAZA; Ctrl+C opreste serverul"
Write-Host "CUDA checkpoints separate: experiments\brain-studio-20261103\cuda\data\cuda-live.json"
Write-Host "Nu folosesc CPU fallback si nu ating checkpointurile originale."
Write-Host ""
$env:CUDA_PYTHON = $python
$env:HOST = "127.0.0.1"
$env:PORT = "3044"
Set-Location $studio
& node server.mjs
if ($LASTEXITCODE -ne 0) { throw "Brain Studio s-a inchis cu exit code $LASTEXITCODE. Daca portul 3044 este ocupat, opreste sesiunea anterioara cu Ctrl+C." }

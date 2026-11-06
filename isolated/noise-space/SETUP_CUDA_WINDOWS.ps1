param(
    [ValidateSet("cu126","cu130")]
    [string]$Cuda = "cu126",
    [string]$PythonExe = "",
    [switch]$ForceRepair
)
$ErrorActionPreference = "Stop"

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $base ".venv"
$py = Join-Path $venv "Scripts\python.exe"
$probe = Join-Path $base "CHECK_CUDA_ENV.py"
$gpuScript = Join-Path $base "..\..\v17\transcend\torus-aether\gpu\worlds_gpu.py"

if (-not (Test-Path -LiteralPath $probe -PathType Leaf)) {
    throw "Missing CUDA probe: $probe"
}
if (-not (Test-Path -LiteralPath $gpuScript -PathType Leaf)) {
    throw "Missing original V17 GPU self-test: $gpuScript"
}

Write-Host "=== MAGIC PERSPECTIVE / ISOLATED CUDA REPAIR ===" -ForegroundColor Cyan
Write-Host "Isolated dependency directory: $venv"
Write-Host "Training data and checkpoints are outside .venv and will not be changed."

$healthy = $false
if ((Test-Path -LiteralPath $py -PathType Leaf) -and -not $ForceRepair) {
    Write-Host "Checking EXISTING PyTorch installation (import + real CUDA computation)..." -ForegroundColor Cyan
    try {
        & $py $probe
        if ($LASTEXITCODE -eq 0) { $healthy = $true }
    } catch {
        Write-Host "Existing PyTorch installation is unhealthy: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

if (-not $healthy) {
    Write-Host "Rebuilding incomplete isolated Python environment. Brain/checkpoints stay untouched." -ForegroundColor Yellow

    # Locate and validate a clean base Python interpreter BEFORE removing anything.
    $runner = $null
    $runnerArgs = @()

    if ($PythonExe) {
        if (-not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) {
            throw "Python executable not found: $PythonExe"
        }
        $runner = $PythonExe
    } else {
        if (Get-Command py -ErrorAction SilentlyContinue) {
            foreach ($minor in @("3.12","3.11","3.10")) {
                try {
                    $result = & py "-$minor" --version 2>&1
                    if ($LASTEXITCODE -eq 0 -and ([string]$result).Trim() -match "^Python 3\.(10|11|12)\.") {
                        $runner = (Get-Command py).Source
                        $runnerArgs = @("-$minor")
                        break
                    }
                } catch { }
            }
        }
        if (-not $runner -and (Get-Command python -ErrorAction SilentlyContinue)) {
            $runner = (Get-Command python).Source
        }
    }

    if (-not $runner) {
        throw "No Python 3.10-3.12 interpreter found. Install Python 3.12 x64."
    }
    $version = & $runner @runnerArgs --version 2>&1
    if ($LASTEXITCODE -ne 0 -or ([string]$version).Trim() -notmatch "^Python 3\.(10|11|12)\.") {
        throw "Need Python 3.10-3.12 x64. Selected interpreter: $runner; reported $version"
    }
    Write-Host "Base Python: $runner $($runnerArgs -join ' ') / $version"

    # Only the repository's own .venv can be removed. Never delete a checkpoint.
    $expected = [IO.Path]::GetFullPath((Join-Path $base ".venv"))
    if ([IO.Path]::GetFullPath($venv) -ne $expected) {
        throw "Refusing unexpected environment path: $venv"
    }
    if (Test-Path -LiteralPath $venv) {
        $item = Get-Item -LiteralPath $venv -Force
        if (-not $item.PSIsContainer) { throw "Expected a directory at $venv" }
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Refusing to delete a linked virtual environment directory: $venv"
        }
        Write-Host "Removing ONLY the damaged .venv folder..." -ForegroundColor Yellow
        Remove-Item -LiteralPath $venv -Recurse -Force -ErrorAction Stop
    }

    & $runner @runnerArgs -m venv $venv
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $py -PathType Leaf)) {
        throw "Could not create the isolated virtual environment. Check permissions and disk space."
    }
    Write-Host "Installing NumPy and a fresh CUDA PyTorch wheel with cache disabled..." -ForegroundColor Cyan
    & $py -m pip install --no-cache-dir --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw "pip upgrade failed in isolated environment" }

    & $py -m pip install --no-cache-dir numpy
    if ($LASTEXITCODE -ne 0) { throw "NumPy installation failed in isolated environment" }

    & $py -m pip install --no-cache-dir --only-binary=:all: torch --index-url "https://download.pytorch.org/whl/$Cuda"
    if ($LASTEXITCODE -ne 0) {
        throw "PyTorch CUDA $Cuda installation failed. Check network, disk space and Python compatibility."
    }

    Write-Host "Running real CUDA import/tensor check..." -ForegroundColor Cyan
    & $py $probe
    if ($LASTEXITCODE -ne 0) {
        throw "PyTorch installation finished but CUDA computation failed; see CUDA_PROBE_FAILED above."
    }
} else {
    Write-Host "Existing PyTorch CUDA installation is healthy; no reinstall needed." -ForegroundColor Green
}

Write-Host "Running original V17 512-labyrinth GPU self-test..." -ForegroundColor Cyan
& $py $gpuScript --selftest cuda:0
if ($LASTEXITCODE -ne 0) {
    throw "Original V17 GPU self-test failed. CUDA readiness cannot be certified."
}

Write-Host "CUDA READY: complete PyTorch installation and V17 world physics validated." -ForegroundColor Green
Write-Host "Start: D:\MagicPerspective-NoiseSpace-Isolated\START_NOISE_SPACE.ps1"

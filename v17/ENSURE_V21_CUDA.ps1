# V21 CUDA interpreter bootstrap, adapted from the original START_V17.ps1.
# Isolated GPU environment: v17/transcend/torus-aether/gpu/.venv
# Never installs into Hermes Agent or edits another project's Python environment.
param(
  [Parameter(Mandatory=$true)]
  [ValidatePattern('^cuda:[0-9]+$')]
  [string]$Device,
  [ValidatePattern('^cu[0-9]{3}$')]
  [string]$Cuda = "cu126",
  [string]$PythonExe = ""
)
$ErrorActionPreference = "Stop"

$gpuDir = Join-Path $PSScriptRoot "transcend\torus-aether\gpu"
$projectVenv = Join-Path $gpuDir ".venv"
$projectPython = Join-Path $projectVenv "Scripts\python.exe"
$worldsSelftest = Join-Path $gpuDir "worlds_gpu.py"
$sharedSelftest = Join-Path $gpuDir "shared_perspective.py"
foreach ($scriptPath in @($worldsSelftest, $sharedSelftest)) {
  if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Required original V17 CUDA self-test missing: $scriptPath"
  }
}

function Test-V21CudaPython {
  param([string]$Candidate, [string]$TargetDevice)
  if (-not $Candidate -or -not (Test-Path -LiteralPath $Candidate -PathType Leaf)) {
    return $false
  }
  # PowerShell 5.1 can promote native stderr into a terminating error in Stop mode.
  $oldPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    & $Candidate -c "import sys,torch,numpy; d=sys.argv[1]; assert torch.cuda.is_available(); t=torch.tensor([2.,3.],device=d); assert float(t.sum().item())==5.; print(torch.__version__,torch.version.cuda,d)" $TargetDevice 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
  }
  catch { return $false }
  finally { $ErrorActionPreference = $oldPreference }
}

$selectedPython = $null
if (-not [string]::IsNullOrWhiteSpace($PythonExe)) {
  if (-not (Test-Path -LiteralPath $PythonExe -PathType Leaf)) {
    throw "Explicit -PythonExe path does not exist: $PythonExe"
  }
  if (-not (Test-V21CudaPython $PythonExe $Device)) {
    throw "Explicit -PythonExe is not CUDA-capable for $Device : $PythonExe. No changes were made to this interpreter. Supply a CUDA-enabled Python or omit -PythonExe to use the private V21 environment."
  }
  $selectedPython = (Resolve-Path -LiteralPath $PythonExe).Path
  Write-Host "V21 CUDA: validated explicit Python $selectedPython" -ForegroundColor Green
}
elseif (Test-V21CudaPython $projectPython $Device) {
  $selectedPython = $projectPython
  Write-Host "V21 CUDA: reusing validated local Python $selectedPython" -ForegroundColor Green
}
elseif ($env:OCTOPUS_PY -and (Test-V21CudaPython $env:OCTOPUS_PY $Device)) {
  # Only trust an inherited override after an actual CUDA tensor allocation.
  $selectedPython = $env:OCTOPUS_PY
  Write-Host "V21 CUDA: inherited OCTOPUS_PY passed device validation: $selectedPython" -ForegroundColor Green
}
else {
  if ($env:OCTOPUS_PY) {
    Write-Host "V21 CUDA: ignoring inherited CPU-only/incompatible OCTOPUS_PY: $env:OCTOPUS_PY" -ForegroundColor Yellow
  }
  Write-Host "V21 CUDA: preparing PRIVATE environment $projectVenv" -ForegroundColor Cyan
  if (-not (Test-Path -LiteralPath $projectPython -PathType Leaf)) {
    $oldPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = "Continue"
      if (Get-Command py -ErrorAction SilentlyContinue) {
        foreach ($version in @("3.12","3.11","3.10")) {
          & py "-$version" -m venv $projectVenv 2>&1 | Out-Null
          if ($LASTEXITCODE -eq 0 -and (Test-Path -LiteralPath $projectPython -PathType Leaf)) { break }
        }
      }
      if (-not (Test-Path -LiteralPath $projectPython -PathType Leaf)) {
        $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
        if ($pythonCommand) {
          & $pythonCommand.Source -m venv $projectVenv 2>&1 | Out-Host
          if ($LASTEXITCODE -ne 0) {
            throw "Cannot create private V21 CUDA venv with python. Install Python 3.12 x64 or pass -PythonExe pointing to an already CUDA-enabled Python."
          }
        }
      }
    }
    finally { $ErrorActionPreference = $oldPreference }
  }
  if (-not (Test-Path -LiteralPath $projectPython -PathType Leaf)) {
    throw "No suitable Python to create $projectVenv. Install Python 3.12 x64 or pass -PythonExe pointing to an already CUDA-enabled Python."
  }
  $oldPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    & $projectPython -c "import sys; assert (3,10) <= sys.version_info[:2] <= (3,12), sys.version" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Private GPU Python must be 3.10-3.12 for this original V17 bootstrap. Existing $projectVenv is preserved. Pass -PythonExe with a working CUDA interpreter or create a separate Python 3.12 venv."
    }
    Write-Host "V21 CUDA: installing NumPy and PyTorch CUDA ($Cuda) ONLY into $projectVenv" -ForegroundColor Cyan
    & $projectPython -m pip install --upgrade pip numpy 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "V21 private environment: pip/NumPy installation failed." }
    & $projectPython -m pip install --upgrade --force-reinstall torch --index-url "https://download.pytorch.org/whl/$Cuda" 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "V21 PyTorch CUDA ($Cuda) installation failed. Private environment preserved; try -Cuda cu128 if your NVIDIA driver supports it."
    }
  }
  finally { $ErrorActionPreference = $oldPreference }
  if (-not (Test-V21CudaPython $projectPython $Device)) {
    throw "V21 private Python still cannot allocate a tensor on $Device. Check NVIDIA driver and selected CUDA wheel ($Cuda). No CPU fallback. Python: $projectPython"
  }
  $selectedPython = $projectPython
}
if (-not (Test-V21CudaPython $selectedPython $Device)) {
  throw "Refusing V21 CUDA training: selected interpreter is not CUDA-capable: $selectedPython"
}

# Keep the ORIGINAL V17 CUDA self-tests, before workers/read/write checkpoints.
$oldPreference = $ErrorActionPreference
try {
  $ErrorActionPreference = "Continue"
  Write-Host "V21 CUDA: selected interpreter $selectedPython" -ForegroundColor Green
  & $selectedPython -c "import torch,sys; d=sys.argv[1]; print('PyTorch',torch.__version__,'CUDA',torch.version.cuda,'available',torch.cuda.is_available(),'GPU',torch.cuda.get_device_name(int(d.split(':')[1])))" $Device 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "CUDA device reporting failed." }
  Write-Host "V21 CUDA: original V17 worlds GPU self-test..." -ForegroundColor Cyan
  & $selectedPython $worldsSelftest --selftest $Device 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "Original V17 worlds_gpu.py GPU self-test failed. Trainer not started." }
  Write-Host "V21 CUDA: original shared-perspective gradient GPU self-test..." -ForegroundColor Cyan
  & $selectedPython $sharedSelftest --selftest $Device 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "Original V17 shared_perspective.py GPU self-test failed. Trainer not started." }
}
finally { $ErrorActionPreference = $oldPreference }

# This environment override takes precedence over an inherited Hermes CPU Python
# inside the unmodified GPU client. It remains local to this PowerShell process.
$env:OCTOPUS_PY = $selectedPython
Write-Host "V21 CUDA: ready. OCTOPUS_PY=$env:OCTOPUS_PY" -ForegroundColor Green

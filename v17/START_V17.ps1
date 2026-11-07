# MagicPerspective V17 - Torus-Aether: many graphs devouring OpenThoughts at once, each its own share of the world, once.
#   powershell -ExecutionPolicy Bypass -File .\v17\START_V17.ps1 -Workers 8 -Arms winner,log -Mem 3
#   -Worlds text,maze   the same brains also live the 2D maps (a map every -MazeEvery characters)
#   -Gpu cuda:0 -Vram 3 -GpuUtil 100   (-GpuWorlds 0 = as many worlds as fill the VRAM) the worlds (labyrinths, transformations) run many at once on the
#                       card (first time: installs PyTorch with CUDA in transcend\torus-aether\gpu\.venv); all can be changed on the page
#   -Resume             every brain continues from its save (runtime-devour\brains); the page's Reset starts all from 0
# Ctrl+C stops every graph and prints the summary. Log: runtime-devour\log.jsonl
param(
  [int]$Workers = [Math]::Max(1, [Environment]::ProcessorCount - 1),
  [string]$Arms = "winner",
  [double]$Mem = 3,
  [int]$Every = 200000,
  [long]$Chars = 0,
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Out = "runtime-devour",
  [int]$Port = 8841,
  [string]$Worlds = "text",
  [int]$MazeEvery = 4000,
  [switch]$Resume,
  [string]$Gpu = "off",
  [long]$GpuWorlds = 0,
  [int]$GpuTextBatch = 2,
  [int]$GpuTextChunk = 128,
  [switch]$Start,
  [switch]$MagicUI,
  [switch]$TraceTransformations,
  [switch]$EndogenousNoise,
  [double]$Vram = 0,
  [int]$GpuUtil = 100,
  [string]$Cuda = "cu126",
  [string]$PythonExe = ""
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 20+ is required (https://nodejs.org)" }
if (-not (Test-Path $Data)) { throw "Dataset folder not found: $Data (use -Data <folder with the .parquet files>)" }
if ($Gpu -ne "off") {
  # Windows PowerShell treats anything a program writes on stderr (pip warnings, a failed import check) as an error
  # when ErrorActionPreference is Stop, so this block runs with Continue and checks the exit codes itself.
  # No CPU fallback: if CUDA does not really compute, training does not start.
  $ErrorActionPreference = "Continue"
  $venv = Join-Path $PSScriptRoot "transcend\torus-aether\gpu\.venv"
  $py = Join-Path $venv "Scripts\python.exe"
  if (Test-Path $py) {
    & $py -c "import sys; assert (3,10) <= sys.version_info[:2] <= (3,12)" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Host "The GPU environment has a Python PyTorch does not support on Windows; making it again with Python 3.12/3.11/3.10..."; Remove-Item -Recurse -Force $venv }
  }
  if (-not (Test-Path $py)) {
    Write-Host "Creating the Python environment for the GPU (only the first time)..."
    if ($PythonExe -ne "") { & $PythonExe -m venv $venv }
    elseif (Get-Command py -ErrorAction SilentlyContinue) {
      foreach ($v in "3.12", "3.11", "3.10") { & py "-$v" -m venv $venv 2>&1 | Out-Null; if (Test-Path $py) { break } }
    }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { & python -m venv $venv }
    if (-not (Test-Path $py)) { throw "Could not create $venv. Install Python 3.12 x64 (https://www.python.org/downloads/) or pass -PythonExe <path to python 3.10-3.12>" }
    & $py -c "import sys; assert (3,10) <= sys.version_info[:2] <= (3,12), sys.version" 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { Remove-Item -Recurse -Force $venv; throw "PyTorch with CUDA on Windows needs Python 3.10-3.12. Install Python 3.12 x64 or pass -PythonExe <path>" }
  }
  & $py -c "import torch, numpy; assert torch.cuda.is_available()" 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing PyTorch with CUDA ($Cuda) and NumPy in $venv (only the first time, a few minutes)..."
    & $py -m pip install --upgrade pip 2>&1 | Out-Host
    & $py -m pip install numpy 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "NumPy did not install (see the text above)" }
    & $py -m pip install --upgrade --force-reinstall torch --index-url "https://download.pytorch.org/whl/$Cuda" 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "PyTorch with CUDA did not install (see the text above). Try -Cuda cu124 or -Cuda cu128." }
  }
  & $py -c "import torch; print('PyTorch', torch.__version__, 'CUDA', torch.version.cuda, 'available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'NONE')" 2>&1 | Out-Host
  & $py -c "import torch; assert torch.cuda.is_available()" 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Host "CUDA is not available to PyTorch (NVIDIA driver too old for $Cuda, or a CPU-only PyTorch). No CPU fallback: not starting." -ForegroundColor Red; exit 1 }
  Write-Host "Test on the graphics card ($Gpu)..."
  & $py (Join-Path $PSScriptRoot "transcend\torus-aether\gpu\worlds_gpu.py") --selftest $Gpu 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { Write-Host "The test on the graphics card did NOT pass. Send me the text above." -ForegroundColor Red; exit 1 }
  Write-Host "Testing the shared latent learner on the actual selected PyTorch device..."
  & $py (Join-Path $PSScriptRoot "transcend\torus-aether\gpu\shared_perspective.py") --selftest $Gpu 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "Shared perspective CUDA gradient self-test FAILED. Original trainer not started." }
  $env:OCTOPUS_PY = $py
  $ErrorActionPreference = "Stop"
}
$heap = [int]([Math]::Ceiling($Mem * 1024 * 1.7))
node --max-old-space-size=$heap transcend/torus-aether/devour/devour.mjs --workers $Workers --arms $Arms --mem $Mem --every $Every --chars $Chars --data "$Data" --out "$Out" --port $Port --worlds $Worlds --maze-every $MazeEvery --gpu $Gpu --gpu-worlds $GpuWorlds --gpu-text-batch $GpuTextBatch --gpu-text-chunk $GpuTextChunk --vram $Vram --gpu-util $GpuUtil $(if ($Resume) { "--resume" }) $(if ($Start) { "--start" }) $(if ($MagicUI) { "--magic-view" }) $(if ($TraceTransformations) { "--trace-transformations" }) $(if ($EndogenousNoise) { "--endogenous-noise" })

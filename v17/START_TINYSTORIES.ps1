# MagicPerspective TinyStories Aether - INDEPENDENT real GPU text trainer
# Uses original V17 Python CUDA environment but NEVER starts mixed V17 worker,
# loads OpenThoughts, or overwrites an existing MagicPerspective checkpoint.
param(
 [string]$Data = "D:\training\TinyStories",
 [string]$Train = "",
 [string]$Valid = "",
 [string]$Out = "D:\MagicPerspective-TinyStories-Run",
 [int]$Port = 8897,
 [string]$Gpu = "cuda:0",
 [int]$BatchKB = 128,
 [int]$BatchStories = 180,
 [int]$SaveSeconds = 45,
 [int]$NativeTextEvery = 16,
 [int]$NativeTextBytes = 48,
 [int]$NativeWorldEvery = 32,
 [string]$Cuda = "cu126",
 [string]$PythonExe = "",
 [switch]$Download
)
$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$server = Join-Path $scriptDir "research\tinystories\server.mjs"
if (-not (Test-Path -LiteralPath $server -PathType Leaf)) {
 throw "TinyStories real training server is missing: $server"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
 throw "Node.js is required."
}
if (-not $Train) { $Train = Join-Path $Data "TinyStories-train.txt" }
if (-not $Valid) { $Valid = Join-Path $Data "TinyStories-valid.txt" }
$Train = [System.IO.Path]::GetFullPath($Train)
$Valid = [System.IO.Path]::GetFullPath($Valid)
$Out = [System.IO.Path]::GetFullPath($Out)
if ($Train -eq $Valid) { throw "Train and validation must be different real files." }

if ($Download) {
 if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
  throw "curl.exe is required for resumable TinyStories downloads on Windows."
 }
 $downloads = @(
  @{Path=$Train;Url="https://huggingface.co/datasets/roneneldan/TinyStories/resolve/main/TinyStories-train.txt"},
  @{Path=$Valid;Url="https://huggingface.co/datasets/roneneldan/TinyStories/resolve/main/TinyStories-valid.txt"}
 )
 foreach ($item in $downloads) {
  if (-not (Test-Path -LiteralPath $item.Path -PathType Leaf)) {
   $parent = Split-Path -Parent $item.Path
   New-Item -ItemType Directory -Force -Path $parent | Out-Null
   $partial = $item.Path + ".part"
   Write-Host "Downloading ONLY the official TinyStories text: $($item.Url)" -ForegroundColor Cyan
   Write-Host "File: $($item.Path). The 1.92GB train download can be resumed." -ForegroundColor DarkYellow
   & curl.exe --location --fail --retry 3 --retry-delay 3 --continue-at - --output $partial $item.Url
   if ($LASTEXITCODE -ne 0) { throw "TinyStories download interrupted. Repeat with -Download to resume the .part file." }
   $size = (Get-Item -LiteralPath $partial).Length
   if ($size -lt 100000) { throw "Downloaded file is unexpectedly small ($size bytes). Keeping .part for diagnosis." }
   Move-Item -LiteralPath $partial -Destination $item.Path
  }
 }
}
if (-not (Test-Path -LiteralPath $Train -PathType Leaf)) {
 throw "Missing TinyStories train TXT: $Train. Rerun with -Download, or provide -Train."
}
if (-not (Test-Path -LiteralPath $Valid -PathType Leaf)) {
 throw "Missing separate TinyStories validation TXT: $Valid. Rerun with -Download, or provide -Valid."
}
if (Test-Path -LiteralPath $Out) {
 $files = @(Get-ChildItem -LiteralPath $Out -Force)
 if ($files.Count -gt 0 -and
    -not (Test-Path -LiteralPath (Join-Path $Out "tinystories-manifest.json") -PathType Leaf)) {
  throw "Refusing to touch nonempty output folder without a TinyStories checkpoint marker: $Out"
 }
}
$listen = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
try { $listen.Start() }
catch { throw "TinyStories port $Port is occupied. Choose another -Port." }
finally { $listen.Stop() }
$venv = Join-Path $scriptDir "transcend\torus-aether\gpu\.venv"
$knownV17 = "D:\MagicPerspective-Magic-Live\v17\transcend\torus-aether\gpu\.venv\Scripts\python.exe"
if (-not $PythonExe -and (Test-Path -LiteralPath $knownV17 -PathType Leaf)) {
 $PythonExe = $knownV17
 Write-Host "Reusing the already installed V17 CUDA PyTorch. No 2.6GB re-download." -ForegroundColor Green
}
$py = if ($PythonExe) { [System.IO.Path]::GetFullPath($PythonExe) }
      else { Join-Path $venv "Scripts\python.exe" }
if ($PythonExe -and -not (Test-Path -LiteralPath $py -PathType Leaf)) {
 throw "Provided Python executable does not exist: $py"
}
if (-not (Test-Path -LiteralPath $py -PathType Leaf)) {
 Write-Host "Creating isolated V17 CUDA Python environment (only if missing)..." -ForegroundColor Cyan
 if (Get-Command py -ErrorAction SilentlyContinue) {
  & py -3.12 -m venv $venv
 } elseif (Get-Command python -ErrorAction SilentlyContinue) {
  & python -m venv $venv
 } else { throw "Install Python 3.12 x64 to use GPU PyTorch." }
 if (-not (Test-Path -LiteralPath $py)) { throw "Python venv creation failed at $venv" }
}
if ($Gpu.StartsWith("cuda")) {
 $ErrorActionPreference = "Continue"
 try {
  & $py -c "import torch,numpy;assert torch.cuda.is_available()" 2>&1 | Out-Null
  $available = $LASTEXITCODE -eq 0
  if (-not $available) {
   Write-Host "Installing missing CUDA PyTorch + NumPy into the same V17 venv..." -ForegroundColor Cyan
   & $py -m pip install numpy 2>&1 | Out-Host
   if ($LASTEXITCODE -ne 0) { throw "NumPy installation failed" }
   & $py -m pip install torch --index-url "https://download.pytorch.org/whl/$Cuda" 2>&1 | Out-Host
   if ($LASTEXITCODE -ne 0) { throw "PyTorch CUDA installation failed" }
  }
  & $py -c "import torch;assert torch.cuda.is_available();print('REAL CUDA: '+torch.cuda.get_device_name(0)+' / '+str(torch.__version__))" 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "CUDA GPU test failed - no CPU fallback." }
 } finally { $ErrorActionPreference = "Stop" }
} elseif ($Gpu -ne "numpy") {
 throw "TinyStories mode requires -Gpu cuda:0 (real GPU) or -Gpu numpy (explicit CPU diagnostic)."
}
Write-Host ""
Write-Host "=== MAGIC PERSPECTIVE : TINYSTORIES AETHER (INDEPENDENT) ===" -ForegroundColor Yellow
Write-Host "Real training dataset: $Train"
Write-Host "Separate held-out test dataset: $Valid"
Write-Host "Isolated model: $Out"
Write-Host "Device: $Gpu - only TinyStories text, no OpenThoughts/maze/transform"
Write-Host "Live TinyStories UI: http://127.0.0.1:$Port/" -ForegroundColor Green
Write-Host "Batch: $BatchKB KB or $BatchStories real stories; checkpoint every $SaveSeconds seconds."
Write-Host "The ORIGINAL full V17 Brain learns concurrently on a separate CPU worker:" -ForegroundColor Cyan
Write-Host "language, constructed text paths, 5D graph, maze, perspective, causal transformations, noise and self-code."
Write-Host "Native graph sampling 1/$NativeTextEvery stories x $NativeTextBytes bytes; one maze + transform + selfcode per $NativeWorldEvery stories."
Write-Host "Two separate dataset percentages and independent heldout scores are visible in UI."
Write-Host "Ctrl+C requests an atomic model checkpoint. Restart the same command to resume."
Write-Host ""
$env:OCTOPUS_PY = $py
& node $server --train $Train --valid $Valid --out $Out --port $Port --device $Gpu --batch-kb $BatchKB --batch-stories $BatchStories --save-seconds $SaveSeconds --native-text-every $NativeTextEvery --native-text-bytes $NativeTextBytes --native-world-every $NativeWorldEvery --start --open
if ($LASTEXITCODE -ne 0) { throw "TinyStories real trainer exited with code $LASTEXITCODE" }

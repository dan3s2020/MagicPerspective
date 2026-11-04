# MagicPerspective V11 on Windows with an NVIDIA GPU (CUDA).
# From PowerShell, in your clone (for example D:\MagicPerspective):
#   git pull
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\v11\START_V11_CUDA.ps1
# Creates v11\.venv (only once), installs PyTorch with CUDA + NumPy, checks that CUDA really computes, then starts the Portal.
# The brain, the ledger of unique worlds and the history go to v11\data (or to -Data <folder>).
param([string]$Data = "", [int]$Port = 3047, [string]$Cuda = "cu124")
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
if (-not (Test-Path ".venv\Scripts\python.exe")) {
  if (Get-Command py -ErrorAction SilentlyContinue) { py -3 -m venv .venv } else { python -m venv .venv }
}
$py = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
& $py -c "import torch, numpy" 2>$null
if ($LASTEXITCODE -ne 0) {
  & $py -m pip install --upgrade pip
  & $py -m pip install numpy
  & $py -m pip install torch --index-url "https://download.pytorch.org/whl/$Cuda"
}
& $py selftest.py --device cuda
if ($LASTEXITCODE -ne 0) { Write-Host "CUDA nu funcționează corect: vezi mesajul de mai sus. Pornesc pe CPU." -ForegroundColor Yellow; $dev = "cpu" } else { $dev = "cuda" }
if ($Data -eq "") { $Data = Join-Path $PSScriptRoot "data" }
Write-Host "`nMagicPerspective V11 — http://127.0.0.1:$Port  ($dev)  date: $Data`n"
& $py server.py --device $dev --port $Port --data $Data

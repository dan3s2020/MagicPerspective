# MagicPerspective V14 — Vorbitorul (Windows + NVIDIA CUDA).
# From PowerShell:
#   cd D:\MagicPerspective ; git pull
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\v14\START_V14.ps1
# Optional: -DataFile "D:\training\OpenThoughts3-1.2M\train-00015-of-00120.parquet"  -Cuda cu124  -Port 3049
param([string]$DataFile = "D:\training\OpenThoughts3-1.2M\train-00015-of-00120.parquet", [string]$Cuda = "cu124", [int]$Port = 3049)
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
if (-not (Test-Path ".venv\Scripts\python.exe")) {
  Write-Host "Creez mediul Python v14\.venv (o singură dată)…"
  if (Get-Command py -ErrorAction SilentlyContinue) { py -3 -m venv .venv } else { python -m venv .venv }
}
$py = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
& $py -c "import torch, numpy, pyarrow; assert torch.cuda.is_available()" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Instalez PyTorch cu CUDA ($Cuda), NumPy și PyArrow…"
  & $py -m pip install --upgrade pip
  & $py -m pip install numpy pyarrow
  & $py -m pip install torch --index-url "https://download.pytorch.org/whl/$Cuda"
}
Write-Host "`nTest pe placa video (învață și vorbește?)…"
& $py selftest.py --device cuda --data-file "$DataFile"
if ($LASTEXITCODE -ne 0) { Write-Host "`nTestul NU a trecut. Trimite-mi textul de mai sus." -ForegroundColor Red; exit 1 }
Start-Process "http://127.0.0.1:$Port/"
& $py server.py --device cuda --data-file "$DataFile" --port $Port

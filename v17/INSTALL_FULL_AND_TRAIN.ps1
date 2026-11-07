# Full, non-destructive MagicPerspective V17 training bootstrap.
# Downloads ALL official OpenThoughts3-1.2M Parquet shards, verifies remote
# file manifest and local V17 row metadata, then starts original CUDA V17.
# No synthetic data, no partial silently accepted, no checkpoints deleted.
param(
 [string]$Data = "D:\training\OpenThoughts3-1.2M",
 [string]$Out = "D:\MagicPerspective-Full-Training",
 [int]$Port = 8894,
 [string]$Gpu = "cuda:0",
 [long]$GpuWorlds = 16,
 [double]$Vram = 2.6,
 [double]$Mem = 3,
 [int]$GpuTextBatch = 2,
 [int]$GpuTextChunk = 128,
 [long]$Every = 50000,
 [string]$Cuda = "cu126",
 [switch]$SkipDownload,
 [switch]$VerifyOnly
)
$ErrorActionPreference = "Stop"
$node = Get-Command node -ErrorAction SilentlyContinue
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js 20+ missing. Install OpenJS.NodeJS.LTS, reopen PowerShell." }
if (-not $python) { throw "Python missing. Install Python.Python.3.12, reopen PowerShell." }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot "START_MAGIC_REAL.ps1") -PathType Leaf)) {
 throw "Original CUDA V17 launcher missing. Run from the real MagicPerspective v17 folder."
}
$Data = [System.IO.Path]::GetFullPath($Data)
$Out = [System.IO.Path]::GetFullPath($Out)
$parent = Split-Path -Parent $Data
if (-not (Test-Path -LiteralPath $parent)) {
 New-Item -ItemType Directory -Path $parent -Force | Out-Null
}
if (-not (Test-Path -LiteralPath $Data)) {
 New-Item -ItemType Directory -Path $Data -Force | Out-Null
}
$env:MP_FULL_DATASET_ROOT = $Data

if (-not $SkipDownload) {
 Write-Host "Installing Hugging Face downloader in an ISOLATED environment..." -ForegroundColor Cyan
 # NEVER pip install into whichever Python 'python' resolves to. The user's
 # global interpreter may belong to Hermes/transformers and has constraints.
 $downloadEnv = Join-Path $PSScriptRoot ".hf-dataset-download-venv"
 $downloadPython = Join-Path $downloadEnv "Scripts\python.exe"
 if (-not (Test-Path -LiteralPath $downloadPython)) {
  & $python.Source -m venv $downloadEnv
  if ($LASTEXITCODE -ne 0) { throw "Dedicated download venv creation failed." }
 }
 & $downloadPython -m pip install --upgrade "huggingface_hub>=1.5,<2.0"
 if ($LASTEXITCODE -ne 0) { throw "Isolated huggingface_hub installation failed." }

 $download = @'
import json, os, pathlib
from huggingface_hub import HfApi, snapshot_download

repo = "open-thoughts/OpenThoughts3-1.2M"
root = pathlib.Path(os.environ["MP_FULL_DATASET_ROOT"])
files = sorted(x for x in HfApi().list_repo_files(repo, repo_type="dataset")
               if x.startswith("data/") and x.endswith(".parquet"))
if len(files) < 100:
    raise RuntimeError("Remote dataset exposes fewer than 100 Parquet shards; refusing partial training")
print(f"OFFICIAL DATASET: {len(files)} Parquet shards. Downloading missing files to {root}", flush=True)
snapshot_download(repo_id=repo, repo_type="dataset",
                  allow_patterns=["data/*.parquet"],
                  local_dir=str(root), max_workers=4)
missing = [x for x in files if not (root / x).is_file()
           or (root / x).stat().st_size < 8192]
if missing:
    raise RuntimeError(f"Dataset incomplete: {len(missing)} missing/empty files. First: {missing[:5]}")
(root / ".magicperspective-full-source.json").write_text(
    json.dumps({"repository": repo, "parquetFiles": files,
                "verifiedLocalFileCount": len(files)}, indent=2), encoding="utf8")
print(f"DOWNLOAD VERIFIED: {len(files)} complete Parquet files", flush=True)
'@
 $download | & $downloadPython -
 if ($LASTEXITCODE -ne 0) {
  throw "Dataset incomplete; re-running safely resumes/downloads missing files."
 }
} else {
 if (-not (Test-Path -LiteralPath (Join-Path $Data ".magicperspective-full-source.json"))) {
  throw "SkipDownload denied: verified full dataset manifest does not exist."
 }
}

Write-Host "Checking the ACTUAL parquet rows using the original V17 loader..." -ForegroundColor Cyan
# Native source-file execution avoids PowerShell 5.1 stripping quotes from
# JavaScript strings passed via 'node --input-type=module -e $check'.
$verifier = Join-Path $PSScriptRoot "VERIFY_FULL_DATASET.mjs"
if (-not (Test-Path -LiteralPath $verifier -PathType Leaf)) {
 throw "Original V17 dataset verifier missing: $verifier"
}
& $node.Source $verifier
if ($LASTEXITCODE -ne 0) { throw "V17 did not verify the complete Parquet dataset." }
if ($VerifyOnly) {
 Write-Host "Verified all official Parquet rows. -VerifyOnly requested; CUDA launcher not started." -ForegroundColor Green
 return
}
# Crucial: source the official data/ only, NOT the parent root. The parent can
# contain old standalone Parquet shards and partial .crdownload files.
$nativeData = Join-Path $Data "data"

Write-Host "STARTING ORIGINAL REAL CUDA V17 TRAINING" -ForegroundColor Green
Write-Host "Dataset root: $Data"
Write-Host "Native V17 Parquet directory: $nativeData"
Write-Host "Checkpoint/output: $Out"
Write-Host "GPU: $Gpu; worlds per batch: $GpuWorlds; VRAM cap: $Vram GB"
Write-Host "Live Magic UI: http://127.0.0.1:$Port/transcend/torus-aether/ui/magic.html?live=1"
Write-Host "Original V17 UI: http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "Progress uses committed training examples, never the unique alphabet." -ForegroundColor Cyan

$launch = @{
 Data=$nativeData;Out=$Out;Port=$Port;Workers=1;Arms="stable+many";Worlds="text,maze,transform"
 Gpu=$Gpu;GpuWorlds=$GpuWorlds;Vram=$Vram;Mem=$Mem
 GpuTextBatch=$GpuTextBatch;GpuTextChunk=$GpuTextChunk;Every=$Every;Cuda=$Cuda
}
& (Join-Path $PSScriptRoot "START_MAGIC_REAL.ps1") @launch
if ($LASTEXITCODE -ne 0) { throw "Native V17 launcher exited with code $LASTEXITCODE." }

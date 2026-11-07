param(
  [string]$Python=""
)
$ErrorActionPreference="Stop"
$Root=$PSScriptRoot
$Repo=Split-Path -Parent $Root
$Script=Join-Path $Root "transcend\torus-aether\gpu\v42_real_cuda_parity.py"
if(!(Test-Path -LiteralPath $Script -PathType Leaf)){throw "V42 original native CUDA parity script is missing: $Script"}
if(!(Get-Command git -ErrorAction SilentlyContinue)){throw "Git not installed; immutable V41 comparison requires Git objects"}
& git -C $Repo cat-file -e "829a982570da76d102c3cb9597cfe5dab877239b^{blob}"
if($LASTEXITCODE -ne 0){throw "Immutable V41 exact TextCard blob missing; do not benchmark against unrelated code"}
$venv=Join-Path $Root "transcend\torus-aether\gpu\.venv\Scripts\python.exe"
if([string]::IsNullOrWhiteSpace($Python)){
  if($env:OCTOPUS_PY -and (Test-Path -LiteralPath $env:OCTOPUS_PY -PathType Leaf)){
    $Python=$env:OCTOPUS_PY
  }elseif(Test-Path -LiteralPath $venv -PathType Leaf){
    $Python=$venv
  }elseif(Get-Command python -ErrorAction SilentlyContinue){
    $Python=(Get-Command python).Source
  }else{throw "No valid native Python executable: set -Python to the existing V17 CUDA PyTorch interpreter"}
}
if(!(Test-Path -LiteralPath $Python -PathType Leaf)){
  throw "Python interpreter not found: $Python"
}
Write-Host "V42 original V17 SAME learned TextCard. No original Brain/checkpoint training is launched." -ForegroundColor Cyan
Write-Host "Testing genuine original V41 -> V42 exact CUDA hypothesis on: $Python"
& $Python -c "import torch; assert torch.cuda.is_available(), 'Your selected Python has NO REAL CUDA'; print('REAL_CUDA_DEVICE', torch.cuda.get_device_name(0), torch.__version__)"
if($LASTEXITCODE -ne 0){throw "CUDA unavailable in original selected Python. No CPU timing will be mislabeled a GPU pass."}
& $Python $Script --require-cuda --device cuda:0
if($LASTEXITCODE -ne 0){throw "V42 real CUDA parity/speed audit failed with exit code $LASTEXITCODE; do NOT deploy this optimization"}
Write-Host "V42 real-GPU hot-path outputs matched exact V41 on this workload." -ForegroundColor Green
Write-Host "NOTE: GPU test covers text-card kernel work, NOT full OpenThoughts end-to-end training." -ForegroundColor Yellow
Write-Host "For end-to-end speed use the existing START_V41_SPEED_PROFILE.ps1 and read V41_PHASE_REAL and V41_BATCH_END_TO_END_REAL." -ForegroundColor Yellow

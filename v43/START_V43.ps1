# MagicPerspective V43 — fused one-organism training
# Executable V43 resides in Braivour. Original MagicPerspective V42 untouched.
param(
  [string]$BraivourRoot='D:\Braivour',
  [string]$Data='D:\training\OpenThoughts3-1.2M',
  [string]$DonorGGUF='D:\LocalAi\models\Qwen3.5-35B-A3B-abliterated-Q2_K.gguf',
  [string]$Gpu='cuda:0',
  [double]$Vram=3.0,
  [int]$V43Port=8984,
  [switch]$NoPull
)
$ErrorActionPreference='Stop'
if(!(Test-Path -LiteralPath (Join-Path $BraivourRoot '.git'))){
  throw "Existing Braivour Git checkout required: $BraivourRoot"
}
if(!$NoPull){
  & git -C $BraivourRoot pull --ff-only origin main
  if($LASTEXITCODE -ne 0){throw 'Safe Braivour fast-forward pull refused; local files preserved'}
}
$Launcher=Join-Path $BraivourRoot 'START_BRAIVOUR_V43.ps1'
if(!(Test-Path -LiteralPath $Launcher -PathType Leaf)){throw "V43 launcher missing: $Launcher"}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Launcher -BraivourRoot $BraivourRoot -Data $Data -DonorGGUF $DonorGGUF -Gpu $Gpu -Vram $Vram -V43Port $V43Port
if($LASTEXITCODE -ne 0){throw "V43 launcher exited $LASTEXITCODE"}

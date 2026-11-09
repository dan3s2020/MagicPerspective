# V43: DIRECT update of MagicPerspective V42. SAME PowerShell launch chain,
# SAME browser UI, SAME native Brain/CUDA; no Braivour app or drive path scans.
param(
  [string]$Data="D:\training\OpenThoughts3-1.2M",
  [string]$Worlds="text,maze,transform",
  [string]$V42Out="",
  [string]$Out="",
  [string]$GGUF="",
  [string]$DonorAtlas="",
  [int]$NativePort=8961,
  [int]$UIPort=8962,
  [string]$Gpu="cuda:0",
  [double]$Vram=3.0,
  [int]$GpuTextBatch=1,
  [int]$GpuTextChunk=4096,
  [int]$GpuWorlds=3,
  [switch]$NoBrowser,
  [switch]$AutoStart,
  [switch]$EndogenousNoise
)
$ErrorActionPreference="Stop"
$Root=$PSScriptRoot
$Original=Join-Path $Root "START_V41_SPEED_PROFILE.ps1"
$Export=Join-Path $Root "v43\export_qwen.py"
$Validator=Join-Path $Root "tests\v42-check-original-checkpoint.mjs"
foreach($File in @($Original,$Export,$Validator)){
  if(!(Test-Path -LiteralPath $File -PathType Leaf)){throw "Original V42 or V43 component missing: $File"}
}
if(!(Test-Path -LiteralPath $Data -PathType Container)){throw "Original V42 dataset absent: $Data"}
if($NativePort -eq $UIPort){throw "Original native and UI ports must differ"}
if($Gpu -notin @("cuda:0","off")){throw "Unsupported original V42 GPU selection"}
if([string]::IsNullOrWhiteSpace($V42Out)){$V42Out=Join-Path $Root "runtime-v42-resumed-v41-fast"}
if([string]::IsNullOrWhiteSpace($Out)){$Out=Join-Path $Root "runtime-v43-fused-v42"}
$V42Out=[IO.Path]::GetFullPath($V42Out)
$Out=[IO.Path]::GetFullPath($Out)
if([string]::Equals($Out,$V42Out,[StringComparison]::OrdinalIgnoreCase)){
  throw "V43 cannot overwrite the original saved V42 Brain"
}
$V42Brain=Join-Path $V42Out "brains\brain-0-winner.v8"
$V43Brain=Join-Path $Out "brains\brain-0-winner.v8"
# Exact V42 runtime structure from START_V42_RESUME_V41_FAST.ps1.
# No C:/D: discovery, no guessed alternative project paths, no Braivour service.
if(!(Test-Path -LiteralPath $V43Brain -PathType Leaf)){
  if(!(Test-Path -LiteralPath $V42Brain -PathType Leaf)){
    # First-ever installation: start an authentic original V42 Brain from zero.
    # Do NOT require a retained prior checkpoint, Braivour installation or
    # previous MagicPerspective checkout. The new native worker creates it.
    if(Test-Path -LiteralPath $Out){
      if(@(Get-ChildItem -LiteralPath $Out -Force -ErrorAction SilentlyContinue).Count){
        throw "V43 runtime exists without a saved native Brain; refusing an implicit reset. Use a NEW -Out to start fresh."
      }
    }
    Write-Host "No previous V42 checkpoint: training a fresh ORIGINAL V42 Brain in V43; nothing replaced." -ForegroundColor Cyan
  } else {
  if(Test-Path -LiteralPath $Out){
    if(@(Get-ChildItem -LiteralPath $Out -Force -ErrorAction SilentlyContinue).Count){
      throw "Existing V43 runtime has files but no native Brain. Refusing overwrite."
    }
  }
  $SourceDir=Split-Path -Parent $V42Brain
  $all=@(Get-ChildItem -LiteralPath $SourceDir -File | Where-Object {
    $_.Name -like "brain-0-winner.v8*" -and $_.Name -notlike "*.tmp"
  })
  $Stage=$Out+".import-"+[guid]::NewGuid().ToString("N")
  try{
    $null=New-Item -ItemType Directory -Force -Path (Join-Path $Stage "brains")
    $provenance=@()
    foreach($file in $all){
      $before=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
      $copy=Join-Path (Join-Path $Stage "brains") $file.Name
      Copy-Item -LiteralPath $file.FullName -Destination $copy -ErrorAction Stop
      $after=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
      $written=(Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash
      if($before -ne $after -or $before -ne $written){throw "V42 saved source changed during V43 import"}
      $provenance+=@{file=$file.Name;sha256=$before;bytes=$file.Length}
    }
    & node $Validator (Join-Path $Stage "brains\brain-0-winner.v8")
    if($LASTEXITCODE -ne 0){throw "Native original Brain.load failed; no training started"}
    @{source=$V42Brain;architecture="ORIGINAL_V42_NATIVE_BRAIN";files=$provenance;
      sourceNotModified=$true;destination="V43_fused_one_organism"} |
      ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Stage "V43_IMPORT_MANIFEST.json") -Encoding UTF8
    if(Test-Path -LiteralPath $Out){Remove-Item -LiteralPath $Out -Force}
    Move-Item -LiteralPath $Stage -Destination $Out
  }catch{
    if(Test-Path -LiteralPath $Stage){Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue}
    throw
  }
  Write-Host "Real V42 Brain + ALL sidecars cloned into isolated V43 runtime; original untouched." -ForegroundColor Green
  } # end original V42 checkpoint import (fresh V43 does not import anything)
}
$Atlas=if([string]::IsNullOrWhiteSpace($DonorAtlas)){Join-Path $Root "v43\v43-qwen-donor.json"}else{[IO.Path]::GetFullPath($DonorAtlas)}
if(!(Test-Path -LiteralPath $Atlas -PathType Leaf)){
  if([string]::IsNullOrWhiteSpace($GGUF)){$GGUF=$env:MAGICPERSPECTIVE_QWEN_GGUF}
  if([string]::IsNullOrWhiteSpace($GGUF)){
    throw "No Qwen donor atlas is recorded. Provide -GGUF once, or set MAGICPERSPECTIVE_QWEN_GGUF. V43 does NOT search or guess filenames."
  }
  $GGUF=[IO.Path]::GetFullPath($GGUF)
  if(!(Test-Path -LiteralPath $GGUF -PathType Leaf)){throw "The selected actual GGUF is unavailable: $GGUF"}
  $Py=Join-Path $Root "transcend\torus-aether\gpu\.venv\Scripts\python.exe"
  if(!(Test-Path -LiteralPath $Py -PathType Leaf)){
    if(Get-Command python -ErrorAction SilentlyContinue){$Py=(Get-Command python).Source}
    else{throw "Python required for original Braivour GGUF coordinate extraction"}
  }
  & $Py -c "import numpy, gguf" 2>&1 | Out-Null
  if($LASTEXITCODE -ne 0){
    & $Py -m pip install numpy gguf
    if($LASTEXITCODE -ne 0){throw "Could not install GGUF reader dependencies"}
  }
  & $Py $Export --gguf $GGUF --output $Atlas --dim 64 --tensor-limit 1024 --axes-limit 96
  if($LASTEXITCODE -ne 0){throw "Genuine Qwen coordinate extraction failed. No training started."}
}
$DonorValidator=Join-Path $Root "v43\validate_donor.mjs"
& node $DonorValidator $Atlas
if($LASTEXITCODE -ne 0){throw "V43 donor source-fidelity preflight failed"}
$PreviousDonor=$env:MAGICPERSPECTIVE_V43_DONOR
$PreviousUI=$env:MAGICPERSPECTIVE_V43_UI
$env:MAGICPERSPECTIVE_V43_DONOR=$Atlas
$env:MAGICPERSPECTIVE_V43_UI="1"
Write-Host "MAGICPERSPECTIVE V43: original V42 native trainer, SAME ORIGINAL BROWSER UI" -ForegroundColor Cyan
Write-Host "Start Training mode: only V43 fused one-organism Qwen puppet + original text." -ForegroundColor Green
$ArgsOriginal=@{
  Data=$Data;Worlds=$Worlds;Out=$Out;NativePort=$NativePort;UIPort=$UIPort;Gpu=$Gpu;Vram=$Vram;
  GpuTextBatch=$GpuTextBatch;GpuTextChunk=$GpuTextChunk;GpuWorlds=$GpuWorlds;
  NoBrowser=$NoBrowser;EndogenousNoise=$EndogenousNoise;V43Paused=(!$AutoStart)
}
try{
  & $Original @ArgsOriginal
  if($LASTEXITCODE -ne 0){throw "Original V42 launch chain failed while running V43: $LASTEXITCODE"}
}finally{
  $env:MAGICPERSPECTIVE_V43_DONOR=$PreviousDonor
  $env:MAGICPERSPECTIVE_V43_UI=$PreviousUI
}

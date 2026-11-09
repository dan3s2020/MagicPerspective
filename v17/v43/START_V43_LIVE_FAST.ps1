# MagicPerspective V43 fast one-window live launcher.
# Starts the ORIGINAL native V42 Brain with the existing GGUF donor, real Parquet
# and text-only worlds; never installs software or deletes old checkpoints.
param(
  [string]$Destination="D:\MagicPerspective-V43",
  [string]$Data="D:\training\OpenThoughts3-1.2M",
  [string]$GGUF="",
  [switch]$LeaveOldWorkersRunning
)
$ErrorActionPreference="Stop"
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$Branch="feature/V43-NATIVE-V42-ONE-UNIVERSE-20261108"
$Repo="dan3s2020/MagicPerspective"
$Destination=[IO.Path]::GetFullPath($Destination)
$Root=Join-Path $Destination "source\v17"
if(!(Test-Path -LiteralPath (Join-Path $Root "START_V43.ps1") -PathType Leaf)){
  throw "V43 source missing at $Root. This is an updater, not a new installation."
}
if(!(Test-Path -LiteralPath $Data -PathType Container)){
  throw "Real original OpenThoughts Parquet dataset missing: $Data"
}
$Python=Join-Path $Root "transcend\torus-aether\gpu\.venv\Scripts\python.exe"
if(!(Test-Path -LiteralPath $Python -PathType Leaf)){
  throw "Existing original CUDA Python environment missing: $Python"
}
& $Python -c "import torch;assert torch.cuda.is_available();print('CUDA OK',torch.__version__,torch.cuda.get_device_name(0))"
if($LASTEXITCODE -ne 0){throw "Real CUDA unavailable: no silent CPU fallback."}
$changed=@(
  "v17/START_V41_SPEED_PROFILE.ps1",
  "v17/START_V43.ps1",
  "v17/transcend/torus-aether/devour/brain-character-world.mjs",
  "v17/transcend/torus-aether/devour/v43-fused-one-universe.mjs",
  "v17/apps/hypermaze-studio-v26/v43-journal.mjs",
  "v17/apps/hypermaze-studio-v26/native-bridge.mjs",
  "v17/apps/hypermaze-studio-v26/public/native-v43.html",
  "v17/apps/hypermaze-studio-v26/public/v43-ui.js",
  "v17/apps/hypermaze-studio-v26/public/v43.css"
)
$Stage=Join-Path $Destination ("v43-update-stage-"+[guid]::NewGuid().ToString("N"))
$Backups=Join-Path $Destination ("v43-update-backup-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
try{
  $null=New-Item -ItemType Directory -Force -Path $Stage
  foreach($rel in $changed){
    $url="https://raw.githubusercontent.com/$Repo/$Branch/$rel"
    $file=Join-Path $Stage $rel
    $null=New-Item -ItemType Directory -Force -Path (Split-Path -Parent $file)
    Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $file
    if(!(Test-Path -LiteralPath $file -PathType Leaf) -or
      (Get-Item -LiteralPath $file).Length -lt 40){throw "Empty or missing file from source: $rel"}
    if($rel.EndsWith(".ps1")){
      $tokens=$null;$errors=$null
      [System.Management.Automation.Language.Parser]::ParseFile($file,[ref]$tokens,[ref]$errors)|Out-Null
      if($errors.Count){throw "Invalid PowerShell source $rel : $($errors[0])"}
    }
    if($rel.EndsWith(".js") -or $rel.EndsWith(".mjs")){
      & node --check $file
      if($LASTEXITCODE -ne 0){throw "Invalid original Node source: $rel"}
    }
  }
  # All downloaded files passed syntax before the first installed file changes.
  foreach($rel in $changed){
    $destFile=Join-Path $Destination ("source\"+$rel.Replace("/","\"))
    $stageFile=Join-Path $Stage $rel
    if(!(Test-Path -LiteralPath $destFile -PathType Leaf)){
      throw "Installed file missing; no silent architecture replacement: $destFile"
    }
    if((Get-FileHash -LiteralPath $destFile -Algorithm SHA256).Hash -ne
       (Get-FileHash -LiteralPath $stageFile -Algorithm SHA256).Hash){
      $back=Join-Path $Backups $rel
      $null=New-Item -ItemType Directory -Force -Path (Split-Path -Parent $back)
      Copy-Item -LiteralPath $destFile -Destination $back
      Copy-Item -LiteralPath $stageFile -Destination $destFile
    }
  }
  Write-Host "V43 native real-live UI updated; previous source files backed up in $Backups" -ForegroundColor Green
} finally {
  if(Test-Path -LiteralPath $Stage){Remove-Item -LiteralPath $Stage -Force -Recurse}
}

# Pause ONLY the known MagicPerspective worker ports from prior commands;
# never kill a process or touch other programs. Save the original Brain first.
function Pause-MagicWorker([int]$Port){
  try{
    $base="http://127.0.0.1:$Port"
    $state=Invoke-RestMethod -Uri ($base+"/health?w=0") -TimeoutSec 3
    if([string]$state.status -match "^antren"){
      Write-Host "Pausing previous MagicPerspective $Port and requesting native checkpoint..." -ForegroundColor Yellow
      Invoke-RestMethod -Method Post -Uri ($base+"/control?do=pause") -TimeoutSec 12 | Out-Null
      Invoke-RestMethod -Method Post -Uri ($base+"/control?do=save") -TimeoutSec 12 | Out-Null
      return $true
    }
  }catch{
    Write-Warning "Could not pause MagicPerspective on $Port : $($_.Exception.Message)"
  }
  return $false
}
$OldPaused=$false
$OldSaveRequestedAt=Get-Date
if(!$LeaveOldWorkersRunning){
  $OldPaused=Pause-MagicWorker 8951
  $null=Pause-MagicWorker 8961
}
$Out=Join-Path $Root "runtime-v43-one-universe-live"
$V42Out=Join-Path $Root "runtime-V43-REAL-CUDA-FAST"
$CandidateCheckpoints=@(
  (Join-Path $V42Out "brains\brain-0-winner.v8"),
  (Join-Path $Root "runtime-v43-fused-v42\brains\brain-0-winner.v8")
)
if(!(Test-Path -LiteralPath (Join-Path $Out "brains\brain-0-winner.v8") -PathType Leaf)){
  if($OldPaused){
    $ConfirmedNewCheckpoint=$false
    for($i=0;$i -lt 120;$i++){
      if(Test-Path -LiteralPath $CandidateCheckpoints[0] -PathType Leaf){
        $saved=Get-Item -LiteralPath $CandidateCheckpoints[0]
        if($saved.Length -gt 0 -and $saved.LastWriteTime -ge $OldSaveRequestedAt.AddSeconds(-2)){
          $ConfirmedNewCheckpoint=$true;break
        }
      }
      Start-Sleep -Milliseconds 500
    }
    if(!$ConfirmedNewCheckpoint){
      throw "Previous original V17 Brain did not confirm a NEW checkpoint after pause. Refusing to import a stale state."
    }
  }
  $found=$CandidateCheckpoints|Where-Object{Test-Path -LiteralPath $_ -PathType Leaf}|Select-Object -First 1
  if($found){$V42Out=Split-Path -Parent (Split-Path -Parent $found)}
  else{Write-Warning "No original saved Brain found: a NEW V43 Brain will begin, old runtimes unchanged."}
}

$Atlas=Join-Path $Root "v43\v43-qwen-donor.json"
if(!(Test-Path -LiteralPath $Atlas -PathType Leaf)){
  if([string]::IsNullOrWhiteSpace($GGUF)){
    $selections=Join-Path $Destination "selected-paths.json"
    if(Test-Path -LiteralPath $selections){
      $GGUF=(Get-Content -LiteralPath $selections -Raw -Encoding UTF8|ConvertFrom-Json).GGUF
    }
  }
  if([string]::IsNullOrWhiteSpace($GGUF) -or !(Test-Path -LiteralPath $GGUF -PathType Leaf)){
    throw "No existing genuine Qwen donor atlas or known GGUF path. Pass -GGUF with your already selected file."
  }
}
$NativePort=8971;$UIPort=8972
foreach($port in @($NativePort,$UIPort)){
  if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){
    throw "Port $port is occupied by another session. No process was killed."
  }
}
Write-Host "ONE LIVE WINDOW: http://127.0.0.1:$UIPort" -ForegroundColor Green
Write-Host "Real Parquet: $Data; original Brain: $V42Out; resumed V43: $Out" -ForegroundColor Cyan
Write-Host "Training worlds: TEXT ONLY. GPU: CUDA 0; text batch=8; chunk=4096; VRAM=3GB." -ForegroundColor Cyan
Write-Host "Qwen: real sampled GGUF coordinate movements; NO false claim of native Qwen forward inference or 100% accuracy." -ForegroundColor Yellow

$launchArgs=@{
  Data=$Data;Worlds="text";Out=$Out;V42Out=$V42Out
  NativePort=$NativePort;UIPort=$UIPort
  Gpu="cuda:0";Vram=3.0;GpuTextBatch=8;GpuTextChunk=4096;GpuWorlds=0;AutoStart=$true
}
if(Test-Path -LiteralPath $Atlas -PathType Leaf){$launchArgs.DonorAtlas=$Atlas}
else{$launchArgs.GGUF=$GGUF}
& (Join-Path $Root "START_V43.ps1") @launchArgs
if($LASTEXITCODE -ne 0){throw "Native V43 runtime exited with error code $LASTEXITCODE"}

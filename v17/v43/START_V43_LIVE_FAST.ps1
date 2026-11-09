# MagicPerspective V43 fast one-window live launcher.
# Starts the ORIGINAL native V42 Brain with the existing GGUF donor, real Parquet
# and text-only worlds; never installs software or deletes old checkpoints.
param(
  [string]$Destination="D:\MagicPerspective-V43",
  [string]$Data="D:\training\OpenThoughts3-1.2M",
  [string]$GGUF="",
  [switch]$LeaveOldWorkersRunning,
  [switch]$StopStalledOldWorkers,
  [string]$SourceRef="feature/V43-NATIVE-V42-ONE-UNIVERSE-20261108"
)
$ErrorActionPreference="Stop"
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$Branch=$SourceRef
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
  "v17/transcend/torus-aether/devour/worker.mjs",
  "v17/transcend/torus-aether/devour/brain-character-world.mjs",
  "v17/transcend/torus-aether/devour/v43-telemetry.mjs",
  "v17/transcend/torus-aether/devour/v43-weight-coordinate-planner.mjs",
  "v17/v43/verify_frozen_donor_cuda.py",
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
    $exists=Test-Path -LiteralPath $destFile -PathType Leaf
    $NewV43Components=@(
      "v17/transcend/torus-aether/devour/v43-telemetry.mjs",
      "v17/transcend/torus-aether/devour/v43-weight-coordinate-planner.mjs",
      "v17/v43/verify_frozen_donor_cuda.py"
    )
    if(!$exists -and $NewV43Components -notcontains $rel){
      throw "Original V43 source file missing; no silent architecture replacement: $destFile"
    }
    $different=(!$exists)
    if($exists){
      $different=(Get-FileHash -LiteralPath $destFile -Algorithm SHA256).Hash -ne
        (Get-FileHash -LiteralPath $stageFile -Algorithm SHA256).Hash
    }
    if($different){
      if($exists){
        $back=Join-Path $Backups $rel
        $null=New-Item -ItemType Directory -Force -Path (Split-Path -Parent $back)
        Copy-Item -LiteralPath $destFile -Destination $back
      }
      Copy-Item -LiteralPath $stageFile -Destination $destFile
    }
  }
  Write-Host "V43 native real-live UI updated; previous source files backed up in $Backups" -ForegroundColor Green
} finally {
  if(Test-Path -LiteralPath $Stage){Remove-Item -LiteralPath $Stage -Force -Recurse}
}

# Full physical reachability check on the ACTUAL selected Qwen coordinates,
# using the already-installed PyTorch CUDA. Zero training is performed yet.
$Atlas=Join-Path $Root "v43\v43-qwen-donor.json"
if(!(Test-Path -LiteralPath $Atlas -PathType Leaf)){
  throw "Existing real Qwen donor atlas is missing: $Atlas. No training started."
}
$Verify=Join-Path $Root "v43\verify_frozen_donor_cuda.py"
$Proof=Join-Path $Destination "v43-real-qwen-reachability.json"
Write-Host "CUDA PREFLIGHT: physically verify ALL 65,536 Qwen coordinate-to-coordinate visible-target moves" -ForegroundColor Cyan
& $Python $Verify --atlas $Atlas --report $Proof --batch 4096
if($LASTEXITCODE -ne 0){
  throw "Real Qwen atlas cannot reach 100% of visible targets with these frozen axes. Training NOT started. See $Proof"
}
Write-Host "REAL QWEN FROZEN-GEOMETRY REACHABILITY PASSED; NOT A QWEN LANGUAGE INFERENCE RESULT" -ForegroundColor Green

# Stop duplicate CUDA workload ONLY in known native MagicPerspective instances.
# A pause without a newly saved .v8 is not treated as a safe resume source.
function Pause-MagicWorker([int]$Port){
  try{
    $base="http://127.0.0.1:$Port"
    $state=Invoke-RestMethod -Uri ($base+"/health?w=0") -TimeoutSec 3
    $checkpoint=[string]$state.checkpoint
    if($checkpoint -notlike "$Root\*"){return $null}
    if([string]$state.status -match "^antren"){
      $requested=Get-Date
      Write-Host "Pausing ONLY known MagicPerspective trainer on $Port..." -ForegroundColor Yellow
      Invoke-RestMethod -Method Post -Uri ($base+"/control?do=pause") -TimeoutSec 12|Out-Null
      Invoke-RestMethod -Method Post -Uri ($base+"/control?do=save") -TimeoutSec 12|Out-Null
      return @{checkpoint=$checkpoint;at=$requested;port=$Port}
    }
  }catch{
    Write-Warning "MagicPerspective port $Port pause probe: $($_.Exception.Message)"
  }
  return $null
}
$Paused=@()
if(!$LeaveOldWorkersRunning){
  foreach($port in @(8951,8961,8971,8973,8985,8991,8997)){
    $p=Pause-MagicWorker $port
    if($p){$Paused+=,$p}
  }
}
function Stop-VerifiedOldMagicWorker($item){
  $runtime=Split-Path -Parent (Split-Path -Parent $item.checkpoint)
  $native=@(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue|Where-Object{
    $_.Name -match '^node(\.exe)?$' -and
    $_.CommandLine -match 'devour[\\/]+devour\.mjs' -and
    $_.CommandLine -like "*$runtime*"
  })
  if($native.Count -ne 1){
    throw "Could not uniquely identify old MagicPerspective native PID for $runtime. No foreign process touched."
  }
  $OldPid=[int]$native[0].ProcessId
  Write-Host "Stopping ONLY obsolete MagicPerspective PID $OldPid, including its old CUDA child." -ForegroundColor Yellow
  & taskkill.exe /PID $OldPid /T /F | Out-Host
  if($LASTEXITCODE -ne 0){throw "Unable to stop old MagicPerspective PID $($native[0].ProcessId)"}
}
foreach($p in $Paused){
  $confirmed=$false
  for($i=0;$i -lt 30;$i++){
    if(Test-Path -LiteralPath $p.checkpoint -PathType Leaf){
      $saved=Get-Item -LiteralPath $p.checkpoint
      if($saved.Length -gt 0 -and $saved.LastWriteTime -ge $p.at.AddSeconds(-2)){
        $confirmed=$true;break
      }
    }
    Start-Sleep -Milliseconds 500
  }
  if(!$confirmed){
    if(!$StopStalledOldWorkers){
      throw "Port $($p.port) has not saved a fresh Brain. No data discarded. Use -StopStalledOldWorkers ONLY to resume last saved .v8."
    }
    if(!(Test-Path -LiteralPath $p.checkpoint -PathType Leaf) -or
       (Get-Item -LiteralPath $p.checkpoint).Length -le 0){
      throw "Port $($p.port) has NO saved original Brain; cannot safely recover."
    }
    Write-Warning "Stopped stale work may lose UNSAVED observations since last .v8. Saved Brain is preserved."
  }
  Stop-VerifiedOldMagicWorker $p
}
$OldV43=Join-Path $Root "runtime-v43-one-universe-live"
$OldV42=Join-Path $Root "runtime-V43-REAL-CUDA-FAST"
$OldFused=Join-Path $Root "runtime-v43-fused-v42"
$Out=Join-Path $Root "runtime-v43-one-universe-fastfix"
$CandidateFolders=@($Out,$OldV43,$OldV42,$OldFused)
$ExistingCheckpoint=@($CandidateFolders|ForEach-Object{
  $f=Join-Path $_ "brains\brain-0-winner.v8"
  if(Test-Path -LiteralPath $f -PathType Leaf){Get-Item -LiteralPath $f}
}|Sort-Object LastWriteTime -Descending|Select-Object -First 1)
if(!$ExistingCheckpoint.Count){
  throw "No saved original native Brain .v8 found. Refusing to start from zero or erase unsaved work."
}
$V42Out=Split-Path -Parent (Split-Path -Parent $ExistingCheckpoint[0].FullName)
if([string]::Equals($V42Out,$Out,[StringComparison]::OrdinalIgnoreCase)){
  $Other=@($CandidateFolders|Where-Object{$_ -ne $Out}|ForEach-Object{
    $f=Join-Path $_ "brains\brain-0-winner.v8"
    if(Test-Path -LiteralPath $f -PathType Leaf){Get-Item -LiteralPath $f}
  }|Sort-Object LastWriteTime -Descending|Select-Object -First 1)
  if($Other.Count){$V42Out=Split-Path -Parent (Split-Path -Parent $Other[0].FullName)}
  else{$V42Out=$OldV42} # only a distinct non-target path is required for an existing V43 save
}
# Never re-use an existing runtime directory without a valid Brain.
$OwnCheckpoint=Join-Path $Out "brains\brain-0-winner.v8"
if((Test-Path -LiteralPath $Out -PathType Container) -and
   !(Test-Path -LiteralPath $OwnCheckpoint -PathType Leaf)){
  if(@(Get-ChildItem -LiteralPath $Out -Force -ErrorAction SilentlyContinue).Count){
    $Out=$Out+"-"+(Get-Date -Format "yyyyMMdd-HHmmss")
  }
}
# If a previous native process owns the fixed fastfix checkpoint, clone the
# latest checkpoint into a new isolated runtime rather than overwrite it.
$NativeProcesses=@(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue|
  Where-Object{$_.Name -match '^node(\.exe)?$' -and
    $_.CommandLine -match 'devour[\\/]+devour\.mjs' -and
    $_.CommandLine -like "*$Out*"})
if($NativeProcesses.Count){
  $Out=$Out+"-"+(Get-Date -Format "yyyyMMdd-HHmmss")
}
$NativePort=0;$UIPort=0
foreach($p in @(8973,8985,8991,8997,9013,9019)){
  $occupied=@(Get-NetTCPConnection -LocalPort $p,($p+1) -State Listen -ErrorAction SilentlyContinue)
  if(!$occupied.Count){$NativePort=$p;$UIPort=$p+1;break}
}
if(!$NativePort){throw "No free isolated pair of ports for V43; no processes were killed"}

Write-Host "ONE LIVE WINDOW: http://127.0.0.1:$UIPort" -ForegroundColor Green
Write-Host "Real Parquet: $Data; original Brain: $V42Out; resumed V43: $Out" -ForegroundColor Cyan
Write-Host "Training worlds: TEXT ONLY. GPU: CUDA 0; text batch=8; chunk=4096; VRAM=3GB." -ForegroundColor Cyan
Write-Host "Unrequested maze, transform and xD worlds: DISABLED; original text and shared learner retained." -ForegroundColor Cyan
Write-Host "Qwen: real sampled GGUF coordinate movements; NO false claim of native Qwen forward inference or 100% accuracy." -ForegroundColor Yellow

$launchArgs=@{
  Data=$Data;Worlds="text";Out=$Out;V42Out=$V42Out
  NativePort=$NativePort;UIPort=$UIPort
  Gpu="cuda:0";Vram=3.0;GpuTextBatch=8;GpuTextChunk=4096;GpuWorlds=0;XdAtlasEvery=0;AutoStart=$true
}
if(Test-Path -LiteralPath $Atlas -PathType Leaf){$launchArgs.DonorAtlas=$Atlas}
else{$launchArgs.GGUF=$GGUF}
& (Join-Path $Root "START_V43.ps1") @launchArgs
if($LASTEXITCODE -ne 0){throw "Native V43 runtime exited with error code $LASTEXITCODE"}

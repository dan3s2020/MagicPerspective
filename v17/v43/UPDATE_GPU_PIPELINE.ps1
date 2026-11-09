# One-command V43 GPU conveyor update for the existing D: installation.
# Preserves checkpoints, donor GGUF, saved selections, V42 source, CUDA venv
# and all files outside a bounded original-MagicPerspective source whitelist.
# Windows PowerShell 5.1 compatible; ASCII-only; no C:/D: drive scans.
param(
  [string]$Destination="D:\MagicPerspective-V43",
  [switch]$NoStart
)
$ErrorActionPreference="Stop"
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$Destination=[IO.Path]::GetFullPath($Destination)
if(!($Destination -like "D:\*")){throw "V43 must remain on D:"}
$Source=Join-Path $Destination "source"
$Root=Join-Path $Source "v17"
$Bootstrap=Join-Path $Destination "BOOTSTRAP_D.ps1"
$Ref="feature/V43-NATIVE-V42-ONE-UNIVERSE-20261108"
$Base="https://github.com/dan3s2020/MagicPerspective"
if(!(Test-Path -LiteralPath (Join-Path $Root "START_V43.ps1") -PathType Leaf)){
  Write-Host "No V43 source found: installing fresh through the existing D: bootstrap." -ForegroundColor Cyan
  $null=New-Item -ItemType Directory -Force -Path $Destination
  Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/dan3s2020/MagicPerspective/$Ref/v17/v43/BOOTSTRAP_D.ps1" -OutFile $Bootstrap
  & powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File $Bootstrap
  if($LASTEXITCODE -ne 0){throw "Fresh V43 bootstrap failed with exit $LASTEXITCODE"}
  return
}
# Never replace working source while its native worker or UI may be running.
foreach($Port in @(8961,8962)){
  $active=@(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  if($active.Count){
    throw "Original MagicPerspective native port $Port is active. Stop and SAVE existing training first; source update aborted."
  }
}
$List=@(
  "v17/START_V43.ps1",
  "v17/transcend/torus-aether/devour/brain.mjs",
  "v17/transcend/torus-aether/devour/worker.mjs",
  "v17/transcend/torus-aether/devour/devour.mjs",
  "v17/apps/hypermaze-studio-v26/native-bridge.mjs",
  "v17/apps/hypermaze-studio-v26/public/native-v43.html",
  "v17/apps/hypermaze-studio-v26/public/v43-ui.js",
  "v17/tests/v43-cuda-conveyor.test.mjs",
  "v17/v43/README.md"
)
$stage=Join-Path $Destination ("v43-update-stage-"+[Guid]::NewGuid().ToString("N"))
$zip=Join-Path $stage "source.zip"
$backup=Join-Path (Join-Path $Destination "backups") ("v43-gpu-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
$restored=$false
$created=New-Object System.Collections.ArrayList
try{
  $null=New-Item -ItemType Directory -Force -Path $stage
  Invoke-WebRequest -UseBasicParsing -Uri "$Base/archive/refs/heads/$Ref.zip" -OutFile $zip
  Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $stage "archive") -Force
  $dirs=@(Get-ChildItem -LiteralPath (Join-Path $stage "archive") -Directory)
  if($dirs.Count -ne 1){throw "Downloaded GitHub branch archive structure is invalid"}
  $fresh=$dirs[0].FullName
  foreach($relative in $List){
    $f=Join-Path $fresh $relative
    if(!(Test-Path -LiteralPath $f -PathType Leaf)){throw "New V43 source is missing $relative"}
  }
  # Keep a byte-perfect backup only of source files that will be updated.
  # The live runtime and all old checkpoint folders are not opened or moved.
  $null=New-Item -ItemType Directory -Force -Path $backup
  foreach($relative in $List){
    $existing=Join-Path $Source $relative
    $targetBackup=Join-Path $backup $relative
    if(Test-Path -LiteralPath $existing -PathType Leaf){
      $null=New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetBackup)
      Copy-Item -LiteralPath $existing -Destination $targetBackup
    } else {
      [void]$created.Add($existing)
    }
  }
  foreach($relative in $List){
    $existing=Join-Path $Source $relative
    $new=Join-Path $fresh $relative
    $null=New-Item -ItemType Directory -Force -Path (Split-Path -Parent $existing)
    Copy-Item -LiteralPath $new -Destination $existing -Force
  }
  $node=Get-Command node.exe -ErrorAction SilentlyContinue
  if(!$node){throw "Node.js is not on PATH: source update restored without changing your Python installation"}
  Push-Location -LiteralPath $Source
  try{
    foreach($relative in @(
      "v17/transcend/torus-aether/devour/brain.mjs",
      "v17/transcend/torus-aether/devour/worker.mjs",
      "v17/transcend/torus-aether/devour/devour.mjs",
      "v17/apps/hypermaze-studio-v26/native-bridge.mjs",
      "v17/apps/hypermaze-studio-v26/public/v43-ui.js"
    )){
      & node --check $relative
      if($LASTEXITCODE -ne 0){throw "V43 source syntax rejected: $relative"}
    }
    & node --test "v17/tests/v43-cuda-conveyor.test.mjs"
    if($LASTEXITCODE -ne 0){throw "V43 original Brain / CUDA two-lane training tests failed"}
    & node --test "v17/tests/v43-native-one-universe.test.mjs"
    if($LASTEXITCODE -ne 0){throw "V43 same-organism Qwen puppet regression tests failed"}
  }finally{Pop-Location}
  Write-Host "V43 CUDA conveyor source updated and tested in MagicPerspective, D: only." -ForegroundColor Green
  Write-Host "Original checkpoints, donor model, dataset and CUDA Python are unchanged." -ForegroundColor Green
  Write-Host "Original changed-source backup: $backup" -ForegroundColor DarkCyan
}catch{
  Write-Warning "Update failed: $($_.Exception.Message). Restoring original source files."
  foreach($relative in $List){
    $existing=Join-Path $Source $relative
    $save=Join-Path $backup $relative
    if(Test-Path -LiteralPath $save -PathType Leaf){
      Copy-Item -LiteralPath $save -Destination $existing -Force
    }elseif($created.Contains($existing)){
      Remove-Item -LiteralPath $existing -Force -ErrorAction SilentlyContinue
    }
  }
  $restored=$true
  throw
}finally{
  if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue}
}
if(-not $NoStart -and -not $restored){
  # Refresh only the bootstrap script; selected-paths.json is preserved.
  Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/dan3s2020/MagicPerspective/$Ref/v17/v43/BOOTSTRAP_D.ps1" -OutFile $Bootstrap
  & powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File $Bootstrap
  if($LASTEXITCODE -ne 0){throw "Updated V43 launch reported exit $LASTEXITCODE"}
}

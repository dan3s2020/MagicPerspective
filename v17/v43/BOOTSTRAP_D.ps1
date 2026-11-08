# BOOTSTRAP MAGIC PERSPECTIVE V43, independent of every earlier experiment.
# Installs ONLY under D:\MagicPerspective-V43. Uses the original V42 native UI,
# same CUDA training equations and original Brain. No old project is required.
param(
  [string]$Destination="D:\MagicPerspective-V43",
  [string]$GGUF="",
  [string]$Data="",
  [switch]$CPU,
  [switch]$NoBrowser
)
$ErrorActionPreference="Stop"
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$Branch="feature/V43-NATIVE-V42-ONE-UNIVERSE-20261108"
$Url="https://github.com/dan3s2020/MagicPerspective/archive/refs/heads/$Branch.zip"
if(!(Test-Path -LiteralPath "D:\" -PathType Container)){throw "Drive D: is unavailable. V43 never installs itself on C:."}
$Destination=[IO.Path]::GetFullPath($Destination)
if(!($Destination -like "D:\*")){throw "V43 must install under D:, not on another disk"}
$null=New-Item -ItemType Directory -Force -Path $Destination
$Source=Join-Path $Destination "source"
$V17=Join-Path $Source "v17"
if(!(Test-Path -LiteralPath (Join-Path $V17 "START_V43.ps1") -PathType Leaf)){
  if(Test-Path -LiteralPath $Source){
    $present=@(Get-ChildItem -LiteralPath $Source -Force -ErrorAction SilentlyContinue)
    if($present.Count){throw "Existing nonempty source directory does not contain V43; refusing overwrite: $Source"}
  }
  Write-Host "Downloading original MagicPerspective V42 → V43 source into D:\MagicPerspective-V43..." -ForegroundColor Cyan
  $Stage=Join-Path $Destination ("download-"+[guid]::NewGuid().ToString("N"))
  $Zip=Join-Path $Stage "magicperspective-v43.zip"
  try {
    $null=New-Item -ItemType Directory -Force -Path $Stage
    Invoke-WebRequest -Uri $Url -UseBasicParsing -OutFile $Zip
    Expand-Archive -LiteralPath $Zip -DestinationPath (Join-Path $Stage "extracted") -Force
    $Dirs=@(Get-ChildItem -LiteralPath (Join-Path $Stage "extracted") -Directory)
    if($Dirs.Count -ne 1 -or !(Test-Path -LiteralPath (Join-Path $Dirs[0].FullName "v17\START_V43.ps1"))){
      throw "Downloaded archive is not the expected native V43 MagicPerspective source"
    }
    if(Test-Path -LiteralPath $Source){Remove-Item -LiteralPath $Source -Force}
    Move-Item -LiteralPath $Dirs[0].FullName -Destination $Source
  }finally {
    if(Test-Path -LiteralPath $Stage){Remove-Item -LiteralPath $Stage -Recurse -Force -ErrorAction SilentlyContinue}
  }
}
# Inventory only direct D: descendants, bounded by a small depth and item limit.
# No repeated recursive C:/D: project discovery, no deletion of existing tools.
# Does not inspect model tensor data, only names, extensions, lengths and files.
function Inventory-D {
  $dirs=New-Object 'System.Collections.Generic.Queue[object]'
  $dirs.Enqueue(@{p="D:\";depth=0})
  $candidates=@{models=New-Object System.Collections.ArrayList;
    parquet=New-Object System.Collections.ArrayList;
    node=New-Object System.Collections.ArrayList;
    python=New-Object System.Collections.ArrayList}
  $scanned=0;$excluded=@("node_modules",".git","__pycache__","site-packages",
    "dist-info",".cache","Cache","Temp","Downloads","System Volume Information",
    '$RECYCLE.BIN',"WindowsApps","Lib","include","share","torch","numpy","ffmpeg")
  while($dirs.Count -and $scanned -lt 1800){
    $entry=$dirs.Dequeue();$folder=[string]$entry.p;$depth=[int]$entry.depth
    if($folder.StartsWith($Destination,[StringComparison]::OrdinalIgnoreCase)){continue}
    $scanned++
    try {
      foreach($file in [IO.Directory]::EnumerateFiles($folder)){
        $name=[IO.Path]::GetFileName($file)
        if($name.EndsWith(".parquet",[StringComparison]::OrdinalIgnoreCase)){
          [void]$candidates.parquet.Add([IO.Path]::GetDirectoryName($file))
        }elseif($name.EndsWith(".gguf",[StringComparison]::OrdinalIgnoreCase) -and
          $file.ToLowerInvariant().Contains("qwen")){
          [void]$candidates.models.Add((Get-Item -LiteralPath $file))
        }elseif($name -ieq "node.exe"){
          [void]$candidates.node.Add($file)
        }elseif($name -ieq "python.exe"){
          [void]$candidates.python.Add($file)
        }
      }
      if($depth -ge 7){continue}
      foreach($child in [IO.Directory]::EnumerateDirectories($folder)){
        $name=[IO.Path]::GetFileName($child)
        if($excluded -contains $name){continue}
        $dirs.Enqueue(@{p=$child;depth=$depth+1})
      }
    }catch [System.UnauthorizedAccessException] {continue}
    catch [System.IO.IOException] {continue}
  }
  Write-Host ("Inspected {0} D: dependency directories (bounded); existing installations untouched." -f $scanned) -ForegroundColor DarkCyan
  return $candidates
}
$Inventory=Inventory-D
function Test-Node([string]$exe){
  if(!(Test-Path -LiteralPath $exe -PathType Leaf)){return $false}
  try {$v=& $exe -p "Number(process.versions.node.split('.')[0])" 2>$null;return [int]$v -ge 22}
  catch {return $false}
}
$Node=$null
$onPath=Get-Command node.exe -ErrorAction SilentlyContinue
if($onPath -and (Test-Node $onPath.Source)){$Node=$onPath.Source}
if(!$Node){
  foreach($candidate in @($Inventory.node)){
    if(Test-Node $candidate){$Node=$candidate;break}
  }
}
if(!$Node){
  Write-Host "No Node 22+ on D: or PATH. Installing verified PORTABLE Node.js under D:..." -ForegroundColor Yellow
  $Version="v22.16.0"
  $ZipName="node-$Version-win-x64.zip"
  $Tools=Join-Path $Destination "tools"
  $null=New-Item -ItemType Directory -Force -Path $Tools
  $NodeHome=Join-Path $Tools "node-$Version-win-x64"
  if(!(Test-Path -LiteralPath (Join-Path $NodeHome "node.exe") -PathType Leaf)){
    $Archive=Join-Path $Tools $ZipName
    $SumFile=Join-Path $Tools "NODE_SHASUMS256.txt"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/$Version/$ZipName" -UseBasicParsing -OutFile $Archive
    Invoke-WebRequest -Uri "https://nodejs.org/dist/$Version/SHASUMS256.txt" -UseBasicParsing -OutFile $SumFile
    $manifest=Get-Content -LiteralPath $SumFile | Where-Object {$_ -match ([regex]::Escape($ZipName)+"$")} | Select-Object -First 1
    if(!$manifest){throw "Official Node.js SHASUMS has no exact ZIP entry; refused to extract"}
    $expected=($manifest -split "\s+")[0].ToLowerInvariant()
    $actual=(Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant()
    if($actual -ne $expected){throw "Node.js official SHA-256 integrity check FAILED"}
    Expand-Archive -LiteralPath $Archive -DestinationPath $Tools -Force
  }
  $Node=Join-Path $NodeHome "node.exe"
  if(!(Test-Node $Node)){throw "Portable Node.js installation failed"}
}
$env:PATH=([IO.Path]::GetDirectoryName($Node))+";"+$env:PATH
Write-Host "Reusing Node: $Node" -ForegroundColor Green
function Test-Python([string]$exe){
  if(!(Test-Path -LiteralPath $exe -PathType Leaf)){return $false}
  try{
    $value=& $exe -c "import sys;print(int((3,10)<=sys.version_info[:2]<=(3,12)))" 2>$null
    return "$value".Trim() -eq "1"
  }catch{return $false}
}
$Python=$null
foreach($candidate in @($Inventory.python)){
  if(Test-Python $candidate){$Python=$candidate;break}
}
if(!$Python){
  $pathPy=Get-Command python.exe -ErrorAction SilentlyContinue
  if($pathPy -and (Test-Python $pathPy.Source)){$Python=$pathPy.Source}
}
if(!$Python){
  Write-Host "No compatible Python on D: or PATH. Installing Python 3.12 ONLY under D:..." -ForegroundColor Yellow
  $Tools=Join-Path $Destination "tools"
  $null=New-Item -ItemType Directory -Force -Path $Tools
  $PythonHome=Join-Path $Tools "Python312"
  $Installer=Join-Path $Tools "python-3.12.10-amd64.exe"
  Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe" -UseBasicParsing -OutFile $Installer
  $signature=Get-AuthenticodeSignature -LiteralPath $Installer
  if($signature.Status -ne "Valid"){throw "Python installer is not Authenticode-signed correctly; refusing execution"}
  $p=Start-Process -FilePath $Installer -ArgumentList @("/quiet","InstallAllUsers=0",
    ('TargetDir="'+$PythonHome+'"'),"PrependPath=0","Include_launcher=0",
    "Include_pip=1","Include_test=0","AssociateFiles=0","Shortcuts=0") -Wait -PassThru
  if($p.ExitCode -ne 0){throw "Python installation under D: failed with exit "+$p.ExitCode}
  $Python=Join-Path $PythonHome "python.exe"
  if(!(Test-Python $Python)){throw "Python 3.12 installed but did not pass interpreter validation"}
}
$env:PATH=([IO.Path]::GetDirectoryName($Python))+";"+$env:PATH
Write-Host "Reusing Python: $Python" -ForegroundColor Green
# Prefer the existing CUDA-equipped virtualenv on D. It is only JUNCTIONED
# into the fresh source tree; no tensor weights or old checkpoint copied.
$CudaPython=$null
foreach($candidate in @($Inventory.python)){
  if(!(Test-Python $candidate)){continue}
  try{
    $ok=& $candidate -c "import torch; print('1' if torch.cuda.is_available() else '0')" 2>$null
    if("$ok".Trim() -eq "1"){$CudaPython=$candidate;break}
  }catch{}
}
$OwnVenv=Join-Path $V17 "transcend\torus-aether\gpu\.venv"
if($CudaPython -and !(Test-Path -LiteralPath $OwnVenv)){
  $Scripts=Split-Path -Parent $CudaPython
  if([IO.Path]::GetFileName($Scripts) -ieq "Scripts"){
    $RootVenv=Split-Path -Parent $Scripts
    if(Test-Path -LiteralPath (Join-Path $RootVenv "pyvenv.cfg")){
      $null=New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OwnVenv)
      try{
        New-Item -ItemType Junction -Path $OwnVenv -Target $RootVenv -ErrorAction Stop | Out-Null
        Write-Host "Reusing existing CUDA PyTorch environment on D: $RootVenv" -ForegroundColor Green
      }catch{
        Write-Warning "Existing CUDA reuse junction not permitted; original V42 auto-setup will prepare its own GPU environment under D:."
      }
    }
  }
}
# The exact model needs Qwen GGUF; do not substitute an unrelated donor.
if(!$GGUF){
  $models=@($Inventory.models | Sort-Object -Property @{Expression={
    $priority=if($_.FullName -match "(?i)qwen"){0}else{1}
    $priority*1e15+[math]::Abs($_.Length-10GB)
  }})
  if($models.Count){$GGUF=$models[0].FullName}
}
if(!$GGUF -or !(Test-Path -LiteralPath $GGUF -PathType Leaf)){
  throw "No Qwen GGUF exists in the inspected D: directories. Source is installed at $V17, but real Qwen movements require an actual GGUF. No model, results or paths were fabricated."
}
if(!$Data){
  $dirs=@($Inventory.parquet | Sort-Object -Unique)
  $preferred=@($dirs | Where-Object {$_ -match "(?i)OpenThoughts"})
  if($preferred.Count){$Data=$preferred[0]}elseif($dirs.Count){$Data=$dirs[0]}
}
if(!$Data -or !(Test-Path -LiteralPath $Data -PathType Container)){
  throw "No actual Parquet training dataset was found in the bounded D: inventory. V43 source is installed at $V17; no synthetic text dataset is substituted."
}
# Prefer original model/data matches, show paths explicitly for audit.
Write-Host ("V43 source: {0}" -f $V17) -ForegroundColor Green
Write-Host ("Real Qwen GGUF: {0}" -f $GGUF) -ForegroundColor Green
Write-Host ("Original training corpus: {0}" -f $Data) -ForegroundColor Green
Write-Host "Launching original V42 native UI with V43 ONLY mode and true live fused exercises." -ForegroundColor Cyan
$env:MAGICPERSPECTIVE_V43_BOOTSTRAP="1"
$Launcher=Join-Path $V17 "START_V43.ps1"
& $Launcher -GGUF $GGUF -Data $Data -Gpu $(if($CPU){"off"}else{"cuda:0"}) -NoBrowser:$NoBrowser
if($LASTEXITCODE -ne 0){throw "MagicPerspective V43 original native launcher failed. See the printed original error."}

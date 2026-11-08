# BOOTSTRAP MAGIC PERSPECTIVE V43, independent of every earlier experiment.
# Installs ONLY under D:\MagicPerspective-V43. Uses the original V42 native UI,
# same CUDA training equations and original Brain. No old project is required.
param(
  [string]$Destination="D:\MagicPerspective-V43",
  [string]$GGUF="",
  [string]$Data="",
  [switch]$CPU,
  [switch]$NoBrowser,
  [switch]$ChoosePaths
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
# The user selects existing dependencies directly. NEVER enumerate D: or
# replace the user's model/dataset with a name guessed from old experiments.
Add-Type -AssemblyName System.Windows.Forms
function Pick-ExistingFile([string]$Title,[string]$Initial,[string]$Filter){
  $dlg=New-Object System.Windows.Forms.OpenFileDialog
  try{
    $dlg.Title=$Title
    $dlg.Filter=$Filter
    $dlg.CheckFileExists=$true
    $dlg.Multiselect=$false
    if(Test-Path -LiteralPath $Initial -PathType Container){
      $dlg.InitialDirectory=$Initial
    } else {
      $dlg.InitialDirectory="D:\"
    }
    if($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){
      return $dlg.FileName
    }
    return ""
  }finally{$dlg.Dispose()}
}
function Pick-ExistingFolder([string]$Title,[string]$Initial){
  $dlg=New-Object System.Windows.Forms.FolderBrowserDialog
  try{
    $dlg.Description=$Title
    $dlg.ShowNewFolderButton=$false
    if(Test-Path -LiteralPath $Initial -PathType Container){
      $dlg.SelectedPath=$Initial
    } else {
      $dlg.SelectedPath="D:\"
    }
    if($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){
      return $dlg.SelectedPath
    }
    return ""
  }finally{$dlg.Dispose()}
}
function Test-Node([string]$Exe){
  if(!(Test-Path -LiteralPath $Exe -PathType Leaf)){return $false}
  try{$v=& $Exe -p "Number(process.versions.node.split('.')[0])" 2>$null;return [int]$v -ge 22}
  catch{return $false}
}
function Test-Python([string]$Exe){
  if(!(Test-Path -LiteralPath $Exe -PathType Leaf)){return $false}
  try{
    $v=& $Exe -c "import sys;print(int((3,10)<=sys.version_info[:2]<=(3,12)))" 2>$null
    return "$v".Trim() -eq "1"
  }catch{return $false}
}
$SelectionFile=Join-Path $Destination "selected-paths.json"
$Selection=@{}
if(Test-Path -LiteralPath $SelectionFile -PathType Leaf){
  try{
    $saved=Get-Content -LiteralPath $SelectionFile -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach($k in @("GGUF","Data","NodeExe","PythonExe","CudaPythonExe")){
      if($saved.PSObject.Properties.Name -contains $k){
        $Selection[$k]=[string]$saved.$k
      }
    }
  }catch{Write-Warning "Cannot read old path selections; use Windows file dialogs."}
}
$Node=$null
$cmdNode=Get-Command node.exe -ErrorAction SilentlyContinue
if($cmdNode -and (Test-Node $cmdNode.Source)){$Node=$cmdNode.Source}
if(!$Node -and $Selection.NodeExe -and (Test-Node $Selection.NodeExe)){
  $Node=$Selection.NodeExe
}
if(!$Node){
  $chosen=Pick-ExistingFile "Select existing Node.js node.exe on D: (Cancel = automatic portable install on D:)" "D:\" "Node.js executable (node.exe)|node.exe|Executable files (*.exe)|*.exe"
  if($chosen){
    if(!(Test-Node $chosen)){throw "Selected Node.js is not version 22+: $chosen"}
    $Node=$chosen
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
$Python=$null
$cmdPython=Get-Command python.exe -ErrorAction SilentlyContinue
if($cmdPython -and (Test-Python $cmdPython.Source)){$Python=$cmdPython.Source}
if(!$Python -and $Selection.PythonExe -and (Test-Python $Selection.PythonExe)){
  $Python=$Selection.PythonExe
}
if(!$Python){
  $chosen=Pick-ExistingFile "Select existing Python 3.10–3.12 python.exe on D: (Cancel = install under D:)" "D:\" "Python executable (python.exe)|python.exe|Executable files (*.exe)|*.exe"
  if($chosen){
    if(!(Test-Python $chosen)){throw "Selected Python is not 3.10–3.12: $chosen"}
    $Python=$chosen
  }
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
# Existing CUDA Python is optional. When explicitly selected, let Python
# venv inherit globally installed packages (no junction / no overwriting the
# original environment). The native V42 CUDA self-tests still have final say.
$CudaPython=$null
if($Selection.CudaPythonExe -and (Test-Python $Selection.CudaPythonExe)){
  try{
    $cuda=& $Selection.CudaPythonExe -c "import torch;print('1' if torch.cuda.is_available() else '0')" 2>$null
    if("$cuda".Trim() -eq "1"){$CudaPython=$Selection.CudaPythonExe}
  }catch{}
}
if(!$CudaPython){
  try{
    $cuda=& $Python -c "import torch;print('1' if torch.cuda.is_available() else '0')" 2>$null
    if("$cuda".Trim() -eq "1"){$CudaPython=$Python}
  }catch{}
}
if(!$CudaPython -and !$CPU){
  $candidate=Pick-ExistingFile "Optional: choose existing CUDA-enabled python.exe (Cancel = original V42 CUDA auto-setup under D:)" "D:\" "Python executable (python.exe)|python.exe|Executable files (*.exe)|*.exe"
  if($candidate){
    if(!(Test-Python $candidate)){throw "Selected CUDA Python version is incompatible: $candidate"}
    $cuda=& $candidate -c "import torch;print('1' if torch.cuda.is_available() else '0')" 2>$null
    if("$cuda".Trim() -ne "1"){throw "Selected Python does not have a working CUDA PyTorch installation"}
    $CudaPython=$candidate
  }
}
$OwnVenv=Join-Path $V17 "transcend\torus-aether\gpu\.venv"
if($CudaPython -and !(Test-Path -LiteralPath $OwnVenv)){
  # Reuse any compatible system-site packages without installing into or
  # writing to the selected pre-existing CUDA environment.
  $null=New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OwnVenv)
  & $CudaPython -m venv --system-site-packages $OwnVenv
  if($LASTEXITCODE -ne 0){
    throw "Cannot create isolated V43 environment inheriting selected CUDA Python."
  }
  Write-Host "Created isolated V43 environment from your selected CUDA Python: $CudaPython" -ForegroundColor Green
}
if(!$GGUF -and !$ChoosePaths -and $Selection.GGUF -and (Test-Path -LiteralPath $Selection.GGUF -PathType Leaf)){$GGUF=$Selection.GGUF}
if(!$GGUF){
  # This is a starting directory for the FILE PICKER, not an assumption
  # about the actual model file name.
  $GGUF=Pick-ExistingFile "Select your actual Qwen .gguf model for V43" "D:\LocalAi\models" "GGUF model (*.gguf)|*.gguf"
}
if(!$GGUF -or !(Test-Path -LiteralPath $GGUF -PathType Leaf)){
  throw "You did not select a Qwen GGUF. Your V43 source remains installed on D:."
}
if([IO.Path]::GetExtension($GGUF) -ine ".gguf"){
  throw "Please select a real Qwen .gguf model file: $GGUF"
}
if(!$Data -and !$ChoosePaths -and $Selection.Data -and (Test-Path -LiteralPath $Selection.Data -PathType Container)){$Data=$Selection.Data}
if(!$Data){
  $Data=Pick-ExistingFolder "Select the folder containing your actual OpenThoughts Parquet dataset" "D:\training"
}
if(!$Data -or !(Test-Path -LiteralPath $Data -PathType Container)){
  throw "No dataset folder selected. V43 remains installed on D: without replacing your existing files."
}
# Only verify direct .parquet presence. If the dataset is partitioned, let
# the original text reader validate it; don't guess its layout.
$Selection=@{
  GGUF=$GGUF;Data=$Data;NodeExe=$Node;PythonExe=$Python;CudaPythonExe=$CudaPython
}
$Selection | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $SelectionFile -Encoding UTF8
Write-Host ("V43 source: {0}" -f $V17) -ForegroundColor Green
Write-Host ("Real Qwen GGUF: {0}" -f $GGUF) -ForegroundColor Green
Write-Host ("Original training corpus: {0}" -f $Data) -ForegroundColor Green
Write-Host "Launching original V42 native UI with V43 ONLY mode and true live fused exercises." -ForegroundColor Cyan
$env:MAGICPERSPECTIVE_V43_BOOTSTRAP="1"
$Launcher=Join-Path $V17 "START_V43.ps1"
& $Launcher -GGUF $GGUF -Data $Data -Gpu $(if($CPU){"off"}else{"cuda:0"}) -NoBrowser:$NoBrowser
if($LASTEXITCODE -ne 0){throw "MagicPerspective V43 original native launcher failed. See the printed original error."}

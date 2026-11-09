# V44 first-time installer + launcher. A FRESH runtime and UI: never modifies V42/V43.
# Windows PowerShell 5.1, D: only, existing Node + existing torch CUDA.
param(
  [string]$Root="D:\MagicPerspective-V44",
  [string]$Dataset="D:\training\OpenThoughts3-1.2M",
  [string]$Atlas="D:\MagicPerspective-V43\source\v17\v43\v43-qwen-input-space-verified.json",
  [string]$Python="D:\MagicPerspective-FULL-ATLAS-HANGFIX\v17\transcend\torus-aether\gpu\.venv\Scripts\python.exe",
  [string]$Commit="",
  [int]$Batch=4,
  [switch]$NoBrowser
)
$ErrorActionPreference="Stop"
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
if([string]::IsNullOrWhiteSpace($Commit)){throw "Provide exact verified GitHub commit SHA with -Commit; no mutable branch download"}
if($Commit -notmatch '^[a-fA-F0-9]{40}$'){throw "Invalid commit SHA"}
if(!(Test-Path -LiteralPath $Dataset -PathType Container)){throw "Real parquet dataset folder not found: $Dataset"}
if(!(Test-Path -LiteralPath $Atlas -PathType Leaf)){throw "Previously verified real Qwen input-embedding atlas not found: $Atlas"}
if(!(Test-Path -LiteralPath $Python -PathType Leaf)){throw "Verified D CUDA Python missing: $Python"}
$Node=(Get-Command node -ErrorAction SilentlyContinue)
if(!$Node){throw "Existing Node executable missing, no new Node installation attempted"}
& $Python -c "import torch,numpy;assert torch.cuda.is_available();print('V44 CUDA VERIFIED',torch.__version__,torch.cuda.get_device_name(0))"
if($LASTEXITCODE -ne 0){throw "CUDA unavailable. V44 will NOT silently fall back to CPU"}
$Root=[IO.Path]::GetFullPath($Root)
$Source=Join-Path $Root "source"
$Runtime=Join-Path $Root "runtime"
$Marker=Join-Path $Source ".v44-commit"
$needsDownload=$true
if((Test-Path -LiteralPath $Marker -PathType Leaf) -and
  ((Get-Content -LiteralPath $Marker -Raw).Trim() -eq $Commit) -and
  (Test-Path -LiteralPath (Join-Path $Source "v44\server.mjs") -PathType Leaf)){
  $needsDownload=$false
}
if($needsDownload){
  $Existing=@(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^node(\.exe)?$' -and
      $_.CommandLine -like "*$Source*v44*server.mjs*" })
  if($Existing.Count){throw "A previous V44 is running. Pause/save/stop it before updating source; checkpoint never touched."}
  $Stage=Join-Path $Root ("install-"+[guid]::NewGuid().ToString("N"))
  $Download=Join-Path $Stage "v44.zip"
  $Extract=Join-Path $Stage "extracted"
  New-Item -ItemType Directory -Force -Path $Stage,$Extract|Out-Null
  try{
    $ZipUrl="https://api.github.com/repos/dan3s2020/MagicPerspective/zipball/$Commit"
    Write-Host "Downloading exact independent V44 source $Commit to D: ..." -ForegroundColor Cyan
    Invoke-WebRequest -UseBasicParsing -Uri $ZipUrl -OutFile $Download
    Expand-Archive -LiteralPath $Download -DestinationPath $Extract -Force
    $Candidates=@(Get-ChildItem -LiteralPath $Extract -Directory)
    $Found=@($Candidates|Where-Object{Test-Path -LiteralPath (Join-Path $_.FullName "v44\server.mjs")})
    if($Found.Count -ne 1){throw "GitHub archive lacks exactly one V44 source root"}
    $StagedSource=$Found[0].FullName
    foreach($file in @(
      "v44\server.mjs",
      "v44\data-worker.mjs",
      "v44\studio.js"
    )){
      $Current=Join-Path $StagedSource $file
      & $Node.Source --check $Current
      if($LASTEXITCODE -ne 0){throw "Node syntax check failed: $file"}
    }
    $PSFile=Join-Path $StagedSource "v44\START_V44.ps1"
    $Tokens=$null;$Errors=$null
    [System.Management.Automation.Language.Parser]::ParseFile($PSFile,[ref]$Tokens,[ref]$Errors)|Out-Null
    if($Errors.Count){throw "V44 PowerShell invalid: $($Errors[0])"}
    & $Python -m py_compile (Join-Path $StagedSource "v44\engine.py")
    if($LASTEXITCODE -ne 0){throw "V44 training engine syntax invalid"}
    $Previous=""
    if(Test-Path -LiteralPath $Source){
      $Previous=Join-Path $Root ("source-backup-"+(Get-Date -Format "yyyyMMdd-HHmmss"))
      Move-Item -LiteralPath $Source -Destination $Previous
    }
    try{
      Move-Item -LiteralPath $StagedSource -Destination $Source
      [IO.File]::WriteAllText((Join-Path $Source ".v44-commit"),$Commit,[Text.Encoding]::ASCII)
    }catch{
      if($Previous -and (Test-Path -LiteralPath $Previous) -and !(Test-Path -LiteralPath $Source)){
        Move-Item -LiteralPath $Previous -Destination $Source
      }
      throw
    }
    Write-Host "New V44 source installed; original V42/V43 paths untouched." -ForegroundColor Green
    if($Previous){Write-Host "Previous isolated V44 source backup: $Previous"}
  }finally{
    if(Test-Path -LiteralPath $Stage){Remove-Item -LiteralPath $Stage -Force -Recurse}
  }
}
$Server=Join-Path $Source "v44\server.mjs"
if(!(Test-Path -LiteralPath $Server -PathType Leaf)){throw "V44 server missing after installation"}
New-Item -ItemType Directory -Force -Path $Runtime|Out-Null
Write-Host ""
Write-Host "MAGICPERSPECTIVE V44 — INDEPENDENT REAL TRAINING" -ForegroundColor Green
Write-Host "Dataset: $Dataset"
Write-Host "Real Qwen weight atlas: $Atlas"
Write-Host "New CUDA learning engine: $Python"
Write-Host "Only V44 runtime: $Runtime"
Write-Host "No change to V42/V43 originals or checkpoints."
Write-Host ""
$argv=@($Server,"--python",$Python,"--dataset",$Dataset,"--atlas",$Atlas,"--runtime",$Runtime,
  "--batch",[string]([Math]::Max(1,[Math]::Min(16,$Batch))))
if($NoBrowser){$argv+=("--no-browser")}
& $Node.Source @argv
if($LASTEXITCODE -ne 0){throw "V44 server exited with code $LASTEXITCODE"}

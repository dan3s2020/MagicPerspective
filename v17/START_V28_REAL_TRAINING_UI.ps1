param(
  [int]$NativePort=8841,
  [int]$UIPort=8896,
  [switch]$StartOriginal,
  [string]$Data="D:\training\OpenThoughts3-1.2M",
  [string]$OriginalOut="",
  [int]$Workers=1,
  [int]$Mem=3,
  [string]$Worlds="text,maze",
  [string]$Gpu="off",
  [switch]$NoBrowser
)
$ErrorActionPreference="Stop"
$Project=Split-Path -Parent $PSScriptRoot
$Root=$PSScriptRoot
$Probe="http://127.0.0.1:$NativePort/graphs"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js 22+ required.'
}
function Test-Native {
  try {
    $response=Invoke-RestMethod -Uri $Probe -TimeoutSec 3
    return $null -ne $response.graphs -and $null -ne $response.world
  }catch{return $false}
}
if (-not (Test-Native)) {
  if (-not $StartOriginal) {
    throw @"
ORIGINAL V17 TRAINER NU RULEAZA pe portul $NativePort.
Acest launcher NU porneste antrenarea substitutiilor V26.
Pentru antrenare noua foloseste optiunea -StartOriginal.
Pentru checkpointuri existente foloseste acelasi -OriginalOut ca la sesiunea originala.
Nu crea un alt checkpoint daca vrei o comparatie cu rezultatele vechi.
"@
  }
  if (!(Test-Path -LiteralPath $Data -PathType Container)) {
    throw "Original OpenThoughts data folder missing: $Data"
  }
  if (!$OriginalOut) {
    throw @"
LIPSESTE -OriginalOut. Ca sa evit modificarea sau crearea altui checkpoint
din greseala, indica explicit directorul -Out al antrenarii originale
sau un director NOU daca vrei sa antrenezi de la zero.
Exemplu: -OriginalOut "D:\your-original-checkpoint-folder"
"@
  }
  $script=Join-Path $Root "START_V17.ps1"
  if(!(Test-Path $script)){throw "Missing ORIGINAL V17 start script: $script"}
  $launch=@(
    "-NoProfile","-ExecutionPolicy","Bypass","-File",('"'+$script+'"'),
    "-Data",('"'+$Data+'"'),
    "-Out",('"'+$OriginalOut+'"'),
    "-Workers","$Workers","-Mem","$Mem",
    "-Worlds",('"'+$Worlds+'"'),"-Port","$NativePort",
    "-Gpu",('"'+$Gpu+'"'),"-Resume","-Start"
  )
  Write-Host "Pornesc MOTORUL ORIGINAL V17 cu datele OpenThoughts Parquet, direct." -ForegroundColor Green
  Write-Host "Checkpoint original: $OriginalOut"
  Write-Host "Niciun model V26 cu substitutii de cuvinte nu porneste."
  Start-Process -FilePath "powershell.exe" -ArgumentList $launch -WorkingDirectory $Root
  $ok=$false
  for($i=0;$i -lt 120;$i++){
    Start-Sleep -Milliseconds 500
    if(Test-Native){$ok=$true;break}
  }
  if(!$ok){throw "Original V17 backend failed to respond on $Probe; check its PowerShell console."}
}
Write-Host "Trainer ORIGINAL V17: conectat pe $Probe" -ForegroundColor Green
$Ui=Join-Path $Root "apps\hypermaze-studio-v26\native-bridge.mjs"
if(!(Test-Path $Ui)){throw "Missing new V26-style native bridge: $Ui"}
$Url="http://127.0.0.1:$UIPort"
Write-Host "UI NOU V26 + REAL V17 TRAINING: $Url" -ForegroundColor Cyan
if(!$NoBrowser){Start-Process $Url}
& node $Ui --port $UIPort --native-port $NativePort
if($LASTEXITCODE -ne 0){throw "Native bridge exited: $LASTEXITCODE"}

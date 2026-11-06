param([int]$Port=8897, [switch]$NoBrowser, [string]$Events="")
$ErrorActionPreference='Stop'
$base=Split-Path -Parent $MyInvocation.MyCommand.Path
if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js 20+ is required. Install Node LTS, then rerun this script. No files were changed.'}
$nodeVersion=(& node --version).Trim()
if($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v([0-9]+)\.'){throw "Could not read Node.js version: $nodeVersion"}
$major=[int]$Matches[1]
if($major -lt 20){throw 'Node.js 20+ is required.'}
# Check port ownership BEFORE launching a second worker, running acceptance tests,
# or opening a browser against potentially unrelated services.
# A previous live server may still be training; never terminate it automatically.
$portOwner = @()
if(Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue){
  $portOwner = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalAddress -in @('127.0.0.1','0.0.0.0','::','::1') })
}
if($portOwner.Count -eq 0){
  # Socket check covers Windows builds without Get-NetTCPConnection or a wildcard listener.
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
  try {
    $listener.Start()
  } catch [System.Net.Sockets.SocketException] {
    if($_.Exception.SocketErrorCode -eq [System.Net.Sockets.SocketError]::AddressAlreadyInUse){
      throw "PORT_IN_USE 127.0.0.1:$Port. An existing server may still be training. Stop its own PowerShell window with Ctrl+C after saving, then rerun. No process was killed."
    }
    throw
  } finally {
    $listener.Stop()
  }
}
if($portOwner.Count -gt 0){
  $descriptions = @()
  foreach($ownerId in @($portOwner | Select-Object -ExpandProperty OwningProcess -Unique)){
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerId" -ErrorAction SilentlyContinue
    $command = if($owner){[string]$owner.CommandLine}else{'(command line unavailable)'}
    $normalizedCommand = $command.Replace('/','\')
    $sameProject = ($normalizedCommand -match '(?i)server\.mjs') -and
      ($normalizedCommand -like '*MagicPerspective-NoiseSpace-Isolated*')
    $description = "PID=$ownerId"
    if($sameProject){$description += " (existing MagicPerspective Noise Space server)"}
    $description += " Command=$command"
    $descriptions += $description
  }
  $who = $descriptions -join " | "
  throw "PORT_IN_USE 127.0.0.1:$Port. $who. An old server is already running. Save/stop training first and press Ctrl+C in its original terminal. This launcher refuses to start a second process against the same checkpoint."
}

Push-Location $base
try {
  Write-Host '=== MAGIC PERSPECTIVE · ISOLATED NOISE SPACE ===' -ForegroundColor Cyan
  Write-Host "Location: $base"
  Write-Host 'No V17 source files are modified.'
  $gpuPy=Join-Path $base '.venv\Scripts\python.exe'
  $gpuProbe=Join-Path $base 'CHECK_CUDA_ENV.py'
  $gpuHealthy=$false
  if((Test-Path -LiteralPath $gpuPy -PathType Leaf) -and
     (Test-Path -LiteralPath $gpuProbe -PathType Leaf)){
    Write-Host 'Validating CUDA Python before enabling GPU backend...' -ForegroundColor Cyan
    try {
      & $gpuPy $gpuProbe
      if($LASTEXITCODE -eq 0){$gpuHealthy=$true}
    } catch {
      Write-Host "GPU environment check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
  if($gpuHealthy){
    $env:OCTOPUS_PY=$gpuPy
    Write-Host "Verified CUDA Python selected: $gpuPy" -ForegroundColor Green
  } else {
    Remove-Item Env:OCTOPUS_PY -ErrorAction SilentlyContinue
    Write-Host 'CUDA unavailable or incomplete. CPU mode still works. To repair run SETUP_CUDA_WINDOWS.ps1.' -ForegroundColor Yellow
  }
  $testFiles = @("$base\test.mjs","$base\v17_smoke.test.mjs","$base\observatory.test.mjs","$base\http_observatory.test.mjs")
  if($gpuHealthy){$testFiles += "$base\gpu_runner.test.mjs"}
  & node --test @testFiles
  if($LASTEXITCODE -ne 0){throw 'Acceptance tests failed; refusing to launch.'}
  $env:PORT = "$Port"
  $env:HOST = '127.0.0.1'
  $url="http://127.0.0.1:$Port/"
  if(-not $NoBrowser){Start-Process $url}
  if($Events){& node "$base\server.mjs" --events $Events}
  else{& node "$base\server.mjs"}
  if($LASTEXITCODE -ne 0){throw "Isolated server exited with code $LASTEXITCODE"}
} finally {Pop-Location}
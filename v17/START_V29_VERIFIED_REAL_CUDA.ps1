param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$OriginalOut = "D:\MagicPerspective-V28\v17\runtime-devour-original",
  [int]$NativePort = 8851,
  [int]$UIPort = 8900,
  [string]$Gpu = "cuda:0",
  [string]$Cuda = "cu126",
  [string]$Arms = "winner",
  [string]$Worlds = "text,maze",
  [int]$Workers = 1,
  [int]$Mem = 3,
  [int]$GpuWorlds = 3,
  [int]$GpuTextBatch = 3,
  [double]$Vram = 3,
  [int]$GpuUtil = 100,
  [switch]$NoBrowser
)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$OriginalLauncher = Join-Path $Root "START_V17.ps1"
$Bridge = Join-Path $Root "apps\hypermaze-studio-v26\native-bridge.mjs"
if (!(Test-Path -LiteralPath $OriginalLauncher -PathType Leaf)) { throw "Original V17 launcher missing: $OriginalLauncher" }
if (!(Test-Path -LiteralPath $Bridge -PathType Leaf)) { throw "V29 new UI bridge missing: $Bridge" }
if (!(Test-Path -LiteralPath $Data -PathType Container)) { throw "OpenThoughts Parquet dataset missing: $Data" }
if ($NativePort -eq $UIPort) { throw "Native and UI ports must differ" }
if ($Gpu -notin @("off","cuda:0","cuda:1")) { throw "Unsupported original GPU: $Gpu" }
if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required" }
function Assert-FreePort([int]$Port) {
  if ($Port -lt 1024 -or $Port -gt 65535) { throw "Port outside 1024..65535: $Port" }
  $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Parse("127.0.0.1"),$Port)
  try {
    $listener.Start()
  } catch {
    $owners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
    throw "PORT $Port OCCUPIED (PID $($owners -join ',')). V29 will NOT attach to an old or errored trainer. Stop the old ORIGINAL V17 process manually in its own terminal (Ctrl+C). Never press Reset."
  } finally {
    try {$listener.Stop()} catch {}
  }
}
$Running = @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
  $_.Name -match '^node(\.exe)?$' -and $_.CommandLine -match 'devour[\\/]+devour\.mjs'
})
if ($Running.Count -gt 0) {
  Write-Host "Original V17 processes found (do not duplicate checkpoint writers):" -ForegroundColor Yellow
  $Running | Select-Object ProcessId,CommandLine | Format-List
  throw "An original V17 trainer is already running. Close that process in its OWN PowerShell window using Ctrl+C, and retry this script. V29 has not changed the original checkpoint."
}
Assert-FreePort $NativePort
Assert-FreePort $UIPort
$ActualOut = [System.IO.Path]::GetFullPath($OriginalOut)
$ExpectedSave = Join-Path $ActualOut "brains\brain-0-$Arms.v8"
Write-Host "V29 / NEW V26 UI + ORIGINAL V17 REAL TRAINING" -ForegroundColor Cyan
Write-Host "Dataset: $Data"
Write-Host "Original checkpoint directory: $ActualOut"
Write-Host ("Existing checkpoint detected: " + (Test-Path -LiteralPath $ExpectedSave -PathType Leaf)) -ForegroundColor Yellow
Write-Host "Native port $NativePort and UI port $UIPort are FREE." -ForegroundColor Green
Write-Host "GPU $Gpu, CUDA $Cuda, $GpuWorlds worlds, $GpuTextBatch text/batch" -ForegroundColor Cyan
Write-Host "No reset. No synthetic V26 model. No changed metrics." -ForegroundColor Green

$VramInvariant = $Vram.ToString([Globalization.CultureInfo]::InvariantCulture)
$arguments = @(
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ('"' + $OriginalLauncher + '"'),
  "-Data", ('"' + $Data + '"'), "-Out", ('"' + $ActualOut + '"'),
  "-Workers", "$Workers", "-Arms", ('"' + $Arms + '"'),
  "-Mem", "$Mem", "-Worlds", ('"' + $Worlds + '"'),
  "-Port", "$NativePort", "-Gpu", ('"' + $Gpu + '"'),
  "-GpuWorlds", "$GpuWorlds", "-GpuTextBatch", "$GpuTextBatch",
  "-Vram", "$VramInvariant", "-GpuUtil", "$GpuUtil",
  "-Cuda", ('"' + $Cuda + '"'), "-Resume", "-Start"
)
Write-Host "Launching ORIGINAL V17 CUDA in its own console." -ForegroundColor Green
$original = Start-Process -FilePath "powershell.exe" -ArgumentList $arguments -WorkingDirectory $Root -PassThru
$nativeUrl = "http://127.0.0.1:$NativePort/graphs"
$ready = $false
for ($i = 0; $i -lt 240; $i++) {
  Start-Sleep -Milliseconds 500
  if ($original.HasExited) {
    throw "Original V17 launcher exited. Inspect its PowerShell console. V29 refuses to claim training works."
  }
  try {
    $payload = Invoke-RestMethod -Uri $nativeUrl -TimeoutSec 3
    if ($payload -and $payload.graphs -and $payload.world -eq $Data) {
      $bad = @($payload.graphs | Where-Object { $_.status -eq "eroare" })
      if ($bad.Count -gt 0) { throw ("ORIGINAL V17 WORKER FAILED: " + $bad[0].error) }
      $ready = $true
      break
    }
    if ($payload -and $payload.world -and $payload.world -ne $Data) {
      throw ("Wrong dataset on port $NativePort : " + $payload.world)
    }
  } catch {
    if ($_.Exception.Message -match "WORKER FAILED|Wrong dataset") { throw }
  }
}
if (!$ready) {
  throw "Original /graphs did not expose the expected dataset. Check ORIGINAL trainer console; do not mistake UI connection for training."
}
Write-Host "ORIGINAL V17 /graphs connected to correct OpenThoughts dataset." -ForegroundColor Green
$uiUrl = "http://127.0.0.1:$UIPort"
Write-Host "NEW V26-STYLE UI, WITH REAL DATASET BAR: $uiUrl" -ForegroundColor Cyan
if (!$NoBrowser) { Start-Process $uiUrl }
& node $Bridge --port $UIPort --native-port $NativePort
if ($LASTEXITCODE -ne 0) { throw "Native bridge exited with code $LASTEXITCODE" }

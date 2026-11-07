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
  [int]$GpuTextBatch = 1,
  [double]$Vram = 0,
  [int]$GpuUtil = 100,
  [int]$TextChunk = 8192,
  [switch]$AutoTuneCudaText = $true,
  [switch]$ProfileText,
  [switch]$AllowNew,
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
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)
  try {
    $listener.Start()
  } catch {
    $owners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
    throw "PORT $Port OCCUPIED (PID $($owners -join ',')). V32 needs its own ports free; do not stop unrelated processes. Choose other -NativePort/-UIPort."
  } finally {
    try {$listener.Stop()} catch {}
  }
}
# Isolation: independent original workers may coexist when their
# checkpoint directories and requested ports do not collide.
$ActualOut = [System.IO.Path]::GetFullPath($OriginalOut)
. (Join-Path $Root "apps\hypermaze-studio-v26\checkpoint-process-scope.ps1")
$Running = @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
  $_.Name -match '^node(\.exe)?
$ExpectedSave = Join-Path $ActualOut "brains\brain-0-$Arms.v8"
if (!(Test-Path -LiteralPath $ExpectedSave -PathType Leaf) -and !$AllowNew) {
  throw "Original checkpoint NOT FOUND: $ExpectedSave. V29 refuses silent restart-from-zero. Supply the correct -OriginalOut directory from your prior V17 run, or explicitly use -AllowNew for a brand-new experiment."
}
Write-Host "V32 / ORIGINAL V17 CUDA TEXT + NEW V26 UI + SAFE REAL VRAM AUTOTUNE" -ForegroundColor Cyan
Write-Host "Dataset: $Data"
Write-Host "Original checkpoint directory: $ActualOut"
Write-Host ("Existing checkpoint detected: " + (Test-Path -LiteralPath $ExpectedSave -PathType Leaf)) -ForegroundColor Yellow
Write-Host "Native port $NativePort and UI port $UIPort are FREE." -ForegroundColor Green
if ($TextChunk -lt 512 -or $TextChunk -gt 32768) { throw "TextChunk must be 512..32768" }
# V32 tuning is a kernel-free real PyTorch microbatch setting. It never
# rewrites the corpus, original target, checkpoint or frozen-evaluation logic.
$env:MP_GPU_TEXT_CHUNK = [string]$TextChunk
$env:MP_GPU_TEXT_AUTOTUNE = if ($AutoTuneCudaText) { "1" } else { "0" }
$env:MP_PROFILE_TEXT = if ($ProfileText) { "1" } else { "0" }
$env:MP_V32_TEXT_SELFTEST = if ($Gpu -like "cuda:*") { "1" } else { "0" }
Write-Host "Before real Parquet training: run exact ORIGINAL text alignment CUDA-versus-NumPy selftest: $env:MP_V32_TEXT_SELFTEST" -ForegroundColor Cyan
Write-Host "GPU $Gpu, CUDA $Cuda, $GpuWorlds maze worlds, $GpuTextBatch text document(s)/batch" -ForegroundColor Cyan
Write-Host ("VRAM requested: "+$(if ($Vram -eq 0) {"AUTO MAX SAFE FREE"} else {"$Vram GB"}) +
  " · initial CUDA alignment microchunk: $TextChunk · autotune: $AutoTuneCudaText") -ForegroundColor Cyan
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
Write-Host "NEW V26-STYLE UI, REAL DATASET BAR AND CUDA MEMORY: $uiUrl" -ForegroundColor Cyan
if (!$NoBrowser) { Start-Process $uiUrl }
& node $Bridge --port $UIPort --native-port $NativePort
if ($LASTEXITCODE -ne 0) { throw "Native bridge exited with code $LASTEXITCODE" }
 -and $_.CommandLine -match 'devour[\\/]+devour\.mjs'
})
$Scope = Get-MagicPerspectiveTrainerConflicts -Processes $Running -RequestedOut $ActualOut
if ($Scope.SameCheckpoint.Count -gt 0) {
  $Scope.SameCheckpoint | Select-Object PID,Out | Format-Table
  throw "SAME CHECKPOINT ALREADY IN USE: $ActualOut. No process has been stopped."
}
if ($Scope.Unresolved.Count -gt 0) {
  $Scope.Unresolved | Select-Object PID,Out,CommandLine | Format-List
  throw "Cannot verify another worker's checkpoint directory; refusing uncertain collision. Other processes remain untouched."
}
if ($Scope.Independent.Count -gt 0) {
  Write-Host "OTHER INDEPENDENT EXPERIMENTS LEFT RUNNING:" -ForegroundColor Green
  $Scope.Independent | Select-Object PID,Out | Format-Table -AutoSize
}
Assert-FreePort $NativePort
Assert-FreePort $UIPort
$ExpectedSave = Join-Path $ActualOut "brains\brain-0-$Arms.v8"
if (!(Test-Path -LiteralPath $ExpectedSave -PathType Leaf) -and !$AllowNew) {
  throw "Original checkpoint NOT FOUND: $ExpectedSave. V29 refuses silent restart-from-zero. Supply the correct -OriginalOut directory from your prior V17 run, or explicitly use -AllowNew for a brand-new experiment."
}
Write-Host "V32 / ORIGINAL V17 CUDA TEXT + NEW V26 UI + SAFE REAL VRAM AUTOTUNE" -ForegroundColor Cyan
Write-Host "Dataset: $Data"
Write-Host "Original checkpoint directory: $ActualOut"
Write-Host ("Existing checkpoint detected: " + (Test-Path -LiteralPath $ExpectedSave -PathType Leaf)) -ForegroundColor Yellow
Write-Host "Native port $NativePort and UI port $UIPort are FREE." -ForegroundColor Green
if ($TextChunk -lt 512 -or $TextChunk -gt 32768) { throw "TextChunk must be 512..32768" }
# V32 tuning is a kernel-free real PyTorch microbatch setting. It never
# rewrites the corpus, original target, checkpoint or frozen-evaluation logic.
$env:MP_GPU_TEXT_CHUNK = [string]$TextChunk
$env:MP_GPU_TEXT_AUTOTUNE = if ($AutoTuneCudaText) { "1" } else { "0" }
$env:MP_PROFILE_TEXT = if ($ProfileText) { "1" } else { "0" }
$env:MP_V32_TEXT_SELFTEST = if ($Gpu -like "cuda:*") { "1" } else { "0" }
Write-Host "Before real Parquet training: run exact ORIGINAL text alignment CUDA-versus-NumPy selftest: $env:MP_V32_TEXT_SELFTEST" -ForegroundColor Cyan
Write-Host "GPU $Gpu, CUDA $Cuda, $GpuWorlds maze worlds, $GpuTextBatch text document(s)/batch" -ForegroundColor Cyan
Write-Host ("VRAM requested: "+$(if ($Vram -eq 0) {"AUTO MAX SAFE FREE"} else {"$Vram GB"}) +
  " · initial CUDA alignment microchunk: $TextChunk · autotune: $AutoTuneCudaText") -ForegroundColor Cyan
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
Write-Host "NEW V26-STYLE UI, REAL DATASET BAR AND CUDA MEMORY: $uiUrl" -ForegroundColor Cyan
if (!$NoBrowser) { Start-Process $uiUrl }
& node $Bridge --port $UIPort --native-port $NativePort
if ($LASTEXITCODE -ne 0) { throw "Native bridge exited with code $LASTEXITCODE" }

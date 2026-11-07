# Native MagicPerspective V17 training + independent REAL Magic Studio UI.
# No modifications to original V17 entrypoints or Brain, no demo fallback.
# Uses a separate Git clone / separate save directory. Never silently resets.
param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Out = "D:\MagicPerspective-MagicStudio-Run",
  [int]$NativePort = 8871,
  [int]$StudioPort = 8872,
  [string]$Worlds = "text,maze,transform",
  [string]$Arm = "stable+many",
  [int]$Workers = 1,
  [string]$Gpu = "cuda:0",
  [double]$Vram = 2.8,
  [int]$GpuWorlds = 16,
  [int]$GpuTextBatch = 2,
  [int]$MazeEvery = 1200,
  [int]$Every = 5000,
  [double]$Mem = 2.0,
  [switch]$StudioOnly
)
$ErrorActionPreference = "Stop"

$original = Join-Path $PSScriptRoot "START_V17.ps1"
$studio = Join-Path $PSScriptRoot "magic-studio\studio-server.mjs"
if (-not (Test-Path -LiteralPath "D:\")) { throw "Unitatea D: nu exista." }
if (-not (Test-Path -LiteralPath $studio -PathType Leaf)) { throw "Magic Studio backend lipseste. Cloneaza ramura corecta." }
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js 20+ este obligatoriu." }

function Test-OpenTcp([int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $task = $client.ConnectAsync("127.0.0.1", $Port)
    if (-not $task.Wait(350)) { return $false }
    return $client.Connected
  } catch { return $false }
  finally { $client.Dispose() }
}
if (Test-OpenTcp $StudioPort) { throw "Portul Studio $StudioPort este ocupat. Foloseste -StudioPort altul." }
if (-not $StudioOnly) {
  if (Test-OpenTcp $NativePort) { throw "Portul V17 $NativePort este ocupat. Foloseste -NativePort altul sau -StudioOnly." }
  if (-not (Test-Path -LiteralPath $original -PathType Leaf)) { throw "Launcherul ORIGINAL V17 lipseste." }
  if (-not (Test-Path -LiteralPath $Data)) { throw "Corpus real indisponibil: $Data. Foloseste -Data cu folderul Parquet existent. Nu substitui un demo." }
}
if ($NativePort -eq $StudioPort) { throw "Porturile Studio si nativ trebuie sa fie diferite." }
if ($Workers -lt 1 -or $Workers -gt 8) { throw "Workers trebuie sa fie 1..8." }
if ($GpuWorlds -lt 0 -or $GpuTextBatch -lt 1) { throw "Parametri CUDA invalidi." }
$allowed = @("text","maze","transform","selfcode")
$selected = @($Worlds -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if (-not $selected.Count -or @($selected | Where-Object { $allowed -notcontains $_ }).Count) {
  throw "Lumi permise: text,maze,transform,selfcode"
}
$logDir = Join-Path $Out "magic-studio-logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$nativePid = $null
if (-not $StudioOnly) {
  # The ORIGINAL launcher performs real CUDA self-tests. No silent CPU fallback.
  # -Resume ensures previous snapshots in this isolated output aren't reset.
  $nativeArgs = '-NoProfile -ExecutionPolicy Bypass -File "' + $original + '"' +
    ' -Data "' + $Data + '"' +
    ' -Out "' + (Join-Path $Out "native") + '"' +
    ' -Port ' + $NativePort +
    ' -Workers ' + $Workers +
    ' -Arms ' + $Arm +
    ' -Mem ' + $Mem.ToString([cultureinfo]::InvariantCulture) +
    ' -Every ' + $Every +
    ' -Worlds "' + ($selected -join ",") + '"' +
    ' -MazeEvery ' + $MazeEvery +
    ' -Gpu ' + $Gpu +
    ' -Vram ' + $Vram.ToString([cultureinfo]::InvariantCulture) +
    ' -GpuWorlds ' + $GpuWorlds +
    ' -GpuTextBatch ' + $GpuTextBatch +
    ' -GpuUtil 100 -Resume -Start -TraceTransformations -EndogenousNoise'
  Write-Host "Pornesc ORIGINALUL V17. Checkpointuri: $Out\native" -ForegroundColor Cyan
  $nativeProc = Start-Process -FilePath "powershell.exe" -ArgumentList $nativeArgs -PassThru -RedirectStandardOutput (Join-Path $logDir "native.out.log") -RedirectStandardError (Join-Path $logDir "native.err.log")
  $nativePid = $nativeProc.Id
}
Write-Host "Pornesc Magic Studio la 127.0.0.1:$StudioPort" -ForegroundColor Cyan
$studioArgs = '"' + $studio + '" ' + $StudioPort + ' ' + $NativePort + ' "' + $logDir + '"'
$studioProc = Start-Process -FilePath $node.Source -ArgumentList $studioArgs -PassThru -RedirectStandardOutput (Join-Path $logDir "studio.out.log") -RedirectStandardError (Join-Path $logDir "studio.err.log")
$pidRecord = @{
  started = (Get-Date -Format "o")
  nativePid = $nativePid
  studioPid = $studioProc.Id
  nativePort = $NativePort
  studioPort = $StudioPort
  output = $Out
  branch = "feature/V17-MAGIC-LIVE-STUDIO-REAL-TRAINING-20261107"
}
($pidRecord | ConvertTo-Json -Depth 4) | Set-Content -LiteralPath (Join-Path $logDir "processes.json") -Encoding UTF8
$ui = "http://127.0.0.1:$StudioPort/"
$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  if ($studioProc.HasExited) { throw "Studio a iesit: consulta $(Join-Path $logDir 'studio.err.log')" }
  try {
    $r = Invoke-WebRequest -Uri ($ui + "api/info") -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $ready = $true; break }
  } catch { Start-Sleep -Milliseconds 250 }
}
if (-not $ready) { throw "Studio nu a raspuns. Consulta $logDir." }
Write-Host ""
Write-Host "=== MAGIC PERSPECTIVE / LIVE TRAINING ===" -ForegroundColor Green
Write-Host "STUDIO: $ui"
Write-Host "MOTOR ORIGINAL: http://127.0.0.1:$NativePort/"
Write-Host "LOGS: $logDir"
Write-Host "Checkpointuri: $(Join-Path $Out 'native\brains')"
Write-Host "Lumi: $Worlds"
Write-Host "GPU: $Gpu (confirma in UI: daca CUDA selftest esueaza, nu presupune ca antreneaza)"
Start-Process $ui

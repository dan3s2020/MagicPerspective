param(
  [string]$Data="D:\training\OpenThoughts3-1.2M",
  [string]$Out="",
  [int]$NativePort=8941,
  [int]$UIPort=8942,
  [string]$Gpu="cuda:0",
  [double]$Vram=3.0,
  [int]$GpuTextBatch=1,
  [int]$GpuTextChunk=256,
  [int]$GpuWorlds=3,
  [int]$Every=250000,
  [int]$CheckpointEvery=100000,
  [int]$XdAtlasEvery=16000,
  [int]$MazeEvery=4000,
  [int]$Mem=2,
  [switch]$NoBrowser
)
$ErrorActionPreference="Stop"
$Root=$PSScriptRoot
$Original=Join-Path $Root "START_HYPERMAZE_REAL_CUDA.ps1"
$Bridge=Join-Path $Root "apps\hypermaze-studio-v26\native-bridge.mjs"
if (!(Test-Path -LiteralPath $Original -PathType Leaf)) {throw "Original V17 launcher missing"}
if (!(Test-Path -LiteralPath $Bridge -PathType Leaf)) {throw "V26-designed real native UI bridge missing"}
if (!(Test-Path -LiteralPath $Data -PathType Container)) {throw "OpenThoughts Parquet directory missing: $Data"}
if (!(Get-Command node -ErrorAction SilentlyContinue)) {throw "Node.js 22+ is missing"}
if ([int](& node -p "Number(process.versions.node.split('.')[0])") -lt 22) {throw "Node.js 22+ required"}
if ($NativePort -eq $UIPort) {throw "Native and UI ports must be different"}
if ($Gpu -notin @("off","cuda:0")) {throw "Invalid original GPU device"}
if ($Gpu -ne "off" -and ($Vram -lt 1 -or $Vram -gt 3.4)) {throw "4GB RTX 3050 Ti must leave VRAM for Windows and CUDA driver"}
if ($GpuTextBatch -lt 1 -or $GpuTextBatch -gt 8) {throw "Text batch must be 1..8"}
if ($GpuTextChunk -lt 32 -or $GpuTextChunk -gt 4096) {throw "Text chunk must be 32..4096"}
function Assert-FreePort([int]$Port) {
  if ($Port -lt 1024 -or $Port -gt 65535) {throw "Invalid port"}
  $listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"),$Port)
  try {$listener.Start()} catch {throw "Port $Port occupied; choose new V40 ports, never stop another agent"} finally {try {$listener.Stop()} catch {}}
}
Assert-FreePort $NativePort
Assert-FreePort $UIPort
if ([string]::IsNullOrWhiteSpace($Out)) {$Out=Join-Path $Root "runtime-v40-fast-real"}
$Out=[System.IO.Path]::GetFullPath($Out)
$brains=Join-Path $Out "brains"
$saved=if(Test-Path -LiteralPath $brains -PathType Container){@(Get-ChildItem -LiteralPath $brains -Filter "brain-*.v8" -File)}else{@()}
if((Test-Path -LiteralPath $Out -PathType Container) -and $saved.Count -eq 0){
  $otherFiles=@(Get-ChildItem -LiteralPath $Out -Force -ErrorAction SilentlyContinue)
  if($otherFiles.Count -gt 0){throw "Refusing ambiguous existing runtime without saved Brain: $Out. Choose a different -Out."}
}
# Read-only per-checkpoint agent isolation. Never terminate other experiments.
. (Join-Path $Root "apps\hypermaze-studio-v26\checkpoint-process-scope.ps1")
$running=@(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -match '^node(\.exe)?$' -and $_.CommandLine -match 'devour[\\/]+devour\.mjs'
})
$scope=Get-MagicPerspectiveTrainerConflicts -Processes $running -RequestedOut $Out
if($scope.SameCheckpoint.Count -gt 0){throw "Same checkpoint already has a trainer: $Out"}
if($scope.Independent.Count -gt 0){
  Write-Host "Independent experiments remain running, no intervention:" -ForegroundColor Green
  $scope.Independent | Select-Object PID,Out | Format-Table
}
if($scope.Unresolved.Count -gt 0){Write-Warning "Unresolved foreign checkpoint paths; no other process is modified."}
$fresh=$saved.Count -eq 0
if($fresh){$null=New-Item -ItemType Directory -Force -Path $Out}
Write-Host "V40 ORIGINAL V17 + V34 xD/V24/V31 + EXACT CUDA TEXT FIX + NEW V26 UI" -ForegroundColor Cyan
Write-Host "Mode: $(if($fresh){'NEW FROM ZERO'}else{'RESUME ORIGINAL CHECKPOINT'})"
Write-Host "Corpus: $Data"
Write-Host "Independent run: $Out"
Write-Host "Native $NativePort; UI $UIPort; GPU $Gpu; useful VRAM cap $Vram GB."
$VramArg=$Vram.ToString([Globalization.CultureInfo]::InvariantCulture)
$parameters=@(
  "-NoProfile","-ExecutionPolicy","Bypass","-File",('"' + $Original + '"'),
  "-Data",('"' + $Data + '"'),"-Out",('"' + $Out + '"'),
  "-Port","$NativePort","-Workers","1","-Arms","winner",
  "-Worlds","text,maze,transform","-Mem","$Mem",
  "-Gpu",('"' + $Gpu + '"'),"-Vram","$VramArg",
  "-GpuTextBatch","$GpuTextBatch","-GpuTextChunk","$GpuTextChunk",
  "-GpuWorlds","$GpuWorlds","-Every","$Every",
  "-CheckpointEvery","$CheckpointEvery","-XdAtlasEvery","$XdAtlasEvery",
  "-MazeEvery","$MazeEvery"
)
if($fresh){$parameters+="-Fresh"}
$native=Start-Process -FilePath "powershell.exe" -WorkingDirectory $Root -ArgumentList $parameters -PassThru
$ready=$false
for($i=0;$i -lt 1800;$i++){
  Start-Sleep -Milliseconds 500
  if(($i % 60) -eq 0){
    Write-Host "Awaiting ORIGINAL CUDA text preflight and real /graphs, no success assumed..." -ForegroundColor DarkCyan
  }
  if($native.HasExited){throw "Original V17 launcher exited; inspect its own PowerShell window"}
  try{
    $state=Invoke-RestMethod -Uri "http://127.0.0.1:$NativePort/graphs" -TimeoutSec 2
    if($state.graphs){
      $failed=@($state.graphs | Where-Object {$_.status -eq "eroare"})
      if($failed.Count){throw ("Original V17 worker error: "+$failed[0].error)}
      $ready=$true;break
    }
  }catch{
    if($_.Exception.Message -match "Original V17 worker error"){throw}
  }
}
if(!$ready){throw "Original /graphs unavailable; inspect actual V17 terminal. No fake training status."}
$url="http://127.0.0.1:$UIPort"
Write-Host "REAL V26-DESIGN HYPERMAZE LABORATORY: $url" -ForegroundColor Green
if(!$NoBrowser){Start-Process $url}
& node $Bridge --port $UIPort --native-port $NativePort
if($LASTEXITCODE -ne 0){throw "Native read-only UI bridge exited: $LASTEXITCODE"}

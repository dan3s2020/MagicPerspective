# MagicPerspective V39 research trainer - ONE ORIGINAL persistent V17/V34 Brain.v8.
# SQuAD real human QA (V38 averaged policy), original 2D maze experience,
# TinyStories real UTF-8 observed-transformations in the SAME Brain, safe resume.
# Never overwrites original Brain and never claims real NVIDIA CUDA execution.
param(
 [Parameter(Mandatory=$true)][string]$OriginalBrain,
 [string]$Data = "D:\training\SQuAD",
 [string]$Out = "D:\MagicPerspective-V39-SERIOUS",
 [string]$TinyStories = "D:\training\TinyStories\TinyStories-train.txt",
 [int]$Port = 8909,
 [int]$TrainSamples = 2400,
 [int]$CalibrationSamples = 500,
 [int]$DevSamples = 650,
 [int]$Epochs = 2,
 [int]$CheckpointEvery = 100,
 [int]$SnapshotEvery = 200,
 [int]$BurnIn = 400,
 [int]$StoryLimit = 2000,
 [int]$StoryEvery = 16,
 [switch]$Download,
 [switch]$ExitWhenFinished
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $OriginalBrain -PathType Leaf)) {
 throw "Original Brain.v8 does not exist: $OriginalBrain. No silent new model will replace it."
}
$OriginalBrain = [System.IO.Path]::GetFullPath($OriginalBrain)
$Out = [System.IO.Path]::GetFullPath($Out)
$Data = [System.IO.Path]::GetFullPath($Data)
if ($Out.TrimEnd('\') -eq (Split-Path -Parent $OriginalBrain).TrimEnd('\')) {
 throw "Output must be different from the original Brain folder. Original checkpoint protected."
}
if ($Port -lt 1024 -or $Port -gt 65535) { throw "Invalid local UI port." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22+ required." }
$nodeVersion = & node -p "Number(process.versions.node.split('.')[0])"
if ($LASTEXITCODE -ne 0 -or [int]$nodeVersion -lt 22) {
 throw "Node.js 22+ required."
}
$server = Join-Path $PSScriptRoot "research\v39\real-unified-trainer.mjs"
if (-not (Test-Path -LiteralPath $server -PathType Leaf)) {
 throw "Real V39 trainer source missing: $server"
}
$train = Join-Path $Data "train-v1.1.json"
$dev = Join-Path $Data "dev-v1.1.json"
$official = @(
 @{Path=$train;Url="https://rajpurkar.github.io/SQuAD-explorer/dataset/train-v1.1.json";SHA="3527663986b8295af4f7fcdff1ba1ff3f72d07d61a20f487cb238a6ef92fd955"},
 @{Path=$dev;Url="https://rajpurkar.github.io/SQuAD-explorer/dataset/dev-v1.1.json";SHA="95aa6a52d5d6a735563366753ca50492a658031da74f301ac5238b03966972c9"}
)
if ($Download) {
 if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
  throw "curl.exe required for resumable official SQuAD download."
 }
 New-Item -ItemType Directory -Force -Path $Data | Out-Null
 foreach ($item in $official) {
  if (-not (Test-Path -LiteralPath $item.Path -PathType Leaf)) {
   $partial = $item.Path + ".part"
   Write-Host "Downloading authentic SQuAD 1.1: $($item.Url)" -ForegroundColor Cyan
   & curl.exe --fail --location --retry 3 --retry-delay 3 --continue-at - --output $partial $item.Url
   if ($LASTEXITCODE -ne 0) { throw "Dataset download interrupted; repeat with -Download to resume ." }
   Move-Item -LiteralPath $partial -Destination $item.Path
  }
 }
}
foreach ($item in $official) {
 if (-not (Test-Path -LiteralPath $item.Path -PathType Leaf)) {
  throw "Official dataset missing: $($item.Path). Run with -Download."
 }
 $actual = (Get-FileHash -LiteralPath $item.Path -Algorithm SHA256).Hash.ToLowerInvariant()
 if ($actual -ne $item.SHA) {
  throw "Official SQuAD SHA256 mismatch: $($item.Path). Do not train on unverified files."
 }
}
if ($StoryLimit -lt 0) { throw "-StoryLimit must be >=0." }
if ($StoryLimit -gt 0 -and -not (Test-Path -LiteralPath $TinyStories -PathType Leaf)) {
 Write-Host "No local TinyStories file. Only maze + real human SQuAD QA enabled; no fake TinyStories progress." -ForegroundColor Yellow
 Write-Host "To enable source text, set -TinyStories to your REAL TinyStories-train.txt file." -ForegroundColor Yellow
 $StoryLimit = 0
}
$portListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
try { $portListener.Start() } catch {
 throw "Port $Port occupied. V39 must not attach to another V17 or TinyStories worker; choose another -Port."
} finally { $portListener.Stop() }
New-Item -ItemType Directory -Force -Path $Out | Out-Null
Write-Host ""
Write-Host "V39 ORIGINAL MAGIC PERSPECTIVE — REAL SERIOUS TRAINING" -ForegroundColor Cyan
Write-Host "Existing original V17 Brain, read ONLY: $OriginalBrain"
Write-Host "New isolated V39 Brain: $Out\brains\brain-0.v8"
Write-Host "Official SQuAD 1.1 TRAIN + heldout DEV: SHA256 verified."
Write-Host "Real SQuAD samples: $TrainSamples, calibration $CalibrationSamples, DEV $DevSamples; epochs $Epochs."
Write-Host "Actual original learned state and original Discoverer.shapeGraph are preserved."
Write-Host "TinyStories source: $(if ($StoryLimit) { $TinyStories } else { 'disabled: no verified text provided' })"
Write-Host "TinyStories max episodes: $StoryLimit. Progress shown in bytes and real stories."
Write-Host "CPU Node.js mode for this QA training lane; NOT a verified CUDA RTX training benchmark." -ForegroundColor Yellow
Write-Host "Start/Pause/Save available in NEW local research UI, original V17 UI unchanged."
Write-Host "V39 UI: http://127.0.0.1:$Port/" -ForegroundColor Green
Write-Host "Ctrl+C closes UI. Checkpoint is saved after $CheckpointEvery actual examples."
Write-Host ""
$argsList = @(
 $server,
 "--train", $train, "--dev", $dev,
 "--original", $OriginalBrain, "--out", $Out, "--port", "$Port",
 "--train-samples", "$TrainSamples",
 "--calibration-samples", "$CalibrationSamples",
 "--dev-samples", "$DevSamples",
 "--epochs", "$Epochs",
 "--checkpoint-every", "$CheckpointEvery",
 "--snapshot-every", "$SnapshotEvery",
 "--burn-in", "$BurnIn",
 "--story-limit", "$StoryLimit",
 "--story-every", "$StoryEvery"
)
if ($StoryLimit -gt 0) { $argsList += @("--tiny", $TinyStories) }
if (-not $ExitWhenFinished) { $argsList += "--keep-ui-open" }
& node @argsList
if ($LASTEXITCODE -ne 0) { throw "V39 original training failed with code $LASTEXITCODE. Check original V39 status/log and GitHub test results." }

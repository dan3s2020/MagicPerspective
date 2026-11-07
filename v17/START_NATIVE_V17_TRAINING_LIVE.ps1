# Starts the EXISTING native V17 Brain, CUDA training and original LIVE UI.
# This does not install or pretend to integrate unmerged local-axis algorithms.
# Deliberately isolates runtime saves from any previous MagicPerspective checkout.
param(
    [string]$Data = "D:\training\OpenThoughts3-1.2M",
    [int]$Port = 8872,
    [string]$Gpu = "cuda:0",
    [double]$Vram = 2.0,
    [int]$GpuWorlds = 32,
    [int]$GpuTextBatch = 1,
    [int]$GpuTextChunk = 128,
    [int]$ReportEvery = 200000,
    [int]$Workers = 1,
    [long]$Chars = 0,
    [string]$RuntimeName = "runtime-real-v17-live-20261107",
    [switch]$Resume,
    [switch]$Paused
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$native = Join-Path $root "START_V17.ps1"
if (-not (Test-Path -LiteralPath $native -PathType Leaf)) {
    throw "Original V17 launcher missing: $native"
}
if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
    throw "REAL OpenThoughts dataset not found: $Data. No demo corpus substitution."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js not installed."
}
if (-not (Get-Command powershell.exe -ErrorAction SilentlyContinue)) {
    throw "Windows PowerShell is required."
}
if ($Port -lt 1024 -or $Port -gt 65535) {
    throw "Invalid local port: $Port"
}
if ($RuntimeName -notmatch '^runtime-[A-Za-z0-9_-]+$') {
    throw "RuntimeName must be a local runtime-* folder, not an absolute or parent path."
}
if ($Gpu -ne "cuda:0" -and $Gpu -ne "off") {
    throw "Supported explicit device choices: cuda:0 or off"
}
if ($Vram -le 0 -or $Vram -gt 3.2) {
    throw "For the 4GB RTX 3050 Ti, set a VRAM allowance in (0, 3.2] GB."
}
if ($GpuWorlds -lt 1 -or $GpuTextBatch -lt 1 -or $GpuTextChunk -lt 1 -or $GpuTextChunk -gt 512 -or $Workers -lt 1 -or $ReportEvery -lt 1000) {
    throw "GPU worlds, text batch, chunk and workers must be positive."
}
$runtime = Join-Path $root $RuntimeName
if (Test-Path -LiteralPath $runtime) {
    $hasFiles = @(Get-ChildItem -LiteralPath $runtime -Force -ErrorAction SilentlyContinue).Count -gt 0
    if ($hasFiles -and -not $Resume) {
        throw "Output exists with data: $runtime. Pass -Resume to continue. NO automatic overwrite/reset."
    }
}
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
try {
    $listener.Start()
} catch {
    throw "Port $Port already used. Select a free -Port. Existing V17 servers remain untouched."
} finally {
    try { $listener.Stop() } catch {}
}
$argsNative = @(
    "-Workers", "$Workers",
    "-Arms", "stable+many",
    "-Mem", "3",
    "-Worlds", "text,maze,transform",
    "-MazeEvery", "4000",
    "-Every", "$ReportEvery",
    "-Data", $Data,
    "-Out", $runtime,
    "-Port", "$Port",
    "-Chars", "$Chars",
    "-Gpu", $Gpu,
    "-GpuWorlds", "$GpuWorlds",
    "-GpuTextBatch", "$GpuTextBatch",
    "-GpuTextChunk", "$GpuTextChunk",
    "-Vram", "$Vram",
    "-GpuUtil", "100",
    "-Cuda", "cu126",
    "-TraceTransformations",
    "-EndogenousNoise"
)
if ($Resume) { $argsNative += "-Resume" }
if (-not $Paused) { $argsNative += "-Start" }
Write-Host "=== V17 REAL NATIVE TRAINING / LIVE UI ===" -ForegroundColor Cyan
Write-Host "Original motor: $native"
Write-Host "REAL dataset:   $Data"
Write-Host "Isolated save:  $runtime"
Write-Host "CUDA device:    $Gpu (GPU self-test must pass, NO silent CPU fallback)"
Write-Host "Text chunk:     $GpuTextChunk (all characters still trained)"
Write-Host "Evaluate/save: every $ReportEvery characters after initial checkpoint"
Write-Host "LIVE UI:        http://127.0.0.1:$Port/transcend/torus-aether/ui/index.html?live=1"
Write-Host "This runs the native model and its existing live observers."
Write-Host "Research-only local-axis symbolic experiments are NOT integrated into native generation." -ForegroundColor Yellow
Write-Host "Ctrl+C requests a stop/save; leave the PowerShell server window running while using the UI."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $native @argsNative
if ($LASTEXITCODE -ne 0) {
    throw "Native V17 process failed with exit code $LASTEXITCODE. See the exact exception above."
}

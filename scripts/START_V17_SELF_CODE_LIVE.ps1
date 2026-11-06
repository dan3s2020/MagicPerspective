# Opt-in Windows launcher for real V17 multiworld training after the live-graph fix.
# Run from a clean, updated clone on D:. Never deletes or overwrites old checkpoints.
param(
    [string]$Data = "D:\training\OpenThoughts3-1.2M",
    [string]$Out = "",
    [int]$Port = 8872,
    [int]$GpuWorlds = 64,
    [int]$GpuTextBatch = 8,
    [double]$Vram = 3.0,
    [double]$Mem = 3.0,
    [int]$Workers = 1,
    [int]$MazeEvery = 4000,
    [int]$Every = 60000,
    [string]$Gpu = "cuda:0"
)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$branch = "feature/V17-NATIVE-SELF-CODE-PORTALS-20261106"
$runtime = if ([string]::IsNullOrWhiteSpace($Out)) { Join-Path $root "v17\runtime-native-selfcode-windows" } else { $Out }
if (-not (Test-Path -LiteralPath (Join-Path $root ".git"))) { throw "Launcher must run from a Git clone." }
$actualBranch = (& git -C $root branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $actualBranch -ne $branch) { throw "Wrong Git branch: $actualBranch" }
if (-not (Test-Path -LiteralPath $Data)) { throw "Training dataset missing: $Data" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required." }

Write-Host "=== V17 live graph: syntax checks ===" -ForegroundColor Cyan
foreach ($file in @(
    "v17/transcend/torus-aether/devour/devour.mjs",
    "v17/transcend/torus-aether/devour/worker.mjs",
    "v17/transcend/torus-aether/ui/app.js",
    "v17/transcend/torus-aether/devour/selfcode-native.mjs",
    "isolated/noise-space/nested_text_gears.mjs",
    "isolated/noise-space/native_gear_drive.mjs",
    "v17/transcend/torus-aether/ui/text-journey5d.mjs",
    "v17/transcend/torus-aether/ui/text-maze-viewer.mjs",
    "v17/transcend/torus-aether/devour/trace.mjs"
)) {
    & node --check (Join-Path $root $file)
    if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $file" }
}
Write-Host "=== V17 live graph: regression tests ===" -ForegroundColor Cyan
$tests = @(
    "v17/transcend/torus-aether/devour/selfcode-native.test.mjs",
    "v17/transcend/torus-aether/devour/selfcode-evaluator.test.mjs",
    "experimental/self-world/code-world.test.mjs",
    "v17/transcend/torus-aether/shared/experience.test.mjs",
    "isolated/noise-space/nested_text_gears.test.mjs",
    "isolated/noise-space/native_gear_drive.test.mjs",
    "isolated/noise-space/streaming_gear.test.mjs",
    "v17/transcend/torus-aether/devour/brain.native-gear.test.mjs",
    "v17/transcend/torus-aether/devour/brain.text5d.test.mjs",
    "v17/transcend/torus-aether/devour/trace.text5d.test.mjs",
    "v17/transcend/torus-aether/ui/text-journey5d.test.mjs",
    "v17/transcend/torus-aether/ui/text-maze-viewer.test.mjs"
)
& node --test @($tests | ForEach-Object { Join-Path $root $_ })
if ($LASTEXITCODE -ne 0) { throw "Regression tests failed, training will not start." }

Write-Host "=== V17 NATIVE SELF-CODE TRAINING (CUDA, real trainer) ===" -ForegroundColor Green
Write-Host "Browser: http://127.0.0.1:$Port/"
Write-Host "Checkpoints (resume, not reset): $runtime"
Write-Host "Worlds: text,maze,transform,selfcode + native text gears IN Brain.chat() + actual 5D text trajectories"
Write-Host "GPU: $Gpu, VRAM budget: $Vram GB, parallel worlds: $GpuWorlds, text batch: $GpuTextBatch"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root "v17\START_V17.ps1") `
    -Workers $Workers -Arms "stable+many" -Mem $Mem `
    -Worlds "text,maze,transform,selfcode" -Data $Data -Out $runtime -Port $Port `
    -Gpu $Gpu -GpuWorlds $GpuWorlds -GpuTextBatch $GpuTextBatch -Vram $Vram `
    -GpuUtil 100 -MazeEvery $MazeEvery -Every $Every -Chars 0 -Cuda "cu126" -Resume -Start
if ($LASTEXITCODE -ne 0) { throw "V17 launcher stopped with exit code $LASTEXITCODE" }

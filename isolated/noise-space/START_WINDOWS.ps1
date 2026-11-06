param([int]$Port=8897, [switch]$NoBrowser, [string]$Events="")
$ErrorActionPreference='Stop'
$base=Split-Path -Parent $MyInvocation.MyCommand.Path
if(-not (Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js 20+ is required. Install Node LTS, then rerun this script. No files were changed.'}
$nodeVersion=(& node --version).Trim()
if($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v([0-9]+)\.'){throw "Could not read Node.js version: $nodeVersion"}
$major=[int]$Matches[1]
if($major -lt 20){throw 'Node.js 20+ is required.'}
Push-Location $base
try {
  Write-Host '=== MAGIC PERSPECTIVE · ISOLATED NOISE SPACE ===' -ForegroundColor Cyan
  Write-Host "Location: $base"
  Write-Host 'No V17 source files are modified.'
  $gpuPy=Join-Path $base '.venv\Scripts\python.exe'
  if(Test-Path -LiteralPath $gpuPy){
    $env:OCTOPUS_PY=$gpuPy
    Write-Host "Isolated GPU Python selected: $gpuPy" -ForegroundColor Green
  } elseif($env:OCTOPUS_PY -and (Test-Path -LiteralPath $env:OCTOPUS_PY)){
    $gpuPy=$env:OCTOPUS_PY
    Write-Host "Reusing installed GPU Python: $gpuPy" -ForegroundColor Green
  } else {
    Write-Host 'CUDA not installed here. GPU mode must be set up explicitly using SETUP_CUDA_WINDOWS.ps1.' -ForegroundColor Yellow
  }
  $testFiles = @("$base\test.mjs","$base\v17_smoke.test.mjs","$base\observatory.test.mjs","$base\http_observatory.test.mjs","$base\text_action_paths.test.mjs","$base\causal_text_world.test.mjs")
  if(Test-Path -LiteralPath $gpuPy){$testFiles += "$base\gpu_runner.test.mjs";$testFiles += "$base\cuda_integration.test.mjs"}
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
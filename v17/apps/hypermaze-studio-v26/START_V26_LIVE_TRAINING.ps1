param(
  [string]$Corpus = "",
  [int]$Port = 8896,
  [int]$Axes = 6,
  [int]$Words = 1024,
  [double]$Noise = 0.22,
  [int]$Batch = 4,
  [switch]$NoAuto
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Node = Get-Command node -ErrorAction SilentlyContinue
if (-not $Node) { throw 'Node.js v22 or later is required and not found in PATH.' }
$NodeMajor = [int]((& $Node.Source --version).TrimStart('v').Split('.')[0])
if ($NodeMajor -lt 22) { throw "Node.js 22+ required, detected $NodeMajor." }
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Port must be 1024..65535.' }
$ArgsList = @(
  (Join-Path $Root 'server.mjs'),
  '--port', "$Port",
  '--axes', "$Axes",
  '--words', "$Words",
  '--noise', "$Noise",
  '--batch', "$Batch"
)
if ($Corpus) {
  if (-not (Test-Path -LiteralPath $Corpus -PathType Leaf)) {
    throw "Corpus file not found: $Corpus"
  }
  $ArgsList += @('--corpus', (Resolve-Path -LiteralPath $Corpus).Path)
}
if ($NoAuto) { $ArgsList += '--no-auto' }
Write-Host ''
Write-Host 'MagicPerspective V26 | NEW native training application' -ForegroundColor Cyan
Write-Host "UI local: http://127.0.0.1:$Port" -ForegroundColor Green
Write-Host 'Trainer: original V17 Discoverer.shape, real corpus-controlled observed actions'
Write-Host 'DEVICE: CPU. CUDA has not been independently validated for this app.' -ForegroundColor Yellow
Write-Host 'Keep this terminal open while training. Ctrl+C stops the server.'
Write-Host ''
& $Node.Source @ArgsList
if ($LASTEXITCODE -ne 0) { throw "V26 server exited with code $LASTEXITCODE" }

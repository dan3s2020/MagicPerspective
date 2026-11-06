param(
  [string]$Data = "D:\training\OpenThoughts3-1.2M",
  [string]$Out = "D:\MagicPerspective-Native-Language-Run",
  [int]$Rows = 1000,
  [int]$Bytes = 120000,
  [int]$Maze = 160,
  [int]$Eval = 8,
  [int]$Candidates = 8,
  [switch]$Resume,
  [switch]$Strict
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path
$entry = Join-Path $repo "isolated\native-language-paths\train.mjs"
$tests = Join-Path $repo "isolated\native-language-paths\native.test.mjs"
if (-not (Test-Path -LiteralPath $Data -PathType Container)) {
  throw "Nu exista corpusul Parquet: $Data . Nu se vor genera exercitii artificiale."
}
if (-not (Test-Path -LiteralPath $entry -PathType Leaf)) {
  throw "Lipseste antrenorul real: $entry"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Lipseste Node.js 20+. Instaleaza Node.js si ruleaza din nou."
}
$version = (& node -p "Number(process.versions.node.split('.')[0])")
if ($LASTEXITCODE -ne 0 -or $version -lt 20) {
  throw "Este necesar Node.js 20+"
}
Write-Host "=== MAGIC PERSPECTIVE / NATIVE LANGUAGE PATHS ===" -ForegroundColor Cyan
Write-Host "Repository: $repo"
Write-Host "Dataset: $Data"
Write-Host "Out: $Out"
Write-Host "Original V17 UI si celelalte clonarile raman intacte."
& node --test $tests
if ($LASTEXITCODE -ne 0) { throw "Testele de conformitate pentru mecanismul original au esuat. Trainingul este blocat." }
$arguments = @(
  $entry, "--data", $Data, "--out", $Out,
  "--rows", "$Rows", "--bytes", "$Bytes", "--maze", "$Maze",
  "--eval", "$Eval", "--candidates", "$Candidates"
)
if ($Resume) { $arguments += "--resume" }
if ($Strict) { $arguments += "--strict" }
& node @arguments
if ($LASTEXITCODE -ne 0) { throw "Experimentul a esuat sau a fost intrerupt. Consultati iesirea si raportul, daca exista." }
Write-Host ("Raport real: " + (Join-Path $Out "report.json")) -ForegroundColor Green
Write-Host "Nu reprezinta dovada de intelegere semantica generala." -ForegroundColor Yellow

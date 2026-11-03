# Windows PowerShell 5.1 / 7. Read-only launcher. Never kills an old trainer.
# Runs exact local Portal4D V7 next to the separate 4D evidence viewer.
param(
    [string]$V7Root = "$env:USERPROFILE\Downloads\Portal4D_V7_RUN\Portal_4D_v7_Universal_Graph",
    [string]$RepoRoot = "$env:USERPROFILE\Downloads\MagicPerspective",
    [switch]$NoBrowser
)
$ErrorActionPreference = "Stop"
function IsListening([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne(700)) { return $false }
        $client.EndConnect($result)
        return $true
    }
    catch { return $false }
    finally { $client.Close() }
}
function ShowPortOwner([int]$Port) {
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1 |
        ForEach-Object {
            $ownerId = $_.OwningProcess
            Get-CimInstance Win32_Process -Filter "ProcessId=$ownerId" |
                Select-Object ProcessId, Name, CommandLine | Format-List
        }
}
function WaitPort([int]$Port, [string]$Label) {
    for ($i=0; $i -lt 30; $i++) {
        if (IsListening $Port) { return }
        Start-Sleep -Milliseconds 500
    }
    throw "$Label did not bind to port $Port. Read its own PowerShell console for the actual error."
}
$launcher = Join-Path $V7Root "START_PORTAL_4D_v7.ps1"
$growthServer = Join-Path $RepoRoot "experiments\portal-v7-hypercube-4d\growth-server.mjs"
if (-not (Test-Path -LiteralPath $growthServer)) {
    throw "Missing MagicPerspective graph server: $growthServer. Pull main in the original repository."
}
Write-Host "=== EXACT PORTAL4D V7 + REAL GRAPH VIEW ===" -ForegroundColor Cyan
Write-Host "V7 source: $V7Root"
Write-Host "Graph source: $growthServer"
Write-Host "Checkpoints are NOT modified by this launcher."

if (IsListening 8788) {
    Write-Host "8788 already occupied. Reusing its existing server; no duplicate trainer." -ForegroundColor Yellow
    ShowPortOwner 8788
} else {
    if (-not (Test-Path -LiteralPath $launcher)) {
        throw "Exact V7 launcher missing: $launcher. No replacement or fake training engine will be started."
    }
    Write-Host "Starting ORIGINAL Portal4D V7 in its own PowerShell window..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell.exe" -WorkingDirectory $V7Root -ArgumentList @(
        "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-File", ('"' + $launcher + '"')
    ) | Out-Null
    WaitPort 8788 "Original Portal4D V7"
}
if (IsListening 8791) {
    Write-Host "8791 already occupied. Checking it is the expected graph viewer..." -ForegroundColor Yellow
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:8791/api/health" -TimeoutSec 3
        if (-not $health.ok -or -not $health.read_only_original_v7) {
            ShowPortOwner 8791
            throw "Port 8791 belongs to another service. No processes have been stopped."
        }
    } catch {
        ShowPortOwner 8791
        throw "Port 8791 cannot be verified as the graph viewer. No processes have been stopped. $($_.Exception.Message)"
    }
} else {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { throw "Node.js missing; cannot start the real graph viewer." }
    Write-Host "Starting the 4D evidence viewer in another console..." -ForegroundColor Cyan
    Start-Process -FilePath $node.Source -WorkingDirectory (Split-Path $growthServer) -ArgumentList @(('"' + $growthServer + '"')) | Out-Null
    WaitPort 8791 "4D graph viewer"
}
Write-Host "V7 original training START 1 / START 2: http://127.0.0.1:8788" -ForegroundColor Green
Write-Host "Combined V7 controls + 4D evidence view: http://127.0.0.1:8791" -ForegroundColor Green
Write-Host "NOTE: The original V7 still needs a measured-event adapter to populate the new 4D graph." -ForegroundColor Yellow
if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:8791"
}

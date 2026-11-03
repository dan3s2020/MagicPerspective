# Windows PowerShell 5.1 / 7. Read-only launcher. Never kills an old trainer.
# Runs exact local Portal4D V7 next to the separate 4D evidence viewer.
param(
    [string]$V7Root = "$env:USERPROFILE\Downloads\Portal4D_V7_RUN\Portal_4D_v7_Universal_Graph",
    [string]$RepoRoot = "$env:USERPROFILE\Downloads\MagicPerspective",
    [string]$OriginalZip = "$env:USERPROFILE\Downloads\Portal_4D_v7_Universal_Graph.zip",
    [switch]$NoBrowser,
    [switch]$ResolveOnly
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
# Read-only discovery before any extraction. Reuse exact working source if found.
function FindV7Launcher([string]$Root) {
    if (-not (Test-Path -LiteralPath $Root -PathType Container)) { return $null }
    $hits = @(Get-ChildItem -LiteralPath $Root -Filter "START_PORTAL_4D_v7.ps1" -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch '[\\/](\.venv|__pycache__|\.git)[\\/]' })
    if ($hits.Count -eq 1) { return $hits[0].FullName }
    if ($hits.Count -gt 1) {
        $hits | Select-Object -ExpandProperty FullName | Out-Host
        throw "Multiple original V7 launchers were found under $Root. Not selecting an arbitrary version."
    }
    return $null
}
function RestoreMissingV7Source([string]$Zip, [string]$Target) {
    if (-not (Test-Path -LiteralPath $Zip -PathType Leaf)) {
        throw "Original V7 source ZIP not found: $Zip"
    }
    $downloadRoot = Join-Path $env:USERPROFILE "Downloads"
    if (-not (Test-Path -LiteralPath $downloadRoot)) {
        New-Item -ItemType Directory -Path $downloadRoot -Force | Out-Null
    }
    $recover = Join-Path $downloadRoot ("Portal4D_V7_RECOVER_" + [DateTime]::UtcNow.ToString("yyyyMMdd_HHmmssfff"))
    New-Item -ItemType Directory -Path $recover -ErrorAction Stop | Out-Null
    # Fresh directory, never -Force. No user source or weights are overwritten.
    Expand-Archive -LiteralPath $Zip -DestinationPath $recover -ErrorAction Stop
    $found = FindV7Launcher $recover
    if (-not $found) {
        throw "Original ZIP extracted to $recover, but it contains no START_PORTAL_4D_v7.ps1."
    }
    $sourceRoot = Split-Path -Parent $found
    $existingVenv = Join-Path $Target ".venv\Scripts\python.exe"
    if (-not (Test-Path -LiteralPath $existingVenv -PathType Leaf)) {
        Write-Host "Restored V7 to a NEW directory: $sourceRoot" -ForegroundColor Yellow
        return $found
    }
    # When original V7 .venv still exists, restore ONLY MISSING source files
    # into its own V7 directory. Reuse installed CUDA without modifying
    # existing code, virtual environment, dataset, checkpoint or model.
    $allowed = @(".ps1",".py",".html",".js",".mjs",".css",".json",".txt",
                 ".md",".yml",".yaml",".toml",".ini",".cfg",".bat",".cmd")
    $restored = 0
    foreach ($item in @(Get-ChildItem -LiteralPath $sourceRoot -Recurse -File -ErrorAction Stop)) {
        if ($allowed -notcontains $item.Extension.ToLowerInvariant()) { continue }
        $relative = $item.FullName.Substring($sourceRoot.Length).TrimStart([char]'\',[char]'/')
        if ($relative -match '(^|[\\/])(\.venv|\.git|__pycache__|data|checkpoints)([\\/]|$)') { continue }
        $dest = Join-Path $Target $relative
        if (-not (Test-Path -LiteralPath $dest)) {
            $parent = Split-Path -Parent $dest
            if (-not (Test-Path -LiteralPath $parent)) {
                New-Item -ItemType Directory -Path $parent -Force | Out-Null
            }
            Copy-Item -LiteralPath $item.FullName -Destination $dest -ErrorAction Stop
            $restored++
        }
    }
    $launcherAtTarget = Join-Path $Target "START_PORTAL_4D_v7.ps1"
    if (-not (Test-Path -LiteralPath $launcherAtTarget -PathType Leaf)) {
        throw "Original V7 launcher not restored to $launcherAtTarget; staging folder: $sourceRoot"
    }
    Write-Host "Restored $restored MISSING original V7 source files; existing CUDA venv and checkpoints preserved." -ForegroundColor Green
    return $launcherAtTarget
}
$launcher = FindV7Launcher $V7Root
if (-not $launcher) {
    $download = Join-Path $env:USERPROFILE "Downloads"
    $candidateRoots = @(
        (Join-Path $download "Portal4D_V7_RUN"),
        (Join-Path $download "Portal_4D_v7_Universal_Graph")
    ) | Select-Object -Unique
    foreach ($candidate in $candidateRoots) {
        if ($candidate -eq $V7Root) { continue }
        $launcher = FindV7Launcher $candidate
        if ($launcher) { break }
    }
}
if (-not $launcher) {
    # ResolveOnly allows testing discovery + ZIP recovery without running.
    Write-Host "Original V7 launcher missing. Recovering source from: $OriginalZip" -ForegroundColor Yellow
    $launcher = RestoreMissingV7Source $OriginalZip $V7Root
}
$V7Root = Split-Path -Parent $launcher
if ($ResolveOnly) {
    Write-Host "V7_LAUNCHER_RESOLVED: $launcher" -ForegroundColor Green
    return
}
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

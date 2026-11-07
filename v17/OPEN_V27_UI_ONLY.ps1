param(
  [int]$Port = 8841,
  [int]$Worker = -1,
  [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
if ($Port -lt 1024 -or $Port -gt 65535) {throw 'Port must be 1024..65535'}
$Api = "http://127.0.0.1:$Port/graphs"
Write-Host "Verific motorul V17 ORIGINAL pe $Api" -ForegroundColor Cyan
try {
  $Raw = Invoke-RestMethod -Uri $Api -TimeoutSec 8
} catch {
  throw @"
Motorul original nu răspunde pe portul $Port.
Deschide o altă fereastră PowerShell și pornește SCRIPTUL ORIGINAL:
powershell -ExecutionPolicy Bypass -File .\v17\START_V17.ps1 -Data "D:\training\OpenThoughts3-1.2M" -Resume
IMPORTANT: dacă ai checkpointuri salvate în alt director, folosește exact același -Out original.
V27 NU pornește, NU resetează și NU înlocuiește antrenarea!
Detaliu conexiune: $($_.Exception.Message)
"@
}
if ($null -eq $Raw.graphs) {
  throw 'Portul nu servește schema originală V17 /graphs; nu deschid o aplicație care ar prezenta măsurători incomparabile.'
}
$Url = "http://127.0.0.1:$Port/transcend/torus-aether/ui/v27-studio.html?live=1"
if($Worker -ge 0){$Url += "&w=$Worker"}
Write-Host "Motor native detectat. Grafuri: $(@($Raw.graphs).Count)" -ForegroundColor Green
Write-Host "UI original V27 (același backend, aceleași metrici): $Url" -ForegroundColor Green
if(!$NoBrowser){Start-Process $Url}

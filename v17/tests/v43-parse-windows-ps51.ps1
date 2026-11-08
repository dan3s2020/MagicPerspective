param([Parameter(Mandatory=$true)][string]$File)
$ErrorActionPreference = 'Stop'
$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($File,[ref]$tokens,[ref]$parseErrors) | Out-Null
if($parseErrors.Count -gt 0){
  foreach($issue in $parseErrors){[Console]::Error.WriteLine($issue.ToString())}
  exit 1
}
Write-Host 'WINDOWS_POWERSHELL_5_1_REAL_PARSE_PASS'

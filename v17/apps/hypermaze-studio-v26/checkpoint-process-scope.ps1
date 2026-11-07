# V32 isolated process-scope guard. Read-only Win32_Process command line parsing.
# Never kills, stops, writes to or reconfigures another experiment.
function Resolve-MagicPerspectiveProcessOut {
  param([string]$CommandLine)
  if ([string]::IsNullOrWhiteSpace($CommandLine)) { return $null }
  $out = [regex]::Match($CommandLine, '(?i)(?:^|\s)--out\s+(?:"([^"]+)"|(\S+))')
  if (!$out.Success) { return $null }
  $outArg = if ($out.Groups[1].Success) { $out.Groups[1].Value } else { $out.Groups[2].Value }
  if ([System.IO.Path]::IsPathRooted($outArg)) {
    return [System.IO.Path]::GetFullPath($outArg).TrimEnd('\','/')
  }
  # START_V17.ps1 starts devour.mjs with working directory v17.
  # Identify the script's own v17 root from its absolute path, rather
  # than assuming another agent's cwd equals THIS agent's repo.
  $script = [regex]::Match($CommandLine,
    '(?i)([A-Z]:[\\/][^"\r\n]*?[\\/]v17)[\\/]transcend[\\/]torus-aether[\\/]devour[\\/]devour\.mjs')
  if (!$script.Success) { return $null }
  return [System.IO.Path]::GetFullPath((Join-Path $script.Groups[1].Value $outArg)).TrimEnd('\','/')
}
function Get-MagicPerspectiveTrainerConflicts {
  param(
    [object[]]$Processes,
    [string]$RequestedOut
  )
  $target = [System.IO.Path]::GetFullPath($RequestedOut).TrimEnd('\','/')
  $same = @()
  $independent = @()
  $unresolved = @()
  foreach ($p in $Processes) {
    if ($p.Name -notmatch '^node(\.exe)?$' -or
        $p.CommandLine -notmatch 'devour[\\/]+devour\.mjs') { continue }
    $out = Resolve-MagicPerspectiveProcessOut $p.CommandLine
    $record = [pscustomobject]@{
      PID = $p.ProcessId
      Out = $out
      CommandLine = $p.CommandLine
    }
    if (!$out) {
      $unresolved += $record
    } elseif ([string]::Equals($out,$target,[StringComparison]::OrdinalIgnoreCase)) {
      $same += $record
    } else {
      $independent += $record
    }
  }
  return [pscustomobject]@{
    SameCheckpoint = @($same)
    Independent = @($independent)
    Unresolved = @($unresolved)
    RequestedOut = $target
  }
}

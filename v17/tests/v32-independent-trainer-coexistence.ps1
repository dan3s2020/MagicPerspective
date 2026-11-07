$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $root "v17\apps\hypermaze-studio-v26\checkpoint-process-scope.ps1")
function Assert([bool]$ok,[string]$message) {if (!$ok) {throw "TEST FAILED: $message"}}
$v24 = [pscustomobject]@{
  Name="node.exe";ProcessId=22564
  CommandLine='"C:\Program Files\nodejs\node.exe" --max-old-space-size=5223 D:\MagicPerspective-V24-Characters\v17\transcend\torus-aether\devour\devour.mjs --workers 1 --arms stable+many --mem 3 --every 50000 --out runtime-v24-character-atlas --port 8874 --worlds text,cognitivemap,hypertext,maze,transform --gpu off'
}
$target='D:\MagicPerspective-V28\v17\runtime-devour-original'
$v24Out='D:\MagicPerspective-V24-Characters\v17\runtime-v24-character-atlas'
$analysis=Get-MagicPerspectiveTrainerConflicts -Processes @($v24) -RequestedOut $target
Assert ($analysis.Independent.Count -eq 1) 'V24 MUST be independent and allowed'
Assert ($analysis.SameCheckpoint.Count -eq 0) 'V24 must NOT be mistaken for a same-checkpoint trainer'
Assert ($analysis.Unresolved.Count -eq 0) 'V24 relative --out must resolve from V24 repository root'
Assert ([string]::Equals($analysis.Independent[0].Out,$v24Out,[StringComparison]::OrdinalIgnoreCase)) "V24 output path parsed incorrectly: $($analysis.Independent[0].Out)"
$same=[pscustomobject]@{
  Name="node.exe";ProcessId=6601
  CommandLine=('C:\Program Files\nodejs\node.exe D:\MagicPerspective-V32\v17\transcend\torus-aether\devour\devour.mjs --out "'+$target+'" --port 8851')
}
$combined=Get-MagicPerspectiveTrainerConflicts -Processes @($v24,$same) -RequestedOut $target
Assert ($combined.Independent.Count -eq 1) 'Other experiment lost when same checkpoint present'
Assert ($combined.SameCheckpoint.Count -eq 1) 'Same output must be blocked'
Assert ($combined.SameCheckpoint[0].PID -eq 6601) 'Wrong PID identified as checkpoint writer'
$unknown=[pscustomobject]@{
  Name="node.exe";ProcessId=7701
  CommandLine='node devour/devour.mjs --out relative-directory'
}
$uncertain=Get-MagicPerspectiveTrainerConflicts -Processes @($unknown) -RequestedOut $target
Assert ($uncertain.Unresolved.Count -eq 1) 'Unresolved relative output must be reported'
$unrelated=[pscustomobject]@{
  Name="node.exe";ProcessId=1234;CommandLine='node other-web-server.js --port 8874'
}
$ignored=Get-MagicPerspectiveTrainerConflicts -Processes @($v24,$unrelated) -RequestedOut $target
Assert ($ignored.Independent.Count -eq 1) 'Unrelated Node service must be ignored'
Assert ($ignored.SameCheckpoint.Count -eq 0) 'Unrelated Node service must never be blocked'
Write-Host ('V32_COEXISTENCE_SCOPE_PASS ' + (@{
  V24_PID=22564
  V24_Port=8874
  V24_GPU='off'
  V24_Checkpoint=$v24Out
  V32_Checkpoint=$target
  V24_Allowed=$true
  sameOutputBlocked=$true
  uncertainOutputBlocked=$true
  noForeignProcessKilled=$true
} | ConvertTo-Json -Compress))

# Native V17 integration smoke test. Requires the real V17 server already running.
# Intentionally trains four novel synthetic observations in the selected live worker;
# no files or previous checkpoints are overwritten.
param([int]$Port=8872,[int]$Brain=0)
$ErrorActionPreference="Stop"
$server="http://127.0.0.1:$Port/gear"
$nonce=[guid]::NewGuid().ToString("N").Substring(0,8)
$a="Sera$nonce"; $b="Daro$nonce"
$x="bright$nonce"; $y="tired$nonce"; $z="calm$nonce"
$examples=@("$a is $x.", "$a is $y.", "$b is $y.", "$b is $z.")
$train=@{w=$Brain;mode="observe";examples=$examples}|ConvertTo-Json -Depth 8
$learn=Invoke-RestMethod -Uri $server -Method Post -ContentType "application/json" -Body $train
if(-not $learn.ok -or $learn.accepted -ne 4){throw "Native observations were not learned: $($learn|ConvertTo-Json -Depth 6)"}
# The fifth sentence ($a is $z) was never submitted as a training observation.
$goal=@{'0'=$a;'2'=$z}
$request=@{w=$Brain;mode="plan";start="$b is $y";goal=$goal;noise=0}|ConvertTo-Json -Depth 8
$result=Invoke-RestMethod -Uri $server -Method Post -ContentType "application/json" -Body $request
$expected="$a is $z."
if(-not $result.ok -or -not $result.verified -or $result.output -cne $expected){
  throw "Unseen composition FAILED: $($result|ConvertTo-Json -Depth 8)"
}
if($result.route.Count -lt 2 -or $result.cursor.Count -ne $expected.Length){
  throw "Path/cursor verification FAILED"
}
Write-Host "PASS: live V17 trained four newly observed sentences and composed an unseen fifth." -ForegroundColor Green
Write-Host "Result: $($result.output)"
Write-Host "Macro transformations: $($result.route.Count); cursor steps: $($result.cursor.Count)"
Write-Host "Source V17 brain: #$Brain; graph and checkpoints preserved."

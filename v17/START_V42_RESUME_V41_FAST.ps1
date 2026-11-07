# V42 resumes ORIGINAL V41 Fast Brain + sidecars in a NEW isolated checkout.
# The V41 Fast source folder is discovered on the user's CURRENT Windows PC.
# This script never resets, deletes, kills or mutates the source experiment.
param(
  [string]$Data="D:\training\OpenThoughts3-1.2M",
  [string]$SourceCheckpoint="",
  [string]$Out="",
  [int]$NativePort=8961,
  [int]$UIPort=8962,
  [string]$Gpu="cuda:0",
  [double]$Vram=3.0,
  [int]$GpuTextBatch=1,
  [int]$GpuTextChunk=4096,
  [int]$GpuWorlds=3,
  [switch]$NoBrowser,
  [switch]$EndogenousNoise,
  [switch]$ImportOnly
)
$ErrorActionPreference="Stop"
$Root=$PSScriptRoot
$NewLauncher=Join-Path $Root "START_V41_SPEED_PROFILE.ps1"
if(!(Test-Path -LiteralPath $NewLauncher -PathType Leaf)){throw "V42 V41-Fast native launcher missing: $NewLauncher"}
if(!(Test-Path -LiteralPath $Data -PathType Container)){throw "Original Parquet dataset missing: $Data"}
if($NativePort -eq $UIPort){throw "Native and UI ports must differ"}
if([string]::IsNullOrWhiteSpace($Out)){$Out=Join-Path $Root "runtime-v42-resumed-v41-fast"}
$Out=[IO.Path]::GetFullPath($Out)
$destinationBrain=Join-Path $Out "brains\brain-0-winner.v8"
$manifest=Join-Path $Out "V42_CHECKPOINT_IMPORT_MANIFEST.json"
if(Test-Path -LiteralPath $Out){
  $files=@(Get-ChildItem -LiteralPath $Out -Force -ErrorAction SilentlyContinue)
  if($files.Count -gt 0){
    if(!(Test-Path -LiteralPath $destinationBrain -PathType Leaf)){
      throw "Existing V42 runtime is non-empty but original checkpoint missing: $Out. No files changed."
    }
    Write-Host "V42 existing isolated Brain found, resuming IT; source checkpoint not copied again." -ForegroundColor Green
    if($ImportOnly){Write-Host "V42_IMPORT_ONLY_PASS_ALREADY_PRESENT";exit 0}
    & $NewLauncher -Data $Data -Out $Out -NativePort $NativePort -UIPort $UIPort -Gpu $Gpu -Vram $Vram -GpuTextBatch $GpuTextBatch -GpuTextChunk $GpuTextChunk -GpuWorlds $GpuWorlds -NoBrowser:$NoBrowser -EndogenousNoise:$EndogenousNoise
    exit $LASTEXITCODE
  }
}
# Locate the previous V41 Fast checkpoint from REAL local folders.
# Explicit -SourceCheckpoint overrides auto-discovery; never invent paths.
$candidates=New-Object 'System.Collections.Generic.List[object]'
if(![string]::IsNullOrWhiteSpace($SourceCheckpoint)){
  $source=[IO.Path]::GetFullPath($SourceCheckpoint)
  if(Test-Path -LiteralPath $source -PathType Container){
    $direct=Join-Path $source "brain-0-winner.v8"
    $nested=Join-Path $source "brains\brain-0-winner.v8"
    if(Test-Path -LiteralPath $direct -PathType Leaf){$source=$direct}
    elseif(Test-Path -LiteralPath $nested -PathType Leaf){$source=$nested}
    else {throw "No original brain-0-winner.v8 within supplied source directory"}
  }
  if(!(Test-Path -LiteralPath $source -PathType Leaf)){throw "V41 Fast checkpoint missing: $source"}
  $candidates.Add((Get-Item -LiteralPath $source))
}else{
  $drives=@("D:\","C:\")
  foreach($drive in $drives){
    if(!(Test-Path -LiteralPath $drive -PathType Container)){continue}
    $projects=@(Get-ChildItem -LiteralPath $drive -Directory -ErrorAction SilentlyContinue | Where-Object {
      $_.Name -match '(?i)MagicPerspective|V41|V42'
    })
    foreach($project in $projects){
      # Identify the ORIGINAL V41 Fast source by its actual CUDA kernel
      # and benchmark documentation, not by a guessed folder name.
      $v17=Join-Path $project.FullName "v17"
      $kernel=Join-Path $v17 "transcend\torus-aether\gpu\exact_histogram_cuda.cu"
      $fastDoc=Join-Path $v17 "docs\CUDA_SPEED_V41.md"
      $newer=Join-Path $v17 "START_V42_RESUME_V41_FAST.ps1"
      if(!(Test-Path -LiteralPath $kernel -PathType Leaf) -or
         !(Test-Path -LiteralPath $fastDoc -PathType Leaf) -or
         (Test-Path -LiteralPath $newer -PathType Leaf)){continue}
      # Enumerate ONLY the original runtime folders, never descend into
      # huge .venv, CUDA wheel or node_modules trees.
      $roots=@($v17,$project.FullName)
      foreach($parent in $roots){
        $runtimes=@(Get-ChildItem -LiteralPath $parent -Directory -ErrorAction SilentlyContinue |
          Where-Object {$_.Name -match '(?i)^runtime'})
        foreach($runtime in $runtimes){
          $checkpoint=Join-Path $runtime.FullName "brains\brain-0-winner.v8"
          if(Test-Path -LiteralPath $checkpoint -PathType Leaf){
            $candidates.Add((Get-Item -LiteralPath $checkpoint))
          }
        }
      }
    }
  }
}
# Deduplicate candidates by full path; select the latest real SAVED model.
$dedup=@($candidates | Sort-Object FullName -Unique)
if(!$dedup.Count){
  throw "No V41 Fast checkpoint found under MagicPerspective project folders on C: or D:. No new training started. Provide -SourceCheckpoint with its REAL path."
}
if($dedup.Count -gt 1){
  Write-Host "Real V41 Fast checkpoint candidates (newest first):" -ForegroundColor Yellow
  $dedup | Sort-Object LastWriteTimeUtc -Descending | Select-Object FullName,Length,LastWriteTime | Format-Table -AutoSize
  # Never silently pick another agent's checkpoint when multiple originals exist.
  throw "Several original checkpoints exist. Select the intended one with -SourceCheckpoint; no files changed."
}
$source=$dedup[0].FullName
$sourceBrains=Split-Path -Parent $source
$sourceOut=Split-Path -Parent $sourceBrains
if([string]::Equals($sourceOut,$Out,[StringComparison]::OrdinalIgnoreCase)){
  throw "Source and destination checkpoint directories must differ"
}
if($dedup[0].Length -lt 1024){throw "Checkpoint suspiciously small: $source"}
Write-Host "Detected REAL existing V41 Fast checkpoint: $source" -ForegroundColor Cyan
Write-Host "Original last saved: $($dedup[0].LastWriteTime)" -ForegroundColor Cyan
# Original process ownership guard: no action, no termination. An in-flight
# save may consist of .v8 plus several independently written sidecars.
. (Join-Path $Root "apps\hypermaze-studio-v26\checkpoint-process-scope.ps1")
$running=@(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -match '^node(\.exe)?$' -and $_.CommandLine -match 'devour[\\/]+devour\.mjs'
})
$scope=Get-MagicPerspectiveTrainerConflicts -Processes $running -RequestedOut $sourceOut
if($scope.SameCheckpoint.Count -gt 0){
  Write-Warning "V41 Fast source still trains. Importing ONLY the last saved, hash-verified Brain and sidecars, not unsaved live weights. V41 Fast keeps running untouched."
}
if($scope.Unresolved.Count -gt 0){
  Write-Warning "Some other trainer output paths cannot be resolved; only the selected V41 saved checkpoint will be read."
}
# Copy the complete saved Brain and its original associated sidecars.
# Never copy logs as source of truth, never overwrite V41 Fast source.
$files=@(Get-ChildItem -LiteralPath $sourceBrains -File -ErrorAction Stop | Where-Object {
  $_.Name -like 'brain-0-winner.v8*' -and $_.Name -notlike '*.tmp'
})
if(!($files | Where-Object {$_.Name -eq 'brain-0-winner.v8'})){
  throw "Selected V41 Fast original Brain absent"
}
$stage=$Out+".import-"+[guid]::NewGuid().ToString("N")
if(Test-Path -LiteralPath $stage){throw "Unexpected import staging conflict"}
$null=New-Item -ItemType Directory -Path (Join-Path $stage "brains") -Force
$records=@()
try{
  foreach($file in $files){
    $originalHash=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    $target=Join-Path (Join-Path $stage "brains") $file.Name
    Copy-Item -LiteralPath $file.FullName -Destination $target -ErrorAction Stop
    $copiedHash=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash
    $afterHash=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    if($originalHash -ne $copiedHash -or $originalHash -ne $afterHash){
      throw "Original saved checkpoint changed during read: $($file.FullName); no V42 training started"
    }
    $records+=@{file=$file.Name;sha256=$originalHash;bytes=$file.Length}
  }
  # The complete source folder is rechecked AFTER the entire copy, not just
  # one file at a time. Reject partial V41 Fast saves if a source file changed
  # while the original training process was updating its sidecar state.
  $afterList=@(Get-ChildItem -LiteralPath $sourceBrains -File -ErrorAction Stop | Where-Object {
    $_.Name -like 'brain-0-winner.v8*' -and $_.Name -notlike '*.tmp'
  })
  if($afterList.Count -ne $records.Count){
    throw "V41 Fast saved checkpoint file set changed during import, refusing inconsistent snapshot"
  }
  foreach($record in $records){
    $existing=Join-Path $sourceBrains $record.file
    if(!(Test-Path -LiteralPath $existing -PathType Leaf) -or
      (Get-FileHash -LiteralPath $existing -Algorithm SHA256).Hash -ne $record.sha256){
      throw "V41 Fast changed a checkpoint sidecar during import: $($record.file). Refusing inconsistent snapshot."
    }
  }
  # Verify native v8 can be loaded before making the NEW runtime visible.
  $nodeCheck=Join-Path $Root "tests\v42-check-original-checkpoint.mjs"
  if(!(Test-Path -LiteralPath $nodeCheck -PathType Leaf)){throw "Original Brain checkpoint validator missing"}
  & node $nodeCheck (Join-Path $stage "brains\brain-0-winner.v8")
  if($LASTEXITCODE -ne 0){throw "V41 original V8 checkpoint failed exact Brain.load(); no training started"}
  @{source=$source;sourceSavedAt=$dedup[0].LastWriteTimeUtc.ToString("o");
    importedAt=(Get-Date).ToUniversalTime().ToString("o");newRuntime=$Out;
    files=$records;architecture="original V41 Fast Brain/V8 + sidecars";noSourceMutation=$true} |
    ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $stage "V42_CHECKPOINT_IMPORT_MANIFEST.json") -Encoding UTF8
  if(Test-Path -LiteralPath $Out){$present=@(Get-ChildItem -LiteralPath $Out -Force);if($present.Count){throw "V42 destination unexpectedly became non-empty"};Remove-Item -LiteralPath $Out -Force}
  Move-Item -LiteralPath $stage -Destination $Out -ErrorAction Stop
}catch{
  if(Test-Path -LiteralPath $stage){Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue}
  throw
}
Write-Host "V41 Fast Brain AND sidecars imported into V42, original intact." -ForegroundColor Green
Write-Host "Import evidence: $manifest" -ForegroundColor Green
if($ImportOnly){Write-Host "V42_IMPORT_ONLY_PASS_COPIED_REAL_V8_AND_SIDECARS";exit 0}
& $NewLauncher -Data $Data -Out $Out -NativePort $NativePort -UIPort $UIPort -Gpu $Gpu -Vram $Vram -GpuTextBatch $GpuTextBatch -GpuTextChunk $GpuTextChunk -GpuWorlds $GpuWorlds -NoBrowser:$NoBrowser -EndogenousNoise:$EndogenousNoise
if($LASTEXITCODE -ne 0){throw "Original V41 Fast CUDA worker failed after checkpoint import: exit $LASTEXITCODE"}

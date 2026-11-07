param(
  [string]$CudaRoot="C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.4",
  [string]$VsDevCmd="C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"
)
$ErrorActionPreference="Stop"
$here=$PSScriptRoot
$source=Join-Path $here "exact_histogram_cuda.cu"
$output=Join-Path $here "exact_histogram_cuda.dll"
$nvcc=Join-Path $CudaRoot "bin\nvcc.exe"
if(!(Test-Path -LiteralPath $nvcc)){throw "nvcc missing: $nvcc"}
if(!(Test-Path -LiteralPath $VsDevCmd)){
  $VsDevCmd="C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"
}
if(!(Test-Path -LiteralPath $VsDevCmd)){throw "Visual Studio C++ environment missing"}
$command='"'+$VsDevCmd+'" -arch=x64 -host_arch=x64 >nul && "'+$nvcc+'" -shared -O3 -arch=sm_86 --compiler-options /O2 -o "'+$output+'" "'+$source+'"'
& cmd.exe /d /s /c $command
if($LASTEXITCODE -ne 0){throw "nvcc failed: $LASTEXITCODE"}
if(!(Test-Path -LiteralPath $output)){throw "CUDA DLL was not produced"}
Write-Host "Built exact ordered CUDA histogram: $output" -ForegroundColor Green

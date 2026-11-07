# V28 — Hermes Python reports CUDA unavailable (2026-11-07)

Observed actual user error: RuntimeError(torch.cuda.is_available() is false in C:\Users\DSV\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe).

## Root cause in ORIGINAL V17 source

The original v17/transcend/torus-aether/gpu/client.mjs uses environment OCTOPUS_PY, else its own v17/transcend/torus-aether/gpu/.venv/Scripts/python.exe if installed, else the PATH Python. If V17 was started with -Gpu off and CUDA was selected later in the new V28 UI, the ORIGINAL START_V17.ps1 CUDA setup had not run. On this machine, PATH resolves to Hermes-agent Python, whose torch reports CUDA unavailable. The original worker deliberately stops instead of silently training on CPU.

This does NOT mean the OpenThoughts data is corrupt or that the original text accuracy of approximately 64.5% is invalid.

## Safe recovery

1. Stop ONLY the original training PowerShell window that serves localhost:8841 using Ctrl+C. Do NOT press Reset in V28.
2. From D:\MagicPerspective-V28 start ORIGINAL v17\START_V17.ps1 with the same previous -Out checkpoint folder, -Resume, original dataset, worlds/arms and workers, but include -Gpu cuda:0. The original launcher creates/checks a SEPARATE PyTorch CUDA venv, sets OCTOPUS_PY, runs GPU selftests and then launches the unchanged trainer.
3. An EXAMPLE (only if the previous -OriginalOut used this folder):

powershell -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-V28\v17\START_V17.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-V28\v17\runtime-devour-original" -Workers 1 -Arms winner -Mem 3 -Worlds "text,maze" -Port 8841 -Gpu cuda:0 -GpuWorlds 3 -GpuTextBatch 3 -Vram 3 -GpuUtil 100 -Cuda cu126 -Resume -Start

4. Read the actual original CUDA preflight output. If it fails, inspect the NVIDIA driver or supported Python and wheel; do not claim CUDA is working. Returning to http://127.0.0.1:8897 reconnects to the original backend.
5. With CPU-only, start the exact same original command using -Gpu off and leave the GPU selector off.
6. -Resume continues from the LAST SAVED original checkpoint, not necessarily all unsaved work visible before the failure.

Do not install or overwrite torch inside Hermes-agent venv. The original CUDA environment is isolated under v17/transcend/torus-aether/gpu/.venv.

## Committed V28 regression fix

- Native bridge detects failed original CUDA worker status/error. Starting it again cannot claim success or change its Python interpreter.
- Native bridge performs a real CUDA preflight on its own v17 dedicated Python environment before transmitting an in-browser GPU activation.
- New V26-style UI exposes the actual original fatal error and explains the required original V17 process restart.
- Original V17 Windows launcher parameters -Cuda and -PythonExe are now forwarded by V28.
- All original brain, eval, Parquet, text world, maze, metric, and checkpoint formats remain unchanged.

This validation does not establish that CUDA is available on the user's hardware; it proves the error is recognized and not concealed.

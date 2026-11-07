# V32 ORIGINAL CUDA TEXT — SAFE MAX VRAM, REAL PROGRESS, SAME MODEL

2026-11-07. User directive: "fa sa mearga ! nu ma intereseaza custom kernel sau orice ! doar sa folosesti toti vramii!"

## Verified root cause in repository code

CUDA available=True and 512/512 labyrinth GPU selftest did NOT validate real full-text CUDA training. Original worker buffered three full OpenThoughts documents before completing a batch. TextCard first reconstructs the full prior-memory suffix index on CUDA, creates full document suffix automata, performs thousands of PyTorch alignment operations and updates the original Brain. The UI could show no completed document for a long time even with a healthy device.

A worker in status eroare could also leave old ALIGNED scores in the GUI; V29 already repaired this reporting issue.

## V32 actual implementation

This IS the native V17 Brain and original OpenThoughts Parquet, not the synthetic V26 word-edit simulation. All updates are isolated to branch experiment/V32-REAL-CUDA-TEXT-THROUGHPUT-VRAM-20261107.

- V32 Windows launcher preserves exact prior checkpoint folder, refuses duplicate trainers, occupied ports, and silent restart-from-zero. Runs original trainer with GPU CUDA 0 and one complete real OpenThoughts document per batch.
- Default Vram=0 now queries actual free GPU memory and permits PyTorch to use ALMOST ALL FREE memory with at least 192 MiB driver/display headroom. It never allocates dummy VRAM to fake a high percentage.
- Actual CUDA microchunk starts at 8192 tokens and adjusts after completed real batches according to measured torch.cuda.max_memory_reserved vs effective VRAM budget (up to 16384).
- Original context alignment, frozen heldout predictions, trust updates, maze physics and checkpoint logic unchanged.
- TextCard and GPU server report actual progress through loading original brain memory, suffix indexing, alignment, imagination and indexing new text.
- Browser shows real PyTorch VRAM allocated, reserved, free, safe maximum, current completed microchunk count, elapsed seconds and ORIGINAL colored dataset-consumed bar.
- V32 opt-in startup selftest on actual GPU: runs original full text alignment and trust on CUDA and checks exact NumPy reference BEFORE large Parquet training starts. It is not a maze-only selftest and does not alter saved models.

## Actual checks

GitHub CI: Python original-reference parity on real repository document and exact old Git blob; original Node worker training on real repository text; Chrome browser native ALIGNED/maze/Q-A display; Windows PowerShell parse. GPU hardware is not available in standard GitHub runners. RTX3050Ti hardware performance must be measured on the user's computer; do not claim an unobserved throughput.

## Windows installation and startup

Stop old ORIGINAL V17 trainers in their own PowerShell windows with Ctrl+C. Do not Reset.

From any Windows PowerShell:

    $Repo = "D:\MagicPerspective-V28"
    $Dest = "D:\MagicPerspective-V32"
    $Branch = "experiment/V32-REAL-CUDA-TEXT-THROUGHPUT-VRAM-20261107"
    if (Test-Path $Dest) { throw "Destination exists; no overwrite" }
    git -C $Repo fetch origin "refs/heads/$($Branch):refs/remotes/origin/$($Branch)"
    if ($LASTEXITCODE -ne 0) { throw "fetch failed" }
    git -C $Repo worktree add --detach $Dest "refs/remotes/origin/$Branch"
    if ($LASTEXITCODE -ne 0) { throw "worktree failed" }
    Set-Location $Dest
    powershell -NoProfile -ExecutionPolicy Bypass -File ".\v17\START_V32_REAL_CUDA_FULL_VRAM.ps1" -OriginalOut "D:\MagicPerspective-V28\v17\runtime-devour-original"

The original native CUDA server uses port 8851. New V26-design UI uses http://127.0.0.1:8900.

Use the ACTUAL original -Out if it differs. The launcher refuses to silently start new weights if brain-0-winner.v8 is missing. V32 script asks for -AllowNew only for an explicitly new training run.

Verify the original CUDA terminal prints V32_CUDA_TEXT_SELFTEST_PASS, then the real CUDA worker startup and first completed native batch. UI percentage moves when native exercises are FINISHED. Within one large document, phase/indexing/microchunk counters move independently; they are not fake exercise successes.

## Scientific boundaries

Maximum allowed VRAM != memory actually useful to the model. 4.29 GB GPU needs Windows/CUDA context headroom. V32 does not pretend that 100% of GPU compute is active or that original V17 CPU-side symbolic graph processing is GPU. A full 1.21M-example corpus requires longer-term scalable history/index architecture and is not yet proven with this laptop. This does not claim 70%+ full unseen natural-language solution shapes. V31 cross-document transformation atlas research remains separate.

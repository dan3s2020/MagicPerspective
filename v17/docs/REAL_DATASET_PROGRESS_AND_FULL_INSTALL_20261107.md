# V17 full dataset progress and full reinstall (2026-11-07)

## Root cause of "simboluri absorbite" stopping below ~100
The original index.html stats() counts nodes with n.type === 'sym', i.e. **distinct symbols in the visible learned alphabet**. The character-level V17 stream accepts a bounded ASCII symbol vocabulary, so the distinct-symbol indicator naturally plateaus around 100. This was mislabeled 'simboluri absorbite', making it appear that training had stopped. It was NEVER total characters seen or dataset examples committed.
Original real total characters counter: Brain.chars, including CUDA batches (the original old visual events are sampled). The learner may keep devouring text while the alphabet size stops growing.

## Actual dataset progress
Original openTextDataset() already reads metadata.num_rows across every local Parquet file and reserves HELD_OUT = min(16, floor(total/5)); on the prior 10k/one-file installation it had 9984 training rows and 16 held-out, not 1.2M examples.
New non-training-changing module v17/transcend/torus-aether/devour/dataset-progress.mjs computes exact expected training row count per worker share and counts ONLY exercises the original Brain has actually committed. It exposes processed, total training, remaining, percentage, all dataset rows, reserved held-out count, and file count.
For a 10k local subset with two examples processed, the correct progress is approximately 0.02%, not 2/1.2M and not ~100 distinct symbol nodes. With all official data downloaded, the denominator is the actual total reported by parquetMetadataAsync, not a hardcoded 1.2M.
Multiple arms that share a corpus shard are not double-counted in the global summary. The live source still streams each available training row once per assigned share; held-out rows remain excluded.

## What changed
- devour.mjs source records actual dataset metadata from the same openTextDataset() object already used to feed native workers; /graph, /graphs, /state include progress; console lines include the same actual progress.
- magic.html/magic.js retain all previous controls, paths, visual layers, numerical tests and add committed exercises, percentage, progress bar, remaining, full dataset rows, file count, reserved heldouts.
- index.html/app.js original old 5D UI remains unchanged except new live dataset progress indicators, and the old 'symbols absorbed' label is corrected to 'distinct alphabet symbols'.
- Real worker Brain, CUDA device, original learning, randomness, graph algorithms, saved checkpoint format remain intact. No fabricated progress.
- The new v17/INSTALL_FULL_AND_TRAIN.ps1 downloads every currently published data/*.parquet shard for open-thoughts/OpenThoughts3-1.2M using official huggingface_hub, checks the authoritative list, then verifies with the REAL native openTextDataset() loader and refuses <1,000,000 observed examples. It starts existing CUDA V17 with text+maze+transform and GpuWorlds=16 on a 4GB RTX3050Ti.

## Safe full installation from an empty local dataset/repo
Run in Windows PowerShell (Git, Node.js 20+ and Python installed):

    $repo = 'https://github.com/dan3s2020/MagicPerspective.git'
    $branch = 'feature/V17-REAL-DATASET-PROGRESS-FULL-INSTALL-20261107'
    $dest = 'D:\MagicPerspective-Full'
    if (Test-Path -LiteralPath $dest) { throw 'Folder exists; do not overwrite it.' }
    git clone --single-branch --branch $branch $repo $dest
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\INSTALL_FULL_AND_TRAIN.ps1" -Data 'D:\training\OpenThoughts3-1.2M' -Out 'D:\MagicPerspective-Full-Training' -Port 8894 -Gpu cuda:0 -GpuWorlds 16 -Vram 2.6 -Mem 3 -GpuTextBatch 2 -GpuTextChunk 128 -Every 50000

UI http://127.0.0.1:8894/transcend/torus-aether/ui/magic.html?live=1
Original UI http://127.0.0.1:8894/transcend/torus-aether/ui/index.html?live=1
Keep the console open for an uninterrupted run; close safely with Ctrl+C; rerun the identical command to resume. Never use UI Reset if wanting to resume.

The dataset download may involve roughly 120 Parquet shards and tens of gigabytes. The installer checks current remote file count at run time, rather than accepting a single small shard. Downloaded data can be reused; no files are silently deleted.

## Acceptance and caveats
Unit tests check a 10k metadata source (9984 train/16 heldout), hypothetical full 1.2M metadata, shard balancing, multiple arms without duplicated totals, text fixture with dynamic holdout reserve, unknown-count suppression.
Native V17 live tests check /graph and /graphs, actual browser Magic and original UI controls and real text processing.
A separate PyArrow-generated ACTUAL two-file Parquet dataset is used to verify exact parquetMetadataAsync row counting and real trainer progress. On a small 40-row Parquet fixture the ORIGINAL native rule reserves floor(40/5)=8 heldout, leaving 32 train; a mistaken initial test expectation of fixed 16 heldout was corrected without altering any production code.
Hosted Actions run Node on CPU; neither the full HuggingFace download nor a physical NVIDIA 3050Ti CUDA run occurs on hosted CI. The user must execute the installer to verify on their GPU and see real progress with full corpus.

**IMPORTANT:** These metrics prove actual corpus traversal and observed updates; they do not prove general-language maze navigation or autonomous discovery of arbitrary dimensions.
## Automated acceptance VERIFIED
Official GitHub Actions run: https://github.com/dan3s2020/MagicPerspective/actions/runs/42330924950
- All Node tests passed: 1 real 2-file Parquet worker-to-completion test + 6 progress unit tests + 2 real browser/native worker tests + 7 previous prequential math gate regressions = 16/16.
- Two original Python-generated Parquet files contained 40 actual rows; original dataset rule reserved 8 for test and the real V17 worker processed 32/32 training examples, reporting 100% and 3820 characters. Neither test examples nor unique alphabet nodes were incorrectly counted as consumed training.
- Windows runner successfully parsed the original START_MAGIC_REAL.ps1, START_V17.ps1 and new INSTALL_FULL_AND_TRAIN.ps1.
- Chromium real browser observed nonzero progress from native /graph; all original Magic controls remained present.
- A complete 1.2M external dataset download and the user's physical RTX 3050 Ti CUDA run were NOT exercised by CI and are pending local execution.

## Resume safety
The installer safely rechecks/uses previously downloaded official Parquet shards, and START_MAGIC_REAL.ps1 uses Resume=true for the same output. Reusing the same destination without deleting it is appropriate; however the sample clone command above contains a no-overwrite guard and is only for fresh clones. For repeated bootstrap, verify the checked-out branch and git pull --ff-only rather than cloning into an existing folder. Do NOT press Reset on the native UI if resuming.

## Real Windows installation failure and VERIFIED repair (2026-11-07)

Actual user installation: 120/120 official Parquet shards (28.2 GB) successfully downloaded, but launcher then failed BEFORE CUDA startup with SyntaxError: Unexpected identifier 'node'.
The previous PowerShell 5.1 installer transmitted a multi-line JS here-string to node -e; native Windows process argument handling removed JavaScript quote marks, turning a valid import into invalid text.

Repair in this SAME branch:
1. New v17/VERIFY_FULL_DATASET.mjs is executed as an actual Node source FILE, not -e.
2. The verifier validates the official Hugging Face manifest and exactly those 120 data/*.parquet files, checks metadata using the original V17 loader, and requires at least a million real rows.
3. The native trainer receives the official data/ directory, not its parent. This avoids double counting an old, duplicate root-level Parquet shard seen in the user's screenshot.
4. -SkipDownload reuses the 28.2 GB that already exists. It checks all metadata, with NO pip installation.
5. Future downloads install Hugging Face Hub in a dedicated .hf-dataset-download-venv, instead of modifying the user's Python installation inside Hermes. This prevents further conflicts with datasets, tokenizers and transformers. Already altered user packages are not silently changed.
6. -VerifyOnly validates the data and exits without starting CUDA or creating checkpoints.

Actual Windows CI acceptance: https://github.com/dan3s2020/MagicPerspective/actions/runs/42334285735
The Windows job generated 120 GENUINE Parquet files with 10,000 rows per file, plus one stray root-level duplicate, and ran the exact real installer with -SkipDownload -VerifyOnly.
Verified result: 120 Parquet shards, 1,200,000 rows, 1,199,984 training, 16 reserved for test; CUDA was not started in CI. Linux native corpus/UI regression also passed.

Windows resume after download (PowerShell):

    $dest = "D:\MagicPerspective-Full"
    $branch = "feature/V17-REAL-DATASET-PROGRESS-FULL-INSTALL-20261107"
    git -C $dest pull --ff-only origin $branch
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\INSTALL_FULL_AND_TRAIN.ps1" -SkipDownload -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Full-Training" -Port 8894 -Gpu "cuda:0" -GpuWorlds 16 -Vram 2.6 -Mem 3 -GpuTextBatch 2 -GpuTextChunk 128 -Every 50000

CUDA on the user's RTX3050 Ti is not part of Windows CI; the on-hardware outcome still requires observing the actual live worker logs.

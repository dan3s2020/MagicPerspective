# TinyStories Aether — independent real CUDA text learning + separate UI
Date: 2026-11-07. Research branch: feature/V17-CUDA-STREAMING-MEGABYTE-TEXT-20261107.

## What is built
A separate, real Python CUDA text learner and localhost UI which trains EXCLUSIVELY on local TinyStories-train.txt and assesses its frozen model EXCLUSIVELY on TinyStories-valid.txt. No OpenThoughts, maze or transform worlds. Original V17 Brain files/checkpoints and original UI untouched.

This experimental GPU learner models actual per-character conditional occurrence statistics for context sizes 1,2,3,4. Orders 3 and 4 use hashed 65536-sized indices, disclosed in UI. It is NOT the full native six-scale V17 AligningGraph, a transformer or an autonomously proven semantic language maze. PyTorch CUDA updates real context counts on the GPU; heldout accuracy represents exact next-character prediction, not story coherence.

The file reader streams the raw 1.92GB train text instead of materializing it in Node RAM, using actual end-of-story separators and durable byte offsets. Count-table model checkpoints are saved atomically and resume via monotone row indices, preventing duplicate updates after restart. Save/pause/test/start are real commands, and UI shows measured characters/s, stories/s, MB/s and data progress only after acknowledged Python training updates. The 128MiB count table is stored in an independent output directory.

## Official dataset
https://huggingface.co/datasets/roneneldan/TinyStories
https://huggingface.co/datasets/roneneldan/TinyStories/resolve/main/TinyStories-train.txt
https://huggingface.co/datasets/roneneldan/TinyStories/resolve/main/TinyStories-valid.txt

The original train is approximately 1.92GB and validation is approximately 19.4MB. On Windows, the launcher can download both files and resume a partially downloaded .part file with curl.exe, without touching OpenThoughts data.

## Windows PowerShell

Clone a second independent checkout:

    git clone --single-branch --branch feature/V17-CUDA-STREAMING-MEGABYTE-TEXT-20261107 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-TinyStories

Start and download official TinyStories if necessary:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-TinyStories\v17\START_TINYSTORIES.ps1" -Data "D:\training\TinyStories" -Out "D:\MagicPerspective-TinyStories-Run" -Port 8897 -Gpu cuda:0 -Download

Separate live UI:

    http://127.0.0.1:8897/

If TinyStories is already downloaded, omit -Download. Custom file paths are supported with -Train and -Valid.

The launcher automatically reuses the already installed GPU environment from D:\MagicPerspective-Magic-Live if present, so it does not necessarily reinstall 2.6GB PyTorch. It will throw instead of silently using CPU if real CUDA is unavailable.

To resume, use the SAME command. Checkpoint files:

    D:\MagicPerspective-TinyStories-Run\tinystories-fast-v1.npz
    D:\MagicPerspective-TinyStories-Run\tinystories-manifest.json

This directory is separate from all V17 native checkpoints.

## Test scope and claims

CI checks the same real Node/Python GPU protocol with NumPy parity mode, local TinyStories-formatted text, web API, 128MiB checkpoint/resume, frozen validation, actual browser, and Windows PowerShell syntax. CI does not provide RTX 3050 Ti hardware. Numeric performance like 100 stories/s or 1MB/s on the real 1.92GB file must be measured on the user's own GPU and cannot be promised before that benchmark.

Data is generated ONLY for deterministic CI test fixtures, never for the real training mode. Normal training refuses missing files instead of substituting synthetic stories.

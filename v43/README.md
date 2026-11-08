# MagicPerspective V43 — ONE organism / ONE universe

The authoritative source is the [exact USER archive](../verbatim/2026-11-08-QWEN-ONE-UNIVERSE-USER-VERBATIM-PARTIAL.md) and [root AGENTS.md](../AGENTS.md). One organism contains the original V42 text maze, Player 1's native paths and Player 2's constrained Qwen-brain puppet. Do not reinterpret the USER-defined target as the training exercise reference.

## Executable V43

The implementation is additive in [Braivour](https://github.com/dan3s2020/Braivour): [native-v43/fused-one-universe.mjs](https://github.com/dan3s2020/Braivour/blob/main/native-v43/fused-one-universe.mjs), [four-hook pinned V42 worker adapter](https://github.com/dan3s2020/Braivour/blob/main/braivour/v43_world_patch.py), [V43 live dashboard](https://github.com/dan3s2020/Braivour/blob/main/public/v43.html) and [original CUDA launcher](https://github.com/dan3s2020/Braivour/blob/main/START_BRAIVOUR_V43.ps1).

The original V42 Brain, Discoverer, ConstructedPathLearner, CUDA training, data stream and checkpoint serialization are preserved. In each original text exercise the SAME Brain: (1) predicts using its original text navigation before exposure; (2) navigates by moving a bounded part of a frozen Qwen-derived coordinate field; (3) freezes the actual donor movements but retains their observable trace; (4) uses original native V42 text-learning to explore the puppet-produced text and re-predict the same exercise without further Qwen movements. No new teacher/student model or substitute LLM is introduced.

The actual exercised Qwen donor remains a bounded 256-byte-state sampled coordinate atlas, up to 96 movement axes in 64 dimensions by default, not all 10 GB of Qwen's neural computation. No donor forward pass or universal knowledge transfer is claimed.

## Interface

V43 has ONE selectable Start Training mode, the new fused experience. It embeds the original live V42 universe graph with a Hide/Show button. Hiding the graph brings the live exercise data into view. It displays actual per-exercise native predictions before and after, recorded donor movement, exact score and correct/wrong characters, full input/reference/produced text, true speed, assigned original dataset percentage, charts and a paginated all-exercise journal. Every value comes from the running native worker, not a fake dashboard.

## Run on Windows

From an updated MagicPerspective checkout:
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective\v43\START_V43.ps1"

This runs an isolated original V42 checkout under D:\Braivour-V43-ORIGINAL; the existing MagicPerspective/Braivour working checkouts, prior checkpoints and native CUDA equations are not overwritten. The launcher's pinned-source checks refuse unknown changes.

The native worker starts paused; V43 Start Training is the single fused mode. Dashboard: http://127.0.0.1:8984/v43.html. Original universe view: http://127.0.0.1:8962. Native trainer API: http://127.0.0.1:8961.

## Testing and scope

V43 GitHub CI covers exact original V42 source restoration, real native Brain construction, donor-derived physical movement and recording using a **synthetic** donor-coordinate fixture, native checkpoint persistence, full-text journal pagination, JavaScript checks, and PowerShell syntax. This is not a verified training benchmark on the user's real Qwen GGUF or full OpenThoughts dataset. Measured gains must be displayed exactly as they occur, including zero or regression.

Historical full Verbatim source remains incomplete, and its existing gate remains BLOCKED.

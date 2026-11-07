# MagicPerspective V17: real CUDA text stream, dataset percentage, throughput and freeze diagnosis

Date: 2026-11-07. Branch: feature/V17-REAL-CUDA-TEXT-CHAR-STREAM-20261107.
Base branch: fix/V17-ACTUAL-TRAINING-START-AND-LIVE-OBSERVABILITY-20261107.

## User request and non-negotiable scope

Preserve original V17 UI entirely. Do not copy A9/A12 visuals. Show genuine consumed training characters with their genuine CUDA next-symbol predictions, exact percent of the source training partition already committed, exercises/sec, characters/sec, maze worlds/sec, transform worlds/sec and the specific processing stage where updates stop. No fake training, no skipped samples, no fabricated accuracy or answers.

## Root cause visible in the exact original source

After GPU processes a long real OpenThoughts row (~43,935 chars in the reported screenshot), the native worker performs a SECOND traversal of every character of the first row through Brain.live(y, old:true) for its original visual/CPU graph, then multi-scale language, constructed text paths, observed differences, causal word-action training and shared PyTorch training. The initial batch also triggers frozen text/maze/transform evaluations and checkpoint serialization. These all cost real time, even when CUDA is ready. The old UI lacked the actual character-to-prediction stream and a way to distinguish GPU calculation from CPU integration and checkpoint phases.

The user's old GPU maze VRAM figure of 0.0023 GB describes a maze batch, not the entire active CUDA text workload. 100% GPU slider is a requested target, not proof of measured 100% GPU utilization.

## Implemented changes, keeping native learner intact

- gpu/text_gpu.py: the exact guess tensor already used to compute true hits is forwarded for EVERY computed next-character position of EACH CUDA chunk, paired with actual ground truth, exact exercise index and character position. The first character of each exercise is input context, not a predicted character. Values are emitted before the current exercise is appended to TextCard memory. The model and correctness computation are unchanged.
- gpu/worlds_gpu.py: existing GPU command progress supports optional true sample data without introducing a parallel mock model.
- devour/worker.mjs: forwards actual GPU predictions separately, reports all expensive processing phases (alignment, imagination, index construction, original graph, language, constructed paths, observed transforms, shared model, evaluation, saving). The full original CPU graph still receives EVERY previously processed character; a setImmediate yield every 512 characters prevents starving the worker event loop and permits existing pause/save. Timing for CPU stages is reported with text GPU batch metadata. Full heavy graph snapshots are rate-limited during a busy CUDA text batch while the lightweight text stream remains frequent.
- devour/devour.mjs: original server exposes GET /text-stream?w=0&after=N, with a bounded latest-260-chunk in-memory buffer, sequence numbers and last worker phase. Existing /graphs includes true training row totals, committed exercise count/percentage, measured exercise/character/maze-world/transform-world rates and source/heldout split. Stale >15-second throughput is reported as zero rather than an old nonzero sample.
- ui/index.html and ui/app.js: NEW section inside the original live training tab; no previous UI button, canvas, tab or handler removed. Displays training percentage, processed/total exercises, measured per-second rates, phase since last heartbeat and true GPU-predicted versus observed characters, colored by correctness. Browser shows the recent chunks only; all computed positions are transmitted by the producer. A >25-second stale phase is a warning, not an invented deadlock diagnosis.
- START_NATIVE_V17_TRAINING_LIVE.ps1: configurable ReportEvery (default 200000 chars instead of fixed 60000) and GpuTextChunk default 128 instead of 64, both without skipping any training examples or turning off any learner. Reports/evaluations and saves are LESS frequent at 200k: deliberate checkpoint-risk vs overhead trade-off; first batch is still checked and saved. GPU throughput gain requires independent hardware measurement.

## Exact automated results from the repository CI

On the actual original TextCard math using its NumPy backend (not mocked), the 67 predicted positions were ALL streamed (67 of 67) and 14 were correctly predicted. This matched its own unmodified hit counter exactly. 32-, 64- and 128-position chunks yielded the same 14 correct and the same training trust and variants (after ordering-neutral comparison), proving this finite fixture retained model behavior and complete output coverage.

The original native V17 CPU HTTP worker was started and consumed 27 of 27 real text fixture paragraphs: dataset progress = 100%, with genuine original interface controls present and ZERO false CUDA-sample events on a CPU backend. Its original observability and other backend HTTP regression suites passed. Both Windows PowerShell launchers parsed successfully and rejected a missing dataset without a demo fallback.

Important caveat: CI has no RTX 3050 Ti CUDA GPU and did not benchmark the user’s full 780000-row OpenThoughts dataset. It proves code-path correctness on the original TextCard CPU/NumPy implementation, not actual 100% GPU card utilization or guaranteed speed on a laptop.

## Safe resumption of the actual existing saved brain

Known saved original runtime from the user log:
D:\MagicPerspective-V17-FRESH\v17\runtime-real-v17-20261107-051654

First click Save in the OLD V17 UI; verify PowerShell reports saved; then stop its server. NEVER copy while an existing process is writing brain checkpoint files.

Clone this isolated branch to a separate destination:
D:\MagicPerspective-V17-TEXT-LIVE

Copy the WHOLE old runtime directory (brains and all sidecars, not merely the .v8 file) into the new clone's v17 folder with a NEW runtime-* name. This does not mutate the original model save. Start the NEW clone's START_NATIVE_V17_TRAINING_LIVE.ps1 with -Resume, -RuntimeName pointing to the newly copied folder name, original -Data folder, -Gpu cuda:0, -Vram 2, -GpuTextChunk 128, -ReportEvery 200000 and local -Port 8872. Only after the old server is stopped.

Existing save/resume uses Brain.exercises from the actual checkpoint; no retraining from the beginning is faked or silently assumed.

Original UI address:
http://127.0.0.1:8872/transcend/torus-aether/ui/index.html?live=1

## Limitations requiring future research

1. This UI/workflow integration is NOT proof that all local-axis/gating/permutation/world-transformation research PRs are already connected to the native V17 next-character writer. The original Brain is preserved.
2. Genuine GPU next-character predictions are not independently verified correct semantic ANSWERS. Accuracy on heldout text and eventual goal paths must be tested separately.
3. Browser and server intentionally retain ONLY recent streamed chunks, not infinite prediction history. The corpus and brain training memory are not skipped or replaced. Full byte-for-byte archival of every prediction would require an explicitly provisioned bounded disk format.
4. A stale phase might indicate CPU blocking, GPU kernel slowdown or a true error; new timestamps expose which stage, not a guarantee it never stalls.
5. Higher CUDA text chunk (128) can help amortize overhead but may be slower on some hardware. Preserve original chunk setting as a user option for A/B throughput comparison. Never claim 100% GPU usage without measurement.

# V17: persistent CUDA-resident lookahead corpus ring (original Brain, real OpenThoughts)

Date: 2026-11-07. Isolated research branch: `experiment/V17-RESIDENT-CUDA-TEXT-LOOKAHEAD-RING-20261107` based on the already validated V17 full-atlas GPU hang fix. **Do not merge to main without user's RTX 3050 Ti throughput and semantic heldout acceptance.**

## User idea, separated into scientifically verifiable mechanisms

The user's proposal is a live resident GPU source-language world: prefill useful VRAM with future source exercises (not dummy allocation), keep a continuous bounded window and its learned transformations, remove each exercise only once it is successfully processed, backfill with more source rows, and let the organism explore transformations from future context. Real performance means **committed native text exercises per second and bytes per second**, not total VRAM occupied.

This branch implements **actual device storage, reuse, source-order FIFO and a separately labeled read-only transductive future-text probe**. It deliberately does NOT claim the original V17 native text predictor already uses all future tokens for autonomous solution planning; original blind heldout predictions are unchanged and any future-answer lookup is marked **transductive**. It does NOT pretend an unindexed uint8 cache is a complete high-dimensional transformation graph. The native TextCard suffix index still covers a smaller 8k–65k historical window and is rebuilt as batches commit: eliminating that index rebuild remains an unsolved performance task.

### Implemented without replacing original V17 components

1. `gpu/resident_text_pool.py` is a bounded, persistent, FIFO memory pool. It stores **real future training exercise bytes** on the selected physical CUDA device as torch uint8 tensors with immutable CPU originals for the original per-exercise SelfMem. It never allocates fake filler memory. It does not evict future examples to make room, even on OOM. An exercise is deleted only after original Brain confirms a learned batch. Pool state exposes true resident bytes/MB, number of pending exercises, high-water mark, committed count and original device.
2. `gpu/worlds_gpu.py` adds `text_pool_add`, `text_pool_probe`, `text_pool_status`, `text_pool_commit`. It executes the **SAME original** `TextCard.live` algorithm, trust, six variants and GPU suffix index; the `text_learn` request may now pass pre-uploaded source row IDs instead of retransmitting tens of thousands of JSON integers. The original context/suffix/trust behavior is retained, not replaced with a byte-frequency demo.
3. `devour/resident-cuda-queue.mjs` is an async bounded read-ahead queue for ONLY original TRAIN corpus rows. Startup warms with a small batch so it never waits to fill all requested VRAM before training begins. After the first actual committed native batch it refills when the queue drops below half of its configured capacity. It never omits, reorders, duplicates, or drops a source row; a row exceeding RPC budget is explicitly rejected. After a CUDA process restart the current uncommitted source rows are restaged; original Brain must still acknowledge once-only native learning.
4. `devour/brain.mjs` passes resident IDs into the original CUDA text learning request; merges genuine unchanged original learned results and increments committed counts only after the actual GPU call returns. `devour/worker.mjs` reuses those same ID references and **does not mark original Brain trust as learned from future bytes**. VRAM pool commit happens after native Brain has committed. Phase and source residency are visible in original `/health` and original UI.
5. On resume, `worker.mjs` now jumps **directly to the first uncommitted OpenThoughts Parquet row** based on `Brain.exercises` instead of decoding every previously learned row just to skip it. No change to original split or source order. This is especially important after a long previous run.
6. Exact raw future source context query `GET /gpu-future-path?w=0&context=...` and original additive V17 UI control in **ATLAS COMPLET**: true future exercise IDs, byte offsets and observed next-character counts. This data is **TRANSDUCTIVE and has already exposed future answers**; it is not a blind unseen result or a new native learned rule. The lookup **does not modify** original trust, weights, training or heldout scores.
7. The same original Brain remains queryable after a finite corpus completes; previously the worker exited immediately, causing frozen atlas exam requests on the visible UI to time out. Ctrl+C still closes the worker cleanly.
8. `START_V17.ps1` and `START_HYPERMAZE_REAL_CUDA.ps1` expose `-GpuPoolMB`, `-GpuPrefetchExercises`, `-GpuPrefetchBytes`. The GPU allocator clamps the source cache to **at most 25% of the actual selected PyTorch VRAM budget**, leaving compute/suffix index/headroom for the original Brain; the UI must show true bytes used, NOT a promise of 100% VRAM occupancy.
9. New `v17/tests/resident_cuda_real_device_selftest.py` runs on the actual specified CUDA device **before** long Parquet training: requires `torch.cuda.is_available()`, verifies physically allocated bytes on the actual GPU, verifies exact future-context probe, original TextCard learns only the CURRENT row and that no future row updates trust prematurely. If this fails, trainer refuses a fake CUDA or hidden CPU fallback. **The hardware test was NOT run in GitHub CPU-only CI**; it must run on user's own RTX device.

### Test evidence actually obtained in GitHub Actions

Latest verified commit: `0113fd58862cf1e9395bee67200534e5841985ce`. Two latest jobs **both SUCCESS**:

- Resident CPU parity job `128458911708`: 5/5 actual original V17 NumPy server `Server.handle` memory-pool tests, preserved actual original TextCard learning/trust/hit counters, FIFO, OOM atomicity and no future-answer contamination; 5/5 old/new original exact long-document context tests; 4/4 original Node read-ahead queue tests (13 source rows, nonduplicated commit, resume offset and GPU restart); 4/4 GPU stall watchdog tests; native Brain save/restore and full original corpus HTTP regression tests.
- Original Chromium test `128458911981`: 1/1 real original V17 page, 26,331 nonblank graph pixels, 1,536 gold predicted-path pixels, 2,194 blue executed-path pixels, all six original text-context pages, observed edit operator pages, strict-vs-evidence-gated text paths, original checkpoint graphs, frozen text and xD evaluation, **zero browser JS errors**.
- Tested original source `TORUS_AETHER_ABC_20261104.md`, not the user's entire 1.21m-example local OpenThoughts corpus. CPU parity is NOT proof of GPU throughput.
- No actual sustained RTX text-token/sec or MB/sec figure exists for this branch. It is also not proof of 100% correct unseen natural-language predictions.

### Correctness/safety bounds

- The original CPU SelfMem and trust merging remain on CPU; backing future bytes with actual torch.uint8 GPU storage does not by itself accelerate CPU suffix-automaton construction or convert original text navigation into a 100% GPU-native learned graph.
- Original Python `TextCard.append` still rebuilds its two bounded suffix-array indexes for the recent historical window after a committed batch, and future raw text has only a read-only auxiliary exact substring probe, not a general future graph operator. Large architectural acceleration requires an independently verified incremental index/ring geometry with exact original prediction parity; not yet implemented.
- 4 GB total VRAM must keep space for CUDA kernel scratch, display driver and history indexes. Occupying every byte with source cache can **reduce** speed or OOM. The pool uses actual source data only, never fake VRAM use.
- Frozen held-out rows remain withheld; future **TRAINING** answers may be in device memory and queried under an explicit transductive label, but never added to blind unseen statistics or native model weights before their training step.
- A source exercise larger than the configured single-RPC byte budget is rejected, NOT silently truncated or dropped. If the user's corpus has giant documents, increase the bounded per-call budget only after measuring VRAM/latency.
- No old checkpoint is assumed. Separate PowerShell clone/launch can always start a new `-Fresh` runtime without overwriting an existing installation. When an existing valid checkpoint is present in the same isolated directory, resume without Fresh.
- No change to main, the V17 original `Discoverer.shape`, or other branches/agents.

## Original user acceptance criteria still open

1. Real RTX 3050 Ti GPU benchmark for full OpenThoughts: physically-resident bytes in `/health`, real GPU progress, completed exercises/s and committed MB/s, no 180 s idle or 900 s hard timeout.
2. Compare **identical** examples and source settings with lookahead ON/OFF to quantify true end-to-end improvement rather than count prefetched characters as trained.
3. Implement an independently validated **incremental historical/future learned-index structure** if full-suffix-array rebuild remains the bottleneck; prove all original V17 context/trust/solution paths unchanged.
4. Learn cross-exercise meaningful transformations and compare held-out whole-answer exactness, true blind and separately declared transductive conditions. A cache alone is not proof of intelligence or a semantic labyrinth.

**Bottom line:** a concrete, falsifiable persistent VRAM training-source ring with strict once-only learned boundary now exists and passed original CPU/browser integration. Its real RTX speedup and broad language benefit have not yet been established.

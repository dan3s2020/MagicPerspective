# V17 FULL ATLAS — CUDA `text_learn` stalled after 180 seconds

**2026-11-07. Isolated fix branch:** `fix/V17-FULL-ATLAS-REAL-CUDA-TEXT-HANG-20261107`.
**User's screenshot:** `#0 winner eroare · GPU RPC idle timeout: text_learn (request #3, elapsed 180 s, last CUDA output: none)`; dashboard around 112.5k chars; source branch had actual native V17 Brain plus complete xD atlas UI. **Do not assume 112.5k characters are on disk:** only a successfully completed native `.v8` checkpoint contains recoverable committed training. Do not press Reset.

## Exact root-code defect found, proven without changing the algorithm

`v17/transcend/torus-aether/gpu/text_gpu.py` did this in **both** `TextCard.live` and `TextCard._imagine`:

```python
ctx[q, :L] = e[i - 1::-1][:L]
```

Python first copied the **entire length-i** reversed prefix, then retained only its last `L=min(i,64)` relevant history characters. Over a long real OpenThoughts answer, repetition across all positions performs unnecessary O(N²) prefix-copy work. This prior defect had already been identified and fixed in isolated V21/V32 studies but was still present, unchanged, in the separate original V17 **PR #74 complete atlas** code that the user's screenshot appears to show.

Changed **only the copy bounds**, retaining exact input order and all original causal/semantic/SelfMem/AligningGraph/Discoverer mechanisms:

```python
ctx[q, :L] = e[i - L:i][::-1] if L else []
```

The second occurrence, in `_imagine`, received the mathematically equivalent bounded slicing. If N is long but context depth K=64, a single preparation now copies at most K elements instead of up to N.

**Observed exact reference on Github Actions Python 3.12 / NumPy:** 190,000-character document, 271 near-end contexts: **0.10677 s → 0.000268 s (~398.56×)** for **this one CPU copy operation**, all 271 context sequences identical. Not 398× full PyTorch CUDA training. Another verification exhaustively compared every position and depths 1,2,7,8,32,48,64,128 across input lengths up to 4,096.

## Accurate stage telemetry and recovery diagnosis

Original `TextCard._selfidx` builds two full-document suffix automatons in Python before the first CUDA alignment chunk. During these CPU stages the old Python GPU child published no progress; Node watchdog only knew 180 seconds passed, and eventually closed the child. It is impossible from the screenshot alone to prove the exact instruction where the user's 180 seconds were spent; source audit confirms these are silent and expensive code paths.

- Emits **genuine scanned-position progress every 8,192** symbols for the original two SelfMem suffix automata, plus beginning/end, with no fabricated completed-char counts. SelfMem cache now belongs explicitly to each native `TextCard` instance.
- Emits real iteration counters for both original suffix-array builds in `TextCard.append`, without changing native index contents or trust.
- Emits genuine early `received-real-text-batch` and `preparing-real-text` progress, and native text-load index progress, through original JSON RPC `worlds_gpu.py`.
- Node `client.mjs` timeout now correctly reports last valid **stdout** progress phase/done/total and age, separately from Python **stderr**. Previous `last CUDA output: none` was misleading, as it inspected only stderr even if valid progress frames had been received on stdout.
- Existing 180 s idle and 900 s hard watchdog limits, one automatic retry of an **uncommitted** GPU batch, no CPU fallback, model checkpoint format, original multiworld and xD atlas UI are unchanged.
- Hardware-specific performance and true RTX fault cause remain unverified until the user's first actual NVIDIA post-fix run.

## Tests actually run

GitHub CI on this exact isolated branch (CPU runners, not NVIDIA):

1. **5/5 new Python reference tests**: every old/new context identical, long 190k copy, original SelfMem automaton exactly identical across 27k-character real sequences, 9 actual progress packets, original suffix arrays identical, per-Brain memory isolation and original native TextCard trust/prediction/variant totals identical after learning.
2. Previous **5/5 exact prefix alignment tests** and original **3/3 six trust variant** tests remain green.
3. Original native xD transfer, persisted Brain checkpoint, 0→64/64 witnessed missing-text-bridge axes, full actual native corpus HTTP worker acceptance all green.
4. Existing watchdog tests **4/4** pass, including silent failed process, periodic progress, genuine hard timeout and no CPU fallback; new assertions check honest progress versus stderr error message.
5. Real Chromium original V17 atlas integration **1/1**, native text/xD panels, frozen tests, preserved original graphs, nonblank actual maze paths, zero JavaScript errors.

**DO NOT OVERCLAIM:** these are correctness and CPU bottleneck tests, NOT proof of sustained 100+ real full exercises/s, full OpenThoughts answer correctness, or actual RTX CUDA MB/s. The original repo STOPSHIP semantic navigation regression remains OPEN. Do not merge this performance-only repair into main or modify the original `Discoverer.shape`.

## Additional repo discoveries checked, NOT indiscriminately merged

- V21/V32 documented precisely the same old O(N²) slice bug, with evidence and progress. The V32 branch also experiments with VRAM auto-chunking and large native CUDA batches, but is **not equivalent** to the fast exact suffix index and six-variant implementation in PR #74; merging it wholesale would overwrite tested original methods.
- V24 original character-level learned rules recover controlled `mat→mot→mut` trajectories using independently observed examples, but 0/2 heldout complete natural answers despite high positional character similarity in a repetitive fixture.
- V33 historical original V17 first-shot on 20 independent authentic OpenThoughts questions: character positional overlap after an 8-character training-only template rose from 12.9583% to 15.6667% under a *research-only* shared-context-key gate; still **0/20 complete exact answers**. Do not mistake these tests for semantic answer navigation.
- Original `AGENTS.md` and `docs/INCIDENT_TINYSTORIES_UNAUTHORIZED_MOTOR_REPLACEMENT_20261107.md` explicitly forbid replacing the requested original hypermaze mechanism with next-byte count tables or unrelated ML components. No such replacement was made here.

## Safe isolated Windows restart (example checkpoint location, verify your own)

Only stop the **old frozen V17** console with Ctrl+C, and only after checking the most recent checkpoint path. Do not kill unrelated agents, overwrite branches, remove old runtimes, or press Reset. This code action cannot restart the user's Windows Python process remotely.

```powershell
$Repo = "D:\MagicPerspective-FULL-ATLAS-HANGFIX"
$OldOut = "D:\MagicPerspective-FULL-ATLAS\v17\runtime-hypermaze-real"
if (Test-Path -LiteralPath $Repo) { throw "New destination exists; refuse overwrite: $Repo" }
if (-not (Test-Path -LiteralPath (Join-Path $OldOut "brains\brain-0-winner.v8") -PathType Leaf)) {
  throw "Original checkpoint missing at $OldOut. Set OldOut to ACTUAL saved training output; do not start from empty weights."
}
git clone --single-branch --branch fix/V17-FULL-ATLAS-REAL-CUDA-TEXT-HANG-20261107 https://github.com/dan3s2020/MagicPerspective.git $Repo
if ($LASTEXITCODE -ne 0) { throw "Git clone failed" }
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$Repo\v17\START_HYPERMAZE_REAL_CUDA.ps1" -ResumeFrom $OldOut -Port 8883 -Gpu "cuda:0" -GpuTextBatch 1 -GpuTextChunk 64
```

The conservative one-document/64-position test profile reduces the size of the first complete batch while preserving all samples and original algorithms; after confirming real progress, optional batching can be increased without changing code. `-ResumeFrom` copies the original `brains` directory to this new isolated checkout's runtime and explicitly rejects existing targets. The server will reject an occupied port. Existing CUDA preflight still refuses to train if the actual NVIDIA native text check fails.

Original unchanged UI with real progress and whole atlas:

```
http://127.0.0.1:8883/transcend/torus-aether/ui/index.html?live=1
```

Independent native throughput observation:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-FULL-ATLAS-HANGFIX\v17\WATCH_TRAINING_THROUGHPUT.ps1" -Port 8883 -Worker 0 -Samples 12 -EverySeconds 5
```

Report the native `/health?w=0` GPU progress phases and real throughput. If it still fails, the new timeout message records the **last successful real phase and exact progress**, identifying whether more work must be done in SelfMem indexing, CUDA alignment, imagination, VRAM, or Python IPC.

**Known limit:** no live RTX3050Ti has been connected in this tool environment; no on-device user training was started. Source-level defect is fixed and CI-tested; the specific reported host hang is not certified solved until the user's local GPU reports completed real batches.

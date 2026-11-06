# V18 original maze law + observed successor channel (isolated branch, 2026-11-06)

**Branch:** `experiment/V18-SUCCESSOR-TIEBREAK-INTEGRATED-20261106`
**Parent:** V18 maze-language isolated branch, commit `65b2715e6b5d85f6fe60e447f7c36117ec5a4a39`.
**User directive:** implement tested successor tie-break without replacing the original organism, existing V17/18 UI, CUDA trainers, learned worlds, checkpoints, or other agent branches.
**State:** integrated and regression tested in GitHub Actions; not a proof of superior open-ended natural-language reasoning.

## Actual in-training integration — not only a new UI tab

The original complaint was valid: the initial implementation computed successor
values at evaluation time and merely used them to break identical V17 attraction
ties. That was **not online training**.

This commit series adds a **real, separate learned TD state** to the existing
V18 language-world training channel:

- `v17/transcend/torus-aether/language-maze/successor-online.mjs`:
  an online four-scale (1, 64, 4096 and 262144 character) reverse
  temporal-difference learner. Each completed genuine training answer emits
  observed transitions ending in an observed training terminal. Values are
  corrected with learning rate `alpha=.22` and temporal discount `gamma=.985`,
  with a bound of 120000 stored states. Data comes only from actual
  completed Q/A rows. Not an LLM and not complex quantum interference.
- `language-maze/observe-committed.mjs`:
  the single tested commit boundary for every completed training row.
- `devour/worker.mjs`:
  original V17 CUDA still receives its existing batches;
  the new language-world/TD learner receives **every completed GPU Q/A row**,
  not the subset of `meta` processed by the prior causal-text tools.
  The prior causal-text sampling and all V17 `Brain` operations are unchanged.
  CPU rows and very long GPU rows train once upon complete row commit.
  The original `.v8` checkpoint remains unchanged.
- `language-maze/language-world.mjs`:
  learning happens in `learn()`, not `plan()`. A new optional
  `successorOnline` field is serialized in the same independent V18
  `.language-maze.v18.json` checkpoint. Older V18 saves restore without
  that field, beginning TD training from subsequent new rows.
  The original V17 attraction field still decides every non-tied route.
  When an exactly-tied alternative exists, the new stored TD values may
  now break the tie; untrained states retain the earlier empirical fallback.
- The dedicated `Puzzle · Successor / rezultate` UI tab now displays:
  real TD training rows, characters, updates, states, evictions, temporal
  error and updates at all four scales. It plots real progress across backend
  telemetry updates, and distinguishes learned/empirical successor values
  from V17's unchanged attraction field.
- Tests: actual completed-row ingestion of 37 separate Q/A observations;
  exact-once learning; TD numerical values; new/legacy checkpoint restores;
  frozen evaluation nonmutation; path law parity; four learning scales on a
  262145-character completed answer; native V17 HTTP/UI/Windows regressions.

**Limits:** The learner optimizes discounted future contact with observed
answer terminals; it still does not discover the semantic truth of unknown
questions, train the original neural V17 weights on TD, replace the
`Discoverer.shape()` method, or execute its own TD updates on CUDA.
Its node values and training error do **not** measure understanding. A
testable language improvement still requires a positive frozen held-out delta
against the original mode and controls.

To see the actual in-training mechanism, open
`http://127.0.0.1:8893/transcend/torus-aether/ui/index.html?live=1#successor`.
The section `Successor TD · ÎNVĂȚARE REALĂ` should increase without pressing
`Propagă` as new Q/A rows finish. If using an older checkpoint, the old V17
character totals remain, but TD starts at zero until new rows finish.
`scTdUpdates` advancing while `scChars` advances is the direct instrumented
evidence of in-training updates. The main V17 metric 52.5% in the screenshot
was a distinct alignment statistic and is not a successor metric.

## Exactly what changed

- NEW `language-maze/successor-field.mjs`: classical discounted future terminal occupancy calculated over previously OBSERVED training Q/A graph transitions, weighted by empirical completed-record support; reverse DAG evaluation or bounded cyclic fixed-point iteration.
- `language-maze/shape-topology.mjs`: original .97 * conduct * max-neighbor attraction equation unchanged. The baseline default receives NO secondary field. If supplied, successor can choose ONLY between edges with **exactly equal** original attraction and strictly uphill destination values. The original 2D `worlds/exercise.mjs` is not edited.
- `language-maze/language-world.mjs`: keeps true observed support on prefix edges and evidence-weighted known-terminal rewards. Selectable `mode:"original"` or `mode:"hybrid"`, same original path policy, shared local/global tie behavior and explanatory successor diagnostics. The complete long-corridor V18 hierarchy remains unchanged.
- Original live `devour` worker/server: accepts the mode at `POST /language-maze/plan`, so the same Q/A corpus-trained V17 brain drives both arms; no held-out answer is passed in.
- New `POST /language-maze/compare?w=0&count=8`: saves the real language sidecar, freezes it, reads the repository's existing Parquet held-out Q/A rows in the parent evaluator only, runs the two planners with identical checkpoints/prompts, computes exact answers and character accuracy, and verifies no memory mutation. It returns a clear error for plain TXT input, which does not supply Q/A observations to the original language-maze learner.
- Existing V17/V18 page: adds original vs hybrid selection, a button for held-out accuracy and successor diagnostics. A V18 canvas regression (`onRoute` undefined) is fixed. All other training/replay/save/pause/eval/CUDA/torus controls remain in place.
- NEW `v17/START_SUCCESSOR_V18.ps1`: isolated startup, port 8893, runtime `runtime-maze-language-v18-successor` inside this checkout, no existing checkpoint overwritten.
- NEW test suite and separate branch-specific GitHub Actions workflow, including native live HTTP tests, existing V18 long hierarchy, V17 2D parity and Windows PowerShell syntax.

## Exact accepted formulae

Original field, not replaced:
```
V[i] = max(V[i], 0.97 * conduct(kind[i]) * max_neighbor V[j])
```

Auxiliary learned-world successor-style occupancy for observed terminal rewards:
```
S[i] = gamma * sum_edge((observedSupport(edge)/totalSupport(i)) * S[to])
S[knownTerminal] = observed terminal training evidence; gamma = 0.9
```

The hybrid uses `S` only to rank *exact* `V` ties. **Neither `S` nor the reward are oracles for the correct answer**. On text prefix graphs with no observed unsuccessful branches, a successor field often adds no benefit. New language semantics are NOT learned merely by this feature. Graph geometries remain representations of real observed paths, not established physical 4D coordinates or coherent quantum computation.

## Launch on Windows D:

```powershell
$ErrorActionPreference = "Stop"
$branch = "experiment/V18-SUCCESSOR-TIEBREAK-INTEGRATED-20261106"
$dest = "D:\MagicPerspective-V18-Successor"
$url = "https://github.com/dan3s2020/MagicPerspective.git"
if (-not (Test-Path -LiteralPath $dest)) {
  git clone --single-branch --branch $branch $url $dest
  if ($LASTEXITCODE -ne 0) { throw "Git clone failed" }
}
if (-not (Test-Path -LiteralPath "$dest\.git")) { throw "Existing destination is not Git; refusing overwrite" }
if ((git -C $dest branch --show-current).Trim() -ne $branch) { throw "Wrong branch; refusing overwrite" }
if (@(git -C $dest status --porcelain).Count) { throw "Local modifications detected; commit/stash them first" }
git -C $dest pull --ff-only origin $branch
if ($LASTEXITCODE -ne 0) { throw "Git pull failed" }
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_SUCCESSOR_V18.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Gpu "cuda:0"
```

Open `http://127.0.0.1:8893/transcend/torus-aether/ui/index.html?live=1#successor`; select **Puzzle · Successor / rezultate**. The original **Limbaj · labirintul caracterelor** tab is still available.

GPU prerequisites: original V18 launcher requires **existing verified CUDA PyTorch** and checks a real GPU tensor operation. It will *not* silently fall back to CPU when CUDA fails. You may set `$env:OCTOPUS_PY` to a verified CUDA Python executable or pass `-PythonExe`. The Node.js original V17 graph and language-memory code remain CPU-bound; this branch does NOT falsely claim 100% of training/brain computation on GPU. CPU run is explicitly `-Gpu off`.

## How to falsify the improvement

1. Train on actual Parquet Q/A (OpenThoughts). Check `Rânduri Q/A observate` > 0 in the original live UI.
2. Ask the same prompt under original and hybrid; inspect actual global values and successor tie count. If tie count is zero, **no action-policy change occurred**.
3. Click `Evaluează 8 Q/A nevăzute`. Read actual `exactDelta`, `characterDelta` and per-question errors. Zero/negative deltas are legitimate failure/null evidence.
4. Perform stronger independent held-out experiments before claiming transfer or semantics. No hidden target answer is permitted inside the shape-construction API; the 16 existing Parquet held-out rows are a limited evaluation, not sufficient for a strong publication claim.
5. Never conflate Q/A retrieval, a known response path, or a solved synthetic transformation exercise with general text comprehension or quantum hardware advantage.

**No other branch, user checkout, or previously saved V17 brain is modified.**

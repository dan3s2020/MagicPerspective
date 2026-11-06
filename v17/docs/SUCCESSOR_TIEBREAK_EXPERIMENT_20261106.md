# V18 original maze law + observed successor channel (isolated branch, 2026-11-06)

**Branch:** `experiment/V18-SUCCESSOR-TIEBREAK-INTEGRATED-20261106`
**Parent:** V18 maze-language isolated branch, commit `65b2715e6b5d85f6fe60e447f7c36117ec5a4a39`.
**User directive:** implement tested successor tie-break without replacing the original organism, existing V17/18 UI, CUDA trainers, learned worlds, checkpoints, or other agent branches.
**State:** integrated and regression tested in GitHub Actions; not a proof of superior open-ended natural-language reasoning.

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

Open `http://127.0.0.1:8893/transcend/torus-aether/ui/index.html?live=1`; select **Limbaj · labirintul caracterelor**.

GPU prerequisites: original V18 launcher requires **existing verified CUDA PyTorch** and checks a real GPU tensor operation. It will *not* silently fall back to CPU when CUDA fails. You may set `$env:OCTOPUS_PY` to a verified CUDA Python executable or pass `-PythonExe`. The Node.js original V17 graph and language-memory code remain CPU-bound; this branch does NOT falsely claim 100% of training/brain computation on GPU. CPU run is explicitly `-Gpu off`.

## How to falsify the improvement

1. Train on actual Parquet Q/A (OpenThoughts). Check `Rânduri Q/A observate` > 0 in the original live UI.
2. Ask the same prompt under original and hybrid; inspect actual global values and successor tie count. If tie count is zero, **no action-policy change occurred**.
3. Click `Evaluează 8 Q/A nevăzute`. Read actual `exactDelta`, `characterDelta` and per-question errors. Zero/negative deltas are legitimate failure/null evidence.
4. Perform stronger independent held-out experiments before claiming transfer or semantics. No hidden target answer is permitted inside the shape-construction API; the 16 existing Parquet held-out rows are a limited evaluation, not sufficient for a strong publication claim.
5. Never conflate Q/A retrieval, a known response path, or a solved synthetic transformation exercise with general text comprehension or quantum hardware advantage.

**No other branch, user checkout, or previously saved V17 brain is modified.**

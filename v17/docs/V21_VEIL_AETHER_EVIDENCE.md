# MagicPerspective V21 — Aether / Veil research implementation (2026-11-07)

**Branch:** `experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107`  
**Unmodified base commit:** V20 `b6a5d3aba4784fe7643509f03906ec4bb1752199`.  
**Research status:** native, additive experimental implementation; **NOT** demonstrated natural-language semantic planning, 4D/6D physical cognition, an all-GPU model, or closure of canonical blocking issue [#25](https://github.com/dan3s2020/MagicPerspective/issues/25).  
**Authorization and scope:** [current-chat literal excerpts](../../user-intent/2026-11-07-current-chat-authorization.md) and [frozen change contract](../../user-intent/changes/V21-AETHER-VEIL-20261107.json). Do not overwrite other agents' versions or replace the original `Discoverer.shape()`.

## Measured mechanism: observations first, NOT invented semantic states

Original V20 `TextHypermaze` remains unchanged in its external behavior. It now owns a versioned `veil` object inside the **same original V17 Brain checkpoint**. V21 adds a second graph whose reusable states are **consecutive contextual symbol pairs** `[t_(i-1),t_i]`, not separately allocated occurrences and not a semantically invented target representation. Edges are added **only** when consecutive pairs were actually seen in the original text corpus. The original V20 unique-word graph stays available as a baseline and in the original UI.

A frozen known-goal V21 plan takes a start pair and a visible goal pair and propagates:

`V(goal)=1; V(s)=0.97*max_{(s,t) in actual_observed_edges} V(t)`.

This is the **same mathematical recurrence** as V17's goal-attraction mechanism for unit conductance, generalized to a directed graph of actually observed contextual transitions. Reverse BFS yields `V(s)=0.97^shortest_distance(s,goal)`. It is **NOT a direct invocation of the original `Discoverer.shape()`**, which remains unmodified. The regression therefore remains OPEN.

Before a new training document is ingested, V21 scores its expected next-symbol transitions against the previously learned graph, freezes the complete known-goal path if available, and logs per-step actual observed symbol, predicted next symbol, empirical alternatives and surprise. Subsequent replay frames use the **same prior frozen field** to show possible repaired paths from the actual cursor states. None of the current document's transitions can enter the graph until after this scoring phase. The document's last pair is revealed as a **known goal**, exactly as the original maze reveals a target; therefore route reachability is **not** independent free-answer generation.

The same checkpointed V21 module also records actual old-Brain `SharedObserver` events from maze/transform/text/code as action/effect counts, without making up cross-domain text edges. The original Brain still controls those worlds. It has NOT learned a common semantic law across them, and the contextual graph does NOT independently control the native maze policy.

A contextual memory axis is shown useful if the same current token has **different observed futures** under different previous-token contexts. This evidence is a measured distinction between one-token and two-token states, **not** autonomous discovery of six physics dimensions or continuous transport frames. No spatial or temporal labels are inferred to be physical axes.

## Files and preservation

- `v17/transcend/torus-aether/worlds/veil-aether.mjs`: learned contextual states/edges, empirical futures, no-leak wavefront, real cross-world action ledger, serialization.
- `v17/transcend/torus-aether/worlds/text-hypermaze.mjs`: added V21 observation / snapshot / persistence only; existing V20 methods and word navigation retained.
- `v17/transcend/torus-aether/devour/worker.mjs`: native SharedObserver integration, read-only V21 plan command.
- `v17/transcend/torus-aether/devour/devour.mjs`: frozen `POST /veil-plan` endpoint, using the existing HTTP and worker/checkpoint fallback pattern.
- `v17/transcend/torus-aether/ui/index.html`: append `veilBox` to the original V17 page; no original button, tab, canvas or script removed.
- `v17/transcend/torus-aether/ui/veil-aether-live.js`: live observed-context graph; gold preaction route, purple updated shape, blue actual path; real counts, probabilities, surprise, step controls, frozen planner.
- `v17/START_V21_AETHER_VEIL.ps1`: separate Windows launcher. Own port `8866`; own checkpoint folder `v17/runtime-v21-aether-veil`.
- `v17/tests/veil-aether.test.mjs`: context ablation, stochastic successor evidence, no future leakage, bounded growth, frozen math, V20 checkpoint compatibility.
- `v17/tests/veil-aether.http.test.mjs`: real native multiworld process and UI+HTTP+checkpoint regression.
- `.github/workflows/v21-veil-aether.yml`: tests both new mechanisms and old V20/V19 suites on GitHub Actions.

**No V17 maze source, original training objective, old UI control or any prior checkpoint is overwritten.**

## Windows PowerShell — an isolated new checkout on D:

```powershell
$ErrorActionPreference = "Stop"
$repo = "https://github.com/dan3s2020/MagicPerspective.git"
$branch = "experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107"
$dest = "D:\MagicPerspective-V21-Aether-Veil"
if (Test-Path -LiteralPath $dest) { throw "Destination already exists: $dest (not overwriting)" }
git clone --single-branch --branch $branch $repo $dest
if ($LASTEXITCODE -ne 0) { throw "Git clone failed" }

# The real OpenThoughts partition must already exist at this path:
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_V21_AETHER_VEIL.ps1" -Data "D:\training\OpenThoughts3-1.2M"
```

Native UI: `http://127.0.0.1:8866/transcend/torus-aether/ui/index.html?live=1`. The V20 and V21 observatories run inside the **same original UI page**, alongside original V17 graph controls and other panels. V21 frames are sampled on documents 1–4 and every 20th trained document, but online predictions are scored before **every eligible document**. Sampled replay is not the full unabridged original corpus.

To resume the **same isolated save** after a clean stop: use the same launcher and pass `-Resume`; do not re-clone into an existing destination. The new contextual graph's operations use **Node CPU**. Passing `-Gpu cuda:0` enables the original V17 CUDA route for other compatible worlds, but does **not** make V21's graph or every Brain operation run on CUDA. No independent execution on the owner's RTX 3050 Ti is claimed.

Optional tests:
```powershell
cd D:\MagicPerspective-V21-Aether-Veil
node --test v17/tests/veil-aether.test.mjs
node --test v17/tests/veil-aether.http.test.mjs
node --test v17/tests/torus-text-hypermaze.test.mjs
```

## Evidence, constraints, and next falsification

CI on branch uses an isolated synthetic TXT fixture and the original Node worker, real HTTP endpoint, real checkpoint, plus existing V19/V20 tests. Passing CI proves that those particular native pathways work on the test runner. It does **NOT** prove a result on the user's local OpenThoughts data, zero-shot goal planning, natural-language understanding, automatic general-dimensional perception, optimal stochastic actions or NVIDIA full-device utilization.

Remaining gates before merging or declaring the Magic Device complete:

1. Integrate the *original function*, not merely the same recurrence, into a learned language-world action interface and verify held-out semantic goal criteria. Canonical issue #25 remains OPEN.
2. Learn actual sentence-state action effects and goal checks, not just token succession. The V19 cognitive map is preserved, not silently advertised as part of V21's new text-graph predictor.
3. Transfer the tested V17 global→egocentric perspective algorithm and local-axis/holonomy discoveries into a single trainable world model, with real paired causal controls.
4. Record objective independent problem success, not only token prediction or observed-graph reachability; also compare with V20 unique-word and native V17 frozen models.
5. Profile GPU/CPU split and verify locally on Windows with the actual corpus; move GPU-compatible math only after equivalence tests, preserving the baseline.
6. Preserve true source-to-change traceability and confirm user approval before resolving regression or merging to `main`.

This branch is **a working research stage, not a declaration that the full conceptual architecture has been completed.**

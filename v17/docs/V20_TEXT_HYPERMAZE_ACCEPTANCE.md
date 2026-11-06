# MagicPerspective V20 — Observed Text Hypermaze (native, isolated)

This branch starts from V19. **It does not replace the original V17 trainer, V19 cognitive engine, NestView, or existing launch scripts.**

## Scope

The dedicated `hypertext` world ingests actual TXT paragraphs or original Parquet Q/A rows as a stream. It does not start other worlds, text next-byte LLM training, or V19 cognitive-map induction. A word or punctuation symbol is one reusable graph node regardless of its occurrence count. Every directed edge is a successor transformation actually observed in corpus text, and its frequency is learned. Unobserved transitions are **unknown** (not asserted to be semantically wrong).

Graph budgets are explicit: 12,000 distinct symbol nodes, 120,000 distinct directed transitions by default. Every source document is read, but new types exceeding a budget are omitted from the active index and counted in the UI. This is NOT a claim to retain every distinct word of an unlimited dataset in RAM.

## Mathematics — what is actually proven

For a fixed learned graph `G=(S,E)` and a **known** goal symbol `g`, initialize `V(g)=1`, `V(s)=0` where no path to the goal exists, and elsewhere solve

`V(s) = 0.97 · max_{(s,t)∈E} V(t)`

(the original V17 attraction equation with unit conductance for observed traversable edges).

For an unweighted directed graph, if `d(s,g)` is the shortest distance, `V(s)=0.97^d(s,g)`. Proof: `d(s,g)=1+min_{s→t}d(t,g)`, and because `0.97<1`, `0.97^{min d}=max 0.97^d`. Reverse BFS computes that fixed point. The code checks maximum Bellman residual, strict monotonic increase on every chosen hop, and equality of path length and graph distance. This proves **shortest known-goal navigation on observed token transitions**, not semantic truth, not free-form writing and not discovery of arbitrary new language physics.

## Live evidence

The native V17 page retains every old control and adds a dedicated Text Hypermaze V20 panel:
- measured 5-feature projection of observed unique token nodes and their actual transitions (not claimed to be intrinsic manifold dimensionality);
- GOLD full initial route predicted before the current document's intermediate symbols are ingested;
- BLUE local cursor path from the actual observed text; frame-by-frame animation, stepping, pause and scrub;
- online next-symbol accuracy and coverage measured before each document is absorbed;
- original unigram baseline, budget exhaustion counters, corpus document/token/edge counts;
- frozen interactive known-goal planning, math residual, shortest path, strict-uphill proof;
- original **held-out** text evaluation from the repository's data split, frozen without corpus mutation.

The route trace is sampled at documents 1–4 and every 20th document to avoid calculating a full graph field after each single paragraph. Online prediction and every corpus transition continue to be processed for every eligible training document. Final snapshots are always emitted even if training ends between samples.

## Windows — new directory only

In PowerShell:

```powershell
$ErrorActionPreference = "Stop"
$branch = "experiment/V20-OBSERVED-TEXT-HYPERMAZE-LIVE-20261107"
$repo = "https://github.com/dan3s2020/MagicPerspective.git"
$dest = "D:\MagicPerspective-V20-Text"
if (Test-Path -LiteralPath $dest) { throw "Destination exists. No overwrite: $dest" }
git clone --single-branch --branch $branch $repo $dest
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_V20_TEXT_HYPERMAZE.ps1" -Data "D:\training\OpenThoughts3-1.2M"
```

Alternatively, pass `-Text "D:\my-corpus.txt"` for a TXT file. The isolated UI opens on:

`http://127.0.0.1:8864/transcend/torus-aether/ui/index.html?live=1`

The new launcher stores checkpoints in `v17/runtime-v20-text-hypermaze`, distinct from existing V17/V19 runs. Pass `-Resume` to continue those saves. The `-Text` input is read in full but the first held-out paragraphs selected by the existing loader are excluded from training and reserved for frozen evaluation.

## GPU and limitations

The new sparse, symbolic text graph uses the native **Node.js CPU** engine, not CUDA. The UI refuses to claim CUDA for a hypertext-only world. This branch does **not** fulfill an all-CUDA execution requirement. The separately preserved V17 CUDA paths remain available, but using them is not the same as putting this graph computation on CUDA.

A unique-word transition graph does not distinguish all linguistic contexts (e.g. reversed word order or nuanced meaning), and finding a route between known words does not produce a correct unseen answer. Five graph statistics used for layout do not establish an intrinsic 5-dimensional language space. The code reports what it can actually measure rather than claiming 100% general language solving.

## Tests

```powershell
cd D:\MagicPerspective-V20-Text
node --test v17/tests/torus-text-hypermaze.test.mjs
node --test v17/tests/torus-cognitive-learned-map.test.mjs
node --test v17/tests/torus-world-source-regression.test.mjs
node --test v17/tests/torus-v19-cognitive-runtime.test.mjs
```

CI: `.github/workflows/v20-observed-text-hypermaze.yml` runs actual native worker tests, HTTP UI/route/split evaluation, mathematical invariants, checkpoints, and original V19 regressions. Device-level validation on the user's own Windows installation is not performed by Linux CI.

# Phase 2 — Graph #0 frozen V17: isolate fself and compare fixed-length generation

## Real-checkpoint Phase 1 results received 2026-11-07

Original branch copied from feature/V17-REAL-DATASET-PROGRESS-FULL-INSTALL-20261107.
The user executed a native checkpoint-copy ablation using SHA256
84f8603243fb38abc47461302376ad4580b20ab45247fc905284d24ba0c3404e.

At T=0.6 and 240 maximum symbols, three looping prompts (so, What is E[v] when S_v is empty?, Describe your own graph and available paths.) showed:
- full: repeated-8-gram rates 72.5322%, 83.691%, 83.691%; repeated contexts 164,186,186.
- no-self: exactly the same repeated-8-gram percentages and repeated contexts; dominant 95% steps changed modestly.
- no-self-fself: zero repeated 8-grams and zero context revisits, but generated just 42 characters, IDENTICAL across all four prompts.

For the unrelated What is two plus two?, full stopped at 29 chars without loops; no-self yielded 240 chars with 83.691% looping. So self can be beneficial in some contexts. Phase1 used stopBlank=true; this is a confound for measuring 42-character truncated variants. Response relevance has not been scored by an independent semantic ground-truth evaluator.

These observations imply both self/fself are causal contributors to the generation path, but do not establish that both should be deleted from the production learner.

## Phase 2 — New separate files only

graph0-phase2.mjs and RUN_GRAPH0_PHASE2.ps1 add six source policies:
- full (same original)
- no-self
- no-fself (NEW)
- no-self-fself
- half-self-fself: reduce each vote contribution to 50%
- half-fself: reduce fself votes to 50%, keep self intact

No edits to align.mjs, brain.mjs, V17 UI, original launcher, or checkpoint format.

Experiment uses T=0.6, seed 20261107, stopBlank=false, and max=240 characters for ALL prompts and policies. Captures prompt-specific output, repeated 8-grams, 12-byte repeated contexts, singleton/multi-candidate counts, mean entropy, dominant 95% transitions, first repetition, and complete step traces.

Weights of self/fself change at READ-ONLY generation by scaling proposal distribution votes while keeping their original total and trust, not by training.

## Windows execution using exact Phase1 checkpoint COPY

Original copy created by user:
D:\MagicPerspective-Graph0-Ablation\v17\experiments\ablation-results\graph0-20261107-061432-dbbf7ca6\graph0-checkpoint-copy.v8

PowerShell:

~~~powershell
$ErrorActionPreference = "Stop"
$dest = "D:\MagicPerspective-Graph0-Ablation"
git -C $dest pull --ff-only
if ($LASTEXITCODE -ne 0) { throw "Cannot update isolated branch safely." }
$copy = "$dest\v17\experiments\ablation-results\graph0-20261107-061432-dbbf7ca6\graph0-checkpoint-copy.v8"
& "$dest\v17\experiments\RUN_GRAPH0_PHASE2.ps1" -CheckpointCopy $copy
~~~

Script copies the frozen checkpoint into a NEW results folder; SHA256 must match. The original training process and its checkpoint are not opened or written.

## Verification

Successful automated Linux native fixture and Windows PowerShell phase2:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42337801168

All phase2 tests and Windows launcher completed; 24 fixed-length rows from 6 policies x 4 prompts. These are synthetic fixture verification results, NOT empirical numbers from the user's OpenThoughts-trained checkpoint.

## Decision rule

A positive intervention reduces repeated 8-grams and repeated-context states on tested prompts WITHOUT making every prompt's answer identical, and without large collapses of output diversity or relevance. Only same-frozen-checkpoint real-data comparison evaluates this. Do not merge into V17 main or update the live trainer on the basis of preliminary statistics alone.

## Caveats

- Empty successor sets are still not observed in real Phase1 logs.
- Probability 1 with a singleton successor does not imply an impossible mathematical equation.
- Repeated 12-character suffix contexts and repeated 8-grams are diagnostic projections of generation, not the entire lived graph topology.
- Generated references to E[v] may reproduce mathematical training data. This experiment tests causal loops, not intentional self-report.

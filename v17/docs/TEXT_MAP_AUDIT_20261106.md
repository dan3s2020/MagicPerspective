# V17 Text World — Mapping, Scores and Performance Audit (2026-11-06)

Branch: experiment/V17-SELF-CODE-NOISE-LOCK-20261106. This document audits actual implementations, not a proposed demonstration. No existing training rule was rewritten in this audit.

## The exact existing text evaluation

- Original frontend: transcend/torus-aether/ui/app.js, the text Evaluation table.
- Original CPU evaluation: Brain.evalTextExercises() in transcend/torus-aether/devour/brain.mjs.
- answer = aligned next-character accuracy over the answer suffix, where each prior character is the correct observed character (teacher forcing).
- all = the same prediction over the whole exercise.
- oldAnswer = original unaligned chain accuracy over the answer.
- shapeSame = number of identical characters at exactly the same positions in a separately generated continuation / entire reference answer length.
- Independent continuation is produced by AligningGraph.write(question-prefix), max 3000 and often shorter. It has its own previously predicted characters as context. T/noise matter.
- This shapeSame is NOT a shape-topology similarity, causal-path accuracy, semantic equivalence or objective success rate.
- Testing example lengths capped at 2000 characters changes both denominators and the problem evaluated. For longer answer lengths, generated max 3000 can artificially cap shapeSame.
- At default evaluation T=0.4, generation is stochastic. For comparable regression tests use T=0, noise=0 and the SAME fixed unseen exercises.

## What the map is today

align.mjs maintains exact and digit-normalized byte memories, reversed suffix-array indices and exercise-local suffix automata. Evidence from matches proposes each following symbol; an experience-learned trust score selects the prediction. For "form" it mostly maps all ASCII digits 0..9 to one token (ASCII 48).

isolated/noise-space/text_action_paths.mjs builds word-transition and prompt/answer co-occurrence networks and applies beam search over candidate append actions; experimental only.
isolated/noise-space/causal_text_world.mjs has opaque IDs for append, replace, delete, swap, copy, a learned action-effect model, an empirical value field and a 32-dimensional hashed prompt-goal field. This is a separate experimental module, not the evaluator shown in the screenshot.
gpu/shared_perspective.py has a 32-dimensional learned state/action transition embedding and decoder, trained on observed maze/transform/text/code states; the native Brain.evalTextExercises does NOT use that PyTorch model for next-character generation. Therefore the current text answer/form percentages do not establish multidimensional causal route planning.

## What a true text-as-hyperdimensional-maze would need

Define the world with explicit state S = (observations, belief, candidate goal, history, constraints), an action A that induces an observed transition, and an objective predicate/verifier that can be queried without leaking the heldout solution. Distinguish a language-level edit from a domain-level causal transformation.
Train a learned transition F(S,A)->S' in a shared space, with consistent learnable multi-scale global/local navigation and planner proposals. The learned path is a sequence of state changes with checkable effects, not merely a sequence of emitted tokens. Every action's world outcome and failed constraint should be recorded. Estimate uncertainty and exploration portal utility from actual consequence prediction, not from decorative random graph edges.
Do not define semantic "coordinates" by hardcoding human labels for latent dimensions. Measure independent success, path validity, path-vs-optimal ratio where the domain has an optimal path, failed actions, counterfactual predictions and cross-domain transfer.

## Why current training can be slow despite "just reading"

gpu/text_gpu.py TextCard.live does much more than append bytes:
1. For each character position, create contexts and local automaton matches.
2. Query a reversed suffix-array over *all preceding training memory* with nested GPU binary searches and 64 context-depth steps.
3. Score exact/form/self propositions for 5 combinations of trust parameters.
4. Every 31st position simulate 48 character steps of "imagination" to train writing-time trust.
5. After EVERY batch, append and rebuild TWO complete suffix-array indices (raw and digit-normalized), involving stable sorts over the entire accumulated memory. The amount of work grows with total history, not just the new bytes.
6. Sync CUDA/CPU results repeatedly; feed the first exercise into original JS Brain.live, train a separate causal text agent on selected Q/A rows, and optionally run shared PyTorch and maze/transform batches.
7. The Eval tab launches a separate CPU worker, saves a checkpoint first, and can generate thousands of characters independently; this can be substantially slower than throughput-only text ingestion.

These are verified operations; which dominates on a specific GPU is UNKNOWN until timings are collected.

## New opt-in profile + monitor (does not alter learning algorithm)

Set MP_PROFILE_TEXT=1 before restarting the isolated V17 trainer. Profiling synchronizes CUDA at phase boundaries to measure accurate wall times, so timings may add minor overhead. It exports:
  GPU phaseMs.alignment, phaseMs.imagination, phaseMs.reindex, phaseMs.total, phaseMs.indexedCharacters
  Node hostMs.originalGraphTrace, causalTextAndCode, sharedPyTorch, mazeAndTransform and hostMs.total

Brain.learnTextGPU surfaces the backend phase measurements through existing gpu.text snapshots. The monitor v17/measure-text-world.mjs polls the existing /graphs endpoint and writes timed JSON snapshots. It does not update weights. Run:
  node v17/measure-text-world.mjs --port 8867 --watch 15
Optional (explicit, CPU-heavy, triggers existing checkpoint save):
  node v17/measure-text-world.mjs --port 8867 --evaluate --samples 3 --max 2000
Do NOT run frozen evaluation continuously; it consumes CPU and changes measured throughput. Stop Ctrl+C and resume the existing isolated launcher after git pull; Node cannot hot-load changed module code.

## Acceptance gates for the next planner

A. Stable explicit held-out example set, fixed sampling settings, no oracle answer in the planner.
B. Report (i) teacher-forced next-byte accuracy (ii) independent generation exact bytes (iii) length coverage (iv) structural trajectory match (v) actual task completion under verifier. Do NOT conflate these metrics.
C. Compare planner vs a matched-compute flat text baseline, a no-global-perspective ablation and no-noise vs learned-noise variants.
D. Profile total/history size 10k, 100k, 1M, 10M bytes at equal batch sizes, report GPU phase breakdown and throughput. If the index becomes dominant, use incremental or amortized index construction without changing verified prediction output; regression test old vs new on fixed prefixes.
E. Do not merge the experimental branch to main or affect other agent versions without explicit approval.

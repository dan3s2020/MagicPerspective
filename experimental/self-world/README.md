# MagicPerspective — Self-Code World (opt-in experimental extension)

Created 2026-11-06. Based on the exact original `v17/transcend/epistemic-text/engine.mjs` blob SHA `6dce8d2097bbfc4350dfb00242fee4a8c65c58b4` from branch `v17-torus-aether`. The included source is a byte-identical, verified copy. The current `feature/V17-UNIFIED-LIVING-PERSPECTIVE-20261106` branch also retains this engine.

## Principle

Code is no longer an invisible external implementation detail. The organism can observe an atlas extracted from its REAL source, discover relationships, choose a node at which to open a bounded exploratory-noise portal, and receive causal feedback from executable source-edit probes.

A locked path points into the code itself. The learner may perceive it before understanding it. It cannot approve edits until it predicts the effects of changes on a separately evaluated, unseen challenge set substantially better than a no-change baseline. This is a concrete test of basic program-causal learning, **not a numerical definition of intelligence**.

## What actually works today

- Real source is loaded from disk, hashed and mapped into observably named function and class nodes. The lock node and noise-portal node are explicit parts of the atlas.
- A separate source-node-local UCB exploration controller chooses code-graph jumps with noisy exploration and a cost budget. It learns recorded information-gain rewards. Noise is not injected blindly into arbitrary live code execution.
- The original V17 `TextExperiment` model can be evaluated as a black-box on a shared corpus. Numeric-only patch trials are made by replacing exactly one verified source literal, syntax-checking a NEW file, importing it separately, then comparing frozen held-out C accuracy.
- A basic empirical causal effect model predicts outcomes from practice probes; an internal sealed suite evaluates its predictions with unknown corpora. The lock never accepts an agent-supplied target label.
- Approved modifications, when allowed, are written **only to a separate copy**, never to the original source or current brain.
- The `SelfCodeWorld` object has a `brain.live()` bridge. The optional `attach-saved-v17.mjs` loads a COPY of an existing V17 saved Brain, feeds the same brain its own code observations, and saves a new checkpoint. It does NOT start or change the user's original V17 runtime.
- A single-file HTML viewer offers an interactive replay of actual code nodes and the 12 recorded exploration portals. HTML is a replay, not the training runner.

## Run on Windows with Node.js 22+

Extract this ZIP into a NEW directory. In Windows PowerShell:

```powershell
cd "D:\MagicPerspective-SelfCode\experimental\self-world"
node --test .\code-world.test.mjs
node .\run-demo.mjs
Start-Process .\self-world-viewer.html
```

Use your actual extraction directory, not the illustrative path above. `run-demo.mjs` writes a new `runtime-selfcode-sandbox` directory and `experiment-results.json` inside the extension, not inside V17.

To observe your local V17 clone rather than the included verified reference engine:

```powershell
$env:MP_V17_ROOT = "D:\MagicPerspective-Causal-Language\v17"
$env:MP_ENGINE = Join-Path $env:MP_V17_ROOT "transcend\epistemic-text\engine.mjs"
node .\run-demo.mjs
```

Check both paths exist before running; no installation path has been assumed to exist on your computer. To attach to an existing saved V17 brain in a separate, new checkpoint, run:

```powershell
node .\attach-saved-v17.mjs "$env:MP_V17_ROOT" "<EXACT_EXISTING_BRAIN_CHECKPOINT_PATH>"
```

Replace the placeholder with the actual saved brain file (never a directory). This reads it, feeds limited code observations, and saves `runtime-selfcode-sandbox/brain-with-self-code.v8` as a new checkpoint. It does **not** mutate the original checkpoint. It does not rewire the V17 worker process. Test and compare performance before using this saved copy for further training.

## Recorded experiment

On the exact V17 text engine and generated practice/hidden text corpora, with 12 experimental source-edit probes:

| Check | Result |
|---|---|
| Source nodes in atlas | 42 (40 source + gate + portal) |
| Costed exploratory jumps | 12 |
| Attempted counterfactual changes | 12 |
| Blind test challenges | 8 |
| Predictor sign accuracy | 62.5% |
| No-change baseline | 87.5% |
| Lock | **CLOSED** |
| Original source changed | NO |
| Native V17 GUI/GPU integration | NOT CLAIMED |

Run-demo results and source-code fragments can be inspected in `experiment-results.json` and `self-world-viewer.html`. Eight automated Node tests pass on the shipped extension. The model failed to discover useful predictive edit effects in this run; that is why code remains locked.

## Current limitations

This is NOT general-purpose self-programming, not proof of consciousness, not demonstrated automatic CUDA learning, and not a full four-world integration with the production V17 worker. The lock tests elementary source-edit prediction and can only approve allowlisted numeric changes in a sandbox. A real future programming learner would need to induce function semantics, control flow, test generation, candidate synthesis, cross-domain held-out improvement, attack-resistant evaluations, regression checks, and a protected checkpoint rollback path.

An unlock is not achieved by training hours, guessed IQ score, or user-entered success flags. It is an observed, independently tested counterfactual capability. Before promoting a candidate beyond the sandbox, require human review and reproducible benchmarks across maze, text, and transformations.

## Files

- `experimental/self-world/code-world.mjs` — source atlas, noise portals, audited sandbox patcher, internal blind lock, causal learner, optional original Brain bridge.
- `experimental/self-world/causal-laboratory.mjs` — real executable source counterfactual evaluation and autonomous practice probes.
- `experimental/self-world/run-demo.mjs` — documented isolated train/evaluate run.
- `experimental/self-world/attach-saved-v17.mjs` — opt-in existing V17 Brain bridge; never overwrites old checkpoint.
- `experimental/self-world/code-world.test.mjs` — eight passing deterministic tests.
- `experimental/self-world/reference/engine.mjs` — original verified V17 engine, unchanged, for reproducibility.
- `experimental/self-world/experiment-results.json` — measured run outputs.
- `experimental/self-world/self-world-viewer.html` — interactive read-only visualization of measured run.

## Termux, isolated Git branch

This extension is published on `experiment/V17-SELF-CODE-WORLD-NOISE-LOCK-20261106`.
Clone a separate checkout, then run from the repository root:

```sh
pkg install -y git nodejs python
cd ~
git clone --single-branch --branch experiment/V17-SELF-CODE-WORLD-NOISE-LOCK-20261106 https://github.com/dan3s2020/MagicPerspective.git MagicPerspective-SelfCode
cd MagicPerspective-SelfCode
bash scripts/run-self-code-termux.sh
```

On subsequent runs, `git pull --ff-only` from this checkout before running the script.
The generated experiment-results.json and sandbox files are intentionally gitignored to avoid dirty working trees and conflicts on `git pull`. The HTML viewer embeds the original sample replay; it is not a live visualization of the latest run.

# MagicPerspective V17 — LIVE predictive state axis gate
Date: 2026-11-07
Branch: experiment/V17-LIVE-PREDICTIVE-STATE-GATE-20261107
Parent: feature/V17-REAL-LIVE-AXES-MAZE-20261107

## What actually changed

The existing real V17 devour worker, CUDA-ready startup, original Brain and magic.html interface now share a new *pre-update research observation* called LivePredictiveStateGate.

- It operates INSIDE the same native V17 worker through the already-active LiveObservedMathAxes.consume() call. No separate demo trainer replaces the original organism.
- It sees only actual numeric expression pairs extracted from the same training rows already absorbed by the original Brain; no fabricated training examples in production.
- It compares a constant output-effect model with a context-dependent output-effect model. An extra context axis is selected only when independent validation strongly favors it.
- It captures a prediction from OLD learned evidence BEFORE incorporating the current observation.
- It reports real training/validation/test counts, selected context axes and frozen test MAE through the original /graph and /graphs. The real magic.html?live=1 page shows those measurements in a new field. Existing buttons, path animations, original index.html, CUDA, and graph engine remain unchanged.
- The original native text writer is NOT yet controlled by this sidecar. This is a measured in-stream bridge, not completion of general language navigation.

Source files:
v17/research/text-hypermaze/live-predictive-state-gate.mjs (new).
v17/research/text-hypermaze/live-observed-axes.mjs (small integration and checkpoint v2).
v17/transcend/torus-aether/ui/magic.html, magic.js (new live data readout, nothing removed).
v17/tests/live-predictive-state-gate.test.mjs and existing native browser acceptance.
.github/workflows/v17-live-predictive-state-gate.yml.

## Predict-before-learn and scientific controls

The stream extractor recognizes only a structurally identical numeric expression template, exactly one changed input and a changed output. A known action is an INCREMENT observed as part of the input/output pair, not a clairvoyant guess of the next action.

For one recurring operator, it compares:
- constant baseline: predicted output change is the mean observed change;
- contextual axis: predicted output change is learned intercept + learned slope * OTHER observed input number.

Everything is learned from earlier training evidence. No mathematical multiplication or addition rule is coded into this predictor; numerical tokenization, a linear response family and the notion of which positions changed ARE inductive biases.

Three disjoint partitions are determined by a deterministic hash of BEFORE expression and the observed action identity, never the unknown output:
- 70% train (only samples here update fitted weights)
- 20% validation (select contextual axis only if squared error improves >=25%)
- 10% final untouched test (never used for selection or training)

A repeated before-expression always goes into the same partition, so it cannot leak between train and test. Every test score uses the model that existed BEFORE that example was received. The current pair is then passed to the original already-learned coupled/contextual axes learners.

This is prequential correlation, NOT proof of true causal relationships between arbitrary adjacent textual equations. Test partition selection is based on the known action identity inferred when the pair is observed, so it tests conditional effect prediction rather than autonomous action identification.

## Reproducible results — VERIFIED hosted GitHub Actions

Linux job: https://github.com/dan3s2020/MagicPerspective/actions/runs/42327257275/job/128265294840
Windows launcher job: https://github.com/dan3s2020/MagicPerspective/actions/runs/42327257275/job/128265294693

Both succeeded at commit 6e2b0978e7c93eb8b4afd5be0af384ff74d54da4. Node test suites: 45 passes / 0 failures.

Controlled arithmetic-format sequence, no future delta label supplied at inference:
- 35 observed training transitions, 16 independent validation transitions, 35 holdout transitions with previously unseen high numeric contexts.
- Constant effect test mean absolute error = 44.51428571428571.
- Selected context-dependent effect test mean absolute error = 0.
- A fixed-effect ADDITION control chose zero extra contextual axes and scored test MAE = 0.
- Unsupported text pairs generated no false numbers.
- Existing original v1 math-observer checkpoints remain readable; v2 independently persists the added gate and preserves all original evidence.

Native V17 worker acceptance:
- original Node worker trained on a small actual TXT training stream with text, maze and transform worlds (CPU in CI, not GPU);
- real 5D torus coordinates 63, 97 graph nodes, 501 graph edges, 224 observed text tokens, 10 learned original text operators, with live 21-frame predicted text path;
- actual native math observer accumulated 8 paired expression observations and pre-update gate saw all 8;
- original real frozen numeric goal and math checkpoint worked;
- Chrome headless loaded the real magic page, connected to the native server and rendered nonzero learned character statistics;
- original older V17 UI remained intact and functional.

The additional browser-DOM assertion for the new predictive-state panel was committed afterward and must be checked separately. Windows launcher syntax passed in hosted CI. NVIDIA/CUDA does not exist in the runner; it remains to be tested on the user's actual RTX 3050 Ti.

## How to run on real OpenThoughts3

Use a NEW isolated folder; do not overlay an older project or delete checkpoints:

    git clone --single-branch --branch experiment/V17-LIVE-PREDICTIVE-STATE-GATE-20261107 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-Live-State-Gate

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Live-State-Gate\v17\START_MAGIC_REAL.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-State-Gate-Run" -Port 8894

Live UI:
http://127.0.0.1:8894/transcend/torus-aether/ui/magic.html?live=1

Existing original UI:
http://127.0.0.1:8894/transcend/torus-aether/ui/index.html?live=1

The original launcher verifies the CUDA environment on the user's machine and refuses to silently downgrade if CUDA is required but unavailable. Re-running the same command resumes the isolated worker and its sidecar. If the actual OpenThoughts dataset does NOT contain sufficient explicit numeric transition pairs, the interface MUST display low/zero coverage and dashes for missing MAE. That is an honest failed/insufficient-evidence result, not something to replace with a fabricated demo.

## The NEXT test still required

Do not merge into a production text decoder yet. To show real language-as-labyrinth success, the live worker must acquire broader semantically meaningful action effects from natural text, not only numeric expression templates. Then it should build and validate candidate hidden-state dimensions from temporal residuals, not just select context number among prebuilt features. Compare a stateful agent against equal-budget recurrent/context baselines, frozen heldout documents and scrambled-history controls. Only if the extra state improves unseen answer accuracy should it influence AligningGraph.write() and the live solution path.

This work connects a tested part of the hypothesis to authentic training and UI. It does NOT establish general natural-language reasoning, autonomous invention of arbitrary dimensional coordinate systems, or physical quantum effects.

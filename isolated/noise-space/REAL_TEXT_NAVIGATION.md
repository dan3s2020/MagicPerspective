# MagicPerspective V17 — real-corpus text action navigation (isolated)

Research branch: `experiment/V17-REAL-TEXT-NAVIGATION-20261106`.
Origin: `experiment/NOISE-SPACE-HYPERDIMENSIONAL-ISOLATED-20261105`.

This integration uses the **real V17 Brain, original OpenThoughts Parquet loader and existing GPU TextCard**, not the toy symbolic worlds. It adds a separate, experimental **corpus-derived word-action navigator**, preserving the original source, learning rules, checkpoints, 5D observatory, mazes and transformation games.

## Audited upstream versions

- `v17/transcend/torus-aether/devour/brain.mjs`: `Brain.live`, `Brain.learnTextGPU`, `Brain.chat`, `Brain.evalText`. CPU/CUDA text learning and a shared brain across three worlds.
- `v17/transcend/torus-aether/gpu/text_gpu.py`: original PyTorch CUDA/NumPy TextCard, index alignment, form/generalization and trust statistics.
- `v17/transcend/torus-aether/data/text-dataset.mjs`: actual OpenThoughts question-answer Parquet rows. Default Windows root `D:\training\OpenThoughts3-1.2M`.
- `v6/engine/training.mjs` on `experiment/V6-CAUSAL-TEXT-WORLDS-20261103`: intervention->predicted dynamics->goal search. Its fixed 7x7 register world is **not** used as a replacement for V17 natural text.
- `v17/transcend/epistemic-text/engine.mjs`: alternate context-prediction research. Not substituted for V17.
- `v17/docs/NODEGRAPH_TEXT_WORLD_V4.md`: proposed text ports; not assumed to be an active native GPU trainer.

## Exact data flow

1. Set **Text source = New Parquet Q/A dataset** with the correct local Parquet directory. The backend calls the original `openTextDataset` and reads **training rows only** for training. Its held-out rows are separate.
2. For every text batch the original V17 Brain learns exactly as before: `Brain.live` on CPU, or `Brain.learnTextGPU` via verified PyTorch CUDA if enabled. Neither function has been modified.
3. The new `TextActionPaths.learn(prompt, answer)` observes the same *training* Q/A row, after V17's original batch, and collects observed word transitions and Q/A cue associations. These associations produce **candidate action choices**, not a pre-written solution.
4. `TextActionPaths.plan(prompt)` expands candidate next-word actions with a bounded beam. An action **appends an observed word to the current textual state**; the head can choose alternative branches. It is trained on actual text, not generated mazes.
5. Every four text episodes, `ds.heldOut` supplies an **untrained Q/A row**. First the path head produces its answer using the prompt **alone**. The reference answer is read only afterward for exact/lexical-F1 evaluation. `Brain.chat` independently generates from the same prompt as a baseline. The comparison is reported alongside the original V17 *byte* accuracy; metrics are kept separate.
6. The observatory text tab shows: frozen held-out path, chosen and alternative actions, observed support, expanded branches, generated answer versus held-out reference, and V17 baseline. **Ask the learned world** uses a user's question without a reference answer. **Take this action** selects an available next-word choice and replans from that prefix.
7. State persists independently under `isolated/noise-space/runs/<MP_SESSION>/text_action_paths.json`. The original V17 `brain.v8`, geometric `geometry.json`, observatory cursor `observatory.json` and training records remain separate. New/reset backs up the added file with the existing originals.

### CUDA and native model boundaries

- The **original V17 text-learning** path is real CUDA when `gpu_runner` verifies PyTorch's actual `cuda:0` device. There is no silent CPU substitute.
- The **new word-action path head** is currently **CPU/JavaScript**. Its search and incremental counts are *not* CUDA tensor training or learned latent geometric planning; do not claim otherwise.
- The auxiliary `learning_geometry.mjs` 5D->8D->5D next-state model is also CPU. No gradient from the path head currently updates V17 Brain's action policy.
- Original V17 replaces non-ASCII symbols with `?`. The new path head separately stores Unicode words, but this does **not** retrofit V17's byte tokenizer.

## Windows: separate clone, existing installations left alone

```powershell
$ErrorActionPreference = 'Stop'
$branch = 'experiment/V17-REAL-TEXT-NAVIGATION-20261106'
$dest = 'D:\MagicPerspective-V17-Text-Paths'
if (Test-Path -LiteralPath $dest) { throw 'Destination already exists; refusing to overwrite.' }
git clone --branch $branch --single-branch 'https://github.com/dan3s2020/MagicPerspective.git' $dest
if ($LASTEXITCODE -ne 0) { throw 'Git clone failed.' }
# Install the isolated CUDA Python environment once (Python 3.10–3.12 required):
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\isolated\noise-space\SETUP_CUDA_WINDOWS.ps1"
if ($LASTEXITCODE -ne 0) { throw 'CUDA setup failed; do not mark CUDA ready.' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\START_NOISE_SPACE.ps1"
```

Open **http://127.0.0.1:8897/** (the launcher also attempts to open it).

Choose Text source **New Parquet Q/A dataset**, folder `D:\training\OpenThoughts3-1.2M` (or the actual available directory), enable **Text** and, if you set up CUDA, **Enable original V17 CUDA batches**. Select **Infinite training** for continuing training. Check the separate metrics in the Text tab. The default V17 docs mode is **not** Q/A navigation training and reports `NO_QA_DATA`.

To run the dedicated new tests:

```powershell
node --test "$dest\isolated\noise-space\text_action_paths.test.mjs"
```

The launcher also runs the existing NoiseSpace tests and this test before starting.

## Evidence and scientific limits

The new action head passed local Node.js tests for Unicode, held-out non-mutation, trace provenance, restart-equivalent checkpoint, bounded search, and user-selected branch continuation. The updated V17 worker and observatory have passed JavaScript parse checks. **Real OpenThoughts training on the user's D: disk and an RTX 3050 Ti CUDA run have not been executed from this environment; report their outcome only after running the above commands.**

This is a **real-data integration** but **not yet a validated universal language solver**. The action alphabet is observed words; transitions change a text prefix, not physical facts. Lexical F1 does not prove factual reasoning or semantic correctness. For unfamiliar subjects the model can confidently return a wrong but familiar answer. A universal higher-dimensional highway has **not** been discovered or demonstrated. Next tests must use substantial disjoint Q/A exercises and additional baselines (original V17 free generation, bag-of-words retrieval, heldout semantic verification), then explore learned multi-operation interventions and actual cross-world transfer.

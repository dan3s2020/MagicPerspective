# MagicPerspective V26 — completely new Live Hypermaze Training Laboratory

**Isolated branch and new UI.** This is NOT the old V17 interface copied or renamed. Its HTML, styles, canvas, replay, training controller, HTTP endpoints and checkpoint format are written from scratch. It invokes exactly the original V17 Discoverer.shape() attraction/navigation law. Original V17 maze/UI/checkpoints and main branch are unchanged.

## Dependencies

- Node.js 22+; no npm install or third-party Node dependencies.
- Local real text corpus, in .txt, .md, .jsonl or .json. For Parquet, optional pyarrow converter included.
- PowerShell on Windows, or any shell to invoke Node directly.
- Current execution is **CPU**. CUDA/RTX3050Ti use has NOT been verified in V26; do not claim it.

## Start training and see the new UI

Open PowerShell from the **MagicPerspective repository root**:

    powershell -ExecutionPolicy Bypass -File .\v17\apps\hypermaze-studio-v26\START_V26_LIVE_TRAINING.ps1 -Corpus "D:\datasets\your-real-text.jsonl" -Axes 6 -Words 2048 -Noise 0.22 -Batch 4

Open http://127.0.0.1:8896 after the server has started.

If no corpus is supplied, the new trainer uses an existing ACTUAL repository source text document (not a synthetic canned file):

    powershell -ExecutionPolicy Bypass -File .\v17\apps\hypermaze-studio-v26\START_V26_LIVE_TRAINING.ps1

Equivalent direct Node launch (Linux/macOS/Windows):

    node v17/apps/hypermaze-studio-v26/server.mjs --corpus /path/to/corpus.txt --port 8896 --axes 6 --words 2048 --noise 0.22

Training starts automatically unless you pass --no-auto. Leave the Node process running. Browser UI and controls work through the local HTTP server.

Parquet files must first be converted to actual text JSONL:

    python -m pip install pyarrow
    python v17/apps/hypermaze-studio-v26/convert_parquet.py "D:\dataset\part.parquet" "D:\dataset\part.jsonl" --columns question answer

The original Parquet file is preserved. No new neural semantics are inferred by conversion.

## The real native training process

1. Read real corpus words in a strictly separated train/holdout split. Small source: first 55% train, last 30% heldout, untouched 15% gap. Large source: 24 source-offset samples under a configured memory budget, alternating sample regions train vs heldout. UI shows actual sampled input bytes and original total bytes; never claim a 37 GB dataset was wholly processed when only some samples were read.
2. Generate explicit **controlled action worlds** from real corpus spans. Each controlled action changes one CORPUS-DERIVED source word into another corpus-derived word; neither the word pair nor action name is a semantic synonym claim. Because this is a physical editing lab, source and target words are placed into new document contexts, with corpus collision replacements disclosed in the per-exercise record.
3. The learner starts COLD with zero learned rules. At each training episode it predicts BEFORE acting using only previously observed effects. The physical environment executes an action independently and returns before/action/after/accepted. The learner updates one causal rule after observing this outcome. No hidden correct future text is provided to the predictor.
4. The state graph is **sparse and exact for the observed-action editing world**. Nodes are combinations of independent observed action effects; never duplicate 2,048 words across every node. Number of nodes is 2^D for D available learned transformation axes, up to D=10 (1,024 nodes). Edges are actual allowed changes. The original V17 Discoverer.shape() receives this graph, its original 0.97 goal attraction attenuation, seeded noise and uphill action selection. It predicts the full path and entire terminal document BEFORE any external action executes.
5. Execution uses an independent world physics callback that does NOT ask the planner what the true action effect is. Every predicted action is compared to the observed result. An independently constructed complete reference is compared only AFTER the initial shape has been frozen.
6. Frozen holdout uses genuinely disjoint source positions and is asserted to make **ZERO** learner mutations. Metrics report full exact initial shape, exact fully executed answer, individual actual action accuracy, graph nodes/edges, learned rules and real source-text bytes passed through training episodes. A successful controlled edit benchmark is NOT semantic question answering on OpenThoughts.

**Important:** The current action graph is a discretely observed combinatorial hypermaze, not proof that a continuous 4D torus or a general natural-language solution manifold spontaneously formed. The target is provided explicitly as word requirements. Long corpus states mostly preserve their untouched context.

## Every new UI control is functional

- Start, Pause, One exercise, Reset (reset never deletes saved checkpoint files).
- Frozen Test with 1–10,000 heldout exercises; no-update assertion before/after.
- Save checkpoint with atomic unique timestamped filename under V26_CHECKPOINTS; restore via entered local checkpoint path, with corpus fingerprint validation and complete PRNG state restoration.
- Corpus path or browser upload (14 MB limit, larger via path); supports TXT/MD/JSON/JSONL.
- Axes 2–10, text words 128–8192 (actual words limited by input split and shown truthfully), noise 0–1, batch size 1–64, graph sample interval.
- Real graph canvas with every generated state/edge, actual native V17 field intensity, yellow complete pre-action path, green executed prefix, actual action labels and source/target words. Three projections: all axes, Hamming layers, axis slice. Mousewheel zoom, pan, hover, fit.
- Replay controls previous/next/play/pause/seek actual causal action list; text BEFORE, predicted whole answer, executed whole answer previews. Full JSON experiment export includes current state graph and per-action trace.
- Live training and holdout metrics, actual text-state MB/s, dataset split report, learned action evidence and real error journal. CUDA status clearly marked unvalidated.

## New file structure

    engine.mjs                      sparse learned state topology + native V17 field
    corpus.mjs                      real text sampling + heldout + physics
    session.mjs                     live trainer, frozen eval, checkpoint, counters
    server.mjs                      local stdlib HTTP / SSE server
    public/index.html               new UI structure
    public/style.css                new responsive style
    public/app.js                   actual graph renderer and controls
    START_V26_LIVE_TRAINING.ps1      isolated Windows launch
    convert_parquet.py              optional streaming Parquet conversion
    tests/engine.test.mjs           120 frozen long-text, negative, parity, noise
    tests/session-server.test.mjs    train/eval/save/restore/UI HTTP end-to-end

## Verification commands

    node --test v17/apps/hypermaze-studio-v26/tests/engine.test.mjs v17/apps/hypermaze-studio-v26/tests/session-server.test.mjs

Read their actual stdout results. There is no benchmark claim without a test. The previous V25 evidence is retained under v17/docs/V25_FROZEN_LONGTEXT_SHAPE_EVIDENCE_20261107.md.

**Still OPEN / not proved:** >=70% freely formulated, truly unseen semantic OpenThoughts long-text answers; automatic learning of world semantics; all training on RTX3050Ti CUDA; arbitrary new dataset knowledge; a fully native V17 checkpoint weight upgrade. The original user constraint remains blocked for those domains. Never advertise this controlled exercise score as solving them.

The server binds to localhost only. HTTP control endpoints should not be exposed to the internet.

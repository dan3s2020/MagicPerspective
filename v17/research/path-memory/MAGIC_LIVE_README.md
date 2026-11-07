# MagicPerspective — The Living Labyrinth

Research branch: experiment/V17-DISCOVERED-PATH-MEMORY-LIVE-20261107
Date: November 7, 2026

## REAL training and interface

New experimental HTTP/SSE server at v17/research/path-memory/magic-live.mjs. Responsive magical interface at magic-live.html. Existing production V17 Brain, AligningGraph, CUDA engine, UI and all saved checkpoints remain untouched.

The server supports TWO distinct, clearly labeled modes:

1. Real text: -Data DIRECTORY (original V17 OpenThoughts3 Parquet loader) or -Text FILE (real TXT paragraphs). Runs actual ORIGINAL Brain.liveLanguage and Brain.learnObservedTransformations on newly observed passages. The live view shows before-training next-token guesses, real observed characters/tokens and alternatives, actual learned edges, native multi-scale trust, genuine edit operators, progress, and independent frozen held-out evaluation. This is CPU Node.js training, not fake GPU training or a demonstrated semantic goal navigator.

2. Actual action-labelled transitions: -Events FILE.jsonl containing BEFORE/ACTION/AFTER records from an independent source. Fits LearnPathMemory to genuine observations, identifying relevant input axes, dependent response coordinate, state-conditioned action effects, and whether action order requires an additional path-memory coordinate. Shows predicted/observed transitions, errors, graph paths, and goal-conditioned pre-action routes. It currently requires numeric text/array states with two stable unit movement axes and one dependent coordinate. It does not pretend to learn arbitrary natural language by itself.

## Windows PowerShell — isolated clone

    git clone --single-branch --branch experiment/V17-DISCOVERED-PATH-MEMORY-LIVE-20261107 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-Living-Labyrinth

Start real OpenThoughts3 training with automatic browser launch:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Living-Labyrinth\v17\START_MAGIC_LABYRINTH.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Living-Labyrinth-Run" -Port 8877 -Start

URL: http://127.0.0.1:8877/

Continue the same run by adding -Resume; do not delete or change the source. Limit an initial training run using -MaxRows 10000; zero trains through the full available source partition. Choose -Text "D:\real-text.txt" instead of -Data for real TXT.

For actual action-labelled observations, select -Events "D:\recorded-transitions.jsonl" rather than -Data. Illustrative event FORMAT, not fabricated training data included in the server:

    {"before":[10,20,200,9],"action":"E+","after":[11,20,241,4]}
    {"before":[15,22,180,3],"action":"N+","after":[15,23,259,1]}

Each full action/event ledger can be exported. The server **never generates sample events** or hides model failures; a user-supplied event file is mandatory for this mode.

## Buttons are real

Start/Pause controls the actual backend training stream. Save writes independent model and progress files. Frozen test accesses reserved samples without training on them. Rate slider controls backend tick frequency. Export current state returns a JSON snapshot; Full observation log downloads actual JSONL with all recorded events and per-token before-training predictions. In action-event mode, the goal planner predicts a sequence from learned operations without being handed the dependent output.

The moving 2D graph projection is drawn from the real observed node/edge topology and counts. Its screen coordinates are an abstract layout, not a physical 4D/1024D measurement. No decorative dummy training events.

## Isolation and durability

Default bind: 127.0.0.1:8877, distinct from original V17 typically on 8841/8862.
Save paths ONLY under the separate -Out directory:
- Text: brain-live.v8
- Labelled action: path-memory.json (includes all prior observed transition examples, including before first fit)
- Both: progress.json and observed-live.jsonl

-Resume rejects wrong source/kind. A nonempty output directory without -Resume is rejected. Original V17 source files and existing checkpoints are never overwritten.

## Test evidence

GitHub Actions test suite validates real V17 project text source, HTTP, SSE, start/pause/save, full events ledger, independent held-out evaluations, safe checkpoint resume, genuine learned action-memory model and goals. It also reruns existing V17 regression tests and checks production files byte-for-byte unchanged.

Controlled mathematical action-world benchmarks are NOT proof that the same algorithm solves unconstrained natural-language tasks; real OpenThoughts3 heldout performance from the user's Windows computer must be measured there, not guessed.

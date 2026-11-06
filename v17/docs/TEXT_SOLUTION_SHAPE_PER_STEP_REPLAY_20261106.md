# V17 real text-world solution-shape observatory (isolated branch)

User request VERBATIM: \`verbatim/2026-11-06-TEXT-HYPERMAZE-VISUAL-REAL-TRACE.md\`.

## What actually runs

The original V17 Brain (same worker) learns from the real OpenThoughts3 Parquet corpus and original V17 labyrinths, optionally on the existing CUDA path. The research atlas reads **previously observed** questions and answers in parallel, without replacing the original brain, modifying existing checkpoint formats or resetting legacy UI.

On each real new Q/A record, BEFORE learning the answer, \`LiveResearch.candidate()\` builds a graph from previous training examples. It calls the *original* \`Discoverer.shape()\`, computes exact shortest-path multiplicity, successor occupancy and two independently **executed graph-world** traversal policies (native, SR-on-ties). The new \`captureSolutionShape()\` emits:

- initial global \`Discoverer.shape()\` solution path **before first edge action**;
- the full observed graph nodes, labels, source evidence, directed edges;
- 4 real numeric features per node: original V17 attraction, discounted SR goal occupancy, shortest distance, outgoing branching;
- for EACH world-graph action, previous cursor, current cursor, observed action index, actual destination and predicted next node;
- complete re-planning path from current node, local neighbor list, predicted-versus-observed divergence and changed-shape flag;
- actual scalar-relaxation iteration snapshots from the same recurrence as the original V17 field (instrumentation for inspection, not a replacement planner);
- actual traversed path, original path, observed alternative routes, shortest-path count, optimal distance and all stop conditions.

No unobserved graph edges, targets or movements are generated. UI playback animates already RECORDED real graph-world actions after each sample is processed; playback time is not falsely described as training execution time. Actual Q/A graph traversals are retrieval/lookup actions, not character output, not emergent semantics and not an organism discovering an arbitrary natural-language world by itself.

## Original next-character model observability, separately

In the original \`Brain.live()\`, an OPTIONAL onPrediction observer records the true \`AligningGraph.live\` guess calculated before character input and compares it to the incoming byte. It changes no learning logic and is independently regression-tested. A bounded rolling buffer of 768 actual CPU text predictions appears alongside the actor view.

With batched CUDA text learning, per-character GPU kernel events are NOT available. In that case \`AligningGraph.readFrozen()\` computes real, deterministic, **pre-observation**, per-character predictions on a bounded segment of an actual new Parquet Q/A row. It does not train and is labelled frozen evaluation, NOT GPU-character execution. There are no synthetic values, fake activity or pseudo-random position labels.

## Original UI, new real views

Existing \`Antrenare\`, \`Evaluare\`, NestView 5D graph, sliders and controls stay in place. On an opt-in research run the same original V17 UI auto-opens \`Trasee / SR LIVE\`, with:

1. **Global HyperMap**: observed node topology; original initial solution-line (gold dotted); new per-step local shape (turquoise); executed cursor route (blue); selected alternative branch (green); actual cursor (red). Node brightness encodes a measured field value.
2. **Measured 4D projection**: interactive X/Y axes from attraction, SR, distance, branching, and numeric 4D rotation/projection; NO false claim to a learned 4D language manifold or a real 4D torus.
3. **Local/actor perspective**: actor at current node and the actual observed outgoing edges with their V17 field/SR/shortest-path count; selected action is highlighted from the recorded next step.
4. **Timeline**: play/pause, previous/next, frame slider, speed, auto-follow real new rows, alternative route highlight and field-relaxation iteration scrubber. Frame details show all predicted/actual states, replan changes and the zero-or-positive number of real deviations.
5. **Original next-character cursor**: predicted vs observed character, alignment source and error impulse in CPU live training; frozen teacher-forced evaluation, clearly marked, on CUDA.
6. Existing F1 and exact held-out baselines, usage rates, VRAM/error counters are preserved unchanged.

Schema: \`/research?w=0\` returns \`last.navigation.native\` and \`last.navigation.successor\`. Each contains \`{initial,nodes,edges,alternatives,frames,executed,summary,factualLimits}\`. \`frames[i]\` contains \`{index,at,from,action,actual,predictedNext,forecastError,shape,field,fieldWave,visibleNeighbors,shapeChanged}\`. \`characterTelemetry\` has \`{seen,hits,recent,frozenRecent,frozenRow,frozenAccuracy}\`.

## Actual Windows command

Fresh isolated Git branch: \`experiment/V17-TEXT-SOLUTION-SHAPE-REPLAY-20261106\`
Fresh destination: \`D:\MagicPerspective-Text-Shape-Replay-20261106\`

Then run:

\`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Text-Shape-Replay-20261106\START_TEXT_SHAPE_REPLAY.ps1" -Data "D:\training\OpenThoughts3-1.2M" -ImportPrevious "D:\MagicPerspective-Multipath-Run" -Out "D:\MagicPerspective-Text-Shape-Run" -Port 8875 -Gpu "cuda:0" -GpuTextBatch 4\`

The exact original UI opens on \`http://127.0.0.1:8875/\` and redirects to \`?live=1&research=1\`. Resume uses the same command with \`-Resume\` and WITHOUT \`-ImportPrevious\`. To start without importing old experiment data, set \`-ImportPrevious ""\` on a fresh output folder.

## Evidence, omissions and acceptance

CI regression tests verify V17 2D/graph shape parity, exact shortest path counts, original unchanged Brain.live learning with optional observer, real observed-edge action execution, no invented terminal states, field-wave convergence to final numeric field, true frozen prelearning char guesses and HTTP serving of all UI files and real worker research frames on a Parquet-format-only CI transport fixture.

CI transport fixture is explicitly NOT presented as language learning evidence. The only real quality data currently supplied by the user had F1 0.2704 native = SR = lexical, 0 SR decision changes and 0 exact answers of 8; we have **NO new measured D-drive semantic gain**. The new interface shows actual motions and errors on the observed answer graph, but this is not yet a new language-learning transformation mechanism. Original next-character training and original CUDA backend remain unchanged beyond optional tracing. No model weights are trained by SR. A true transfer of source→target actions in an unknown language-world remains an open research task.

Never merge experimental code into main without the user's explicit request. Existing regression issue #25 remains relevant.

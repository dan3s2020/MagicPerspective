# MagicPerspective V18 — original maze law, absorbed language-world topology

**Branch:** experiment/V18-MAZE-LANGUAGE-ONE-MECHANISM-ISOLATED-20261106

**Base:** experiment/ISOLATED-V17-BODY-PERSPECTIVE-20261106, commit 64deb2e4b21272b790f437b87a30d25020680e73.

**User source:** verbatim/2026-11-06-MAZE-LANGUAGE-MYSTIC-PERSPECTIVE-USER-TURNS-VERBATIM-PARTIAL.md (10 exact visible USER messages, only partial conversation; assistant/tool turns and media not reconstructed).

**Regression #25:** OPEN / BLOCKING — assistant-defined substitutions are prohibited.

## Same law, new experienced world

- The original V17 maze code at v17/transcend/torus-aether/worlds/exercise.mjs remains untouched.
- The new general-topology adapter at v17/transcend/torus-aether/language-maze/shape-topology.mjs uses the EXACT original attraction propagation: attract(kind)>0.2, conductivity(pass/(pass+block)), blocked conduct<0.5, attenuation 0.97, at most 2*nodeCount relaxations, and uphill navigation. The only change is that 4 fixed spatial neighbors are replaced by observed directed neighbors.
- A parity test proved the same planned directions as original Discoverer.shape() on 88 seeded 2D mazes. It does not mean every language case is solved.
- The learned text world at language-maze/language-world.mjs observes real training Q/A rows. Each emitted answer character supplies a state transition. Common response prefixes merge into one branching directed graph. A full shape is found BEFORE emitting the first character and then is traversed character by character.
- Terminal nodes are recognized from previously completed training responses, not unseen reference answers. When no learned path exists, the organism abstains. Reaching a learned terminal does NOT establish correctness for a new question.
- A separate mechanism infers a positional source→output character mapping when at least two DISTINCT training pairs support the identical context and mapping. It discovers actual ordered positions, not a manually named reverse/copy operator. These observed transformation laws can generate new paths for unseen strings sharing that context, still using the same original V17 maze propagation. This is limited symbolic transfer, not universal semantics.
- Test answers are accessed only after planning. The POST /language-maze/plan endpoint rejects answer and reference arguments, preventing target leakage at inference.

## Same actual original V17 UI and training

V18 contains the original living V17 NestView torus/graph, training, Pause/Save/Reset, maze/transform/text worlds, CUDA support, body-perspective replay, existing metrics and evaluation panels.

Additive tab: **Limbaj · labirintul caracterelor**.

- A prompt-only input initiates planning against REAL previously learned graph data.
- Step zero shows the whole predicted shape, which already exists before any character action.
- Each subsequent replay step reveals an actual emitted character, its source/target nodes, remembered path, potential difference and remaining route.
- The chart is a deterministic 2D drawing/projection of real observed nodes and edges, NOT a claimed actual physical 4D/5D manifold.
- Counters show observed Q/A rows, number of character transitions, candidate known paths, goal-reaching evidence and current step. Unknown prompts are explicitly rejected as NECUNOSCUT.
- Original graph controls and old tabs remain active. A hidden tab does not repeatedly redraw the new graph.

## Checkpoint and isolation

- Independent new folder D:\MagicPerspective-MazeLanguage-V18-Isolated
- Independent port 8888
- Independent checkpoint root v17/runtime-maze-language-v18
- Original V17 Brain weights remain in their native .v8 files, without schema changes.
- New sidecar .v8.language-maze.v18.json is saved and restored independently. Reset archives it alongside other original V17 sidecars.
- No Git main branch or other agents' branches/checkpoints are overwritten by the new V18 branch.
- The original GPU/CUDA PyTorch V17 engine remains and its verification continues; the new language-world topology learner and original-law graph propagation are CPU JavaScript, NOT a fully CUDA-offloaded new language graph. Claiming 100% CUDA is prohibited.

## Real test evidence

Workflow .github/workflows/v18-maze-language.yml validates:

1. Exact original 2D maze shape parity across 88 seeded world configurations.
2. A learned branching character-submaze world with an initial global form and actual per-character transitions.
3. Real learned positional transformation from two observed distinct strings, then a correct unseen string, without supplying its target.
4. Two different transformations remain separate instead of being conflated.
5. Unicode portals, JSON sidecar roundtrip, genuine no-route abstention, heldout target absence and wall resistance.
6. Original V17 native UI, original body-perspective and shared-experience regressions.
7. Real original V17 backend HTTP boot, prompt-only /language-maze/plan and rejection of heldout reference input.
8. Windows PowerShell 5.1 syntax validation of START_MAZE_LANGUAGE_V18.ps1.

Passing CI does not prove full language understanding, arbitrary transformations, unlimited data retention, physical higher dimensions, runtime GPU utilization or complete Verbatim compliance.

## Run isolated on Windows PowerShell D:

Set branch to experiment/V18-MAZE-LANGUAGE-ONE-MECHANISM-ISOLATED-20261106.
Clone into D:\MagicPerspective-MazeLanguage-V18-Isolated only if it does not exist.
Run v17/START_MAZE_LANGUAGE_V18.ps1 with -Data "D:\training\OpenThoughts3-1.2M", -Gpu cuda:0, -GpuWorlds 16, -GpuTextBatch 2, -GpuTextChunk 128, -GpuMaxChars 4096, -Vram 1.8, -Port 8888.

Open http://127.0.0.1:8888/transcend/torus-aether/ui/index.html?live=1

Do not simultaneously train another isolated agent on the same 4GB GPU without saving/pausing it.

## OPEN / NOT YET IMPLEMENTED

The user's larger objective remains OPEN, including: complete unbounded absorption of the full text corpus into the actually navigated world; general discovery of semantic/causal language transformations; general correct output generation on unseen problems; learned global-to-local non-grid 4D/5D perspective with evolving torus; full same-organism policy transfer between maze and text; real-time full CUDA for all training; independent broad unseen accuracy/efficiency benchmarks; complete source Verbatim including every missing prior assistant/tool/media turn.

The world currently keeps a bounded active memory of 1600 observed Q/A records and a maximum of 12000 graph nodes per query. Displacement and limit flags are reported. These limits are not to be mistaken for complete/unlimited learning. User-intent regression #25 remains OPEN/BLOCKING until actual full implementation, tests and explicit approval.

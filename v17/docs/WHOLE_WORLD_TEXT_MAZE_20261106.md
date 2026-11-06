# MagicPerspective: Whole World First / The next character IS the cursor
Isolated branch: experiment/V17-WHOLE-WORLD-TEXT-MAZE-20261106
Base: experiment/V17-SELF-CODE-NOISE-LOCK-20261106

## Correct mechanism
1. Absorb ALL nodes, walls, action transitions, current state and goal into one graph as a complete world, BEFORE any movement.
2. Propagate the goal field through legal edges to construct a FULL INTERNAL PATH; not a random guess for the next character.
3. Move the cursor along the internally discovered path, one real world action at a time.
4. Only AFTER each move is the observed character emitted: the changed coordinate at the new cursor position.
5. Compare actual arrival with the goal, path length against shortest possible, wall collisions and whether planning happened before the first movement.

The same generic navigator implements 2D and N-dimensional navigation. The explicit 6D binary text hypercube has 64 complete states and 384 directed edges. Blocked states make entire regions invalid. If the start is isolated, the planner truthfully reports no path. Even high noise only chooses among legal edges reducing distance.

The input-to-target example uses full text states: input cat, target dog, with dat optionally forbidden. Each edit updates just one character position. The cursor is a point within the graph of complete strings. Its observable emitted sequence is a log of moving coordinate values, not a next-token guess and not necessarily the full final answer: the final state is read from the arrived-at node.

The native V17 worker receives opt-in world maptext; both GraphTrace and the same original Brain receive its action observations. NestView's existing UI displays the full-map status, route length, path-before-movement evidence, walls, final cursor-character observations. The old text next-character code is unchanged and ONLY runs when text world is enabled.

## Important limitations
- The path is currently obtained by a BUILT-IN wavefront/shortest-route mechanism over an EXPLICIT FULL graph. This is a correct reference implementation of world-first navigation; it is not a trained model that discovers semantic walls and transformations from raw OpenThoughts prose.
- Providing a literal target string for the small input-to-target test makes the goal known in advance, as with a 2D maze goal cell. For a real unknown textual answer, the target should be a CHECKABLE goal predicate or constraints, not the hidden answer.
- Binary coordinates and single-position string edits are controlled toy state spaces, not proof of an intrinsic 6D semantic geometry of language.
- The planner is efficient on small finite graphs; absorbing a huge unbounded natural-language world or discovering its transition rules has not been solved. A binary D-dimensional atlas has 2^D states, so materializing everything is not free for large D.
- It is not a neural or LLM next-token path planner. It does still let the ORIGINAL Brain.live learn sensory consequences after the path is discovered.
- The original Tensor/PyTorch CUDA training for text, maze, transform and code is separate. This world-first finite graph planner runs on Node CPU. No real-device GPU acceptance was run here.

## What was verified
The exact published whole-map module and checked-in tests were run in a V8 harness: 8/8 behavioral tests with 181 assertions passed, including 2D V17 labyrinths, 6D hypercube, disconnected map, legal-only noise, shared original Brain events, full input-to-target state example and movement occurring only after internal planning.

A complete run in the original Node process on the user's Windows device is not yet independently verified. All edits are isolated from main and other agents.

## Windows PowerShell run, no text dataset
Use a NEW directory:

  git clone --single-branch --branch experiment/V17-WHOLE-WORLD-TEXT-MAZE-20261106 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-WholeMap-Text
  cd D:\MagicPerspective-WholeMap-Text
  node --test .\v17\tests\torus-whole-map-text.test.mjs
  powershell -NoProfile -ExecutionPolicy Bypass -File .\v17\START_V17_WHOLEMAP.ps1

Open http://127.0.0.1:8868/transcend/torus-aether/ui/index.html?live=1

For all existing worlds with CUDA and the new maptext extension (requires a real dataset):

  powershell -NoProfile -ExecutionPolicy Bypass -File .\v17\START_V17_WHOLEMAP.ps1 -FullCUDA -Data D:\training\OpenThoughts3-1.2M

Both launch modes save in the new v17/runtime-whole-map-text-20261106 directory, without overwriting older V17 checkpoints.

## Future acceptance gate
Replace the explicit map source with one induced from observations by the SAME organism. Measure whether it can infer a wall, action transition and target verifier before acting, and transfer that learned map-building procedure from 2D mazes to unseen textual tasks. Compare with the existing next-byte baseline without reusing the correct hidden answer in the planner.

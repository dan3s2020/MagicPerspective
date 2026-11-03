# MagicPerspective V4 — Perspective Forge

**Status:** experimental research software. V4 is isolated under `v4/` and does not change V1, V2, V3, or their checkpoints. It is not an entity from another dimension, a demonstrated universal solver, or a proof of P=NP.

## Run on Android / Termux

```sh
pkg update -y
pkg install -y git nodejs
cd ~
if [ ! -d MagicPerspective/.git ]; then git clone https://github.com/dan3s2020/MagicPerspective.git; fi
cd MagicPerspective
git switch main
git pull --ff-only origin main
bash v4/run-termux.sh
```

Open **http://127.0.0.1:3033** on the same phone. No npm install is required. A Node.js runtime with ESM support is required.

Run tests: `cd ~/MagicPerspective/v4 && npm test`.

Reproduce a small seeded training/evaluation run: `node scripts-benchmark.mjs 200 9 12`.

## Four specific mechanisms

1. **Local observation and assembly**: a partial relation map records revealed edges and costs. Two competing *fixed* candidate perspectives (geometric reliability prior vs relation-based prior) are weighted by their online predictive log loss. It does **not** invent new arbitrary coordinate systems.
2. **Trainable causal transition model**: an independently initialized shared 16-to-20-dimensional neural encoder with learned heads for edge passability, movement effort, and teacher-supervised transition preference. Sensor observations and actual action consequences update shared parameters.
3. **Whole-solution hypotheses**: autoregressive learned beam search attempts multiple connected paths before moving. When beam search fails, a clearly labelled model-weighted Dijkstra fallback may generate the route; the UI displays which mechanism did the work.
4. **Action, resistance, self-correction**: forecasts are frozen before intervention. The agent then receives real local observations, computes predictive mismatch, adjusts shared weights and may change the relative emphasis placed on the two perspectives. The initial trajectory is retained for a fixed step-zero comparison.

## Honest boundaries

- The action **scaffold** (candidate links and node identities, plus the goal identifier) is public. Hidden passability and true costs are never passed into the learner's prediction methods. This is a narrower task than learning an entirely unknown graph topology from first principles. A 2D maze and an abstract graph use the same model interfaces, but their candidate-link scaffolds are provided.
- Offline training uses true shortest-cost next-step labels. Online corrections do **not** use privileged teacher labels. Test worlds use different seeds.
- Beam search is still an explicit search algorithm. It is not a learned end-to-end policy that directly emits a certified optimal path.
- The goal signal is explicit and global. Unknown, changing or ambiguous goals are not handled.
- Unknown edges and costs can change the correctness of the initial guess. Nothing can guarantee correct solutions with indistinguishable local information.
- Results are reported for **learned+online, learned+frozen and neutral** using paired world seeds. A lower training loss alone is not evidence of effective navigation, independent emergent awareness, universal generalization or P=NP.
- Fixed maze and graph generators do not establish transfer to text, arbitrary constraint problems or real-world physical fields.

## File layout

`engine/world.mjs` — two world categories and private physics/teacher; `engine/perspective.mjs` — learned representation weighting; `engine/model.mjs` — neural causal/shape heads; `engine/imagination.mjs` — complete hypothetical routes and fallback; `engine/agent.mjs` — experience loop; `engine/training.mjs` — independent training/validation/test controls; `server.mjs` — local app and checkpoints; `public/` — visual laboratory; `tests/` — consistency and anti-leakage tests.

Data stays on the phone at `v4/data/best-brain.json` and `v4/data/live-brain.json`, excluded from Git. The first is selected by independent validation; the second preserves exploration state weights without replacing the selected best. The app reset button affects **V4 only**.

## World-specific visualizations (V4 UI update, 2026-11-03)

The V4 UI now uses two distinct rendering grammars rather than drawing every world as a line graph:

- 2D maze: tile grid with walkable corridors and walls; the observer pane shows discovery and hypotheses, not the unseen truth.
- Braided 2D: spatial maze with loops and extra connections, still keeping local observations separate from evaluator truth.
- Abstract network: proper node-link layout, distinguishing passable, blocked and unknown relations and overlaying connected paths.

The World Atlas simultaneously shows three independent seeded evaluator-only miniature example worlds. These are not the active world or training inputs. Tapping a card or changing the World selector creates a new world of that kind. Switching is disabled during training and does not reset checkpoints.

The main pair of canvases always displays the active world: evaluator-only truth versus organism's limited perspective. The endpoint /api/gallery?size=9 exists only for human viewer previews and is not called from agent or training code. The learner canvas does not require a teacher/truth object.

Verification: cd ~/MagicPerspective/v4 && npm test. The regression suite tests all three world families, six render cases, evaluator/learner separation and UI wiring. These changes do not modify training objectives or prove any navigation improvement.

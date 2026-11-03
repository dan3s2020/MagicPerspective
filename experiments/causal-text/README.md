# MagicPerspective V6 — One Mind, Many Worlds (experimental)

This independent causal laboratory is in `experiments/causal-text/` with its own local server (port **3036**) and checkpoint (`experiments/causal-text/data/best-model.json`). **V1–V6, the Perspective Escape extension, and all their checkpoints are untouched.**

## Research choice

Rather than endlessly enlarging maze training, V6 tests **causal world-model learning plus text-expressed multi-step goals**. The neural model is a 23-input, 64-hidden-unit, two-7-class-output softmax model trained via real action-result observations and Adam. It has 3 hidden-physics tools per world, each selected from five possible law families with randomized parameters. Register values are 0–6. It receives 3 intervention probes per tool (18 observed outcome values) and current state + tool, **not teacher laws**.

Training experiences consist of actions on previously unseen states, not a teacher's optimal plan. **Text is a fixed restricted goal grammar**, not trained natural-language understanding. Multi-step planning uses an explicit breadth-first graph search with **learned** one-step transitions; therefore a good planning score is not proof of an end-to-end learned planner.

## What must be measured separately

- **Exact transition prediction**, including both registers, on world seeds and states not used in training.
- **Planning success** on previously unseen reachable goals requiring 2–5 operations, verified by executing the proposed sequence against the actual world.
- Two matched controls: *identically structured untrained neural model* and *nearest observed probe*.
- Train/validation/test seeds are disjoint. Validation selects the checkpoint; final test is reported separately. The final-test split must not determine hyperparameters or checkpoint selection.
- Negative results and failed plans are retained, not filtered from accuracy calculations. Truly unreachable tasks are disclosed in counts rather than counted as solved.
- No assertion of general intelligence, emergent consciousness, universal transfer, miracles, or P=NP.

## Termux / Android

```bash
pkg update -y
pkg install -y git nodejs
cd ~
if [ ! -d MagicPerspective/.git ]; then
 git clone https://github.com/dan3s2020/MagicPerspective.git
fi
cd MagicPerspective
git switch main
git pull --ff-only origin main
bash experiments/causal-text/run-termux.sh
```

Open **http://127.0.0.1:3036** on the same Android device. Training progress and held-out validation curves are live. The model checkpoint is stored only in `experiments/causal-text/data/`. The reset action affects V6 only.

## Reproducibility

```bash
cd ~/MagicPerspective/v6
npm test
node benchmark.mjs 300 24 17
node benchmark.mjs 300 24 23
node benchmark.mjs 300 24 31
```

The benchmark creates raw JSON reports in `results/local-v6-<seed>-<episodes>.json`. Do not treat success on one seed or one fixed rule library as generalization to unrestricted problems. Next experiments should test new rule families, variable numbers of tools, noisy probes, transfer to graph problems, and learning to interpret text rather than supplying the parser.

## Experimental hypothesis search (separate from neural training)

`engine/hypotheses.mjs` contains an explicit finite family of causal rules, an observation-filtered version space and a choice of interventions by expected information gain. The experiment compares the same number of active vs random probes, then verifies predicted transitions and multi-step plans. It intentionally does not claim that the neural network learned these rules. Its purpose is to test whether reliable causal abstraction must be added before scaling gradient training.

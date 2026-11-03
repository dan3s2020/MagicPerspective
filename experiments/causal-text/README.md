# MagicPerspective — Causal Text Lab (independent experiment)

This independent causal laboratory is in `experiments/causal-text/` with its own local server (port **3036**) and checkpoint (`experiments/causal-text/data/best-model.json`). **V1–V6, the Perspective Escape extension, and all their checkpoints are untouched.**

## Research choice

Rather than endlessly enlarging maze training, this laboratory tests **causal world-model learning plus text-expressed multi-step goals**. The neural model is a 23-input, 64-hidden-unit, two-7-class-output softmax model trained via real action-result observations and Adam. It has 3 hidden-physics tools per world, each selected from five possible law families with randomized parameters. Register values are 0–6. It receives 3 intervention probes per tool (18 observed outcome values) and current state + tool, **not teacher laws**.

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

Open **http://127.0.0.1:3036** on the same Android device. Training progress and held-out validation curves are live. The neural checkpoint stays in `experiments/causal-text/data/best-model.json`, and unique training seed reservations and completed-session counters are stored in `experiments/causal-text/data/training-ledger.json`. Reset deletes only these laboratory records, never the unrelated horizon V6.

## Reproducibility

```bash
cd ~/MagicPerspective/experiments/causal-text
npm test
node benchmark.mjs 300 24 17
node benchmark.mjs 300 24 23
node benchmark.mjs 300 24 31
```

The benchmark creates raw JSON reports in `results/local-v6-<seed>-<episodes>.json`. Do not treat success on one seed or one fixed rule library as generalization to unrestricted problems. Next experiments should test new rule families, variable numbers of tools, noisy probes, transfer to graph problems, and learning to interpret text rather than supplying the parser.

## Experimental hypothesis search (separate from neural training)

`engine/hypotheses.mjs` contains an explicit finite family of causal rules, an observation-filtered version space and a choice of interventions by expected information gain. The experiment compares the same number of active vs random probes, then verifies predicted transitions and multi-step plans. It intentionally does not claim that the neural network learned these rules. Its purpose is to test whether reliable causal abstraction must be added before scaling gradient training.

## Training repair (3 Nov 2026)

1. **No repeated training-world seeds across button presses.** Before each run, the server atomically reserves a never-reused interval of training-world indices in `data/training-ledger.json`. A cancelled or crashed run still consumes its reserved index range; it cannot silently replay the old default 5,000 worlds. Do not manually delete the ledger when keeping a checkpoint. Explicit RESET removes both.
2. **Accurate counters.** The UI distinguishes completed training episodes from episodes inside the selected checkpoint, true observations from consensus-inferred training labels, and updates stored in the selected checkpoint. Old discarded training history **cannot be reconstructed** from a legacy best-model checkpoint; the ledger explicitly marks it unknown and starts a separate high seed range.
3. **Causal/neural integration.** `engine/hybrid.mjs` uses only measured intervention events to reject incompatible hypotheses in the finite 13-law library. If all remaining laws predict exactly the same transition, it uses that prediction. Otherwise it abstains and uses the neural model; predictions are attributed to their source. During NN training, labels inferred by unanimous causal agreement are kept separate from directly observed transitions and enter the gradient batch as a transparent *distillation* experiment. Hypotheses are not passed as secret teacher labels.
4. **Fair held-out comparisons.** `engine/comparison.mjs` reports neural-only, hybrid with nine initial probes, hybrid with two active probes, and hybrid with two random probes on disjoint worlds. The evaluation excludes any queried state/action pair from the transition-test set **for all four modes**, to avoid credit for just replaying a measurement. Planning success is determined by executing the proposed sequence in the real simulator.

**Interpretation:** the finite-law hypothesis organ can be much more successful than the NN, but this is not evidence that the NN learned those laws. The text parser remains fixed, and completely new rule families are out of scope. Keep reading neural-only scores separately. More training does not guarantee improved plans.

To update without deleting existing checkpoint or ledger: stop the current laboratory process (Ctrl+C in Termux), `git pull --ff-only origin main` in the repository, then run `bash experiments/causal-text/run-termux.sh`. Never press Reset just to upgrade. The original `best-model.json` schema remains compatible.

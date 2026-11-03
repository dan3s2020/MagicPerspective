# MagicPerspective V2 — Causal Perspective Laboratory

**Status: experimental, standalone, tested on Node.js 22. Not a universal AI, not P=NP, and not a learned general-purpose perspective inventor.** The full untouched V1 remains in the repository root. V2 code is isolated under `v2/` and uses port **3031** (V1 uses 3030).

## Run on Termux

```sh
pkg update -y
pkg install -y git nodejs
cd ~
git clone https://github.com/dan3s2020/MagicPerspective.git
cd MagicPerspective
bash v2/run-termux.sh
```

Open **http://127.0.0.1:3031**. After the initial install:

```sh
cd ~/MagicPerspective
git pull --ff-only origin main
bash v2/run-termux.sh
```

An existing V1 checkout remains intact. V2 is in a separate folder, not a rewrite of V1.

## What is really implemented

- Deterministic procedural **branched**, **braided**, and **rooms** worlds, odd widths 7–21. Materials have different measured action costs. The teacher computes true **minimum-effort** paths, not simply shortest step counts.
- The organism senses at most a 3×3 window per step and retains an explicit **partial belief map**. Its goal position is an allowed hint. The hidden world is exclusively in physics and teacher evaluation.
- The **trainable shape organ** uses a shared 28-input, 32-hidden-unit nonlinear model over candidate positions, taking only the belief and current start/goal. It emits a full shape-likelihood field **before the first action**; an explicit Dijkstra-like decoder derives a path over the partially believed grid. Do not confuse the decoder with learned end-to-end connected path prediction.
- A **separate learned causal organ** predicts physical movement costs based on locally detected materials. On each move, actual effort trains the predictive weights online; a journal shows the mismatch before and after each intervention.
- The teacher's shape label is recomputed for the **current snapshot position** (fixing the V1 mismatch).
- Training examples are gathered by partial-observation exploration only, and the teacher's hidden truth is used **exclusively** to label the snapshots. The causal training examples are actual locally experienced action-effect pairs; they are not sampled directly from the hidden world.
- Shape learning improves with SGD and can be trained for 200–10,000 episodes from the UI or up to 50,000 via API. No additional native dependencies or GPU are necessary, which keeps it deployable on Termux.
- Model snapshots preserve learned parameters; checkpoint selection uses a **fixed validation** set (`seed=980001`) and retains the best validated version; independent evaluation uses a disjoint `seed=990031`, with controls using the same initial local observation.
- Metrics: BCE, IoU, recall, navigation success, average realized effort, length, and comparison with geometric and neutral controls. Separate hidden diagnostics show teacher truth to the human; the shape predictor does not receive teacher route, wall mask, or hidden materials.

## Commands

```sh
cd v2
npm test
npm run bench -- 600 11
node scripts-benchmark.mjs 2000 11
bash run-termux.sh
```

REST API: `/api/health`, `/api/state`, `/api/train` (`{ "episodes": 2000 }`), `/api/cancel`, `/api/new` (`{ "n": 11, "family":"rooms" }`), `/api/step`, `/api/evaluate`, `/api/reset`.

## Scientific boundaries

The model learns a maze-specialized spatial likelihood field; its latent activations are an encoded representation, **not evidence that it invents new dimensions or perspectives**. Multi-world training across maze families is **not transfer to SAT or arbitrary domains**. A better BCE does not imply a better physical route. Tests are deterministic contract checks rather than independent formal audits. Termux training is CPU only.

V2 currently lacks: a recurrent latent world model, invention of new coordinate schemes, learned connected route construction without graph search, controlled causal ablations over multiple independent randomized training seeds, cross-domain generalization, and automatically reliable high-level planning. Those belong in later experiments and must not be described as implemented by V2.

## Stronger falsification / destructive control

`node scripts-ablation.mjs 1200` uses fixed independent seeds and deliberately shuffled supervision for one control learner. The recorded example is in `results/ablation-1200.json`. Training validation is a fixed three-size suite (7/11/15), so best-checkpoint selection remains comparable across subsequent runs with different training sizes. Evaluation seeds (990031) are distinct from the validation seeds (980001) and training seeds (20261103 + 7709×episode).

# MagicPerspective V3 — online causal prediction correction

V1 and V2 remain immutable sibling versions. V3 is a separate research baseline that connects shape prediction with real sensory and action feedback through a shared, trainable neural encoder. No dependency or GPU is required in Termux. It is **not** universal intelligence.

## Termux

```sh
cd ~/MagicPerspective && git pull --ff-only origin main
bash v3/run-termux.sh
```

Open http://127.0.0.1:3032. On first install, `pkg install -y git nodejs && git clone https://github.com/dan3s2020/MagicPerspective.git`.

## What is actually trained

- The shape head learns from held-out teacher path masks **only during explicit supervised training**.
- The observation head learns to forecast unseen tiles before local sensor reveal. Its inputs are frozen before observation. Labels are real local observations, not privileged world maps.
- The effort head predicts future action cost; its inputs are frozen before action. Labels are observed actual effort.
- The three heads share one neural encoder, so experienced contradictions change future shape probabilities even without oracle labels.
- Training collects additional live rollouts besides supervised snapshots. Manual exploration updates the brain and persists to `v3/data/live-checkpoint.json`.
- The existing Dijkstra graph decoder still creates connected candidate routes. The neural model itself is **not** a fully learned planner.

## Correct metrics

- **Initial BCE:** frozen at the start of the episode (oracle path from initial state).
- **Current BCE:** recalculated from the current state (different target; cannot directly compare with initial).
- **Anchored BCE:** always evaluated against the *same original reference path*; comparison can be affected by organism location and is not a rigorous standalone learning score.
- **Neural correction Δ:** change in current shape probabilities from weight updates alone, with the same post-observation belief and location before/after the update.
- **Online vs frozen control:** same initialized model, equal world seeds; evaluation clones both. Neither learns from oracle labels during the episode. Lower cost is better, but improvements are not assumed.

## Commands

```sh
cd v3
npm test
node scripts-benchmark.mjs 400 11
node scripts-online-ablation.mjs 400
```

## Caveats

The observation head may learn low-information priors; coupled online adaptation could worsen shape prediction or navigation. Distinguish sample count from genuine insight. There is no automatic discovery of new dimensions, graph/SAT transfer, or proof of P=NP. The teacher/human truth is used for offline supervised training and diagnostics only. See `REPORT.md` for measured controls.

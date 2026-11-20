# Pre-registered NEW native causal information-value test — Branch vs Branch, not simply absolute success

**Date 2026-11-20. This document is committed before new counterfactual training runs or scores are inspected.**

## Previous measured clue and failure

The original V42 Brain learned a real two-primitive DNA sensing chain with delayed reward on original human HS3D acceptor AG labels. On 1,600 new-but-same-source real 140nt HS3D cases: **64.44% accuracy, 61.98% macro-F1**, compared with same Brain looking fixed64 **61.69%, 55.25%**.

One-step native STOP/GO in the same original Brain then demonstrated a *partial* independent capability: `stop-real-free` on previously seen dev400 scored **63.25%/62.82% macro-F1 at 2.7025 observations**, compared with same Brain full three-observation **60.75%/59.88%**. However it saved only **9.92%** of observations, below the predeclared 15%. Explicit 5%-cost training failed: its original Brain always chose GO (three views), while destroyed-reward control collapsed to early STOP.

**Causal gap:** the old native gate learned only **the final correctness of the path it happened to take**. It never learned whether *taking the opposite STOP/GO choice* would improve its own P/N answer. This new study tests the consequence of actually learning the **relative value of information** from intervening in both branches during calibration, rather than re-running the same reward with new hyperparameters or more DNA.

## Same original organism, supervised comparison only at calibration

- Actual imported original `Brain` from `v17/transcend/torus-aether/devour/brain.mjs`, `Brain.live`, `Brain.predict`, original native `LeanC` cap6, A2, R2/R3 off; same one-organism instance and seed20261120. No secondary trainable critic/Q-model, PWM action selector, Python V5 `Organism5`, Qwen donor or altered original source.
- Use exactly the old human HS3D 140nt AG acceptor original TRAIN split and source SHA `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`. Same **1,200 original class-supervision records** (7 real viewport observations per row) and **1,000 original delayed two-step primitive action-feedback calibration episodes**; freeze/no label leakage during decision.
- NEW counterfactual calibration: only **first 500 actual source training-calibration rows** (balanced 250P+250N) are used for *real action-intervention comparisons* to limit global native-learning interference. Each case is physically evaluated, with original Brain and **no learning until after the physical observations**:
  1. Force STOP immediately (one actual genomic view) and have original Brain predict P/N.
  2. Reset the physical body, force original primitive move 1 and STOP (two real views), original Brain predicts.
  3. Reset, force original primitive movements 1 and 2 (three views), original Brain predicts.
  In steps 2–3 the actual primitive decisions and P/N predictions remain the ORIGINAL Brain's own, but calibration forces which branch (STOP vs GO) to explore. Exact biological ground truth is consulted **only after these three original-native predictions** to score actual consequences of taking the alternate action. This is **supervised paired counterfactual exploration in training**, not self-discovered experimental design, no oracle labels on unseen eval examples and no claims of unsupervised action vocabulary invention.
- Native state for gate choice: exactly the existing original C6 physical-current four true DNA bases + stage/native P-belief bucket (one byte) + hypothetical gate action `g`/ `s`. At inference, original `Brain.predict` ranks expected `+` vs `-` reward on these six bytes before moving.
- At each of two positions (initial view and after one original primitive), the environment creates two *real observed counterfactual experiences*, STOP and GO. **The same original Brain.live** receives both actual acted-state/action/outcome trajectories, eight bytes each, only after environment has compared their real P/N class predictions. The genome DNA of the unselected branch never enters evaluation choices.

## PRE-FROZEN THREE causal training arms (same 500×2×2×8=16,000 native reward bytes)

1. **`paired-advantage`**: native preference is determined by which physical action yields HIGHER score `correct(0 or1)-0.08×numberOfExtraViews`; at stage0 compare STOP(1 view) versus GO(3-view full path); at stage1 STOP(2 views) versus GO(3 views). If equal utility choose STOP (precommit tie rule); native reward `+` for preferred action, `-` for other. This credits *marginal useful observation*, not just final absolute success.
2. **`paired-absolute`**: same observed alternate physical worlds and exactly the same 16,000 feedback bytes, but assign `+` independently if the corresponding action's eventual predicted P/N is correct and `-` otherwise; **no relative comparison or marginal observation cost**. This separates counterfactual exposure from advantage-specific reward.
3. **`paired-destroyed`**: same physical counterfactual observations and bytes but both signs independent of biological true class and action consequences. Negative control.

### Frozen comparison and success gates

- Evaluate ONLY original Train-derived **400 previously examined development samples**, NOT the prior 1,600 used during architecture decisions or previously opened official Test. This is a **new mechanistic exploratory test**, not a virgin external confirmation.
- Original-native policy STOP/GO decisions at stage0 and stage1, unobserved physical bases inaccessible until an actual GO movement; per example read 1–3 real 4nt viewports.
- F1 macro primary, accuracy, class-wise confusion, number of real 4nt observations, stage-specific STOP/GO positions, actual primitive composition, and full per-example original-native probability/reward trace.
- Same Brain forcibly GO twice (3 views), one-view, simple margin >=0.8, deterministic random stopping. These read-only counterfactuals use the *identical* original Brain state after each training arm.
- To call useful stop invention: **mean observations at most 2.55 (>=15% saved)**, accuracy loss no more than **1.5 pp**, macro-F1 loss no more than **2 pp** versus matched full-budget, nonconstant conditional STOP/GO on actually seen DNA/belief, and better than destroyed/absolute feedback and simple threshold where budgets permit.
- **Failure** if always STOP or GO, class readout collapses, or matched baseline dominates. Report it rather than retuning the 400 already-viewed samples.

The method uses known concepts of counterfactual value-of-information learning; literature novelty **UNVERIFIED**. It does not constitute AlphaGenome 2 parity, independent genomics science, GGUF inference assimilation or an external dataset test. This experiment uses only necessary additive research code on a separate branch and does not modify V42, user checkpoints, Braivour or functioning production programs.

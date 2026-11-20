# Pretest — original Brain learns whether to STOP observing real genomic world

**Date 2026-11-20; created BEFORE ANY experiment for this new gate.**

## Actual previous empirical anchor

Original V42 Brain, not Python `Organism5`, learned two chained native primitive movements `again/undo/open/right/new/left` by delayed real success/failure on genuine HS3D 140nt human acceptor AG sites, using the same original `Brain.live/predict`. Winner on one prior frozen within-source 1600-record set: **64.44% accuracy, 61.98% macro-F1** vs **61.69%, 55.25%** same-Brain fixed64; no external biological replication. The original Brain **always paid for all 3 physical 4nt observations**. Braivour's *V4* distinction "world complete vs knows it is complete" has not been tested in the original genome body.

**NEW causal question:** does the same Brain's reward-memory learn when to terminate observation *conditionally on its own current biological evidence* (rather than always spending all 3 viewports) while retaining accuracy at lower sensing cost? This differs from learning which physical movement to make; it introduces a new endogenously chosen variable **whether another observation is warranted**.

## Original organism ownership and no leakage

- Absolutely no rewrite of original `v17/transcend/torus-aether/devour/brain.mjs`; same native `Brain.live()` and `Brain.predict()`, original C=6, A=2, R2/R3 off, seed20261120.
- The exact prior two-step **delayed-reward primitive** body is used for physical movements, unchanged. Actual real physical DNA views only at legal points [58,62,64,66,70,74,78]. Start at70; stop or continue at stages 0 and 1; stage2 must stop because physical budget exhausted.
- The environment has genuine class P/N only AFTER each episode is physically completed. The original Brain never sees unvisited DNA or correct P/N in any imagined action.
- At each stop point, four **already observed** real bases, a discrete position-in-task/stage and native Brain's OWN predicted P/N inclination determine native stop context: `[actual4DNA, stage×4+floor(4*originalPProbability), hypothetical gate action]` exactly **6** ASCII bytes. Stage0 symbols '0'...'3', stage1 symbols '4'...'7'. Gate actions: `g` (GO; execute one original real primitive) vs `s` (STOP; answer using current native P/N). Its **same original Brain.predict** estimates + vs - success for each hypothetical gate action, chooses highest; default tie -> GO.
- Native gate feedback is lived by **the SAME original Brain**: `[previous4DNA, stage/belief context, executed g/s, observed final reward +/-, newline]` with 8 symbols. Feedback is never presented before final action/class prediction. No new trained selector, external calibration model, Q-table, reward-to-label oracle or fake DNA. Reward cost is environment protocol only, not a trained external actor.
- At calibration only, deterministic SHA-exploration forces 25% stop-or-go choices; at evaluation, no exploration, no feedback.

## Frozen original HS3D source and split

Pinned `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`; original upstream **Train ONLY**, human AG acceptor 140nt P/N, central `dna[68:70]==AG` verified in all.
- First 600 P+600 N SHA-sorted unique DNA: native class supervision across 7 true 4nt physical windows; exactly 58,800 original native lived symbols.
- Next 500 P+500 N: 1,000 real native full two-step primitive action-reward calibrations with correct actual outcome, *then* 1,000 further native stop-learning episodes on SAME rows to avoid ever using evaluation truth. This reuse is **explicit** and could limit generalization.
- Next 200 P+200 N: exploratory 400-case development, **previously examined by historical studies**. No claim of virgin evaluation.
- Remaining 800P+800N indices1300..2099 **already evaluated in the previous original two-step study**; NOT used as untouched validation of this newly designed stop mechanism. Original upstream official `Test` was also previously opened and cannot be called virgin.
- No original Brain, UI, Qwen/GGUF donor or Braivour V5 Python modifications.

## Predeclared four native stop-gate controls

All have **exact same 1,200 original supervised examples, identical 1,000 original two-step delayed credit episodes, same seed and primitive vocabulary**:
1. `stop-no-train`: no gate-feedback living; untrained STOP/GO policy.
2. `stop-real-cost`: 1,000 gate calibration episodes, real reward; *additional observation cost* = 5 percentage points of reward success per actual extra view, imposed by predetermined SHA pseudo-random conversion of a would-be correct '+' to '-'. It is a prospective expected utility cost, not the organism's class prediction.
3. `stop-real-free`: same genuine 1,000 gate calibration episodes, but **zero** additional-observation cost, to isolate the effect of sensor cost.
4. `stop-shuffled`: 1,000 gate calibration episodes, feedback sign independent of the true classification and utility, same gate exposure style; destroys causal reward pairing.

The already-trained original primitive policy can be affected by gate `Brain.live` (global shared state); report that, and compare every gate **against its own identical frozen Brain** forcibly executing both primitive movements, not against another arm's score.

## Fixed evaluation and falsification before output

On all 400 development sequences with biological truth hidden at action choice:
- original-native autonomous STOP/GO before first and second movement;
- number of true 4base observations (1,2,3), mean observation cost, stop-location histogram, stage/own confidence bucket, action and final P/N prediction per case;
- binary accuracy and **macro-F1 primary**, exact confusion, class recall/precision and movement-pair counts.
- matched **same-Brain full-budget 3-view** counterfactual (force GO twice), matched **1-view no-movement**, deterministic 1/2 stop randomized protocol (same native Brain), and simple native confidence-margin rule `STOP if |2q-1|>=0.8` at stage0/stage1; all counterfactuals are evaluation-only, not action-selection supervisors. Calculate each baseline's real view counts.
- For native gate result, require **at least 15% average view reduction** from full budget, **accuracy within 1.5 percentage points and macro-F1 within 2pp** of SAME-BRAIN full-budget, and performance at least matched simple confidence control at comparable sensing cost. If no such result, do not claim useful native stop ability.
- Decision behavior must depend on actually seen biology/belief on many cases, not collapse to ALWAYS STOP/ALWAYS GO or only another fixed constant. If it collapses, classify as negative even if it accidentally saves cost.
- The original two-step capability from prior experiment is a separate validated within-source reference; do not quietly replace user goal with stop-gate score.
- Q1 **global literature novelty UNVERIFIED**; generic RL and stopping policies are known. Q2 **single original organism** passes iff original Brain is both observer, native action selector and learner, including physical movement and stopping. No independent GGUF assimilation, AlphaGenome2 head-to-head, gene/homology disjoint data or biological discovery claimed from binary HS3D.

**This is an exploratory new capability; to claim success beyond dev, a fresh independently sourced and properly isolated biological dataset will be required.**

# PRE-REGISTERED: original Brain models physical genome action -> success as its OWN lived transition

**Date:** 2026-11-19. Novel causal mechanism compared with previous V42 native `ConstructedPathLearner` reward-weights experiment; *not* simply new data or extra epochs. The previous actual original native pathPolicy changed weights but chose position58 on all 400 development cases after 200/1000 calibration examples (64.75% accuracy), while the same native classifier at fixed upstream66 scored 70.25%. This motivated a different original-organism sensorimotor prediction mechanism.

## New original-native mechanism

Same **original V42 Brain**: genuine `Brain.live()`, `Brain.predict()` and original C/A/geometry, native C cap5, native off R2/R3; no added learned prediction head, external classifier, oracle label route, synthetic DNA or separate bandit weights.

The organism first observes the actual four nucleotides in the fixed starting viewport [70:74] of a real human AG acceptor sequence (all sequences have AG at [68:70], true/false hidden).

It then **imagines the expected reward for each candidate physical action** before moving. Candidate action symbols `1..6` represent human-declared possible movements to original physical genome positions **[58,62,64,66,74,78]**. Native reward expectation is the SAME ORIGINAL Brain's `Brain.predict([initial four observed bases, hypothetical action symbol])` (C cap5), **not** a new classifier. Reward symbols are `+` for true prediction after movement and `-` for wrong; choose action with the highest internally predicted probability of `+`, with ties by prespecified action order. No nucleotide from any candidate destination enters the decision. These are a fixed known action set, **not autonomously invented genomic coordinates**.

**Actual native feedback:** during calibration, with deterministic 25% exploration, organism executes ONE real chosen movement, sees only the chosen four genuine DNA bases, uses the SAME original `Brain.predict([position symbol, 4 observed bases])` to predict P/N, and ONLY AFTER its answer is evaluated is the binary action outcome `+` or `-` revealed. The exact original `Brain.live()` then lives the observed state/action/outcome trajectory **`initial4 + actualActionSymbol + actualRewardSymbol + newline`**, allowing its own original C/A and memory to learn a transition law. No teacher selects a best action for it and no correct-class byte is given in this reward-stage world. Calibration action choices are its own predictions with deterministic exploration, NOT provided by an oracle.

At frozen development evaluation the same original Brain predicts action reward, physically moves to one actually unseen viewport, classifies using original native class prediction, and is never shown the true class or outcome reward until scoring outside the Brain.

The competing earlier original `ConstructedPathLearner.pathPolicy` is not used as the selector in this mechanism; this test specifically isolates **native Brain-internal reward-transition prediction**.

## Frozen data

Source `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`, authentic human HS3D acceptor TRAIN ONLY, 140nt P/N and conserved central AG. Deduplicate DNA and cross-class label contradictions. SHA sorting `hs3d-acceptor-transfer-v1:+dna`.
- First **600 true +600 false**, interleaved: native original Brain supervised learns all seven actual physical 4nt viewports, each `[positionToken,real4Bases,observedP/N,\n]` (as earlier active experiment). No learned external classifier.
- Next **500 true+500 false**: calibration. All used only in real action/outcome trajectories, no biological P/N class byte provided to `Brain.live` in this stage.
- Next **200 true+200 false**: frozen **400-case development** evaluation. No official upstream acceptor `Test` checked out, no test-truth supplied at inference.
- Biological coordinate and DNA integrity asserted; unobserved candidate bases must not be used by action selection.

## Frozen experimental matrix

Three independent original Brain runs:
1. `reward-zero`: no action-reward calibration, original native policy at initial state (negative baseline).
2. `reward-200`: first 200 real calibration episodes.
3. `reward-1000`: all 1000 real calibration episodes.

Exploration: deterministic SHA(`"native-reward-explore:"+DNA`) bucket modulo4 == 0, 25% rate, action chosen by another SHA bucket among the same six; only during calibration, not development.

Metrics: macro-F1 first, accuracy, balanced accuracy, 400-case confusion and per-example original action trace, selected-position histogram, positive/negative reward counts, original Brain's **lived symbol count before/after** calibration, original native expectation scores, initial70/fixed64/fixed66/random same-native-Brain controls, proportion of actual positive outcome among calibration actions. All actual native decisions use just **two** 4nt viewport observations per development example. Frozen controls may be evaluated read-only after the native decision but are not part of the native observation budget.

**Success requires** reward-calibrated native Brain to improve over reward-zero and initial70/random on development; equal or worse than fixed64/fixed66 must be disclosed. Any biological discovery or AlphaGenome2 competitiveness still requires new independent genomics assays, tissue state and quantitative variant effects.

This is **not** a proof of autonomous new action-space invention, not a teacher-produced action label, and not a direct test against AlphaGenome 2. No original code, other user processes/checkpoints, GGUF Qwen donor or main branch is changed.

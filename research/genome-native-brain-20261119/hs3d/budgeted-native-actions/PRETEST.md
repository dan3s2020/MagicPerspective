# Pre-registered NEW original-native bounded-active biological viewport navigation

**Date:** 2026-11-19. New causal capability beyond the previous unbounded 12-window scan and beyond simple GT->AG transfer. Original HS3D human acceptor **AG** true/false labels, all 140nt, from the upstream repository `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`. `Test` is NOT checked out here.

## Biological and computational motivation

- The original V42 Brain learned authentic GT true-vs-false donor distinctions on official HS3D Test at 79.18% accuracy but lagged simple 4/20nt PWM.
- In real human **AG acceptor** development data, a separate scientific PWM control found positional predictive signal in **four upstream nucleotides: 79.25%**, whereas four downstream bases scored only **62.25%**. The 20nt PWM measured 89%. These controls are not part of the organism.
- Direct donor->acceptor native state transfer on the original after-motif 4nt view gave no stable positive effect. The real unresolved problem is **where the original organism learns to move its sensory body**, rather than feeding it a hand-selected best DNA section.
- Prior donor-side native `ConstructedPathLearner` policy scored 81% on exploratory dev with **all 12 real candidate windows inspected at inference**. That did NOT demonstrate active sensing under a limited action budget.
- NEW question: can the original native organism, receiving only the initial viewport and its own beliefs, learn from feedback to **choose exactly ONE additional unobserved real DNA viewport**, and improve compared with the same native classifier acting on the initial/fixed/random views?

## What the original organism does itself (and what remains human-defined)

The **exact original** `Brain.live()`, `Brain.predict()` and **same original Brain-owned** `ConstructedPathLearner.learnTransferable()`/`transferableScore()` are used. Original `Brain` and all source equations unchanged. Its persistent `brain.body` records real physical movements and reward history. No separate trained network, PWM predictor, scripted decision labels, synthetic DNA, hidden correct action or goal-state oracle.

**Physically navigable world:** a true 140-base acceptor sequence. At training, original Brain learns seven real positional observation/action contexts (positions `70` initial and six possible next moves **[58,62,64,66,74,78]**; observation is one symbolic position token plus actual four nucleotides). Training label is revealed only after each supervised observation; 1,200 authentic TRAIN rows. All candidate positions are available *for training*, but no test label is passed in prediction.

**Calibration:** original Brain frozen. First inspect only initial physical window **[70:74]** after known AG [68:70], obtain native Brain P/N beliefs. Before looking at any other genome bases, native `ConstructedPathLearner.transferableScore()` ranks six possible *unobserved* physical move actions using a fixed 6-D feature of (a) known body location, (b) the original Brain's current own P/N probability and margin, (c) possible movement distance/direction and simple geometry. The original learned policy chooses ONE action. 20% deterministic exploration is allowed **only in training calibration**. Observe only selected four actual bases, let original `Brain.predict()` output P/N, reveal the actual correct class **after** prediction, then feed binary reward into original `learnTransferable()` for **only the executed physical action**. No unobserved target-window nucleotide can enter action selection and no answer enters action features.

**Test/development:** freeze both native Brain and native policy. Repeat initial viewport, native action selection, second selected viewport and answer with **two total real view observations**, one actual movement action. No exploration, no label feedback, no training. The outside grader compares to genuine label after frozen answer.

The action feature (recorded before outcome): `[1, (pos-70)/16, initialMargin, -(1-initialMargin), clamp(.5+.5*((pos-70)/16)*(2*initialQ-1),0,1), 1-min(1,abs(pos-70)/18)]`. The 4th index is a **native-belief×direction interaction**: unlike prior all-view search, there is a principled route for conditional selection based on the *actually seen initial* sequence without observing the target. Features are chosen by the researcher, not discovered autonomously, and are not a new trained predictor.

## Frozen source, split and matrix before results

Acceptor true/false genuine 140nt, conserved AG at [68:70] verified for all, exact sequences conflict/duplicate excluded. Each class SHA-sorted by `hs3d-acceptor-transfer-v1:+dna`. TRAIN-only rows:
- first **600P+600N** (1,200): native original Brain supervised training, all seven true viewport observations;
- next **500P+500N** (1,000): eligible *calibration* (no Brain training; native pathPolicy receives only executed-action success);
- next **200P+200N** (400): frozen *exploratory development* evaluation, never fed to Brain or pathPolicy.
Require >=1300 valid distinct rows per class; never download official acceptor `Test`.

Three original-native action policies, same underlying Brain training:
- `native-zero`: zero calibration episodes, original pathPolicy weights initial.
- `native-200`: first 200 calibrated genuine sequences, 20% exploration.
- `native-1000`: all 1,000 genuine calibration sequences, 20% exploration.

**Scoring:**
1. primary native two-view action policy macro-F1 (P/N);
2. accuracy, balanced accuracy, per-class confusion/precision/recall;
3. identical Brain fixed initial70, fixed upstream64 and fixed66, deterministic random additional action, native belief confidence-only (the confidence-only comparator may inspect all six, and is separately labeled as 6-view non-budget-matched);
4. number of true view observations **per actual native prediction**, number of original native action rewards, exact learned six-dimensional policy weights, chosen positions, original native learned symbol count, per-case action/probability traces.

**Scientific gate:** The mechanism succeeds as *budgeted native perspective learning* only if 200/1000-calibrated native policy improves over its uncalibrated policy and initial70/random view on the frozen 400-case development set. A stronger but still unconfirmed claim would require matching a fixed64 baseline under equal budget, an independent external biological cohort, and repetitions. No claim of arbitrary view discovery: action space and feature semantics were human-authored.

**No AlphaGenome 2 benchmark, no causal variant prediction, no tissue-conditioned gene expression, no genome-scale state.** Any negative result is reported rather than hidden. Old original user branches, checkpoints, Qwen/GGUF donor, UI, CUDA and main are unchanged.

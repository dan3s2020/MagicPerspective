# PRE-REGISTERED: genuine original V42 Brain learns two-step primitive COMPOSITIONS from delayed real genomic feedback

**Date:** 2026-11-20. **This file was committed before any new 2-step composition CI outputs.**

### New question, distinct from previous attempts

Braivour Discovery Maze V5 (actual `Organism5` Python, NOT V42) found a modest but repeatable gain after learning compositions of primitive moves `untried,open,undo,...` rather than receiving a scripted `sweep`/pair-test. Our previously completed **original** V42 native reward transition on real human AG acceptor DNA chose only one physical movement; on independent official acceptor n=1096 it reached **72.45%** versus same Brain fixed64 **72.81%**. We have NOT tested *two-step primitive composition + delayed causal credit* inside the original Brain on actual DNA.

The V5 Python result must **not** be copied as a purported native Brain measurement. Only the experimental hypothesis of *compositional action learning* is borrowed. This new experiment measures a functional capability of the same original Brain.

### Exact original organism and real sensory world

- Original imported `Brain` at `v17/transcend/torus-aether/devour/brain.mjs`, genuine `Brain.live` and `Brain.predict`; native A depth2, built-in off R2/R3, native `LeanC` cap6; no new separately trained controller, classifier, PWM, model donor or substitute Brain.
- Real original HS3D **human acceptor AG** 140nt sequences, P/N actual source labels, pinned to `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`. Only original upstream **Train** files are checked out. Central `dna[68:70]==AG` asserted in all scored rows. No synthetic DNA.
- Native P/N class learning: first 600 P and 600 N authentic source records. Seven real 4-base views at positions `[70,58,62,64,66,74,78]`, each `positionToken+fourActualBases+trueClass+newline` lived by the same original Brain. This supervised phase matches the previous 2-view action system's genuine data. All class truth hidden during action selection and development evaluation.
- Reward calibration: next 500 P and 500 N authentic human examples, in deterministic SHA-sorted interleaved order; **never** insert biological P/N truth into the native reward trajectory. Environment uses truth only after two actual movements and original `Brain.predict` final answer to compute `+` (correct) or `-` (wrong).
- Frozen exploratory development: next 200 P and 200 N from upstream Train, exact real DNA disjoint from both training and calibration. This TRAIN-derived dev has already been examined for previous methods; its labels cannot establish an independently blind confirmation.
- No official acceptor Test scores in this run: its records have been examined in a prior original action study, so cannot be called untouched for architecture selection.

### The NEW mechanism: the original Brain chooses a composition of two physical primitive moves

Starting native viewport position70, the agent sees **only four real DNA bases at position70**. Its physical body has a list of previously seen positions/uncertainty, not the DNA of unvisited positions. Its permitted primitive **meanings** are provided by the researcher (as V5 provided meanings):
- `again`: stay and reobserve the current real position;
- `undo`: return to the previous visited physical position;
- `open`: revisit the **seen** position at which the original Brain was least certain;
- `right`: next allowed physical coordinate to the right;
- `new`: nearest physical coordinate never visited (tie goes left);
- `left`: next allowed physical coordinate to the left.

The allowed physical positions `[58,62,64,66,70,74,78]` are **human-specified**, known to the environment but not their actual bases until visited. The agent may choose exactly TWO primitives, after which the original Brain classifies at the real last 4-base view. It thus obtains **3 real observations** total, as against 2 in the old one-step experiment.

For action 1 and action 2, the original same `Brain.predict([fourActuallyObservedBases,previousPrimitiveSymbol,candidatePrimitiveSymbol])` produces its internal probability of action success `+` versus failure `-`. The highest predicted `+` action is executed; ties use the fixed ordered primitive list above. After the first movement, the second action decision is conditioned on the ACTUAL newly seen bases and previous action symbol, not on hidden candidate bases.

Only after the original Brain has predicted P/N at the second destination does the environment reveal success/failure to it. The **same original `Brain.live`** learns experiences `[fourActuallyObservedBases, previousPrimitiveSymbol, executedPrimitiveSymbol, rewardSymbol, newline]`. This is original Brain memory, not V5 Python Q-table. Neither action has a teacher-chosen "best move". The control `shuffled` deliberately destroys reward–outcome pairing.

### Exact frozen five-arm experiment on 400 real dev examples

1. `chain-zero`: 0 calibration episodes; original untrained action sequence prior.
2. `chain-last`: 1,000 calibration episodes, live one **last-action success/failure** trajectory only.
3. `chain-last-repeat`: 1,000 episodes, live the last-action trajectory **twice** (exposure-count control).
4. `chain-delayed`: 1,000 episodes, live both first and second action trajectories with same final actual reward (the explicit V5-inspired delayed credit mechanism).
5. `chain-shuffled`: 1,000 episodes, live both actual-action trajectories with deterministic **independent fake reward** instead of actual success, a broken-causality negative control.

All share identical 1,200 supervised records, seed `20261120`, native Brain source and world, original class training. Deterministic 25% action exploration for calibration ONLY, derived from SHA256 of actual DNA/step; no exploration or rewards on frozen development.

### Reporting and falsification

Report native 400-case **macro-F1 primary**, accuracy, balanced accuracy, confusion, per-class precision/recall, exact pairwise primitive-composition histograms, actual physical destinations, percent second choices contingent on previous primitive/observed bases, 3-real-view budget, original lived-symbol counts, true versus shuffled reward counts and full per-example original-native traces.

Compare on each **same trained Brain** with (i) fixed physical view64, (ii) fixed66, (iii) start70 only, (iv) two random primitive moves using the same 3-view budget; all controls must remain read-only and cannot set the native policy. Check for training interference: if an apparent gain over zero is explained by changes to the class predictor instead of action choices, label such effect explicitly.

- **Positive mechanism:** delayed true reward produces qualitatively different two-action sequences and higher F1 than zero, last-only, exposure-matched last-repeat and shuffled, plus at least random comparator.
- **Failure:** remains static, regresses or does not beat controls; document negative.
- A result on old HS3D Train-based development is **exploratory**, NOT a new untouched official confirmation.
- No assertion of V5 being physically transferred, no Qwen inference assimilation, no AlphaGenome 2 prediction, no fully autonomous invention of primitive meanings, no worldwide novel RL algorithm claim.

**Original code and checkpoint non-regression:** all original Braivour/MagicPerspective source and prior branches untouched; new file and workflow only in isolated branch. This is a new original-Brain causal step-construction test, not a rerun of `DISCOVERY-MAZE-V5-PRIMITIVES`.

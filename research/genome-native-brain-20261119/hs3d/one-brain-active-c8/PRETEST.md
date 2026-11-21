# Pre-registered original ONE Brain active primitive movement AND native C8 view fusion

Date 2026-11-21. This experimental contract is committed before any execution of this new mechanism.

## Real discovery gap

Two separate original V42 Brain findings were verified on actual human AG acceptors:
- Native original C6 Brain learns to **choose two physically executed genomic actions** from delayed real classification feedback, but its final class prediction used only the final four observed DNA bases (HS3D frozen n1600 64.44% accuracy, later different source DRANet 62.81%).
- Native original C8 Brain learns to **fuse two actual four-base observations** into a single class prediction (frozen different-source DRANet n1600 70.31% accuracy, 70.10% macro-F1). A same-Brain first-view causal swap on external n1600 changed 330 predictions and reduced accuracy from70.31% to66.56%. But this C8 fused classifier used the manually fixed second position64, not an autonomously selected physical action.

Neither above experiment is this new task. Do NOT rerun Python Braivour V5, C6 historical replay, STOP gate, VOI, fixed C8 fusion, SHA256 worlds or old action-only scripts as a disguised new discovery.

## New native whole-body mechanism

Use precisely ONE object of unchanged original `Brain` (same original `Brain.live`, `Brain.predict`, `LeanC`, A/geometry and learned memory), with existing `c.cap=8, depth=2, off=["R2","R3"], seed=20261121`. No trained separate actor, classifier, PWM, reward tabulation, supervised action oracle or modified original source.

The actual body begins by observing ONLY true 4nt `dna[70:74]` of a real human 140nt acceptor, and has 2 primitive movement steps `again,undo,open,right,new,left` over human-defined legal destinations [58,62,64,66,70,74,78]. At each step, original `Brain.predict` evaluates each hypothetical primitive's native learned positive outcome mass conditional on only the **currently actually seen** four bases, previous real primitive code and candidate primitive code. The original C8 state is exactly `"!!"+currentObserved4+previousPrimitive+candidatePrimitive` (8 symbols), where `!!` is a fixed WORLD/ACTION-CHANNEL sentinel distinct from genuine ACGT data; it does NOT reveal target DNA.

After the original Brain selects the primitive, the environment executes it, and only then reveals the actual destination's four true DNA bases. The second action repeats with updated actually seen DNA and previous action code. After exactly TWO real physical primitive moves (3 total real view exposures), original SAME `Brain.predict` receives the real 8-base sensory context `dna[70:74] + dna[finalPosition:finalPosition+4]`, combining initial and final actually observed DNA from the same human record. The primitive's final position is NOT chosen by the human during evaluation. The class `P/N` is chosen before its truth is revealed.

Only AFTER final original native class prediction, the world's true P/N label determines success `+`/failure `-` of the TWO actions. Native `Brain.live` learns each actual action->outcome trajectory `"!!"+currentSeen4+previousPrimitive+chosenPrimitive+reward+"\n"` (10 symbols), in same chronological order. One optional condition also lets the same original Brain learn its **actually encountered** genuine 8base start+final viewport followed by true P/N and newline (10 symbols), after making its prediction; this is authentic additional supervised real genomic feedback. No teacher chooses the optimal move. This "learn from your own observed body" feedback is distinct from earlier C6 32-symbol history replay: the final C8 class prediction uses two actually observed physical 4base views directly.

The learner receives genuine class truth during the ordinary initial supervised train and optionally at the end of its **training** physical episodes (never during development/external evaluation). Stop/multimodal donor/target quantization and AG2 are not in this experiment.

## Exact frozen data/method

Pinned original human HS3D acceptor Train only, OluwadareLab/EnsembleSplice commit e04aa5aeb4035adac9ce6c65c2143c2ef7163332. Authentic 140nt P/N, conserved `AG` at [68:70]. Same deterministic SHA sort as former studies, remove exact duplicate and conflicting label DNA. **600P+600N** initial native supervised learning, one real paired `[70:74]+[64:68]` view per example and true P/N byte + newline, **12,000** `Brain.live` symbols, equal across arms. First source indices600..1099 per class, **500P+500N** genuine real calibration episodes, 25% deterministic SHA exploratory primitive choice per step during calibration ONLY. Development source indices1100..1299/class, exact **400** genuine source-balanced rows, already examined many times before: **exploratory ONLY**.

Five predeclared modes, no post-hoc retuning on external:
1. `active-zero`: SAME original Brain initially class-trained C8, no action or extra class feedback; original native uncalibrated action choice, paired final class prediction.
2. `active-delayed`: 1,000 actual physical outcomes, true delayed reward to BOTH real action trajectories; no extra true class labels in calibration.
3. `active-shuffled`: exact same action experience count but reward sign deterministic and unrelated to biological class correctness (causal broken negative).
4. `active-delayed-class`: true delayed native action outcome AND additional supervised true P/N paired context at the REAL final destination, after both physical actions completed; one true extra labeled native 10-symbol record per calibration world.
5. `active-shuffled-class`: same extra true paired class feedback and number of learning tokens, but rewards completely unrelated to actual action success.

All learned action feedback is native `Brain.live`; no outside trained policy. All modes share EXACT source and seed, original `Brain` source and native C8 context. Initial 12k native symbols plus 20k action-reward and 0/10k on-policy class-feedback symbols, depending on arm. The zero arm has only initial 12k and is a baseline. Counts explicitly disclosed as unequal between class/no-class arms; only equal-exposure within delayed-vs-shuffled and within delayed-class-vs-shuffled-class are causal controls.

During 400 dev, original Brain itself chooses both primitives and final P/N using only its actual viewed bases, with development biological truth hidden until external scoring. Evaluate same frozen original Brain read-only controls with FORCED fixed final 64 (human baseline), forced66, initial70+70, and 2 deterministic random original body primitives, all with actual observed 3-view budget (except initial baseline). Compute each original Brain P/N and macro-F1 primary, accuracy, balanced, confusion, actual native action-pair histogram, final selected physical position histogram, number of changed locations, reward and train accounting, and actual first+final native sensory context per case.

**Success (new native combined ability):** must demonstrate an original Brain actually executes **non-constant physical action choices** and the final native C8 class predictor depends causally on BOTH really observed views; active action+fusion must improve macro-F1 and accuracy over original same-Brain fixed64 and randomized movements on real biological external source. Even if C8 fixed64 is better, report active fusion is NOT superior; preserving native fusion alone is not a claimed victory.

**Critical limitation:** same historic HS3D dev previously examined. New model architecture selected on this dev cannot call its follow-up evaluation biologically virgin because DRANet has also been used in earlier research. Any later external validation must freeze mode, samples, thresholds and exact source before querying results; original DRANet source 402nt can be used solely as a source-external *zero-shot* test with exact whole-source HS3D overlap eliminated, not a family/homology independent cohort.

Literature novelty NOT VERIFIED. No automatic invention of primitive meanings, no new gene law, no human clinical utility, no AlphaGenome2 head-to-head, no Qwen GGUF donor intelligence transfer, no edits to original Brain or previous user working branches.

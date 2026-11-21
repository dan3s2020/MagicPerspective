# Pre-register: protect original native C8 perceptual memory while native internal ConstructedPathLearner learns physical actions

Date 2026-11-21. Commit before first experiment. The user requires surpassing the plateau using the actual original organism, not using an outside trained policy.

## Distinct reason for this experiment
Prior FIVE actual `ONE Brain live rewards + C8 native class` tests on same 400 reused HS3D dev are recorded in `../one-brain-active-c8/RESULTS.md`. True delayed reward learned physical destination64 in 400/400 but modified the native C classifier rule from exact:149 to fold:131 and **decreased exact same Brain's fixed64 class accuracy from74.75% to70.25%**. More actual on-policy class feedback also failed (69.75%). Shuffled-reward controls produced nonsensical actions (78 all 400, 53.75%). This is a concrete shared global next-symbol memory interference.

The original V42 `Brain` ALSO already owns `brain.constructedPaths` as an original `ConstructedPathLearner`, including its original trained `pathPolicy` and `ConstructedTransitionGraph links`. This is NOT a new separate trained actor. No original code changes.

**New causal hypothesis:** use same original Brain's **two already existing native memory compartments**: original `LeanC C8` for true paired human genomic P/N, and original `ConstructedPathLearner` for delayed causal physical action feedback. This avoids `Brain.live` with unrelated +/- reward symbols contaminating class C8. With action learning inside the SAME Brain original `constructedPaths.links.observe` and `learnTransferable`, the original `Brain.lived`, C8 selected mask and C8 fixed-view outputs MUST stay unchanged throughout policy calibration. Learned action choices must still depend only on real seen DNA, its own P/N confidence and physical action geometry.

## Genuine real human data and original native source

Original unmodified `Brain` at `v17/transcend/torus-aether/devour/brain.mjs`, `c.cap=8,depth2,R2/R3 off,seed20261121`. Original HS3D genuine P/N acceptor 140nt DNA with central AG [68:70], source commit e04aa5aeb4035adac9ce6c65c2143c2ef7163332.

Exact original SHA split as prior: train 600P+600N, calibration next 500P+500N (never for supervised P/N class in this experiment), dev 200P+200N at original Train indices1100..1299/class, historically reused and NOT virgin. No historical official Test. Dedup exact and contradictory DNA, no zero-shot claims at this stage.

Original `Brain.live` initially receives **exactly two genuine paired eight-base observations per authentic training record**: `actual dna[70:74]+actual dna[64:68]+true P/N+newline` and `actual dna[70:74]+actual dna[66:70]+true P/N+newline`, with both pair orders alternating by training row index to avoid contiguous-run systematic bias. Exactly **24,000** original native class lived symbols; original C8 selects its own mask. Rationale: action-selected positions64 and66 must BOTH be actual previously learned human class contexts, not a frozen64-only predictor that cannot score any alternative.

Physical body starts at70; legal primitive meanings `again,undo,open,right,new,left` and positions [58,62,64,66,70,74,78] are human-defined, EXACT same original body physics as the previous experiments. Each primitive chosen before destination DNA seen; physical DNA unveiled only after movement. Two native steps, then original SAME Brain `Brain.predict` sees start4 + actual final4, predicts P/N. Genome truth revealed only after final answer for calibration or external score. No fake DNA.

## Genuine native internal path learner

At each step, candidate movement geometry is known without target bases. Build a fixed six-dimensional original `ConstructedPathLearner.transferableFeatures` from **already observed** native Brain's own P/N confidence, distance toward annotated AG junction, novelty (is destination already visited), and step terminal status. This is researcher-defined sensory feature encoding, **not a supervised correct-move label**. Score candidate via the native existing `brain.constructedPaths.transferableScore` plus native learned relative reward evidence from its **original** `brain.constructedPaths.links.choices(state)` for the actual observed coarse physical state; no outside Q table, model/weights or hidden correct action.

During calibration only, deterministic 25% random primitive exploration per step. AFTER final P/N prediction, original `brain.constructedPaths.links.observe(state,action,"+/-")` learns actual state/action/outcome, and `brain.constructedPaths.learnTransferable(features, successful, rate=0.04)` learns the shared path policy from real delayed positive/negative feedback to BOTH real choices. No P/N truth fed into policy BEFORE action and NO global `Brain.live` on reward records. This is original Brain's documented native path/transition learning, NOT a separately instantiated learner.

At evaluation, freeze all native original learning. The exact original Brain and original links/learned weights select both real physical actions and its native C8 outputs final P/N on actual start+final 4base views.

## Frozen three-arm experiment and hard non-regression checks

1. `protected-zero`: no path-reward calibration; native original pathPolicy and graph untrained; same native C8 fixed context training.
2. `protected-real`: 1000 real physical calibration cases, delayed actual success reward for both native actions using only original internal path learner.
3. `protected-shuffled`: same 1000 real physical calibration and same number of native path policy updates, but reward is independent deterministic SHA +/- regardless of P/N class correctness.

All three class-trained Brains MUST have identical initial **24,000 Brain.live class symbols**, same original native C8 mask and same native fixed64 readout. In all arms, policy training MUST preserve `brain.lived===24000`, original C `active` unchanged and `brain.e.c.episodes` unchanged. This is the core interference prevention requirement.

Evaluation all true 400 HS3D reused dev records: genuine native chosen two actions and 3 actual physical views, original C8 final class on start+actual destination; matched frozen same-original Brain forced64, forced66, forced70 and deterministic random two-action read-only controls. Report native original action pair/position histograms, native pathPolicy weights, number links learned, actual pathPolicyUpdates, class mask, primary F1 macro, accuracy, per-class confusion, and class prediction dependence on first view after the new training. Count any dynamic versus static movement: if all case decisions identical, **NO learned conditional policy**. Label leakage impossible since truth is accessed only after final native prediction.

**Primary success:** actual original protected policy improves over the SAME frozen Brain fixed64 AND random two-action baseline on both macro-F1 and accuracy on genuinely source-external human data after mode selection is frozen, while demonstrating some conditional action differences. In dev-only, higher accuracy is exploratory and not enough. If it learns just a fixed64 route and ties the matched baseline, preserve the negative without claiming the above-ceiling capability. If native C8 class stayed fixed while the action changed, isolation was confirmed but not necessarily a utility success.

**Novelty** beyond prior work: a single original native organism's built-in transition graph now learns physical action rewards without destructive symbol-memory sharing, paired with a real native C8 trained on multiple physically legal destinations. This is NOT generic novel RL, not Python V5 repeated and not a separate model.

All source changes additive under a new branch. No external file edits, no donor GGUF or AlphaGenome 2 comparison, no claims of independently discovered primitve meanings, clinical predictivity, independence between gene families, or verified whole 140nt regulation.

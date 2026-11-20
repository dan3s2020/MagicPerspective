# First original-Brain-native two-step primitive action compositions, genuinely learned from delayed real genomic feedback

**Research date:** 20 November 2026  
**Status:** 5 actual exploratory native experiments **COMPLETED**, then 3 pre-frozen native confirmation controls on **1,600 previously unscored records** **COMPLETED**. All in GitHub Actions.  
**NOT:** AlphaGenome 2 superiority, donor Qwen/GGUF assimilation, new biological gene law, independent species/laboratory replication, spontaneously invented primitive meanings, or full Braivour discovery-maze V5 code port.

## Why this is a NEW scientific question

Braivour Python Discovery Maze V5 reports that its `Organism5` toy-world learner composes primitive actions and decreases world-discovery steps by 16–28% on unseen constructed worlds. It is *not* the original V42 Brain; its score/reward uses the known hidden structure of designed worlds. Original V42 on real human HS3D acceptors had previously learned **one** chosen action based on native predicted success (official 72.45% accuracy on 1,096 actual AG acceptors vs fixed64 same-native 72.81%). But that did **not** establish that the original Brain can use *two physical actions as a learned composition*.

This experiment uses the **real original Brain** to learn with exactly this causal difference:
- a true human acceptor sequence is a physical world, not synthetic;
- the original Brain first observes 4 actual nucleotides at position70;
- it imagines success of six possible primitive movements via its own `Brain.predict`, with no candidate destination DNA;
- it executes **one primitive**, genuinely observes its four destination bases, and **chooses a second primitive** conditioned on its new actual observation and previous action;
- it reads only that second destination's four real nucleotides, makes its own P/N prediction;
- only then does the world reveal whether this two-action sequence succeeded or failed;
- its same original `Brain.live` learns physical action→outcome trajectories. The *delayed* arm credits **both actual steps**, not just the last.

The allowed primitives are *authored semantics*, not independently discovered by the organism: `again, undo, open, right, new, left` over permitted physical bases [58,62,64,66,70,74,78]. The body state `visited` tracks only observed view positions and native class-belief margins; no unseen destination bases enter native choice. Native action prediction is based on the last 4 actually seen DNA bases + previous action code + proposed action code in original V42 `LeanC` cap6. No separate Q table, NumPy organism, learned action classifier or helper PWM performs native decisions.

## Real input and safeguards

Pinned public HS3D human acceptor dataset: `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`; only original upstream `Train` files checked out in these experiments. Original source has 2,200 true and 2,200 false sites; after excluding repeats, **2,197 P and 2,190 N** distinct real exact 140nt sequences, all with conserved **AG at dna[68:70]**. No new DNA labels manufactured. Source SHA256:
- P: `0ab13d13acd8c1078762eec1469703458da9f5bffea8c523b6338c775ea3f43e`;
- N: `7c8172f967c361c4377ecdb5bfbedccd76e75e3303ec590123b3dee61453babd`.

Exact within-source partitions, SHA256 ordered by `hs3d-acceptor-transfer-v1:+dna`:
- 600P+600N first => supervised native `Brain.live` across 7 actual physical 4nt windows per record (**58,800 lived symbols**).
- Next 500P+500N => native action-reward experience, **1,000 real calibration episodes**, 25% deterministic exploration per physical step only in training.
- Next 200P+200N => 400 **exploratory development** samples (the dataset's general development pattern had been examined by previous agents).
- Before examining a new result, [frozen configuration and method-selection contract](./FROZEN_CONFIRMATION_PRETEST.md) committed: lock winner by macro-F1.
- Additional **previously unscored 800P+800N = 1,600** records, indices 1300–2099/class in the same sorted TRAIN source => **one-shot within-source confirmation** of the frozen delayed mechanism vs predeclared causal controls.

These are sequence-disjoint between these partitions but not verified family/chromosome/homology-disjoint. The historical HS3D *official Test* was already opened by another earlier experiment; it is explicitly **NOT** reused to claim untouched validation.

## Part 1: five mechanism arms, human acceptor exploratory n=400

| Original Brain native action feedback | Accuracy | Macro-F1 | Mechanistic note |
|---|---:|---:|---|
| No reward feedback | 51.75% | 51.50% | chooses `again → again` and remains at70 on all400 |
| Last physical action gets success/failure | 59.00% | 51.42% | 64 on316/400; one-action credit only |
| Last action feedback repeated twice (equal symbol exposure) | 50.00% | 33.33% | entire native class readout collapses to N |
| **Both real actions get delayed final-outcome feedback** | **63.75%** | **60.84%** | 64 on342/400; 66 on55; 70 on3 |
| Both actions get scrambled outcome feedback | 48.00% | 45.94% | chooses `right → undo`; remains at70 all400 |

For delayed-arm SAME Brain after reward training, read-only matched physical counterfactuals:
- native two-step **63.75% accuracy, 60.84% F1**;
- fixed position64 **61.00% accuracy, 54.42% F1**;
- initial70 **48.75%**;
- random two primitive steps **50.75%**.

The original `Brain.live` changed its actual physical choices; true delayed feedback beat same-length terminal repetition and scrambled feedback on this previously-seen development split.

**Executed run:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44652215730  
**All five raw aggregate outcomes and action histograms:** [results/five-arm-original-Brain-real-DNA-exploratory.json](./results/five-arm-original-Brain-real-DNA-exploratory.json)  
**Actual script:** [run.mjs](./run.mjs). Full 400 per-record movement traces are in CI artifacts for each arm.

## Part 2: pre-frozen 1,600 NEW exact DNA records from same HS3D collection

The explicit 1,600-case partition and selected action mechanism were committed in [FROZEN_CONFIRMATION_PRETEST.md](./FROZEN_CONFIRMATION_PRETEST.md), commit **`759886c6adb03ae655e2a6f925168c37e2e9900c`**, BEFORE the new CI action was created.

On real 800 P + 800 N, exact same original native Brain algorithm, hyperparameters, seed and physical action primitives:

| Native Brain approach (new within-source n=1,600) | Correct | Accuracy | Macro-F1 |
|---|---:|---:|---:|
| **Two-step delayed REAL success/failure credit** | **1,031** | **64.44%** | **61.98%** |
| Fixed physical position64 read-only on the SAME delayed-trained Brain | 987 | 61.69% | 55.25% |
| Random two physical primitives read-only on SAME Brain | 838 | 52.38% | 52.20% |
| Both transitions lived with **unrelated (shuffled) reward** | 874 | 54.63% | 53.32% |
| Equal-lived-count terminal-only reward repeated | 800 | 50.00% | 33.33% |

**Key measured conditional:** delayed-native policy **+44/1,600 correct** (+2.75pp accuracy, +6.73pp macro-F1) compared with the same original reward-trained Brain looking at fixed64. It also retains a clear margin versus scrambled and repeated-terminal feedback.

Original native learned physical primitive pairs on these 1,600:
- `left → left`: 471 cases;
- `left → new`: 582;
- `new → new`: 229;
- `undo → new`: 233;
- `new → left`: 72;
- `undo → undo`: 13.

End locations chosen **without any unobserved DNA or class labels**: position64 **1,354**, position66 **233**, position70 **13**. The no-reward baseline had not learned this multi-step behavior. Full native confusion on 1600: `P:{P:719,N:81}; N:{P:488,N:312}`. Positive recall **89.88%**, negative recall **39.00%**; high false-positive rate for P remains a serious limitation, and the N balanced F1 does not match specialized biological models.

**Executed one-shot frozen run:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44652776169  
**All measured 1,600-case controls and physical-action histograms:** [results/frozen-native-two-step-1600-human-acceptors.json](./results/frozen-native-two-step-1600-human-acceptors.json)  
**Frozen runner:** [run-frozen-1600.mjs](./run-frozen-1600.mjs)  
Original raw 1,600 per-example traces were saved in GitHub Actions artifacts.

## What is interesting, and why it is a real but limited advance

1. **Actual original organism, not the Python V5 substitute.** Same original `Brain.live` learns real two-step action histories; same original `Brain.predict` selects BOTH actions, with no hidden target fed in the state. The sequence of primitive choices is not scripted as a pair, sweep or correct genomic position.
2. **Delayed causal consequence matters.** At equal lived trajectory exposure, repeating only the final action collapses; providing arbitrary unrelated reward fails too. This is stronger evidence than just training longer on the same DNA.
3. **Real action compositions persist on new source rows.** The same learned primitive combinations occur on 1,600 previously unused sequences, with improvement versus its own fixed64 counterfactual. This is a *within-dataset* replication.
4. **Not necessarily biological knowledge outside local motif.** It uses only three actual windows of 4 bases, with a high number of false P alarms. It is not a full 140nt integrated model, a variant-effect predictor, or genomic regulatory model.
5. **Information and compute are tightly bounded.** The native actor is limited to three actual genomic viewport observations and two body actions. However, *total learning compute* includes original supervised views, 1,000 calibrations and a cap6 exponentially enumerated candidate mechanism. No FLOPs/energy/speed advantage was measured.

## What we may NOT infer

- **NO AlphaGenome 2 head-to-head.** AG2 predicts complex condition-specific sequence-to-function quantities. Its benchmark accuracy cannot be compared to a binary motif-conditioned 140nt task.
- **No donor intelligence ingestion.** V5 Python and real Qwen donor-probe results are separate historical work. Nothing here tests Qwen internal execution or autonomous fluent chat.
- **No universal new reinforcement-learning invention.** n-step credit and compositional policies exist in machine-learning literature; global novelty is unverified. This experiment is specific to this original computational organism.
- **Human authored primitive meanings and positions.** The organism discovered action **combinations**, not the action vocabulary, arbitrary genome coordinates or whole genomic worlds.
- **No independent biological replication.** Both development and confirmation come from the same HS3D source. Homologous sequence or gene-family similarity across partitions could inflate apparent transfer.
- **No post-hoc statistical significance claim.** Paired confidence interval/McNemar on exact sample-level native versus fixed is not yet computed from archived CI per-example traces. +44 successes is an observed difference, not an estimated population effect.
- **Matched Brain matters.** The 61.69% fixed64 comparator is under the delayed-trained native Brain state; other native Brain training configurations (including earlier official donor or AG acceptor) can have very different fixed64 scores. It is not evidence of outperforming **all** fixed perspectives or the external 20nt PWM.

## Next genuinely different mechanism to test (NOT EXECUTED HERE)

Braivour V4 found that a world can be *complete* before the organism *knows* it is complete. V5 disabled its stop primitive. The next **nonduplicate native organism question** is to train a confidence-calibrated **native STOP/OBSERVE** action with 1–3 real viewports and an explicit *cost/accuracy tradeoff*, preventing premature stop while possibly saving observation work. Compare equal risk-coverage against a simple threshold on the original Brain's P/N margin, random stopping and fixed full-three-view. Do not claim that the body has learned a new biological dimension simply by rendering a geometry visualizer.

A stronger later scientific gate needs a genuinely external measured biological variant-effect dataset with gene-family-disjoint splits, official matched AlphaGenome 2 API outputs and full uncertainty reporting.

## Exact references and user non-regression

- [Braivour original Discovery Maze V5 README](https://github.com/dan3s2020/Braivour/blob/experiment/ORIGINAL-BRAIN-LIVES-WHOLE-INFERENCE-LOOP-20261111/research/discovery_maze/README.md)
- [Braivour complete discoveries index](https://github.com/dan3s2020/Braivour/blob/experiment/ORIGINAL-BRAIN-LIVES-WHOLE-INFERENCE-LOOP-20261111/docs/DISCOVERIES.md)
- [Preregistered exploration experiment](./PRETEST.md) and [pre-frozen within-source validation](./FROZEN_CONFIRMATION_PRETEST.md).
- All changes are **additive**, in the isolated `research/HS3D-NATIVE-TWO-STEP-DISCOVERY-20261120` branch. Original user Brain/V41/V42/V43/Braivour, active Qwen/GGUF donor pipelines and checkpoints are **unchanged**.

**Bottom line:** measured and replicated within the same HS3D source: an original computational organism can learn a composition of physical genomic observation primitives using *delayed outcome feedback* that outperforms several causal controls and its own matched fixed-view predictor. It is meaningful progress on active sensing, not AlphaGenome 2 parity or independent real-world biological discovery.

# V31 — Million-State Original Attraction, Persistent Brain, Real Text Acceptance

Date: 2026-11-07
Branch: experiment/V31-MILLION-STATE-ORIGINAL-ATTRACTION-20261107
Parent: V30 research commit 136c4231ef8b33e59fb9159ea14d28ce81212746
Status: TESTED RESEARCH, NOT OPEN-ENDED LANGUAGE PRODUCTION ACCEPTANCE.
Original V17 Brain, Discoverer.shape(), Discoverer.shapeGraph(), CUDA, UI and original checkpoints are NOT modified. Nothing merged to main.

## Actual code added

- v17/research/text-hypermaze/scalable-original-attraction.mjs: value-ordered sparse execution of the SAME 0.97*conductance*maximum-next attraction relation with native 1e-12 update threshold.
- v17/research/text-hypermaze/scalable-log-attraction.mjs: log(V) execution of the mathematically equivalent original equation, preserving gradients beyond the legacy numeric threshold. Supports fully validated lazy/indexed large graphs.
- v17/research/text-hypermaze/native-persistent-causal-atlas.mjs: opt-in atlas adapter using REAL original Brain instance, same native maze-trained attraction, existing StateDependentTextAxes learned operators. Witnessed before/after pairs saved directly in Brain persistentCausalAtlasEvidence, restored by Brain.save/load. Emits predicted first path and full graph atlas, observed-derived non-path transitions and potential values.
- v17/tests/v31-scalable-original-attraction.test.mjs
- v17/tests/v31-million-original-log-attraction.test.mjs
- v17/tests/v31-persistent-native-causal-atlas-large.test.mjs
- v17/tests/v31-real-openthoughts3-144-native-answers.test.mjs
- .github/workflows/v31-large-native-original-attraction.yml

Existing source imported unchanged: original Brain, Discoverer, playExercise, learned-axis navigator, original 5D model, original text state-dependent axes and history, original V29 native Q/A model. The evaluator's hidden physics never enters path computation.

## Public CI evidence

FINAL GREEN before this documentation:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42358614248

Native tests: 3+3+4+2+5 = 17/17 PASS.
Real human OpenThoughts3 Q/A ingestion and heldout scoring software test: 1/1 PASS as a measurement, but true answered questions 0/24.
18/18 software tests PASS; no misleading claim that real semantic QA passed.

Preserved red runs:
- https://github.com/dan3s2020/MagicPerspective/actions/runs/42358297551 : original real dataset sample contained duplicate questions; benchmark was corrected to deduplicate BEFORE training/test assignment.
- https://github.com/dan3s2020/MagicPerspective/actions/runs/42358578808 : a regression TEST incorrectly asserted the original 1500-step path worked; original returned no path. The expected test condition was corrected, original source untouched.

## Result A: exact original parity

Original Brain Discoverer trained via 26 real simulator maze episodes. Goal attraction 0.95238095238; traversable floor conductance 0.99757281553.

From 1380 witnessed action transitions, unchanged LearnedAxisNavigator discovers six relevant channels hidden among 256 noisy observed channels. Reachable world of 720 permutation states and six learned actions.

- Original native Discoverer.shapeGraph versus sparse original equation: 240/240 EXACT full preaction paths, 240/240 optimal learned shortest paths; max floating potential difference 0.
- Original versus log-domain equation: 100/100 EXACT full preaction paths; max value difference 1.11e-16.
- No hidden world action or reference answer supplied to the planner.

## Result B: 104,400 states

720 symbolic states × 145 temporal layers = 104,400 nodes and 730,080 directed learned-action/temporal edges.
Four heldout start/goal queries: 4/4 complete paths predicted BEFORE any action, 4/4 shortest, independently physically executed.
Path lengths 145, 148, 149, 150.
Host CPU planning time about 50 to 124 milliseconds per query depending on run.
The 144 temporal advances are a supplied, structured controlled action, NOT natural-language meaning learned from real text.

## Result C: real long-path regression and solution

A traversable chain of 1501 nodes / 1500 actions with the same Brain's learned conductance.
- Original Discoverer.shapeGraph(): NO FULL PATH.
- Sparse exactly mimicking original update epsilon: NO FULL PATH.
- SAME original equation in log-domain: 1500/1500-step COMPLETE PATH.
- Potential at origin approx exp(-49.3803735363)=3.5840681484e-22; native threshold 1e-12 discards the field before it reaches the start.
The log method changes only numerical representation, not the learned action laws nor original attraction equation.

## Result D: more than a million nodes

720 learned core symbolic states × 1400 temporal layers = 1,008,000 navigable states.
Learned-symbolic directed edges 6,048,000; temporal edges 1,007,280; total 7,055,280.
The topology is fully validated and indexed lazily, not partially shown or artificially restricted to a winning path.
Full ORIGINAL equation in log-space computed first complete 1403-action path before movement.
1399 controlled temporal advances + 4 independently physically executed original learned actions arrived at the exact specified goal with shortest plan.
Measured 320 to 517 ms hosted CPU, depending on runner.
This is ONE large heldout world test, not an unlimited stochastic or natural-language proof.
Numerical goal was given by test environment; no independently inferred human semantic answer.

## Result E: persistent actual native Brain with full text atlas

18 witnessed paired textual numeric transitions in existing locally affine language model (input format x @ y ~ z), training x=2..4 and y=3..5.
Evidence is held INSIDE the SAME original Brain and .v8 checkpoint, not a fake replacement model.
1800/1800 previously unseen initial typed numeric text-state and goal tasks solved before action and independently executed:
- 600 goal changes +1 in dependent z;
- 600 goal changes -1;
- 600 goal changes +2.
Unseen text start 12 @ 16 ~ 192, goal dependent z+1, predicted 12 @ 16 ~ 193 using four learned transformations.
Complete bounded graph: 1793 observed-action-derived nodes and 4276 edges, all inspectable; 4272 non-path edges retained.
Checkpoint saved and reloaded all 18 training pairs, identical complete path, complete atlas; original Brain unchanged.
Goal delta and numeric-token structure are PROVIDED by typed task API; this is not autonomous English question understanding.

## Result F: 1,024,000 actual learned text actions

500 unseen starts × 2048 ordered physically executed text actions, all using existing observed-transition fitted action motor.
Predicted final states with original learned path-history signed-area model: 500/500 correct.
Endpoint-only control: 0/500 correct. Wrong history-correction sign: 0/500 correct.
This supports history-dependent causal prediction in a RESTRICTED numeric locally affine field. The signed-area identity is mathematically programmed; coefficients are learned. No new physical dimension/fractal/quantum effect is demonstrated.

## Result G: real diverse human natural-language Q/A — strict failure gate

OFFICIAL OpenThoughts3-1.2M Hugging Face public dataset viewer API; sampled windows 0, 210000, 810000.
156 actual source rows, two duplicate question rows rejected BEFORE split; 144 distinct examples retained.
120 genuine Q/A training examples, 24 genuine frozen heldout examples.
Training raw JSON bytes 6,868,353; witnessed 49,911 genuine question tokens and 1,699,733 answer tokens.
120/120 training cases were long-form, where native QARoleAxes stores sequential answer CHUNK HASHES, but does not infer semantic state transformations.
No learned Q/A role axes (0); heldout complete first-goal paths 0/24; exact full unseen long-form answers 0/24.
17 heldout queries exceeded original 128-token QA model query limit; remaining seven had no learned QA transform.

This exposes a specific model gap: the present long-form learner records trajectories but cannot derive reusable semantic state/action/goal laws. The scalable original shape engine cannot create missing meaning or repair a wrong/absent target.
The 18 passing CODE tests are NOT a claim of natural-language comprehension.

## Limits / falsifications

- Approximately perpendicular vectors in 12,288-dimensional space do not imply independent concepts or zero inference interference. Prior V30 five-seed whitening improved frozen native text in only two seeds.
- The 1M state graph uses a synthetic temporal product with observed learned symbolic permutations. Real free-form text semantic topology not proven.
- The native text causal atlas currently supports typed numeric locally affine grammar, not general long-form text.
- OpenThoughts heldout is genuinely FAILING despite real data ingestion: 0/24 exact.
- No GPU/CUDA or Windows GUI acceptance claimed; all V31 hosted tests were CPU Node.js 22.
- Original UI, original model binaries and checkpoints never overwritten; experimental branch only.
- No fabricated natural QA scores and no hidden answer injected in plans.

## Actual commands (Node.js 22 in V31 root)

    node --test v17/tests/v31-scalable-original-attraction.test.mjs
    node --test v17/tests/v31-million-original-log-attraction.test.mjs
    node --test v17/tests/v31-persistent-native-causal-atlas-large.test.mjs
    node --test v17/tests/v31-real-openthoughts3-144-native-answers.test.mjs

Existing real-data Windows OpenThoughts runner remains at v17/START_REAL_OPENTHOUGHTS_HYPERMAZE.ps1 (unchanged). It verifies the user-provided actual JSONL file and runs the original native CPU streaming server; IT DOES NOT automatically use V31 numeric causal atlas or log route solver and it is not accepted as complete semantic QA.

## Required scientific next gate

Collect ACTUAL natural-language state/action/successor experience; learn meaning-bearing transformations and explicit unknown/wall rules from training only; retain full long text context; infer target from natural questions without answer labels; compose action operators with genuine path history; pass learned complete topology into the V31 original-equation log attraction field; independently physically verify true full heldout answers and compare against old Q/A baseline, approximate retrieval, wrong-axes, shuffled-history, and no-noise controls.

Until this is demonstrated on real public unrestricted Q/A above 0/24, do NOT claim MagicPerspective already has universal semantic navigation.

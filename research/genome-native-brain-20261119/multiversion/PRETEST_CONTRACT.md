# Pre-registered native-method comparison — 19 November 2026

## Exact task and scope
User: "IA CONTINUA SA TESTEZI CU TOATE METODELE DE PRIN BRAIVOUR SI MAGIC PERSPECTIVE,UNELE VERSIUNI POSIBIL SA FIE CHIAR MAI BUNE"

**Experiment** (not a claim of universal search): investigate whether *different actual versions and built-in native Brain mechanisms* change generalization on the same authentic UCI 60-nt splice dataset.

## Original-code inventory (read from GitHub; not invented)
1. MagicPerspective V42 Fast original `Brain`, `EmergentChain`, `LeanC`, `AligningGraph`: branch `perf/V42-FAST-EXACT-CPU-RESUME-V41FAST-20261107`, Brain blob `0d39045c44736c1565bf4210ae793bad6bcafa33`.
2. MagicPerspective V43 native *Brain* source on `feature/V43-NATIVE-V42-ONE-UNIVERSE-20261108`, blob `728797bceecae86b9e0aa88125593aba8b2529a2`; load actual checkout, not a simulated V43.
3. MagicPerspective 3SAT real-hypermaze branch `experiment/V42-3SAT-REAL-HYPERMAZE-20261107`, native Brain blob `b9ae5248d42ab7ff7d5ff2dbfe1c4d87f1266f34`; load actual checkout, not a renamed V42.
4. Braivour `native-v43/fused-one-universe.mjs`: implements real donor-dependent V43 fused original-Brain action; genuine frozen GGUF donor and its atlas required, not available in CI. Do NOT replace with synthetic vectors and report simulated outcomes as genomics.
5. MagicPerspective `src/model.js` (V1 ShapeNet) is a 2-D maze-cell feature learner; cannot be called a DNA classifier without replacing the task-specific input/output mechanism. Exclude from *strict native DNA* comparisons but record this reason.
6. V17 `PerspectiveLearner` is egocentric four-direction frame alignment; V17 `Discoverer.shapeGraph` requires observed graph and known target-kind attraction. No native unknown DNA-label target is presently defined; avoid supplying hidden class as a shape target.
7. V17 `ConstructedPathLearner`, `ObservedTransformations`, and `TextPerspectives` are actual original built-in organs, but require task-native interaction/observation protocols to be a fair label predictor; do not silently replace them with a hand-coded genomic classifier.
8. Braivour `brain_world.py` and GGUF adapters are not equivalent to the same original Brain blind splice classifier and their reported donor semantics are not validated on this biological task. Record as NOT_EXECUTED rather than pretend they were tested.

## New causal question (distinct from prior manual viewpoint experiment)
With **identical information and fixed 900 genuinely labeled training examples**, does *which original-native organ/learner configuration and actual source-branch version* processes that information cause meaningful differences in blind DNA class predictions, or does performance reduce to a fixed four-base motif irrespective of the original mechanism?

No replacement learned head, no second trained model, no synthetic DNA, no assumed donor brain. Only already-implemented native Brain mechanics, with different actual branch checkouts where warranted.

## Version/method matrix (predefined BEFORE result viewing)
- v42-c4 — original V42 EmergentChain depth 2, native C cap 4 (exact prior baseline).
- v42-c16 — same native learner, C allowed up to 16 temporal positions (capacity intervention).
- v42-c32 — same native learner, C cap 32 (remote evidence capacity intervention).
- v42-c-only — original native C, depth 0 (native A ablation).
- v42-deep-a — original C plus 4 native A organs.
- v42-blend — original native blend-sensory wire geometry in A.
- v42-log — original native log-time BINS wire view in A.
- v42-concept — original native concept/geometry wire view in A.
- v42-align — original AligningGraph.write rather than chain.play as readout; unrecognized symbols count as *incorrect*, not silently mapped.
- v43-native — actual V43 original Brain from the V43 GitHub branch.
- v42-3sat — actual original Brain from the 3SAT hypermaze branch.

All training: same original UCI data checksum, ordered first 900 eligible training records, same 60nt invertible genomic observation, exact supervised label supplied only in training to the **same organism**, same seed `20261119`, no test labels passed during prediction. No count or label leak.

Selection metric on **existing 400-example development set: macro-F1**, highest wins, ties broken first by balanced accuracy then by fixed list order. We do **not** pick winner using old 197 confirmatory rows or new withheld evaluation.

## New never-used final confirmation (commit before tests)
Original UCI dataset has **2,408 unique records in its train-eligible group partition**, of which only the first 900 have previously been fed to `Brain.live`. To obtain independent-from-training *new* confirmation within the same dataset:
- from `trainRows.slice(900)`, retain only rows whose source identifier `group` does not occur in first 900 train rows;
- exclude duplicate DNA with any training record and duplicated final DNA;
- score all remaining eligible records **once**, only after the development-based winning method is frozen;
- report exact resulting count (not guessed), group count, class counts and SHA256; not an independent cohort or species;
- never use this final subset for selecting new architectures or designing subsequent revisions.

This can be a *within-dataset group-disjoint confirmation*, **not** independent homology-family holdout, and should not be oversold.

## Stop/go and non-regression
- Native variants may show no differences: document negative outcome, do not relabel as discovery.
- Version `Brain` SHA differences need not imply different genomic behavior: actual results decide.
- Preserve main, old V42, V43, Braivour branches/checkpoints; all new code only in dedicated research branch.
- For all experiments: record raw confusion, macro-F1, balanced accuracy, class coverage, invalid native emissions and test-label boundaries.
- Never compare 60nt UCI splice accuracy directly to AlphaGenome 2 regulatory/variant-effect metrics.
- Only one-shot final confirmation after frozen winner. No per-version peeking at final data.
- Novelty of any generalizable causal mechanism over literature remains **UNVERIFIED**; this is a constrained mechanistic comparison, not a claimed new method of GGUF intelligence assimilation.

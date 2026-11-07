# Graph #0: real holdout axis-control experiment + real training-plateau audit (2026-11-07)

This is a continuation of the frozen V17 graph #0 self/fself investigation. It does NOT alter working V17 code, the V17 launcher, native Brain weights, CUDA training or the original save folder.

## User's exact observed real-checkpoint facts

Source snapshot SHA256: 84f8603243fb38abc47461302376ad4580b20ab45247fc905284d24ba0c3404e.
- The 6-arm fixed 240-byte experiment completed 24 native text generations on the user's saved V17 model.
- At T=0.6, repetition (8-gram) averaged 76.2876% unchanged, 80.9013% without self, 50.8584% without fself, 0.4292% without both, 72.4249% at half self/fself, 74.6781% at half fself.
- Without both, all four different questions yielded the SAME answer and 225/240 singleton-candidate steps; avoiding loops by eliminating nearly all choices is not sufficient.
- The frozen geometry counterfactual had 112 learned symbol locations, 111209 bytes in AligningGraph memory, and unchanged selected next-character paths after perturbing the 5D positions. This confirms a specific POLICY disconnect in the NATIVE CHAT generator, not an absence of geometry throughout the entire organism.

## Real unseen test: DOES adding geometry to the next-byte choice help?

Native scripts:
- v17/experiments/graph0-heldout-axis-core.mjs
- v17/experiments/graph0-heldout-axis.mjs
- v17/experiments/RUN_GRAPH0_HELDOUT_AXIS.ps1

The experiment loads a COPY of the saved V17 checkpoint. It reads the original parquet files with the repository's native openTextDataset(), and uses only its 16 reserved rows, not training rows. Selection may exclude held-out prompts longer than maxChars.

Each scored step predicts before observing that step's actual symbol. It measures:
- original AligningGraph distribution alone, native top-1 exact-char;
- direct geometric LivedField distribution alone;
- weighted ALIGNED/FIELD blends at 10%, 25%, 50% and 75% field;
- a control in which the Geometry.U coordinates are temporarily collapsed, the learned FIELD memory is rebuilt using those collapsed coordinates, and the same withheld texts are rescored;
- answer-only accuracy, answer-only mean negative log2 likelihood, whole-text accuracy and FIELD coverage.

This is a teacher-forced next-symbol test, NOT a goal-conditioned solver and NOT free-response semantics. These 16 reserved examples are a small exploratory set and should NOT be used to select the final trained policy and claim independent generalization.

### Exact Windows command for the saved snapshot

~~~powershell
$ErrorActionPreference = "Stop"
$dest = "D:\MagicPerspective-Graph0-Ablation"
git -C $dest pull --ff-only
if ($LASTEXITCODE -ne 0) { throw "Cannot fast-forward isolated branch" }
$copy = "$dest\v17\experiments\ablation-results\graph0-20261107-061432-dbbf7ca6\graph0-checkpoint-copy.v8"
& "$dest\v17\experiments\RUN_GRAPH0_HELDOUT_AXIS.ps1" -CheckpointCopy $copy -Data "D:\training\OpenThoughts3-1.2M\data" -Rows 4 -MaxChars 2048
~~~

Produces a unique directory under v17/experiments/axis-heldout-results with:
- graph0-heldout-axis-score.json (every withheld row and weighted score)
- heldout-axis-comparison.csv (aggregate rows per alpha).

If FIELD coverage is almost zero, the geometry cannot supply a path; that suggests a separate coverage issue in the nearest-neighbor field or sparse exposure. If FIELD coverage is large but adding geometry reduces accuracy, this implies that simply blending FIELD is not the correct target/path policy. A genuine next-step solution would require a learned goal-conditioned transition policy and validation on a separate untouched holdout.

## Training plateau: use actual historical frozen test scores, not intuition

Native files:
- v17/experiments/graph0-plateau-core.mjs
- v17/experiments/graph0-plateau-audit.mjs

~~~powershell
$dest = "D:\MagicPerspective-Graph0-Ablation"
$log = "D:\MagicPerspective-Full-Training\log.jsonl"
$out = "$dest\v17\experiments\axis-heldout-results"
node "$dest\v17\experiments\graph0-plateau-audit.mjs" --log $log --out $out --graph 0 --window 12
~~~

The algorithm computes the slopes of ALIGNED, live/graph, FIELD, together, C and masked by millions of observed characters. It only permits a plateau candidate if the last window contains >=5 points spanning >=500000 characters, with an absolute slope below 0.5 percentage points per million characters. A plateau is a property of an observation window, not a proven mechanism, and no points are generated or extrapolated.

## CI verification / limitations

Native synthetic checkpoint, native real-format Parquet fixture and Windows PowerShell 5.1 command were used in CI. This tests code and mechanics, NOT the user's actual local checkpoint. The original checkpoint comparison must be performed on the existing frozen copy. A valid negative control is the geometry-collapsed run; the original native ALIGNED-only predictor must stay unchanged.

Current causal chain:
- We have a confirmed disconnect from Geometry.U to AligningGraph.write().
- User's actual model exhibits excessive singleton next-character states and repetitive loops.
- Whether adding existing geometric FIELD evidence improves actual held-out answers is NOT YET KNOWN.
- Whether FIELD sparse coverage, limited GPU context, limited legacy FIELD exposure, or a missing explicit goal policy causes the unseen plateau remains open until the controlled tests are run.

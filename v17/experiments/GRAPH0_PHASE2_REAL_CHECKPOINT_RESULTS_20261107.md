# REAL Graph #0 — Phase 2 empirical report, 2026-11-07

## Provenance

The user executed RUN_GRAPH0_PHASE2.ps1 on a frozen COPY of the actual native V17 OpenThoughts3 checkpoint:
- original snapshot SHA256: 84f8603243fb38abc47461302376ad4580b20ab45247fc905284d24ba0c3404e
- checkpoint copy: D:\MagicPerspective-Graph0-Ablation\v17\experiments\ablation-results\graph0-20261107-061432-dbbf7ca6\graph0-checkpoint-copy.v8
- phase2 output: D:\MagicPerspective-Graph0-Ablation\v17\experiments\phase2-results\graph0-phase2-20261107-063500-7306dd95\
- same seed 20261107, max=240, T=0.6, stopBlank=false, learn=false, same frozen model, 4 different prompts.
- 2/2 local phase2 unit tests passed.
- checkpoint original unchanged.

## Real checkpoint: 8-character repeat fraction per question, percentages

| Policy | "so" | E[v]/S_v | own graph | two plus two | mean four |
|---|---:|---:|---:|---:|---:|
| full | 72.5322 | 83.6910 | 83.6910 | 65.2361 | 76.2876 |
| no-self | 72.5322 | 83.6910 | 83.6910 | 83.6910 | 80.9013 |
| no-fself | 50.6438 | 51.5021 | 50.6438 | 50.6438 | 50.8584 |
| no-self-fself | 0.4292 | 0.4292 | 0.4292 | 0.4292 | 0.4292 |
| half-self-fself | 38.6266 | 83.6910 | 83.6910 | 83.6910 | 72.4249 |
| half-fself | 72.5322 | 83.6910 | 83.6910 | 58.7983 | 74.6781 |

Summary:
- Removing self alone made the mean worse, from 76.2876% to 80.9013%.
- Removing fself alone reduced repetition to 50.8584%, but still repeated a lot and did not produce convincing different answers.
- Removing both almost eliminated repeated-8-grams, but yielded the identical output for all prompts and 225/240 singleton-candidate steps. This is path diversity COLLAPSE, not useful improvement.
- Source-score contributions are causal to which text is written, but the tests do NOT identify the original mathematical quotation as intentional self-diagnosis.

## Real checkpoint: geometry policy-wall intervention

The read-only 5D counterfactual logged:
- AligningGraph historical memory length: 111209 bytes.
- 112 symbols with learned geometry coordinates.
- allOutputUnchanged=true.
- allSelectedPathsUnchanged=true.
- coordinateMapChanged=true.
- checkpoint SHA256 unchanged.

Therefore, in NATIVE CHAT AligningGraph.write, changing 5D coordinates cannot steer the chosen text path. This does NOT imply no 5D dependence anywhere else: LivedField.read accesses geometry, and FIELD/TOGETHER unseen scores can depend on it.

## New exploratory heldout test (implemented but not yet measured on THIS checkpoint)

- graph0-heldout-axis.mjs: uses openTextDataset's actual withheld 16 Parquet rows.
- scores aligned distribution alone versus weighted geometric FIELD distribution (0,0.1,0.25,0.5,0.75,1.0).
- checks answer-only top-1 accuracy and log-loss, field coverage, and collapsed-geometry control.
- actual native Windows runner: RUN_GRAPH0_HELDOUT_AXIS.ps1; checkpoint and original training remain immutable.
- CI regression uses a SEPARATE synthetic checkpoint + a real-format synthetic Parquet fixture; CI success does not establish improvement on actual OpenThoughts3.

## Scientific conclusion

1. Native V17 text generator has a demonstrated 5D-policy disconnect and severe repetition/available-successor concentration in this checkpoint.
2. Neither the 5D disconnect nor self/fself ablation alone establishes why real unseen accuracy plateaus while training progresses.
3. A valid "opens the missing axis" intervention must improve reserved unseen answer accuracy without selecting on heldout rows and without collapsing different prompts onto one output. Free-generation semantics and actual goal/path planning are distinct validation stages.
4. The snapshot reflects 111209 characters in the alignment memory, NOT completion of all 1,199,984 training exercises.

# HS3D donor experiment — official TEST gate frozen before first evaluation

Date: **2026-11-19**, before GitHub Actions official Test checkout and evaluation.

**Evidence basis**: Authentic pinned EnsembleSplice HS3D human 140nt donor data, SHA `e04aa5aeb4035adac9ce6c65c2143c2ef7163332`. The dev matrix ran on the upstream **TRAIN only**, with *NO access to files under* `ENSdatasets/hs3d_bal/Test` in the CI checkout. See successful workflow https://github.com/dan3s2020/MagicPerspective/actions/runs/44612785045 and archived all-mode JSON [native-12-human-donor-dev.json](./results/native-12-human-donor-dev.json).

**Predefined selection metric:** development **macro-F1**, n=400, balanced true/false. We tested exactly the twelve pre-registered original-native V42 variants and four-nucleotide views. Select **exactly one winner now**:

- **Frozen winner: `R2R3-off-down72`**.
- Original `Brain.live` / `Brain.predict`, original `EmergentChain`, native C cap4, A depth2, `off:["R2","R3"]` built-in flags, original seed `20261119`, 1,400 **authentic** labeled 140nt HS3D training rows (700 true + 700 false), lossless input reorder making original nucleotides **72,73,74,75** the final four symbols before native prediction.
- Development accuracy **83.50%**, macro-F1 **83.2979%**. Confusion true P: 189 P, 11 N; false N: 55 P, 145 N. No independent testing yet.
- Second: `R3-off-down72`, 81.50% accuracy / 81.3315% macro-F1; other modes lower.
- All 400 development sequences contain central GT at indices70..71, as do all 1,400 training sequences. Therefore high accuracy **cannot be explained solely by presence of the consensus GT dinucleotide**. However it may be explained by a simple learned positional motif adjacent to GT: no 140nt long-range mechanism has been demonstrated.

**Official untouched Test, one-shot only:** checkout exact upstream pinned public HS3D **Train AND Test** donor FASTA files; original script `run-native-donor.mjs` with `HS3D_TEST_UNLOCK=FROZEN_NATIVE_VIEW`, **mode R2R3-off-down72** only, `--phase=test`. Train the same 1,400 original train rows, never train on official Test; remove identical-sequence overlap with training or dev according to the frozen script, report exclusions and test class balance, per-class recall/precision, macro-F1, accuracy, exact confusion, original raw predictions, and GT motif coverage.

**Independent controls:** always true/always false (majority), constant central GT, simple biologically motivated positional PWM (if added: additive Laplace, positions 60..80 or all140, fixed decision at log-likelihood ratio zero, trained on the same 1,400 authentic training rows; cannot be inserted into the original Brain). Official HS3D test is an externally authored partition of the same dataset, NOT guaranteed gene-family-, homology- or chromosome-disjoint.

**No forbidden claims:** No AlphaGenome 2 benchmark, no tissue conditioned expression, no clinical use, no functional variant effect or automatic selection of perspective. If GT false-site classification generalizes, it is a *reproducible short-context biological classification result* to motivate, NOT prove, native self-directed perspective discovery. Do not tune a new perspective or change threshold based on any official Test failure.

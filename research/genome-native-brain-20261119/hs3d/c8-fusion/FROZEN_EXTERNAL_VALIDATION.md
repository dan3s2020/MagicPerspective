# Frozen C8 real dual-viewport organism — preselected before new source-external run

**Date 2026-11-21**. Selection based only on the predeclared real HS3D Train-derived **400 development** rows, never on the DRANet source in this study.

Development CI: https://github.com/dan3s2020/MagicPerspective/actions/runs/44919874765. Results stored as results/original-native-C8-four-controls-20261121.json.

Exact original V42 Brain, native C8 context, A2, R2/R3 off, seed20261121, trained on 600P+600N human AG splice acceptors for **12,000 Brain.live symbols**. One-to-one biological genuine views per input.

Preselected primary mode: **joint-70-64-c8**, two actual four-base views [70,74) and [64,68), giving 74.75% accuracy / **74.1077% F1 macro**, versus:
- **single-64-c8**: 71.75% accuracy / 71.6989% macro-F1;
- **joint-70-64-scrambled-c8**: 70.25% / 69.1660%; first-view bases from a DIFFERENT labeled source record (negative-control corruption; no biological claim);
- **joint-70-66-c8**: 71.50% / 70.5996%.

The active original LeanC mask for real joint70+64 was **exact:149** (binary mask selects native context offsets 0,2,4,7; it references both actual physical 4base views), a mechanistic but not sufficient proof that final P/N depends on the first.

## Previously unopened BY THIS NEW METHOD, source-external verification

Pin the public **DRANetSplicer homo acceptor 402nt** files to repository commit `fe300cd8e4a55471268e1271621df208430157a5`. Original files `data/dna_sequences/homo_acceptor_positive.txt`, `homo_acceptor_negative.txt`. All genuine human DNA.

Use 402nt exactly with canonical ACGT and `AG` at [200:202]. View only 140nt center crop [132:272] which preserves `AG` at cropped [68:70], same as HS3D. Remove **all exact 140nt DNA overlapping ANY real HS3D original Train positive/negative sequence**, not only original 1200 learning samples; exclude cross-label contradictory, duplicated external. Deterministically choose first **800P+800N** SHA-ranked as in previous external source reference, identical external rows across modes.

**Freeze exactly 3 modes** before external outcome:
1. real **joint-70-64-c8** (selected on dev F1);
2. original-native cap8 same-symbol **single-64-c8**;
3. destroyed association **joint-70-64-scrambled-c8** (cross-record first view as actual negative control).

Every mode retrains an identical original native Brain from scratch on the same 1200 HS3D training examples (no external data/labels in training), fixed seed, exact same 12,000 symbol count, same original code and no modified selection hyperparameters or thresholds. Then scores ALL same 1600 external cases, label hidden from Brain at inference. Report per-class recall precision, macro-F1 PRIMARY, accuracy, full confusion, native selected mask across input views, 1600 per-row raw predictions in CI, original source file checksums and exclusions.

Pre-registered **positive gate:** same frozen real joint70+64 must beat same-setup single64 AND the scrambled first-view control on external macro-F1 and preferably accuracy. If advantage disappears, report **development-only / external transfer failure**, no overclaim.

This is a different independent public file source, not proven gene-family/chromosome/homology independent; DRANet source was already used by earlier C6 model research, so the **source itself was not historically virgin**, although the new C8 model hasn't yet been evaluated on it. No AlphaGenome2 prediction, variant-effect benchmark, AGI, discovery of new genomic coordinates, or Qwen donor assimilation. Preserve all working branches and code untouched.

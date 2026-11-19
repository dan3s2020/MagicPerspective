# HS3D donor splice-site real-data new causal experiment — pre-registered before results

**Date:** 2026-11-19.
**New task:** discriminate **true vs false HUMAN donor splice sites**, where both can contain the SAME central GT donor motif. The old UCI EI/IE/N result exactly equalled GT/AG after full training. This HS3D test asks a new question: can the ORIGINAL native MagicPerspective Brain use real **outside-motif context** to distinguish true from false motifs?

Source: OluwadareLab EnsembleSplice, public repository https://github.com/OluwadareLab/EnsembleSplice pinned commit `e04aa5aeb4035adac9ce6c65c2143c2ef7163332`. Data path `ENSdatasets/hs3d_bal/{Train,Test}/Donor_{Train,Test}_{Positive,Negative}.txt`; FASTA-style `> seq` / 140nt. Source paper doi as in repo README. We did not invent biological truth or model outputs.

**Important biological fact:** Both the true and false donor sites were selected around a conserved central GT; this sets a much harder task than merely recognizing canonical GT/AG. Validate `dna.slice(70,72) === "GT"` in both classes and report coverage. GT-alone accuracy cannot exceed a majority-class baseline on balanced data. Do not silently filter difficult exceptions to raise performance; instead record counts.

**Method:** actual imported original V42 `Brain.live` / `Brain.predict` (native `EmergentChain`, C/A, original R3 or R3-off). Entire 140nt DNA sequence is presented during training (no simulated genome); the only experimental manipulation is which real observed four-nucleotide view appears **last** in the native C=4 temporal window at decision time. This keeps all 140 original bases, in a lossless reorder, while testing original biological context responsiveness. The true class is appended only in training, never used in any frozen prediction.

**Exact development matrix to run BEFORE looking at official Test:**
- `R3-default-core70`: original native R3, last 4nt from bases 70..73.
- `R3-off-core70`: original native R3-off, same input.
- `R3-off-up58`, `R3-off-up62`, `R3-off-up66`, `R3-off-up68`.
- `R3-off-down72`, `R3-off-down74`, `R3-off-down78`.
- `R3-off-remote100`: negative control for a remote fixed 4nt window.
- `R2R3-off-up66`, `R2R3-off-down72`: factorial interaction of previously discovered original native R2/R3 mechanisms.
All positions are **zero-indexed**, and the fixed center is 70:72. This is a fixed candidate-grid screen, NOT organism autonomously discovering a perspective.

**Split:** from original official `Train` donor positive and negative sequences, sort separately by SHA256 of the DNA sequence, with deterministic salt `hs3d-donor-blind-v1`; take exactly 700 unique sequences of each class for **training** (n=1400) and next 200 of each class for **development** (n=400). Exclude conflicting labels and identical strings from both partitions. Never inspect official `Test` or select on it until method, objective and all hyperparameters are frozen in a separate committed protocol.

**Metric priority:** **macro-F1** on balanced development. Also report accuracy, balanced accuracy, precision/recall per class, confusion, and central motif coverage. Controls: majority=50% on balanced dev; GT-only input is a constant and therefore cannot classify true/false; original native baseline and R3-off core; if feasible, simple GC or PWM baseline measured but NEVER substituted inside the original organism. No inference-time target/label, no fake Bio donor.

**No unwarranted claims:** not the AlphaGenome 2 1Mb variant-effect/conditioned regulatory prediction task; HS3D also originates from GenBank and official test split is not guaranteed gene-family-disjoint. An observed score higher than chance with flanks would establish a first task-specific signal beyond central GT, not the autonomous discovery of a perspective nor a breakthrough in regulatory genomics.

**Scientific go/no-go:** if flanking views fail near 50%, stop local four-base tuning and introduce a genuine Brain-owned active-perspective mechanism, using original state/actions and feedback only after each episode. If a view works, test whether the same original organism can autonomously acquire it, and then check the official untouched Test only once. Crucially, selection on n=400 remains exploratory, not confirmation.

**Integrity and non-regression:** isolated branch; do not change old native algorithms, Braivour donor checkpoints, active Qwen training, user UI or previous scientific claims. The previous 39 attempts and results remain intact.

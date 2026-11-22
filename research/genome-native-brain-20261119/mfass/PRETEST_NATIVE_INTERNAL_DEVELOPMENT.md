# Pre-frozen MFASS real rare pathogenic splice variant development benchmark — original one Brain
2026-11-22. Committed BEFORE any original native model is scored on this MFASS dataset.

## Scientific data gate actually passed
Pinned real `KosuriLab/MFASS@9a8e4f27106be52aeb11acad27f95f5cded663a8`; original 170nt reporter REF (natural_seq) and ALT (original_seq) validated on every 27,733 source SNV; alleles match source strand. **7,770 reverse-complement cases** of the older `sequence` field explicitly disallowed. Source SHA `a637ca0e307e66ff48811ec7efa22b9ce453bc7883b04f0cacb867f7283132d8`. Pinned corrected `rewire-bio/rewire-benchmarks@68d1ee53a0fcd1104d9f427d68dedffdccf2c47f` canonical whole-gene+exon connected split `split-v2.tsv`, SHA `999ebcb7e63a5c5eaa8780fa468e59ac1f934260ad50102814174c396317f052`.
Original official TRAIN 19,409 real SNVs, 735 real large splice-disruption measurements, 1,127 connected groups. Official TEST 8,324 real SNVs /315 positives /463 groups. **OFFICIAL TEST NEVER USED FOR NATIVE PREDICTIONS IN THIS PHASE.**

## Real internal groups partition
The original corrected TRAIN group IDs are SHA256-ordered by `MFASS-ORIGINAL-NATIVE-20261122:<connected group>`. The first **150 whole groups** = internal DEV, next **150 whole groups** = independent reserved CALIBRATION (unused for current scores and native learning), and remaining **827** whole groups = native TRAIN. Do not look at official 463 TEST groups to select a mask. No variant, exon or connected original gene group crosses these partitions. Report actual class counts and original source hashes for every arm.

## Original native one-Brain mechanism
- Only original unchanged V42 `Brain.live`, `Brain.predict`, `LeanC`, `EmergentChain` and original A organs predict (not another learned model). Original C cap8, native A depth2, R2/R3 off, deterministic seed 20261122, no donor GGUF or transplanted genomic classifier.
- Native truthful physical 8-byte sensory view of actual 170nt MFASS REF/ALT minigene:
`[sourceRegion, distanceToNearestExonBoundaryBin, mutationOffset0to3, actualREF0,REF1,REF2,REF3, actualALTmutatedBase]`.
- Region source-only unlabelled physical annotation: exon vs upstream or downstream intron. Boundary geometry from actual source `intron1_len` and `exon_len`, bins a(≤2),b(≤5),c(≤10),d(≤20),e(>20). Four genuine REF bases centered around real variant, exactly one ALT substitution of one of these four, at authentic source `rel_position-1` after verified strand. No loss in representing this four-base REF+ALT pair; HOWEVER 166 OTHER genomic bases in the 170nt construct are NOT inside this 8-byte immediate original C8 perception. This is a serious limitation, not full genome understanding.
- Measured true functional label is actual `strong_lof` TRUE -> ASCII '1' or FALSE -> ASCII '0'. On every true native TRAIN variant present exactly 8 input bytes + true label + newline. Native `Brain.live` receives all original true symbols, original source labels, equal sequence order by SHA256 `MFASS-NATIVE-TRAIN-BODY-V1:<variant id>`. No synthetic variant labels or matching false biological answers.
- THREE frozen native learning schedules on the exact same true source samples, alphabet, original Brain type, seed and number of original `Brain.live` symbols:
  1. `global-c` original untouched C observes all 10 moments.
  2. `outcome-c` original native C.observe ONLY updates in the TRUE rare splicing outcome byte moment, while same original Brain/A lives every byte.
  3. `alt-c` count-matched negative control: original native C observes only the ALT mutation base moment (last of 8 input bytes), never experimental outcome, but original native Brain/A learns actual real outcome bytes identically.
The C gate is a per-instance scheduling adapter; original C model/formula and core Brain are unchanged, though different C observations can indirectly affect native A learning through predecessor states. No standalone model, no external learned prediction head and no handcoded correct answer used at readout.

## Real target and honest scoring
- Class imbalance true prevalence ~3.786%. Raw classification accuracy is NOT a valid success metric. Primary **average precision / area under true precision–recall curve (AP/AUPRC)**, using original `Brain.predict` probability assigned to ASCII '1' versus '0', not thresholded majority label.
- Correct ties as whole score groups. Secondary AUROC using tie-aware midranks; precision@100 with fractional expectation at a score-tie boundary, precision/recall at fixed 10% top candidates, number of distinct native scores and PR summary. Only real group-heldout INTERNAL DEV cases are scored.
- Contingency lookup from same real TRAIN `sourceRegion + boundaryDistanceBin + real REF→ALT base`, beta-smoothed source-only probabilities, compared as a NON-ORGANISM baseline. Always-random/constant prevalence AP also reported.
- Actual published corrected MFASS-v2 specialist benchmark on different official TEST reports simple HGB baseline AP 0.286, SpliceAI AP0.299, Pangolin AP0.389, and n8324. **These published OFFICIAL TEST numbers must not be compared directly to the internally chosen DEV cohort**. They are future target levels, not experimental results of our Brain.
- No outcome or mask-selection from INTERNAL DEV. All C programs selected exclusively by original native `LeanC.reframe` during actual train input, and original `Brain.predict` read-only for dev. CALIBRATION retained for future true biological candidate selection but NOT used in this run.
- If native AP barely differs from prevalence or source-only contingency, document failure. Do not score the original canonical official test until another frozen pre-confirmation contract. No tuning against original canonical MFASS TEST.
- Meaningful eventual comparison with AlphaGenome 2 requires its own predictions on exact same genomic variants/condition and measured same endpoint, with API outputs used ONLY for evaluation under its terms; the original AlphaGenome1 paper published auPRC0.51 on MFASS under a different protocol, which is not interchangeable with corrected split-v2.

This is not a clinical interpretation model or proof of AGI. No source files, older Vexseq final, checkpoints or user projects changed.

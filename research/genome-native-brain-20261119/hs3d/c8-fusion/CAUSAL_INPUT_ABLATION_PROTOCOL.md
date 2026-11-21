# Original Brain internal causal use of first physical DNA viewport — pre-test

Recorded on 2026-11-21 **before this new native within-model intervention runs**. This is a mechanistic diagnostic (not a new independent biological validation) of the same joint70+64 native C8 Brain selected in the real HS3D development study.

**Known already:** separate real joint70+64 original Brain 74.75% accuracy, 74.11% macro-F1 on dev400, C active mask exact:149 (offsets 0,2,4,7 cover both views). Separate cross-record scrambled-training Brain 70.25%, 69.17%. These DIFFERENT models cannot alone prove the SAME trained organism's final answer depends on the first observed view.

**New causal experiment:** train exactly one original native V42 Brain on 1200 original HS3D P/N label records using genuine dna[70:74]+dna[64:68], C cap8, seed20261121, unchanged algorithms. Freeze original Brain. On EXACT same dev400, for each row:
1. predict true label using actual two real views, no class feedback;
2. predict again by changing **only the four first-view bases** to a genuine different row's [70:74], chosen by fixed independent hash, while preserving the exact original last dna[64:68]. This is deliberate source-mismatched information, **not real biological sequence**.
3. Compare original answer vs within-same-Brain changed answer per row. Count **number of changed predictions**, changes grouped by real class and paired accuracy / macro-F1. Assert frozen Brain.lived and Align.lived unchanged, all final four bases exact.
4. Additional negative control: replace first four with the same exact first-view bases (sham) and verify 400/400 prediction parity.

**Interpretation:** if first-view swap changes predictions, the SAME original Brain uses first-view information causally at inference. If real data prediction score exceeds swapped, it also has a positive predictive contribution on this historical dev, but it is NOT a clinical finding or a replicated general biological law. If no prediction ever changes, mask149 was not sufficient to establish real use and we reject the earlier interpretation.

No labels used in Brain.predict; no new classifier/weights or original code changes; same historical dev400 already viewed by previous research. External DRANet verification was independently frozen before this diagnostic. Result will be archived whether positive or negative.

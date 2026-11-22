# Vex-seq assay data audit, before any model benchmark

Date: 2026-11-22. User asks to continue meaningful genome research toward AlphaGenome 2, not to recycle toy mazes.

**Actual endpoint:** experiment-measured change in exon percent-spliced-in (ΔPSI) due to real DNA variants. This moves beyond human true/false splice-junction motif labels. It is still not an AlphaGenome 2 matched head-to-head benchmark.

**Source:** original public Adamson et al. Vex-seq 2018 / github `scottiadamson/Vex-seq` exact pinned commit `36d9c4a6e5e74def46b3cada69d3166f08c54bd5`, raw measurement table `processed_files/delta_PSI_values.tsv`, original sequence design table `preprocess_data/68_97_final_sequences_fixed.tsv`, variant-position annotations `processed_files/Vex-seq_positions.tsv`, and constructed original control pairs `processed_files/control_variant_pairs.csv`. No user-supplied fake variant effects.

**Preflight before model design:** read actual source schema and build a documented, validated join of variant IDs to BOTH real reference and alternative construct DNA sequences. Do not invent reference bases from variant IDs or substitute an arbitrary sequence window. Reject unmatched variants. Determine exact PSI units, exon IDs and possible multi-variant confounding. Print source SHA256, counts and schema; leave score computation blocked until these checks pass.

**Desired frozen functional effect experiment if possible:** original native V42 C8/C9 pairs REF and ALT biological sequences; predict signed ΔPSI on genuinely withheld variant families using actual measured ΔPSI as training feedback only. No true test label appears in Brain inference. Competing simple reference baselines (zero change, motif-local delta) and properly trained conventional baselines are mandatory; same paired variants, gene/event-level splits and cell-line stratification. Report correlation, MAE and effect-sign concordance. AlphaGenome 2 API predictions on identical variants are NOT available and must not be fabricated.

**Known danger:** the historical HS3D donor->acceptor original-native transfer study was already performed in this project and gave negative transfer in the original fixed C4 context. A new GT->AG attempt was run separately on 2026-11-22 and confirmed interference; it is NOT a solution. We must use a different task/assay to extend scientifically.

This audit is source inspection only, with no claimed functional benchmark outcome. All existing source Brain, Braivour and prior branches preserved.

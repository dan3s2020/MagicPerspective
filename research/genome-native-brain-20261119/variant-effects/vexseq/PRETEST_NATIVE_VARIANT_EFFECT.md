# PRE-FROZEN native MagicPerspective original Brain on measured functional variant effects

Date: 2026-11-22. Commit BEFORE running any original-Brain variant-effect classifier on Vex-seq.

## Why this is an actual biological function test, not a toy maze
Original Vex-seq Adamson et al. reporter-assay laboratory data include 2,055 measured `delta_PSI` effects, actual original constructs, real SNV alternative constructs and original controls. A source audit confirmed 1,960 authentic single-nucleotide variants, each REF/ALT sequence differs at exactly ONE base, with the declared allele either direct or precisely reverse-complementary consistent with strand. No other label is invented.

Native organism question: **given original and mutated biological sequences, can the original V42 Brain predict whether the variant decreases, leaves approximately unchanged, or increases exon inclusion (ΔPSI)?** This is one test toward functional genomics, NOT equivalent to AlphaGenome 2's 1Mb tissue-conditioned sequence-function model.

## Exact published source and leakage controls
- `scottiadamson/Vex-seq@36d9c4a6e5e74def46b3cada69d3166f08c54bd5`. Original `Sequence` field, NOT `Final Sequence` (which contains extra construct/barcode differences); original `Control_Original` from the published `control_variant_pairs.csv`.
- Original measured `processed_files/delta_PSI_values.tsv` values, original event-relative positions from `processed_files/Vex-seq_positions.tsv`. Validate exact original vs altered bases and strand; retain 1,960 real SNVs and 110 original-control groups.
- **Split is by original construct event GROUP**, not individual variants: stable SHA sort `vexseq-GROUP-BLIND-20261122:<event-index>`; first floor(70%) groups train, next floor(15%) dev, remaining groups a completely unopened FINAL. Hash and exact exclusions frozen before results.
- The validated source partitions: **1303 variants/77 events train; 390/16 dev; 267/17 final**. Every REF/ALT pair is within the same event partition. No final labels or predictions used until the winner is frozen and a one-shot confirmation is justified.
- Source test values are numerical (ΔPSI percent points) measured by an in-vitro reporter assay. Define three categories **a priori**: delta<=-5pp = '-' decreased inclusion; delta>=+5pp = '+' increased; otherwise '0' neutral/weak. On dev: 90 decreases / 43 increases / 257 weak. This target is coarse; a 3-class success is NOT numeric signed-effect magnitude prediction.
- Report **macro-F1 primary** to prevent the neutral majority hiding failures. Secondary balanced accuracy, accuracy, per-class precision/recall, confusion. For continuous real ΔPSI use rank correlation of the original native score `p_plus - p_minus` with published continuous ΔPSI as an uncalibrated ranking diagnostic (not a quantitative ΔPSI predictor).

## Native method and predeclared original-architecture modes
Native V42 Brain source `v17/transcend/torus-aether/devour/brain.mjs` is unchanged. Original `Brain.live()` gets one actual paired REF+ALT local eight-nucleotide observation plus true effect category only during training, ending newline. Original `Brain.predict()` sees only **the exact same REF/ALT observation WITHOUT category** during development/final inference. Both observation sequences are real Vex-seq constructs and maintain the exact original changed nucleotide. No external learned head, fake value target, rank oracle, user GGUF donor, or hidden label in the body.

Mutated-base window: exactly four actual bases at original sequence positions [changeIndex-2,changeIndex+2), clipped to valid [0, length-4] when near a construct end, and the corresponding four altered bases at identical positions. This placement is **hand-defined**, not autonomous perspective selection.

Predeclare exactly FOUR actual original-native modes, all equal source train/dev and seed 20261122:
1. `native-C8-pair`: original C8 receives `4 real REF bases + 4 real ALT bases`; native A depth2, `off:["R2","R3"]`.
2. `native-C9-position`: original C9 receives a real biological position-bin token + the same eight REF/ALT bases. Token from **unlabelled** published nearest-splice-site coordinate: `a:0..3, b:4..10, c:11..25, d:26..50, e:>50` nucleotides. This is a human-authored physical coordinate representation, NOT label information.
3. `native-C9-corrupted-position`: same 9 symbols but bin token determined from SHA256 of variant ID instead of biological position, controlling for generic extra symbol/model capacity. Its corruption never sees measured ΔPSI.
4. `native-C9-position-R3`: same real C9 position view but original R3 trust readback enabled, while R2 remains off. This isolates previous discovery that trust readback may suppress some informative contexts.

For all modes: all verified 1303 training variants used ONCE, order deterministically SHA-sorted by `vexseq-live-20261122:<variant-id>`; seed 20261122, no manual performance tuning between modes, unchanged original V42 C/A algorithms. Expected observed symbol budgets 1303×(8+2)=13030 for C8 and 1303×(9+2)=14333 for C9, with class one byte + newline.

## Frozen controls outside organism (never used for native inference)
- **Majority-class** (always `0`, 257/390 dev).
- **Substitution class-posterior lookup** from published training only: joint genuine observed REF/ALT base (4×3 nonidentical changes), Laplace smoothing +1, choose majority class; no nucleotide context.
- **Splice-distance-bin + substitution** empirical class counts from training with Laplace +1, fixed bins as above. Tests whether any native gain survives simple known metadata.
- Untrained original Brain predicted on same dev samples (optional), and no-true-allele negative control *only if added via a separately preregistered intervention*, not silently chosen.

## Selection and tests
- Score only dev 390 at first. Freeze winner by maximum dev macro-F1 among four predeclared native modes, even if ALL fail or baseline wins; ties break balanced acc then fixed order. No final test until this freeze is committed with exact source SHAs.
- If native predictor cannot beat the trivial neutral majority or simple empirical substitution/distance controls on dev, **report failure**. We may still measure rank correlations and compute biological error slices without using any final data.
- If development results show a real signal, freeze winner before one-shot final on 267 variants across 17 wholly separate original-construct events. Maintain all baselines and failures. No tuning after viewing final.
- Biological replication limitations: 110 source event groups but may share homologous loci; reporter construct conditions may not represent endogenous tissue responses. Sample size modest; no clinical inference and no AlphaGenome 2 matched API result.
- Previous UCI/HS3D labels are NEVER mixed with this true measured effect task for training in this first comparison. Donor-to-acceptor transfer on earlier historical HS3D exhibited negative transfer; we must establish direct functional effect learning first.

## Provenance and nonregression
Original project files and running jobs/checkpoints remain untouched. This is an isolated additive research branch with reproducible GitHub Actions logs and raw predictions. No promises of fixed percent/positive effect are made in advance.

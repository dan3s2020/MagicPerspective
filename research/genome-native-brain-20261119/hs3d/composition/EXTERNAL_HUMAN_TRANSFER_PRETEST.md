# Frozen BEFORE external biology: original native V42 two-step organism -> genuinely separate human acceptor source

**Date:** 2026-11-20. PRE-REGISTERED before checking out or scoring the full `homo_acceptor_*.txt` external source sequences. Seven example lines from the independently published sample files had been inspected only to verify the 402nt format and AG anchor, *not* the donor organism's predictions. This is an external-source generalization study, not unqualified virgin-blind trial.

## Proven baseline and new question

Original `Brain.live()/Brain.predict()` V42 (unchanged) learned two physical primitive actions by delayed genuine P/N outcome reward on 1,200 original HS3D human AG acceptor Train labels and 1,000 live calibration experiences. A frozen within-source 1,600-case positive result scored **1,031/1,600 = 64.4375% accuracy, 61.977% macro-F1**, with same-Brain fixed64 **61.6875%, 55.246%**. This did not establish transport to data sourced from independent genomic discovery/annotation pipelines.

**NEW test:** transfer EXACT SAME trained original native Brain, **with zero training or reward updates on new DNA**, to another published human true-vs-false AG acceptor benchmark. If no genuine transfer, previously reported gains are task/source-specific.

## External source specified before fetching full files

- `XueyanLiu-creator/DRANetSplicer@fe300cd8e4a55471268e1271621df208430157a5`, published genomic dataset accompanying DRANetSplicer, independent of the HS3D GitHub source `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`.
- Exact files: `data/dna_sequences/homo_acceptor_positive.txt` and `data/dna_sequences/homo_acceptor_negative.txt`; one real 402nt uppercase DNA string per line, real site class P/N comes **solely** from file designation. No synthetic negatives or fabricated annotations.
- External 402nt centered splice motif AG expected `dna[200:202]=="AG"`, corresponding exactly to original HS3D `dna[68:70]=="AG"`.
- To keep sensor coordinate and native action code **identical**, crop each 402nt external to the 140nt original-body local frame `externalDNA.slice(132,272)`. Then original position64, 66, 70 etc map to true physical external positions196,198,202 respectively. No changes to original actor, world vocabulary, seed or native parameters.
- Exclude all noncanonical/length !=402 and non-AG centered examples, exact 140nt duplicate sequences, contradictory-label sequences, and exact overlap with any used HS3D native train, calibration or dev record; record exact counts, raw SHA256 for original two external full files and each exclusion reason.
- Deterministically SHA-sort each class using `"external-homo-native-20261120:"+cropped140`; choose **800 P + 800 N**, i.e. **1,600 real previously not scored external 140nt local frames**, without adapting any model or hyperparameter after seeing source metrics.
- Source full external raw size may be ~55MB/class and multiple species included in source repository, but CI downloads ONLY two named original human acceptor files via sparse checkout.

## Exactly frozen original native Brain and evaluation

- Pre-existing `run-frozen-1600.mjs` native algorithm and all training remain unchanged: original native Brain C6, R2/R3 off, seed20261120, supervised original HS3D 600P+600N×7 four-base physical views, then 1,000 actual delayed reward two-step primitive experiences, native actor using two physical primitive choices and three real 4base observations, no new model or selector.
- One arm **`chain-delayed` only**, selected *before* external data; no other method tuning or retry on original test.
- On real external 1,600, original native Brain picks two actual primitive actions before reading the selected destination DNA and classifies its last actually observed four bases. External correct P/N truth is used **only after native prediction** by independent scorer.
- External evaluations also report read-only SAME original Brain fixed64, fixed66, initial70, deterministic two-step random actions; all five classifiers share one post-HS3D-trained native Brain state.
- Primary **macro-F1**, then accuracy, balanced acc, P/N recall/precision, confusion, physical chosen-action histograms, all 1,600 native per-record traces and raw external source checksums.

## Interpretation & controls

- If external macro-F1 is meaningfully > chance and native actions improve beyond same-Brain fixed64, that is promising **between-source transfer** of native learned genome viewport behavior, not true gene-family-disjoint or prospective clinical proof.
- If external native performance collapses, classify the prior HS3D gains as source-limited; do not hide negative result, retune on these examples or rename a different training cycle as blind external.
- External data are annotated by another team but may overlap genomic regions/families with HS3D and are not automatically gene/chromosome independent; exact local DNA overlap is excluded but deeper homology is not controlled.
- A direct **AlphaGenome 2** comparison is NOT performed: this is short-window binary AG splice-site classification, not tissue-conditioned expression/variant effect prediction.
- Study does not claim internal GGUF Qwen inference or general intelligence assimilation.

This source distinction is more scientifically decisive than another within-HS3D seed/epoch comparison and does not rerun the user-rejected Python V5 toy.

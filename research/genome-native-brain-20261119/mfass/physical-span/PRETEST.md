# Pre-registered REAL two-location 170nt MFASS genome observation, original V42 C8
2026-11-22; committed before any new original Brain physical span score.

## Original measured benchmark and scientific need
Original rare MFASS source 27,733 actual real human 170nt single-nucleotide REF/ALT reporter pairs, 1,050 real splice-disrupting mutations, canonical corrected exon+gene split. A successful actual gene-separated original Brain C8 source development run learned 14,498 real source variants and identified **17** true strongly disruptive mutations in its top100, on 2,490 unseen-source-group original variants; original rare-event AP **0.09634** vs simple source-only region+distance+real allele control **0.16561**. Original native C was manually offered a **compressed local four-base REF/ALT** window, replacing the actual ~170nt observed genome with only eight local symbols.

Original V42 source was shown in earlier authentic HS3D experiments to fuse two physically real 4nt sequence locations and benefit from the extra information. Here, new question: **Will native learning integrate the actual DNA at the splice junction with the actual mutant nucleotide at a distant position, to rank genuinely rare functional variants on a new assay?** The source genome is real and from original published experimental constructs, never synthetic.

## Pre-frozen genuine two-location perception arms
For each original real MFASS variant `r`:
- The real source `natural_seq` is REF170, `original_seq` is ALT170, which differs at exactly `rel_position-1` with original strand verified (7,770 legacy reverse-complement errors already excluded).
- Source `r.upstreamIntron`, `r.exonLength` give actual exon-junction coordinates `acc` and `don`; nearest genomic junction is chosen by absolute distance to original changed source base (tie: acceptor), **NOT** by the hidden measured functional label or native predictions.
- Define actual four-base centered source-mutation window `start=clamp(changedIndex-2,0,166)`, true `REF4` and actual `ALT4`.
- Define actual four-base site window `junctionStart=clamp(nearestJunction-2,0,166)`, real four bases from the SAME genuine 170nt ALT construct. This is a researcher-designated physical location, NOT an autonomously found alternative splicing position.
- Define genuine non-junction control window by selecting first four-base start in `[0,166]` with at least 12 nt distance from BOTH the changed site and the nearest junction, via a deterministic SHA256 variant-ID order. No label information; real ALT source bases only. This preserves exactly eight genuine measured human DNA bases and genuine distance from the mutation, but the control is not matched on composition or every possible positional confound.

Four frozen modes; **identical number of genuine 8-byte DNA observations and authentic 0/1 experimental labels in every native training example**:
1. `paired-local-ref-alt`: `[REF4, ALT4]` at the same true physical variant location, retaining the changed base and local reference allele (two real views).
2. `paired-alt-real-junction`: `[real ALT4 mutation window, real ALT4 nearest exon-junction window]`, two physical regions possibly separated in the actual 170nt human source, with true endogenous source junction sequence observed.
3. `paired-alt-non-junction`: `[real ALT4 mutation window, real ALT4 deterministic site far from mutation and real exon junction]`, matched 8 observed authentic source bases but without junction-targeted selection.
4. `paired-ref-real-junction`: `[real REF4 mutation window, real ALT4 nearest exon-junction window]`, missing an explicit mutated-base observation if the source site window does not overlap the mutation; negative biological intervention control.

No synthetic nucleotides or modified genomic labels. Input physically preserves a real sequence window from each region but NOT the full original 170nt; do not claim full genome understanding.

## Same original-native Brain and strict holdouts
Original unchanged V42 `Brain.live` / `Brain.predict`, `LeanC` C cap8, native A depth2, R2/R3 off, seed20261122, and authentic **binary experimental MFASS `strong_lof`** labels. Native C per-instance outcome-moment gate as previous original-native `outcome-c` protocol; only true rare 0/1 outcome goes into original C.observe, while original Brain and A learn every original actual 8 source DNA bases, real label, newline.
- Genuine original canonical TRAIN source connected-gene group internal partitions frozen before MFASS scoring: **14,498 TRAIN real source variants/827 connected groups**, **2,421 reserved calibration/150 groups**, **2,490 DEV rare-effect variants/150 separate original gene/exon groups**.
- Only TRAIN used to learn. All 2,490 gene-group DEV labels hidden until external scoring. No tuning or selection based on development outcome; all FOUR modes fixed pre-run.
- Original independent canonical MFASS-v2 **OFFICIAL TEST 8,324 genuine human variants/463 whole connected gene groups remains UNTOUCHED**.
- Every mode lives 14,498×10=**144,980 original Brain.live symbols**, with exactly14,498 original C.observe true outcome updates, same real DNA source, same original orientation and source training sort salt.
- Native current C model self-selected by its original `LeanC.reframe`, no manual post-training native mask calibration in this experiment, to isolate **the physical genomic observation content** alone.
- Primary evaluation AP/area under true PR curve from original full `Brain.predict` raw probability of actual positive effect. Secondary rare variant top100 expected positives, AUROC, 10%-highest-relevance precision, number non-tied original scores, actual learned C mask and model count, use exactly same true source-only empirical region+distance+REF>ALT control as previous source run.
- Compare four arms to EACH OTHER and original compressed-metadata `outcome-c` study on same source TRAIN/DEV and original algorithm. Evidence of biological context contribution requires real-junction > nonjunction control and local-ref-alt and ideally source statistical baseline on true gene-disjoint DEV. If no, record negative result. Do not choose an officially validated winner from reused DEV.

This is a real physically grounded new biological perspective tested within a source with 170nt context, but NOT AlphaGenome2, real clinical RNA, automatically learned action semantics, full170nt native memory or a high-dimensional 4D physical dimension. No original Brain source or older project modified.

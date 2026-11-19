# PRE-REGISTERED native Brain DNA cross-world transfer: GT donor -> AG acceptor

**Date:** 2026-11-19. **This protocol is committed before evaluating the original acceptor HS3D labels in any script from this research branch.**
Source: authentic public human HS3D balanced donor and acceptor records from pinned `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`. Only upstream **Train** files are included in the CI checkout; official **Test** acceptor files are not downloaded in this phase.

## Why this is a new causal question

Original native V42 Brain has now reached **79.18%** on official unseen donor (GT) true-vs-false classification in one pre-frozen test (but loses to simple 4-base and 20-base PWM), and original `ConstructedPathLearner` rewarded viewpoint policy showed an exploratory 81% on TRAIN-based dev. The existing HS3D donor official Test is **already examined**, not reusable as a new final benchmark.

**Question we haven't measured:** Is there a *transferable state* in the original Brain after donor site learning, or are its learned responses merely donor-local base-label associations? Test the **same continuing original Brain** on the different acceptor AG world with exactly matched acceptor adaptation records versus a freshly initialized original Brain. This explicitly separates transfer from merely doing another splice classifier run.

## Frozen inputs and original method

- Native original `Brain.live()` and `Brain.predict()` of the genuine original MagicPerspective V42; original C=4, A=2, original built-in `off:["R2","R3"]`, seed 20261119. No external classifier, oracle label, newly trained head, fake donor GGUF, or rewritten original Brain.
- Source sequences are genuine 140nt upstream HS3D data; no generated DNA.
- Donor P/N target: actual genomic GT at `dna[70:72]`; fixed view is **real four downstream bases `dna[72:76]`**. Acceptor P/N target: actual genomic AG at `dna[68:70]`; fixed view is **four downstream bases `dna[70:74]`**. The whole 140nt original sequence is losslessly present before the final four bases; original C=4 is the immediate context. This view choice is *human predefined using splice boundary coordinates*, **not autonomously learned**.
- Same original sequence presentation: `"DNA " + dna.slice(0,start) + dna.slice(start+4) + dna.slice(start,start+4)`. For supervised learning, append only `P/N + "\n"`; for inference, no target bytes are supplied to the original Brain.
- Donor 700P+700N real unique input examples are selected from donor TRAIN using exactly the existing fixed original "hs3d-donor-blind-v1:" salted SHA DNA order; exclude donor sequences exactly duplicating any acceptor evaluation sequence (count exclusions).
- Acceptor TRAIN uses unique, conflict-free P/N 140nt records sorted independently by `"hs3d-acceptor-transfer-v1:" + dna` SHA; **first 600 P and 600 N** form an acceptor adaptation pool, next **200 P+200 N** are the *exploratory* 400-case development set. Exact DNA duplicates across groups and contradictory labels excluded; maintain strict disjointness from donor pretraining.
- Verify that the real donor center GT and real acceptor center AG hold for **every** selected row, or fail closed and inspect the dataset rather than falsifying the split.
- The true/false labels are the actual experimental source labels, not constructed from motif positions.

## Frozen experiment arms and comparisons

Use THREE starting native states:
1. `fresh`: **same original V42 Brain from scratch** on acceptor, no donor pretraining;
2. `donor`: train **the same original Brain** first on true labeled donor GT examples and then continue learning acceptor examples (same object and state; no recreation);
3. `donor-inverted` (explicit negative control): pretrain original Brain on real donor sequences but deliberately **swap P↔N** training feedback, then use correct acceptor labels during adaptation. This is **not genuine biological learning**; the deliberately false-feedback arm tests whether donor-related input exposure alone explains performance.

Native acceptor adaptation sizes: **0, 40, 200, 800** total, taken as balanced interleaved actual acceptor TRAIN records. All modes predict the **same** 400 exploratory acceptor Train-derived development records, untouched by any of the three original Brains while training. Twelve original-native tests.

Metrics: actual count per class and confusion, **macro-F1 primary**, accuracy, balanced accuracy, labels seen by native Brain, prior donor-lived symbols and acceptor-adaptation-lived symbols; also baseline majority 50% and simple central AG (constant). Every official acceptor Test record remains **unopened** until a separate frozen procedure.

## Critical interpretation gates

- `donor` > `fresh` on at least two consecutive low-shot conditions and > `donor-inverted` would support *exploratory* transfer of donor-trained native state; differences must be replicated on fresh independent biological data to establish a convincing transfer capability.
- `donor` <= `fresh` (or donor-inverted equally good) means no specific positive native donor->acceptor transfer under this fixed-view protocol. Document negative result; do not simply rename it "intelligence absorption".
- `fresh` 0-shot may have nonrandom default distributions; provide actual confusion, not just the aggregate percentage.
- Even a good score is only a short-range **local four-base acceptor classification**, not native automatic perspective selection, tissue-specific functional variation, AlphaGenome 2 parity, clinical genomics, or verified donor GGUF assimilation.

**No source code in old versions, no ongoing user training, no checkpoints or user UI is modified.** A separate new research branch is used.

# New causal hypothesis: original-native explicit world identity within the SAME C perspective

**Registered before executing these experiments** on 19 November 2026.

## Context that motivates (not presupposes) this intervention

The original native V42 Brain `off:["R2","R3"]`, C=4, learned genuine human HS3D donor GT (true-vs-false) patterns well on an official held-out donor dataset. A new direct same-Brain transfer protocol from GT donor to AG acceptor with 0/40/200/800 acceptance examples on a separate 400-example acceptor TRAIN-based development split is in progress. Initial results suggest **negative transfer** when the native context sees only the four downstream DNA bases. A plausible causal issue is that two distinct biological worlds are **aliased** into the SAME short four-symbol sensory context and the native C cannot distinguish donor-vs-acceptor identities at inference.

## New experiment (not another seed or parameter-only repeat)

Intervene on the **sensor layout of the same original V42 Brain** by adding **one real, non-label world identifier** inside its C observation: character `D` for donor and `A` for acceptor, immediately before four observed native DNA bases. Original `LeanC` capacity increases from 4 to **5** (safe, preflight original candidacy 3×(2^5−1)=93 per byte; no 16/32 exponential blowup). All 140 original DNA bases stay present, and the original `Brain.live`/`Brain.predict`, `EmergentChain`, A organs, R2/R3 disabled rules, seed and authentic source remain unchanged. This makes the world's identity visible **without** revealing whether its site is biologically functional.

This is **human-provided task identity**, not endogenous discovery of domain, a causal claim of molecular context, or an alternative classifier.

## Fixed data and modes

Identical source and exact hash-ordered split as `PRETEST_DONOR_TO_ACCEPTOR.md`:
- Donor original Train: 700 authentic P + 700 N (original upstream donor data, center GT at [70,72)); explicit domain marker D.
- Acceptor original Train: first 600P+600N for adaptation; next 200P+200N for a frozen **400-case development split**, center AG [68,70); marker A.
- Same correct real labels, label hidden for all development prediction; no original upstream Test checked out.
- Same fixed four bases **after** conserved motif: donor [72:76], acceptor [70:74]; no manual view search on acceptor development.
- Native original C cap5, A depth2, original native `off:["R2","R3"]`, seed 20261119.
- Three starting states: fresh, real donor-pretrained, or deliberate donor-feedback-inverted negative control.
- Four adaptation amounts: 0, 40, 200, 800 balanced real acceptor rows, same exact records at each amount.
- Exactly 12 pre-registered cells; evaluate macro-F1 first, accuracy, balanced accuracy, class-specific precision and recall, learning-symbol parity, and full matrix.

## Explicit scientific interpretations

1. Real donor pretraining beats matched fresh *and* donor-inverted at multiple low-shot points => promising task-conditional transfer **within this old dataset**; require independent data and explicit transfer of state to confirm generally.
2. Donor still loses to fresh or equals donor-inverted => negative domain-conditioning result, no claim of transfer.
3. All conditions near 50% => likely a four-base information limit or native learning failure, not proof genome recognition impossible.
4. Improved fresh performance with C5 task tag alone is not proof of transfer from donor.
5. Distinct comparison `C4 no-tag` vs `C5 with-tag` changes both C capacity and token presence, so any performance change cannot be uniquely attributed to world identity alone without a C5 no-domain control. Add such a control separately before any causal attribution, and avoid declaring tag itself definitively causal.
6. Entire study remains outside AlphaGenome 2 1Mb context/tissue-variant benchmark.

No original source, donor Qwen/GGUF checkpoint, old current training, UI or Branch main is modified; only new additive code in this isolated research branch.

# MagicPerspective V37 — real human text complete native atlas: why correct answers were not reached

Date: 2026-11-07
Branch: experiment/V37-REAL-TEXT-FROZEN-ATLAS-FAILURE-CAUSES-20261107
Parent: independent V36 test source commit cb4a01d0910a2ce5a305f478fd6f5526fa9b0ca9.
Status: verified frozen real-data forensic research, not new text-solving engine or production acceptance.

## Scope and source

The original V17 Brain, original maze-trained Discoverer.shapeGraph, existing real V35 supervised evidence-span ranker, original CUDA, V17 UI and all original checkpoints are unchanged.
Research-only addition: v17/research/text-hypermaze/frozen-source-evidence-forensics.mjs and v17/tests/v37-real-squad-frozen-forensics.test.mjs.
The forensic routine requires an ALREADY COMPLETED original plan with the COMPLETE candidate-source graph; only then may the evaluation harness supply actual gold answer strings. It cannot learn, change scores or create previously unseen paths.

Source: authentic official Stanford SQuAD v1.1 human Q/A. Same 2,400 sampled real training questions and 450 completely frozen human DEV questions with disjoint articles as in V35. Real source SHA256 verified before training.
Actual native original Brain trained on 26 lived original 2D maze episodes. Existing real supervised question-evidence preference trained on 2,400 original TRAIN human questions for two epochs.
All 450 complete original source graphs were inspected AFTER answers were frozen.

## Independent green CI

https://github.com/dan3s2020/MagicPerspective/actions/runs/42362246854

All V37 forensics tests 2/2 PASS; unchanged original shape parity 2/2 PASS.
450 whole answer-atlas reports reconstructed from **271,849 full original source-graph nodes and 271,399 actual directed evidence edges**.

## Exact diagnosis (450 frozen unseen human questions)

| Post-frozen outcome | Count |
| --- | ---: |
| Correct entire raw answer | 62 |
| Correct after SQuAD punctuation/article normalization | 3 |
| Reference span actually available in current full graph, but wrong answer was ranked higher | 329 |
| Source includes correct reference text, but correct candidate span was absent from bounded model graph | 56 |
| Total | 450 |

The correct source span was PRESENT among graph candidates in 394/450 questions (87.5556%, canonical matching), but accepted only 65/450 after canonical normalization.
The true raw exact answer appeared in 385/450 original candidate lists (85.5556%).
The original model selected only 62/450 exact; NOT an issue of nonexistent physical corridor for the other 329 failures — the exact or normalized correct candidate was already visible but ranked below an erroneous one.
Only 56/450 were actually MISSING answer states from the bounded source graph. Those may require broader maxSpan, punctuation handling, longer context, or token boundary repair.

Concrete example:
- Who did the Panthers beat in the NFC Championship Game? The real correct answer was in the current source candidate atlas at learned rank 3, yet the model chose the wrong top-ranked source span. This is a learned semantic preference failure, not an inability to draw a graph.
- Which Denver linebacker was named Super Bowl MVP? Correct answer Von Miller was at rank 1; original Brain returned the exact human answer.
- Who won Super Bowl 50? Correct reference was present at rank 19; original selected Roman numerals incorrectly.

The original first-node attraction potential was approximately 0.89392024965 on all example questions because all candidate text spans are treated as possible terminal targets and share the original seeded goal kind. That does NOT itself differentiate the true semantic answer. The supervised edge preference determines which observed span is reached.

## Scientific implication

The next bottleneck is LEARNING WHICH STATE IS A VALID ANSWER (task-conditioned goal inference) from the question and meaningful context, not simply drawing more nodes or forcing high-D orthogonality.
Expanding the available candidate graph can at best repair the 56/450 missing-source cases; improving causal or semantic ranking of already-present alternatives is necessary for the much larger 329/450 group.
A two-hop route question -> sentence -> answer span is not evidence of independently learned multi-hop meaning or path-dependent text physics. A direct classifier may choose the exact same answer without invoking the original attraction routine; the parallel V36 direct-ranker ablation tests that explicitly.

## Restrictions

- Actual annotated answer is read only in a separate pure forensic function AFTER the original full shape was frozen, never used to choose a path, inject a goal, create edges, train weights or alter the original Brain.
- This classifies SOURCE EVIDENCE availability and rank, not all possible unknown factual human knowledge.
- Nothing merged to main or overwrote other agents. No GPU performance claim.
- Independent OpenThoughts3 long-answer 0/24 failure remains unresolved.

## Run

    node --test v17/tests/v37-real-squad-frozen-forensics.test.mjs

# V23 additional stress: long solution shapes, missing observations and repeated views

Date: 2026-11-07. Branch: experiment/V23-OBSERVED-RELATIONAL-HYPERMAZE-20261107.

THIS IS A STRUCTURED TEXT-WORLD EXPERIMENT, NOT A NATURAL LANGUAGE SEMANTIC ACCURACY OR OPEN-ENDED QA PROOF. Canonical regression issue #25 is still OPEN.

## Frozen experiment

- Training: 15 independently witnessed before/action/after transitions yielding 3 textual templates; no test world is absorbed in training.
- Test: 100 previously unseen world seeds 160000..160099; each full state has four explicit observed axes: entity/phase/charge/epoch.
- Route length: 20..39 independent physical steps. The oracle path is hidden and is only used after the frozen prediction for scoring.
- Raw document size: mean 60,953 bytes; documents include competing side branches and unrelated text.
- Noise: remove 15% of observed text lines using a reproducible independent PRNG. Comparison: one copy vs three redundant copies, independently erased line-by-line. The copies are repeats, not independent semantically novel perspectives.
- Identical original V17 Discoverer.shape() operator used in all runs. No character predictor, alternate graph planner or simulated answer is inserted.

## Actual isolated V8 source execution (pre-commit)

| Condition | Correct entire pre-action physically executable paths |
|---|---:|
| Complete observed document | 100/100 (100%) |
| 15% independent observation erasure, one view | 2/100 (2%) |
| 15% independent observation erasure, three redundant views | 87/100 (87%) |

Success means the entire frozen graph path was physically validated against the separate generator-defined world graph, not that natural-language question answering is correct. This reproduces the straightforward reliability gain of repeating observations under independent random erasure, not new physics or intrinsic dimension discovery.

## Reproduce independently on Node.js 22+

    node --test v17/tests/v23-noisy-long-route.test.mjs

The CI workflow v23-observed-relational-hypermaze.yml runs this alongside original V22 parity and V23 general tests. Use native CI log for final native environment evidence.

## Falsification and open limitations

- Removing a random fraction of unique causal observations destroys almost all long paths, even when the original Discoverer.shape() remains correct: 2% is a substantial failure.
- Repetition restores enough edges for 87% success; this relies on graph completeness and noise independence. Correlated omissions or an incorrect physical rule would not be repaired by exact repetition.
- The system has NOT learned a latent manifold of text meaning and does not provide 70% pre-answer semantic correctness on natural OpenThoughts3 questions.
- This branch remains isolated from the original V17 worker, UI, GPU CUDA runtime and checkpoint location.

Test provenance: v17/tests/v23-noisy-long-route.test.mjs; source: v17/research/relational-hypermaze/engine.mjs.

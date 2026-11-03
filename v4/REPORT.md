# V4 experiment log

## Hypothesis

A shared learned model of transitions, coupled to a perspective selector and a connected trajectory generator, may reduce initial trajectory error and/or realized navigation effort against matched frozen and nonlearning controls.

This is a testable hypothesis, **not a reported success**. Run `node scripts-benchmark.mjs 200 9 12` to generate local `results/local-benchmark.json` including successes and failures. Seeds are fixed and validation uses independent seeds from the final test suite.

## Expected failure modes

- Learned logits may become overly conservative, resulting in few beam routes and frequent fallback.
- The policy can learn training-world statistics but fail to improve routes in unseen structures.
- Geometry and relation frame priors may have similar prediction loss, offering little reason for the gate to move.
- Online updates can reduce robustness and perform worse than frozen weights.
- Comparing only BCE or training loss without first-trajectory F1 and realized cost would be misleading.

## Research milestones not yet met

- Automatically inventing genuinely new representations and causal concepts beyond the two predefined frames.
- A fully neural connected trajectory generator without explicit algorithmic search.
- Entirely structure-blind world inference.
- Robust statistically replicated cross-domain transfer to independent graph families, text, and SAT.
- Any connection to a proof of P=NP or control over physical reality.

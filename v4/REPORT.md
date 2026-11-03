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

## Reproducible initial V4 result — 2026-11-03

Command: `node scripts-benchmark.mjs 200 9 12`. The test uses 12 previously unseen seeded worlds, drawn from the three supported families, with the same world seeds for every comparator. Full raw JSON is included at `results/local-benchmark.json`. Validation uses separate seeds and chooses the best observed checkpoint, not the last training episode.

| Metric | Untrained learned+online | Selected trained learned+online | Trained frozen | Neutral control |
| --- | ---: | ---: | ---: | ---: |
| Initial whole-route edge F1 | 0.1307 | 0.1585 | 0.1585 | 0.1793 |
| Success rate | 100% | 100% | 100% | 100% |
| Average realized cost | 30.417 | 32.750 | 32.667 | **27.833** |

**Verdict:** the first-shape F1 improved slightly over the untrained learned model, but remained worse than the neutral control. Navigation effort became worse, and online updates did not improve navigation on this test. This is a negative result for the strong hypothesis that the learning loop already improves problem solving. It proves the implementation is testable, not that the desired advantage has appeared. Repeated independent training seeds and harder controls are required.

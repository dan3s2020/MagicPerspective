# V23 unknown-answer goal predicates — held-out proof, 2026-11-07

STATUS: WORKING STRUCTURED COMPOSITIONAL LANGUAGE TASK, NOT OPEN-ENDED LANGUAGE INTELLIGENCE. The original source is preserved; issue #25 remains OPEN.

## What changed

Additive source v17/research/relational-hypermaze/unknown-answer.mjs extends V23 without modifying engine.mjs or V17/V22. A query interpreter induces two sentence structures from 12 observed question/slot examples. The question names only a source 4-axis state and a GOAL PROPERTY (phase and charge), never the answer entity. Its perceived document names the entities and observed transitions. The exact original V17 Discoverer.shape() propagates attraction from all perceivable states matching the goal PROPERTY and climbs the resulting field once, before any physical action.

This is not a next-character predictor or a learned latent decoder. The path is a sequence of named physical transformations in the four-axis text world. The independent evaluator checks all actions against generated world physics and independently computes the shortest physically valid route only after prediction.

## Internal source execution (isolated V8)

| Metric | Actual measurement |
|---|---:|
| World grammar witnessed transitions | 15 |
| Learned query format experiences | 12 |
| Frozen unseen world seeds 180000..180299 | 300 |
| First-attempt unknown-answer entity correctly identified | 300/300 = 100% |
| Predicted first route also shortest under independent BFS | 300/300 |
| Average document | ~22,408 bytes |
| Answer entity name supplied in question | No |
| Hidden graph / actual route revealed to the planner | No |
| Direct planning function | Original Discoverer.shape() |

Examples from the real internal run:

- Seed 180000: source entity180000_0 with phase4 charge2 asks which entity first attains phase5 charge2. Predicted entity180000_4; 4 steps; oracle distance 4.
- Seed 180001: source entity180001_0 with phase4 charge2 asks phase5 charge3. Predicted entity180001_5; 5 steps; oracle distance 5.
- Seed 180002: source entity180002_0 with phase4 charge2 asks phase6 charge3. Predicted entity180002_6; 6 steps; oracle distance 6.

All entity labels and map transitions for these tests are new and are not witnessed during training. The generator does construct the test question from a reachable property; this is allowed evaluation-task design, but it is NOT evidence of general unknown-goal inference.

## Falsification and limitations

- Unknown natural-language question structures abstain rather than invent answers.
- If no observed relations are present, there is no predicted route.
- Only 2 known QUESTION formats and 3 known FACT surface templates were trained; lexical and semantic out-of-distribution generalization was NOT demonstrated.
- The goal PROPERTY is supplied in the question, similar to maze goal coordinates. It is not inferred independently from unconstrained language.
- Native V17 worker, original live UI, CUDA, OpenThoughts3 corpus question-to-answer accuracy and intrinsic hyperdimensional-noise discovery were not run or verified.

## Reproduce on a clean checkout of the isolated V23 branch

    node --test v17/tests/v23-unknown-answer.test.mjs

Tracked source: v17/research/relational-hypermaze/unknown-answer.mjs. GitHub Actions workflow v23-observed-relational-hypermaze.yml runs the added held-out tests.

These 300/300 structural results exceed the 70% threshold in this precisely defined problem class only. The user-requested general large-text semantic first-answer benchmark remains OPEN/UNVERIFIED.

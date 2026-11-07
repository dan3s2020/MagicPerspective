# V23 — measured observed relational text hypermaze — 2026-11-07

STATUS: ISOLATED STRUCTURED WORLD SUCCESS. NOT A COMPLETE OPEN-DOMAIN LANGUAGE OR CUDA/UI SOLUTION. GitHub regression issue #25 remains OPEN.

## Baseline and source protection

V23 was forked at V22 commit 669449d45a7a04dbd780c5ab4ec800c49fe593fd. The actual original V17 propagation operator, Discoverer.shape(), is imported directly from v17/transcend/torus-aether/worlds/exercise.mjs and is never replaced with a next-character predictor. The original immutable source is exercise-v17-IMMUTABLE-BASELINE.mjs. No baseline, worker, UI, dataset, model state, historical branch or checkpoint was edited.

## Hypothesis and representation

The learner observes independently witnessed before/action/after interventions, induces 3 sentence transformation patterns from 15 observations, and then parses brand-new long text worlds containing relations between 4-axis states: entity, phase, charge and epoch. Each recorded sentence contributes a possible directed action edge. A known start and known goal are provided exactly as the organism can see the maze entrance and exit. The ground-truth world graph and correct action route are retained only by an independent evaluator.

V23 then invokes the ORIGINAL Discoverer.shape() once, computes the goal attraction over the perceived directed graph and freezes the entire ordered action path BEFORE any physical execution. The separately generated world physics is consulted only AFTER the prediction is frozen to check every proposed state/action/state transformation.

## Internally executed V8 evidence, original source

The actual engine source was executed in an isolated JavaScript V8 environment with exact V22 source after a syntax-only ESM import/export adaptation. Results do not claim an end-to-end Windows, Node service, CUDA, or UI run.

| Condition | Measured |
|---|---:|
| Experienced transition examples | 15 |
| Induced reusable grammar templates | 3 |
| Held-out seeds 120000..120299 | 300 |
| Entire first-predicted action path reaches goal | 300/300 = 100.0% |
| All predicted edges pass independent physical step verification | 300/300 |
| Shortest route against generated backbone | 300/300 |
| Unknown sentence grammar abstains | 300/300 |
| Empty training grammar abstains (initial control run) | 50/50; native suite targets 300/300 |
| Mean held-out document size | 21,206 bytes |
| Source method | Direct V17 Discoverer.shape() |

Controlled world files average more than 2,000 words with distracting sentences and competing dead-end branches. The generator's route is never used by the learner as a target, and all evaluation world names, graph edges, start/goal pairings and distractions are unseen during the 15 witnessed training examples. Novel state tuples are compositional; the sentence templates and action vocabulary themselves are seen during training.

## Reproduce

From a checkout of this EXACT isolated V23 branch on Node.js 22+:

    node --test v17/tests/v22-exact-original-discoverer.test.mjs
    node --test v17/tests/v23-observed-relational-hypermaze.test.mjs
    node v17/research/relational-hypermaze/benchmark.mjs

The benchmark prints JSON with sample counts, full route success, independent physical validation, known-goal condition, negative controls, average document size, and explicit unmet requirements. GitHub Actions file .github/workflows/v23-observed-relational-hypermaze.yml executes the suite on Node.js. Check the actual workflow run before quoting native Node success; the first evidence above is isolated V8.

## Why this is not the user's requested final result

1. This benchmark uses 4 **supplied observable axes**, not autonomously discovered hidden dimensions or a validated noise-space manifold.
2. The synthetic document contains all traversable transitions, and the exact goal state is provided. A question whose answer is not represented by any perceived goal predicate is NOT solved.
3. It has not demonstrated 70% accuracy on truly held-out semantic questions or answers from OpenThoughts3, nor semantic relation induction from unconstrained natural language.
4. It has not integrated into the original V17 live UI, native worker, checkpoint stream, or RTX 3050 Ti CUDA training path.
5. The test-world generator contains a guaranteed valid route; 100% in this constrained task is not evidence for general-language 100%.
6. The original V22 test remains the regression baseline, and the public issue #25 must remain OPEN.

## Hypotheses and decisive negative controls

H1: Same original maze shape operator can navigate induced compositional text transition graph without any next-character objective. PASS for the specified synthetic tasks.

H2: Removing training or introducing unseen sentence structure should NOT produce fictional paths. PASS for measured controls.

H3: Held-out random new entities and combined state tuples are navigable from a finite number of witnessed generic sentence transformations. PASS for the stated supported grammar.

H4: Unconstrained natural text with unknown answers, learned semantic transformations, stochastic noisy worlds, dynamic hidden goals, and native CUDA end-to-end operation. OPEN/NOT DEMONSTRATED.

The measured first-action 100% exceeds 70% only on this narrow structured text navigation test. It must NEVER be relabeled 70% open-ended semantic answer prediction.

User-intent contract: user-intent/changes/V23-OBSERVED-RELATIONAL-HYPERMAZE-20261107.json.

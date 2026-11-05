# SAME-DISH-ENTANGLED-AB-V1

Date: 2026-10-04
Base: `MAP-CELLS-PROCEDURAL-DYNAMICS-V3-20261004`
Branch: `SAME-DISH-ENTANGLED-AB-V1-20261004`

## Purpose

Put persistent organism A and persistent organism B into the **same physical map at the same time** without merging their learned state. A is bootstrapped as the target/affordance seeker. B is bootstrapped as the resistance explorer. The scientific question is whether A can learn useful world structure from B's **observable behavior** without reading B's brain, Concept World, Atlas, hidden state, or privileged map truth.

This is operational coupling, not quantum entanglement.

## Source-locked donors retained

- V9 physical map/world and opaque four-action mechanics from the existing Map Cells branch.
- Separate Local Brain A and Local Brain B from the V9 trainer. They remain distinct objects and distinct optimizers.
- Higher Common Self remains B-only, as in the donor trainer.
- Separate 2xF32 Concept World A/B.
- Separate Concept Flow fields A/B with contextual resistance/permeability/affordance.
- Separate Universal Concept Atlas A/B.
- Existing procedural dynamics is reused independently per organism.
- Existing V5 curriculum/split generator is reused unchanged.

The original `map-cells` path is not replaced. Same-dish is an additive experiment so the donor remains a regression baseline.

## Physical contract

There are four physical cells in one world:

- A owns physical cells 0 and 1.
- B owns physical cells 2 and 3.
- Each two-cell body must remain internally connected.
- A and B may touch and block each other, but contact does **not** make one mechanical body. The donor mechanics is executed on an organism-local two-cell subworld, then committed to the shared occupancy field only when it does not collide with the other organism.
- Resolution order alternates A/B and local-cell order per joint step to avoid a permanent first-mover privilege.

## Learner-visible OTHER channel

Each local cell still gets exactly 13 causal channels. The same-dish schema is:

1-4. immediate local wall contact probes;
5-6. own partner relative offset;
7-8. own last actual displacement;
9-10. other-organism centroid relative offset;
11-12. other-organism previous observable motor-intent vector;
13. own motor mismatch.

The OTHER channel contains no map kind, seed, coordinates, checkpoint, distance field, route, oracle path, B hidden state, B weights, B Concept World, or B Atlas.

A rejected B action is therefore not copied into A as `wall=true`. A has to infer it temporally from B intent plus B's subsequent lack/change of displacement.

## Bootstrap roles

A desired outcome: `G0`.

B desired outcome: `R_DISCOVERY`.

A retains sparse terminal target reward. B does not receive target-progress reward. B gets a small intrinsic reward for a newly encountered rejected transition and a small repeat cost; reaching G0 is not rewarded for B. This makes the first experiment test complementary exploration rather than two copies of the same target policy.

The role names are bootstrap contexts, not permanent semantic ontology. Later perspective/RSI work can test dynamic role exchange.

## Separate learning contract

One shared physical episode executes two independent learning paths:

`world -> A sensors -> ConceptA -> LocalBrainA -> FlowA/AtlasA -> A action`

and

`world -> B sensors -> ConceptB -> LocalBrainB + HigherB -> FlowB/AtlasB -> B action`.

They meet only through shared physical consequences and the learner-visible OTHER channel.

No weight averaging, hidden-state sharing, Atlas copying, Concept World copying, or direct reward-message channel is introduced.

## Causal coupling test

Every frozen map can be evaluated twice with identical trained parameters and seed:

- `LIVE`: relative position + observable previous motor intent from the other organism are present.
- `MASKED`: channels 9-12 are zeroed.

The evaluation reports:

- A target success LIVE vs MASKED;
- A mean steps LIVE vs MASKED;
- B resistance-discovery success and discovery count;
- contact counts.

A positive frozen unseen-map delta is evidence that B's observable behavior is useful to A. The implementation deliberately does **not** call this proof until the measured delta exists.

## Run

Double-click:

`RUN_SAME_DISH.cmd`

Defaults:

- 1000 total episodes;
- checkpoint every 50 episodes;
- frozen LIVE-vs-MASKED validation every 100 episodes;
- checkpoint under `runtime-same-dish/same-dish-checkpoint.bin`.

Environment overrides are supported: `EPISODES`, `SAVE_EVERY`, `EVAL_EVERY`, `EVAL_COUNT`, `CAPTURE_EVERY`.

## V1 boundary

This commit implements the core same-dish causal experiment. It does not yet claim that V12 autonomously invented the Yin/Yang split. A/B roles are deliberately bootstrapped so the cross-organism information channel can be measured first. Autonomous Perspective Discovery can only be judged after this lower-level causal dependency is real and reproducible.

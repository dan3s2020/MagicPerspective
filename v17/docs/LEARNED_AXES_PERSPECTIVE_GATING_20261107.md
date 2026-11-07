# MagicPerspective V17: learned axes, perspective gating, stochastic solution paths

2026-11-07. Research branch only. No changes to the original V17 Brain, aligner, live training, UI, or checkpoint.

## Tested hypothesis

A potentially useful "axis" is an action-conditioned transformation between STATES, not necessarily a literal x/y/z direction or a coordinate in the symbol torus. Perspective gating can be learned by comparing how reliably observed state components predict their post-action counterparts.

The hidden synthetic world includes six stable symbolic channels at undisclosed, randomly chosen positions inside 64, 256, or 2048 observed channels. All other positions change randomly and use the SAME six-value vocabulary. A set of six interventions applies hidden permutations and sometimes a random secondary permutation. The learner knows neither the active locations nor the hidden mappings or random outcomes before observing them.

## What is actually learned

1. Which output channels have reliable matches in the PREVIOUS observed state, conditioned on intervention.
2. Which six channels remain active through all interventions (functional axis discovery, all other channels gated).
3. What reusable permutation each intervention induces, learned from observations rather than supplied maps.
4. What residual stochastic transformations happen after the main action, with conditional probabilities.
5. What path of action transformations will reach a novel symbolic goal, predicted BEFORE acting.
6. How to compare expected vs actual successor and replan when noise changed the path.

The test world is an S6 symbolic permutation environment with 720 core states. Its six stable axes are PLANTED by the evaluator, although their positions are not given to the learner. This is not yet general language comprehension, mathematics beyond rearrangements, or proof of physical quantum axes.

## Files

- v17/research/learned-axes/hidden-world.mjs — evaluator-only hidden physics, NOT imported by learner.
- v17/research/learned-axes/axis-navigator.mjs — actual observed-transition learner, axis gate, learned transform planner, noise distribution, step trace.
- v17/tests/learned-axis-gating.test.mjs — held-out comparisons, five seeds, causal ablations, calibration, live-style path trace, original ConstructedTransitionGraph baseline, mathematical hexagon proof.
- .github/workflows/v17-learned-axes-20261107.yml — GitHub Actions tests and original V17 regressions.

Execute:
    node --test v17/tests/learned-axis-gating.test.mjs

## Measured experimental results

Training: 230 observations for each of six actions, 1380 total. Initial-state train/test sets do not overlap. Test: 260 unseen symbolic permutations, 1560 state/action cases.

| Observed state size | Relevant positions discovered | Deterministic next-state accuracy |
| ---: | ---: | ---: |
| 64 | 6 | 1560/1560 |
| 256 | 6 | 1560/1560 |
| 2048 | 6 | 1560/1560 |

Original V17 ConstructedTransitionGraph exact-state lookup on the same observed core state/action examples: 0/1560 when the initial state is entirely unseen; new reusable transformation predictor: 1560/1560. This is NOT a comparison to a large language model or to an optimally designed symbolic learner.

200 unseen goal pairs: 200/200 complete predicted deterministic action paths reached their specified goal, before any real action, longest route 7 moves.

160 stochastic goal episodes, max 12 actions:
- execute original full prediction with NO feedback: 66/160;
- observe and replan using discovered transformations: 160/160;
- also use inferred noise probabilities for expected-distance action choice: 160/160 (no gain over replanning on this particular simple world);
- random actions: 4/160.

Causal controls on 900 held-out samples:
- original learned axes and matching action operators: 900/900;
- wrong, randomly changing axes instead: 0/900;
- shuffled action-to-transformation associations: 0/900.

6,000 fresh stochastic observations:
- action-conditioned learned noise negative log-likelihood: 0.6043 nats/event;
- globally pooled noise: 0.6445 nats/event;
- uniform three-way noise: 1.0986 nats/event.
The conditional improvement over pooled is ~0.04017 nats per event.

Replicated 6-of-64 discovery over 5 independent hidden axis layouts (seeds 17, 31, 73, 127, 211), all with 1560/1560 held-out deterministic transitions correct.

## A genuine observed path trace

In one fixed-seed experiment:
- retained functional axes in the 64-channel observation: positions 11, 12, 16, 42, 48, 54;
- current compact state: [3,4,1,0,2,5];
- target: [5,0,3,1,2,4];
- predicted complete shape BEFORE first action: a, b, e, a, d, f;
- after the first action a, predicted [4,3,1,0,2,5], actual [3,4,1,0,2,5] due to random cancellation;
- the observation was one of the learned chance branches with probability ~0.178;
- the organism detected surprise and reissued the route, finishing in 7 actions with one unexpected transition.

This log is based on actual executed transitions, not a decorative UI animation.

## Why the images' 432 / 324 / 243 permutations were interesting

The six permutations of [2,3,4] occupy 3-coordinate space but satisfy x+y+z=9, and thus form a regular hexagon in a TWO-dimensional affine plane. The opposite points sum componentwise to [6,6,6]. That is why 432+234=666, but the decimal notation has no demonstrated mystical/physical force. The usable mathematical principle is a set of relative transformations with an invariant.

## Hard falsification and limits

The learned permutation transforms preserve the multiset of tokens. They cannot create missing symbols, calculate an addition, or solve unrestricted grammar. For example, a goal [0,1,2,3,4,6] cannot be reached by permuting [0,1,2,3,4,5]. This failure is explicitly tested; it identifies the NEXT missing piece, a learned non-conservative semantic/arithmetical transformation.

None of these synthetic tests proves that MagicPerspective original AligningGraph uses high-D geometry for causal next-character choice, that there are exactly six physical axes, or that noise alone introduces meaningful new information.

The next genuine language test must train on real observed text/math state-transition pairs with held-out new symbols/expressions, compare to the original frozen text aligner, and require semantic goal validity, not merely token permutations.

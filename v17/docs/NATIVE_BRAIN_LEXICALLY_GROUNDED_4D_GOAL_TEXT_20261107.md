# Native MagicPerspective V17: learned 4D TEXT goal navigation across UNSEEN sentence orders

Date: 2026-11-07. Branch: `experiment/V17-GROUNDED-4D-TEXT-GOAL-BRAIN-20261107` (isolated, not merged into `main`).

## Execution order and provenance

First, a complete local Node.js implementation and six tests were run independently **before** editing the repository. Local evidence: 6/6 tests passing; 3 seeds x 64 withheld novel 4D textual worlds; 22,921,076 total document characters. The local result reported 191/192 stochastic-repaired actions.

Then the learned input→4D state→goal→action navigation class was moved into the **original native V17 Brain**, *without importing the synthetic physics or teacher map*. The original `Brain` now owns the `TextWorldNavigator`, which serializes inside the same `.v8` file, restores its trainable lexical classifier and learned transition effects, and exposes `learnTextWorldAction`, `learnTextWorldClaim`, `learnTextWorldReliability`, and `predictTextWorldShape`. Original CUDA TextCard, language branches, 2D maze actor, original graph geometry, transformation brains and saved checkpoint format were not replaced.

After native integration, the independent GitHub runner measured **192/192** stochastic outcomes repaired, versus 191/192 in the original local implementation; the improvement comes from the changed path-selection/observation implementation. The tests do NOT force either result; both are recorded as distinct evidence. The native results below are authoritative for this branch.

## Exact mechanism, not next-character prediction

1. **World states** are 4D toroidal coordinates in `{0,1,2,3}^4`, with 256 possible states. Eight action verbs are initially *unmapped*; real state/action/result observations are used to estimate the action's most frequent 4D delta. These learned deltas, NOT the world's true transition function, drive forward search.
2. **Language grounding** is a supervised lexical predicate learner (word and adjacent-word feature likelihoods). It is trained on 8,000 observed statement/label pairs using **six sentence-order templates**, and evaluated on **six entirely unused sentence-order templates**. This replaces PR #55's hard-coded full-sentence fact regex. It still assumes coordinates appear as four digits and the source entity belongs to a known vocabulary — NOT unrestricted semantic parsing.
3. **Perspective/source trust** is learned independently from 8,000 observed quoted-vs-true claims. In this controlled training world, the `ledger` source happens to be infallible, and other sources lie at measured rates. Belief state is reconstructed from the long document using the learned lexical predicate and source trust.
4. **Goal-conditioned solution-shape prediction** runs exact shortest-path breadth-first search using the observed 4D map hypothesis and the **learned** action transforms. Its entire action path is constructed BEFORE the first hidden-world action. It does not consult heldout true map, reference path or future random draws. The route is then executed by a completely separate environment step function; successful plan prediction and actual step execution are measured separately.
5. **Noise / observations / feedback:** physical action failures are sampled AFTER a plan is frozen; the same model replans on the new real observed position. The native `Brain.planTextWorldWithNoise` additionally connects to the ORIGINAL saved `NoiseAgency` with learned contextual policy. It can perturb only copied uncertain *internal perception* states or tie-break among imagined future paths; the real world map is never modified. `observeTextWorldOutcome` updates the native noise bandit only from observed before/after/solved physical events. During heldout tests the policy is frozen.
6. **Checkpoint:** original V17 `Brain.save()` and `Brain.load()` restore the new lexical/action/reliability model, as well as the original `NoiseAgency`. A test proves that the exact same heldout route can be reconstructed after restore, and the original CUDA learning methods still exist and run independently.

## Independent measured results: 192 unseen, new syntax, 3 seeds

| Measurement | Observed native result |
|---|---:|
| Complete initial 4D optimal route predicted BEFORE first action | **192/192** |
| Retain only two of the four dimensions | **0/192** |
| 25% independent physical action failures; execute initial route WITHOUT correction | **35/192** |
| Same chance process; observe and REPLAN the same state-action model | **192/192** |
| Trusted `ledger` starts lying at 34% in unseen worlds (source shift) | **65/192** |
| Replace learned passability lexical cues with novel unseen vocabulary | **0/192** |
| Real total test input text | **22,921,076 characters** |
| Text-world facts processed | **147,456 factual observations** |
| Heldout examples updating action / lexical parameters | **zero** |

Note on the 100% headline: This is a narrowly controlled **structured procedural text world**, not arbitrary unseen OpenThoughts Q/A reasoning. A fixed entity/coordinate ontology, small known action set and an infallible source under the main test distribution make this task far easier than general natural-language interpretation. Explicit BFS constructs the route; the navigator does not independently invent the BFS algorithm. Claims of 100% universal text understanding are disproven by the OOD controls.

## What the ORIGINAL organism-owned noise learned

After **40 actual training-world executions** with observed rewards, the original `NoiseAgency` selected **perception perturbations 40/40 times**, imagination 0/40, none 0/40 and action 0/40. It changed copied internal beliefs; no environment fact was altered. The imagination path operator was verified separately as a unit, but this is NOT evidence that the learned policy selected it. Frozen paired evaluation of 64 further unseen worlds: **no-noise 64/64; native learned-noise 64/64**. Thus the noise policy EXECUTES and retains learned rewards but has **no demonstrated benefit** on this saturated test. It may be over-selecting one intervention mode. The saved policy and RNG state are restored from the same Brain `.v8` checkpoint.

## Independent CI acceptance

GitHub Actions workflow: `.github/workflows/v17-native-grounded-4d-goal-training.yml`.
Independent run, validated: https://github.com/dan3s2020/MagicPerspective/actions/runs/42343485197

- 6/6 native Brain text-goal tests (actual model training, heldout first action, dimensional ablation, noise contingency, OOD controls and checkpoint reloading).
- 1/1 original native NoiseAgency learning / heldout / checkpoint / real physical action test.
- 5/5 original constructed-path model regressions.
- 3/3 existing native NoiseAgency regressions.
- 1/1 real original Brain baseline using **exactly 12,000 actual input characters**, 3 actual maze episodes, save/restore and 6 frozen unseen mazes.
- 5/5 previous independent PR #55 4D research tests.
- **Total 21/21 Node tests, 0 failures.** Independently reproduced the 3-seed 22.9M-character result, uploaded observation JSON as Actions artifact.

An older existing `v17/tests/torus-brain.test.mjs` incorrectly assumes that `docs/` has at least 12,000 characters, even though `docs/ARCHITECTURE.md` is only 4,097 bytes in the repository. It therefore plays only 2 mazes while asserting 3. It was NOT modified; a separate correct 12k-character baseline test was added.

## What is *not* implemented or validated and must NOT be represented as complete

- Native OpenThoughts3-1.2M text rows do not automatically carry four-axis state/action/label supervision. The new `Brain` methods are operational, but the live OpenThoughts streaming trainer is NOT yet capable of turning general prompts and answers into these action/world-state labels. Claiming it is already learning language as a 4D maze would be false.
- This is a 4D world model attached to native Brain, NOT the unconstrained n-dimensional natural-language manifold, multi-resolution torus expansion, or universal semantic shape finder.
- The original CUDA TextCard still trains next-character alignment; the new goal navigator has not replaced or been trained by that CUDA kernel. GPU saturation, >MB/s full-organism training and RTX3050 Ti integration remain unmeasured.
- The original live V17 UI still needs native per-action animation of these learned 4D paths, before-action predicted shape vs actual path and intervention deltas. This experiment did NOT invent a fake UI.
- A stable learned noise policy outperforming no-noise, robustness to novel vocabulary / shifted sources, and >70% correct first-attempt answers to long real unseen Q/A remain unproven.

Do not issue a new Windows production command or merge this draft as if the entire user specification were satisfied.

## Reproduce

From the repository root:

```text
node --test v17/tests/goal-text-4d-native-brain.test.mjs
node --test v17/tests/native-text-world-endogenous-noise.test.mjs
node --test v17/tests/goal-text-original-brain-baseline.test.mjs
node v17/research/text-hypermaze/grounded-4d-benchmark.mjs
```

Files: `v17/transcend/torus-aether/worlds/goal-text-navigator.mjs`, `v17/transcend/torus-aether/devour/brain.mjs`, `v17/research/text-hypermaze/grounded-4d-benchmark.mjs`, plus the above tests.

Prior foundations: `v17/docs/TEXT_HYPERPATH_REQUIREMENT_20261106.md`, `v17/docs/NO_RELEASE_UNTIL_MECHANISMS_COMPLETE_20261106.md`, and `v17/docs/20261107_4D_CAUSAL_TEXT_PREACTION_REAL_TESTS.md`.
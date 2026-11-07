# V24 Exact Original Discoverer Question-to-Goal Navigation — 2026-11-07

**Release status: BLOCKED. No launch command. Original main and existing V17 unchanged.**

## Source, isolation, and no algorithm substitution

Parent: experiment/V23-OBSERVED-HYPERPATH-LONG-RANGE-20261107
Parent green CI: https://github.com/dan3s2020/MagicPerspective/actions/runs/42340826171

This is a new independent branch. Do NOT merge or overwrite the divergent V23-DIRECT-DISCOVERER-OBSERVABILITY branch (its CI was not green at inspection). Do NOT replace the original Discoverer.shape with the older experimental beam-search-only branch.

Unchanged originals:
- v17/transcend/torus-aether/worlds/exercise.mjs
- v17/transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs
- v17/transcend/torus-aether/worlds/learned-cognitive-map.mjs
- v17/transcend/torus-aether/align.mjs
- v17/transcend/torus-aether/devour/brain.mjs
- v17/transcend/torus-aether/ui/app.js
- v17/transcend/torus-aether/ui/text-hypermaze-live.js

Additive new model:
- v17/transcend/torus-aether/worlds/question-goal-navigation.mjs
- Learns question-to-answer targets using 32D LatentGoalField and native Geometry's observed 5D torus coordinates. Time/progress is an additional axis.
- Learns each actual observed answer token transition into the V17 LearnedCognitiveMap; constructs the whole initial route BEFORE moving.
- Calls LearnedCognitiveMap.formObservedWorld -> originalDiscovererOnText -> ORIGINAL Discoverer.shape. It does not substitute a token generator, BFS answer oracle, or unrelated path planner.
- Missing/contradictory observed edges are walls, not invented transitions.
- Plans frozen and does not see the withheld/reference answer; complete-answer scoring happens AFTER inference.
- The observed action replayer is the native learned graph, not independent semantic environment feedback.

Additive native integration:
- devour/worker.mjs trains goal evidence on real training Q/A episodes and preserves it in the same Brain checkpoint (questionGoalNavigator property); pre-ingest shape is computed BEFORE the current row enters any learned map.
- devour/devour.mjs adds POST /question-goal-plan and POST /question-goal-heldout. The latter sends only QUESTION to planner worker, keeping hidden reference in the HTTP parent.
- ui/index.html keeps previous controls and adds the V24 panel.
- ui/question-goal-live.js renders native 5D positions, whole initial line, observed replay, metrics and withheld-answer exact scores. No decorative or fabricated graph points.

## Actually executed tests

CI: https://github.com/dan3s2020/MagicPerspective/actions/runs/42342076233
- Linux and Windows core native tests PASS.
- Exactly original V17 Discoverer.shape predicts 145 previously observed action transitions BEFORE the first movement.
- Original maze 2D parity with the byte-immutable baseline, including seeded noise, passes.
- Missing and contradictory action edges are rejected.
- Native Windows process reads actual Parquet format with 80 Q/A records: 64 training, 16 reserved held-out under original openTextDataset.
- 64 observed training Q/A rows, 742 observed actions, 77 active distinct state transitions, actual 5D geometry, persistent native Brain, HTTP endpoints and original+additive UI all verified.
- Four withheld questions deliberately require completely novel full answers; **0/4 first-shot full-answer exact**. This test clearly FAILS the user's required generalization acceptance, even though the integration tests passed.
- The hidden reference answers were not passed into the planning worker.

## Concrete gaps that BLOCK release

1. A reachable target in a graph of observed transitions is NOT equivalent to knowing the correct full answer to a previously unseen question.
2. Current answer state is a sliding two-token history; it cannot represent all long-range constraints in a large text. The 5D goal and 32D learned vector are active but not sufficient to determine correct novel terminal states.
3. Native cognitive map keeps at most 50,000 active observed external transitions; QuestionGoalNavigator stores at most 9,000 terminal candidates. Older edges may be compacted (counters exposed). Do not claim infinite retention or no omissions.
4. Native cognitive text/goal/geometry updates run on Node CPU, not entirely CUDA. User RTX 3050 Ti GPU throughput requirements (hundreds of exercises and megabytes/s) are unmeasured and not established.
5. The old V17 AligningGraph chat remains unchanged; this is a separate question-goal mode, not a silent engine replacement.
6. Frozen action execution replays known observed effects; it is not independent external-world semantic feedback.
7. CI does not have user's local original OpenThoughts3-1.2M Parquet corpus or NVIDIA card. Its synthetic-format Q/A test demonstrates plumbing but cannot establish exact unseen accuracy on the real corpus.
8. No evidence of arbitrary unseen long natural-language responses exact on first try exists; do not claim 100%.

## Strict release guard

v17/tests/v24-release-contract.mjs explicitly refuses release without:
- original Discoverer.shape and unchanged original 2D solver parity;
- real original OpenThoughts3 reserved long-answer disjoint tests, every entire answer exact on first try;
- real 5D and 32D goal causality, original UI live observability and native checkpoint roundtrip;
- full CUDA training on user's device and requested throughput;
- non-destructive original branch preservation.

Its unit test asserts the successful integration run with 0/4 actual full answers is BLOCKED. User explicitly requested no launch command before all proof gates pass. Comply.

## Research next directions

- Learn a verifiable goal predicate from question alone without substituting a previously memorized ending.
- Make the persistent text state hierarchical and multi-scale while preserving EXACT original 2D solver math.
- Compare FULL answer exactness on truly disjoint lengthy OpenThoughts exercises and report missing edges/walls and errors.
- Move the actual native state, geometry and goal computation to CUDA without losing baseline parity and checkpoint integrity.
- Preserve every working UI, input, slider, world and historical branch.

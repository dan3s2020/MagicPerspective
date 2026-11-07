# MagicPerspective V25 — temporal text-state navigation, ORIGINAL V17 Discoverer
2026-11-07 | EXPERIMENTAL | USER RELEASE GATE BLOCKED

## Architecture and preservation
Branch: experiment/V25-ORIGINAL-DISCOVERER-TEMPORAL-TEXT-SHAPES-20261107
Parent: experiment/V24-EXACT-DISCOVERER-QUESTION-GOAL-NAVIGATION-20261107.
Original V17 exercise.mjs, immutable 2D baseline, V19 LearnedCognitiveMap, previous controls and main are unchanged.
Actual path operator: original V17 Discoverer.shape. No independent new beam/BFS solver is substituted.
V25 builds observed text action states (last-two-tokens, time step). Every legal edge must be a real observed action, and step increases by exactly 1. Final target is a learned terminal candidate and a question-predicted time/length interval.
Missing, ambiguous or contradictory observed edges are walls; finite node/length budgets are explicit and failure is returned, never hidden.
The learned length field has 128 question features, a count/mean and up to 4096 bounded historical prototypes. Original method gets a finite time-lifted topology and produces the whole route before any execution.
V24 LEGACY mode is available for ablations. The inherited auxiliary 32D question-goal estimator is NOT the solution-shape operator or proof of semantics. Main, CUDA training code and earlier branches remain untouched.

## Reproducible completed evidence
Linux/Windows regression CI: https://github.com/dan3s2020/MagicPerspective/actions/runs/42343498963
Original Discoverer.shape predicts 145 observed steps before first action on a time-indexed graph, where V24's two-token destination allows fewer than 10 steps.
Native 2D immutable maze parity passes (seeded temperature); removing an edge or introducing an ambiguous action causes abstention.
Native V17 Windows integration: 64 genuine operations on original-format Parquet Q/A rows, 742 observed text actions, 77 active edges, original UI and additive V25 controls, endpoint, and persistent checkpoint verified.
On a deliberately disjoint controlled heldout fixture, 0/4 entire answers are exact. In one real worker test, predicted answer length = 9 tokens, planned length = 7. These tests are NOT proof of general language accuracy.

## Original OpenThoughts3 long-answer evidence collection
Independent source audit: https://github.com/dan3s2020/MagicPerspective/actions/runs/42343498952
v17/tests/v25-fetch-real-openthoughts.py fetches FULL original OpenThoughts3-1.2M conversation cells from the public dataset server, rejects truncated cells, and selects 64 training Q/A + 16 never-trained Q/A with every reference answer at least 2048 characters, using disjoint source row indexes and SHA256 provenance.
v17/tests/v25-http-openthoughts-real.test.mjs performs native V17 worker training and 16 frozen first-shot evaluations. Exact whole-answer accuracy, predicted answer length error, routed length error, and source hashes are recorded. The target answer is kept outside the planner process until scoring.
At creation this CI was still running. Do not invent a result: examine the workflow logs and artifact. If CI fails, that is a real blocked requirement.

## Unsatisfied requirements — keep regression issue #25 OPEN
1. 100% correct first-attempt predictions for long unseen text are NOT established.
2. The original cognitive map keeps 50,000 active external edges and compacts; original source rows are processed fully, but indefinite full graph evidence retention is not guaranteed.
3. Temporal lifting can exhaust the explicit 6000-node state budget on branching text networks. State compression/generalization is unsolved; no successful route must be fabricated.
4. Distinguishing a correct unknown target from an observed/guessed terminal remains unresolved.
5. All new native graph, goal and 5D Geometry updates currently run on Node CPU. CUDA-exclusive native text learning and 100+ ex/s or MB/s on RTX 3050 Ti remain untested.
6. Frozen action replay confirms learned transitions, NOT independent semantic correctness.
7. 32D vector inference inherited from V24 is an auxiliary experiment, NOT equivalent to the original maze solver or approved as the desired new target-discovery law.
8. No user approval to merge the experimental branch into main, change the definition or close blocking issue #25.

Do not release a launcher or claim completion until independently verified acceptance is met. Preserve old checkpoints, branches, UI and all user-defined requirements.
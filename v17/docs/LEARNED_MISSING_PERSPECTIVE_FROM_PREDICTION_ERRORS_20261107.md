# V17 research: the organism can NEED to expand its predictive perspective — measured tests
Date: 2026-11-07. Status: **isolated research**, not production integration or general language model.

Base branch: \`experiment/V17-PATH-HOLONOMY-MEMORY-DIMENSION-20261107\`.
This branch: \`experiment/V17-LEARN-MISSING-PERSPECTIVE-FROM-ERRORS-20261107\`.

## User's objective

"Continua" (continue the search for new experimentally validated puzzle pieces enabling language to be learned as a labyrinth). The previous experiments showed that two different action orders could arrive at the same visible input coordinates with different dependent outputs. The remaining question was whether a learner would **identify the need for a missing state coordinate from predictive errors**, instead of being handed the area/history coordinate.

We pursued two independent tests:
1. A research mathematical text world with empirically observed state-dependent local movements, where the resulting extra feature is chosen from held-out prediction errors.
2. The actual unmodified V17 \`TWorld\` lever/door physics with a partially observed symbolic retina, where a future door outcome is predicted from pre-action sensory history.

The production V17 Brain, CUDA, UI, checkpoint format, existing maze solver and main repository branch were **not modified**.

## Hypothesis A: choose the smallest missing predictive path coordinate from errors

**Research source:** \`v17/research/text-hypermaze/discover-missing-state.mjs\`.
**Reproduction:** \`node --test v17/tests/text-discover-missing-state.test.mjs\`.

The data generator uses the previously created experimental \`StateDependentTextAxes\` learner, which fits local numeric movements from paired text observations. The new learner does NOT receive the known signed-area formula, curvature or commutator.

For each observation it receives:
- starting full numeric text state;
- the action sequence it (the laboratory's controller) actually performed;
- the final *observed* numeric text state, revealed only to training/evaluation at the appropriate time.

We freeze disjoint 400 train, 160 validation and 200 final test trajectories. Test start coordinates (85–124) were not in training range (20–39) or validation range (45–74); test paths 45–81 actions, also longer than train 8–21. There is no final-answer number provided as input to the predictor.

Candidate hypotheses are deliberately LIMITED to:
- endpoint-only polynomial features (coordinates, displacement, degree-two products, step count);
- endpoint plus four most recent signed movements (short-memory baseline);
- endpoint plus **one** selected generic second-order ordered-action feature \`ordered_i_j = sum_{t} prefix_i(t)*action_j(t)\`, enumerated for i,j in {0,1}.

The learner fits least-squares coefficients from train observations only, uses VALIDATION errors to select a candidate when it reduces RMSE by at least 98%, then freezes model/choice before TEST. No target from held-out test is used in feature selection.

### Confirmed results, GitHub Actions run 42320606518 initially failed a secondary world-bounds assertion; the corrected subsequent run succeeded

On the noncommuting world (four independently observed paired textual transitions, not a physical quantum effect):
- three seeds **17,19,23**; 200 genuinely withheld random trajectories per seed.
- endpoint-only exact: **0/600**.
- endpoint plus last-four-movement baseline: **0/600**.
- with the one SELECTED ordered-interaction coordinate: **600/600**.
- shuffled history control: **23/600** exact (7+7+9).
- train-to-test change from short to long paths and disjoint starting ranges as described.
- selected coordinate \`ordered_1_0\` for seed17, \`ordered_0_1\` for seeds19,23. They describe equivalent cross-axis order information up to endpoint terms.
- independently observed second noncommuting field with different coefficients: **200/200** exact with one coordinate versus 0/200 endpoint exact.

In the integrable multiplication-like observed field:
- three seeds, **600/600** exact endpoint-only;
- selected **zero** new coordinates.
- No benefit from a fabricated history feature; the learner rejected expansion.

Noise-only falsification:
- adding independent ±20 stochastic outcomes unrelated to action order does NOT pass the strict evidence threshold; no invented deterministic memory coordinate selected.
- This is NOT proof that all useful noise is deterministic or that general stochastic language worlds need no memory.

### Constant online memory rather than storing the history

Once the best ordered interaction is empirically selected, it can be updated incrementally with existing cumulative displacements and **one auxiliary scalar**. The learner need not replay the entire action list for this restricted family.
Source test checks action paths of lengths **2,8,64,256,1024,2048**; online summary matches the offline full-history calculation exactly. The full-history learned world simulator itself also predicts correctly, so we are compressing the predictive sufficient state of a restricted system, NOT outperforming the original transition-law teacher.

Mathematical caveat: the feature enumeration, polynomial endpoint baseline, least-squares fitting and independent-validation selection are programmed inductive biases. A general organism has **not spontaneously invented arbitrary dimension-generating rules**. The model is a research detector of when one specified second-order coordinate pays for itself on unseen prediction.

## Hypothesis B: does ACTUAL V17 causal physics require a hidden predictive memory bit?

**Research source:** \`v17/research/text-hypermaze/discover-hidden-causal-bit.mjs\`.
**Reproduction:** \`node --test v17/tests/text-discover-hidden-causal-bit.test.mjs\`.

The WORLD PHYSICS is imported from unchanged \`v17/transcend/torus-aether/worlds/transform.mjs\`, class \`TWorld\`.

Test harness constructs one 7x7 original-symbol room:
- one V17 lever (terrain code 3) at (1,1);
- one V17 lever-controlled door (terrain code 5) at (3,1);
- the body at (3,3).
- the body follows controlled repeated tours to the lever and back, plus random no-op outputs that vary observable history lengths. This movement curriculum is GENERATED BY THE HARNESS; the agent did not independently discover the tour.
- at the starting body coordinate, the final 3x3 symbolic patch is IDENTICAL whether the hidden lever has been toggled an even or odd number of times. Door and lever are outside that final patch.
- before querying whether **two UP actions** would permit passage, the harness freezes a COPY of every local center-symbol observation accumulated along the path and the final 3x3 patch.
- only AFTER THE INPUT IS FROZEN does the harness execute the two UP actions in genuine V17 world physics. The boolean training label is whether the second action PHYSICALLY MOVED, not the \`lever\` flag, an oracle distance field, or the full board.
- no future-probe observations or door symbols are admitted into predictor inputs.

**Important caught-and-fixed leakage during design:** an initial interactive probe accidentally returned a mutable history array which the later two UP probe actions also appended to. That would have exposed future information. This was caught BEFORE committing the research test and fixed using \`observedCenters.slice()\` and a pre-probe \`currentPatch\` snapshot. The final automated tests explicitly assert future door symbol 15 is absent from history. This failure is recorded because unrecognized future data would invalidate a discovery claim.

Generic candidate set (no lever-specific semantic label): for each sensory center symbol observed in train, count its occurrences modulo 2, then fit whether the observed future outcome differs for parity0/parity1. Select one bit only when independent validation improves over a constant predictor by at least 15 percentage points. This is a programmed PARITY feature family; the algorithm chooses the symbol and whether any state augmentation is necessary.

### Fully held-out original physics result

**3 independent seeds:**
- train 240 episodes/seed, number of lever visits 0..3;
- validation 100 episodes/seed, visits 0..3;
- heldout TEST 200 episodes/seed, **unseen visit counts 4..7**.
- final 3x3 patch has exactly ONE unique value across all test episodes.
- baseline using current observation / last 4 center symbols: **100/200** each seed;
- selected parity of observed center symbol **8**: **200/200** each seed (600/600 total).
- history-permutation controls: **106/200**, **102/200**, **94/200**, respectively (~chance).
- the selected symbol is discovered statistically; the training algorithm receives no semantic annotation identifying a lever.
- in a NO-LEVER control world, the door's outcome is always predictable, and learner chooses **zero** extra memory bits, 200/200 correct.

Online bit update is just XOR with (currently observed center symbol == selected symbol). Tested for 0,1,2,3,4,5,6,7,16,32,64,128 lever tours, including 1,459 sensory observations: the whole history can be discarded after maintaining one bit. This is exactly the kind of local-to-global predictive state compression that the earlier global/body-perspective audit demanded in a restricted world.

### Interpretation and limitations of B

This is a **real original V17 TWorld test**, which makes it stronger than a self-contained toy invented solely for the result. But the paths, the geometry of the room, the candidate feature family (parity), and the fixed two-action probe are EXPLICIT. The live V17 Brain did not learn a lever-seeking exploration policy, discover the memory-bit family autonomously, or test natural-language tasks in this experiment.

These experiments support one narrow but important principle:

> When two histories produce identical current observations but have different action-conditioned futures, the learner needs some additional predictive state. In these restricted examples, independent held-out evaluation can select ONE extra scalar/bit that restores accurate prediction, and can reject that extra state when unnecessary.

This is related to predictive state representations, causal states and the general problem of partial observability, NOT evidence of new quantum physics or a Nobel-level result.

## Original V17 and previous discoveries remain untouched

Prior research documentation:
- \`docs/RESEARCH_EVIDENCE_AND_HYPOTHESIS_ATLAS_20261106.md\` on main includes V1–V17 successes AND failures, plus explicitly partial verbatim archives.
- \`v17/docs/RESEARCH_PUZZLE_EVIDENCE_AUDIT_AND_PATH_MEMORY_20261107.md\` (preceding experimental branch) links global→body, construction of solution shapes, original \`NoiseAgency\`, 2048 randomness, learned contextual transformations, and path signed-area findings.
- The new experiments do not resolve all open main/branch documentation or verbatim completeness issues.
- No other agent's working branch was merged or overwritten.

## Scientific next gate

Integrate candidate discovery into the real V17 streaming language/maze Brain as a SEPARATE safely testable experimental module, not a cosmetic UI overlay. Let the learner:
1. propose an action from its learned transformation repertoire;
2. predict a distribution of next observations, then act and record actual surprise;
3. form candidate small state features only when the SAME current observation yields contradictory futures from genuinely different histories;
4. use independent holdout performance and complexity cost to select or reject the extra coordinate;
5. compare against a strong recurrent/belief-state baseline with the **same input budget**;
6. show the actual pre-action predicted route, observable sensory/causal history, selected hidden-state bit/scalar, executed steps and subsequent prediction delta in the existing V17 UI.
7. test unrelated natural-language corpora and genuinely unseen semantic transformation families; do not substitute success on numeric token puzzles.

**Acceptance status:** successful GitHub Actions run checked for commit \`18e5939688c947a1b10b0238b9d5c3d2dd81dda3\`, job \`128245578616\`. Tests: 7 new generic path-state tests + 5 new original-V17 hidden-bit tests + 6 prior nonlinear-axis regressions + 8 prior V17 observed-edit regressions = **26 passes, 0 failures**.

Source commands:

    node --test v17/tests/text-discover-missing-state.test.mjs
    node --test v17/tests/text-discover-hidden-causal-bit.test.mjs
    node --test v17/tests/text-hypermaze-state-dependent.test.mjs
    node --test v17/tests/observed-transformations-v17.test.mjs

**Do not call these production live-learning results:** this research is isolated and hand-crafted feature candidates still matter.

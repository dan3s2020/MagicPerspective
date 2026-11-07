# MAGIC PERSPECTIVE — PUZZLE PIECES: CROSS-REPO EVIDENCE ATLAS AND NEW PATH MEMORY TEST
Date: 2026-11-07. Branch: experiment/V17-PATH-HOLONOMY-MEMORY-DIMENSION-20261107.
**STATUS:** Research branch only, not integrated into production V17 Brain, current Windows deployment, its original UI or main. No claims of Nobel-level novelty, quantum physical effects, independent peer review, or general natural-language competence.

## Is everything in the repo documented?

**No, not on main, and not as a complete verified verbatim record.**
- Main has \`docs/RESEARCH_EVIDENCE_AND_HYPOTHESIS_ATLAS_20261106.md\` (older V1–V17 evidence + failures) and \`docs/RESEARCH_GLOBAL_BODY_PERSPECTIVE_V17_LIVE_EVIDENCE_HYPOTHESES_20261107.md\`, plus several partial verbatim archives.
- Main's \`verbatim/SOURCE_POLICY.md\` and archive/audit describe completeness blockers. We must not call the partial archive complete.
- Latest test evidence is dispersed over *isolated, unmerged branches*; it is accessible on GitHub but not part of main's canonical tree. Do not erase/overwrite separate agents' work or make undocumented merges.
- This file is the audit INDEX for the research relevant to the new text-path hypothesis. It does not pretend to inventory every branch/commit in the repository.

## What the real source says about earlier discoveries

### 1. High maze solve rates depend on sensory access and programmed propagation

Source: \`v17/transcend/torus-aether/worlds/exercise.mjs\`; main's evidence atlas and global↔body audit.
\`Discoverer.shape\` explicitly propagates a learned-attraction / conductance field through neighbors and extracts a path. \`playExercise\` gives the entire symbolic retina repeatedly at action steps in the original full-view mode. The agent learns body-effect and symbol roles, but the propagation algorithm is programmed. Reported 100% unseen-map success should NOT be interpreted as spontaneous discovery of the general-purpose planning algorithm.

The later \`worlds/constructed-paths.mjs\` experiment provides one complete map in training, masked local views in frozen evaluation: documented 24/24 unseen masked mazes with 331 actions vs 24/24 with 349 actions control; first-shape progress 44.02% vs 39.85%. Those small differences are not statistically decisive.

### 2. Global→body transformation is a distinct active hypothesis

Source: \`worlds/perspective.mjs\` and main \`docs/RESEARCH_GLOBAL_BODY_PERSPECTIVE_V17_LIVE_EVIDENCE_HYPOTHESES_20261107.md\`. The organism receives one initial complete map then local egocentric 5x5 patches and motion feedback. It must estimate heading and position in remembered map coordinates. The evaluator-only world pose must never be passed as a training label at inference. The original class \`PerspectiveLearner\` learns a four-frame discrete rotation mapping, NOT a demonstrated continuous xD projection.

### 3. Toy-world causal action laws and prediction uncertainty

Source: \`worlds/causal.mjs\` and \`worlds/transform.mjs\`. The world has true plate/lever/door physics. Some switches are reversible, some persist and change future reachability. It is an attractive controlled domain for testing whether history and partial observation demand a hidden-state representation.

### 4. Noise agency was tested; stronger novelty not yet proven

Source: \`v17/docs/ENDOGENOUS_NOISE_PROOF_20261106.md\`.
One eight-seed report: 96 held-out mazes, no noise 95/96, fixed noise 96/96, learned agent-controlled noise 96/96; 64 causal tasks 31/64,31/64,32/64. Under active frozen-agent-selected noise, causal solved 29/64. This does NOT prove selecting noise beats strong controls. It limits claims about "quantum noise navigation".

### 5. Geometric dimensional scaling and stochastic 2048 analogy

Sources: \`v17/docs/XD_DIMENSIONAL_RETURN_PREDICTIVE_GRAPH_20261107.md\` and \`v17/docs/2048_STOCHASTIC_DIRECTIONAL_PATHS_20261107.md\`.
The native symbol scorer's matrix rank cannot exceed the number of observed symbols; an xD scorer can have a smaller exact *frozen* graph. This is not full-brain compression.
In the independent 2048 stochastic board, actions change the possible subsequent spawn locations (18 vs 22 in one position), so the next chance-state support depends on the chosen direction. This is an action-conditioned uncertainty model, not literal quantum effects or spontaneous new coordinate dimensions.

### 6. Text transition tools now available in experiments, not production

Source: \`v17/docs/TEXT_HYPERMAZE_DISCOVERED_AXES_AND_INVARIANTS_20261107.md\`.
The original \`ObservedTransformations\` learns one-token edits with strict immediate-neighbor anchors. A research navigator learned evidence-backed variable axes from additional witnessed bridge sentences, then composed unseen text states; coupled numeric actions captured invariant arithmetic relationships, state-dependent local fields captured multiplication, and replanning handled synthetic stochastic perturbations.

Crucial limitation: these experiments ASSUME numeric-token structure, finite differences and a goal-conditioned search. The live production V17 organism does not yet learn that machinery autonomously from unrestricted language.

## NEW HYPOTHESIS: when noncommuting action axes create path-dependent effects, the organism may need to *expand its predictive perspective by one history coordinate*.

### Actual training observations and induced field

New read-only research module \`v17/research/text-hypermaze/path-holonomy.mjs\` consumes the existing observed-pair \`StateDependentTextAxes\` model.

Training examples in abstract symbolic text:
- 2 @ 3 ~ 6 → 3 @ 3 ~ 9
- 2 @ 4 ~ 8 → 3 @ 4 ~ 12
- 2 @ 3 ~ 6 → 2 @ 4 ~ 10
- 3 @ 3 ~ 9 → 3 @ 4 ~ 15

The parser does NOT assign algebraic meaning to @ or ~; the learner fits changes between numeric token coordinates, requiring cross-context evidence for both axes.

It learns, from these observations:
- X-movement: Δz = y·Δx
- Y-movement: Δz = 2x·Δy
- Difference (discrete commutator) β−α = 1.

From previously unseen state 5 @ 6 ~ 30:
- X then Y → 6 @ 7 ~ 48
- Y then X → 6 @ 7 ~ 47.
- Closed loop X,Y,−X,−Y returns to (x,y)=(5,6) but yields z=31.

The same visible x,y are INSUFFICIENT to reconstruct z from endpoint alone. If z is currently fully observed, it already distinguishes the two full states; an additional memory variable is only needed when z is omitted/latent or when predicting accumulated change from input coordinates alone.

### Mathematical sufficient statistic: route's signed area

With starting (x0,y0,z0), cumulative changes Δx,Δy, current increments δx,δy, define

    A <- A + (Δx_before * δy - Δy_before * δx).

For a paired learned local field

    dz = (a*y + cx) dx + (b*x + cy) dy,

the closed form after an arbitrary sequence of unit actions is

    z_final = z0
          + cx*Δx + cy*Δy
          + a*y0*Δx + b*x0*Δy
          + (a+b)/2 * Δx*Δy
          + (b-a)/2 * A.

The formula is DERIVED and built into this RESEARCH probe; the coefficients (a,b,cx,cy) are fitted from actual observed pairs by the existing \`StateDependentTextAxes\`, not hardcoded math operators. Thus (x,y,A) retains the relevant path-dependent information when only x,y are otherwise visible. An entire history can be summarized with one scalar A for this restricted locally affine 2-axis field.

If a=b, the area coefficient is zero and the operator is integrable: multiplication-like field has a=b=1 and predicts z=xy irrespective of X/Y order.

If a!=b, the route order changes z even if x,y return to the start. This is mathematically related to noncommutative vector fields, discrete holonomy / signed area / Lie brackets, not newly discovered physics or proof of quantum fields.

### Newly verified controls

**Manual source-driven execution on GitHub-fetched modules (current turn):**
- 200 deterministic pseudo-random, 32-action sequences from unseen starting text state 30 @ 30 ~ 900: full signed-area predictor **200/200** exact final states. Endpoint-only control: **5/200** exact. Shifted/permuted area-memory control: **3/200** exact.
- At initial 5 @ 6 ~ 30, observed XY→(6,7,48), YX→(6,7,47), and loop XYX⁻¹Y⁻¹→(5,6,31).
- Closed loops of side k=1,2,4,8,16,32,64,128 produce dependent-state residual **k²**, even when visible input coords return to the exact starting x,y. All eight cases matched learned action execution and the area formula (1,4,16,64,256,1024,4096,16384).
- A separate read directly from the native V17 \`TWorld\` physics with two possible persistent lever states found the same initial **3×3 local symbolic observation**, yet identical two-step action sequence produced two DIFFERENT positions (closed door endpoint 17 vs open door endpoint 10). Thus partial local observation is genuinely insufficient to predict future transitions in this original causal world without memory/belief or an informative action.

**CI acceptance:** \`v17/tests/text-path-holonomy-memory.test.mjs\` and \`.github/workflows/v17-text-path-holonomy-memory.yml\` were committed to the isolated branch. CI check must be explicitly verified before claiming pass; a missing or not-yet-completed GitHub Actions run is NOT a green test.

**Other controls in the new test suite:** integrable multiplication paths (zero area sensitivity), random paths (200), shuffled memory (control), insufficient cross-context evidence (reject curvature inference), actual original V17 causal physics (hidden lever state), and original perspective rotations.

### What this does not establish

1. This is an explicitly designed two-input locally affine toy text world; the area identity was **programmed**. The original live Brain did not spontaneously invent this missing coordinate or general language semantics.
2. Does not generalize to arbitrary xD vector fields; non-linear dependence and higher-order brackets may require more coordinates or an indefinitely long belief history.
3. No natural-language corpus held-out result, no independent peer-review, no physical quantum evidence.
4. The low-level native maze success still depends on full-map or training-oracle conditions described above.
5. The choice of a route-dependent coordinate must be justified by held-out **causal prediction improvements** versus strong history/state models, not its visual appeal.

### Next decisive experiment

Apply learned context-dependent transforms to actual V17 streamed text, without pre-assigning numeric slots. Detect when two empirically learned operators fail to commute from *observed state transitions*. Add a memory coordinate only when route history improves frozen held-out future prediction. Compare against a matched recurrent baseline, original context-scale character graph, full-state oracle, scrambled history and random geometry. Tie the trace to the actual live V17 UI (initial predicted route, physical execution, updated current state and uncertainty). If successful across unrelated natural language families, this would be much stronger evidence of self-discovered language labyrinth structure.

## Reproduce

    node --test v17/tests/text-path-holonomy-memory.test.mjs
    node --test v17/tests/text-hypermaze-state-dependent.test.mjs
    node --test v17/tests/observed-transformations-v17.test.mjs
    node --test v17/tests/constructed-paths-v17.test.mjs

This branch is experimental, original production code untouched.

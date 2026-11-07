# MagicPerspective V17 — LOCAL AXES + LEARNED WORD TRANSFORMS + REAL PREACTION PATHS
## Research record, 2026-11-07

### User's hypothesis, carefully distinguished from a proven fact

Give local axes to EVERY region/node of a graph, learn transformations that carry directions between differently oriented nodes, optionally gate irrelevant axes, handle noisy measurements, compose paths into a predicted solution shape *before acting*, and eventually apply the mechanism to text as a hyperdimensional labyrinth.

This branch experimentally proves a LIMITED, CHECKABLE subset of that idea on structured synthetic mathematical worlds. It DOES NOT claim full semantic language, independent consciousness, literal quantum mechanics, an unmodified production Brain already using this scheme, a general noise-driven solution algorithm, or zero-shot interpretation of arbitrary text.

Source branch: experiment/V17-2048-HIERARCHICAL-MERGE-20261107.
New code lives ONLY at v17/research/local-axes/ and v17/tests/, with one new CI workflow; unchanged native files remain unchanged, including align.mjs, devour/brain.mjs, concepts.mjs and V17 UI.
The native ConstructedTransitionGraph is IMPORTED and actually used to store and count observed transition evidence. The planner and newly invented local-frame model remain experimental rather than integrated into AligningGraph.write().

### The precise local-axis theorem and its physical consequence

For each vertex v in a connected D-dimensional graph, assign a local signed-permutation frame F_v (local direction -> global direction). A directly observed directional transport from vertex u into v is:

    T_uv = inverse(F_v) composed_with F_u.

Given the frame of one anchored reference node and a spanning tree with accurate observations of D independent local-basis probes on each tree edge:

    F_v = F_u composed_with inverse(T_uv).

So all local frames are algebraically identifiable. On ANY unseen graph edge u--v,

    predicted_T_uv = inverse(inferred_F_v) composed_with inferred_F_u

is therefore EXACT when the hidden world really satisfies the model.

Across any closed cycle, the product of edge transports must be identity ("zero holonomy"). A non-identity product is not a magical discovery of a sixth coordinate: it indicates measurement error or a genuinely non-flat connection. A curved world cannot generally be replaced by one consistent global frame.

A global action d_uv to reach a known adjacent state transforms into the local command:

    local_command_at_u = inverse(F_u) * d_uv.

The world applies F_u to it and obtains d_uv, so execution follows the precomputed route EXACTLY. This is a formal inductive proof, CONDITIONAL on compatible true frames, correct observations, the revealed topology, and faithful action physics. It does NOT show the original language Brain has learned these frames.

### What is learned from observations rather than supplied?

1. Node-relative T_uv is reconstructed from *observed basis-vector correspondences* ("what my +axis looks like at the neighbor") recorded in native ConstructedTransitionGraph.
2. The global chart of each node is inferred by composing these observed transports through the graph; all non-tree links are withheld.
3. An unfamiliar symbolic WORD (e.g. "fir", "pe", "aro") acquires its local direction meaning from observed state changes. The action vocabulary is not pre-labelled in the learner.
4. A mathematical-language prompt with explicit grammar "from (x1,...,xD) to (y1,...,yD)" names a start and target. The world topology/positions are public. BFS computes the *topological route* BEFORE action, learned frames turn global desired moves into local ones, and learned word meanings turn local moves into observable words.
5. All physical frames and word meanings are kept on the private simulator side and are used only to generate observations and execute/test actions. They are NOT given to the learner during planning.

Important: this is not a learned generic text parser; the coordinate-prompt grammar and BFS are explicit. Local orientation/word meanings are learned. Each new world receives calibration measurements of its own tree links: NOT zero-shot transfer to a completely unobserved world.

### Empirical tests and causal controls — from GitHub Actions logs

Workflow: .github/workflows/v17-local-axis-causal-routes.yml.

**2D–5D local frames and unseen-edge generalization**, 12 distinct randomly framed worlds per dimension:

| D | Withheld edges EXACT | Preaction routes executed EXACT | Global-frame-only exact |
| ---: | ---: | ---: | ---: |
| 2 | 48/48 | 295/295 | 42/295 |
| 3 | 336/336 | 321/321 | 9/321 |
| 4 | 1632/1632 | 329/329 | 4/329 |
| 5 | 6816/6816 | 334/334 | 4/334 |

A separate randomized-evidence control recovered 0/3808 withheld 4D edges while authentic observed transforms recovered 3808/3808. Observing only two of five axes had coverage 1/243 nodes; observing all basis axes had 243/243. These are controls on GENERALIZATION FROM OBSERVED CONSTRAINTS, not general mathematical cognition.

A single twisted loop edge produced 2 observed frame conflicts, against zero in the consistent flat world: detection of nontrivial holonomy / contradictory observations.

**Noisy frame observations**: in 3D, 24 worlds × 28 withheld edges = 672 edge tests.
- 1 noisy observation per axis at p=0.30: 1.64% accurate edge reconstruction.
- 13 repeated noisy observations per axis: 100% edge reconstruction.
This is a finite synthetic test, not a guarantee for arbitrary noise.

**Constrained arithmetic LANGUAGE**: separate finite-field Z_101 action-induction test.
Four meaningless operation words represent unknown affine transforms. The learner infers each word's affine coefficients from 16 observed examples and then predicts 1700/1700 heldout action transitions (85 unseen inputs × four words × five seeds). 650/650 new multi-step goal problems are solved using a route predicted before its first action; the reference answer is not fed at evaluation. Scrambled outcomes destroy the learned rules. At 30% observation noise with 24 per-word training samples, five tested seeds recovered all four rules correctly. The model detects that an unseen quadratic x->x² cannot be reliably approximated by a single affine action (only 4% training fit) and refuses that model. This is NOT proof of natural-language generalization.

**THE FULLY COUPLED experiment**, local frames + learnt unknown action words controlling actual physics. Eight worlds per dimension, two clean observed transitions per word, 30 random textual goals/world:

| D | Correct preaction word routes | Global-only frame ablation | Scrambled word meanings |
| ---: | ---: | ---: | ---: |
| 2 | 219/219 | 53/219 | 0/219 |
| 3 | 237/237 | 9/237 | 0/237 |
| 4 | 234/234 | 3/234 | 0/234 |
| 5 | 240/240 | 0/240 | 0/240 |

Total 930/930 correct. The two essential components are causally necessary in this benchmark: disabling either degrades performance while the textual goal and graph topology stay the same.

Noisy combined word calibration originally FAILED a stricter >90% success assertion in 4D: 54/64 correct with only 9 repeated frame probes and 17 word observations. It passed after increasing evidence to 21 independent frame measurements and 31 word observations per word (minimum word-confidence 0.55), yielding 31/32 in 2D, 48/48 in 3D, 64/64 in 4D (143/144 overall). This is an observation-budget effect, not an unchanged-sample accuracy improvement. Record the failure; do not erase it from scientific discussion.

**EXTENDED xD coupled protocol**, with 2^D states (NOT 2^D dimensions):

| D | World states | Unobserved edges recovered | Fully executed text routes | Without local frames |
| ---: | ---: | ---: | ---: | ---: |
| 6 | 64 | 387/387 | 70/70 | 2/70 |
| 8 | 256 | 2307/2307 | 71/71 | 1/71 |
| 10 | 1024 | 12291/12291 | 72/72 | 0/72 |
| 11 | 2048 | 18434/18434 | 48/48 | 0/48 |

These are newly calibrated graph worlds with ALL tree-edge basis samples provided (but **no withheld-edge observations**), not extrapolation without any new experience. The high-D experiments show the same transport principle is computationally executable at these scales, not that natural language lives on a 2048-dimensional chart.

Example real experiment trace, 11D / 2048 states:
- prompt: "from (1,1,0,1,1,1,1,1,1,0,0) to (1,1,0,1,0,0,1,1,1,0,1)"
- predicted state route BEFORE first move: 507 -> 475 -> 459 -> 1483
- learned output action words: fir -> pe -> aro
- physical execution: all three predicted transitions matched the actual world.

### Direct attempts to transfer the learned-geometry idea into the ORIGINAL V17 text predictor — NEGATIVE

Two separate frozen native-text evaluations were added AFTER the synthetic route research. Both import the unmodified V17 AligningGraph and Geometry classes and evaluate real held-out character streams, not generated outputs.

Corpus: separate ASCII-filtered segments of the repository's TORUS_AETHER_ABC_20261104.md. 23,000 train / 7,000 validation / 8,000 heldout characters. The *current* target character is unseen when scoring; previous characters are supplied as context (teacher-forced next-character evaluation). The interpolation parameter is chosen on validation only and then frozen for test.

**Native symbol geometry**:
- unmodified AligningGraph: 51.4375% top-1
- validation-chosen native + existing symbol 5D Geometry score: 51.2625%
- permuted geometry control at the same interpolation: 51.425%
- the geometry changed 3.725% of next-character choices but did NOT improve heldout accuracy.

**New contextual-state Geometry prototype**:
- Four separately trained geometries over the previous 1/2/3/4 actual bytes as state, each with native Geometry.learn.
- Validation selected context length 2 with interpolation 0.8.
- heldout original: 51.4375%
- heldout contextual geometry reranker: 51.2625%
- scrambled contextual geometry control: 49.725%
- contextual state was available at that length in 96.525% of heldout positions.
- Some signal is real (scrambling is worse), but it is not useful enough to beat the native aligner on this independent test.

**The negative result is important**: a nice mathematically consistent per-node frame transport in a synthetic world does NOT make V17's language generator learn the causal "form of the solution". Even modelling last-few-symbol contexts as geometric states with simple score interpolation did NOT improve the native text model. The attempted transfer mechanism must be changed; it must learn actual goal-conditioned ACTION TRANSFORMATIONS over contextual states and prove multi-step heldout text-task success, not just alter token scores. No positive natural-language claim is justified by these data.

Reproduction:
    node --test v17/tests/native-geometry-hybrid-text.test.mjs
    node --test v17/tests/native-context-axis-geometry.test.mjs

### What does NOT follow from these results?

- The original V17 AligningGraph.write() has not been changed and does not start using the new geometrical navigator just because these tests passed.
- The flat signed-permutation frames and accessible global topology are **hard constraints supplied by the experiment**, not emergently discovered natural-language representations. No arbitrary rotations/continuous curvature were learned here.
- Neither a quantum mechanism, mystical numerology, nor a universal dimensional law has been experimentally shown. The term "noise" here means controlled corruption of observations, and in prior 2048 tests random state injection; the two are separate phenomena.
- Perfect scores result from a precisely constrained model family with sufficient calibration evidence and an explicit graph-search operator. They do not mean the organism has attained 100% success at arbitrary unseen prose or mathematical equations.
- The data are generated synthetic worlds, not OpenThoughts3, not the user's locally trained Windows V17 checkpoint, and the tests run on GitHub Actions CPU, not the user’s CUDA GPU.

### Next falsifiable steps before claiming that V17 learns TEXT as a hyperdimensional maze

1. On the REAL V17 text graph, define a latent node/state that contains context, not only a symbol. Measure actual action-conditioned transitions and their errors as new bytes arrive.
2. Instead of assuming node frames are signed permutations, learn an appropriate local basis and edge transport from actual text experience. Allow non-flat/contradictory loops and test predictive cycle consistency instead of silently forcing a global frame.
3. Train goal-conditioned predictive policy/shape on held-out mathematical or linguistic task sequences where the correct complete answer is NOT available during planning.
4. Run a causal geometry intervention: perturb learned local frames and word meanings separately at a fixed frozen native checkpoint, demonstrate heldout solution accuracy drops in the real Brain.
5. Record LIVE preaction predicted route, actual chosen transition, post-action observation/noise and the revised shape in the original V17 UI, retaining all old buttons and unchanged defaults.
6. Add independent language corpora, tougher nonlinear symbolic operators, genuine learned action-value policies, controlled noise-injection experiments and credible baseline comparisons.
7. Only then consider an opt-in integration from the research branch into the production Brain and the original user UI.

### Reproduce

    node --test v17/tests/local-axis-transport-shapes.test.mjs
    node --test v17/tests/math-language-transformation-shapes.test.mjs
    node --test v17/tests/coupled-symbolic-local-axes.test.mjs
    node --test v17/tests/xd-2048-states-local-language.test.mjs
    node --test v17/tests/observed-text-paths.test.mjs
    node --test v17/tests/xd-gauge-collapse.test.mjs

The new research is isolated from all existing working UI and Brain files; original native observations are stored using the repository's ConstructedTransitionGraph class.

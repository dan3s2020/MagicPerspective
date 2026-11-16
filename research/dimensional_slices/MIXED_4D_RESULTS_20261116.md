# Original Braivour V17 — One body experiences four genuinely different 4D form worlds
## Research result | 2026-11-16 | Mixed-shape vs specialization

**User continuation, exact:** “Ok continua”

This is an additional controlled experiment continuing the same native A/C dimensional slicing research without changing the pre-existing `Brain`, `Discoverer`, active checkpoints, GGUF, CatMeows, production versions, or other branches.

### Key finding

With **identical training budgets of exactly 360 complete lived 4D worlds** and **the identical 400 independent heldout 4D objects**, one original `Brain` receiving experiences from four different shape families recovered hidden shapes substantially better overall than an identical original `Brain` trained only on the tesseract.

Each original Brain physically traversed the same fixed ten-pose world for every training episode via its original `Discoverer.shape`, `Discoverer.choose`, `Discoverer.learnStep` and `Brain.live`, and the native `Brain.disc.nativeActive4DAtlas` held its *own* experienced whole-view histories. No family labels, hidden 4D coordinates or next sensor frames were sent to the organism as an answer. Only the evaluator knows polytope family and hidden C3 during heldout scoring. No external learned predictor replaces the body.

### Actual performed protocol

| Condition | Tesseract training | 16-cell training | 5-cell training | 24-cell training | Total |
|---|---:|---:|---:|---:|---:|
| Specialized | 360 | 0 | 0 | 0 | **360** |
| Mixed, one body | 90 | 90 | 90 | 90 | **360** |

Both were independently tested on the same **100 fresh rotations of each** family (**400 heldout objects**; test seeds disjoint from train and all earlier experiments). The organism uses all nine accessible 2D 4×4 sensor views to predict **C3**. The C3 destination is walled off and cannot be visited or sensed by the body during any heldout evaluation. The original body does **not learn from heldout tests**.

Physical simulator geometry is not a cartoon: four different 4D convex polytopes and their real 3D hyperplane-edge intersections `w=h`, projected into separate A/C 2D quantized views.

Geometric 4D class properties:
- 4D tesseract: 16 vertices, 32 edges
- 4D 16-cell (cross polytope): 8 vertices, 24 edges
- 4D 5-cell (simplex): 5 vertices, 10 edges
- 4D 24-cell: 24 vertices, 96 edges

### Raw result: C3 full 4×4 exact form

| Heldout 4D family | 360 tesseracts only | 90 of each family, one body | Delta |
|---|---:|---:|---:|
| Tesseract | **25%** | 19% | −6 percentage points |
| 16-cell | 8% | **24%** | +16 pp |
| 5-cell | 0% | **12%** | +12 pp |
| 24-cell | 13% | **49%** | +36 pp |
| **Overall 400 independent worlds** | **11.5%** | **26.0%** | **+14.5 pp** |

Whole-world hidden target occupancy F1:
- Specialized: **72.509%**
- One mixed native body: **82.098%**
- Improvement: **+9.589 percentage points**

Brier score decreased by **0.0693** across 400 objects (lower is better).

### Proper paired independent-world audit

The two conditions see the **same target for every one of the 400 heldout seeds**. A separate read-only audit downloaded the **actual independently produced GitHub Actions JSON artifacts** from both original-Body runs and verifies identity of every seed, family and exact hidden target, matching training budgets, hidden-target exclusion, and frozen memory. It performs **10,000 object-cluster bootstrap draws** and **10,000 paired sign-flip draws**, comparing independent objects rather than correlated pixel cells.

| Contrast: mixed minus specialized | Paired delta | 95% bootstrap interval | Exploratory paired sign-flip p |
|---|---:|---:|---:|
| All 400: exact form | **+14.5 pp** | **[+10.0, +19.0] pp** | ≈0.00010 |
| All 400: occupied F1 | **+9.59 pp** | **[+7.71, +11.48] pp** | ≈0.00010 |
| 16-cell: exact | +16 pp | [+7, +26] pp | ≈0.00270 |
| 5-cell: exact | +12 pp | [+6, +19] pp | ≈0.00040 |
| 24-cell: exact | +36 pp | [+26, +46] pp | ≈0.00010 |
| Tesseract: exact | −6 pp | [−15, +3] pp | ≈0.260 |
| Tesseract: F1 | **−5.59 pp** | [−8.70, −2.63] pp | ≈0.00050 |

The exact full 4×4 hidden mask is the stringent score. The mixed-body result **significantly improves this measured outcome in this simulated environment** while giving up specialization. These p-values are exploratory across multiple related experiments, not a prospectively registered general-purpose AI claim.

### Falsified claims / what NOT to say

- **Do not claim zero-shot transfer to a completely untrained polytope.** Every family in the 400 heldout tests also appears in mixed training. The earlier tesseract-only experiment demonstrates that zero-shot transfer to other families was poor, which motivated this experiment.
- **Do not claim the organism reconstructed actual full four-dimensional geometry.** It predicts a fully withheld **2D 4×4 occupancy raster** of a 3D intersection slice of a 4D convex polytope. Continuous metric, mesh, polytope identity and physical laws are NOT recovered as latent variables.
- **Do not claim the native original Brain already had this ability without experimental additions.** Its original untouched `Brain` and `Discoverer` do the action/sensing; the native whole-form memory `Brain.disc.nativeActive4DAtlas` and view-conditioned retrieval are experiment-specific new additions owned by that body, not another separately trained network.
- **Do not call matched family experience evidence of general invariance across arbitrary dimensions, nor quantum entanglement, consciousness or GGUF intelligence transfer.**
- **Do not claim active view selection is superior to fixed/random.** Earlier active comparisons had no robust statistical benefit.

### Why this matters for architecture

The key effect is **within one original organism's shared memory of multi-family world experience**: after seeing four geometrically different 4D families, the same body can use its learned cross-view correspondences to recover more unseen perspectives of objects from those families. The experiment specifically distinguishes:
1. **Capacity to learn multiple shape families in one body (supported)** from
2. **Ability to transfer unseen structural laws to a previously unknown family (not yet shown)** and
3. **Ability to recover 4D hidden physical structure (not yet shown)**.

Next acceptance gate is a *fifth truly unseen 4D polytope family*, with comparable image complexity and fixed training budget, plus 8×8 and continuous-slice evaluation. It must preserve the same native body, causal interventions, frozen tests and scrambled association controls. Avoid copying the existing 4×4 lookup as a substitute for discovering new world transformations.

### Reproduction and evidence

- Original V17 Brain (unchanged): `v17/transcend/torus-aether/devour/brain.mjs`
- Original V17 Discoverer (unchanged): `v17/transcend/torus-aether/worlds/exercise.mjs`
- True polytope physics: `research/dimensional_slices/physical_new_4d_families.mjs`
- Equal-budget paired native-body experiment: `research/dimensional_slices/native_mixed_4d_one_body.mjs`
- Paired independent-world analysis: `research/dimensional_slices/compare_mixed_4d_results.mjs`
- Both actually executed original-Brain jobs: https://github.com/dan3s2020/MagicPerspective/actions/runs/43798852508
- Audit downloading and comparing their actual JSON artifacts: https://github.com/dan3s2020/MagicPerspective/actions/runs/43799161749

Run:
```bash
NATIVE_4D_TRAIN_MODE=tesseract-only node research/dimensional_slices/native_mixed_4d_one_body.mjs
NATIVE_4D_TRAIN_MODE=mixed-4d node research/dimensional_slices/native_mixed_4d_one_body.mjs
```

Each writes `runtime/dimensional_slices/native_mixed_4d_comparison_<mode>.json`. Their full physical traces and frozen per-object results were retained as GitHub Actions artifacts.

### Preservation

No merge to main. All original source files, old experimental branches, saved brains, training jobs, running versions, and visualizer code remain untouched. New research files are isolated in `experiment/V17-MIXED-4D-ONE-BODY-20261116`.

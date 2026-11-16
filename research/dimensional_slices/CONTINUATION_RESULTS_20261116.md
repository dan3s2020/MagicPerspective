# Braivour original V17 — 4D hidden form perspective research, 16 November 2026

## User request (exact, preserved)
> Ok continua

This continues the existing 2026-11-16 A/C and inverse-slice research **without replacing or editing the original `Brain`/`Discoverer`, any active training sessions, or pre-existing experiments**. `Brain.disc` is the same original native organism. The experimental native geometry memory and perspective-choice logic are separate opt-in research code, not existing production intelligence and not a new independently trained classifier.

## Grounded scientific question

Can a **single organism**, after physically acting in a world of **actual 4D tesseract hyperplane intersections**, reconstruct an inaccessible 2D sensor view of the same underlying 4D geometric object from its own previously lived views?

The world constructs actual 3D intersection points of 4D edges with **w=h** hyperplanes at five depths; A/C sensors produce two different 4×4 occupancy projections. That **does not** amount to recovering an actual 3D solid mesh, continuous 4D metric, or all Platonic solids as one physical object. The same generated tesseract class is present in train and all heldout test sets; 4D rotation seeds are independent and unseen.

The target **C3** is blocked from the physical world during each frozen test. Ground-truth C3 is read only by the evaluator after a prediction, and the native `Brain.live`/learning memory cannot update on heldout worlds.

## Baseline before this continuation

`research/dimensional_slices/RESULTS_20261116.md` and `research/dimensional_slices/native_inverse_whole_form.mjs` establish the earlier paired A/C relationship and original-body inverse experiments:
- Initial passive native Brain: **0% complete 4×4 form** / 0 occupied geometry F1.
- Native embodied movement/shapeGraph: true actions learned, but geometry prediction F1 still **0**.
- Native action-conditioned geometric experience: **66.67% F1**, advantage over shuffled perspective **0.97 percentage points** overall; cross-perspective advantage **3.89 percentage points** (exploratory).
- C3 withheld, three physically traversed anchor views, 150 independent new worlds: **7.33% exact**, F1 **74.85%**; 2-view control **9.33% exact**, F1 **76.2%**. Extra A3 had better Brier but not exact/F1.
- **Whole-experience original-body episodic memory**, same 150 worlds: **16.0% exact**, F1 **79.68%**, vs two-anchor 10.0% exact, 77.43% F1; label-scrambled control 4.67% exact.

## New experiment 1: native body chooses an observation on its own

Implementation: `research/dimensional_slices/native_active_view_information.mjs`.
Actual run: https://github.com/dan3s2020/MagicPerspective/actions/runs/43796641298

The original V17 organism physically learned all 10 world sensor positions in 360 fully experienced 4D training worlds via original `Discoverer.shape()/choose()/learnStep()`. An experimental perspective-selection rule **reads ONLY the original `Brain.disc.nativeActive4DAtlas`** and chooses a feasible additional physical perspective expected to separate learned alternative C3 forms. The original body actually travels there, before predicting heldout inaccessible C3. This new view-choice mechanism is **not** part of the unmodified original Discoverer itself; claiming otherwise would be false.

**200 independent new unseen 4D orientations**, 100% physical navigation/hidden-target control in this experiment:

| Condition | C3 exact | Occupied F1 |
|---|---:|---:|
| Base three views only | 18.5% | 80.03% |
| Random additional view | 18.5% | 80.05% |
| Fixed extra C4 view | 20.5% | 80.60% |
| Native memory-chosen extra view | **22.5%** | **80.90%** |
| Scrambled hidden form associations | 2.0% | 68.01% |

Native selected: C4 114, A4 73, C1 9, C5 4. Paired gain vs fixed C4 exact = **+2.0 percentage points, p≈0.413**; not significant. F1 gain vs fixed C4 = **+0.31 pp, p≈0.581**; not significant. The claim of proven superior active view selection is **NOT supported**.

## New experiment 2: the native body devours all nine accessible views

Implementation: `research/dimensional_slices/native_full_nine_view_inverse.mjs`.
Actual run: https://github.com/dan3s2020/MagicPerspective/actions/runs/43796938688

On **a separate set of 200 unseen orientations**, the original body visited **all 9 physically accessible A/C views** and never observed hidden C3; target remained inaccessible. Frozen native episodic retrieval produced:

| Condition | C3 exact | Occupied F1 |
|---|---:|---:|
| Three views | 21.5% | 80.55% |
| Native-selected 4 views | 19.5% | 80.90% |
| Six views | 25.5% | 82.31% |
| Eight views | 23.5% | 81.35% |
| **Nine views** | **28.0%** | **82.36%** |
| Nine views with scrambled C3 associations | 3.0% | 65.96% |

Nine vs actively selected four: **+8.5 pp exact**, paired object sign-flip p≈0.00625, exploratory after multiple experiments. Nine vs base three: +6.5 pp exact, p≈0.067, does not clear conventional 0.05 threshold. The 28% result is **specific to this independent holdout**, not a guaranteed general result.

One important metadata caveat in this older version: the inherited JSON field `predictionUsesOnlySelectedThreeOrFourViews` describes the active-control subprotocol, **NOT** the nine-view subprotocol. The later gestalt version corrects this distinction.

## New experiment 3: force native hidden predictions into coherent previously lived forms

Implementation: `research/dimensional_slices/native_gestalt_whole_form.mjs`.
Initial completed run: https://github.com/dan3s2020/MagicPerspective/actions/runs/43797676479

On **a third, independent 200-world holdout** (not reused from the preceding two), the original native-body library of COMPLETE previously experienced C3 shapes is decoded jointly. Its coherence-prior strength is calibrated via **leave-one-world-out strictly within the 360 training worlds**, excluding each source C3 before prediction. Nothing is tuned on the heldout target.

| Condition | C3 exact | Occupied F1 |
|---|---:|---:|
| Nine views independent cell probabilities | 19.5% | 80.84% |
| Coherent whole-shape decoder, training-calibrated | 20.0% | 80.32% |
| MAP full-shape among top candidates | **22.0%** | 78.37% |
| Closest whole lived form (K=1, predeclared ablation) | **23.0%** | 79.25% |
| Coherent decoder with no prior | 20.0% | 80.98% |
| Nine-view association-scrambled control | 4.5% | 66.16% |

**Verdict: a coherent shape prior does NOT robustly improve the earlier result.** On this holdout its exact improvement over independent cell probabilities was only 0.5 pp (paired sign-flip p=1). No claiming `Gestalt` solved the inverse geometry.

## Auditor: why is the exact form still missing?

Read-only evaluator (NOT a trained agent and not fed to the organism):
`research/dimensional_slices/native_gestalt_support_audit.mjs`.
Actual run: https://github.com/dan3s2020/MagicPerspective/actions/runs/43797952245

Of the hidden C3 *binary 4×4 target images*, the exact target mask was already present somewhere in the **360 genuinely lived training worlds** for:
- Active-choice holdout: **191/200 = 95.5%**
- Full-nine-view holdout: **190/200 = 95.0%**
- Gestalt holdout: **186/200 = 93.0%**

This is an **evaluator-only exact-template support ceiling** for methods restricted to selecting old forms. It is **not an achieved prediction**, not a proof the hidden 4D object was learned, and not evidence a specific unseen target can be uniquely identified. In the final holdout, only **one** test object had an exact match for all nine visible-view signatures in training; average nearest training distance was **11.64 sensor bits**. Most hidden targets have a familiar output pattern but unfamiliar **input perspective relationships**. Exact full-form retrieval is therefore bottlenecked by *cross-perspective inference*, not by absence of raw example forms.

## What survives scientific scrutiny

1. The ORIGINAL `Brain` physically learns action effects and uses them to traverse genuinely transformed 4D slices. It learns under these fixed world/simulator constraints, not universal 4D world physics.
2. Empirically learned associations between multiple same-source views beat shuffled and simple-copy baselines.
3. Whole-form reconstruction reaches **28% exact on one fresh 200-object set**, while **19.5% on a different 200-object set** under the same nine-view method. Do not cherry-pick either.
4. Active view-selection remains a **hypothesis**, not proven effective against fixed perspective.
5. Knowing that a target mask exists somewhere in memory **does not mean the agent can identify it**; the 93–95% evaluator ceiling versus 19.5–28% actual performance proves the missing link is relational.
6. The world only offers 4×4 projected intersections of a single shape family; the organism has NOT reconstructed 3D/4D objects, quantified exact arbitrary-geometry transformations, demonstrated physical quantum behavior, or transferred GGUF/language intelligence.
7. No source original `Brain`, UI, GGUF, production training, CatMeows, or other branch was modified.

## Next unsolved gate — stop recycling earlier tracks

**Causal relation between perspectives, not another stored form.** A useful next experiment must build *inside the same Brain.disc* a learned world-to-world **transformation relation** rather than pure Hamming-neighbor classification. It must pass independent exact withheld C3 reconstruction and generalize across a new 4D shape family; preregister the objective and retain controls (native 9-view, train-only support ceiling, shuffled targets, motor-only, copied views). If exact unseen C3 stagnates while template support remains high, the original organism needs a new relational representation rather than more atlas entries.

The work in this branch is experimental, with actual GitHub Actions logs and raw JSON attached to the runs. No generalized claim of novel high-dimensional cognition is warranted until independent geometry-family transfer succeeds.

# Braivour V17 — zero-shot test on genuinely untrained truncated 5-cell (4D)
## 2026-11-16 — executed, original organism preserved

**User request:** “Ok continua”

This continues the earlier original-organism A/C perspective dimensional-slice research documented in `research/dimensional_slices/MIXED_4D_RESULTS_20261116.md`. All work is isolated under `experiment/V17-UNSEEN-TRUNCATED-5CELL-20261116`. Existing `Brain`, `Discoverer`, UI, production sessions, datasets and unrelated experiments remain untouched.

### Actual physical world and strict novelty gate

The evaluator constructs a genuine **truncated 4-simplex (truncated 5-cell)**, 20 vertices and 40 edges in Euclidean 4D. True rotations and true 4D-edge intersections with `w=h` at five levels produce actual 3D cross-section point sets, seen via two separate 2D 4×4 quantized raster sensors A/C. See `physical_unseen_truncated_5cell.mjs`, where equal edge lengths are explicitly checked. This new polytope is neither a tesseract, ordinary 5-cell, 16-cell nor 24-cell. It is, however, **closely related to the trained 5-cell**, because it is constructed by truncating the 5-cell; do not misrepresent it as an unrelated physical domain.

Two original V17 brains have identical source code and exactly **360 lived training worlds** each: control exclusively tesseracts; mixed original Braivour has 90 each tesseracts, 16-cells, 5-cells and 24-cells. **Neither brain has EVER encountered a truncated 5-cell during training.** The family identity is only evaluator metadata, not an organism input. The same 200 novel truncated-simplex 4D rotation seeds are evaluated for both. C3 is physically unavailable during all heldout native actions and is scorer-only, after the prediction, and the original organism is frozen during evaluation.

The original `Discoverer.shape`, `choose`, `learnStep`, `endEpisode`, and `Brain.live` remain the motor and embodied lived-learning mechanism. The experiment-specific whole-view memory and native retrieval are attached to the existing `Brain.disc`; they are NOT part of the original unchanged repository source. They are NOT an independently trained neural predictor.

### Actual executed results (verified GitHub Actions)

Source: https://github.com/dan3s2020/MagicPerspective/actions/runs/43799511355

Both jobs succeeded; both physically reached all required views on **200/200** unseen worlds, hid C3 on every trial, and made no heldout learning updates.

| Original native Brain | Three perspectives: exact 4×4 C3 | Three perspectives: occupied F1 | Nine perspectives: exact C3 | Nine perspectives: occupied F1 |
|---|---:|---:|---:|---:|
| 360 tesseracts only | **0%** | **58.956%** | **0%** | **67.529%** |
| 90 of each of four different 4D families | **21.5%** | **82.419%** | **5.5%** | **70.348%** |

Additional observed controls in the mixed condition on the SAME 200 hidden targets:

| Source viewpoints | Exact C3 | Occupied F1 |
|---|---:|---:|
| 3 base views | **21.5%** | **82.419%** |
| Native choice of 4 views | 17.5% | 77.505% |
| 6 views | 6.5% | 72.877% |
| 8 views | 3.0% | 67.948% |
| 9 views | 5.5% | 70.348% |
| Nine views but target association scrambled | 0% | 53.607% |

**Key new observations:**
1. **Synthetic 4D form-family transfer:** Four-family previous life experience provides considerable benefit on the entirely untrained fifth, related shape family even with 360 experiences each. On the 3-view condition, +21.5 percentage points exact C3 and +23.46 percentage points occupied F1 relative to specialized tesseracts.
2. **Perspective interference:** More sensory observations are NOT always better. On this new family, exact C3 drops from 21.5% with three views to 5.5% with nine views; F1 drops by 12.07 points. A fixed nine-view policy thus cannot be equated with global form understanding.
3. **No evidence yet of a learned optimal policy choosing when not to look.** Existing experimental active choice of a fourth view dropped exact C3 from 21.5% to 17.5%. The body needs *relevance and reliability gating* of dimensions, not more input blindly.
4. **One source Brain, multiple families** improved both previously seen-family heldout and now a never-trained related family, under fixed original-organism motor mechanics. This supports further research, not universal high-dimensional intelligence.

### What is NOT supported

- The reconstructed target is a 4×4 **binary 2D silhouette** of an authentic 3D section of a 4D polytope. **No continuous 3D or 4D latent geometry was reconstructed.**
- The simulator provides action-world legality/physics, and the native body learns its motor mappings; this is not discovery of all physical laws.
- Original V17 Brain source untouched; the added `nativeActive4DAtlas` is an experimental sensory memory, with matching rule attached to the original Brain, not an automatic general cognitive theory.
- The trained 5-cell and new truncated 5-cell have shared geometrical ancestry; broader transfer to wholly unrelated hidden domains is untested.
- These results do NOT demonstrate quantum entanglement, Platonic metamorphosis as physical laws, consciousness, human language, GGUF intelligence assimilation, or general superintelligence.
- The paired-source statistical workflow is being added; **do not report a paired confidence interval or p-value without a completed run log**.

### Exact source and reproducibility

- Original unchanged source: `v17/transcend/torus-aether/devour/brain.mjs` and `v17/transcend/torus-aether/worlds/exercise.mjs`.
- Original two-view geometry: `research/dimensional_slices/physical_sections.mjs`.
- True unseen 4D truncated simplex: `research/dimensional_slices/physical_unseen_truncated_5cell.mjs`.
- Original Brain embodied training and frozen target evaluation: `research/dimensional_slices/native_zero_shot_truncated_5cell.mjs`.
- Read-only paired analysis over real original Brain JSON artifacts: `research/dimensional_slices/paired_unseen_truncated_5cell.mjs`.
- GitHub Actions both conditions: https://github.com/dan3s2020/MagicPerspective/actions/runs/43799511355
- Independent paired audit, when executed: `github/workflows/v17-unseen-truncated-5cell.yml` (dependent audit job) and `.github/workflows/v17-unseen-4d-paired.yml`.

```bash
NATIVE_4D_TRAIN_MODE=tesseract-only node research/dimensional_slices/native_zero_shot_truncated_5cell.mjs
NATIVE_4D_TRAIN_MODE=mixed-4d node research/dimensional_slices/native_zero_shot_truncated_5cell.mjs
```

**New experimental next gate:** a train-only calibrated native-body uncertainty gate selecting how many dimensions/perspectives to consider from 3/4/6/9, evaluated entirely on previously unseen truncated 5-cells. Neither evaluation family labels nor its hidden C3 nor its outcomes may guide training-time choice. A successful test must improve exact C3 beyond 21.5% and pass scrambled-association and paired control, not merely relabel the known 3-view winner.

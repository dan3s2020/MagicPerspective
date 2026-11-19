# Causal distinction behind 80.0% native view-selection development result

**Frozen before ablation runs, 2026-11-19.** The previous 1000-calibration all-window feedback + topology-feature original `ConstructedPathLearner` obtained **80.0% accuracy/79.84% macro-F1** on 400 human HS3D donor development rows, versus the **same original Brain's fixed70 77.0%**. A bandit feedback policy was 78.0%.

That improvement simultaneously changed *two* things relative to the earlier native policy: calibration size **200->1000** and feature-6 semantics **4nt diversity -> position topology**. Without causal ablation it is inappropriate to attribute the change to topology alone, or to more training alone.

## Exact, pre-committed new arms

Keep **identical** original Brain C5, original V42 R2/R3-off native learning, same 1200 training cases (600 authentic P+600 N), same SHA-sorted calibration population (next 500 P+500 N), and identical next 200 P+200 N development subset (indices 1100..1299/class). Original Brain still sees genuine 12 real 4-base windows and labels only during training. The original native policy is updated only *after* each calibration example's true class is revealed. No external learned classifier.

Three new variants:
- `R2R3-200-topology-all`: only the first **200** calibration examples, topology feature.
- `R2R3-1000-diversity-all`: **1000** calibration examples, diversity feature.
- `R2R3-200-diversity-all`: only **200** calibration examples, diversity feature.

Existing 4th cell already measured: `R2R3-allviews-topology`, **1000** calibration examples, topology feature, exact result 80.0%/79.84% F1.

Both feature definitions are *inputs to the existing original Brain-owned `ConstructedPathLearner.pathPolicy[6]`*, never a separate trained predictive head: topology is `1-min(1,abs(pos-70)/30)`, diversity is `unique(four bases)/4`. The policy sees labels only as historical rewards *after* its own Brain.predict() candidate outputs are generated. All 12 native candidates are sensed before selection: **not a limited-observation unknown-target active vision claim**.

Report exact original policy updates, 12-way selection distribution, all per-class metrics and fixed70/fixed72 confidence controls. Do not choose a new architecture based on this development data or pretend the already-viewed official donor Test is freshly blind. If neither factor causes robust gain, retain the negative diagnosis and prioritize a genuinely separate biological task/homology holdout.

Source is pinned `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`; official `Test` is never downloaded by this matrix. Original Brain, donor GGUF and older projects remain unchanged.

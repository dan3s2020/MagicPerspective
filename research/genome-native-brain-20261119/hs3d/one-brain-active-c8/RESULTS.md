# Original same Brain C8 physical action and 8nt fusion: causal negative and memory-interference diagnosis

**Date:** 2026-11-21. Original V42 Brain unchanged. Five actual GitHub Actions native experiments completed: https://github.com/dan3s2020/MagicPerspective/actions/runs/44921982774

## What this NEW mechanism truly tested

One and only ONE actual `Brain` object with native C8 was trained on genuine 1200 human HS3D 140nt AG acceptor sequences to classify P/N given two genuinely observed four-base windows. Then the very SAME Brain used its own native `Brain.predict` to select **two primitive physical movements** `again/undo/open/right/new/left`, seeing the real DNA after each movement, and used native C8 `Brain.predict` over `real start70 four bases + actually selected final four bases` to classify. During training only, `Brain.live` learned final +/- success/failure of BOTH real actions. Separate modes optionally lived the authentic paired final DNA + true P/N only after the movement. C8, A2, R2/R3 off, seed20261121. No original Brain rewrite, outside classifier, Q table, synthetic DNA, teacher-selected best action or Qwen donor. The six primitive meanings and physical positions were researcher-authored. 400 previously studied HS3D Train-derived dev records; exploratory, NOT independent validation.

**All 5 finished actual arms (same real data, same original Brain implementation):**

| Original ONE-Brain native learning mode | Correct/400 | Accuracy | Macro-F1 | Learned final location |
|---|---:|---:|---:|---|
| Action learning absent (`active-zero`) | 225 | 56.25% | 56.10% | all400 at70, `again > again` |
| **REAL delayed outcome reward both actions** (`active-delayed`) | **281** | **70.25%** | **69.28%** | all400 at64, `new > left` |
| Reward independent of success (`active-shuffled`) | 215 | 53.75% | 52.41% | all400 at78, `right > new` |
| Real reward + 1000 authentic native encountered paired-class feedback (`active-delayed-class`) | 279 | 69.75% | 69.03% | all400 at64, `left > left` |
| Shuffled reward + same 1000 authentic paired-class feedback (`active-shuffled-class`) | 247 | 61.75% | 61.60% | position70 in376/400, 74 in11, 78 in13 |

All five returned actual complete original `Brain.live/predict` outputs; no failed/synthetic jobs. `active-delayed` and `active-shuffled` lived exactly 32k native symbols (12k real supervised class +20k actual action experiences), both extra-class arms 42k (12k +20k +10k real post-action class), and zero arm 12k. Arm comparisons are matched ONLY within their paired experience budgets.

### Mechanistic decisive failure

In `active-zero` the original fused C8 classifier on the exact fixed64 two-real-view sensory context scored **299/400 = 74.75% accuracy and 74.11% F1** (reproduces previously frozen standalone C8); but its untrained native actions stay at70 and score just56.25%.

In `active-delayed`, native action policy DOES learn to navigate physically to the correct traditional position64 on ALL 400, but the SAME original Brain's fixed64 readout has **already regressed to281/400 = 70.25%** after it lived20k reward symbols. The native body output is exactly equal to matched fixed64 score — no dynamic choice advantage. Original C selected rule changed **exact:149 → fold:131**. In `active-delayed-class`, native action learned fixed64 on all400, but global selected C rule changed to **exact:195**; native/fixed64 result279/400, still lower than the initial299/400. The additional 1000 on-policy true paired-class experiences did NOT repair this.

In `active-shuffled`, original Brain learns a **wrong constant primitive composition**, final position78 all400, and classification drops to53.75%. This is a causal negative control showing that generic reward exposure alone is not sufficient.

Thus **the integration of genuine native movement and actual paired C8 perception is technically working**, but a useful learned state-dependent navigation/above-ceiling fused class capability did NOT emerge. Most crucial new diagnosis: *sharing the same global `Brain.live` next-symbol memory for action reward events and class events changes the native C rule, even though the input domain has the !! action prefix*. This is **global associative interference**, not an inability to physically execute the candidate actions. Do NOT present it as surpassing the 70.31% previously pre-frozen external result, which belonged to a different class-only model and evaluated on different data.

## What needs to change, not repeat

The unmodified original `Brain` already contains an internal `ConstructedPathLearner` with `pathPolicy` and `ConstructedTransitionGraph`. This is a **different native memory compartment in the SAME Brain object**, distinct from the global `LeanC` class predictor. A truly new experiment can protect C8 class memory from reward-token interference by learning action outcomes in `brain.constructedPaths.links.observe` and/or `learnTransferable` without calling `Brain.live` with unrelated reward symbols. This is not a separate external model; it is the existing internal path organism.

For action choice to surpass fixed64, the fused classifier must have been genuinely trained to classify at more than one potential destination, e.g. real paired [70:74]+[64:68] and real paired [70:74]+[66:70] from the same human source, not a manually injected correct route. A C8 classifier learned only at64 cannot benefit from alternate paths even if the body finds them. A full paired training plan must be pre-registered, balance exposure, show exact native source counts and test native destination routing against same-Brain fixed64, fixed66, random and destroyed-reward controls. A negative result must be recorded.

**Follow-up NOT executed at the moment this file was authored:** internal original ConstructedPathLearner protected C8 memory. No biological independent gene-family proof or AG2 comparison.

## Reproducibility
- [Initial preregistered method](./PRETEST.md)
- [Full true/shuffled/feedback original Brain metrics and action histograms](./results/one-original-Brain-C8-active-five-real-mechanisms.json)
- [Actual original Brain one-object native script](./run-one-native-Brain-active-C8.mjs)
- [Five successful original-native CI jobs](https://github.com/dan3s2020/MagicPerspective/actions/runs/44921982774)
- Related prior C8 fusion positive independent-source results: [../c8-fusion/RESULTS.md](../c8-fusion/RESULTS.md)

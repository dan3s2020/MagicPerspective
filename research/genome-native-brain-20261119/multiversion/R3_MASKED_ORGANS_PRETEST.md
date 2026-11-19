# Native R3 × A-organ interaction test — registered before outcomes

19 November 2026. **New causal hypothesis distinct from prior tests:** The original V42 with native R3 enabled produces the *same* 400-development classification results when depth/A geometry/folding are varied, and a C-only compatibility run also produces the original default confusion. But native `off:["R3"]` increases macro-F1 from 0.7676 to 0.8362 at exactly 900 training examples. This suggests that the original learned **trust reread may suppress useful A-organ signals** on this task, though we have not yet traced per-step probabilities.

Rather than rerun the previous single-factor variants with different seeds, combine each original native A mechanism with R3 ablation and test whether **previously masked effects become empirically visible**, or show that native A's longer-range/contextual structures remain useless. No new classifier, unknown data or separate learner.

**Exact predetermined modes:** with same source V42 Brain, 900 true UCI training examples, same data order, same seed, frozen dev400 and original four-base position:
1. `r3off-baseline` — original off R3, A depth 2.
2. `r3off-depth1` — original off R3, one A.
3. `r3off-depth4` — original off R3, four A.
4. `r3off-blend` — native A blend wire type.
5. `r3off-log` — native A log-time wire type.
6. `r3off-concept` — native A concept/geometry wire type.
7. `r3off-event` — native A event-clock wire type.
8. `r3off-no-bud` — original native A's R5 budding disabled.
9. `r3off-no-resistance` — original R2 ablated (learn every symbol).
10. `r3off-precedent` — original A `weigh:"precedent"`.
11. `r3off-deepweight` — original A `weigh:"deep"`.
12. `r3off-c3` — original C cap3 while native R3 readback off.

Outcome: report all confusion matrices, macro-F1, balanced accuracy, accuracy, native code paths and failures, including if equal to original R3-off baseline or worse.

**Evaluation is exploratory.** The 400 development labels have already been used for several hypotheses; the previous 197 and 702 UCI holdouts are both now examined and cannot be claimed as unseen confirmations after selecting a new combination. This interaction screen does **not** claim any success versus AlphaGenome 2.

A success beyond 0.8362 development macro-F1 would only identify a promising original-native configuration to freeze for a **new externally independent biological dataset**, *not* an AG2 victory.

**Scope limits and no regression:** root source `Brain.live()`, `Brain.predict()`, `EmergentChain`, `LeanC`, and all current user Qwen GGUF workflows unchanged. A separate additive experiment file is used; previously measured results remain immutable.

# CRITICAL — unauthorized TinyStories motor substitution (2026-11-07)

**STOP SHIP / NOT SOLVED / ORIGINAL V17 MUST NOT BE REPLACED**.

## Source of truth
Exact user correction preserved at `verbatim/2026-11-07-TINYSTORIES-CRITICAL-REGRESSION-USER-VERBATIM.txt`. Related permanent original objective regression: `REGRESSION_USER_DIRECTIVE_2026-11-06.md` (Issue #25) and `docs/CRITICAL_REGRESSION_TEXTCARD_VS_HYPERDIMENSIONAL_GOAL_PATHS_20261107.md`.

## Additional confirmed regression

Previous assistant versions `feature/V17-CUDA-STREAMING-MEGABYTE-TEXT-20261107`, `feature/TINYSTORIES-ALL-NATIVE-WORLDS-LIVE-20261107`, and `feature/TINYSTORIES-UNIFIED-ONE-BRAIN-GPU-20261107` substituted or split the original native organism: a fast 1–4-byte count table, a second CPU worker that lagged far behind the 100%-trained dataset, and later a replacement 5D co-occurrence model plus an unrelated maze-policy head. These did NOT implement the original brain's ENDOGENOUS noise, shared state/action learned semantics, complete pre-first-answer solution shape and body re-planning mechanism for texts. Green CI tests checked component outputs, not this binding system requirement. Exact main branch old code was not overwritten by those isolated feature branches; the user's already trained `.npz` and original `.v8` checkpoints must remain untouched.

The observed TinyStories 64.43% frozen next-byte accuracy after 2,119,489 stories is NOT a score of first-try final response correctness or a 5D hypermaze goal solver. Success in a complete-map maze on a never-seen maze is not by itself proof the algorithm learned general language solutions. Geometry permutation test in `v17/docs/ACTUAL_MULTIDIMENSIONAL_LANGUAGE_PATHS_20261107.md` found original text decoding independent of 5D symbol coordinates.

## REQUIRED unchanged user contract

ONE original Brain must learn state/world/self, expose transformations and valid paths, compute a global goal-conditioned path and shape **BEFORE** any answer output, execute actions, compare effects, autonomously choose/train noise interventions and re-plan deviations, with same path mechanism across mazes/text/transformations. REAL CUDA and UI without invented metrics. Train/evaluate separate actual large unseen data, make both causal geometry/noise ablations, preserve prior learned weights and byte-exact source archive, and report first-try exact answer success separately from next-byte accuracy. The user asks for 100%, but this is a target to measure, not established science or a license to generate fake test results.

## Enforcement

No command or "functional" release until real native program meets the full acceptance suite on frozen large heldout answers and runs on the user's actual GPU, with no reference/goal leakage. A failing release gate must remain failing; never change the acceptance test to conceal a failure. The main docs-only incident **does not change executable source files**, and all branch history remains available. Research branch: `fix/V17-HYPERMAZE-ARCHITECTURE-REGRESSION-20261107`.

## 2026-11-07: measured additional zero-operator regression on long repeated prose

A true new failure was uncovered and verified against the ORIGINAL V17 `ObservedTransformations` path on a `1,273`-byte textual passage: **16** training examples differing in several independently learnable words yielded **0 learned edit operators**, so **0/100** completely unseen structured long-text targets could be navigated. Root cause: `_candidateSentences()` indexed **unique token keys**, but required `tokens.length-2` shared matches including repeated words. Real long text repeats common words, making that threshold impossible. The length-prefixed index also could not retrieve otherwise matching one-token insert/delete pairs.

The isolated regression branch `fix/V17-HYPERMAZE-ARCHITECTURE-REGRESSION-20261107` corrects candidate thresholds and +/-1 length retrieval, then applies evidence-anchored edit actions without copying or rescanning a whole long passage at every failed position. Separate tests verify genuine one-token replacements, insertions and deletions. The original `main` executable remains unchanged to avoid an unauthorized production regression.

**Measured after the fix, GitHub Actions:** `100/100` completely held-out **structured** textual targets with a base passage of **1,273 UTF-8 bytes**, each target requiring **5 independently learned word-edit actions**; the complete answer was predicted before action and reached by the original native V17 body; 16 actual training passages, 60 learned directed operators, `~1.47 seconds` for 100 evaluations on the GitHub-hosted CPU, topology cache hit on 99/100 queries. This does **not** establish 100% on general unseen multi-paragraph natural-language questions, does **not** measure native RTX CUDA throughput, and does **not** establish that 5D geometry causally improved success. Shuffling/ablating 5D geometric preference and transferable path policy changed **0/100 final outputs** in this controlled setup. **Release remains BLOCKED.**

Evidence: [GitHub Actions run](https://github.com/dan3s2020/MagicPerspective/actions/runs/42343045666) and [PR #58](https://github.com/dan3s2020/MagicPerspective/pull/58).

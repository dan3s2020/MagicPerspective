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

## Additional verified 1,000-long-text result and previously hidden Unicode loss

In the isolated restoration branch, 1,000 distinct 1KB+ controlled text observations over 1.274 MB exposed a **second independent silent-forgetting regression**: original `ObservedTransformations` retained only 96 recent source IDs in each length/token index and inspected only 80 recent matches. It could no longer discover an infrequently varying axis that reappeared hundreds of observations later. Before this correction, training learned 42 instead of 60 operators and **0 of 24** additional heldout long textual targets; after restoring full active-observation rare-anchor search (with exact one-edit verification), the test learned 60 operators and predicted/executed **24 of 24** fully heldout structured 1KB+ targets. GitHub Actions CPU measured **1,614.08 exercises/sec** and **2.0567 MB/sec** for this narrow observation/learning path, 1.274 MB processed in 0.620 seconds, ~42.27 MiB Node heap. THIS IS NOT real RTX CUDA, OpenThoughts or full semantic question answering.

The original V17 `worker.mjs` also converts non-ASCII characters to `?`, losing Romanian source information. The isolated opt-in hypermaze worker now observes exact original Unicode text while keeping the legacy `AligningGraph` byte pipeline unchanged. Real worker integration verifies unobserved `Știința este stabilă.` is predicted before action after observing other Romanian sentences with diacritics. This is structural Unicode preservation within that specific textual-world learner, not complete byte preservation across ALL V17 components. The native learner still limits observations to 256 tokens and a 12,000-record window.

**DO NOT CLOSE THE STOPSHIP.** Main executable files remain untouched; original user's explicit semantic and full-GPU requirements have not been demonstrated.

Final verified research CI: https://github.com/dan3s2020/MagicPerspective/actions/runs/42343690214 ; isolated PR #58.

## 2026-11-07 — complete-known-operator hypermaze atlas and two additional falsification controls

User's precise new request: provide as complete a learned hyperdimensional maze as the original Brain can construct, reuse transformations between fragmented text exercises, show ALL enumerated successful and failed routes, and compare character-by-character paths against withheld references to learn why a correct path was absent or not selected. Exact directive preserved in isolated `verbatim/2026-11-07-COMPLETE-HYPERMAZE-ATLAS-USER-VERBATIM.txt`.

Draft original motor research: [PR #72](https://github.com/dan3s2020/MagicPerspective/pull/72), branch `experiment/V17-FULL-TRANSFORMATION-ATLAS-20261107`; full evidence and API: `v17/docs/NATIVE_COMPLETE_KNOWN_HYPERMAZE_ATLAS_20261107.md`.

Results verified in GitHub Actions (actual original V17/Node tests, not simulated visuals):

- Missing action `He→She` first produces a frozen failed `He is calm.`→`She is calm.` path. The same Brain subsequently sees the different training sentence `She is tired.`, learns the reusable observed action, produces the previously unseen `She is calm.` full solution before action, and persists it through original `Brain.v8` save/load. Original atlas enumerated two distinct finite simple paths.
- Ablating this exact learned action in a checkpoint **COPY** makes the formerly reachable goal disappear; restoring the saved Brain restores the path. **Causal proof of this observed action in this finite learned text maze**, NOT proof that noise/5D geometry yields general language understanding.
- A partial goal like `She` has at least three reachable final states `She is calm / tired / brave`. If the original Brain chooses a different valid state than a withheld reference, postmortem classifies **wrong route / underdetermined goal**, not a nonexistent transformation.
- A 2-action goal reached from a real TXT worker is correctly marked **FRONTIER NOT EXPLORED** at maximum depth 1 and is successfully reached by widening to depth 6 on the **same learned Brain**, no reset.
- The atlas lists actual original operator evidence, all enumerated simple paths **within finite declared limits**, backtracking, dead ends, cycles, unexpanded frontiers, and exact Unicode-codepoint mistakes. A separate later audit receives the reference **only after pre-action plan is persisted** in append-only `*.hypermaze-atlas.jsonl`; full operator and history lists have paginated APIs. The original UI remains unmodified; isolated Chromium UI shows genuine path graphs rather than fake torus nodes.
- Original V17 42/42 unseen-2D-shape parity and 100/100 + 24/24 controlled long structured text tests remain preserved. No `.npz`, legacy `.v8` or prior branch has been overwritten.

**RELEASE REMAINS BLOCKED.** The atlas is only closed over the currently KNOWN learned operator graph within finite user-visible budgets, not over the entirety of natural language. The original observation index has `maxTokens=256`, `maxObserved=12000`, `maxOperators=18000` limits and reports rejections/evictions. The learned 5D coordinate field and noise policy have not demonstrated improved external semantic goal success. Transfer of the pretrained 2.1M-story TinyStories counts into this original native engine, independent full long-form unseen semantic Q&A and actual original CUDA training throughput are unverified. No production launch command is authorized.

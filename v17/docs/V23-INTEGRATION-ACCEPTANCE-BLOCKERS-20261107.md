# V23 — exact original Discoverer integration: verified scope and OPEN acceptance blockers

Date: 2026-11-07. **Status: PARTIAL IMPLEMENTATION, NOT AN ACCEPTED PRODUCTION LANGUAGE SOLVER.**
Isolated branch: `experiment/V23-DIRECT-DISCOVERER-OBSERVABILITY-20261107`.
No merge to `main`; no original V17 user controls, live model weights, checkpoints or dataset files overwritten.

## Authentic source and preservation
- This session's exact user instruction is in `verbatim/2026-11-07-USER-V23-REQUIREMENT-VISIBLE-MESSAGE.txt` (byte-for-byte of the visible source string, not a retroactive claim about invisible past chat).
- Mandatory source-to-change contract: `user-intent/changes/V23-DIRECT-DISCOVERER-OBSERVABILITY-20261107.json`.
- Exact 2D source oracle: `v17/transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs`. Existing V22 `exercise.mjs` calls the same `Discoverer.shape` algorithm for 2D and observed N-D topologies.

## Actually integrated and checked
1. The V22 `LearnedCognitiveMap.formSolution` calls `originalDiscovererOnText`, which calls `new Discoverer(seed).shape(ret,0,start,{neighbors,conduct,attract,onField})`. Edges arise from corpus-observed complete sentence contrasts, action results and disambiguation evidence; they are **hypotheses** until verified by real actions.
2. The V23 read-only `cognitiveRouteSnapshot` serializes state nodes, observed candidate edges, exact pre-action path, field values, algorithm identification, seed-temperature, and truncation flags. It exposes no answer string as an oracle and creates no synthetic path.
3. The original V17 `/cognitive-eval` HTTP handler now supports validated deterministic seed `0..4294967295` and temperature `0..2` in both live worker and checkpoint-frozen evaluation branches.
4. Existing native UI is preserved; new independent `cognitive-graph-live.js` renders real recently induced transformation edges while training and separately draws the exact frozen `Discoverer.shape` plan. It labels its visualization a 2D **projection** of N-D adjacency, not a proven learned 4D manifold. The animated cursor follows the hypothetical **plan**, explicitly not execution.
5. Native `cognitivemap` worker still ingests real full documents and checkpoints the atlas. No fake progress / dataset rows were added. No source `text_gpu.py` or original live answer generator was replaced.

## Tests actually executed in GitHub CI (Node.js 22, Ubuntu)
Verified workflow: https://github.com/dan3s2020/MagicPerspective/actions/runs/42341011029
Head commit: `a73df3161d74491b0ea85de742c9c4ab5781429b`.
**38 native Node tests passed; 0 failed** across six suites, plus new UI `node --check`.

- New V23 source-level tests: 6 passes, including **270** original-vs-current 2D maze comparisons (90 seeded maps × 3 temperatures), learned text-route freeze, seed/noise independence, action wall feedback, ablation, restored checkpoint.
- Original learned cognitive-map tests: 19 passes.
- Original whole-map tests: 8 passes.
- World-source regression tests: 2 passes.
- Native V19 HTTP integration: 1 pass, now asserting route nodes/edges correspond exactly to `plannedPath`, `Discoverer.shape` algorithm label, reproducible temperature and no hidden target answer.
- Original V21 boundary tests: 2 passes.

These tests are **software integrity gates**, not general-language answer quality proof. No claim of 100% first-shot long Q/A accuracy follows from them.

## Exact blockers preventing the demanded full release
- **Native answer objective remains different.** In `v17/transcend/torus-aether/devour/worker.mjs`, real text paragraphs are absorbed by the cognitive atlas, but automatic open-ended Q/A output still comes from `Brain.align` / `AligningGraph`. The original N-D `formSolution` is called by `/cognitive-eval`, not before each live Q/A answer-producing action.
- **A learned goal evaluator for arbitrary language is missing.** `LearnedCognitiveMap.matchGoal` requires a developer/user-supplied `goal.slots` predicate containing particular target tokens; it cannot currently derive “correct full answer” from an arbitrary question without already knowing answer tokens. A graph path satisfying a slot constraint is not semantic correctness.
- **Hard text and state limits.** `observeSentence` skips sentences longer than **96 tokens** and `buildWorld` rejects initial states longer than **96 tokens**, with default `maxNodes=768`, `maxDepth=12`. That explicitly fails the large-text requirement. No silent limit removal was attempted because it changes cost complexity and must be profiled on real corpora.
- **Not all graph learning runs on CUDA.** Corpus graph/shape operations in V23 run on Node CPU. The native original CUDA batches serve other world training; a CUDA request is not evidence the cognitive N-D solver is on the RTX 3050 Ti.
- **No semantic first-shot held-out benchmark.** Small structured English composition tests test an unseen arrangement of previously observed pieces; no fixed independent OpenThoughts3 held-out evaluation of complete long answers under honest no-peeking has passed.
- **Live execution vs animation.** `/cognitive-eval` is frozen and does not execute predicted actions. Real `/cognitive-observe` action feedback can be recorded, but the autonomous end-to-end text execution/replanning loop is not yet implemented.
- **Windows/browser/CUDA validation pending.** GitHub CI tests Ubuntu Node and HTTP. It has not executed the full Windows PowerShell 5.1 launcher, an actual browser pixel render, or the user's real GPU+dataset. Existing PowerShell startup is therefore **not release-certified**.
- **Verbatim history remains incomplete** per `VERBATIM_ROOT.md` and `AGENTS.md`; this turn's text is preserved, not a guarantee about missing past files/attachments.

## Non-negotiable release gate
Release **only** after the native Q/A answer is planned via the original learned-goal N-D shape mechanism before the first output; execute and record actual state-action transitions, corrections and second routes; show them in the original live UI; test on long genuinely held-out natural language prompts with answer withheld from planning; run paired causal ablations and measure exact full-answer first-shot accuracy rather than next-byte metrics; validate throughput and full CUDA workload on the intended Windows device; preserve and compare all V17 controls/checkpoint hashes; verify clean-state launcher end-to-end.

`main` stays unchanged. **Do not give a production startup command or mark Issue #25 resolved based on V23 passing regression suites.**

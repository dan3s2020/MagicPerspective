# V21 Regression and Discovery-Transfer Audit — 2026-11-07

## 0% open-loop answer-shape regression: confirmed in source

The former V21 launcher started hypertext,maze,transform but omitted the native text world. In worker.mjs, TEXT = worlds.includes('text'); therefore the original Brain.learnTextGPU / Brain.live text-learning path did not execute. The old UI was still present, but AligningGraph.write() was not being trained on the actual Q/A corpus.

This explains why a rolling 86.2% alignment result, V20 ~17.44% token prediction, and 0% free-generated answer shape could coexist. They measure different tasks. Bellman residual ~1e-16 for Q→:→{ shows a shortest path on a known-goal observed token graph, NOT a semantic answer generated before the answer was known.

## Second confirmed evaluation defect: 200-character truncation before A:

The original evalTextExercises began with a0=0 even if a selected 200-character prefix omitted the newline A: answer boundary. It then wrongly treated all evaluated question characters as answer characters and reported shapeSame=0%. This is a false-zero metric when no answer was present, independent of learning.

V21 now uses a0=-1 until the literal newline A: marker is actually observed. When absent, answer, shape and shapeSame are null (not zero), invalidShapeReason names the missing answer boundary, and the original UI recommends increasing the evaluation length or selecting 0 to use the entire exercise. Original AligningGraph.write algorithm and model weights are untouched. A dedicated frozen test checks 200-character question-only snippets versus a complete same question plus answer.

Note: whether the user's own screenshot was truncated before the boundary requires inspecting the actual Q/A source. The code could produce false zero, but the screenshot alone does not establish the entire cause.

## Resuming newly enabled V19 action learning without double-absorbing V20/V21

On a hypertext-only checkpoint (original cognitiveDocuments>0), activating original V19 cognitive rules for the first time must replay those old documents into V19, while the already observed V20 and V21 graph must skip them. The V21 worker now tracks previouslyObservedCognitive and previouslyObservedHyper independently. It only increments the aggregate unique-document count when processing a genuinely new document. The combined native regression resumes with text,hypertext,cognitivemap,maze,transform and checks that V19 absorbs previous documents, V20 counts stay unchanged, and original free-run shape >=10% on the fixed synthetic heldout fixture.

## Fix and strict native regression

- START_V21_AETHER_VEIL.ps1 reconstructed cleanly; PowerShell syntax must pass CI. Native default worlds now text,hypertext,maze,transform in the SAME original Brain; adding -IncludeCognitive enables original V19 cognitive atlas.
- Original AligningGraph.write(), Brain.learnTextGPU, Discoverer.shape, UI buttons and checkpoints are unchanged.
- CUDA private Python self-test precedes any new training, avoiding inherited Hermes Agent CPU-only PyTorch. GPU text batches default to 2 for conservative RTX 3050 Ti VRAM use.
- Legacy hypertext-only checkpoint migration replays corpus into newly enabled original text learner, skipping already observed V20/V21 documents to avoid double-absorbing their original edges.
- On first resume, the launcher makes a timestamped immutable copy of the previous Brain checkpoint and its shared/text sidecars before any new save.
- The same live UI now reports a FROZEN original V17 open-loop generated answer-shape score, with fixed heldout Q/A and T=0, separately from teacher-forced next-char and V20/V21 route reachability.

Native migration integration test: 71 source fixture records with every tenth held out; 64 original observed documents, then resume original V17 text learning. Results: 5,633 text characters trained, 64 native Q/A exercises, V20 documents 64→64, unique-word edges 143→143, and original free-run heldout answer shape = 17.6470588%. Test now requires >=10% on exactly this fixed synthetic fixture.

This is a real regression check but NOT a claim of 10–15% accuracy on the user's OpenThoughts3 corpus or real semantically correct answers. The user's Windows GPU corpus results have not been rerun here.

## Native present-day transfer matrix

| Piece | Native V21 training status | Evidence and limits |
|---|---|---|
| Original V17 maze Discoverer.shape() | Active, unchanged | Original maze policy; not yet directly called by the text writer |
| Original V17 Q/A AligningGraph.write() | RESTORED, active by default | Frozen synthetic answer-shape >=10% test; real corpus still unverified |
| V19 learned cognitive action atlas | Optional -IncludeCognitive | Original constraints/actions kept; semantic verification not demonstrated |
| V20 unique-word known-goal wavefront | Active | Frozen original tests, preserved exact graph routes |
| V21 contextual pair-state field | Active | Observed corpus, pre-ingest predictions, frozen shortest routes, no-leak tests |
| Observed local action-change axes | Active on original V17 action events | Which actual state indexes changed, not general 6D coordinate frames |
| Empirical stochastic branches | Active | Measured action-conditioned alternative outcomes, not learned 2048 expectimax |
| Path order AB != BA | Active on real observed V17 events | Witness only if both orders were observed; not signed-area holonomy |
| Original V17 shared PyTorch perspective | Preserved | Runtime observations and model, but no universal semantic action physics proven |
| Six-axis hidden perspective discovery | Historical separate branch tests | Not transferred into V21 free-run inference |
| Local signed permutation frames/word transport | Historical separate branch tests | Not integrated into native V21 text writer |
| Coupled arithmetic goal paths | Historical separate branch tests | Correct on numerical synthetic worlds, not OpenThoughts |
| Signed-area path holonomy | Historical separate branch tests | Not generally inferred by native text Brain |
| 2048 stochastic chance tree | Historical separate branch tests | Not used as the native language policy |
| xD torus normalization and low-rank transition score | Historical separate branch tests | Experimental prototype not inserted into production Geometry |
| Original 5D UI and toroidal projection | Preserved original controls | No proof of physically 5D emergent graph dynamics |

## Two independent required scientific checks

Native V21 workflow tests the actual combined process, live UI, Q/A free-run recovery, native action events, no future leakage, checkpoint resume, and original V19/V20 regressions.

Historical proof workflow checks out the original research branches SEPARATELY, running their retained learned axes, local chart, signed-area holonomy, numerical text, stochastic 2048, xD invariance, shared-core, and real corpus gating tests. Passing the latter does not mean those algorithms are used by V21's production writer.

Blocking original issue #25 stays OPEN until V21 learns goal-conditioned semantic world actions, directly applies the maze solution-shape machinery to them, and improves independently verified heldout answer correctness without a hidden target-answer oracle.

## Safe Windows update

Stop the existing process with Ctrl+C; git -C D:\MagicPerspective-V21-Aether-Veil pull --ff-only (only if its working tree is clean). Then run START_V21_AETHER_VEIL.ps1 -Data D:\training\OpenThoughts3-1.2M -Gpu cuda:0 -GpuWorlds 64 -GpuTextBatch 2 -Vram 3 -Resume. This retains the original V17 UI on port 8866.

Do not declare total transfer or merge into main on synthetic 17.65% alone. Measure original free-run generated answer on identical real heldout Q/A, identical seed, temperature and length, comparing equal training characters. Keep CPU/V21 and CUDA/V17 utilization separate.

# V29 — Original V17 Brain, real OpenThoughts Q/A roles and LONG source journeys, honest full-answer metrics

**Date:** 2026-11-07  
**Status:** ORIGINAL NATIVE ARCHITECTURE EXTENDED AND TESTED; **GENERAL SEMANTIC GOAL STILL BLOCKED. NO PRODUCTION RELEASE**.  
**Isolated branch:** `experiment/V29-REAL-OPENTHOUGHTS-QA-GOAL-CLOSED-LOOP-20261107`  
**Exactly preserved parent:** `feature/V17-REAL-OPENTHOUGHTS-HYPERMAZE-STREAM-20261107` at commit `d6b7fd08e501651e6dd5ba80f62a8d0d0b195be1`.

## What was wrong with V27 and the earlier real-corpus readout

The user requested the exact original, native V17 learned hyperdimensional text world (Discoverer attraction, real learned edits, original 5D geometry, existing NoiseAgency, original one Brain, native UI and real OpenThoughts Q/A corpus) rather than novel 4D toy spaces. PR #67 already streamed actual JSONL through that architecture and had real cursor/checkpoint, but its frozen test only predicted a local next text fragment. It learned nothing explicitly from ordered **human QUESTION → GPT ANSWER** relations: the two messages were treated as unrelated observations. The UI displayed MB/s and local hit % even when there was no whole-answer evaluation.

V29 makes the original JSONL worker learn **role-correct real Q/A observations in that SAME Brain**. It is NOT a replacement LLM, standalone second trainer, frequency word generator, separate fake graph or manually supplied answer goal. The true source data is still observed by original `ObservedTransformations`, the original `Discoverer.shapeGraph` computes complete candidate routes when the operator world is learned, and the original NoiseAgency, original Geometry 5D, original maze, original corpus stream, Windows launcher and native UI continue unchanged except additive metrics/endpoints.

## The complete circuit now present in the original native runtime

1. `openthoughts-jsonl-source.mjs`: extracts **real ordered Q/A pairs** from `conversations:[{from:"human"},{from:"gpt"}]`, `messages:[{role:"user"},{role:"assistant"}]` or explicit question/answer fields. No pair across an intervening system/tool message; original raw source reader/UTF-8/resume behavior remains.
2. `real-corpus-worker.mjs`: continues to send **all** original training text through the original observed state-action learner, and then calls `NativeGoalTextMaze.observeQA(question,answer)` on that same Brain. The learned plain role evidence lives in `Brain.qaRoleEvidence`, saved and restored with the original native V17 `.v8` checkpoint and exact file byte cursor. **Heldout rows NEVER call observeQA.**
3. `qa-role-axes.mjs`: for short, structurally comparable question/answer examples, independently observed **one-variable question change + corresponding one-variable complete-answer change** induces a causal word-binding axis. Contradictory outcomes disable the entire affected learned component. Unrecognized grammar abstains instead of hallucinating a goal.
4. For eligible unseen short Q/A, `planQA({question})` receives the QUESTION ALONE, retrieves a learned Q/A variable world and constructs a bounded graph of complete candidate answer states. It calls **`brain.disc.shapeGraph(...,{details:true})` directly**, using original attraction field and learned action axes; no BFS or next-character generator. It returns a **frozen entire answer before first action**, original scalar field, every state/edge/action and independent local operator application. No correct heldout answer string or its token goal constraints are passed to the method.
5. For realistic LONG OpenThoughts answers, raw Q/A are **not thrown out by the old 128-token gate**. Their complete role sequence is tokenized by the **EXACT original `tokenizeObservation`**, divided into consecutive real 96-token source windows. `Brain.qaRoleEvidence.longForm` stores SHA-256 per segment, witnessed question→answer boundary, actual source hash, sequence adjacency, active bounded source nodes and cumulative all-history counts. At most 40,000 active segment hashes/96 active sequences; older sequences evict WITHOUT deleting all-time totals. This proves source structural observation, **not** a learned long-answer semantic operator; no hashes are used as hidden answer generation.
6. `heldoutProbe(...,qaPairs)` runs `planQA({question})` BEFORE reading gold answer **for comparison only**; ALL unseen Q/A count toward the exact whole-answer denominator, including failed paths. Reports raw exact, normalized exact and goal coverage separately. The legacy next-token metric is not relabeled as a semantic metric.
7. `real-corpus-server.mjs` adds **`POST /native-qa?question=...`** (no reference-answer parameters). The previously existing `native-hypermaze.html/js` gains real counters and a question-only planner with real propagated graph nodes, edges, action paths and frozen field. Original Start/Pause/Save, original 5D viewer and previous text goal planner remain functional and unmodified.
8. Original GPU path is preserved, **not accelerated**. The exact current original source-goal/action learner runs on CPU; the old separate CUDA byte predictor is not advertised as an equivalent GPU implementation.

## Red tests, repairs and raw evidence

- Initial red original Q/A full-answer tests / role parser absent: https://github.com/dan3s2020/MagicPerspective/actions/runs/42350102364 .
- Native additive source syntax regression corrected before tests passed: https://github.com/dan3s2020/MagicPerspective/actions/runs/42350295613 .
- Real contradictory Q/A evidence initially failed to invalidate another dependent route: https://github.com/dan3s2020/MagicPerspective/actions/runs/42350344105 . Affected component now refuses plans.
- Successful full native workflow (Linux actual JSONL, actual original Brain and live HTTP, original 2D maze/heldout text parity, Windows launcher, stopship): **https://github.com/dan3s2020/MagicPerspective/actions/runs/42350793035**. Original unit Q/A tests **5/5**, actual native HTTP **1/1**, original JSONL suite **5/5**, historical shape/text suites and original Windows PowerShell all PASS.
- Native integration with **100 actual on-disk records formatted as OpenThoughts chat JSONL** is a **CONTROLLED TEST FIXTURE**, not real OpenThoughts3 rows. It measured **90 role Q/A training observations, 10 withheld, 10/10 whole answers exactly correct** when the unseen question follows a repeated learned variable-copy grammar; an unseen astronomy question is rejected, and original Brain save/recovery passes. It demonstrates the Q/A causal wiring, not general semantic understanding.

## Authentic PUBLIC OpenThoughts3-1.2M trial — vital NEGATIVE result

**GREEN actual-run audit:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42351502778 .

The self-contained source test fetched **24 ACTUAL unchanged public dataset rows** from the official Hugging Face Dataset Viewer API at original offsets **0–7, 210000–210007, 810000–810007**, wrote genuine JSONL to disk, then ran **the SAME native JSONL worker** and persisted the actual Brain; it did not fall back to synthetic test data. The original public dataset is [OpenThoughts3-1.2M](https://huggingface.co/datasets/open-thoughts/OpenThoughts3-1.2M).

- Actual sampled source bytes: **1,304,083**. Source SHA-256: `9651107021d275c95136109745123845fed7407ef14f8174a3d10b26dfa48d76`.
- Real whole Q/A rows: **24** (20 train, **4 completely heldout**).
- With the **correct original V17 tokenizer**, authentic question lengths: min **28**, max **2,673**, mean **452.5833 tokens**. Authentic answer lengths: min **9,020**, max **16,859**, mean **14,084.2917 tokens**.
- The first exploratory diagnostic erroneously used escaped `\\p` in an independently copied token regex and overstated the length as 30,936–65,417. That wrong diagnostic was **replaced with the exact source `tokenizeObservation`**, and the worker's measured totals now have exact equality assertions to the original tokenizer's independent train-only counts. **Never quote the erroneous values as real token lengths.**
- Original source word-edit effects: **90 learned** in the sampled corpus.
- Complete long-form human Q/A training episodes structurally witnessed: **20/20**; all **277,941** training answer tokens correctly accounted (checked independently against the original parser/tokenizer).
- Authentically witnessed sequential question/answer chunk graph edges: **2,991**; active 96-token source chunks: **3,011**; none over the long-role retention cap, checkpoint integrity and unseen answer SHA exclusion PASS.
- **Actual learnable full-Q/A variable action pairs:** **0**; general Q/A causal axes **0** on this diverse set.
- **Full heldout answers exactly correct: 0/4 (0%)**. Normalized exact: **0/4**. Question-goal/path coverage: **0/4**. Their gold answers were never fed to the planner; absent operators cause correct abstention and count as failures.
- This is a tiny **genuine real corpus diagnostic**, NOT an estimate of expected accuracy over 1.2 million rows, not the user's specific Windows 594MB JSONL, and not a CUDA benchmark.

**Interpretation:** The real original architecture can now stream real public OpenThoughts source, learn original local text operators, retain role-correct long-form Q/A sequence evidence, persist it in the original Brain, and test full unseen answers without target leakage. **It still cannot infer a transferable semantic question→answer causal graph from these diverse long reasoning problems.** It does NOT meet the requested 70–100% first-answer performance.

## Remaining concrete blockers — acceptance gate stays OPEN

1. **Main blocker:** the existing observed operator learner compares local one-token text edits; diverse actual natural-language Q/A differ by thousands of tokens. Observing all 277,941 source tokens and 2,991 consecutive links cannot by itself discover which abstract reasoning transformations produce a correct answer. The long source-adjacency graph is **experience order**, not verified world-state physics.
2. **User goal:** learn a semantics-preserving world state, testable action physics, true task terminal predicate directly from arbitrary text, and have the original preaction goal-attraction field drive first-attempt full answer output, then independently check its entire meaning. The long role experience graph is not yet causally connected to novel long-answer generation; actual 0/4 proves this gap.
3. The current original native Q/A hypothesis class transfers word bindings only from previously witnessed structurally related Q/A outputs. Improving this requires genuinely more general text-to-action/state transformation learning **inside the same original Brain**, not rebranding new latent encoders, BFS, LLM, 4D toy maps or next-character predictors as the requested mechanism.
4. No full run against the **user's private/local** `D:\training\OpenThoughts3-1.2M\train-00015-of-00120.jsonl` (594MB) was possible in GitHub CI; the private bytes have not been read in this session. No real RTX 3050 Ti Windows CUDA or sustained throughput acceptance. No full original V17 universal UI/browser acceptance on user hardware.
5. Unseen answers are scored with exact full text equality (strict) and a separately labelled canonical punctuation/whitespace score. Semantically equivalent paraphrases would need an independent blinded meaning validator, currently not implemented; raw exact 0% is still an accurate measurement.
6. Issue #25 stays OPEN. Original `main`, the PR #67 parent, all previous branches and user checkpoints remain unchanged. V29 DRAFT only; **do not merge or supply a production-complete launcher**.

## Actual current source and reproduction

- Existing original NativeGoalTextMaze + `Brain`: `v17/research/text-hypermaze/goal-conditioned-native.mjs`.
- New bounded witnessed Q/A role transformations and full-length source-sequential paths: `v17/research/text-hypermaze/qa-role-axes.mjs`.
- Original JSONL reader with additive correct role extractor: `v17/research/text-hypermaze/openthoughts-jsonl-source.mjs`.
- Original real-corpus worker, HTTP server and unchanged original PowerShell launch: `v17/research/text-hypermaze/real-corpus-worker.mjs`, `real-corpus-server.mjs`, `v17/START_REAL_OPENTHOUGHTS_HYPERMAZE.ps1`.
- Original UI with new factual metrics, not replacement: `v17/transcend/torus-aether/ui/native-hypermaze.html`, `native-hypermaze.js`.
- Source tests: `v17/tests/v29-real-qa-closed-loop.test.mjs`, `v29-real-qa-native-http.test.mjs`, `v29-authentic-public-openthoughts3.test.mjs`.
- CI: `.github/workflows/v29-real-native-qa-closed-loop.yml` and `.github/workflows/v29-authentic-public-openthoughts3.yml`.
- User requirement: `user-intent/changes/V29-REAL-NATIVE-OPENTHOUGHTS-QA-GOAL-20261107.json`.

In V29 checkout with Node 22:
```bash
node --test v17/tests/v29-real-qa-closed-loop.test.mjs
node --test v17/tests/v29-real-qa-native-http.test.mjs
node --test v17/tests/v29-authentic-public-openthoughts3.test.mjs
```
The third test **requires network access** to the official public dataset and intentionally fails if source retrieval fails. It never synthesizes substitute data when the source is unavailable. These are *research verification commands*, not a release of complete CUDA training on 1.2 million samples.

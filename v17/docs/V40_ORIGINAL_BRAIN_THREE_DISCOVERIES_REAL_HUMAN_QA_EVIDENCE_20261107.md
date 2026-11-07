# V40 — Three discoveries in the SAME ORIGINAL V34 Brain; measured real human QA

Date: 2026-11-07. Isolated branch: integration/V40-ORIGINAL-BRAIN-LEARNED-GOALS-REAL-QA-20261107.
Original main, all prior branches, all pre-existing user Brain checkpoints and V34 original runtime files were not overwritten.

## Actual source engines combined (verbatim sibling research files)
- Original V34 original V17 Brain, Discoverer.shape(), Discoverer.shapeGraph(), trained maze attractor, finite xD world, original GPU/CPU trainers and original save/load remain unchanged.
- V36 observed-instruction-goals.mjs and path-answer-writer.mjs copied verbatim. The optional LearnedCognitiveMap in the same saved Brain learns a finite witnessed instruction intent, infers a target from actual previously observed before/after episodes, and asks original Discoverer.shape() for a route. This is a controlled task, not a general language semantics model.
- V39 real-squad-evidence-paths.mjs copied verbatim. The same original Brain owns supervised human question-to-passage-span features and averaged weights. Discoverer.shapeGraph navigates the genuine observed passage source graph.
- V32 winnow-token-anchors.mjs and native-motif-compact-archive.mjs copied verbatim. Exact SHA256 sparse source motifs and source-order edges live in a separate compact SQLite archive whose authoritative identity, path and episode count are stored in the SAME original Brain checkpoint. SOURCE matches do not automatically create semantic actions.

The two original Shape motors operate on DIFFERENT original graph representations; putting them in one checkpoint does NOT prove unified semantic physics or an improvement in real QA.

## Added V40 files
- v17/research/text-hypermaze/v40-original-brain-evidence.mjs: opt-in original Brain adapter preserving V36 task intent and V39 QA weights; frozen dispatch intentionally refuses unsupported task families instead of guessing.
- v17/research/text-hypermaze/v40-original-source-witness-memory.mjs: original V32 exact content-defined witnesses + compact native SQLite source archive; replays that change original episode content are blocked. Missing historical source archive after Brain restore raises an explicit error.
- v17/research/text-hypermaze/START_V40_REAL_HUMAN_QA.mjs: a SERIOUS official real-human-QA trainer, not synthetic data. Loads the USER'S explicitly supplied original Brain, trains the unchanged V39 real supervised question/evidence learner, saves to a NEW checkpoint (never overwrite original), evaluates real untouched Stanford DEV, writes the FULL 650-episode graph, candidate, first-path, error and character diagnostics. Optional disk source motifs are indexed from genuine train-source texts only.
- v17/tests/v40-single-original-brain-integration.test.mjs: same original saved Brain restores V36 learned goal, V39 supervised answer, AND V32 source history, original maze experience, no reference leak and unknown task refusal.
- v17/tests/v40-real-9000-qa-shared-brain.test.mjs: genuine 9000 real-human training, 500 train-calibration, 650 official human article-disjoint DEV, retained V36 intentional goal.
- v17/tests/v40-source-memory-shared-brain.test.mjs: source exact SHA256 and V32 winnowing across offsets, durable save/restore, replay conflict, no silent evidence reset.
- v17/tests/v40-real-training-checkpoint-guard.test.mjs: original Brain and existing destination cannot be overwritten.
- .github/workflows/v40-single-native-brain-integration.yml (all quick original integration + V34 regressions).
- .github/workflows/v40-original-real-human-qa-cli.yml (true independent whole command-line 9000+650 acceptance with saved checkpoint and answer atlas).

## GENUINE observed human-language outcome, same original Brain
Dataset: canonical official Stanford SQuAD 1.1 TRAIN and DEV, cryptographic original source SHA256. Original TRAIN articles 442 = 380 supervised-learning source articles + 62 entirely disjoint TRAIN-calibration articles; external DEV 48 additional different articles. Fixed 9000 real training QAs, 2 epochs = 18000 genuine supervised source/answer exposures. Internal policy selection uses only 500 TRAIN-calibration QAs. All 650 authentic DEV references are hidden until the complete Shape prediction was frozen.

Original baseline without learned preferences: 6/650 exact first answers.
Final online weights: 91/650 exact first answers.
AVERAGED weights selected on TRAIN-only calibration: 153/650 (23.54%) exact first answers.
Original Shape vs direct lexical learned preference ranker: 649/650 agreement; this is NOT evidence that original Shape independently learned semantic causal laws.
Frozen 9000 human QAs did not erase the two independently witnessed V36 controlled instruction-goal episodes from the SAME saved Brain. After restore, instruction Brew the refreshment on the new source Ada keeps tea. returned Ada keeps coffee. without destination stated in the instruction.
THIS EXACT result duplicates real V39, it is NOT a newly improved >153/650 semantic score. 497/650 remain wrong.
Validated CI result with one Brain, one checkpoint, no hidden DEV labels or fabricated answer goals:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42371240033

## Source memory across fragmented episodes
A genuine reproduced test constructs two independently observed different text sources containing a long identical 43-word passage at different token offsets. Source fingerprinting found 122 distinct exact anchor IDs and 61 source anchors independently shared across both episodes, with all source-order witness provenance intact.
The SAME original Brain.v8 survives save/load with original task intent, real QA ranking weights and an authoritative external SQLite source memory manifest. Replaying exactly the same original source is idempotent. Replaying different content under the same episode throws SOURCE_REPLAY_IDENTITY_MISMATCH; opening a missing SQLite file from a stored Brain throws SOURCE_ARCHIVE_MISSING. These lexical connections are NOT physically verified meaning-changing transformations.
Verified native tests and old V34 baselines:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42371792697

## REPRODUCE REAL training on an existing original Brain
Requirements: Node.js >=22; official Stanford SQuAD1.1 train/dev must be reachable via internet, and enough CPU/disk for 9000 real questions and 650 complete source atlas records. The original V17 GPU text training backend is NOT modified nor used by this extractive question/span trainer. This does not train all OpenThoughts3.

PowerShell:

  $Dest = "D:\MagicPerspective-V40-Research"
  if (Test-Path -LiteralPath $Dest) { throw "Destination exists: no overwrite" }
  git clone --single-branch --branch "integration/V40-ORIGINAL-BRAIN-LEARNED-GOALS-REAL-QA-20261107" "https://github.com/dan3s2020/MagicPerspective.git" $Dest
  $OriginalBrain = "D:\YOUR_EXISTING_RUNTIME\brains\brain-0-winner.v8"
  if (!(Test-Path -LiteralPath $OriginalBrain)) { throw "Must choose actual existing original Brain file" }
  node "$Dest\v17\research\text-hypermaze\START_V40_REAL_HUMAN_QA.mjs" --original-brain $OriginalBrain --out "$Dest\v17\original-brain-v40-new.v8" --archive "$Dest\v17\isolated-source-motifs.sqlite" --archive-first 80

New output checkpoint, WITHOUT replacing original: original-brain-v40-new.v8.
Full frozen real Q/A atlas with all 650 original candidate graphs and each incorrect character: original-brain-v40-new.v8.atlas.jsonl.
Verified official-dataset training score and source checksum: original-brain-v40-new.v8.results.json.
Exact source-only memory sidecar: isolated-source-motifs.sqlite, original V32 SHA guarantees and explicit original Brain manifest. The original input Brain SHA256 is checked unchanged.

## Negative controls, unsolved and stopship release criteria
- V37 real human frozen 450-QA atlas shows 329 wrong predictions had the true answer already in source graph but ranked below wrong candidates; 56 source spans absent from bounded graph. LARGER graph alone does not solve the ranking problem.
- Original long OpenThoughts3 test in V34: 120 actual training and 24 frozen independent long natural QA, 0/24 raw complete answers. This is separate from SQuAD extractive and shows the unrestricted natural language goal/action problem is still open.
- Nothing here trains a general semantic causal action, unifies the two different original goal graphs into one universal world representation, or proves 100% exact first-shot on unknown natural tasks.
- V36 task goals require at least two witnessed instruction/action state transitions. The supervising SQuAD gold answer spans are NOT physical action evidence; V40's serious trainer does not fabricate them.
- V32 exact shared strings are a persistent SOURCE EVIDENCE INDEX, not meaning transformations or hallucinated paths.
- Original Windows RTX3050Ti CUDA performance is not measured in GitHub CPU CI; human QA source-span ranker runs on CPU.
- Full Windows original V17 UI not replaced, modified or claimed to support new V40 controls: the V40 research adapter and offline saved Brain are optional, separate.
- Keep original issue #25 blocked; do not merge to main or erase existing data without independent live semantic + GPU acceptance.

The decisive next research experiment: learn reliable natural-language goal preference and actual text-changing transformation *causally* from previously witnessed world actions, then demonstrate 3-way ablation (no source-memory, no goal inference, no learned ranker) on SAME external heldout question corpus. Co-location alone is not sufficient.

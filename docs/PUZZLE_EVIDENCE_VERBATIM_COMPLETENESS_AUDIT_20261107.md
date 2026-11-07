# MagicPerspective — Audit al pieselor puzzle-ului și al arhivării VERBATIM
Date of audit: 2026-11-07. **Status: COMPLETE RESEARCH PUZZLE NOT DEMONSTRATED. BYTE-EXACT CONVERSATION ARCHIVE NOT CERTIFIED.**

## Why this file exists

Exact currently visible USER question (the literal source was also saved in
\`verbatim/2026-11-07-USER-BYTE-PRESERVATION-PUZZLE-AUDIT-VISIBLE-TURN.txt\`):

> Ai documentat totul în repo sa nu pierdem niciun BYTE? Ai verificat si restul descoperirilor ? Avem toate piesele puzzleului 

**Scope:** a source-grounded snapshot of verified GitHub files, protected claims, branches, test evidence, missing material, and the remaining scientific unknowns. This research inventory is **NOT** a replacement for the full original USER/ASSISTANT conversation. It MUST NOT be marked "VERBATIM COMPLETE". A normal GitHub green check verifies a given test, not conceptual completeness.

## 1. Exact archival truth

Snapshot before this archival addition: \`main@3f6d59e9e556e2553df28b360c7be6064ac628fe\`, 600 tracked blobs in the recursive tree, 74 listed branches, no recursive-tree truncation.

- \`verbatim/coverage.json\` states \`complete_export_verified: false\`.
- Its \`claim_policy\` explicitly has \`all_words_and_requirements_accounted_for: false\`, \`atomic_clause_index_complete: false\`, \`all_implementations_verified: false\`, and \`full_transcript_source_available: false\`.
- The 56 indexed historical messages in that coverage source have \`UNVERIFIED\` coverage. The original index contains 29 USER and 27 ASSISTANT entries; this is NOT an exhaustive transcript for all dates.
- \`verbatim/continuation-index.json\` has \`complete_original_transcript: false\`, \`full_native_transcript_verified: false\`; its assistant turns between recovered user messages are not byte-exact archived.
- Original images and some original audio/attachments have not been committed as binary assets. Metadata/checksums alone do not contain the image bytes.
- \`VERBATIM_ROOT.md\`, \`verbatim/SOURCE_POLICY.md\`, \`verbatim/audits/2026-11-04-FULL-VERBATIM-GAP-MATRIX.md\`, \`scripts/verbatim-gate.mjs\`, \`scripts/verbatim-mirror-gate.mjs\`, and \`scripts/verbatim-strict-audit.mjs\` require missing source to remain BLOCKED. Do not flip boolean flags to green.
- Earlier archive summaries, named PDF reports and research atlases are not equivalent to original transcript/source.
- This audit does not claim to have retrieved the missing complete chat export, the user's Windows D:\ checkpoint, original CUDA runtime, or uncommitted private datasets.
- The currently visible latest USER request has been added as its own recoverable text source; unlike a genuine ChatGPT transcript export, this does not certify byte identity of all messages or all media.

### Four CURRENTLY accessible uploaded screenshot byte fingerprints (not committed to GitHub)

These media files were inspected as mounted conversation PNGs in the active execution environment; **their bytes were not uploaded into this PUBLIC GitHub repository**. Do not treat this metadata as full backup; avoid exposing personal screenshot imagery publicly without a deliberate media archival step.

| Visible attachment filename | Size (bytes) | SHA-256 |
|---|---:|---|
| \`1000198845.png\` | 191444 | \`ba6aa48d2e9b442a08152d4c3058d42c8fabb990b38c59c8421c5aa75383bc8f\` |
| \`1000198844.png\` | 138782 | \`21b2708e6c178ff50d4eac52d4b6b90a0efecb7571831f4ff8046ff64e39ad34\` |
| \`1000198843.png\` | 142651 | \`d269926262842ac401e8dd7b3bfa59f458a95b4d71ee6ca3ed704374dc8e2450\` |
| \`1000198842.png\` | 140486 | \`f4cb0f67d06ee2812eb6a09f6ec18aa5ad0b764b374de2f43661b45192804362\` |

## 2. Canonical implementation: main vs isolated branch is NOT the same

**Main** contains V1–V16/V7/Portal research artifacts, historical source documents, version reports and an evidence atlas. Many V17 experiments are **not in main**: they remain in isolated branches and draft PRs and should not be described as a single merged native application.

For every scientific claim, keep together:
\`original exact USER requirement → source code SHA → model/training data → test script → frozen split + seed → raw outcome → negative control → status → UI integration status\`.

Selected immutable recorded branch heads, at this audit:

| Mechanism / evidence | Branch commit | PR or entry | Status |
|---|---|---|---|
| Actual V17 text-path observation, learned 5D coordinate overlay, causality check | \`2af8cc77e3b217c688c83b2606898a50e00cfb80\` | [PR #27](https://github.com/dan3s2020/MagicPerspective/pull/27) | DRAFT; observer only |
| 2D→5D operator extension, axis ablations and shuffled control | \`c7814564395ceb7cb0ccce512d785addfcb10cfd\` | [PR #28](https://github.com/dan3s2020/MagicPerspective/pull/28) | DRAFT; geometric tests |
| 2D→1024D exact constructed lift, finite-rank frozen scorer | \`f4ebb6bfd84018d5a74f2f2fe32249afcba3ddbf\` | [PR #29](https://github.com/dan3s2020/MagicPerspective/pull/29) | DRAFT; not autonomous collapse |
| \`1/sqrt(D)\` scaling against native saturation; 3 seeds | \`456bff101d564bb281aed360a11fbc9f4c02093a\` | [PR #30](https://github.com/dan3s2020/MagicPerspective/pull/30) | DRAFT; experimental learner only |
| Direction/position/spawn probability in 2048, future chance axes | \`ac8b1777cbf97cb565b0418ce7ef8f7115736813\` | [PR #31](https://github.com/dan3s2020/MagicPerspective/pull/31) | DRAFT; isolated game |
| Per-node frames, causal transport, 2048-state route, words; negative native text tests | \`282a393264564bd901fe944520f19240bf40393d\` | [PR #32](https://github.com/dan3s2020/MagicPerspective/pull/32) | DRAFT; synthetic world; no actual V17 text gain |
| Discovered functional axes and gating under noise | \`d875bcc946bb4d77d15f77fd515409ae1dc17010\` | [PR #33](https://github.com/dan3s2020/MagicPerspective/pull/33) | DRAFT; synthetic hidden 6-channel world |
| Coupled text math axes, invariants, multiplication state field, noncommutativity | \`f3155b3d978f42a1fcf9911de6bd7a8d214bd606\` | [PR #34](https://github.com/dan3s2020/MagicPerspective/pull/34) | DRAFT; symbolic math lab |
| V17 real corpus axis-gating runner; original checkpoint import/resume | \`4adf548bd4de4c35cb550b492b7afd098260f168\` | \`experiment/V17-REAL-CORPUS-AXIS-GATING-20261107\` | isolated CPU adapter, not actual 100%-CUDA model |
| One shared observed transformation policy inside experimental original Brain | \`40c12dc6e72935863763f9f5ccc663024b3a7687\` | \`experiment/V17-ONE-SHARED-TRANSFORMATION-CORE-20261107\` | isolated integration; semantic generalization unverified |
| Closed anti-loop branch | \`d8e7b1595b3b9bb229534fc62a9eb1945f8a9e8e\` | [PR #26](https://github.com/dan3s2020/MagicPerspective/pull/26) | CLOSED / NOT APPROVED: anti-loop substitution is not the user objective |

All branches above are independent hypotheses. PR layering does NOT equal main integration. NEVER rewrite a working original UI or merge an unrequested substitute architecture over another branch.

## 3. Technical discoveries: supported, conditional or disproven

### A. Maze and original V17 architecture

- The 2D maze predictor has access to the relevant physical topology or supervised goal-distance information in some training modes; its strong unseen-maze metrics do NOT prove semantic text navigation. Evidence: \`v17/transcend/torus-aether/worlds/labyrinth.mjs\`, \`constructed-paths.mjs\`, branch-specific tests.
- Existing V17 \`AligningGraph\` uses learned suffix/form/self alignments, trust weights and probabilistic writing. The 5D \`Geometry.learn\` learns symbol-level U/V positions separately; prior intervention showed altering its coordinates need not alter next-character decisions in the ORIGINAL writer.
- The observational text-path UI helps inspect but does not itself connect the geometry causally to choosing next words. An observed graph is NOT the same as a learned goal-conditioned text-state graph.
- The six text context scales \`[1,2,4,8,16,32]\` in \`ConstructedPathLearner\` are context windows, NOT six proven physical spatial axes.

### B. xD dimensional scaling and finite graph representations

- Constructed neutral embeddings from 2D up to 1024D preserved the original learned 2D transformations to floating-point accuracy: this proves equivalence of a *constructed lifted model*, NOT self-discovered 1024D→2D return.
- The original frozen one-step toroidal symbol scorer \`K[x,y]=sum_i cos(2π(V_xi-U_yi))\` satisfies the exact factorization \`K = Phi(V) Phi(U)^T\`, giving rank \`<=min(N,2D)\`. With 87 observed symbol types, measured rank saturated at 87 as D grew. At D1024, frozen score matrix 60,552 bytes vs 1,425,408 coordinate bytes (23.54× ratio), but the matrix does not replace a trainable brain with full contexts.
- Dimension-normalized geometry \`1/sqrt(D)\` outperformed original native in 9/9 paired seed/dimension tests (64,256,1024D; 3 seeds), correcting an observed high-D saturation mode. It did NOT beat a simple bigram baseline or demonstrate natural language reasoning.

### C. Action + environment randomness: 2048

- Each global slide/merge is deterministic, while the next legal spawn is position-uniform and is 2 at p=.9, 4 at p=.1.
- For n empty cells after a move there are 2n future outcomes. On a controlled 4×4 board, left/right yielded 22 futures each, up/down 18 each. Its action-conditioned 16-feature chance-covariance rank was 11/11/9/9 respectively. Thus actions select which stochastic coordinates are active; this is NOT literal quantum motion.
- Merges conserve tile mass; the stochastic environment introduces new mass. Hand-coded short-lookahead expectimax averaged 1,734.875 points vs 1,556.875 for a greedy heuristic on 64 seeded, 140-move games. Neither achieved 2048 in that test. This proves neither optimal gameplay nor native V17 language understanding.

### D. Actual local frames and symbolic action words

- In structured graph worlds, a node-local basis F_v and measured relative transport \`T_uv = inverse(F_v) composed_with F_u\` allow recovering relative maps on unobserved edges when the connection is flat/consistent and a root-referenced spanning-tree of basis probes is supplied.
- Controlled tests, D2–5: 8,832/8,832 withheld links reconstructed and 1,279/1,279 preaction routes executed exactly; randomized evidence control 0/3,808 against real 3,808/3,808.
- The coupled symbolic-word/locally learned frames experiment: 930/930 preaction test goals passed D2–D5. The 11-axis 2^11=2048-state world recovered 18,434/18,434 withheld links and executed 48/48 word-driven routes. These are 2048 *states*, not 2048 dimensions.
- Under noisy observations the first low-budget 4D run FAILed (54/64 word meanings); with 21 frame probes and 31 word observations per word, cumulative recovery became 143/144 in D2–D4. Never erase the failed run or imply no extra data were required.
- Separate modular affine math-language: 1,700/1,700 unseen operation transitions and 650/650 goal routes in a finite-field toy grammar. The exact semantics of general prose, a learned parser and unconstrained nonlinear operators were NOT demonstrated.

### E. Functional-axis gating and meaning of the numbers in the images

- Another isolated axis-gating lab used a synthetic observation containing six truly relevant channels hidden in 64/256/2048 noisy channels. The system discovered those six channels, 1,560/1,560 heldout deterministic transition predictions across tested settings, and 200/200 deterministic goal paths. Stochastic closed-loop replanning solved 160/160 episodes compared to 66/160 when following a fixed initial route; the chance-aware expectation policy did not improve over simple replanning in that toy world.
- The permutations 432, 324, 243, etc. of 2,3,4 lie in a two-dimensional affine plane \`x+y+z=9\`, with six permutation points forming a hexagon. The opposite vectors sum to [6,6,6], hence e.g. 432+234=666. This is a genuine permutation/invariant symmetry, NOT proof that 666 is a physical dimensional constant or a mystical quantum law.
- **Key distinction:** a small set of stable hidden functional channels can be learned in a controlled world. It has NOT been shown that the same six functional axes organize real language or that such an axis count must be universal.

### F. Text mathematical axes, causal interventions, state-dependent transformations

- In \`experiment/V17-TEXT-MAZE-COUPLED-AXES-20261107\`, 13 initial examples were compatible with BOTH: a world where all coordinate combinations are legal, and a world permitting at most one changed coordinate. Without a discriminating observation, the agent cannot identify which rules govern the world.
- Additional witnessed "bridge" interventions let a controlled native-observation-based planner construct 64/64 unseen three-position paths. The strict original planner solved 1/64 after those same witnesses. This is support for ACTIVE EXPERIMENT SELECTION, not merely more embedding dimensions.
- A model learning coupled numeric changes and their invariants solved 70/70 held-out addition/subtraction-style equation goals in a constrained grammar, where goal inputs did not include the answer.
- A state-dependent action-field learner inferred multiplication relationships in a controlled grammar, achieving 48/48 heldout multiplication goals vs 0/48 for a fixed-axis model. The known state-dependent affine-difference inductive bias was built into the experiment.
- Applying transformations X then Y can differ from Y then X even when the visible x,y position is the same. This noncommutativity suggests that a state representation needs appropriate dependent variables / action history. This is a concrete constraint on a future hyperdimensional text maze, not evidence of quantum physics.
- Stochastic re-planning in those controlled arithmetic worlds solved 50/50 episodes in two benchmark families, beating fixed initial paths, but did NOT show real prose comprehension.

### G. Essential NEGATIVE results on original text

- On native unchanged V17 AligningGraph + 5D symbol-geometry hybrid: 23k train / 7k validation / 8k frozen test characters, original top-1 **51.4375%**, validation-selected geometry hybrid **51.2625%**. It did NOT improve on heldout text.
- Modelling 1/2/3/4-character CONTEXTS with experimental native Geometry also did NOT improve the 8k independent text set: original 51.4375%, chosen scale-2 contextual hybrid 51.2625%. Scrambled coordinates performed worse, showing that learnable geometric signal is not enough to improve the original writer.
- The real-corpus gating adapter can train/resume a separate CPU V17 experiment on real TXT/Parquet. Its own README explicitly says the original CUDA kernel, original production writer and live UI have NOT been replaced or causally coupled by the new gate. Full real OpenThoughts3 checkpoint evaluation on the user's D:\ machine is NOT part of these GitHub Actions checks.
- The isolated shared-core branch learns world/action/outcome statistics in a shared Brain instance; its own report explicitly says this is not yet a single semantic world model with unconstrained language reasoning, or all-GPU training.
- DO NOT call the language-as-labyrinth motor solved based on synthetic 100% numbers, unchanged original text results, or illustrative UI.

## 4. Do we have ALL puzzle pieces? No — concrete missing pieces

1. **Verbatim:** full unmodified native conversation export, ALL assistant turns, timestamps/edits when available, attachments as actual files, exact ordering, and clause-level requirement-to-evidence mapping. Canonical release gate must remain BLOCKED.
2. **Representational grounding:** a contextual world/self/goal state that is learned from genuine text and math experience, not preselected coordinates, seeded simulator geometry, known graph topology or hard-coded grammar.
3. **Identifiability:** action selection that deliberately asks for the missing distinguishing evidence when two equally plausible worlds explain the observations.
4. **Learned non-conservative transforms:** symbolic and semantic operators that create valid new information rather than merely rearranging values, as in 2048's world-generated new tile, with independent correctness checks.
5. **General state-dependent field:** latent local action basis and edge transports discovered from actual live corpus examples, including variable-dependent, noncommuting operations and any genuine non-flat loop effects.
6. **Noise semantics:** separate measured world perturbations, observation noise, model uncertainty, learned stochastic exploration and arbitrary sampling temperature. Prove which actually helps/harms GOAL success.
7. **First-try solution shape:** BEFORE emitting the first character, produce a causal multi-step target-conditioned path; then visibly act, detect deviation, update route, without receiving hidden reference answers.
8. **One native Brain, original UI:** integrate the above through the already working V17 full training/multiworld graph and visible live paths (words, axes, tree, rotations, predictions vs moves), no parallel disconnected demonstration, no overwriting someone else's experiment or original buttons.
9. **Unseen-task objective validation:** real heldout OpenThoughts3 + genuinely new mathematical/linguistic tasks, same-data multi-seed A/B controls, scrambled learned axes, frozen original Brain, non-trivial baselines and confidence intervals. Distinguish symbol prediction from correct answer.
10. **Resource/compute truth:** 100%-CUDA training requirement remains unproven for all components. Do not claim NVIDIA utilization, million-token context or Termux runtime parity without measurement on the specified original machine; preserve user saves/checkpoints and PowerShell startup paths.
11. **Cross-world transfer and fractal recursion:** verify one persistent learned abstract network controls maze/text/transform/other worlds, learns recursive scale changes, self/world distinction, and uses time as a genuine learned relational dimension rather than just a decorative view.
12. **Version integrity:** branch isolation, working-model snapshots, exact Git SHA refs, immutable tests, source archives and no silent changes. Research branch count ≠ all source code reviewed line by line. Historic V1–V16 metrics in [the pre-existing atlas](RESEARCH_EVIDENCE_AND_HYPOTHESIS_ATLAS_20261106.md) were not freshly independently rerun by this audit.

## 5. Decision criterion for the next genuine discovery

A "puzzle solved" claim requires ALL of the following on one documented V17 program, not distributed across isolated synthetic toys:

- A learned contextual state, learned ACTION set and learned effect operator inferred from raw input;
- a goal-conditioned global solution shape emitted BEFORE action;
- physically/semantically verified actions that consistently reach unknown test goals;
- a learned local basis/transform that demonstrably CAUSES the success (perturbing it removes the advantage);
- principled tracking of branches/noise after actions and correction/replanning;
- independent held-out performance over a strong unmodified V17 baseline, with exact source/provenance logs, all exposed in the original live UI;
- full original VERBATIM archive or explicitly labelled missing material; no false "all bytes saved".

This audit deliberately preserves both successes and failures. It does **not** merge PRs, does not replace user-chosen implementations, and does not alter original V17 source or any checkpoints. The next research implementation must start by comparing the actual, most recent branch HEADS and their non-overlapping changes; do not falsely claim all hypotheses are implemented together.

## 6. Repeatable integrity commands

    node scripts/verbatim-gate.mjs --report
    node scripts/verbatim-gate.mjs --gate
    node scripts/verbatim-mirror-gate.mjs --report
    node scripts/verbatim-strict-audit.mjs --report
    node --test tests/verbatim-gate.test.mjs

The gating commands are expected to report **BLOCKED** while native full transcript and clause coverage are unavailable. This report was a connector-based repository/source audit, not an execution of every archived version, a native Windows training run or a forensic certification of missing chat bytes.

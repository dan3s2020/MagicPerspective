# MagicPerspective V38 — Native Brain averaged real human-text evidence / strict internal policy selection

Date: 2026-11-07
Branch: experiment/V38-AVERAGED-REAL-TEXT-SEMANTIC-ATTRACTION-20261107
Parent: V36 opt-in memory-safe learner commit 17c4a88b642636cb6ac7869a8e9d81ea7cbd6b69
Status: verified independent human-written **extractive answer** improvement, NOT general open-ended text semantics, unlimited 100% QA, or all-GPU text training.

## Original native source preserved

All original V17 Brain, Discoverer.shape/shapeGraph, original 2D maze episodes, original .v8 persistence, original CUDA and original original user-facing UI are unchanged. The V35 original learnt-question-to-document retrieval motor is only extended with OPTIONAL weight-history averaging:
- trainAveraged in v17/research/text-hypermaze/real-squad-evidence-paths.mjs: train EXACT same supervised actual source questions, but sample model weights every 200 training exposures after a warm-up of 400; average snapshots. No dev answers, no second model and no teacher-specified goal terminal.
- plan and rankDirectly accept optional weightMode=last or weightMode=average; unchanged default weightMode=last, so all historical regression tests run as previously and keep exact original V35 answers.
- The SAME original Brain owns last + average weight maps in original .v8 checkpoint. No pretrained embeddings, no GPT, no injected hidden correct answer.
- Original Discoverer.shapeGraph still navigates question -> source sentence -> source text span through actual observed source evidence; the trained score is the answer-selector. The original shape remains a faithful route but not an independent semantic answer generator.
- v17/tests/v38-real-averaged-evidence-validation.test.mjs and .github/workflows/v38-real-averaged-evidence.yml are genuinely runnable tests, not mocked model output.

## Actual original source data and leakage controls

Canonical official Stanford SQuAD 1.1 TRAIN and DEV, fetched live with fixed SHA256 checks:
train SHA256 3527663986b8295af4f7fcdff1ba1ff3f72d07d61a20f487cb238a6ef92fd955
dev SHA256 95aa6a52d5d6a735563366753ca50492a658031da74f301ac5238b03966972c9

442 source training articles are divided BEFORE validation: 380 original training-source articles vs 62 completely disjoint TRAIN validation articles. 2,400 human Q/A samples trained, 500 human Q/A from the 62 untouched TRAIN articles used only to choose between averaged vs final weights.
Original DEV contains 48 independently authored different articles; the original external 650 heldout questions were opened ONLY AFTER the last/average policy had been chosen. The same 650 DEV QAs then compared the two frozen policies as scientific controls, but no DEV answer was used to update weights or choose policy.

Same original Brain first learned attraction/conductance over 26 genuinely lived original 2D maze episodes. Each text question reads the whole available original passage, creates the bounded complete available sentence/span graph, and predicts exactly one source substring as its entire answer BEFORE seeing the annotated correct span.

## Green verified independent GitHub Actions

Final green before documentation:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42363114442

Source policy selection: on 500 internal article-disjoint TRAIN calibration questions, without DEV access:
- Last weights: 59/500 exact, 61/500 normalized.
- Averaged weights: 82/500 exact, 87/500 normalized.
Therefore policy AVERAGE selected BEFORE opening DEV annotations.

External 650 genuinely unseen human DEV questions, no changing weights:
- Untrained original native source graph: 6/650 exact.
- LAST weights: 79/650 exact (12.15%), 89/650 normalized (13.69%).
- AVERAGED weights: **121/650** exact (**18.62%**), **127/650** normalized (**19.54%**).
- Gain averaged vs last: **+42 whole raw answers /650**, +6.4615 percentage points; **+38 normalized answers /650**, +5.8462 percentage points.
- All original source-span answers were valid source substrings; no unsupported/generated answer inserted.
- Direct learned evidence ranking vs original Discoverer.shapeGraph using averaged floats: **648/650** answer identities match. TWO cases were different (native 39 vs direct 485; native Luther examined at Augsburg vs direct Imperial Diet). This small tie/precision disagreement was reported and the strict erroneous 650/650 acceptance assertion was fixed to retain truthful 648. Do not claim exact native-vs-direct parity for averaged decimal weights.

Averaged training tracked 4,800 actual source question exposures; 3,780 representable examples, 1,020 out-of-budget answer spans, 23 model snapshots after burn-in. Final model 16,516 nonzero feature keys, averaged feature map 16,941 keys, both persisted on original Brain.
Original .v8 checkpoint 1,090,579 bytes and exactly reloaded the same averaged weights, answer, full original shape and observed source graph.

## Why this matters / boundaries

V36 showed that more data without stabilizing the final online perceptron can hurt: exact on fixed 600 human DEV questions fell 79/600 with 600 training examples -> 75/600 with 2,400 -> 57/600 with 9,000. This is a real regression in the naive last-weight online update, not increasing artificial maze depth.
V38 shows that averaging the learned weight trajectory improves on disjoint internal articles and external DEV. This is a genuine learned text-goal rank improvement, not a universal physics/new dimension discovery.
V37 independently showed 329/450 human questions had a correct source goal state already in the full bounded graph but ranked below the wrong answer; only 56/450 had the correct span missing. V38 addresses the rank failure cause.

**Blocking limits still apply**:
- 121/650 exact leaves 529/650 wrong whole answers. The entire original long-form OpenThoughts3 full unseen answer gate previously returned 0/24. These are different tasks and scores cannot be cross-interpreted as 18.62% unrestricted generation accuracy.
- All SQuAD passages are GIVEN; supervised answer offsets in TRAIN are used to fit lexical goal preferences. No actual independent physical verification of arbitrary natural language semantics, no fully autonomous goal inference.
- Native attraction only routes the answer source; 648/650 matches with direct rank show shape does not yet provide an extra compositional advantage. Need real multi-hop linguistic transition laws.
- Correct answer candidate may still be absent due to source boundary budget (max 640 tokens, 7 word tokens), and most present wrong candidate choices require better semantics.
- Tests CPU Ubuntu Node.js 22; no claim native GPU/CUDA acceleration on Windows RTX or original UI support.
- Isolated research branch only, NO main merges, no changed original external agents or checkpoints.

## Reproduction

    node --test v17/tests/v38-real-averaged-evidence-validation.test.mjs
    node --test v17/tests/v35-real-squad-evidence-paths.test.mjs
    node --test v17/tests/native-hypermaze-shape-parity.test.mjs

## Next falsifiable test

Scale the actual averaged learner to 9,000 or more real human training questions with fixed source-article-disjoint calibration, then compare on independently heldout novel articles. Judge ALL exact answers, compare final vs averaged and count every refused/missing-source goal; never turn off negative results. Only when these are robust should original solution-shape be tested as a CAUSAL contribution in multi-hop natural text transitions with independent external verification.

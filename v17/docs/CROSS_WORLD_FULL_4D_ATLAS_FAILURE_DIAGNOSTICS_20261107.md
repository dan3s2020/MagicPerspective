# Complete finite 4D transformation atlas across segmented text worlds

**Evidence date:** 2026-11-07. This is an additive isolated research branch from
\`experiment/V17-GROUNDED-4D-TEXT-GOAL-BRAIN-20261107\`. No original
\`Brain\`, CUDA \`TextCard\`, NoiseAgency, UI, checkpoints or training worker changed.

## Exact question tested

The heldout exercise contains **a complete 256-chamber 4D terrain map and the
start/goal**, but none of the eight operator definitions. Each of 32 preceding
training worlds provides **one action only**, with 76 observed
(before-state, action, after-state) transitions. The organism must retain
causal transition rules across all training worlds, infer previously unseen
state/action edges and plan the **entire action sequence before executing**.

This is deliberately *not* a next-character predictor. The generated textual
answer is a sequence of action words; individual characters of that answer
are compared with a posthoc reference route, but a different valid optimal
route is NOT penalized as a task failure.

An action moves through a finite 4D torus, with 4 coordinate values per axis.
Two of the eight actions have constant displacements. Six depend on the
parity of a DIFFERENT axis (noncommuting, state-dependent effects). The
learner is allowed to test generic coordinate-parity and coordinate-equality
conditions; the ground-truth action formulas and goal-path solver are not
supplied to it. **This is an inductive bias, not autonomous invention of
arbitrary mathematics.** The planning operator is conventional BFS; the
learned component is the action-conditioned map.

## Local tests (performed BEFORE writing to repository)

Executed an isolated Node v22.16.0 research harness:
\`node --test atlas-engine.test.mjs view-dom.test.mjs\`.

**11 tests passed, zero failed** after fixing an actual test bug in
provenance recording and testing the HTML's executable code with a DOM stub.
The local engine was optimized from O(number-of-events × every predicted edge)
to precomputed evidence indexes, without altering the predictions. A Chromium
screenshot could not be executed in this environment because even Chrome
\`about:blank\` timed out; JS syntax and the actual DOM-populating script
passed. Do not report a live real-browser acceptance where none occurred.

### Measured 3 seeds × 96 heldout worlds

| Seed | Exact optimal predicted before action | Fixed-operator ablation | One-world-only memory | Document chars |
|---|---:|---:|---:|---:|
| 1181 | 96/96 | 0/96 | 0/96 | 2,729,322 |
| 3837 | 96/96 | 0/96 | 0/96 | 2,729,321 |
| 7731 | 96/96 | 1/96 | 0/96 | 2,729,719 |
| **Total** | **288/288** | **1/288** | **0/288** | **8,188,362** |

Every training corpus has exactly 32 previous worlds × 76 transitions
= **2,432 observed transitions**, where 5.5% of transitions are randomly
corrupted. The complete 256-state atlas has **256 × 8 = 2,048**
state/action candidate edges for each heldout world. In local seed 1181,
1,402 edges have direct same-state/action evidence from previous worlds and
646 are inferred from learned rules, even though their particular combination
was never seen. Of those 2,048 candidate edges, 782 are blocked in the
first heldout world's observed terrain. **All 2,048 are enumerable and
inspectable; blocked physical edges are distinguished from unlearned
transformations.** With only one earlier training world, **1,792 edges**
(7 unknown actions × 256 states) are unsupported, not silently invented.

### What failure analysis discovered

The fixed model cannot represent 6 state-conditional transformations.
Its failure is not a lack of more next-character contexts; its predicted
**successor state** is wrong. On seed 1181 the fixed model produced a route
for all 96 worlds but the executed action disagreed with the predicted
successor in **96/96**. On seed 3837 it found no route in **82/96**
and had first-step prediction mismatches in another **14/96**.
The atlas records the exact first wrong action, source worlds,
training observation IDs, predicted and real successor and first differing
character of the action-string reference. An explicit condition of the form
\`axis-j-parity\`, selected using actual evidence, closes these missing
connections in the observed test distribution.

### Iterative learning curve — 288 worlds frozen, 3 seeds

| Observations total across 32 worlds | Conditional-model successes |
|---:|---:|
| 32 | 4/288 |
| 64 | 2/288 |
| 96 | 12/288 |
| 128 | 202/288 |
| 192 | 288/288 |
| 320 | 288/288 |
| 512 | 288/288 |
| 768 | 288/288 |
| 1280 | 288/288 |
| 2432 | 288/288 |

There is a sudden improvement after enough cross-world observations cover
the two contexts of every state-dependent effect. The small-data curve
is not strictly monotone because the minimal decision stump can select
spurious rules from sparse noisy evidence.

### Noise and negative controls

The learner still solved 288/288 at 0% corruption and at tested 5.5%,
15%, 30%, and 50% random training-transition corruption under the fixed
sample budget; therefore noise tolerance is demonstrated but noise as a
cause of discovered dimensions is **not**. An unseen physics shift in one
heldout action makes 256 of 2,048 predicted operator edges wrong. The
finite full terrain map is a **precondition** here; deleting one chamber
description raises an error rather than treating an unknown wall as known.

## Full transparent atlas output

The offline visualization \`atlas.html\` is generated from actual
\`atlas.json\` (ALL 256 states/2,048 edges), \`learned-transforms.json\`
(ALL 2,432 training observations and provenances) and \`results.json\`
(ALL 96 heldout start/goal/action/trace/failure records for one seed).
It displays all action choices, physically blocked edges, inferred vs
directly observed edges, confidence, source worlds, full source observations,
the complete pre-action path, actual execution, flat-model failed route,
first wrong action/character, and all 96 test outcomes. It is a
finite 4D projection, not a decorative 3D torus animation.

Run from repo root:
\`\`\`bash
node --test v17/research/hypermaze-atlas/atlas-engine.test.mjs
node v17/research/hypermaze-atlas/atlas-benchmark.mjs /path/to/output
node v17/research/hypermaze-atlas/atlas-view.mjs /path/to/output
\`\`\`
The GitHub CI workflow independently replays the tests and uploads real
\`atlas.json\`, \`results.json\`, \`learned-transforms.json\` and
\`atlas.html\` as an Actions artifact.

## Critical boundaries — not ready as universal OpenThoughts trainer

- The 4D world states/actions and terrain descriptions have a fixed
  grammar and an explicit coordinate ontology. The model learns a
  conditional transformation family, NOT free-form natural-language
  semantic parsing or every possible transformation.
- Heldout descriptions provide the complete 256-cell terrain. The atlas
  joins *operator knowledge* from earlier documents, not omitted
  current-world terrain. When terrain is missing, the engine reports
  unknowns rather than claiming perfect foresight.
- Its output is an **action string**, not full natural-language Q/A.
  The original V17 character predictor / text generator is not yet
  controlled by the atlas; the native OpenThoughts stream cannot
  automatically turn every example into (state,action,next-state) events.
- Success on these synthetic worlds does not establish 70% or 100%
  correct unseen large natural-text answers, nor sustained MB/s on CUDA.
  No claimed CUDA benchmark or complete V17 integration is provided.
- The provenance, wrong edges, unsupported actions and OOD shift
  are intended to identify exactly the missing transformation
  representations in a subsequent evidence-driven integration.


## Stronger text-to-atlas ingestion — validated after first proof

The initial local proof used directly observed structured (state,action,successor)
records. We then made the training genuinely arrive as **32 distinct TEXT
documents**, with four different sentence-order templates per document.
A source world still exposes exactly ONE action, no world individually
contains all eight operators. A generic parser extracts two ordered
coordinate tuples and exactly one learned action label from each
evidence-bearing line; irrelevant note lines are ignored and counted.
Every accepted edge stores the precise input document/line provenance.
The core planner consumes the SAME assembled model, and all 288/288
pre-action 4D paths remain correct. Every training document is exported
unchanged to \`training-documents.json\` for inspection in the workflow
artifact. This is structured document ingestion, NOT general natural
language interpretation or unsupervised semantics from OpenThoughts.

A subsequent diagnostic associates **each character in each generated
action-string answer** with its source operator in the initial route and
that operator's previously observed source-world evidence IDs. This is
recorded for EVERY heldout world in \`results.json\` as
\`attempts[*].conditional.characterAttribution\`, alongside the first
incorrect action/character of the fixed-transform ablation. A distinct
shortest valid route can have different characters from the reference:
this is marked as a lexical disagreement, NOT a failed solved-world claim.

## Independently confirmed GitHub Actions

Latest observed green run after text ingestion and character attribution:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42357111657

- **13/13** research tests: 11 initial causal/atlas/noise/learning tests plus
  segmented text ingestion and per-character provenance.
- **1/1** actual offline UI logic executed on complete generated data in
  an isolated DOM harness, no substituted fake graph. The real Chromium
  browser could not launch in the local container even for about:blank;
  actual graphical rendering must still be checked in an end-user browser.
- **6/6** existing PR #62 native Brain test and **1/1** native NoiseAgency
  test, with no code alterations to those original mechanisms.
- **21/21 Node tests passed** in CI. The workflow uploaded the full
  \`atlas.html\`, \`atlas.json\`, \`results.json\`,
  \`learned-transforms.json\` and \`training-documents.json\` for all 3
  seeds. No RTX CUDA claim is made for this research branch.

## Correctly bounded conclusion

We can now demonstrate **a finite reusable 4D causal transformation atlas**
that joins segmented TEXT memories, enumerates the full *modeled* 2,048-edge
maze, detects exactly which prior-context rule is required, predicts a
complete path before acting, and attributes wrong successor/action-string
characters to prior source observations. With fixed operators the same
training/evaluation procedure fails almost everywhere. This is not a
proof of a universal language atlas: unbounded natural-language
states/relations, word meaning, source reliability under major shifts,
automatically discovered new kinds of transformation, the production
OpenThoughts learner and CUDA throughput are not solved. Do not launch
expensive training claiming these objectives have been achieved.

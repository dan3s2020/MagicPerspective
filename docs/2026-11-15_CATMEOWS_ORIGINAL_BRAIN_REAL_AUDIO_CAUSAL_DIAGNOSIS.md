# 2026-11-15 — CatMeows: real-audio causal diagnosis of ORIGINAL Braivour V42, actual failed information path

**Status: ACTUALLY EXECUTED, source-checked, owner/cat-heldout. NOT decoded animal communication.**
This is a **new causal finding**; do not document it as a successful autonomous language system, and do not rerun the superficial context-classification parameter sweep with different bin sizes.

## Original sources and ownership

- Entire unmodified original V42 Brain source pinned to \`MagicPerspective@ac205b5bc561274b957584a7dee058a1110ab6f8\`.
- Exact Brain instance in all experiments is \`Brain\` from \`v17/transcend/torus-aether/devour/brain.mjs\`; its own \`Brain.live()\` sees real animal audio events and \`Brain.align.write()\` makes frozen predictions. No separate trained audio classifier masquerades as organism.
- Caveat: although the Brain object is genuine, the INITIAL classification/next-call trial did not route through native \`Discoverer.shapeGraph()\` or embody a meaningful cat-reaction world. It used only the *original AligningGraph output*. This does not meet the ultimate biological-communication discovery criterion.
- All material was tested on the isolated \`experiment/CATMEOWS-CAUSAL-AUDIT-20261115\` branch. No changes to V42's working \`main\`, other branches or saved checkpoints.

## Original data — verified actual bytes

- 440 real meows, 21 cats, 12 owners, contexts B brushing 127 / F food waiting 92 / I unfamiliar isolation 221; official Zenodo \`dataset.zip\`, MD5 \`b5fa911bcd6514e39dfef6876f747df4\`.
- \`extras.zip\`, official MD5 \`7663bb5e1de2c808beeb202a52dc99ab\`: 43 real 8kHz mono WAV, 30 uncut sequences + 13 other sounds, total ~402.343 s. Energy segmentation estimates **160 acoustic bursts** from 30 uncut sequence recordings; **12 cats, 7 owners**, not manually transcribed call boundaries.
- The original files include stimulus context, sex/breed/owner/session in WAV filenames. **Only the waveform supplies sensory events**. Cat/owner/context are held outside inference for grouping/evaluation. No cat behavior, recipient response, conversation turns, or validated translation semantics exist in this corpus.
- 8kHz low-cost headset recordings and the compressed 8-frame/9-feature representation limit signal fidelity. This is an adapter limitation, not a finding about the limits of the species or original organism.

## Verified group-wise evaluation (no owner or cat identity shared across train/eval)

- Original 440 WAV context-classification run, true training labels vs randomized training labels, \`https://github.com/dan3s2020/MagicPerspective/actions/runs/43729551347\`:
  - Absolute spectral sequence, true: accuracy **48.18%**, balanced accuracy **35.68%**.
  - Absolute, shuffled-label control: **44.09%**, balanced **31.09%**.
  - Time-relative acoustic sequence, true: **46.36%**, balanced **35.66%**.
  - Time-relative, shuffled-label control: **43.18%**, balanced **30.56%**.
  - Majority context BACC = 33.33%. This is weak context correlation, NOT semantics.
- More parameter branches (balanced classes, bins, within-sound summaries, prior normalization, test-time rotated views) produced inconsistent improvements; some were below shuffled-label control. Stop treating a higher score as decoded communication. Note an integrity flaw in the historical script: \`trainedPerspectives\` was computed as \`seen.length * shifts.length\` although \`trainBrain()\` traversed **one** fixed sound representation per sample; extra \`shifts\` were applied at evaluation only. \`CATMEOWS_PRIOR_ALPHA\` produced no changes under balanced class priors, as expected when divisor is constant. These are NOT independent training successes.

## New causal result 1 — previous context experiment DID NOT CONSUME THE COMPLETE CALL

Independent real-audio audit \`https://github.com/dan3s2020/MagicPerspective/actions/runs/43732785077\`, \`causal_audit.mjs\`, 440 owner/cat-heldout clips in each of two acoustic views:

- Change the **first 7 of 8 frames** of the presented meow to sound from a different real heldout meow (retain last frame): **0/440 changed predicted context**, in both acoustic views.
- Change only the **last 1 of 8 frames**: **130/440** context predictions changed in absolute spectral view, and **142/440** changed in relative acoustic view.
- Thus early acoustic history was causally irrelevant to this classifier on ALL tested unseen clips; last audio frame had nonzero influence.
- Blind next-symbol acoustic continuation WITHOUT any context labels, 7 observed frame transitions/clip (3,080 heldout next-symbol events per representation), original native Brain:
  - Absolute: **1,015/3,080 = 32.95%**, compared with same-feature value from preceding frame **1,676/3,080 = 54.42%**.
  - Relative/change: **1,443/3,080 = 46.85%**, vs previous-frame **1,706/3,080 = 55.39%**.
- Correct reading: original sensory route does not beat very simple real-audio continuity; NOT demonstrated learned animal-call syntax.

## New causal result 2 — genuine uncut multi-call episodes

\`https://github.com/dan3s2020/MagicPerspective/actions/runs/43733196433\` validated original \`extras.zip\` and generated 30 real time-ordered episodes (160 energy bursts). Original Brain learned AUDIO ONLY, no context/identity labels; evaluated on 130 next-burst situations from unseen owners/cats.

- \`audio_global\`: native **492/1,170 = 42.05%** acoustic-symbol accuracy; simply repeating previous same-cat burst **517/1,170 = 44.19%**.
- \`audio_duration\`: native **511/1,170 = 43.68%**; repeating previous burst **518/1,170 = 44.27%**.
- **Zero / 130** exact 9-token next-burst forecasts in either representation.
- Negative causal control: reverse order of REAL CALLS within each TRAINING sequence (preserves waveforms and data size). Re-download actual GitHub raw artifact \`14169188494\`; independently checked every predicted array. **130/130 per representation = 260/260** exact predictions unchanged.
- This is conclusive about these trained predictors' lack of sensitivity to chronological call order; it does not prove cats lack temporal structure.

## New causal result 3 — depth 6→64 does not fix it

\`https://github.com/dan3s2020/MagicPerspective/actions/runs/43733569434\`: same *original* Brain and signals, experimentally set original \`Brain.align.depth\` from 6 to 64 and form proposal depth to 48; **no substitute learner**. Raw artifact \`14169119414\` was compared line-by-line.

- **260/260** heldout nine-symbol next-call predictions exactly unchanged between depth 6 and depth 64.
- **260/260** exact predictions also unchanged between chronological and reverse-order training at BOTH depths.
- No new full nine-symbol predictions achieved. Simply allowing more alignment proposal levels did not solve anything.

## IMPORTANT source-reading correction — do NOT repeat previous false conclusion

The original \`AligningGraph\` constructor defaults \`depth=6\` / \`formDepth=4\`. In \`Memory.props()\`, however, these are the **number of deepest available matching alignment levels retained**, NOT a hard cap of 6 or 4 physical input tokens. The actual matched suffix length is \`p.k\` from the suffix-array alignment. Earlier intuition treating the depth as literal history length was WRONG. An initial audit's \`maxObservedMemDepth\` was also INVALID because the source names can be \`memn\`/\`formn\`, not just \`mem\`/\`form\`. These incorrect measurements are superseded.

**Executed corrected native provenance audit**:
\`https://github.com/dan3s2020/MagicPerspective/actions/runs/43733833637\`,
source \`inspect_match_provenance.mjs\`:
- Across 440 unseen cats/owners in absolute spectral view, max relevant matched suffix averaged about **4.33 physical symbols**; no observed relevant match reached 10 symbols; maximum **9**.
- Across the SAME 440 in relative acoustic view, average about **5.11** symbols; **2 of 440** reached at least 10 symbols; maximum **18**.
- Therefore **0/880** tested class predictions had a relevant suffix match of at least 20 physical acoustic symbols.
- This measured **sparsity of useful suffix matches**, not a hard software limit, explains why changing older parts of the waveform or increasing depth does not alter predictions.

## Why the original maze organism can work while this did not

The original maze learner's predictive success uses physical action/state consequences and a discovered field/path to a reachable goal before acting. The cat-context wrapper instead appends a human-assigned recording condition as the next symbol after 72 unstructured features and asks AligningGraph to copy a label; it does NOT make the external cat's reaction the world, nor treat the learned acoustic transformations as physical actions in the original Discoverer. Our failed direct-audio sequence route still used only native symbol alignment, not real action/transition topology. This distinction is mechanistic, not an objection to adapting the organism.

## Next experiment acceptance gate — develop THE SAME ORGANISM, no hyperparameter casino

1. Retain the original physical Brain, Discoverer and saved-state rules; modify its original sensory/action world only where needed.
2. Represent time-resolved acoustic state transitions **as experienced consequences**, including pauses and multi-call sequence geometry. Preserve real causal episode order; don't relabel contexts as meanings.
3. Make the native organism anticipate a real unseen next state BEFORE hearing it, then update its state from the observed acoustic consequence, using its own action/shape mechanisms. Audit original \`Discoverer.shapeGraph\` / original \`ConstructedTransitionGraph.observe\` and explicitly record whether they act or only observe.
4. Require improvement beyond **last burst** and **previous-frame** real-audio continuation on owner/cat-heldout data and a **nonzero causal difference** between chronological vs permuted training. If these controls fail, do NOT call the result an inferred communication grammar.
5. Actual message meaning requires independent animal response / recipient feedback or behavior-changing interventions; CatMeows alone provides none. A self-supervised acoustic sequence finding would only be a structural prerequisite, never a verified translation.
6. Protect the valid original maze/GGUF abilities; work on isolated experimental branch. Only document new causal changes. Do not merge the experiments into active production.

## Result

We established **why this CatMeows training path failed** and where genuine information is missing. We have **NOT** demonstrated animal-semantic decoding or a newly functioning biological-communication organism. The missing mechanism is endogenous **cross-call causal state/transformational learning**, rather than more suffix proposals, more classifier bins, or higher apparent context scores.

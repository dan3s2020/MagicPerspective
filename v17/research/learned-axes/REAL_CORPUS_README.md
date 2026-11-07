# MagicPerspective V17 — REAL corpus perspective-gating scale-up
Branch: experiment/V17-REAL-CORPUS-AXIS-GATING-20261107 (isolated; original V17 is unchanged).

## What this does NOW

- Trains the ORIGINAL V17 Brain.liveLanguage and Brain.learnObservedTransformations using real text. Optional native Brain.learnConstructedText learns real Q/A rows when requested.
- Reads OpenThoughts3-1.2M through the existing V17 Parquet loader, or streams real TXT paragraphs without inventing any training labels.
- Learns which actual corpus-derived textual context-history lengths help prediction; these are predictive scales, NOT proven semantic/physical or quantum axes.
- Selects the gate using a validation partition the learner never trained on.
- Evaluates that frozen gate on a DIFFERENT held-out partition, compared against ORIGINAL TextPerspectives, unigram, and one-token/bigram baselines. Held-out answers never teach the gate.
- Saves a new serialized Brain and supports safe resume in an isolated output directory.
- Imports an EXISTING original V17 Brain save read-only if requested, without overwriting its bytes.

This Node.js JS research adapter is CPU-only, not a CUDA training kernel. The original START_V17.ps1 CUDA worker and NestView UI remain intact. This runner does NOT yet change AligningGraph.write or prove xD semantic solution navigation.

## Windows / PowerShell

Use a separate clone to avoid overwriting anything:

    git clone --single-branch --branch experiment/V17-REAL-CORPUS-AXIS-GATING-20261107 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-Real-Axes

Start native corpus learning:

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Real-Axes\v17\START_REAL_TEXT_AXES.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Real-Axes-Run" -MaxRows 50000 -SaveEvery 5000

Extend from the SAME save:

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Real-Axes\v17\START_REAL_TEXT_AXES.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Real-Axes-Run" -MaxRows 250000 -Resume

-MaxRows 0 allows the entire native training partition. The exact time and memory requirements on the user's machine have not been measured.

Optional: evaluate an existing saved V17 brain by importing it as an ISOLATED COPY:

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Real-Axes\v17\START_REAL_TEXT_AXES.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Imported-Axes" -ImportBrain "D:\YOUR_REAL_SAVE_DIRECTORY\brain-0-stable+many.v8" -EvalOnly

The save path here is an example, not the claimed actual local save location. Discover the real file in the existing runtime-devour/brains directory.

TXT supported as -Text "D:\real-corpus.txt" instead of -Data.

## Results / logs

- brain-real-text.v8 — genuine original-class Brain serialization.
- progress.json — training cursor / actual rows seen, for resume.
- train-events.jsonl — live streamed observation and learned-operator counts.
- heldout-results.json — native/bigram/unigram/gated metrics and observed next-token prediction trace.

Parquet split: the existing V17 HELD_OUT rows for final testing, preceded by a separately withheld validation slice. TXT split: deterministic paragraph SHA256 (80% train, 10% validation, 10% test); identical paragraphs always land in the same split.

The status stays NOT_YET_DEMONSTRATED unless the selected policy beats both original and bigram by >=1 percentage point on the isolated final test. Better next-token prediction would NOT on its own prove semantic maze solution planning.

## Original full V17 CUDA worker, separately

To keep actual V17 GPU training and its live UI:

    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Real-Axes\v17\START_V17.ps1" -Workers 1 -Arms stable+many -Worlds text -Gpu cuda:0 -Vram 3 -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Native-CUDA-Run" -Port 8862 -Start

These are TWO independently saved learners. The new gate is not secretly applied to the full V17 AligningGraph generator; no false full-CUDA claim is made.

## CI evidence

GitHub Actions ran original Brain with REAL existing MagicPerspective project documentation, trained 10 rows, resumed to 18, evaluated untouched held-out texts, and imported another genuine native save read-only. Test accuracy was 22.43% for the existing V17 perspective selector vs 22.65% with validation-selected gating: not sufficient to claim an improvement, status correctly NOT_YET_DEMONSTRATED. These are tiny smoke-test documents, NOT the user's OpenThoughts3 corpus.

For true language xD traversal we still need a model that learns non-conservative semantic transformations, anticipates the goal solution shape before writing, and proves independent correctness on completely unseen math/text tasks. The earlier six-axis synthetic-permutation test proves none of these properties on real language.


## Larger actual-project-text acceptance run (after resuming through entire available training partition)

- 167 actual repository-document paragraphs trained in a native Brain;
- 12,549 observed text tokens;
- 162 learned contextual edit operators (from real observed comparisons, not synthetic permutations);
- final frozen test: 905 tokens;
- original native perspective accuracy 26.1878%;
- one-token baseline 21.6575%;
- validation-gated perspective accuracy 26.6298%;
- new gate advantage +0.442 percentage points, which does NOT meet the 1pp proof threshold.

This is an increased, verified smoke test only. It establishes real text ingestion and observable contextual transformations, NOT successful OpenThoughts3 training on the user's own disk or general solution-shape navigation.

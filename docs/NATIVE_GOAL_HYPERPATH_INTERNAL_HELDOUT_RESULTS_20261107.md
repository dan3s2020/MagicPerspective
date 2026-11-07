# MagicPerspective — REAL INTERNAL SOURCE-LEVEL HELDOUT EVIDENCE, RELEASE STILL BLOCKED
Date: 2026-11-07.
Subject branch: \`experiment/V17-CAUSAL-HYPERPATH-NATIVE-20261107\`, examined HEAD \`707795eb22f0907a580d09f99e0b56dfde9fb51a\`.
**Not a success announcement. No run command authorized.**

## Audit provenance and experimental method

Source files retrieved **verbatim from the GitHub branch** and executed as the actual module classes in a clean JavaScript V8 isolate after removing only ES-module \`import\` / \`export\` syntax. No implementation logic was changed. The isolated runtime supplied a \`Buffer.byteLength\` UTF-8 shim because Node's Buffer global is unavailable in the test isolate.

- \`v17/transcend/torus-aether/worlds/observed-transformations.mjs\` blob \`81d5aa2bc0eaf9b409722d6e1380f2a71f16f6b1\` (29,906 source characters)
- \`v17/transcend/torus-aether/worlds/goal-conditioned-hyperpath.mjs\` blob \`06aca62d42d94c9804a5c403991f8e6d1f58b1d3\` (10,644 source characters)
- \`v17/transcend/torus-aether/devour/brain.mjs\` blob \`8640b0a60958260d89aead99e1decbf7f3fce3b9\`.

Only the training Q/A pairs and actual observed answer sentences were fed to \`observeText\` / \`observePair\`. For heldout questions the planned answer was scored against a separately retained exact reference **only after** \`plan(question,trainedWorld)\` returned. There was NO direct reference-answer input to plan(). This tests the real current goal planner, but **not** full original Brain/worker integration, GPU throughput, the user's local OpenThoughts data or general language competence.

## Result A — controlled unseen natural-language questions (not OpenThoughts)

Training: **12** actual Q/A observations, 10 distinct observed answer states, 12 learned text edit operations, 166 question-answer lexical-axis associations. Four sky→blue questions, four sunset→red questions, two happy→She-is-happy questions and two tired→He-is-tired questions. The observed text world additionally saw \`The sky looks red.\`, \`The sunset looks blue.\`, \`She is tired.\`, \`He is happy.\`, \`He is calm.\`, \`She is calm.\` to permit controlled single-token transformations.

Heldout: **12 distinct questions**, grouped 4 sky, 4 sunset, 2 happy, 2 tired. Expected sentences chosen independently of the planner. Exact output **10 / 12 (83.333...%)**; predicted-and-internally-executed paths **10 / 12**; goal-inference ablation (\`ablateAxes:true\`) **0 / 12** paths. The two failed cases were:
- \`Which color does a glowing sunset display?\` expected \`The sunset looks red.\`; inferred required axes \`["is","red"]\`, no observed transform path.
- \`Describe the hue of a sunset.\` expected \`The sunset looks red.\`; same incorrect inferred axes \`["is","red"]\`, no observed path.

Ablation exposes *causal dependence on inferred lexical target words*, **not** proof that a new geometric 4D/5D latent world or semantic transition was learned. For other paths, \`body.success===true\` means the text-edit world internally reached its own token constraints, NOT an independent real-world semantic verdict. External exact match was checked separately.

## Result B — long unseen question requiring multi-sentence answer

Training: **5 paraphrased questions**, each paired to the SAME actual 6-sentence water-cycle explanation, **717 characters / 108 whitespace-delimited words**. The observed corpus world contained **6 distinct sentence records and 0 learned edit operators**. Heldout question, not in training:
\`Give a complete explanation of the global water cycle in several sentences, covering evaporation, clouds, precipitation, soil and rivers.\`

The planner inferred \`["above","air"]\`, returned **no solution path**, \`no-observed-transform-path\`, and produced **0 of the required 717 characters**. External whole-answer exact accuracy **0 / 1**. This is especially informative because the complete reference paragraph had occurred in the training pairs; the native goal planner still cannot compose it into a complete answer.

## Result C — heldout mathematical generalization

Training: **25** Q/A observations, all pairs \`a,b∈{0,1,2,3,4}\`, questions \`What is a plus b?\`, answers \`a + b = a+b.\`, with exact real values from the source data. The same answer formulas were fed to \`ObservedTransformations.observeText\`.

Heldout: **9** NEW pairs \`a,b∈{5,6,7}\`, independently scored against their correct sums (10..14). **0/9 exact**, **0/9 paths**, **0 native learned edit operators**. The planner inferred lexical numeric axes like \`["0","1"]\`, not the arithmetic function. A simultaneous change in an input and its dependent output is not an admissible one-token transition for this original learner.

These are controlled research fixtures, not evidence that OpenThoughts has been trained or that large-language 100% success has been approached.

## Code-level root causes: not merely slow training

1. The \`ObservedTransformations._compare\` / \`oneEdit\` transition learner accepts only **one changed token per learned action**. Correlated multi-coordinate transformations (e.g. operand changes together with dependent result) have no learned operator.
2. \`ObservedTransformations.observeText\` splits documents into individual sentences. It does NOT preserve a multi-paragraph answer as one semantic goal world.
3. The frozen planner uses a bounded number of word constraints (default **2**) and a short edit depth (default **5**; the underlying limit caps depths at **9**). No representation for a whole novel 108-word explanation is available from this learned edit graph.
4. \`GoalConditionedHyperpath\` learns a co-occurrence \`question-token → answer-token\` map, not discovered hyperdimensional local axes / transformation geometry. Its target words can be spurious, e.g. \`"is"\` instead of \`"sunset"\`.
5. \`Brain.chat\` currently still defaults to \`mode="legacy-character"\`; the original UI's chat request does **not** set \`mode="goal-path"\`. Thus the actual delivered native chat still calls \`AligningGraph.write()\` by default; the experimental goal path is an **opt-in research path**, NOT the principal V17 writing engine.
6. The branch's existing green GitHub Actions tests cover previous shared-core integration and original UI/worker checks; they do not demonstrate these long-form / math / blind-goal criteria or a user-device sustained CUDA benchmark.
7. Internal \`embody()\` compares action effects against the same learned edit model. Success is a necessary structural check but insufficient to establish factual/math correctness without an independent evaluator.

## Mandatory future gate

To change release status from **BLOCKED**:
- Learn reusable, context-dependent, correlated N-dimensional action/effect transformations, including multi-axis changes, and demonstrate their causal role through ablation.
- Represent the entire long-answer goal/problem world without exposing heldout target answers, construct **the complete shape before any output token**, then execute and compare on an independent semantic/mathematical test oracle.
- Pass genuinely heldout long-form QA and mathematics (not only training-answer recombination), report exact answers, execution divergence, plan-before-action success, failure and confidence separately, and compare against baselines.
- Preserve actual original V17 UI and checkpoints, prove resume, run the exact Windows launcher in clean-state acceptance, and benchmark sustained real throughput on the target RTX 3050 Ti with a given dataset row-length distribution.
- 100% may be REPORTED ONLY for the precisely defined and actually tested dataset/conditions, never inferred from known-rule maze success or small structured fixtures.
- Do not merge a partial result into main's production brain or issue a "fully works" PowerShell command.

## Integrity

This report was written **after** the observations above were directly executed on the actual source classes, not before. The previously recorded regression remains in \`docs/CRITICAL_REGRESSION_TEXTCARD_VS_HYPERDIMENSIONAL_GOAL_PATHS_20261107.md\`. No existing source, checkpoint or UI was overwritten as part of this report. Byte-exact completeness of all historical conversations is NOT established by this audit.

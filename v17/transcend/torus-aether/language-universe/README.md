# V17 real text-perspective training (isolated branch)

This is **not** the earlier paired-template demo. The new training runner ingests actual, unlabelled corpus text, feeds every accepted original-brain byte through the unmodified **V17 Brain.live**, and builds a second measurable multi-scale observation of that *same* text. It can interleave live maze and causal worlds in that same Brain, freeze evaluation on the excluded final 15% of text, save checkpoints, and resume.

## Mechanisms
1. **Original V17 organism (unchanged):** \`Brain\`, \`AligningGraph\`, \`LeanC\`, \`EmergentChain\`, \`LivedField\`, \`Discoverer\`, \`CausalOrganism\`, \`GraphTrace\`. The old V17 behavior and files are not modified.
2. **New language observation:** tokenize actual raw text into Unicode words and punctuation; learn next-token transitions from observed contexts of 1, 2, 4, and 8 tokens. Perspective trust updates online from previous prediction versus the actual next token, and is frozen on held-out evaluation.
3. **Shape-field:** paragraph-final tokens are observed completion attractors; the adjacency and conductance values are learned from text. A generic max-product value propagation operator is provided by code (analogous to the original maze), **not discovered autonomously**.
4. **Before acting:** starting with a prefix, the observer predicts an entire possible continuation as a path, recording selected perspective, candidate tokens, support, field attraction, and observations. This is a word-level projection, not proven semantic correctness.
5. **Evaluation:** tests the original V17 character graph and the new multi-scale observer on unseen, chronologically separated text. Logs one-token baseline, multi-scale accuracy, field-guided accuracy, lane usage, prediction samples and failure cases. No outcome claim is made without these numbers.
6. **Real coexistence:** optional \`--maze-every\` and \`--transform-every\` run the existing V17 worlds through the exact same Brain and trace; the new language perspective nodes are attached to the original graph trace. No scripted language rule training data is required.
7. **Persistence:** originals saved as \`.v8\` with \`Brain.save()\`; language observer saved as JSON, with separate progress pointer \`latest.json\`. Resume verifies SHA-256 of the corpus and never trains on the held-out portion.

## First Termux run
Use official Termux; Node.js + Git only. From this branch:
\`\`\`sh
cd ~/MagicPerspective-Real-Language/v17
node --test tests/language-universe.test.mjs tests/language-universe-v17-integration.test.mjs

node transcend/torus-aether/language-universe/train.mjs \
  --text docs/TORUS_AETHER_ABC_20261104.md \
  --chars 10000 \
  --eval 500 \
  --maze-every 5000 \
  --out "$HOME/magic-language-universe-v17"
\`\`\`
Default text is the *real V17 experimental documentation*, not a synthetic demonstration dataset.

Resume with the same \`--out\` and \`--text\`, adding \`--resume\`:
\`\`\`sh
node transcend/torus-aether/language-universe/train.mjs \
  --text docs/TORUS_AETHER_ABC_20261104.md \
  --chars 20000 --eval 500 --maze-every 5000 \
  --out "$HOME/magic-language-universe-v17" --resume
\`\`\`

### Direct OpenThoughts Parquet training (existing V17 reader)

You can feed the original V17 Brain actual question/answer exercises instead of artificial rewrite demonstrations. This uses the repository's unchanged \`data/text-dataset.mjs\` and bundled Parquet decoder:

\`\`\`sh
node transcend/torus-aether/language-universe/train.mjs \
  --parquet "$HOME/training/OpenThoughts3-1.2M" \
  --examples 2000 --chars 12000 --eval 500 --maze-every 5000 \
  --out "$HOME/magic-language-open-thoughts"
\`\`\`

Then run the same command with \`--resume\`; it continues from the saved Q/A exercise index. The \`--chars\` budget applies to each launch, whereas \`--examples\` bounds the total number of Q/A examples in the run. You need the **actual dataset files** under the specified folder; the runner does not download them. The Parquet path is a local example, not an assertion about your phone's storage. The last held-out dataset rows remain outside training. Check \`last-report.json\` for actual accuracy and errors.

For a larger authentic corpus, provide a local \`.txt\` file in \`--text\`, and **a distinct output directory** so an earlier checkpoint cannot accidentally be reused on a different dataset. The runner currently loads text files into memory, so start with a corpus sized for your device; for massive Parquet collections, use the existing V17 \`devour.mjs\` trainer and its built-in \`openTextDataset\`.

To train with additional existing causal transformations:
\`\`\`sh
node transcend/torus-aether/language-universe/train.mjs \
  --text "$HOME/my-corpus.txt" --chars 30000 --eval 700 \
  --maze-every 5000 --transform-every 12000 \
  --out "$HOME/my-language-brain"
\`\`\`

## What is and is not demonstrated

- We do train the original V17 continuous text organism, and a second perspective model, on real raw text, with no prewritten rewrite pairs.
- We do **not yet** demonstrate autonomous understanding of language, long-range causal reasoning, learning grammatical transformations from scratch, goal-directed question answering, or a newly invented higher-dimensional manifold. The field is a structural hypothesis and may hurt held-out accuracy; both its positive and negative results are recorded.
- The new word-level observer is **not yet a decision organ inside the original AligningGraph**. They experience the same corpus and checkpoints and the language perspectives are represented in the same trace, but their prediction policies are compared rather than fully unified. Training the original AligningGraph to select/apply learned language transformations is the next substantive integration.
- The original Brain maps non-ASCII characters to ASCII \`?\` in this CLI, matching its historical symbol convention; the new token graph preserves Unicode. The replaced-character count is logged.
- At each resume the corpus content must match the saved SHA-256. You can inspect \`last-report.json\` for all metrics.

## Research acceptance gate

Before claiming that the language field learns useful *solution transformations*, demonstrate statistically credible improvements over **the same** plain V17 AligningGraph and 1-token baseline, on held-out unseen domains and composition/dependency tasks; include negative cases, GPU/CPU provenance and real outputs. Passing code tests is not proof of intelligence.

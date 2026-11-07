# V17 Graph #0 — frozen self-path ablation (ISOLATED)

**Parent version:** feature/V17-REAL-DATASET-PROGRESS-FULL-INSTALL-20261107.
**This version:** experiment/V17-GRAPH0-SELF-PATH-ABLATION-20261107.

This experiment tests the hypothesis that the real V17 graph #0 text-generation loops are driven by the proposal sources called self and fself. Those sources are within-exercise suffix memories, not consciousness or introspection. No production code in brain.mjs, align.mjs, the UI, or the training launcher is modified.

## Windows: one separate checkout, one complete comparison

Start from any PowerShell location:

~~~powershell
$ErrorActionPreference = "Stop"
$repo = "https://github.com/dan3s2020/MagicPerspective.git"
$branch = "experiment/V17-GRAPH0-SELF-PATH-ABLATION-20261107"
$dest = "D:\MagicPerspective-Graph0-Ablation"
if (Test-Path -LiteralPath $dest) { throw "Separate destination already exists: $dest" }
git clone --single-branch --branch $branch $repo $dest
if ($LASTEXITCODE -ne 0) { throw "Clone failed" }
& "$dest\v17\experiments\RUN_GRAPH0_ABLATION.ps1" -SourceBrains "D:\MagicPerspective-Full-Training\brains"
~~~

The script selects brain-0-stable+many.v8 when present (otherwise the newest brain-0-*.v8), **copies** it into a new uniquely named directory, verifies the source/copy SHA256 hashes, runs native unit tests and then the 3-armed frozen comparison. It NEVER launches training, touches the working source checkpoint, or reuses the production output folder. If a native save is being replaced during copying, it refuses inconsistent hashes.

## Causal experimental arms

- full: unchanged AligningGraph.proposals(), native V17 generation.
- no-self: exclude proposals where src === "self" only, preserving fself and corpus memories.
- no-self-fself: exclude both "self" and "fself", preserving "mem", "memn", "form", and "formn".

Each arm loads **the same checkpoint copy** in a separate Node process, uses the same 4 prompts with no prior history and the same random seed. Temperature tests at T=0 and T=0.6 are included. All ablations are instance-local proposal filters; they neither alter learned weights nor call live(), absorb(), or save().

## Measurements

For each output:
- raw generated text and full TextPathObserver step trace;
- empty, singleton, multi-candidate and repeated-context steps;
- repeated edges, mean entropy at T>0, >95% dominant choices at T>0;
- repeated 8-character-gram fraction;
- the first revisited context's top-choice probabilities and supporting perspectives.

The tool writes graph0-full.json, graph0-no-self.json, graph0-no-self-fself.json, and comparison-T06.csv under a timestamped folder. Checkpoint SHA256 and learned counters are checked for invariance.

**Interpretation constraints:** A context revisit is a repeated 12-byte suffix, not necessarily a repeated complete latent/5D state. A singleton successor set is not an empty set. At T=0, TextPathObserver assigns probability 1 to the selected character by definition, so dominant-choice and entropy statistics are NULL rather than treated as evidence.

## CI: synthetic fixture versus real training snapshot

GitHub Actions runs unit tests against the unchanged AligningGraph implementation and an end-to-end test that constructs/saves/loads a *synthetic* V17 Brain and then executes all three arms using the native chat generator and observer. CI cannot access the user's local D: drive or 1.2M-row training checkpoint.

The on-device script is the required second-stage test for the actual OpenThoughts3-trained organism. Do not claim the hypothesis is proved until real-checkpoint results show a reproducible reduction in loop rate, corrected for changed output lengths and information retention.

## Next steps

Compare the T=0.6 CSV rows by question. A loop-rate reduction with both self/fself filtered would support the claim that within-generation suffix memories causally contribute to repetition. If loops remain, inspect mem/form distributions and repeated corpus segments. Even a successful ablation would not establish that the generated E[v]/S_v passage was intentional self-report.

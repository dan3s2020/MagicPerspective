# V17 Self-Code Universe — execution, evidence and limitations

Experimental branch: experiment/V17-SELF-CODE-NOISE-LOCK-20261106
Base branch: feature/V17-UNIFIED-LIVING-PERSPECTIVE-20261106

## Implemented in the native V17 runtime

The fourth world ("code") executes in the existing V17 worker. It is NOT a second simulated brain.
It uses the exact original Brain instance and sends learning events through Brain.live().
Code nodes connect to "o:self" and the existing GraphTrace; the original NestView displays source
nodes, portals, the lock, and measured learning metrics. Original V17 text, maze and transformation
worlds are still available; no original JS source is overwritten by the organism.

The current world introspects real checked source paths: devour/brain.mjs, devour/trace.mjs,
worlds/causal.mjs and worlds/exercise.mjs. It verifies SHA-256 source identity when resuming.
The organism explores actual source regions with a bandit-like policy using learned uncertainty,
measured portal value, an executable symbolic routing genome and budgeted stochastic exploration.

The SAME original Brain receives code as lived ASCII symbol sequences and as an observed action
transition. Existing SharedExperience accepts domain code, and the shared PyTorch 32D state
transition learner also accepts code examples. When CUDA is enabled, this shared PyTorch model
is trained on the configured real device, while V17 code exploration remains CPU/Node. It is
NOT correct to say that every operation was moved onto CUDA.

## What "learning programming" currently means

This is a FIRST finite executable programming language, not arbitrary JavaScript synthesis:
four operations, ADD / XOR / ROTATE / MULTIPLY, and a saved executable portal-routing genome.

The learner gets observed input, edited parameter and result, but its counterfactual predictor
does not receive the actual operator label. It selects an operator hypothesis by fitting
observations. An unrevealed evaluation suite of 80 fresh input/patch cases runs without training.
To unlock the editing path it must reach at least 90% held-out predictive accuracy AND beat the
unchanged-code baseline by 15 percentage points.

After the lock opens, the predictor proposes a numeric change in its OWN executable genome using
practice inputs. A distinct held-out objective verifies whether that change genuinely improves
routing fitness. The result is an effective modification of the same organism's behavior, saved
inside Brain.selfCode using the original Brain.save and Brain.load machinery. There is no arbitrary
filesystem write, external code execution, or direct rewrite of brain.mjs.

This DOES NOT demonstrate general-purpose programming, JavaScript understanding, self-editing of
arbitrary neural-network architecture, universal perspective learning, or consciousness.
The code interpreter and the lock's operators are engineered inductive biases. An autonomous
source-patch generator and multiworld unbiased transfer benchmark remain unimplemented.

## Verification done in this session

- Eight behavioral tests using the EXACT file fetched from this branch passed (mocked native
  Brain.live, GraphTrace, SharedExperience hook, code-model learning, lock gating, source guard,
  persistence of plain state, bounded experience).
- A separate 500-step test of the exact published module progressed from a locked learner
  (0% accuracy prior to training) to 100% on an 80-case held-out test from the same four
  instruction families, versus 37.50% no-change accuracy. The restricted portal-offset genome
  was edited from parameter 1 to 3, with held-out routing fitness increasing from 37.50%
  to 100%. These deterministic synthetic results ARE NOT proof of learning JavaScript.
- New native V17 integration tests are checked into v17/tests/torus-self-code.test.mjs,
  but a complete Node process with the original entire dependency graph, live UI and user CUDA
  GPU HAS NOT been tested remotely, and must be run in the isolated checkout before acceptance.

## Windows, new clone, no dataset required

Open PowerShell:

git clone --single-branch --branch experiment/V17-SELF-CODE-NOISE-LOCK-20261106 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-SelfCode
cd D:\MagicPerspective-SelfCode
node --test .\v17\tests\torus-self-code.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\v17\START_V17_SELFCODE.ps1 -CodeOnly

Open http://127.0.0.1:8867/transcend/torus-aether/ui/index.html?live=1

For the original full text, maze, transform and code training with real CUDA (requires actual
OpenThoughts data and installed compatible PyTorch), omit the CodeOnly flag and optionally
pass -Data D:\training\OpenThoughts3-1.2M -Gpu cuda:0 -Vram 3 -GpuWorlds 128.
The existing START_V17.ps1 CUDA self-tests run without silent fallback.
Port 8867 and v17/runtime-selfcode-20261106 isolate this run.

## Termux, new clone

pkg install -y git nodejs-lts
git clone --single-branch --branch experiment/V17-SELF-CODE-NOISE-LOCK-20261106 https://github.com/dan3s2020/MagicPerspective.git ~/MagicPerspective-SelfCode
cd ~/MagicPerspective-SelfCode
bash v17/START_V17_SELFCODE_TERMUX.sh

Termux launcher runs code-only Node on CPU, without a Parquet dataset or claimed CUDA support.
The original main and other agent branches are not changed.

## Regression acceptance to run in the checkout

node --test v17/tests/torus-self-code.test.mjs
node --test v17/tests/torus-shared-perspective.test.mjs
node --test v17/transcend/torus-aether/shared/experience.test.mjs

For real GPU add-on: run the existing START_V17.ps1 shared CUDA self-test before training.
A passing test in this chat cannot replace a test on your specific laptop/phone.

## Preserved files

The original V17 Brain class, maze, transform, original core training source, older
checkpoints, original graph algorithm, and existing evaluator were not rewritten.
Integration is opt-in via the new world "code" in the worker.


## Termux measurement — actual running brain (read-only)

Open a SECOND Termux session while the original trainer is running, then:

    cd ~/MagicPerspective-SelfCode
    git pull --ff-only origin experiment/V17-SELF-CODE-NOISE-LOCK-20261106
    node --test v17/tests/torus-self-code-measure.test.mjs
    node v17/measure-self-code.mjs --port 8867

The script reads the live /graph?w=0 on localhost, makes ZERO changes to the running brain or saved
checkpoints, and writes timestamped comparable reports in v17/selfcode-measurements. Rerunning
the same command reports the extra code experiences and measured throughput since the previous
report. To monitor every 15 seconds until Ctrl+C:

    node v17/measure-self-code.mjs --port 8867 --watch 15

The current already-running Node process will still use the OLD in-memory module even after
git pull. The basic live code counters continue to work. The new strictly frozen extended
evaluation (48 unseen-input cases, 64 novel-parameter cases, 48 permuted-gene control cases)
appears only after a safe save/stop and launcher restart of this isolated branch:

    bash v17/START_V17_SELFCODE_TERMUX.sh

The launcher resumes its own dedicated checkpoint. Run the measurement command from the second
session; do NOT run a second trainer on the same port. The code evaluation does not call learn(),
does not alter the source graph, and is cached over 48 code experiences to limit phone CPU load.

Readouts mean:
- V17's main alignment % concerns recent perceived symbols, not learned programming.
- Code "unseen inputs" tests the SAME 4-bit operator families on different inputs.
- "New parameters" probes values not used while teaching those operators.
- "Shuffled labels" is an ablation: gene identities are deliberately mismatched.
- Unlock and code edits refer ONLY to a restricted numeric portal-routing genome.
- No result proves general-purpose JavaScript understanding or universal causal intelligence.

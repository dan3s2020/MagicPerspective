# Native V17 self-code world — integrated fourth training world

Branch: `feature/V17-NATIVE-SELF-CODE-PORTALS-20261106`

This is NOT the standalone demo. On this opt-in branch, the original V17 `devour/worker.mjs` instantiates `NativeSelfCodeWorld` on each enabled **existing V17 Brain**, and interleaves self-code experience with live maze and transformation training. The original V17 graph and dashboard server are preserved. Observed source-code state/action/state transitions now also enter the existing `SharedExperience` queue and the shared PyTorch model (the fourth domain), when a real PyTorch device is enabled. Existing three-domain PyTorch checkpoints migrate their per-domain counters without replacing weights. The fourth world is opted into using `--worlds maze,transform,selfcode` (also supports `text` when a corpus is provided).

## Native mechanisms

1. **The real code is observable territory:** the graph's code-world atlas comes from the exact on-disk V17 source `epistemic-text/engine.mjs`, `devour/brain.mjs`, `devour/worker.mjs`, `devour/trace.mjs`, not fixed demo coordinates. Source SHAs are checked; the existing live brain is never overwritten.
2. **One organism:** code observations and measured edits pass through the current V17 Brain's real `brain.live()`; selected code nodes and actual transitions are inserted in that Brain's `GraphTrace` for the existing NestView. The original byte learner is unchanged. There is an additional small policy/state for code actions alongside the brain, not a claim that the original text predictor has acquired programming semantics.
3. **Agent-chosen noise portals:** the action learner chooses between local source-order walking and costed jumps. Its Q values update using code novelty, prediction surprise and observed external probe outcomes. The source-node portal selector uses adaptive uncertainty/observed value. Budget replenishes gradually; no fixed number of portal jumps ends the world.
4. **Actual executable experiments:** a separate Node worker syntax-checks numeric-only copies of the verified original V17 text learner and measures source-edit effects on training and validation corpora. Probes continue while maze/transform learning runs. The live original engine never executes those candidate changes.
5. **Lock:** after 24/48/... practice probes the system is challenged on new held-out counterfactuals. Predictions are frozen before hidden scores are computed. It must beat no-change accuracy by at least 10 points and achieve at least 75% classification accuracy. Then a further separate final held-out positive improvement is required before a candidate may be **approved in a sandbox copy only**. The gate is not an intelligence test and does not unlock arbitrary JavaScript editing.
6. **Pause/save/resume:** code selection, probed causal effects, visited nodes and costs persist next to each existing V17 checkpoint at `<brain>.selfcode.json` (version 1, source-pinned). Save/pause/reset handlers also cover the new world. The original `.v8` model and `.shared.pt` remain on their original paths. Pending external evaluation feedback is buffered on pause; paused V17 brain weights do not change from self-code feedback.
7. **Real measurements:** `/graphs`, `/graph?w=0`, `/state` include a `selfcode` status showing ticks, learned policy, source-file count, portals, trials, prediction-lock status and last error. The existing live NestView draws code nodes/edges. Source edits never get silently promoted into the native running engine.

## Termux: real continuous multiworld training

```sh
pkg install -y git nodejs python
cd ~/MagicPerspective-NativeSelfCode
bash scripts/run-v17-native-selfcode-termux.sh
```

The script runs the original V17 server and its one shared Brain on maze + transforms + self-code indefinitely, on CPU (no Torch needed). It defaults to **port 8092** and a new `v17/runtime-native-selfcode-termux` checkpoint directory. Open `http://127.0.0.1:8092/` in Android Chrome. Set `MP_PORT=8093` if 8092 is in use and `MP_MEM_GB=0.8` if Termux has low RAM. Ctrl+C requests graceful save; use the original UI Start/Pause/Save/Reset controls.

To train text concurrently, use `--worlds text,maze,transform,selfcode --text <your-ASCII-corpus>`. A finite text corpus ends when exhausted, while the default maze/transform/self-code mode runs continuously. The provided launch script deliberately uses the latter for an indefinite run on a phone.

## Run tests

```sh
node --test v17/transcend/torus-aether/devour/selfcode-native.test.mjs
node --test v17/transcend/torus-aether/devour/selfcode-evaluator.test.mjs
node --test experimental/self-world/code-world.test.mjs
```

New component tests and pre-existing Self-Code World tests passed locally (14/14 in one environment). Native full V17/Termux end-to-end acceptance is **not yet independently verified on the user's phone**. The full original Windows V17 CUDA runner has not been modified, and this Termux script specifically uses CPU.

## Non-claims and remaining work

- Actual automatic edits are restricted to approved **sandbox copies of numeric source slots** of the V17 text engine. No arbitrary self-rewriting of the live `Brain`/worker is claimed.
- The V17 code-world action Q policy is an auxiliary learned policy tied to real Brain observations; it has not demonstrated autonomous high-level programming or discovered code semantics.
- Original V17 text-model accuracy/maze success may change when new source-code observations are included. Must run frozen held-out native cross-world comparisons before making performance claims.
- This branch has not been merged into `main`, the original `v17-torus-aether`, or another agent's branch. Existing user installations are left untouched.


# Brain Studio — MagicPerspective
A single, training-first, mobile-responsive cockpit for real saved brains.

## Launch in Termux (no overwrite of existing model files)
```bash
pkg update -y
pkg install -y git nodejs
cd ~/MagicPerspective
git switch main
git pull --ff-only origin main
bash experiments/brain-studio-20261103/run-termux.sh
```
Open **http://127.0.0.1:3044**. All original V1–V7 and Graph Dance interfaces are unchanged; their existing ports still work.

## Saved brains
The list locates existing saved V6/V7, Graph Dance, Dynamic Perspective, Causal Text and Studio checkpoints. It also lists recognized older archive files. Compatible checkpoints are **restored as independent COPIES** in the Studio process, never edited in their original directories. Unsupported older schemas are listed as read-only archived objects and cannot be silently converted to incompatible trainable weights. Use SAVE to create an individually named snapshot in `data/brains/`, or EXPORT JSON. The active working checkpoint is `data/active.json`. Import only trusted JSON; no arbitrary paths are accepted.

**NOTE:** One common brain across all domains is available as **Universal**. Native V6/V7/Graph/Dynamic/Causal models are **not** one interchangeable parameter tensor: each keeps its own actual architecture and learns in its supported world. The Universal learner has one 16→24→1 MLP shared by grid navigation, abstract networks, and fixed-grammar symbolic tasks. The learner receives locally observed actions, neighbors, destinations, and goal positions, not evaluator oracle routes. It learns from discounted *realized* goal success. It is NOT a language model, a general-purpose math solver, or evidence that true positive transfer has occurred.

## Full training, live visualization and measured progress
- START ∞ continues until PAUSE or STOP; finite limits can be selected as well. Each actual episode generates a trace; the server sends sampled frames for replay. Training continues while the phone browser is closed as long as the Termux process is alive.
- Graphs separate evaluator-only truth and the learner's known or physically traversed links. UI displays the actual last action, hidden neural activations where available, sampled learned parameter connections, a function slice evaluated from the current weights, observed loss, weight drift, episode latency, episodes/second, success, and independent matched-seed control comparisons.
- Saving is atomic; autosave happens every 2–100 real episodes. An Android OS kill may lose episodes completed since the last save, not the checkpoint existing before training. Backup/restore is supported by manual named checkpoints.
- Blind evaluation uses fresh seeds and a fresh untrained baseline of the same architecture. Some native model types have domain-specific metrics or copied adaptation, not perfectly equivalent counterfactual trials. A 100% score in a finite world family is not universal intelligence.
- Native training beyond the original checkpoint does not mutate the original source file. Every selected model receives a separate working copy and can be saved as a new named artifact.

## Research validity
The shared learner uses the same weights and observation API in three domains; that establishes parameter reuse **by construction**, not positive transfer. To test transfer, compare `train on two domains → held-out third` against `train on third alone` and `untrained`, on fixed blind seeds. If the transfer result is not better, treat it as a negative result.

Run `npm test` inside this folder. No GPU is assumed. The default node runtime is Node.js 22+, which Termux supports. Default binds to localhost on 3044.

## Limitations
The current function chart plots a one-dimensional section through the parameterized function. Animated neuron layers sample weights rather than exposing every network connection; labels distinguish inferred activity from actual hidden activations. Legacy incompatible formats cannot be continued without their own adapter; import never fabricates a conversion. Persistence and performance are bounded by Android RAM, battery, storage, and OS scheduling.

## Unified real abstract graph — 3 November 2026

The FIRST section of Brain Studio is the **executed state-transition graph**, not an unrelated illustrative graph. The same `magic.abstract.graph.v1` envelope is used for all three problem domains:

| Domain | State node | Transformation edge | Evaluator solution |
| --- | --- | --- | --- |
| Maze | coordinate/cell | physically open adjacent cell | shortest traversable route on hidden maze |
| Abstract Network | graph vertex | actual open link with cost | graph shortest route |
| Text/symbolic | pair (red, blue) of 0–6 | one of amber/violet/cobalt operations | bounded shortest sequence of operations |

Every trace frame contains:
- `graph.observedNodes` and `graph.observedEdges`: measured by the learner's own local observations/actions, not copied from the evaluator graph.
- `graph.candidates`: actual ranked neural scores `Q(s,a)` calculated **before** the corresponding action. Unknown symbolic destinations stay `null` until observed; no fake next-state prediction is invented.
- `graph.predictedNext` and `graph.predictedPath`: the model's highest-ranked immediate transition and an explicit BFS composition **only over links already observed**. The `planSource` field makes this distinction visible.
- `graph.actual`: executed action and measured destination, with a comparison to the prediction if it was known.
- `meta.abstract.solution`: computed by an evaluator **after** model execution. It is displayed on a second graph and never enters model features, action selection, or gradients.

For Causal Text, the prior three fixed actions have been replaced by the model's `predictedPlan`: the simulator executes **exactly** that predicted sequence, if one exists. The evaluator has an independent shortest plan. Its restricted natural-language goal parser is still fixed, not a trained language model.

Brain Studio replays sequential complete traces from `GET /api/traces?after=<sequence>`, with a bounded server ring buffer. The phone can select every frame, freeze playback, and inspect the actual Q rankings, solution, neural activations and outcome. If training outruns the device's ability to display it, the UI reports how many traces were skipped rather than fabricating live frames. The server may finish episodes between polls: this is replay of recently **completed real episodes** during continued training, not a synchronized video of the still-executing step.

`POST /api/probe` performs a real **no-training inspection on a copy** of the selected model. The native Dynamic Perspective adapter requires its copied training episode to produce a trace; it is labelled `inspecție cu adaptare pe COPIE`, and the selected checkpoint remains frozen. The initial Dynamic Perspective oracle route is labelled **initial only**, since its network may evolve afterward.

These visual changes never rewrite original V6/V7/Graph/Dynamic/Causal checkpoint files. Run `node --test tests/*.test.mjs` inside this studio directory, then verify a maze, network and symbolic graph in the first panel. Real graph display is not proof of positive cross-domain transfer; use the separate held-out evaluation and transfer benchmark.

## Graph Cells: the abstract network actually COMPUTES each action (3 Nov 2026)

The original universal model used a detached fixed-size MLP with a graph used primarily to display the environment. That model and its checkpoints are **preserved** and selectable as `Universal (legacy MLP)`. For a fresh Brain Studio installation, the default is now **Graph Cells**, a separate, differentiable shared graph model.

- The network's cells are **currently observed or explicitly referenced states** (plus the known goal), and the computation edges come **only** from the agent's sensed/traversed transitions. Unknown hidden walls/connections are **not included**.
- Each observed state becomes a cell with nine locally constructible features. Each cell has **eight real-valued channels**. All cells run three rounds of parallel message passing over the same observed state network. Shared trainable weights control the channel update and the numerical message passed along each edge.
- Candidate actions read the current and known destination cells' activations, with a learned action bias and measured cost/revisit features. **These actual scores choose the environment action.** For symbolic actions with unknown next states, the destination stays `unknown`; no hidden transition is fabricated to boost a score.
- The simulator then executes that action. Actual reward (observed progress, encountered cost, revisits and goal arrival) becomes a discounted target. Analytic gradients are propagated back **through the exact stored message-passing computation**. Adam updates the shared cellular weights.
- Per action frame: see every participating cell's features, every round's 8 activations/inbox, each directed numeric message, the action's contribution votes, its pre-execution Q, the actual state reached, prediction mismatch, reward, loss, cell gradient and true weight delta. Tap a node on the SAME main graph or select it by ID, and choose calculation round 0/1/2/3. Animated message edges correspond to measured numerical messages, not random decoration.
- **The same exact set of weights and cell dynamics** is used in maze, abstract-network and restricted numeric/symbolic environments. The graph changes per observation; the shared update rules do not. You can run unbounded training with all three domains selected and save/resume/import named Graph Cells brains.
- All action frames are retained for the displayed Graph Cells episode. The server keeps a bounded recent trace buffer so it does not exhaust Android RAM. If a phone cannot render episodes as fast as Termux trains, the display reports dropped episodes. The engine itself continues training.
- This does **not** convert previously trained V6/V7/Graph Dance/MLP checkpoints into the new graph-cell architecture. Their original networks remain selectable and functional in their own mode. To see full cell-to-cell action control and learning, choose **New brain → Graph Cells**. Brain Studio automatically preserves the old active brain first.

A full mathematical gradient audit uses finite differences against the same graph and confirms the analytic derivatives for encoder, message-passing, readout and action weights. `node --test tests/cells.test.mjs` checks these along with 3-domain action execution, read-only inspection, genuine per-cell training traces and checkpoint recovery. `node scripts-cells-benchmark.mjs 45 5` compares identical Graph Cells networks trained on all three versus just one domain and a same-architecture untrained baseline on disjoint blind seeds.

**Limits:** A working state graph does not yet imply a language model, a novel discovered law grammar or positive transfer. Text here means the current restricted symbolic number transformations. Three rounds limit how far a cell's information can travel in one decision; future work can test more rounds, adaptive topology and new environments. Measured wins/losses must come from benchmark outputs rather than animation.

## Windows NVIDIA CUDA parallel training — 3 November 2026

This is an **additional backend in the existing Brain Studio UI**, not a replacement interface and not a CUDA label on a CPU Node.js loop.

### Start in Windows PowerShell

Clone the public repository to `$env:USERPROFILE\Downloads\MagicPerspective` if it is not already available, `git pull --ff-only origin main` and run:

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\MagicPerspective\START_MAGIC_CUDA.ps1"
```

The PowerShell script creates an isolated `.venv_graph_cuda` with Python 3.10–3.12, installs official Windows PyTorch CUDA 12.6 wheels (unless a working CUDA PyTorch is already present), **asserts `torch.cuda.is_available()`**, runs real tensor/gradient self-tests on CUDA and launches the original local Brain Studio at **http://127.0.0.1:3044**. Node.js 22+, Python 3.12, Git and an up-to-date NVIDIA driver must already be installed. No global Python or Node changes are made.

### The GPU slider and brain synchronization

Create/select a **Graph Cells** brain. In the new CUDA card immediately below the same abstract graph, select a parallel world count **1–512 (64 default)** and click **START CUDA ∞**. The CUDA worker starts independent *batched parallel worlds*, each with its own goal/observations/hidden topology/current node and physical action, all represented and updated in PyTorch GPU tensors. A single shared Graph Cells model with the exact JS 8-channel/3-round parameter tensor controls the whole batch. Gradients from actual actions update this shared model on CUDA. The CUDA slider may be moved **while running**, applied at the next GPU batch. Select a specific batch-world index to inspect its observed state graph and genuine executed actions on the original graph viewer.

GPU metrics report **effective** (not merely requested) worlds, true time-normalized worlds/second, used PyTorch GPU VRAM and total VRAM, CUDA version, GPU name, batch loss and actual solved/total outcomes per domain. On CUDA memory exhaustion the batch size is visibly halved for the next attempt; the worker does not silently move to CPU.

**PAUZĂ CUDA + SINCRONIZEAZĂ** finishes the active GPU batch and atomically stores the GPU checkpoint in `experiments/brain-studio-20261103/cuda/data/cuda-live.json`. The Node server first saves the selected original Graph Cells checkpoint into its named library, then imports the new CUDA-trained Graph Cells weights and optimizer moments into the original studio model. Previously trained **V1–V7, Graph Dance and earlier MLP** checkpoints are never rewritten. `REIA CHECKPOINT CUDA` resumes this isolated CUDA state. `RECUPEREAZĂ CHECKPOINT GPU` explicitly imports a prior GPU checkpoint after an interrupted Windows session. CUDA import refuses to replace a newer active brain with fewer episodes.

### Research and hardware limits

- The GPU batched maze/network/text world generators have common graph semantics, but **they are GPU-native new generators, not identical to the JavaScript worlds**. In particular, GPU maze worlds are 9×9 random-obstacle graphs with guaranteed corridors; GPU network worlds are 81-node random graphs; GPU symbolic worlds are finite two-register modular transformations. There is no free-form natural-language training or demonstrated general intelligence.
- The same weight *names, shapes, message-passing equations and action readout* are shared. Because GPU and JS worlds have some different observation feature encodings and action orderings, a GPU-trained model's transfer back to JS must be evaluated independently. The original JS blind tests remain available.
- The CUDA trace records **executed GPU action steps, pre-action logits and cell activations/messages** of one selected world from a recent GPU batch. The display is a true replay from completed GPU batches, not synchronized video of in-flight kernels. Per-cell CUDA gradients are not exported; only the aggregate gradient and model weight changes are reported; use JS Graph Cells for full per-cell gradient attribution. This is explicitly labelled, never fabricated.
- RTX 3050 Ti 4 GB VRAM: start with 32–64 worlds, then use the slider to test larger batches. Processing 512 worlds in a single batch is *allowed but not guaranteed to fit*; the worker will report any VRAM-driven downgrade. High GPU utilization is not guaranteed by a small graph neural network; report measured performance, not manufactured percentages.
- GPU checkpoints and the CUDA virtual environment are **gitignored**. A CUDA failure never overwrites the last atomically saved GPU checkpoint. If Windows crashes, worlds processed since the last autosave may be lost.
- Only **one** CUDA worker may own the local GPU service port 3045. Node serves the existing UI on port 3044. The PowerShell launcher uses localhost on both, so neither exposes an unauthenticated training endpoint on Wi-Fi or the internet.
- This backend is not available on Android Termux; Termux retains the original Node.js Graph Cells training unchanged.

Run the CPU-only compatibility test on any CI machine with PyTorch installed:
`python experiments/brain-studio-20261103/cuda/cuda_worker.py --self-test --cpu-test`.
This is *test-only*; the live CUDA server will not start on CPU.

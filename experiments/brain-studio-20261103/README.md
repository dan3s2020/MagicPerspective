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

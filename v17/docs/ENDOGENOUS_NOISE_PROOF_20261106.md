# MagicPerspective V17 — noise belongs to the organism, not the operator

**Isolated branch:** `experiment/V17-ENDOGENOUS-NOISE-AGENCY-20261106`, based on our earlier `experiment/V17-UNIFIED-TRANSFER-MEMORY-20261106`. Does not overwrite main, any other agent branch, the Windows `D:\MagicPerspective` folder or existing Termux checkpoints.

## Real mechanism now implemented

The existing live V17 `Brain` contains a serializable **NoiseAgency** object. It chooses its own interventions **before** perceiving the outcome. For each domain and locally observable condition (does it recognize its body? does it currently have a candidate plan?), its policy stores how useful each intervention has been on previously lived steps. The contextual upper-confidence-bound selection mechanism sometimes explores under-tested alternatives, otherwise exploiting observed rewards.

The agent selects among **zero noise** and positive-strength *perception*, *imagination*, or *action* noise. It decides both location and amount. There is **no hard-coded global percentage** telling it how often to use randomness.

- **Text (Termux/CPU):** perturb a copy of the chain's history, or change the internal imagination/temperature used during next-character learning. Score is whether the predicted symbol was actually observed. This is a **character-prediction signal**, not evidence of text understanding.
- **Labyrinth (Termux/CPU):** perturb its internal sensory copy; stochastically explore alternative candidate routes inside its learned attraction field; or choose a different action. Score comes from the resulting observed board changes, novelty and successful termination, without BFS distances, teacher routes or world physics in the policy.
- **Causal transformation (Termux/CPU):** independently perturb perception, select an alternative from learned movement actions, or try another output. The original causal model is trained from the real result; the policy receives the actual effect on the board and whether the task ended.
- **Shared PyTorch head (Windows CUDA / explicit PyTorch CPU):** the very **same JavaScript-owned policy** also chooses zero/perception/action/imagined-latent perturbation per real training batch. Its chosen site and strength are transmitted to `shared_perspective.py`. The model reports frozen *pre/post training-set prediction loss*, and the agency scores the measured improvement. The previous fixed adaptive-noise schedule is bypassed when an organism decision is present. This feedback is not a held-out or causal guarantee.

The agency's policy and random state are saved as part of the original `.v8` brain and restored. The shared model weights and its optimizer continue in the separate original `.shared.pt` sidecar. Existing manual sliders remain for backward compatibility, but **they are not the autonomous policy**. To isolate agency effects, leave manual `pnoise=0`, `ltemp=0`.

**GPU caveat:** large GPU maze/transform batches still use the original `worlds_gpu.py` action implementation. The JavaScript agency currently affects CPU maze/transform interventions and the actual shared PyTorch training batches; it is **not yet connected to every individual action in GPU-parallel maze kernels**. Don't describe GPU parallel world actions as fully autonomous-noise-controlled.

## Install a SEPARATE Termux checkout without touching the one at port 8866

Run in the Android Termux app:

```sh
pkg update -y
pkg install -y git nodejs
git clone --single-branch --branch experiment/V17-ENDOGENOUS-NOISE-AGENCY-20261106 \
  https://github.com/dan3s2020/MagicPerspective.git \
  "$HOME/MagicPerspective-NoiseAgency"
cd "$HOME/MagicPerspective-NoiseAgency"
sh v17/RUN_TERMUX_V17.sh --sample --port 8877 --maze-every 500
```

Open **http://127.0.0.1:8877/** in the same phone's browser. Scroll to **Zgomotul ales de organism**. The panel reports real total decisions, zero-noise vs perception/imagination/action choices, strength, local reward and recent context-dependent preferences.

The `--sample` input is the repository documentation, not OpenThoughts. For real Q/A text on your phone, replace `--sample` with `--text "$HOME/storage/downloads/octopus-text.txt"` if it exists. Ctrl+C once saves the original brain. Restarting the same command resumes the same policy (unless `--fresh` archives it first).

## What counts as proof and what does not

Run a paired ablation from the **same initial V17 brain, same maze/transform train episode seeds**, with the autonomous policy ON in one copy and OFF in the other. Both are then scored using the original brain's frozen, unseen-world tests; the evaluation does not train the noise policy.

```sh
node v17/scripts/audit-endogenous-noise.mjs --train-mazes 12 --train-transforms 3 --test 8 --seeds 3 > noise-evidence.json
cat noise-evidence.json
```

Inspect `summary.mazeSuccessDifference`, `mazeFirstShapeDifference`, `transformSuccessDifference`, `paired[*].endogenousNoise.bySite`, and now the separate `brainWithAgencyAtInference` arm. The latter executes a **copy** of the organism's own noise policy during unseen task inference with its policy frozen (no reward updates). A positive score would be preliminary evidence that noise helped **that** test. A zero/negative score is a legitimate failure or null result. Repeat with larger numbers and held-out conditions before inferring generalization.

### Actual initial eight-seed outcome (GitHub Actions run 42162732579)

The training-noise comparison (agency noise enabled during training, then frozen inference without added noise) scored:
- 96 held-out maze tasks: no-noise **95/96** solved; fixed random **96/96**; organism-controlled **96/96**. All three reached very high performance; no advantage over fixed random was demonstrated.
- The frozen first-path-shape metric reached **100%** for the agency and no-noise arms. This cannot distinguish improved planning here.
- 64 held-out causal-transformation tasks: no-noise **31/64**, fixed random **31/64**, organism-controlled **32/64**. One task difference across 64 examples is not reliable evidence of superiority.
- The policy's realized noise frequency varied by seed from **34.8% to 87.5%**, proving the choice is not simply one global fixed probability.

A further run **42163227964** also tested the **frozen organism policy actively choosing noise during evaluation**: maze solved **96/96**; causal transformation solved **29/64**. That is **worse** than the same trained agency brain tested with policy actions disabled (**32/64**). Its policy undeniably executes at inference, but this is evidence that the current local rewards/credit assignment are *not yet sufficient* for goal-optimal use of noise. Nothing about these outcomes establishes improved generalization or universal transfer.

The automated tests additionally prove: choices vary with observed feedback; zero is an actual selectable mode; real actions and perceptions change; the actual V17 maze/transform/text loops update the *same* noise policy; checkpoints restore its exact RNG and counts; and frozen evaluation does not alter the policy. PyTorch tests compare explicit zero-noise selection against unperturbed gradients and verify that perception/action/imagined-latent choices alter gradients.

### Necessary work NOT yet demonstrated

- The organism does not invent entirely new intervention types beyond the implemented choices.
- It does not yet prove that noise enables novel higher-dimensional perspectives, or that latent next-state prediction generates a successful goal-conditioned multi-step plan.
- The PyTorch head is not trained on Android via the native CPU-only Termux launcher.
- Full end-to-end **perspective → internal shape → act → measure → text transfer** superiority over strong target-only baselines remains unverified.

These are explicit acceptance conditions; a green CI run alone is not a claim of general intelligence.

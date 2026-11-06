# CUDA training coverage — MagicPerspective V17

Branch: \`experiment/CUDA-TRAINING-CORE-20261106\`
Parent: \`experiment/V17-CAUSAL-LANGUAGE-ACTIONS-20261106\`

This is an **incremental tested CUDA migration**, not a false "everything CUDA" label. The original V17 source and checkpoints remain intact. The new \`cuda_unified.py\` wraps the original V17 GPU server and runs auxiliary gradient training in the SAME PyTorch CUDA process (important for a 4 GB GPU). The JSON protocol, original V17 maze/text/transform CUDA commands and default CPU-only behavior are preserved.

## Actually trained with CUDA (when enabled)

- Original V17 text TextCard with PyTorch, indexed past and trust updates.
- Parallel V17 maze learning batches.
- Parallel V17 transformation world physics; action decisions and sparse update merges still use Node.
- New original 5D→8D→5D geometric learning on Torch tensors/autograd. Actual transition events from text, maze and transform; heldout samples update only evaluation, never parameters.
- New original 32D × 128 hashed prompt/answer latent goal-field online SGD on Torch tensors. Training rows only; heldout reference withheld during navigation.

These two new components now accept the existing checkpoints and return the same schemas. \`v17_worker.mjs\` queues observed transitions, invokes \`gpu_runner.geometry\` and \`gpu_runner.latent\`, then restores weights to the original JS objects for save/load and visualization. Actual backend/device info appears under \`gpu.auxLast\`, \`cudaAux\`, \`causalMode.goalFieldDevice\` and \`geometry.device\`. CUDA requests fail if Torch cannot confirm a CUDA device.

## Still on CPU — NOT YET MIGRATED

- Legacy V17 Brain: \`LeanC\`, \`EmergentChain\`, \`LivedField\`, historical \`GraphTrace\` learning.
- Sparse \`Discoverer\` and \`CausalOrganism\` rule/trust updates.
- Language \`CausalTextAgent\` action-effect maps and contextual value tables.
- \`TextActionPaths\` Unicode word-action counts, candidate ranking, and word appends.
- Dataset decode, JSON transport, environment simulation, UI/replay, checkpoints.

Thus no sustained 100% GPU utilization or an all-CUDA original brain is claimed. Full migration requires separate CUDA ports and parity tests for each remaining adaptive algorithm, not silently replacing them with unrelated neural networks.

## Windows 4 GB configuration

On a separate clone of this branch:

\`\`\`powershell
$dest = "D:\MagicPerspective-CUDA-Core"
git clone --branch experiment/CUDA-TRAINING-CORE-20261106 --single-branch https://github.com/dan3s2020/MagicPerspective.git $dest
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\isolated\noise-space\SETUP_CUDA_WINDOWS.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\isolated\noise-space\START_WINDOWS.ps1" -Port 8898
\`\`\`

Select real Parquet Q/A, enable CUDA, 2.6 GB VRAM as a starting limit and 4–8 Q/A per batch; measure \`nvidia-smi\`. 32 may be faster but can hit the original TextCard memory ceiling. Use the worker telemetry, not an arbitrary GPU percentage target.

## Verification

\`\`\`powershell
& "$dest\isolated\noise-space\.venv\Scripts\python.exe" -m unittest discover -s "$dest\isolated\noise-space" -p "test_cuda_aux_models.py" -v
node --test "$dest\isolated\noise-space\causal_text_world.test.mjs"
\`\`\`

CPU Torch mathematical tests cover training loss reduction, frozen heldout, numerical equivalence of original 32D SGD and input validation. The GPU-specific test must run on an NVIDIA machine. This environment has no NVIDIA CUDA device, so I cannot claim RTX throughput or completed CUDA acceptance.

No Parquet training rows or existing checkpoint files were modified in this Git branch.

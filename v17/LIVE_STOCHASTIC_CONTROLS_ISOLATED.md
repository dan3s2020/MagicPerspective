# MagicPerspective V17 — LIVE stochastic controls, isolated

Repository: dan3s2020/MagicPerspective
Original branch: v17-torus-aether at 210aef1cb924adae46ff0692cdff3e854807aaa6
Latest base GPU batch-progress commit 44e1553cef98bd227550ccda272a12c46bca2148 is also merged into the isolated branch, preserving batch progress, pauses and saves.
Experimental branch: fix/V17-LIVE-STOCHASTIC-CONTROLS-ISOLATED-20261105

## Isolation

Original MagicPerspective main and v17-torus-aether branches were NOT edited by this experiment.
Changes to existing V17 files exist ONLY in the experimental branch. Use a separate Git clone on Windows or Termux, with the launchers below. Never pull this branch into an existing checkout or reuse old checkpoint directories.

The original engine, GPU worlds, learning organisms, nested geometry, 5D viewer, Observatory, reset, save, replay and every native button remain in this branch. The changes make the already existing noise/temperature sliders control the actual live brain instead of just local browser training.

## Real slider behavior

- wtemp: temperature for LIVE free text generation, not training.
- ttemp: temperature for LIVE held-out stochastic sampling; T=0 deterministic.
- ltemp: real learning temperature in EmergentChain.play, forwarded to the brain.
- pnoise: corrupts sampled items in the organism's real historical perception, never the true label or unseen evaluator.
- gnoise: Geometry.neg, number of negative random examples in geometric learning.
- glr: Geometry.lr, learned torus movement rate.
- repel: Geometry.repel, separation of real learned coordinates.
- cthr: Geometry.thr, threshold used on the next actual concept regrouping.

Choose a live brain, then select Apply to selected brain (Aplică sliderele creierului selectat) or Apply to all (Aplică tuturor creierelor). Status reports the server/worker acknowledgement. Sliders are not falsely advertised as active before application.

The canonical deterministic top-1 accuracy is preserved. Separate stochastic sample accuracy, masked sample accuracy and prediction-vs-argmax disagreement are reported. Disagreement is NOT scientifically equivalent to hallucination. Changing a text learner's temperature does not automatically rewrite the independent causal/maze action policies.

Controls are kept per graph in runtime-live-controls-isolated/live-controls.json and inside saved brains. Free writing uses a real worker snapshot with independent seeded sampling and never trains on the generated text. Evaluation likewise restores the training RNG.

## Windows (NEW clone, not D:\OctopusTorus)

In PowerShell:

    cd D:\
    git clone --single-branch --branch fix/V17-LIVE-STOCHASTIC-CONTROLS-ISOLATED-20261105 https://github.com/dan3s2020/MagicPerspective.git MagicPerspective-V17-Stochastic
    cd D:\MagicPerspective-V17-Stochastic\v17
    git branch --show-current
    powershell -ExecutionPolicy Bypass -File .\START_V17_LIVE_CONTROLS_ISOLATED.ps1 -Workers 2 -Arms stable+many -Mem 3 -Worlds text,maze,transform

Requires the actual D:\training\OpenThoughts3-1.2M parquet dataset or pass -Text "D:\octopus-text.txt" with a real text corpus.

CUDA variant (creates Python/PyTorch in a NEW local, gitignored Python venv if needed; launcher runs the real CUDA world self-test; override the package index with -Cuda cu124, cu126 or cu128 if appropriate to your NVIDIA driver):

    powershell -ExecutionPolicy Bypass -File .\START_V17_LIVE_CONTROLS_ISOLATED.ps1 -Workers 2 -Arms stable+many -Mem 3 -Worlds text,maze,transform -Gpu cuda:0 -GpuWorlds 4096 -Vram 6 -GpuUtil 80

The original worker's GPU VRAM budget is shared across participating workers. 6 GB requested is not evidence that a 4 GB card has enough VRAM. 80% GPU utilization is a throttle target, not confirmed hardware occupancy. GPU training needs to be evaluated with actual hardware measurements.

The server starts paused unless -Start is passed. By default it resumes only this clone's isolated checkpoints; -Fresh explicitly requests starting a new training run with the old isolated brains archived.

## Termux (NEW independent clone)

    pkg update -y
    pkg install -y git nodejs
    termux-setup-storage
    cd "$HOME"
    git clone --single-branch --branch fix/V17-LIVE-STOCHASTIC-CONTROLS-ISOLATED-20261105 https://github.com/dan3s2020/MagicPerspective.git MagicPerspective-V17-Stochastic
    cd "$HOME/MagicPerspective-V17-Stochastic"
    bash v17/run-v17-live-controls-isolated.sh -Text "$HOME/storage/downloads/octopus-text.txt" -Workers 1 -Mem 0.5 -Worlds text,maze,transform

The text file must genuinely exist. Use -Data with an actual parquet dataset instead if present on the phone. CPU on Termux; no claim of NVIDIA CUDA availability on the phone.

## Local UI

http://127.0.0.1:8861/       = original complete native UI, plus real live slider wiring
http://127.0.0.1:8861/dashboard = original accuracy charts
http://127.0.0.1:8861/transcend/torus-aether/devour/observatory.html = Observatory and entire native UI

Port 8861 avoids the old V17 port 8841. Saves/profiles/logs stay in v17/runtime-live-controls-isolated/ inside the NEW clone and that directory is gitignored.

## Regression command

Run from the new clone's v17 directory:

    node --test tests/torus-live-stochastic-controls.test.mjs tests/torus-brain.test.mjs tests/torus-observatory.test.mjs
    node --test tests/torus-live-controls-http.test.mjs

Static code parsing and pure control/sampling function checks were performed before publication. Full Node tests, actual GPU runs, save/resume across a real long training, and Android UI rendering cannot be certified until exercised on the target machine.

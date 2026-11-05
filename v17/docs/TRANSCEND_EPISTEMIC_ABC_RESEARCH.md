# OCTOPUS TRANSCEND — EPISTEMIC A/B/C (EXPERIMENTAL, CPU REFERENCE)

**Branch:** experiment/TRANSCEND-EPISTEMIC-RSI-A-B-C-20261030
**Donor:** feature/OCTOPUS-TRANSCEND-CAPITAL-RECURSIVE-20261030
**Launcher:** RUN_TRANSCEND_EPISTEMIC_ABC.ps1
**UI:** http://127.0.0.1:8822/
**New checkpoint directory:** runtime-transcend-epistemic-abc-v1/
**Existing A/B launcher and runtime remain entirely separate:** port 8821 and runtime-transcend-capital-ab-v1/
**Existing A12/A13 NVIDIA CUDA:** untouched; C is **NOT CUDA**.

## Why a third world instead of rewriting A/B?

A/B's diagnostic problem is confounded by their output interfaces, information loss and goal credit. This branch adds a separately persisted C world fed the EXACT SAME private physical bit contacts and referee target as the original A/B runs. In the new world the learner must explore how to purchase information and independently test representations.

The native A11 canvas and the original CAPITAL A/B visualizer remain byte-identical. The new UI is a separate copy with its original A/B graph nodes, controls, historical replay, movement timeline and inspector, and an extra C observatory and RSI counterfactual panel.

## Actual C mechanisms

* Each sensor cell has its own action-value learner, one private bit, local tactile resistance, and private weight updates. Untrained outputs are not hardcoded equal to the answer.
* C Omega receives only messages that C physically purchases, so undiscovered and unpurchased sensor values are null. The observed root context can therefore be provably information-deficient.
* One global binary output is attempted. Only the root receives its own external correct/incorrect reward. For this binary exact-match task the root can infer the correct binary answer from its own action and that one reward bit. The hidden target is never sent to lower learners.
* An epsilon/UCB-like meta-controller experiments with two methods: adding a new paid sensor or investigating alternate representation programs. It updates strategy values on observed evidence, including delayed enabling credit for earlier probes.
* The representation grammar generates combinations from constants, subsets, parity/affine, AND, OR, and majority, with optional inversions. It does NOT start with the target XOR program. This is a **bounded hypothesis grammar**; it is not unrestricted invention of arbitrary mathematical operators.
* Candidate representations are fit on recorded root experiences and then compared on disjoint contexts. The program is inherited only after a minimum validation margin and minimum accuracy. No official task held-out masks are used during program selection.
* C stores discoveries, ablations of individual sensor terms, a strength/scope experiment, explicit cost transfers between two conserved accounts, and snapshotting of all weights, controller state, observed partial contexts and learned hypotheses.
* A paused researcher can request the counterfactual oracle. It freezes a complete copy of the learner, performs matched representation-on/off comparisons, component and pair ablations, task scope, alpha blending, and up to 200 additional **paired** training experiences. Results state what the evidence does not yet prove.

## Run on Windows PowerShell

From a **new checkout**, not the original running Capital A/B directory:

    $dir = Join-Path $env:USERPROFILE 'Desktop\Octopus-Transcend-Epistemic-ABC'
    if (Test-Path $dir) { throw "Refusing to overwrite existing project: $dir" }
    git clone --single-branch --branch experiment/TRANSCEND-EPISTEMIC-RSI-A-B-C-20261030 https://github.com/dan3s2020/OctopusV2.git $dir
    if ($LASTEXITCODE -ne 0) { throw "Clone failed" }
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dir\RUN_TRANSCEND_EPISTEMIC_ABC.ps1"

Node 20+ required. The new launcher executes original A/B tests and C tests before opening the UI. The launcher refuses to run if verification fails.

For a clean manual verification after checkout:

    node --test tests/recursive-capital.test.mjs tests/recursive-capital-checkpoint.test.mjs tests/recursive-capital-visualizer.test.mjs tests/epistemic-abc.test.mjs

Do not delete any runtime directories or switch the running original project in place. C's checkpoint is **not** compatible with the Capital A/B checkpoint; it starts a NEW A/B/C experiment at episode zero.

## Acceptance criteria and falsifiers

1. C independently improves on the unseen input-mask split and beats constant-output / removed-representation controls.
2. The same hidden target never appears as an input to an individual C sensor, body, or perspective.
3. A and B remain the exact baseline engines; their UI, source, and existing runtime are untouched.
4. All snapshots restore exact C neural/action values, economy, episode counters, meta-policy, prior hypotheses, and historical evidence, and reject corrupted generations.
5. Frozen held-out and oracle runs must not mutate weights, current episode, capital, or training RNG.
6. C must retain enough signal bandwidth and show independently validated discoveries; counterfactual reports must identify when a discovery does **not** improve.
7. An actual native NVIDIA trainer or unrestricted hierarchical GRU/RSI is not asserted without a separate implementation and hardware test.

## Scope boundaries — essential honesty

This is a **functional experimental research slice**, not the entire long-term Octopus architecture. The physical world is still a small fixed binary benchmark, not the original A4/A5 tentacle environment, V9 spatial identity field, universal 2D/3D concept world or full neural CUDA pipeline. Generic feature transforms are explored through a finite program family rather than independently invented primitive math. The meta-controller is deliberately bounded and its experimental evaluation procedure is engineered. The counterfactual oracle itself is not a trained general RSI model.

We have not established consciousness, open-ended self-improvement, comprehensive causal graph discovery, retained old-task capability across arbitrary task shifts, or native CUDA equivalence.

**DO NOT MERGE into main without reviewing the complete regression and multi-seed held-out test logs.**

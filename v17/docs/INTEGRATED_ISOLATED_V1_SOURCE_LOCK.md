# OCTOPUS INTEGRATED ISOLATED V1 — SOURCE / PURPOSE / NEXT STEPS

Created: 2026-10-05 20:34:48 EEST (UTC+03:00)
Repository: dan3s2020/OctopusV2
Isolated branch: OCTOPUS-JACKPOT-NODEGRAPH-TEXT-ISOLATED-V1-20261005

## Exact source

This isolated line was created directly from the exact commit:

`9959bc2f748c42bee984555469287f118f019748`

No branch name is treated as evidence of behavior. The source is identified by the commit and by the canonical blobs below.

### Canonical runtime / UI blobs copied unchanged

- native-same-dish/src/main_win32.cpp
  - 422037ebf174ec278bd12063125bf1ffb50bddf9
- native-same-dish/src/cuda_engine.cu
  - f9ced7c39315daaaccd05b21818fa25c52cc4bf8
- native-same-dish/include/octopus_cuda.hpp
  - f99a7b927c86542621cb2e433248f3bdd2c4f734
- native-same-dish/CMakeLists.txt
  - d676367b7a07d606112e393424018559fd94c433
- native-same-dish/BUILD_NATIVE_CUDA.cmd
  - e1dfdd91aca9db7c0b54e40c928860a576657641
- native-nodegraph-bridge.mjs
  - 0f9c992a9a0f0955d146ed1912f32906b429cf4c
- map-cells/text-world-trainer.js
  - cb3f084acf5b8e66114dafa06a606412f26bef21
- tools/text_dataset_bridge.py
  - 15d4bd68e26a56accb593c4a218b3972621d40ff
- map-cells/nodegraph/index.html
  - 8513c6991c74fe7eaec08eeaef05c47cc847c196
- map-cells/nodegraph/nodegraph.js
  - 0f9266a9377caf4787412760430b43c2e87e4bd2
- map-cells/nodegraph/nodegraph-schema.js
  - c8d9e3df5f6230bc2c034523ca95b25e6f0661b2
- map-cells/nodegraph/nodegraph.css
  - 67dc0808d57a833f51c7f51781bcc89eb1b4432b
- map-cells/nodegraph/nodegraph-adapters.js
  - 89b899dd070c68d5a8a125cff3df3aa50fff8bd9
- map-cells/nodegraph/nodegraph-module-registry.js
  - 778fdb8342a521b2d4a7dc08baae1f65bb82ad3c
- map-cells/nodegraph/modules/replay2d-module.js
  - 26fead27c553512a5af15dd03649bbc76acd2e4b
- map-cells/nodegraph/modules/metrics-module.js
  - 85c091b58148f41c1a19a9d84f78384db91f470c
- map-cells/nodegraph/text-telemetry-client.mjs
  - 98db324b7a92b155d03bfdcc4fabe39408651c78
- RUN_NATIVE_NODEGRAPH_FUSION.cmd
  - 747d6ebb7a27caa2a21edf76bd931e3967f4a897

## What this preserves

The isolated version preserves the integrated application as code, not as a reconstruction from branch names:

1. Native Windows / Dear ImGui Same-Dish desktop UI.
2. Existing 2D training / observatory surface.
3. Existing FreezeCurrentPolicy logic.
4. Existing A ONLY / B ONLY solo-evaluation logic.
5. Existing canonical map loading and CUDA simulation kernel.
6. Existing synchronized replay / all-simulations wall.
7. Browser NodeGraph attached to the native runtime.
8. Three persistent NodeGraph workflows:
   - WORKFLOW / SIGNAL FLOW
   - BRAIN / ORGANISM INTERNALS
   - TEXT TRAINER
9. Native desktop tabs:
   - SAME-DISH / 2D TRAINING
   - TEXT TRAINING
10. Independent Text World runtime with separate A/B state.
11. D:\training dataset feeder and text-training scheduler.

## Why this isolated version exists

The goal is to stop mixing audit-only results, experimental worker branches, and measured learning behavior.

This branch is an immutable working baseline for the integrated application. Core runtime/UI files listed above must not be changed while recovering and reproducing the known A-only/B-only result sequence.

Any later change must first demonstrate exactly which canonical file and logic block it changes.

## One intentional test-only correction

The source commit contains a stale blob expectation in:

`tests/native-nodegraph-fusion-contract.mjs`

The actual bridge at the source commit is:

`0f9c992a9a0f0955d146ed1912f32906b429cf4c`

but the old test still expected:

`890eaf9bda676f015b20a931ee4e9493395b6964`

The isolated branch updates only that expected test hash. Runtime code is not changed.

## Runtime truth / non-claims

The 2D CUDA Freeze control in this source snapshots the existing V4 policy/config state used by the native simulator. The source UI itself states that the 2D CUDA runtime does not expose a persistent learned Local Brain / Concept Flow / Atlas checkpoint.

The independent Text World learner is separate and does maintain trainable A/B Text World state.

Do not label a regression-test PASS as a learning-result PASS.

## Acceptance before behavioral changes

The baseline is considered structurally intact only if:

1. Canonical source-lock test passes.
2. Native/NodeGraph fusion contract passes.
3. NodeGraph live-signal contract passes.
4. Brain-tab contract passes.
5. Text-world graph contract passes.
6. Native text-dashboard contract passes.
7. Per-organism/per-cell text trace contract passes.
8. Text scheduler contract passes.
9. Text World runtime smoke test passes, including:
   - A brain step advances;
   - B brain step advances;
   - A Concept World step advances;
   - B Concept World step advances.
10. Native CUDA executable builds on the target Windows/NVIDIA machine.
11. Fusion bridge health endpoint comes up.
12. Native desktop launches.
13. Browser NodeGraph launches and receives native telemetry.

## What follows next

After this isolated baseline launches on the target machine:

1. Do not alter policy, reward, maps, freeze or solo-eval logic.
2. Run the same 2D training protocol used for the known good sequence.
3. Freeze the current state.
4. Run A ONLY on the selected frozen evaluation configuration.
5. Save exact A result, seed, maps, simulations, max actions and runtime state.
6. Run B ONLY from the same frozen state/configuration.
7. Save exact B result with the same provenance.
8. Store the run evidence in this isolated branch before any learning modification.
9. Only after the baseline evidence exists, integrate or repair further Text Training behavior.

## Change discipline

Forbidden without an explicit new version:
- editing native-same-dish/src/main_win32.cpp;
- editing native-same-dish/src/cuda_engine.cu;
- editing native-same-dish/include/octopus_cuda.hpp;
- editing the canonical NodeGraph UI files;
- changing 2D policy/reward/map/solo-eval behavior.

Allowed on this V1 baseline:
- provenance documentation;
- tests that verify the frozen blobs/semantics;
- launch wrappers that call the canonical build/launcher without changing their runtime logic;
- recording measured run evidence.


## Mandatory operational workspace authority

Before any local mutation or run, read and obey:

1. `README.md`
2. `DESKTOP_WORKSPACE_CONCURRENCY_LOCK.md`

For this isolated line the operational rules are mandatory:

- active worktrees live under `%USERPROFILE%\Desktop\Octopus-Workspaces`;
- do not create active Octopus worktrees under `D:\training` unless the user explicitly requests it;
- one writer = one worker = one worktree = one branch = one HEAD;
- create the workspace through `tools/New-OctopusWorkspace.ps1`;
- load the generated `run-env.ps1` before launching;
- use the leased `PORT`, `OCTOPUS_RUNTIME_DIR`, `OCTOPUS_CHECKPOINT_DIR`, and `OCTOPUS_LOG_DIR`;
- fail closed if ownership is ambiguous.

`D:\training` in this project is a dataset/training-data root, not the default Git workspace root.

The isolated launcher enforces these rules and refuses to run without a loaded Desktop workspace lease.

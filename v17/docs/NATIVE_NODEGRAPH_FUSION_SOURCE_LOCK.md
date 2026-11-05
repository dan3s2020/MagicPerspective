# OCTOPUS NODEGRAPH + NATIVE CUDA V4 FUSION SOURCE LOCK

Fusion branch: OCTOPUS-NODEGRAPH-NATIVE-CUDA-V4-FUSION-20261005

Native UI donor:
SAME-DISH-NATIVE-CUDA-GPU0-V4-OBSERVATORY-JACKPOT-FROZEN-20261005
commit 1cbe2c9cf6b19e5e199eee9a93533dc903fc1037

NodeGraph donor:
OCTOPUS-NODEGRAPH-COMFY-CARDS-V1-20261005
commit 666e59ec884786051fcfbf1a9a409591d984b1ab

Rules:
- native-same-dish/src/main_win32.cpp remains byte-for-byte identical to the frozen V4 donor;
- NodeGraph UI files remain byte-for-byte identical to the NodeGraph donor;
- fusion telemetry is emitted from cuda_engine.cu only;
- telemetry failure is fail-open and must never affect the CUDA simulation or native UI;
- NodeGraph consumes native snapshots through native-nodegraph-bridge.mjs;
- movement telemetry is inferred only from observed position deltas; requested/rejected actions are not invented.

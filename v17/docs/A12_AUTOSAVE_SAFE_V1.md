# A12 AUTOSAVE SAFE V1

This branch is a non-destructive development branch based on `feature/A12-ORIGINAL-EXACT-COUNT-20261028`.

Goal: separate immutable checkpoints with SHA-256 verification, automatic recovery and an independently durable batch-success journal; preserve original NVIDIA kernels and A11 NodeGraph. Do not overwrite the original Octopus-A12-ORIGINAL-EXACT checkpoints, including the corrupt Oct 29 files.

Autosave must be opt-in per launch and use its own root, with fail-closed startup if the root contains incompatible checkpoints.

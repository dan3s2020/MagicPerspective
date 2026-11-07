# V17 CUDA port invariants

The purpose of CUDA work in this repository is to move the existing V17
computation, not to replace or reinterpret it.

The CPU implementation is the semantic oracle. A CUDA change is accepted only
when all applicable checks below are exact:

- identical source rows, symbols, and observation order;
- identical pre-update predictions and chosen actions;
- identical right/tried/hit/seen counters;
- identical graph state keys, edges, insertion order, and limits;
- identical tie breaking and first-seen behavior;
- identical maze, transformation, language, and xD update order;
- identical save/resume continuation state;
- no FP16, TF32, approximation, replacement embedding, Transformer, or LLM;
- no stale-batch overlap across a learning dependency;
- no CPU fallback when CUDA was explicitly requested.

Permitted changes are execution placement, batching that proves the invariants,
preallocation, removal of redundant transfers/synchronizations, and scheduling
that does not reorder learning.

Required gates for native text CUDA changes:

1. `tests/test_v17_full_atlas_cuda_hang.py` — original CPU behavior.
2. `tests/text_gpu_cuda_residency_test.py` — NumPy oracle and pre-change Git
   implementation versus the real NVIDIA device, including ordered output.
3. `tests/text_index_cuda_selftest.py cuda:0` — launch-blocking real-device
   check. Training must not start if this fails.

Performance numbers are reported only after semantic parity passes. A faster
result with different learned state is a regression, not an optimization.

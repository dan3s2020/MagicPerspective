# 2026-11-09 — Exact USER GPU execution directive

Original source below preserves user-provided spelling, casing, spacing and punctuation. Not a scientific performance claim; no agent may substitute a `gpu-util=100` setting as the meaning of this request.

```text
NU AM CERUT SA CONFIGUREZI SETAREA LA 100% GPU,AM CERUT SA FACI PROCESELE ASTFEL INCAT GPU SA FIE INTRUNA UTILIZAT,SA FACA TRAININGUL NONSTOP ,CPU SE MAI OCUPA SA PRIMEASCA REZULTATELE SI CAM CE MAI TREBUIE PENTRU AFISARE UI SI ATAT,DAR PENTRU GPU TU TREBUIE SA MODELEZI PROCESUL ASTFEL INCAT EL SA AIBA INTR-UNA DE MUNCA SI SA FIE TOTUL REPEDE!!
```

## Engineering interpretation (NOT a substitute for the quote)

Goal: real sustained original-organism GPU training with CPU as lightweight coordination, I/O and UI, minimizing CPU-bound computation and starving gaps while preserving the original V42 mechanisms. Changes introduced: bounded Parquet prefetch; eight-row initial CUDA batches with character cap; a two-phase staged CUDA dispatch; native source-order commit with invalid-stale-packet detection and replay after Qwen or other same-Brain learning; true nvidia-smi utilization sampling in the same native UI. Current limits: original dynamic JS `Brain.live()` and constrained Qwen physical path remain CPU work; GPU saturation is NOT verified by CI and cannot be asserted from a throttle setting or artificial busywork. CUDA real sustained utilization and end-to-end speed require an actual RTX 3050 Ti training run. Any full CUDA port requires preserving mathematical parity and tests; do not drop original mechanisms or silently simplify.

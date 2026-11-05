# Isolated Noise Space — exact user requirements and regression ledger (2026-11-06)

This file is an additive traceability note for the isolated branch, **not** the complete MagicPerspective Verbatim. Canonical historical source and gates remain under `VERBATIM_ROOT.md` and `verbatim/SOURCE_POLICY.md`. The full source gate is **BLOCKED** because the historical conversation/media are incomplete. Passing tests never changes that status.

## Exact user requests visible in this conversation

1. `hai,serios. ui si training complet,sa se vada tot din backend in ui,si reprezentat cum trebuie sa stim cand e bine sau rau si ce insemna fiecare de ce e bine sau rau si ce se intampla si de ce`
2. `ok,and fix every regresion you find in your way,because the repo is vast and the verbatim is too big for your context,so don't trip and let things fall out of hand`
3. `i just pressed infinite train again,and continued from there,but it has stuck at 56-60 .so something we must be doing wrong,we are not letting it grow`
4. `and maybe we just need to move all training on cuda,so we can have multiple paralel words per second`

These excerpts are verbatim as displayed in this conversation; they are **not** a certified export of the full native chat or its media.

## Tested code-to-evidence mapping

| Requirement | Code path | Acceptance | State / limitation |
|---|---|---|---|
| Original real V17 training on text, maze and transformation worlds | `isolated/noise-space/v17_worker.mjs` imports original `v17/.../devour/brain.mjs` | `v17_smoke.test.mjs`, `observatory.test.mjs`, `http_observatory.test.mjs` | TESTED on CPU runner; original source not overwritten |
| Actual pre-action predictions, decisions and outcomes visible | `v17_worker.mjs`, `observatory.html`, `interpret.mjs` | `observatory.test.mjs`, `http_observatory.test.mjs` | TESTED for CPU episodes; GPU batches have aggregate evidence and **one** representative recorded replay, not all hidden per-world decisions |
| No fake 5D coordinates for nodes without measured positions | `observatory.html` | JavaScript parse and real-graph smoke test | TESTED as presentation guard; 5D model is not a physical spacetime proof |
| Genuine text-only plateau diagnostics | `text_schedule.mjs`, `v17_worker.mjs`, `observatory.html` | `gpu_runner.test.mjs`, HTTP test | TESTED tracking corpus cycles, changing held-out windows, new-eval-only chart; actual predictive improvement NOT PROVEN |
| Correct per-world validation and speed counters | `v17_worker.mjs`, `observatory.html` | code + integration tests | TESTED data flow; performance must be measured on the user's device |
| Original parallel CUDA backend without silent CPU substitution | `gpu_runner.mjs`, original `v17/.../gpu/client.mjs` and `worlds_gpu.py` | `gpu_runner.test.mjs` (NumPy backend); Windows launcher parse | GPU PROTOCOL VERIFIED without NVIDIA; RTX CUDA execution and worlds/sec remain **UNVERIFIED** until real hardware selftest |
| Independent Windows CUDA installer on D: | `SETUP_CUDA_WINDOWS.ps1`, `START_WINDOWS.ps1` | Windows PowerShell parse CI | SCRIPT VERIFIED; PyTorch installation / device execution untested on remote CPU-only runner |
| Checkpoint and original source protection | `v17_worker.mjs`, `.gitignore`, launcher | `observatory.test.mjs`, CI session separation | Original V17 unmodified; one-time legacy checkpoint backup on first upgraded save |
| Continue growth from real novel datasets | Original `v17/.../data/text-dataset.mjs`, `v17_worker.mjs` | source scheduler tests | Parquet source supported; complete 14M unique exercises and universal performance are **NOT VERIFIED** |

## Non-regressions and unresolved research requirements

- Training stays on the single original V17 Brain; three worlds share it, but that does **not** demonstrate a shared higher-dimensional hidden trajectory.
- Original V17 CUDA text alignment, maze batches and transformation physics execute through the existing Python GPU client. The auxiliary 5D→8D→5D analytic-gradient learner still executes in JavaScript on CPU. “All training on CUDA” is **NOT IMPLEMENTED**.
- Real NVIDIA RTX 3050 Ti throughput, VRAM use, compatibility, and performance gains require the CUDA installer plus the original `worlds_gpu.py --selftest cuda:0` on the user's PC. Never show synthetic or NumPy performance as an NVIDIA measurement.
- Every fifth global episode is held out **only from auxiliary geometric SGD**, not from the original V17 Brain. The text frozen test has a separate 20% corpus or Parquet held-out partition. These have different evidential meaning.
- Main-branch Verbatim archival completeness stays BLOCKED. The isolated branch diverges from `main` and must not be merged wholesale without explicit reconciliation; no claims of complete historical fidelity.
- The existing V17 tokenizer collapses non-ASCII characters to `?`; this unresolved limitation is visible in the UI and must not be called fixed.
- The old finite document can repeat forever. The new corpus-cycle warning exposes repetition; it does **not** guarantee that adding more GPU compute improves accuracy.
- No original V17 file, historical experiment, or checkpoint is intentionally deleted or reset. Each isolated regression-test worker now has its own session folder to avoid cross-test checkpoint contamination.

## Required checks

```bash
node --test isolated/noise-space/test.mjs isolated/noise-space/v17_smoke.test.mjs isolated/noise-space/observatory.test.mjs isolated/noise-space/http_observatory.test.mjs isolated/noise-space/gpu_runner.test.mjs
node scripts/verbatim-strict-audit.mjs --json
```

The second command is a **diagnostic**, not a compliance approval. Never flip the original Verbatim release gates from BLOCKED on the basis of these tests.

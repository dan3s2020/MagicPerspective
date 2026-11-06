# Native V17 Nested Language Gears (2026-11-06)

## Scope / original architecture preserved
This is an opt-in **native fourth training mechanism inside the existing V17 text world**.
It is **not** a replacement for the text GPU, the original Brain, Discoverer.shape(),
NestView, the old chat generator, saved model weights, or the Self-Code World.

Files:
- `isolated/noise-space/nested_text_gears.mjs` — bounded learned operators and goal-directed graph search
- `isolated/noise-space/nested_text_gears.test.mjs` — held-out, ablation, no-evidence, checkpoint and frozen-cursor tests
- `v17/transcend/torus-aether/devour/worker.mjs` — shared V17 learning process; corpus → observations; sidecar save; /gear messages; graph edges
- `v17/transcend/torus-aether/devour/devour.mjs` — authenticated-by-localhost POST /gear proxy to the selected running worker
- `v17/transcend/torus-aether/ui/index.html` and `ui/app.js` — controls added to ORIGINAL live UI
- `scripts/TEST_V17_NESTED_GEARS_WINDOWS.ps1` — live HTTP integration acceptance on unseen nonce-generated words
- `scripts/START_V17_SELF_CODE_LIVE.ps1` — starts original CUDA V17, now checks nested tests

## Learning — factual boundaries
The learner observes real **training** sentences. When two observed sequences of the
same length differ at exactly one token, it records both directions of that
slot-change as a candidate transformation, with provenance/support. It does **not**
receive nouns/verbs/adjective labels and does not construct grammar rules by fiat.

Training is fed from **all** observed GPU text batch answers, independently of
the old causal text model's CPU sampling cadence, with a hard 6000-sentence cap.
For each observed before/after pair a bounded subset of causal transitions also
feeds the existing SharedExperience PyTorch queue. This shared head does **not**
currently control the nested planner, and there is **no** demonstrated CUDA
acceleration for the planning process itself.

During evaluation the user gives (a) a known starting sentence and (b) explicit
**slot constraints**, e.g. start `He is tired`; goal `0=She,2=calm`.
It is never given the whole target sentence `She is calm.` as a reference.
The learner searches its graph of observed transformations for a plan, then
revalidates the plan before every character emitted. No weight/operator update
occurs in this evaluation. The path's real observed transformations are attached
as nodes/edges to the ORIGINAL V17 trace for inspection.

**This is a meaningful limited step, not complete recursive open-domain cognition.**
There is no learned semantic parsing of free-form goals, no proof that arbitrary
nested problems can be solved, and the existing unrestricted chat remains the
original V17 text predictor until explicitly invoked through the new gear controls.

## Local test observations
Executed with Node 22.16 in an isolated environment before the Git upload:
- Four training examples, unseen `She is calm.`: PASS.
- 100/100 left-out two-content-slot cases: PASS.
- 400/400 left-out three-content-slot cases: PASS.
- Missing necessary transformation: correctly refuses to emit.
- Ablate a necessary operator group: correctly refuses to emit.
- Checkpoint export/restore, frozen inference, noise option: PASS.
- 8/8 Node unit tests PASS.

The original V17 CUDA full-run / GPU throughput is NOT tested in the assistant's
environment. JavaScript syntax and GitHub blob presence were checked after upload.
Do not call this a universal language comprehension benchmark.

## Live Windows run
In a clean checkout of `feature/V17-NATIVE-SELF-CODE-PORTALS-20261106`:

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\START_V17_SELF_CODE_LIVE.ps1 -Data "D:\training\OpenThoughts3-1.2M" -Port 8872
```

Browse http://127.0.0.1:8872/ and use **Angrenajul limbajului**
under the original trainer's controls. You can allow corpus learning to accumulate
or enter your own observed sentences and click **Învață observațiile**, then
**Rezolvă global → subprobleme → cursor**. The screen shows the ACTUAL observed
operators, global plan, and individual emitted character audit.

For a live server smoke test (intentionally adds four nonce-generated training
observations; it never submits the fifth target sentence):

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\TEST_V17_NESTED_GEARS_WINDOWS.ps1 -Port 8872 -Brain 0
```

All existing saves remain at the `-Out` path. The language sidecar `.causal.json`
is backward-compatible: old checkpoints with no `gears` property initialize an
empty learned gear and persist the new field after the next save.

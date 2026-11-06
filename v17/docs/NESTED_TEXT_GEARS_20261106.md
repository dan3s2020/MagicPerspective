# Native V17 Nested Language Gears (2026-11-06)

## Scope / original architecture preserved
This is an opt-in **native fourth training mechanism inside the existing V17 text world**.
It does not replace CUDA, the original Brain, Discoverer.shape(), NestView, saved model weights or Self-Code World. The learned controller **now participates directly in the original `Brain.chat()`**: it chooses a verified gear route when supported by observed training data, or falls back to the original unmodified AligningGraph writer when unsupported.

Files:
- `isolated/noise-space/nested_text_gears.mjs` — bounded learned operators and goal-directed graph search
- `isolated/noise-space/nested_text_gears.test.mjs` — held-out, ablation, no-evidence, checkpoint and frozen-cursor tests
- `isolated/noise-space/native_gear_drive.mjs` — learned prompt -> goal -> observed operator route -> verified cursor -> REAL `Brain.chat` answer
- `isolated/noise-space/native_gear_drive.test.mjs` — heldout chat-route, fallback, persistence and no-leak tests
- `isolated/noise-space/streaming_gear.test.mjs` — long-text and rolling-memory tests
- `v17/transcend/torus-aether/devour/brain.native-gear.test.mjs` — actual V17 `Brain.chat()` branch/fallback regression test
- `v17/transcend/torus-aether/devour/worker.mjs` — shared V17 learning process; corpus → observations; sidecar save; /gear messages; graph edges
- `v17/transcend/torus-aether/devour/devour.mjs` — authenticated-by-localhost POST /gear proxy to the selected running worker
- `v17/transcend/torus-aether/ui/index.html` and `ui/app.js` — controls added to ORIGINAL live UI
- `scripts/TEST_V17_NESTED_GEARS_WINDOWS.ps1` — original separate planner acceptance
- `scripts/test-v17-native-gear-chat.mjs` — NEW live acceptance through the ORIGINAL `/chat` endpoint, with genuinely unseen nonce-generated target and explicit trace provenance
- `scripts/START_V17_SELF_CODE_LIVE.ps1` — starts original CUDA V17, now checks nested tests

## Learning — factual boundaries
The learner observes real **training** sentences. When two observed sequences of the
same length differ at exactly one token, it records both directions of that
slot-change as a candidate transformation, with provenance/support. It does **not**
receive nouns/verbs/adjective labels and does not construct grammar rules by fiat.

Training is fed from **all** observed GPU text batch answers, independently of the old causal model's sampling cadence. The learner accepts a bounded set of contiguous n-gram windows from long training answers. Storage uses rolling slots for 6000 observed examples, capped signatures/operators and persistent version-2 operators, so it can continue receiving new examples without unbounded memory. This is not lossless retention of all historical data.
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

**This is a limited but genuine native integration, not complete recursive open-domain cognition.**
The worker learns prompt/answer word-position relationships from real observed Q/A rows and records the operator graph. The same brain's `Brain.chat()` automatically consults this controller for the last user prompt. If a learned goal-conditioned route is found and every cursor action verifies, those characters become the real chat output, the route becomes nodes/edges in the original GraphTrace, and `gear.used=true` is returned. Otherwise the old generator is used, and `gear.used=false` explicitly explains why. No reference answer is given to held-out planning. These semantics apply to a bounded class of token substitutions; natural-language semantic parsing, free-form recursive planning, and overall language understanding are NOT demonstrated.

## Local test observations
Executed with Node 22.16 in an isolated environment before the Git upload:
- Four training examples, unseen `She is calm.`: PASS.
- 100/100 left-out two-content-slot cases: PASS.
- 400/400 left-out three-content-slot cases: PASS.
- Missing necessary transformation: correctly refuses to emit.
- Ablate a necessary operator group: correctly refuses to emit.
- Checkpoint export/restore, frozen inference, noise option: PASS.
- 8/8 original NestedTextGears tests PASS (previous version). Locally, 5/5 native drive and 2/2 continuous-streaming tests passed against a reconstructed operator learner. The newly added exact Brain.chat regression and the complete repo test suite are required by the PowerShell startup script; full V17 CUDA integration is not yet confirmed on Windows.

The original V17 CUDA full-run / GPU throughput is NOT tested in the assistant's
environment. JavaScript syntax and GitHub blob presence were checked after upload.
Do not call this a universal language comprehension benchmark.

## Live Windows run
In a clean checkout of `feature/V17-NATIVE-SELF-CODE-PORTALS-20261106`:

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\START_V17_SELF_CODE_LIVE.ps1 -Data "D:\training\OpenThoughts3-1.2M" -Port 8872
```

Browse http://127.0.0.1:8872/. The original **Chat** now automatically uses the observed gear route when applicable and clearly labels the chosen generator. The **Angrenaj nativ V17** panel shows actual observed training, operator counts, native responses, and character actions. For additional paired training input, use `observed question => observed answer`. The older standalone manual goal-planner still exists as a diagnostic, not as the only route to the motor. You can allow corpus learning to accumulate
or enter your own observed sentences and click **Învață observațiile**, then
**Rezolvă global → subprobleme → cursor**. The screen shows the ACTUAL observed
operators, global plan, and individual emitted character audit.

For a live server smoke test (intentionally adds four nonce-generated training
observations; it never submits the fifth target sentence):

```powershell
& node .\scripts\test-v17-native-gear-chat.mjs 8872 0
```

All existing saves remain at the `-Out` path. The `.causal.json` sidecar remains outer version 1 and now contains `gears` (inner v1 or v2) plus `nativeGears` (v1). Older sidecars without them load into empty learned controllers; subsequent saves add the new optional fields. The original `Brain` V8 checkpoint format is unchanged because the new driver is connected via a runtime WeakMap.

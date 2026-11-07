# V22 CPU original architecture and 70% strict full-answer acceptance (2026-11-07)

**USER REQUEST (verbatim):** `DA-MI SA VAD FARA CUDA,DAR SA AIBA RASPUNSURI CORECTE DIN PRIMA MACAR 70%`

**VERSION:** `experiment/V22-CPU-REAL-QA-70-GATE-20261107`, descended from `experiment/V22-EXACT-DISCOVERER-TEXT-LABYRINTH-20261107`. No V17 source snapshot, original CUDA engine, original UI controls or previous branches deleted. Default save is distinct: `v17/runtime-v22-cpu-real-text/brains`. Original V21 checkpoint location remains distinct. Do NOT merge these isolated models without source-equivalence tests.

## What runs for real (no CUDA)

- New native Windows PowerShell 5.1-safe launcher: `v17/START_V22_CPU_REAL_TEXT.ps1`.
- Native runner is ORIGINAL `transcend/torus-aether/devour/devour.mjs`, with `--workers 1 --worlds text,cognitivemap,hypertext,maze,transform --gpu off --start`.
- `text`: original JS/Node `Brain.live`, `AligningGraph` and `AligningGraph.write` learn actual complete training Q/A sequences, character by character. **CPU, not Python/PyTorch or CUDA.**
- `cognitivemap`: observes the same full training documents, learns local contrast/interaction hypotheses and calls the actual original V17 `Discoverer.shape` to predict an N-D action path toward a **supplied checkable goal** before any action. No finished natural-language answer is supplied to the planner.
- `hypertext`: V20 and V21 observed contextual graphs are still active. `maze` and `transform` retain original V17 environments and their action/feedback.
- Original UI runs at `http://127.0.0.1:8867/transcend/torus-aether/ui/index.html?live=1`. The V22 canvas shows the learned action topology and original frozen path; the old Eval tab uses the frozen native CPU checkpoint. Do not conflate the action-path shape with natural-language answer correctness.
- No CUDA bootstrap script, CPU PyTorch dependency, GPU fallback, or new model is inserted.

## Strict independent answer metric

`Brain.evalTextExercises` generates `shape` from only the original `Q: ...\nA:` prefix **before** comparing with the hidden answer. The new `firstAnswerExact` is a Boolean for matching the entire answer text (only trailing whitespace normalized). New summary:

- `firstAnswerExactCorrect / firstAnswerExactTotal`
- `firstAnswerExactRate`
- `firstAnswerTarget70Reached` only when rate `>= .70`.
- **Teacher-forced answer character accuracy `answer` and `shapeSame` are distinct from full-response exact correctness**, and neither can be advertised as satisfying the 70% whole-answer target.
- To prevent a 20,000-character prefix falsely passing as a whole answer, the original eval worker **refuses to certify** `firstAnswerExactRate` unless full original exercises were requested with `max=0`. This is enforced by the native HTTP server, not a user-supplied client label.
- In the existing UI's `Ce s-a nascut` section, button **TESTEAZA 16 RASPUNSURI INTREGI NEVAZUTE (CPU)** switches to the Eval tab, sets `T=0`, `noise=0`, `max=0`, `count=16`, and invokes the **real frozen** `POST /eval` against checkpoint. If there are only two heldout examples, only two can be sampled; user should use the full 1.21M OpenThoughts corpus which reserves 16 untouched examples.

## Actual CI evidence and failure to reach user target

- [GitHub Actions 42343111094](https://github.com/dan3s2020/MagicPerspective/actions/runs/42343111094): both CPU native integration and Windows PowerShell 5.1 passed.
- In real CPU-native integration test, **21 actual training exercises**, real original V17 + cognitive map + V20/V21 + maze + transforms and `--gpu off` verified. Original UI and eval HTTP endpoints loaded successfully.
- On the small independent 26-row test source with only **two heldout** rows, frozen original Open-Loop Q/A returned **0/2 exact full answers (0.00%)**. This is not an OpenThoughts result; it is evidence that even a repetitive toy training set is not presently sufficient for exact full-answer generation.
- The mathematical 70% boundary was verified **only in a separate mocked metric unit test** (7/10 controlled predictions), not in actual model learning. Never report this as model accuracy!
- The original V22 shape world passed **100/100 previously unseen 80-token structured transformations**. All 100 had an **explicit goal slot**; this score does NOT measure inferred goals or unseen natural questions.
- The **user-requested 70% general first-attempt exact long OpenThoughts answers has NOT been achieved or measured**. Native Q/A labels remain distinct from structured transformation paths.

## Safe installation, from the isolated CPU branch

The user previously removed and re-cloned repositories, so do not overwrite `D:\MagicPerspective-V21-Aether-Veil`, and do not reuse the V21 checkpoint by default. In an empty location:

```powershell
$ErrorActionPreference = "Stop"
$repo = "https://github.com/dan3s2020/MagicPerspective.git"
$branch = "experiment/V22-CPU-REAL-QA-70-GATE-20261107"
$dest = "D:\MagicPerspective-V22-CPU"
if (Test-Path -LiteralPath $dest) { throw "Destination exists. Refusing to overwrite." }
git clone --single-branch --branch $branch $repo $dest
if ($LASTEXITCODE -ne 0) { throw "Git clone failed." }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_V22_CPU_REAL_TEXT.ps1" -Data "D:\training\OpenThoughts3-1.2M"
```

Open UI `http://127.0.0.1:8867/transcend/torus-aether/ui/index.html?live=1`. To resume, re-run launcher with `-Resume`; it automatically copies existing checkpoints and all sidecars to a timestamped backup first.

### Important CPU performance and user promise

CPU mode avoids CUDA initial microchunk stall, but **original V17 character-by-character training over 1.21M long documents can still be very slow** and consume memory. Do not promise hundreds of exercises/sec. Also a 70% score for a task with **given goal tokens** cannot be substituted for a 70% score on fully unknown answers. Issue #25 remains OPEN/BLOCKING until the natural-language navigator itself predicts/executes complete solution shapes and passes heldout tests.

**Deliverable category: RUNNABLE CPU RESEARCH SYSTEM + REAL HONEST ACCEPTANCE GATE, NOT A VERIFIED 70% QA MODEL.**

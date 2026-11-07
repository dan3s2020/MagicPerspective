# 2026-11-07 — Recoverable user directives + Windows PowerShell incident (PARTIAL SOURCE)

Preserves only **literal text visible in this active conversation**, ordered as shown. Assistant responses between messages, inaccessible earlier turns, exact message time stamps, and screenshot binaries are **NOT** a full native byte-exact transcript; do not invent them. The associated screenshots remain accessible in the original chat, not this Git repository. This file is additive to the existing `VERBATIM_ROOT.md` and keeps the completion gate BLOCKED.

## USER-01 — initial authorization

> I allow you to do it

## USER-02 — first Windows V21 CUDA output (verbatim extract)

```text
PS C:\Users\DSV>
PS C:\Users\DSV> & powershell.exe -NoProfile -ExecutionPolicy Bypass `
>>     -File "$dest\v17\START_V21_AETHER_VEIL.ps1" `
>>     -Data "D:\training\OpenThoughts3-1.2M" `
>>     -Gpu "cuda:0" `
>>     -GpuWorlds 64 `
>>     -Vram 3
MAGICPERSPECTIVE V21 - REAL AETHER / VEIL OBSERVATIONS
Original native V17 Maze and Transform + real V20 Hypertext observations.
NEW contextual Veil graph is CPU Node; CUDA optional for native V17 worlds, not all model operations.
LIVE original UI: http://127.0.0.1:8866/transcend/torus-aether/ui/index.html?live=1
Isolated save location: runtime-v21-aether-veil
Selected real worlds: hypertext,maze,transform
world: D:\training\OpenThoughts3-1.2M · 10,000 exercises in 1 files · 16 kept unseen for the test
worlds: hypertext + maze + transform in the same brains (a labyrinth every 4,000 chars) · saves in D:\MagicPerspective-V21-Aether-Veil\v17\runtime-v21-aether-veil\brains
GPU worlds: cuda:0 · 64 worlds at once · VRAM 3 GB · 100% of the GPU
1 graphs devouring at once · arms stable+many · test every 50,000 chars on 4000 unseen chars · memory budget 3 GB each
living graph: http://127.0.0.1:8866/   (charts: http://127.0.0.1:8866/dashboard)
#0 GPU ERROR: RuntimeError('torch.cuda.is_available() is false in C:\\Users\\DSV\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\python.exe (PyTorch 2.13.0+cpu) - no CPU fallback')
#0 GPU ERROR: RuntimeError('torch.cuda.is_available() is false in C:\\Users\\DSV\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\python.exe (PyTorch 2.13.0+cpu) - no CPU fallback')
```

## USER-03 — sudden collapse

> DE CE A COLAPSAT BRUSC?

Accompanied by a screenshot; original image bytes not attached to this Git file. Recoverable image-visible metrics were transcribed into `v17/docs/V21_CONSOLIDATED_RESEARCH_REGRESSION_TRANSFER_ARCHIVE_20261107.md`, without treating a screenshot as an independent training benchmark.

## USER-04 — screenshots + regression complaint

> VEZI DACA AI FACUT VREO REGRESIE CA VERSIUNI DINAINTE DE DESCOPERIRI,GHCIEASU 10-15% FORMA SOLUTIEI SCRISA INAINTE SI ACUM E 0% ORICE AS FACE. VEZI DACA AI IMPLEMENTAT TOATE DESCOPRIRILE PESTE O VERSIUNE FUNCTIONALA SI PERFORMANTA

Accompanied by four UI screenshots (source images not committed). Original V17 free-generated answer, V20 known-goal wavefront and V21 contextual graph must NOT be conflated.

## USER-05 — do not roll back / must test full transfer

> sper ca acum nu te intorci pur si simplu la acele versiuni vechi,ci implementezi toate descoperirile si testezi sa vezi ca inca se obtin rezultatele descopeririilor,altfel nu ai implementat transferul bine

## USER-06 — document the repository

> Documentează tot în repo

## USER-07 — V21 PowerShell parser error AFTER successful git pull

```text
Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

PS C:\Users\DSV>
PS C:\Users\DSV> $ErrorActionPreference = "Stop"
PS C:\Users\DSV>
PS C:\Users\DSV> $dest = "D:\MagicPerspective-V21-Aether-Veil"
PS C:\Users\DSV>
PS C:\Users\DSV> if (-not (Test-Path -LiteralPath "$dest\.git")) {
>>     throw "Repository V21 not found."
>> }
PS C:\Users\DSV>
PS C:\Users\DSV> $changes = @(git -C $dest status --porcelain)
PS C:\Users\DSV>
PS C:\Users\DSV> if ($changes.Count -gt 0) {
>>     throw "Local changes detected. Refusing to overwrite."
>> }
Local changes detected. Refusing to overwrite.
At line:2 char:5
+     throw "Local changes detected. Refusing to overwrite."
+     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : OperationStopped: (Local changes d...g to overwrite.:String) [], RuntimeException
    + FullyQualifiedErrorId : Local changes detected. Refusing to overwrite.

PS C:\Users\DSV>
PS C:\Users\DSV> git -C $dest pull --ff-only
remote: Enumerating objects: 147, done.
remote: Counting objects: 100% (80/80), done.
remote: Compressing objects: 100% (54/54), done.
remote: Total 147 (delta 46), reused 25 (delta 25), pack-reused 67 (from 1)
Receiving objects: 100% (147/147), 128.28 KiB | 1.86 MiB/s, done.
Resolving deltas: 100% (71/71), done.
From https://github.com/dan3s2020/MagicPerspective
   1203c6b..cbfa93f  experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107 -> origin/experiment/V21-AETHER-VEIL-PREDICTIVE-PERSPECTIVE-20261107
Updating 1203c6b..cbfa93f
Fast-forward
 .github/workflows/v21-veil-aether.yml              |  97 ++++++++++
 ...2026-11-07-V21-REGRESSION-DIRECTIVE-verbatim.md |  17 ++
 v17/START_V21_AETHER_VEIL.ps1                      | 196 +++++++++-----------
 ...REGRESSION_DISCOVERY_TRANSFER_AUDIT_20261107.md |  67 +++++++
 v17/tests/veil-aether.http.test.mjs                |   6 +
 .../veil-aether.observed-action-field.test.mjs     |  77 ++++++++
 .../veil-aether.shape-boundary-regression.test.mjs |  42 +++++
 v17/tests/veil-aether.text-migration.test.mjs      | 119 ++++++++++++
 v17/transcend/torus-aether/devour/brain.mjs        |  11 +-
 v17/transcend/torus-aether/devour/worker.mjs       |  63 ++++++-
 v17/transcend/torus-aether/ui/app.js               |   2 +-
 v17/transcend/torus-aether/ui/index.html           |   4 +
 v17/transcend/torus-aether/ui/veil-aether-live.js  |  73 +++++++-
 .../torus-aether/worlds/observed-causal-field.mjs  | 204 +++++++++++++++++++++
 v17/transcend/torus-aether/worlds/veil-aether.mjs  |   7 +-
 15 files changed, 854 insertions(+), 131 deletions(-)
 create mode 100644 user-intent/2026-11-07-V21-REGRESSION-DIRECTIVE-verbatim.md
 create mode 100644 v17/docs/V21_REGRESSION_DISCOVERY_TRANSFER_AUDIT_20261107.md
 create mode 100644 v17/tests/veil-aether.observed-action-field.test.mjs
 create mode 100644 v17/tests/veil-aether.shape-boundary-regression.test.mjs
 create mode 100644 v17/tests/veil-aether.text-migration.test.mjs
 create mode 100644 v17/transcend/torus-aether/worlds/observed-causal-field.mjs
PS C:\Users\DSV>
PS C:\Users\DSV> if ($LASTEXITCODE -ne 0) {
>>     throw "Git update failed."
>> }
PS C:\Users\DSV>
PS C:\Users\DSV> & powershell.exe -NoProfile -ExecutionPolicy Bypass `
>>     -File "$dest\v17\START_V21_AETHER_VEIL.ps1" `
>>     -Data "D:\training\OpenThoughts3-1.2M" `
>>     -Gpu "cuda:0" `
>>     -GpuWorlds 64 `
>>     -GpuTextBatch 2 `
>>     -Vram 3 `
>>     -IncludeCognitive `
>>     -Resume
At D:\MagicPerspective-V21-Aether-Veil\v17\START_V21_AETHER_VEIL.ps1:120 char:85
+ ... -ne 0) { throw "Native V21 training engine failed ($LASTEXITCODE)." }
+                                                                       ~~~
The string is missing the terminator: ".
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
```

**Important:** The user executed `git pull --ff-only` even though an earlier `git status --porcelain` showed local changes. The pull completed as a fast-forward and did not itself demonstrate data loss. The cause of the later parser error is recorded separately in the V21 Windows PowerShell 5.1 postmortem.

## Archival limitation

This is an exact-text attempt for visible USER text and terminal output; it is NOT a full chronological assistant+user+image export, and it does NOT certify content before this visible conversation. Retain the original screenshots in the chat and mark their archive status `MISSING_BINARY` until actual source assets become available.

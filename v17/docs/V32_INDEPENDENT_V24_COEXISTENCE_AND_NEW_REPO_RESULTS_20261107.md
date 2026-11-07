# V32 isolation correction and independent V24/V31/V33 discoveries — November 7, 2026

## Exact reported regression

User's PowerShell shows a V32 startup failure while V24-Characters was training independently:

- PID 22564, script `D:\MagicPerspective-V24-Characters\v17\transcend\torus-aether\devour\devour.mjs`.
- V24: `--arms stable+many --out runtime-v24-character-atlas --port 8874 --gpu off`.
- V32: `-OriginalOut D:\MagicPerspective-V28\v17\runtime-devour-original -NativePort 8851 -UIPort 8900 -Gpu cuda:0`.
- These are DIFFERENT output folders and ports. The old V32 check `if ($Running.Count -gt 0) { throw ... }` was an invalid global mutex; a regression that interfered with other agents. No user permission was given to stop any experiment.

## Narrow correction, no other code changed

Branch: `fix/V32-ISOLATED-CHECKPOINT-COEXISTENCE-20261107`, child of V32; NO changes to V24 or other experiment branches.

- `v17/apps/hypermaze-studio-v26/checkpoint-process-scope.ps1`: read-only process command-line check. Resolve `--out` relative to the OTHER process's **own** v17 source root, not this model's repo; compare normalized full target folders case-insensitively. A matching checkpoint is blocked; a distinct checkpoint is explicitly allowed; an unresolved output is conservatively reported. Requested ports remain separately checked by real `TcpListener`.
- `v17/START_V32_REAL_CUDA_FULL_VRAM.ps1`: uses the new narrow guard only, does not terminate, pause or reset unrelated processes, and preserves original V32 CUDA/text selftest/Parquet/checkpoint logic.
- `v17/tests/v32-independent-trainer-coexistence.ps1`: tests exactly the user's V24 PID 22564, V24 source path, V24 port 8874, and distinct checkpoint; asserts allowed coexistence, same checkpoint blocked, unknown relative checkpoint blocked and unrelated Node.js process ignored.
- `.github/workflows/v32-independent-trainer-coexistence.yml`: Windows syntax and coexistence verification.

**No files of V24-Characters, V31/V33 research, original model, original retained Q/A dataset or saved checkpoints are modified by this branch.** No need to stop V24.

## New research evidence located in other agents' branches — READ ONLY

These are separate outcomes and should NOT be merged into V32, nor misrepresented as its CUDA performance results.

### V33 — authentic question-conditional failure

Source: `experiment/V33-FIRST-SHOT-TEXT-PATH-FORENSICS-20261107/v17/docs/V33_ORIGINAL_FIRST_SHOT_AUTHENTIC_UNSEEN_TEXT_CAUSAL_PATH_FORENSICS_20261107.md`.

Authentic public OpenThoughts3 source offsets 0–19, 210000–210019, 810000–810019, with 50 training / 10 heldout, then a second disjoint 20 questions at offsets 420000–420009 and 960000–960009. Original six-scale source gating yielded **311/2400 = 12.9583%** post-training-prefix character positions on second heldout; experimentally sharing long-context key yielded **376/2400 = 15.6667%**; **0/20 exact full answers in both**. Outputs were the same across all 20 questions, so releasing the gate improves generic continuation, not semantic question-specific reasoning. Observed bridge evidence in a controlled world restores a 9-step original physical path, 9/9 independently verified; controlled factorized text axes reach 64/64 after independently verified bridges, original strict planner 1/64; neither solves arbitrary unseen long natural Q/A. An unrelated V29 source CI subjob suffered external Hugging Face HTTP 500; not all V33 runs are green.

### V31 causal forensic atlas — physically verified edges, not corpus adjacency

Source: `experiment/V31-CAUSAL-ATLAS-MISSING-PATH-AUDIT-20261107/v17/docs/V31_CAUSAL_ATLAS_CROSS_WORLD_MISSING_PATH_EVIDENCE_20261107.md`.

Original Brain reused source-world transformations across episodes and original Discoverer.shapeGraph. A disconnected route becomes reachable only after independent observed before/action/after target-world evidence. Negative test (+3 instead of expected +2) rejects the candidate instead of adding false edges. Native JSONL observed 90 real-format records, 81 trained, 30 operator hypotheses but **0 physically verified causal transitions**. Full retained atlas (not infinite unobserved world) with paginated edge provenance and missing-character causes exists on this separate branch. Independent V31 CI was green.

### V24 characters — exact original score and missing edit axes

Source: `experiment/V24-CHARACTER-HYPERMAZE-FORENSICS-20261107/v17/docs/V24_ORIGINAL_V17_10_15_SHAPE_VS_BLOCKED_UNBLOCKED_CHARACTER_PATHS_20261107.md`.

Character-level composition from two independent witnesses for `a→o` and `o→u` allows original V17 Discoverer.shape to plan `mat→mot→mut`; one observation and missing `e` axis do NOT produce a fictional path. The historical original V17 shapeSame=17.647% was measured on a synthetic repeated-answer fixture, not OpenThoughts. Another small frozen native fixture yielded positional match 92.5214%, but 0/2 exact answers; all post-hoc repairs explicitly labeled. This is strong evidence of structural missing paths, not of 70% arbitrary long-answer generation.

### Genuine public OpenThoughts V29 Q/A — current semantic limit

Source: `experiment/V33-FIRST-SHOT-TEXT-PATH-FORENSICS-20261107/v17/docs/V29_REAL_NATIVE_OPENTHOUGHTS_QA_CLOSED_LOOP_EVIDENCE_20261107.md`.

Authentic 24 Q/A rows, 20 training and 4 heldout; 277,941 original observed training answer tokens; **0/4 complete unseen answers and 0/4 target goal/path coverage**. The corpus experience sequence is not automatically a causal action graph. The separate test fixture 10/10 repeated variable-copy answers is not this benchmark.

## Correct Windows installation (existing V32 and V24 untouched)

From PowerShell, without asking V24 to stop:

    $Repo = "D:\MagicPerspective-V32"
    $Dest = "D:\MagicPerspective-V32-Isolated"
    $Branch = "fix/V32-ISOLATED-CHECKPOINT-COEXISTENCE-20261107"
    if (Test-Path $Dest) { throw "Destination exists; refusing overwrite" }
    git -C $Repo fetch origin "refs/heads/$($Branch):refs/remotes/origin/$($Branch)"
    if ($LASTEXITCODE -ne 0) { throw "Fetch failed" }
    git -C $Repo worktree add --detach $Dest "refs/remotes/origin/$Branch"
    if ($LASTEXITCODE -ne 0) { throw "Worktree failed" }
    Set-Location $Dest
    powershell -NoProfile -ExecutionPolicy Bypass -File ".\v17\START_V32_REAL_CUDA_FULL_VRAM.ps1" -Data "D:\training\OpenThoughts3-1.2M" -OriginalOut "D:\MagicPerspective-V28\v17\runtime-devour-original" -Gpu "cuda:0" -Vram 0 -GpuTextBatch 1 -TextChunk 8192

Original native port is 8851, UI 8900. If either is occupied, specify different ports; do not stop V24. The original checkpoint must exist or the launcher fails rather than restarting from zero.

## Hardware/research limitations

Windows CI tests prove process coexistence and correct launcher syntax; they do NOT prove sustained RTX 3050 Ti CUDA throughput on user's machine, 100% VRAM utilization, full 1.21M corpus completion or 70% unseen semantic first-shot answer shapes. No production release is asserted.

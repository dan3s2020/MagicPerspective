# V21 — Windows PowerShell 5.1 parser failure and fix (2026-11-07)

**Incident:** Windows PowerShell 5.1 rejected `v17/START_V21_AETHER_VEIL.ps1`, reporting a missing string terminator at **line 120**, after a successful `git pull --ff-only`.

**User evidence:** [actual pasted console transcript](../../verbatim/2026-11-07-V21-VISIBLE-CHAT-USER-DIRECTIVES-VERBATIM-PARTIAL.md). User's repository path was `D:\MagicPerspective-V21-Aether-Veil`. The loader never reached actual training in this attempt; an interpreter parse failure is not evidence of checkpoint corruption or learning collapse.

## Confirmed root cause

The script at previous GitHub blob SHA `065db889ff5476292af74b5da8a5d570051beacb` had one non-ASCII character at **line 92**:

```powershell
Write-Host "MAGICPERSPECTIVE V21 — REAL TEXT + AETHER/VEIL + MAZE/TRANSFORM" -ForegroundColor Cyan
```

The em dash `—` is Unicode **U+2014**, UTF-8 bytes `E2 80 94`. The file was UTF-8 without a byte-order mark. Windows PowerShell 5.1 can interpret such a file as a legacy ANSI codepage: byte `94` becomes a typographic closing quotation character under Windows-1252, which the PowerShell parser recognizes as a quotation mark. This can cause a confusing downstream `TerminatorExpectedAtEndOfString` at line 120 even though the real offending content is at line 92. PowerShell 7's Unicode-aware parser on Linux had previously passed and **did not exercise this compatibility failure**.

The exact offending line was replaced with pure ASCII:

```powershell
Write-Host "MAGICPERSPECTIVE V21 - REAL TEXT + AETHER/VEIL + MAZE/TRANSFORM" -ForegroundColor Cyan
```

**Code fix:** commit `8ca3ddbb6da459a37dcc78ce54f6fba20bad40fb`. No training engine, saved model, other branch or checkpoint was changed to correct this parsing issue.

## Preventing recurrence

1. Both Windows PowerShell V21 entrypoints (`START_V21_AETHER_VEIL.ps1`, `ENSURE_V21_CUDA.ps1`) must contain **only ASCII bytes**. This is stronger than simply parsing successfully in PowerShell Core.
2. GitHub workflow `.github/workflows/v21-veil-aether.yml` now performs an ASCII-byte check on Linux.
3. A **real Windows runner** executes `shell: powershell`, checks `$PSVersionTable.PSVersion` is 5.1 and asks the native `System.Management.Automation.Language.Parser` to parse both actual repository files.
4. The first version of the new Windows test contained its OWN `$file:` variable interpolation mistake; this generated a separate PowerShell parser failure in the workflow at commit `c4c9c7a...`. This was independently fixed by using `${file}:` at commit `e79343dc14bdd9876d6a76b49adfa6d572a96c64`. Do not confuse the CI-test source failure with the already fixed launcher.
5. A successful native Windows 5.1 job was observed in [GitHub Actions run 42326210472](https://github.com/dan3s2020/MagicPerspective/actions/runs/42326210472), job `Real Windows PowerShell 5.1 syntax and ANSI regression`.

**Scope of proof:** Windows 5.1 now parses both PowerShell files. This CI job does NOT load the user's OpenThoughts3 corpus, inspect user-specific local Git modifications, test CUDA device hardware, or prove the whole system can train to a particular answer accuracy on that PC.

## Why the earlier Git warning was not evidence of data loss

The transcript first printed `Local changes detected. Refusing to overwrite.` from a guard inspecting `git status --porcelain`. The user then independently ran `git pull --ff-only`, which succeeded as a **fast-forward**. This means Git accepted the pull without discarding conflicting tracked changes. The visible transcript does **not** identify which local files caused a dirty status; it may include untracked runtime output, but that is NOT verified. Do not remove, reset, stash, clean or overwrite any local work as a workaround.

Safe user commands:

```powershell
$dest = "D:\MagicPerspective-V21-Aether-Veil"
git -C $dest status --short
git -C $dest pull --ff-only
if ($LASTEXITCODE -ne 0) {
    throw "Git refused the update; preserve the working tree and inspect conflicts."
}
```

Then resume with the **same existing save**, after stopping all older workers sharing this checkpoint:

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File "$dest\v17\START_V21_AETHER_VEIL.ps1" `
  -Data "D:\training\OpenThoughts3-1.2M" `
  -Gpu "cuda:0" -GpuWorlds 64 -GpuTextBatch 2 -Vram 3 `
  -IncludeCognitive -Resume
```

On the first full-text resume the launcher makes a separate timestamped **copy** of prior Brain checkpoint files and known sidecars (it does not apply OS-level read-only/immutable attributes). The user should confirm both the backup path and the launch messages before leaving the trainer running.

## Related but separate prior regressions

- V21 originally omitted the native `text` world, starving `AligningGraph.write()`; fixed while retaining V20/V21; frozen synthetic Q/A shape result **17.65%** on 64 training examples, NOT confirmed OpenThoughts3 score.
- The original 200-character evaluation limit could clip away the `A:` marker; the new evaluator returns `shapeSame=null` and an explicit reason rather than a false 0%.
- A CPU-only PyTorch interpreter was selected from a different Python environment; isolated V21 CUDA bootstrap now validates the selected device and fails closed.
- Neither the existence of the original maze `Discoverer.shape()` nor a low Bellman residual for an observed token route constitutes proof of full language-world mechanism transfer.

## Quality gates and missing evidence

- [x] GitHub source replaced non-ASCII em dash in the launcher.
- [x] Both V21 PowerShell entrypoints constrained to ASCII bytes.
- [x] Native Windows PowerShell 5.1 parser test passed.
- [x] Previous native V21 suite 42/42 and historical discovery tests passed before this documentation-only update.
- [ ] **User's exact GPU, CUDA interpreter and real corpus after restart:** not yet verified.
- [ ] Complete semantic maze-to-language transfer using the original solution-shape method: not proven, Issue #25 OPEN.
- [ ] Native historic transcript and images all archived: still incomplete.

**Do not mark the entire project or the transfer as complete on the basis of a parser check.**

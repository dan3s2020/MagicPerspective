# REQUIRED GitHub branch rules — protect the user's definition of MagicPerspective

> **OPEN CONFIGURATION TASK.** This document is an instruction to the repository owner, **not** a claim that branch protection is already active.

### Verified on 2026-11-06

- The repository is public and `main` is its default branch.
- `.github/workflows/user-intent-guard.yml` exists and its `user-intent-guard` job has successfully run its six structural tests on `main`.
- `.github/CODEOWNERS` specifies `@dan3s2020` as reviewer for all paths.
- The GitHub rulesets endpoint returned **no configured rulesets** (`[]`). The branch-protection read endpoint returned 403 to the connected integration, so **classic branch protection could not be confirmed**.
- The connected GitHub integration has no authenticated branch-protection **write** operation. We have **not** enabled mandatory checks or configured administrator bypass protection.

### Configure this in the GitHub UI to make contributions genuinely blockable

1. Open [Settings → Rules → Rulesets](https://github.com/dan3s2020/MagicPerspective/settings/rules) while signed in as the repository owner.
2. Create an **active branch ruleset** targeting **main**.
3. Enable **Require a pull request before merging** and **Require review from Code Owners** (`.github/CODEOWNERS`). Require at least one human approval.
4. Enable **Require status checks to pass before merging** and select the exact check name **`user-intent-guard`** from workflow **User intent guard - no unauthorized algorithm substitutions**. Also require the ordinary regression checks already used by the repository where appropriate.
5. Block **force pushes** and **branch deletion** on `main`. If GitHub exposes bypass actors, do not grant normal coding agents exemptions.
6. Enforce restrictions against administrators/owners where appropriate, with a clear emergency recovery procedure. Otherwise an administrator or an unguarded direct push can still circumvent CI.
7. Test the rule with a disposable PR changing a code file **without** `user-intent/changes/<id>.json`: the guard must fail and GitHub must refuse merge. Then add a valid contract and verify tests are required.

### What the gate does and does NOT do

It refuses coding PRs with no exact-user-source contract or no declared changed paths; blocks **direct-implementation language code** that introduces obvious latent/encoder/decoder/SGD/token substitutions; and refuses changes to the original `worlds/exercise.mjs` without **separately documented** user authorization.

It does NOT prove that a quote was truly authorized by the human, that new logic preserves the original algorithm semantically, or that branch rules are active. A malicious contributor could modify the gate unless protected branch rules and review enforce it. Exact user approval, frozen real-world behavior tests and independent review remain essential.

### Blocking regression remains OPEN

[REGRESSION_USER_DIRECTIVE_2026-11-06.md](../REGRESSION_USER_DIRECTIVE_2026-11-06.md) · [Issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25)

**Do not report permanent protection until the ruleset is configured and the refusal-to-merge PR test has passed.**

# RUN INCIDENT — stale Desktop checkout / UI not launched

Date: 2026-10-04
Branch intended: `SAME-DISH-ENTANGLED-AB-V1-20261004`
User local path actually executed: `C:\Users\DSV\Desktop\SAME-DISH-ENTANGLED-AB-V1`

## What was run

The user executed:

```powershell
$Desktop = [Environment]::GetFolderPath("Desktop")
cd $Desktop

git clone --depth 1 --single-branch --branch "SAME-DISH-ENTANGLED-AB-V1-20261004" "https://github.com/dan3s2020/OctopusV2.git" "SAME-DISH-ENTANGLED-AB-V1"
```

Git returned:

```text
fatal: destination path 'SAME-DISH-ENTANGLED-AB-V1' already exists and is not an empty directory.
```

The user then ran:

```powershell
cd "$Desktop\SAME-DISH-ENTANGLED-AB-V1"
.\RUN_SAME_DISH.cmd
```

Because the clone had failed, this entered the **pre-existing stale checkout** rather than a fresh checkout of the current branch head.

## Evidence from the output

The launcher printed:

```text
OCTOPUS SAME-DISH ENTANGLED A/B V1
A = TARGET_SEEKER   B = RESISTANCE_EXPLORER
One physical map. Separate brains. Observable behavior only.
LIVE-vs-MASKED causal ablation included.
...
=== OCTOPUS SAME-DISH ENTANGLED A/B V1 ===
...
resumeEpisode=950 targetEpisodes=1000
```

That is the older CLI launcher/runner path. The current branch launcher instead identifies itself as:

```text
OCTOPUS SAME-DISH ENTANGLED A/B V1 - LIVE UI
ONE shared physical map / FOUR cells / TWO separate brains
```

and invokes `map-cells\same-dish-server.mjs`, which serves `same-dish-ui.html`.

The old local checkout therefore resumed an existing CLI checkpoint at episode 950 and never launched the UI server.

## Assistant mistake

The assistant told the user to clone into `SAME-DISH-ENTANGLED-AB-V1` but did not first account for the possibility that this directory already existed.

After Git explicitly reported that the clone failed, the assistant had not yet warned the user that running `.\RUN_SAME_DISH.cmd` from that existing directory would execute stale code.

This was an execution-path error, not evidence that the current UI branch lacks a UI.

## Correct recovery

Update the existing Desktop checkout to exactly the current remote branch:

```powershell
cd "C:\Users\DSV\Desktop\SAME-DISH-ENTANGLED-AB-V1"

git fetch origin "SAME-DISH-ENTANGLED-AB-V1-20261004"
git checkout -B "SAME-DISH-ENTANGLED-AB-V1-20261004" "origin/SAME-DISH-ENTANGLED-AB-V1-20261004"
git reset --hard "origin/SAME-DISH-ENTANGLED-AB-V1-20261004"

.\RUN_SAME_DISH.cmd
```

The expected launcher header after recovery contains `LIVE UI`, and a local browser is opened to the same-dish dashboard.

## Prevention rule

Before telling the user to run an existing local folder, first verify whether the clone/worktree command actually succeeded. A failed clone followed by `cd` into the destination must be treated as a stale-checkout risk.

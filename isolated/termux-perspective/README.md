# MagicPerspective — Global map ↔ body perspective (TERMUX, isolated experiment)

## Why this exists

Original V17 \`worlds/exercise.mjs\` predicts the initial maze trajectory using
\`Discoverer.shape\`, but then repeatedly passes the **full** world matrix to
the organism at every step. This does **not** test keeping the overhead shape
while navigating from body-centric observations.

This repository branch introduces a completely separate, zero-dependency
Node.js experimental proof: the same V17/V16 **unchanged** \`makeMaze\`
generator supplies worlds. A new \`BodyFrameLearner\` learns the discrete
transformation from body-relative outputs to global map movements, using
actual observed movement displacements and the frame ID during **supervised
calibration**. Then a frozen copy navigates previously unseen mazes with:

- one complete overhead view at the start (copied into memory);
- a 5×5 egocentric patch at every subsequent step, rotated by a hidden
  orientation fixed for the episode;
- proprioceptive moved/blocked feedback;
- an internal estimated global position and orientation inferred by matching
  local observations to the **memorized** overhead map;
- a route computed from the memorized initial map, NOT from the simulator's
  true position after the start.

A paired untrained control receives identical maps, hidden orientations,
starting coordinates and episode budgets. No teacher or true position/heading
is passed to the navigation policy during the held-out test.

## Installation (run in ANDROID TERMUX, not Windows PowerShell)

    pkg update -y
    pkg install -y git nodejs-lts
    cd "$HOME"
    git clone --single-branch --branch experiment/TERMUX-GLOBAL-EGOCENTRIC-LEARNING-20261106 \
      https://github.com/dan3s2020/MagicPerspective.git MagicPerspective-Termux-Perspective
    cd "$HOME/MagicPerspective-Termux-Perspective"
    node --test isolated/termux-perspective/test.mjs
    node isolated/termux-perspective/run.mjs --train 320 --test 64 --size 11

Then open **http://127.0.0.1:8765/** in the browser on the *same phone*.
The report is generated from the actual Node.js backend, never simulated in
the browser. Press Ctrl+C to stop the viewer. Result files remain in
\`isolated/termux-perspective/runs/\`.

Re-run the experiment on another test sample:

    node isolated/termux-perspective/run.mjs --train 640 --test 100 --size 13 --seed 71

Control with zero learned examples:

    node isolated/termux-perspective/run.mjs --train 0 --test 64 --size 11 --seed 29 --port 8766

On later updates:

    cd "$HOME/MagicPerspective-Termux-Perspective"
    git status --short
    git pull --ff-only
    node --test isolated/termux-perspective/test.mjs
    node isolated/termux-perspective/run.mjs --train 320 --test 64

If you have local modifications, resolve them instead of forcibly resetting
or overwriting the repo. No CUDA, PyTorch, \`pkg\` on Windows, or \`npm install\`
is needed.

## Metrics — what they actually mean

- **Before / after success:** number of unseen mazes completed before the
  same episode-specific step limit.
- **Extra steps:** actual steps minus oracle shortest-path steps. Reported
  only for **solved** episodes; failures are counted separately.
- **Localization accuracy:** how often the agent's estimated location was
  equal to the simulator's withheld actual location at a decision.
- **Orientation accuracy:** how often the inferred frame equaled the
  hidden simulator frame. The hidden frame is never supplied to the policy
  at test time.
- **Bumps:** attempted movements into walls.
- **Learning curve:** measured on a separate 12-map validation seed
  partition for each calibration checkpoint. The final 64+ test mazes are
  a third, untouched seed partition and are used only for final scoring.
- **Initial overhead shape:** computed from the remembered maze using BFS.
  This is a *known good initial planner*, NOT proof that the original V17
  \`Discoverer.shape\` learned the route. It isolates the perspective
  transformation from the separate problem of route learning.
- **Map leak check:** the Navigator class receives only the copied initial
  map, local observation and moved/blocked flag. The evaluator alone keeps
  actual position and heading, and labels them separately in replay.

## What IS and IS NOT proved

A performance gain demonstrates that **supervised calibration of a discrete
body→map coordinate transform**, combined with local-view re-localization,
can improve navigation on previously unseen mazes compared with an
uncalibrated identity mapping.

This experiment **does not yet prove** that the original V17 Brain has
autonomously discovered that transformation, that the same operation
generalizes to text, that the map's geometry is learned rather than computed
from its initial observation, or that any physical higher-dimensional
universe/noise interpretation is verified.

The test deliberately isolates a *single* requested capability:
remember the overhead solution while controlling a body that perceives
only local slices. The next integration should replace this benchmark's
known shortest-route planner with the frozen route produced by the
original V17 \`Discoverer.shape\`, and then train a shared perspective
module inside the original brain. Neither is silently claimed here.

## Safety / reproducibility

The isolated branch is based on the existing NoiseSpace experiment but
**does not edit V17** or overwrite its checkpoints. Results are timestamped
in \`runs/\` and that directory is ignored by Git. Random seeds, training
sizes, hidden-frame learning mapping, per-maze test outcomes and replay
frames are recorded in each report.

Source code: \`engine.mjs\`, \`run.mjs\`, \`viewer.html\`, \`test.mjs\`.
Continuous integration runs the same tests and a CLI smoke check on Linux
and Windows Node.js. Native Android/Termux speed remains to be measured
on your phone.

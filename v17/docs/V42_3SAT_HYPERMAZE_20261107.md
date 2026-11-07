# V42 — 3-SAT as a hyperdimensional labyrinth (2026-11-07)

Branch: experiment/V42-3SAT-REAL-HYPERMAZE-20261107
Base: perf/V42-REAL-CUDA-IMAGINATION-KERNEL-OVERHEAD-20261107, SHA 162584b465a0af934eab6a36fe33b7f80b6a8c43.

**Core untouched:** v17/transcend/torus-aether/worlds/exercise.mjs. All navigation uses the original Discoverer.shapeGraph() without modifications to the original Brain, CUDA, UI, or checkpoint.

## Formal representation

An n-variable 3-SAT formula is represented by n Boolean decision dimensions. Each node is a partial assignment, an edge sets the next variable to 0 or 1, a violated clause can become a wall, and a complete assignment satisfying every clause is an exit. UNSAT means no exit.

A complete explicit assignment graph can be exponentially large; turning SAT into a maze does not by itself reduce SAT complexity.

## Test A: original V42 on an externally built valid path graph

Source: v17/tests/v42_3sat_hypermaze.test.mjs.
GitHub Actions PASS 4/4: https://github.com/dan3s2020/MagicPerspective/actions/runs/42377763698

| Variables | Clauses | Result | Original V42 shape-only milliseconds |
|---:|---:|---|---:|
| 4 | 6 | SAT | 0.463 |
| 8 | 33 | SAT | 0.314 |
| 9 | 38 | SAT | 0.595 |
| 10 | 43 | SAT | 0.433 |
| 11 | 48 | SAT | 0.618 |
| 8 | 38 | UNSAT | 0.019 |
| 10 | 48 | UNSAT | 0.039 |

Example 10-variable SAT witness: [0,0,0,1,0,0,0,1,1,1]. All 43 clauses independently checked. The test constructs and prunes the allowed path graph using SAT clause semantics before invoking V42, so graph construction already performs SAT work. Times are only the V42 shape function, not total solve times. A known goal association is seeded; no zero-shot SAT intelligence is claimed.

Ablation: with a target node but no observed connecting edges, original V42 returns no route.

## Test B: original V42 on clause-blind full decision maze with feedback

Source: v17/tests/v42_3sat_feedback_maze.test.mjs.
GitHub Actions PASS 3/3: https://github.com/dan3s2020/MagicPerspective/actions/runs/42377972337

The harness constructs all binary decision paths without reading any formula clause. Every complete assignment is initially a hypothetical exit. Original V42 shapeGraph proposes a full assignment. Only then does the external SAT evaluator check it. If false, that exit is blocked and original V42 reshapes until it finds a true exit or no exits remain.

| Variables | Clauses | Outcome | Full assignments attempted | Experiment milliseconds |
|---:|---:|---|---:|---:|
| 4 | 6 | SAT [0,0,1,0] | 3/16 | 1.256 |
| 8 | 32 | SAT [1,1,1,1,1,1,1,1] | 256/256 | 65.290 |
| 6 | 8 | UNSAT | 64/64 | 2.132 |

Correctness independently verified by enumeration. Goal association is manually seeded. The external feedback controller and truth checker are not internal neural SAT understanding. The 8-variable unique-solution test takes *all* 256 attempts: it demonstrates path navigation and memory of rejected exits, not faster-than-brute-force SAT solving.

## Repeat locally without altering active projects

On a machine with Git and Node.js 22, use a NEW folder:

~~~powershell
$ErrorActionPreference = 'Stop'
$Dest = 'D:\MagicPerspective-V42-3SAT'
if (Test-Path -LiteralPath $Dest) { throw 'Destination already exists; refusing to overwrite.' }
git clone --single-branch --branch 'experiment/V42-3SAT-REAL-HYPERMAZE-20261107' 'https://github.com/dan3s2020/MagicPerspective.git' $Dest
if ($LASTEXITCODE -ne 0) { throw 'Git clone failed' }
Set-Location $Dest
node --test .\v17\tests\v42_3sat_hypermaze.test.mjs .\v17\tests\v42_3sat_feedback_maze.test.mjs
if ($LASTEXITCODE -ne 0) { throw '3-SAT tests failed' }
~~~

This is CPU Node.js execution of the V42 JavaScript shape mechanism, not an RTX/CUDA SAT benchmark.

## Unproven, next experiment

Unproven: general zero-shot inference from unseen formulas, subexponential SAT solving, SAT-specific clause learning inside the original Brain, or advantage over DPLL/CDCL.

Next test: represent clauses, literals, and shared variable states in one observed factor graph; learn barriers from local falsified clauses and carry those learned transformations across unseen formulas. Use SAT/UNSAT, held-out seeds, equal compute budgets, independent clause verification, and a classical solver baseline. Avoid pre-labeling satisfying leaves, avoid graph-oracle leakage and preserve the original V42 architecture.

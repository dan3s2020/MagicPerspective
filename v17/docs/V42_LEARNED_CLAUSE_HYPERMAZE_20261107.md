# V42 3-SAT learned clause transformations on an evolving hypermaze — reproducible evidence

Date: 2026-11-07.
Isolated branch: experiment/V42-3SAT-LEARNED-CLAUSE-HYPERMAZE-20261107.
Based on V42 branch perf/V42-REAL-CUDA-IMAGINATION-KERNEL-OVERHEAD-20261107 via the earlier isolated 3-SAT branch. Existing original Brain, text CUDA, checkpoints and UI are unchanged.

## Proof of order: internally tested before publishing

This exact new test file was first executed with Node.js 22 in the model's local container using a faithful isolated copy of the original Discoverer.shapeGraph logic. It passed 9/9 tests, including 30 held-out formulas and larger n=32 cases. The SHA-1 of its Git blob, computed locally before publication, was a1887511ff4dd31d33dda41f33be720b2adb251a; GitHub returned the SAME exact blob SHA after upload.

Only after passing those local tests was the full file published as:
v17/tests/v42_clause_hypermaze.test.mjs

GitHub Actions then executed it against the ACTUAL original V42 v17/transcend/torus-aether/worlds/exercise.mjs. Success run (9 new tests + 7 previous SAT regression tests, 16/16):
https://github.com/dan3s2020/MagicPerspective/actions/runs/42379310155

## Architecture actually tested

1. A 3-SAT formula has n Boolean variables and clauses each of three signed literals.
2. The active maze graph is a *lazy tree of partial assignments*. Each node is an observed partial assignment. Each branch decides one still-unassigned variable. The graph is NOT a pre-enumerated table of 2^n states, and no final SAT assignment is ever labelled as a goal before testing it.
3. Unknown, unvisited frontier nodes are tagged with the old generic KIND.target because they are *hypothetical exploration goals*, not proven satisfying leaves. The original Discoverer.shapeGraph() propagates the original attraction field and returns a route to one frontier before the next operation.
4. When the environment observes three false literals, the partial assignment is proven contradictory and the frontier becomes a wall, blocking the whole subtree. When the entire formula is satisfied, return the assignment and verify ALL original clauses separately.
5. A separate tiny LearnedClauseTransformation remembers outcomes of 96 interventions on isolated three-literal clauses (48 experiments, testing both choices). Those interventions show that when the local clause state is F,F,? the move making the final literal true is successful and the false move causes contradiction.
6. The transformation is applied to unseen clauses regardless of variable identity, literal sign or literal position. Repeated propagation handles cascades and contradictions. The local rule has no knowledge of test formula answers.
7. There is a sound conventional clause checker and a conventional variable-selection heuristic in the experiment harness. The original Brain itself DOES NOT learn 3-SAT constraints or build the abstract graph unaided. The tested learned rule is the *classical unit-propagation rule* obtained from examples, not a new super-polynomial speed algorithm.
8. Original V42 shapeGraph and all old learning/CUDA paths remain untouched.

Important attribution: the SAT-specific search orchestration, clause checks, feedback, and learned local transformation are NEW isolated test harness components. The old V42 component supplies the shape/route operator on the evolving observable graph. The new learned rule is NOT evidence that the original V42 automatically discovers SAT without a new interface.

## Measured results

All solutions were checked against their own clauses. SAT/UNSAT status was compared against a separately implemented DPLL solver; <=16 variables were also cross-checked through full truth-table enumeration.

Internal:
- New test groups: 9 PASS, 0 FAIL.
- Held-out generated formulas: 30/30 agreement with the independent DPLL oracle, including 22 SAT and 8 UNSAT.
- The learned transformation required fewer explored frontier proposals than the no-rule original V42 baseline on each of the 30 held-out cases.
- Larger planted SAT: 20 variables / 85 clauses: 26 proposals; 24 / 103: 27; 28 / 122: 21; 32 / 150: 10.
- Larger unplanted random near the transition ratio: 32 variables / 137 clauses: 15 proposals. All assignments clause-verified.

Actual GitHub Actions log (Ubuntu Node.js 22):
- 10-variable / 40-clause synthetic unique-solution SAT: no-rule original V42 needed 104 proposals vs learned-rule V42 needed 14, a 7.43x reduction in EXPLORED FRONTIERS. The entire benchmark was 19.145 ms vs 1.810 ms in that one CI run. This is not a general speedup.
- 11-variable / 46-clause held-out SAT: 133 proposals vs 3, a 44.33x reduction in frontier proposals.
- 30 held-out problems: 22 SAT, 8 UNSAT; 30 were improved, 0 worsened in proposal counts. This fixed suite is too small to claim all-instance dominance.
- 32-variable / 137-clause random SAT: external reference DPLL ~0.437 ms, our V42 clause-aware route ~2.290 ms (timings are single runs, NOT controlled medians). DPLL was faster.
- New 9/9, old 7/7 GitHub CI PASS.

## Critical unsolved issue

3-SAT is NP-complete; navigating a naive assignment tree can take exponential time. Learning the F,F,? rule is ordinary unit propagation, so the performance improvement mainly comes from eliminating entire contradictory subtrees before search. This is a legitimate learned local rule and graph representation, but is NOT an efficient solution to arbitrary hard 3-SAT, proof of new complexity results, a zero-shot demonstration by the original Brain, or evidence of GPU acceleration.

A strong next falsifiable test would use hidden-variable relabellings, nontrivial parity/XOR-based CNF, unsatisfiable benchmarks needing resolution and clause learning beyond unit propagation, random 3-SAT at larger sizes, and controlled comparisons with a competent CDCL solver. Measure wall-clock, conflicts, Boolean decisions, memory, and proof certificates for UNSAT.

## Exact reproducibility — Windows PowerShell

Run in a NEW folder (does not alter existing runs):

~~~powershell
$ErrorActionPreference = 'Stop'
$Dest = 'D:\MagicPerspective-V42-SAT-CLAUSE-LAB'
if (Test-Path -LiteralPath $Dest) { throw 'Destination exists: refusing overwrite' }
git clone --single-branch --branch 'experiment/V42-3SAT-LEARNED-CLAUSE-HYPERMAZE-20261107' 'https://github.com/dan3s2020/MagicPerspective.git' $Dest
if ($LASTEXITCODE -ne 0) { throw 'Git clone failed' }
Set-Location $Dest
node --version
node --test .\v17\tests\v42_clause_hypermaze.test.mjs .\v17\tests\v42_3sat_hypermaze.test.mjs .\v17\tests\v42_3sat_feedback_maze.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'A real SAT / V42 regression test failed' }
~~~

The tests require Node.js 22 and no GPU. The original V42 GPU optimization is not benchmarked by this experiment.

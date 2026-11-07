# MagicPerspective V42: adversarial 3-SAT challenges and independent reference checks

**Date:** 2026-11-07  
**Isolated branch:** experiment/V42-ADVERSARIAL-3SAT-20261107  
**Original V42:** unchanged. We specifically execute the exact existing Discoverer.shapeGraph from v17/transcend/torus-aether/worlds/exercise.mjs. Nothing was changed in the original learning engine, GPU paths, UI or training checkpoints.

## Test-before-publication order and source identity

1. Built and ran local deterministic hard formulas, with a private exact-operator mirror used only for initial functional validation.
2. Replaced the initial lightweight random source with a deterministic SHA-256 counter generator to avoid simple pseudo-random low-bit correlations.
3. Ran and verified the 12-instance SAT/UNSAT/UNKNOWN hard suite locally before publishing v42_hard_sat_lab.mjs and v42_hard_sat.test.mjs.
4. GitHub Actions successfully executed that exact hard suite against the REAL ORIGINAL V42 checkout and preserved the logs: https://github.com/dan3s2020/MagicPerspective/actions/runs/42381566650
5. Independently verified a further 10 separate, previously unseen random 100-variable 426-clause formulas with SciPy HiGHS MILP, 5 SAT and 5 UNSAT.
6. After a first 1.5s budget gave one UNKNOWN, an increased budget allowed original V42 to exhaust that instance and return UNSAT. The ten-case suite passed **10/10** locally, then **10/10 on GitHub's actual original V42 code**: https://github.com/dan3s2020/MagicPerspective/actions/runs/42381896701
7. Added a second independent Python generator + solver (v42_hard_milp_reference.py) using hashlib and SciPy HiGHS. It regenerates the same exact SHA-256 formula hashes without importing any JavaScript code or V42 output. The Python reference passed locally, 5 SAT and 5 UNSAT.
8. Independent Python GitHub Action: https://github.com/dan3s2020/MagicPerspective/actions/workflows/v42-independent-highs-3sat.yml

The original two GitHub test source files match the locally tested Git blobs byte-for-byte:
- v42_hard_sat_lab.mjs: aa2c5a283a535adeba2850a8813bc03c2b958253
- v42_hard_sat.test.mjs: f12db88a33871bb136e075777fc1991460f798ef
- v42_hard_holdout_100.test.mjs: 89b99fa34d2b0f082372041962c12bc797d2c151
- v42_hard_milp_reference.py: 4ef37888106adc7f3276fc52c9e827a4adce4e59

## Real tested hybrid algorithm and attribution

Each Boolean variable is one decision dimension. V42's original shapeGraph propagates its old attraction field through a lazily expanding graph of partial assignments and selects the next unexplored candidate frontier. A harness *external to the original V42 Brain* performs SAT-specific clause evaluation, standard unit propagation from the earlier learned local F,F,? transformation, conventional variable selection, branching and memory updates. Hypothetical frontiers use the existing KIND.target, but these frontiers are NOT known satisfying assignments. Their actual truth is tested after expansion.

No valid complete assignment, SAT decision, proof label, or hidden witness is fed into the V42 search. The independent reference result is used only in the outer test assertion.

**Therefore:** The tests prove the V42 shape operator can navigate a working SAT-adapter hypermaze. They do NOT prove the unmodified original V42 Brain has autonomously learned SAT logic, that this exceeds good DPLL/CDCL implementations, or that 3-SAT is polynomial-time solvable.

The code uses Node.js CPU, not GPU. The measured milliseconds include entire adapter search + original shapeGraph within the Node process, but exclude formula generation and independent HiGHS verification.

## First hard suite: 12 structured + random instances

GitHub Actions: https://github.com/dan3s2020/MagicPerspective/actions/runs/42381566650

| Family | Variables | 3-clauses | Observed result | V42 frontiers | GitHub Node elapsed |
|---|---:|---:|---|---:|---:|
| Random SHA-256 (seed 20261107) | 40 | 170 | SAT, full witness verified | 111 | 25.4 ms |
| Random SHA-256 (seed 20261108) | 60 | 256 | SAT, full witness verified | 207 | 28.0 ms |
| Random SHA-256 (seed 20261109) | 80 | 341 | SAT, full witness verified | 253 | 14.9 ms |
| Random SHA-256 (seed 20261110) | 100 | 426 | SAT, full witness verified | 2,785 | 1,317.7 ms |
| Random SHA-256 (seed 20261111) | 150 | 639 | UNKNOWN (time limit) | 2,485 | 1,501.0 ms |
| Random SHA-256 (seed 20261112) | 200 | 852 | UNKNOWN (time limit) | 2,388 | 1,501.1 ms |
| Random SHA-256 (seed 20261113) | 300 | 1,278 | UNKNOWN (time limit) | 2,293 | 1,501.1 ms |
| Mobius parity SAT, 16 vertices | 24 | 64 | SAT | 2,047 | 697.6 ms |
| Mobius parity UNSAT, 16 vertices | 24 | 64 | UNSAT, full exhaustion | 2,558 | 952.4 ms |
| Mobius parity UNSAT, 24 vertices | 36 | 96 | UNKNOWN | 3,691 | 3,000.8 ms |
| Mobius parity UNSAT, 36 vertices | 54 | 144 | UNKNOWN | 2,625 | 1,500.7 ms |
| Mobius parity UNSAT, 48 vertices | 72 | 192 | UNKNOWN | 2,636 | 1,500.2 ms |

### The parity challenge is mathematically hard for local-only propagation

Every degree-3 vertex imposes an XOR equation on its three incident edge variables. Four exact 3-clauses encode the local XOR constraint. For the UNSAT versions, XOR over ALL vertex equations cancels each edge variable twice, giving left-hand side 0, but right-hand side 1. Hence UNSAT. A separate test reconstructs each 3-XOR constraint independently from the CNF and verifies its charge parity and edge multiplicity.

That global parity contradiction is invisible to ordinary single-clause unit propagation until enough variables are assigned. Example: on the 36-variable/96-clause UNSAT instance, original V42 navigation with our adapter made 3,691 proposals in 3 seconds and found no conflict. Separate SciPy HiGHS independently classified the 36-variable parity instance UNSAT in approximately 2.2 seconds in a different local process. These are single runs on potentially different hosts: DO NOT infer a benchmark speed ratio.

## Fixed holdout: ten genuinely unplanted 100-variable 426-clause instances

GitHub Actions actual V42 run: https://github.com/dan3s2020/MagicPerspective/actions/runs/42381896701

Every SAT witness is independently checked against every clause. Every V42 UNSAT classification also completed its search. The Python reference's independent HiGHS MILP matched all ten outcomes (five SAT, five UNSAT), with a separate regeneration of all input formulas from the original seeds.

| Seed | SHA-256 formula prefix | Outcome | V42 frontiers | Actual GitHub Node elapsed |
|---|---|---|---:|---:|
| 20262001 | bd74b42f0a3fbaec | UNSAT | 3,130 | 2,860.6 ms |
| 20262002 | 6fb9137182a9c56d | UNSAT | 2,282 | 1,264.8 ms |
| 20262003 | 136e15d2c1e40c91 | UNSAT | 2,278 | 1,214.3 ms |
| 20262004 | 93d78f38b895c8bd | SAT | 1,573 | 613.8 ms |
| 20262005 | bc9af997ed558510 | UNSAT | 1,682 | 647.6 ms |
| 20262006 | d88e761b864fb62c | SAT | 2,271 | 1,309.3 ms |
| 20262007 | 10a00ebfbeb27541 | SAT | 857 | 197.2 ms |
| 20262008 | 2f653a5961f31f27 | SAT | 1,248 | 425.3 ms |
| 20262009 | 474f48ae1eca4e8c | SAT | 2,005 | 1,016.5 ms |
| 20262010 | b136478459b3fddd | UNSAT | 1,518 | 558.2 ms |

**Actual matched score: 10/10** on this particular fixed seeded holdout; it is not a general success-rate estimate. The SAT/UNSAT mixture was not constructed by planting the solution. Exact witnesses and full per-world metrics are in the CI artifact logs. No assumption about arbitrarily larger problems is justified.

### Independent reference formulation

For a 3-clause of signed literals, each positive literal contributes binary x_i and each negative literal contributes 1-x_i. The reference optimizer independently solves the binary integer feasibility system requiring each clause sum >= 1. HiGHS status 0 and verified binary witness = SAT; status 2 (proven infeasible) = UNSAT; timeout = UNKNOWN. This classification is not sent to the V42 engine.

## Reproduce exactly on Windows (isolated new folder)

Requires Git, Node.js 22, and optionally Python 3.12 / NumPy / SciPy for independent verification.

~~~powershell
$ErrorActionPreference = 'Stop'
$Dest = 'D:\MagicPerspective-V42-HARD-SAT'
if (Test-Path -LiteralPath $Dest) { throw 'Destination already exists; refusing overwrite.' }
git clone --single-branch --branch 'experiment/V42-ADVERSARIAL-3SAT-20261107' 'https://github.com/dan3s2020/MagicPerspective.git' $Dest
if ($LASTEXITCODE -ne 0) { throw 'Git clone failed' }
Set-Location $Dest
node --test .\v17\tests\v42_hard_sat.test.mjs .\v17\tests\v42_hard_holdout_100.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'V42 SAT test failed' }
python -m pip install numpy scipy
if ($LASTEXITCODE -ne 0) { throw 'Python dependencies failed' }
python .\v17\tests\v42_hard_milp_reference.py --time-limit 10
if ($LASTEXITCODE -ne 0) { throw 'Independent solver verification failed' }
~~~

## Next research hypothesis: a global constraint atlas

Give the organism an explicit *factor graph* with variable nodes, literal signs and observed clause truth tables, and learn transformations from shared variables across clauses. The parity challenge provides a falsifiable test: can it infer the cancellation of variables appearing twice and derive the long-range 0=1 contradiction BEFORE enumerating assignments?

A classical XOR-elimination algorithm could solve that challenge, but merely adding it in an external adapter would not demonstrate emergent intelligence. The meaningful test is transfer from locally learned XOR episodes to unseen graph topologies with no test-solution leakage, followed by comparison against DPLL/CDCL, XOR Gaussian elimination and original V42.

Avoid changing any working original source or replacing the original Brain just to claim a better benchmark.

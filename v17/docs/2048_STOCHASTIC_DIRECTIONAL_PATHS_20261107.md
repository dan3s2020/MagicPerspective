# MagicPerspective: 2048 as a stochastic hyperdimensional path laboratory
2026-11-07 — independent experiment; original V17 engine and UI unchanged.

## Why 2048, beyond powers of two?

2048 is played on a fixed 2D board. 2048/4096/etc are value scales, NOT literally spatial dimensions. The relevant MagicPerspective analogy is composition of transforms and interaction with stochastic world dynamics.

Each real turn has TWO different actors:
1. The agent chooses one of four directions (L/R/U/D), simultaneously sliding all tiles and merging equal values; each resulting tile can merge only once that turn.
2. ONLY AFTER a successful world-changing action, the environment spawns exactly one tile: value 2 with p=0.9 or value 4 with p=0.1, at one uniformly selected free cell.

An action producing no board change causes no spawn. Total numeric mass is conserved under sliding+merging; environment spawning adds 2 or 4.

Formal environmental transition:

    S_t --agent a_t--> Z_t = deterministicSlideAndMerge(S_t,a_t)
         --chance w_t--> S_(t+1) = Spawn(Z_t,w_t).

For n free cells after the action, 2n possible chance successors:

    P(S' = spawn(Z,cell j,value 2)) = 0.9/n
    P(S' = spawn(Z,cell j,value 4)) = 0.1/n

Chance-branch entropy for the original distribution:

    H(next board | Z) = log2(n) - 0.9*log2(0.9) - 0.1*log2(0.1).

The agent chooses the direction and consequent future chance tree, but NOT a specific spawn cell or value. Its action alters the geometry of what is possible next.

A solution shape can therefore be a contingent policy TREE, not one deterministic golden line: the organism predicts future possibilities before moving and replans conditioned on what it sees.

## Verified independent test-world mechanics

The ONLY new model file is v17/research/2048/stochastic-world.mjs. It is NOT a change to the original V17 Brain, geometry, trainer or sampler.

Independent regression suite: v17/tests/2048-stochastic-world.test.mjs.

Checks:
- 2+2+2+2 → 4,4 under left (not 8 during the same move);
- all four simultaneous slide directions and score/merge counting;
- numeric mass preserved by each player action;
- all 2n successor states with exact probabilities summing to 1;
- 20,000 seeded outcomes approximately follow 90/10 and uniform empty cells;
- no spawn on an action leaving the board unchanged;
- different actions on the same state yield different chance support sizes;
- next action planning does not read future random numbers.

One benchmark state: left/right produce 22 next-world chance branches, up/down produce 18. The action changes the STRUCTURE of random future alternatives.

## Measured experimental decision impact

Two controlled, explicitly hand-designed policies, both playing the faithful 2048 environment:
- immediate greedy: maximize immediate merged score, with simple positional heuristic only for ties.
- expectimax: enumerate all random spawn values/locations with true probabilities, look ahead one additional action, use a fixed utility for empty cells, snake placement, highest tile and immediate merge adjacency.

On 64 seeded games, horizon 140 legal moves:
- greedy average 1556.875 points
- chance-aware average 1734.875 points (+11.43%)
- paired difference +178, standard error 32.40 points
- chance-aware better in 46 cases, greedy better in 17, tied in 1
- average largest tile 156 greedy vs 206 chance-aware
- zero games reached a 2048 tile (short horizon).

The reported difference is for THIS heuristic comparison, not globally optimal play. Though RNG initial seeds match, once trajectories differ the policies do not experience identical subsequent world configurations. A manually designed expectimax planner is NOT evidence that MagicPerspective already learned to do it.

## Relation to MagicPerspective xD

Numbers 2,4,8...2048 are tile values and compression scales, NOT physical coordinate count in classical 2048. A plausible xD analogy is a reusable hierarchical macro-action that composes lower-level transforms and a predictive state representation that groups chance outcomes with equivalent future prospects. This remains a hypothesis.

Most important next experiment in native language training:
- represent a whole contextual state and its predicted future possibilities, not only individual symbol positions;
- learn action-conditioned transition and observed surprise distribution;
- predict a tree of candidate solution shapes BEFORE the next action;
- compare predicted outcomes against observed execution and update;
- reduce states only when their FUTURE solution possibilities are predictively equivalent;
- measure genuine held-out task outcomes with causal geometry permutation and chance-ablated controls.

Noise in a genuine physical quantum system, a toroidal rotation, and random creation of a 2/4 tile in 2048 are NOT proven to be the same process. The useful hypothesis is common stochastic state-transition mathematics.

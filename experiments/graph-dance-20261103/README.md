# MagicPerspective — Graph Dance Experiment

A new experimental, separate research organism for **Abstract Network**, with locally discovered graph associations and distributed phase synchronization. **Not an invocation of a physical 4D entity, a demonstration of consciousness, or a proof of general intelligence.**

## Run in Termux

```sh
pkg update -y
pkg install -y git nodejs
cd ~/MagicPerspective
git switch main
git pull --ff-only origin main
bash experiments/graph-dance-20261103/run-termux.sh
```

Open **http://127.0.0.1:3040** on the same phone. Stop with `Ctrl+C`. Standalone Node.js 18+; no npm dependencies. V1–V7 code and checkpoints remain untouched.

For a new clone: `git clone https://github.com/dan3s2020/MagicPerspective.git ~/MagicPerspective` first.

Validation: `cd ~/MagicPerspective/v6 && npm test`.
Reproducible bench: `node scripts-benchmark.mjs 120 33 12`.

## The actual node contract

- **The world owns hidden edges.** Unlike V5, the learner initially knows node IDs, their public positions, start and goal, **but not the graph's candidate links**.
- **Observation:** visiting one node reveals only its adjacent links (open or blocked) and proves that unlisted nodes have no direct link with it.
- **Association:** the agent learns `P(open link between i,j | geometry, index, structural features)` using local binary feedback. Logistic weight updates persist across independently generated worlds.
- **Communication:** only confirmed open edges permit physical message passing. Each node owns phase `theta_i` and message amplitude. Simultaneous Kuramoto-like updates use neighboring phases. The goal node is phase-anchored; other components do not communicate with it until an edge is discovered.
- **Shape:** a hypothetical path is generated from learned edge probabilities, revealed facts, costs and phase coherence. The first prediction is stored before the first move. Predicted edges can be wrong and are drawn as hypotheses, not as sensed facts.
- **Real action:** the organism can traverse **only a locally revealed open link**, even if the imagined shape includes unknown edges. After moving, local observations correct the association model; the whole route is recomputed.
- **Controls:** identical held-out seeds compare dance+online, dance+frozen, no-dance, and untrained. Cost includes an explicit failure penalty. The evaluator's optimal route never enters `AssociationRule`, `Collective`, `choose()` or `plan()`.
- **Replay:** frozen local belief, oscillator phases, route, goal-wave and visited nodes from every movement step. A separate human-only panel shows the true graph and optimal route.

## Important scientific limitations

- The initial graph shape is **guessed** from public node positions and learned priors, not known. It is not necessarily traversable.
- The update law and nine association features are explicitly defined by programmers. This experiment learns parameters, but does not invent arbitrary new laws by itself.
- High coherence is **synchronization**, not necessarily emergent intelligence. Only a reproducible superiority of navigation over matched controls would support a useful new ability.
- A synchronized group can perform worse than unsynchronized controls. The independent benchmark and its negative outcomes must be reported.
- This is one graph family with three graph-generating rules, not transfer to SAT/text/real fields.
- Local observations can reveal graph structure over time. The evaluator sees all hidden edges for reporting only.

Files: `engine/world.mjs` truth and local observation, `engine/dance.mjs` association rule and oscillator, `engine/agent.mjs` embodiment and replay, `engine/training.mjs` self-supervised learning and blind evaluation, `server.mjs` Node local runtime, `public/` interactive mobile UI, `tests/` regression suite.

`data/*.json` are local checkpoints and are excluded from Git.

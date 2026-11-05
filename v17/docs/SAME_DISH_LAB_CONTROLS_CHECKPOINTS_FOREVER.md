# SAME-DISH LAB — controls, coded checkpoints, forever training

Build marker: `SAME-DISH-LAB-FOREVER-CHECKPOINTS-20261004`

This supersedes the earlier fixed `1000`-episode dashboard behavior.

## Startup contract

- Server starts **PAUSED**.
- Training starts only after the user presses **Start FOREVER**.
- Training has no fixed episode ceiling.
- `Pause + rolling save` saves `runtime-same-dish/latest.bin`.
- The old `runtime-same-dish/same-dish-checkpoint.bin` is deliberately **not auto-loaded**.
- `AUTO_RESUME=1` is required to auto-load the new rolling `latest.bin`.

## Real lab controls

The UI exposes and persists:

- cells per organism;
- number of A organisms in each shared dish;
- number of B organisms in each shared dish;
- simulations per batch;
- optimizer microbatch size;
- requested training workers;
- requested oracle workers;
- rolling checkpoint cadence;
- frozen evaluation cadence;
- frozen evaluation map count;
- replay capture cadence;
- seed;
- exploration start/end/decay;
- A target success rule: ANY_A or ALL_A.

Topology changes create a fresh brain after first making a coded backup of the current state.

## Population semantics

A and B remain **species-level learned systems**:

- all A organisms use the persistent A Local Brain / Concept World / Concept Flow / Atlas;
- all B organisms use the persistent B Local Brain / Higher / Concept World / Concept Flow / Atlas;
- every physical organism has independent cells, positions, energy, contacts, resistance discoveries and recurrent hidden state during an episode;
- species A and B never share learned parameters with each other.

Thus `organismsA=4` means four simultaneous physical A bodies sampling one persistent A species brain, not four unrelated A brains.

## Coded checkpoint library

Manual checkpoint saves use a user-supplied code, for example:

```
A2B2-C3-R01
YINYANG-5000
B-RESISTANCE-GOOD
LIVE-ADVANTAGE-TEST1
```

Each code creates its own immutable filename under:

```
runtime-same-dish/checkpoints/<CODE>.bin
```

A coded checkpoint stores:

- full A/B trainer state;
- Local Brain A/B;
- Higher B;
- Concept World A/B;
- Concept Flow state;
- Universal Atlas A/B;
- procedural dynamics;
- counters/history;
- episode;
- seed;
- all Same-Dish Lab settings;
- code/label/build/date metadata.

The UI lists checkpoints and can load or delete them independently.

## Reset safety

RESET does not delete the coded checkpoint library.

Before a reset/config topology change, the server first creates a coded `RESET-BACKUP-...` checkpoint when the current brain has learned episodes. It then creates a deterministic episode-0 state.

## Batch / worker truthfulness

Same-Dish Lab now runs real Node worker threads for experience collection.

Contract:

1. At the start of a batch, the persistent A/B brain, Concept Worlds, Concept Flow fields, Atlas state and procedural state are frozen.
2. Each simulation gets its **own worker thread**. A worker executes exactly one simulation and then terminates.
3. Concurrency is bounded by `workerThreadCount`. Example: 16 simulations with 4 workers run as four waves of four workers, but each simulation still owns a distinct worker.
4. Workers are read-only with respect to the persistent brain. They return the complete frozen `(action, confidence)` plan for their simulation.
5. Only after every simulation in the batch has been collected does the main thread begin assimilation.
6. The main thread replays those frozen plans in deterministic simulation-index order through the real learner and applies learning sequentially.
7. No worker performs FedAvg, weight overwrite, Atlas merge, or concurrent mutation of Ω/R.

This preserves the user's earlier **one worker per simulation** rule while avoiding unsafe concurrent writes to the persistent brain.

The Same-Dish control named `optimizerMicrobatchSize` is currently used as an **assimilation chunk size**, not as V9's exact gradient-aggregation microbatch. The UI therefore labels it `Assimilation chunk`. The source-locked V9 donor still contains true optimizer microbatch aggregation; that mechanism must be transplanted explicitly before Same-Dish may claim gradient-microbatch equivalence.

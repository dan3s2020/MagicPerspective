# OCTOPUS TRANSCEND — CAPITAL A/B / Recursive Higher Self (research slice 1)

**Branch:** `feature/OCTOPUS-TRANSCEND-CAPITAL-RECURSIVE-20261030`

**Scientific status:** experimental, **CPU reference**, not yet a complete CUDA port or proof of emergent intelligence. It does not replace the original A11 visualization, native A12 CUDA or stored A12 experiments.

## User's two simulations

- **Simulation A:** only A organisms, each an autonomous body composed of two private sensory cells. Every cell has its own local learnable policy; each organism has its own learnable body controller. There is no higher inter-organism controller, brain pooling or cross-organism IPC. All actions use physically measured local contact/motor feedback.
- **Simulation B:** only B organisms, with the same cell/body rules and initial capital as A. Their public motor outputs can be communicated through a budgeted economy. Pairwise organization candidates acquire **their own perspective learners and Omega**, and a supported Omega supplies the input to the candidate Alpha of the next organization level. Higher levels are recursively proposed, rather than prescribed as a fixed tree. Training a predictive candidate is explicitly not by itself a proof of a new intelligence.

Both simulations see the **same input sequence** but have independent policies, wallets, memberships, learning curves and state. They do not inhabit a shared arena or send messages to each other.

## Mechanism, as implemented

- **Capitalism:** each cell/body/organizational perspective has an individually identifiable wallet; sensory processing, physical action and organizational compute cost resources; motor/prediction success earns measured payments; communication uses explicit transfers. The market has a fixed total supply and cannot mint money through circular trade. Candidate organizations in B are financed by member wallets rather than free capital from the bank.
- **Private sensory isolation:** a sensory cell sees one bit; the organism sees its two cells' emitted signals, not a global target. Candidate formations observe only their members' public motor/signal outputs. The global correct answer is calculated by the referee after all actions. No lower-level learner is passed the global answer.
- **Own-level learning:** cells, body controllers, candidate formations, causal and temporal perspectives, and local Omega models have separate learnable contextual action values; they update on their **own** observed success/resistance, with causal ownership retained.
- **External goal:** only the top active B Omega receives external task reward on the global bit task. The policy accepting this reward is separate from its intrinsic learned predictor. There is no task-reward backpropagation to members.
- **Dynamic hierarchy:** candidates form from available unmatched entities of the same local level. An entity can become part of a higher organization only when the candidate's recent measured predictive advantage against the independent physical readout is positive with adequate samples; once active, its Omega output can be read by the parent's Alpha. Maximum levels are a capacity bound, not a pre-created hierarchy.
- **Benchmark task:** each organism has 2 private binary sensor contacts; its body controls a binary actuator. The external benchmark is the XOR of all hidden input contacts. This is a deliberately small, inspectable research world, **not an implementation of the full open-ended Octopus concept world**.
- **Frozen validation and ablation:** training inputs and held-out inputs are distinct bitmasks; weight updates are frozen; test the exact same inputs with B Higher Self on and off. This is an intervention instrument, **not evidence that any reported improvement is necessarily causally learned or generalizes to real tasks**.

## Run

Requires Node.js >=20. After cloning this branch into a new directory:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\RUN_TRANSCEND_CAPITAL_AB.ps1 -Steps 2000 -Organisms 4
```

No Python, browser package, CUDA installation or external npm packages are needed for this reference experiment. Results are printed periodically; independent A/B progress and frozen held-out success are recorded in `runtime-transcend-capital-ab-v1/training-history.ndjson`.

**Crash recovery:** generations under `runtime-transcend-capital-ab-v1/snapshots` are immutable, include all neural tables/economic state/recursive membership with SHA-256 and are verified before being loaded. An interrupted new checkpoint or a completely zero-filled newest generation will not overwrite the previous valid generation. A history file without any recoverable neural checkpoint blocks silent fresh startup.

## Related actual donor modules (not silently replaced)

- `vendor/v9_host/src/ego-v9-vectric4v8-qanda-brsi1/higher-self.js` — differentiable GRU higher self (not instantiated by this CPU research slice).
- `vendor/v12_perspectives/src/ego-v12-perspectives-v1/perspective-router.js` — learned routing (the research slice uses separate smaller contextual routers).
- `vendor/same_dish/src/ego-v9-vectric4v8-qanda-brsi1/same-dish-body-discovery.js` — measured body-boundary discovery (not ported into the binary task).
- `docs/TEXT_A7_RECURSIVE_ALPHA_OMEGA_FORMATION_CONTRACT_20261028.md` — full recursive Alpha/Omega research contract. This version implements only a bounded slice of it.

## Unimplemented / not established

1. **Native NVIDIA multi-cell, multi-organism CUDA training** for both simulation worlds; current hierarchical economy and perspective learning is CPU-only. A12 CUDA remains untouched and independently runnable.
2. Exact interoperability with A4/A5/A7's learned tentacle/tool pools and the original A11 animated NodeGraph; this slice has real binary actions and telemetry but **does not claim UI equivalence**.
3. True open-ended endogenous discovery of novel action alphabets, perspectives, world concepts, or consciousness. The physical XOR benchmark and organization eligibility criteria are engineered experimental constraints.
4. A strictly causally identified higher-self advantage over equal-compute independently trained baselines; the ablation and held-out tests are provided to measure that, but actual training outcomes must be observed.
5. Asynchronous low-overhead CUDA weight export; the new checkpoint format covers the CPU experiment only.

No changes to `main`, any A12 CUDA source, the original visualizer or the user's existing A12 checkpoint folders are made in this branch.

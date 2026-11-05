# NodeGraph V4 — Text World Adapter

V4 does not import an old text learner. It adds a third graph that adapts local datasets into the same semantic ports already used by the current Cell / Organism / Brain architecture.

Tabs:
1. WORKFLOW / SIGNAL FLOW — structurally identical to V3.
2. BRAIN / ORGANISM INTERNALS — structurally identical to V3.
3. TEXT TRAINER — new adapter graph.

Dataset roots:
- D:\training\OpenR1-Math-Raw
- D:\training\OpenMathReasoning
- D:\training\OpenThoughts3-1.2M

Text World mapping:
- dataset prompt/prefix -> learner-visible sensors/context
- same current cells -> Cell State
- same current A/B organisms -> Organism State
- hidden correct next unit -> observer/reward TARGET only
- dataset constraints + semantic incompatibility -> RESISTANCE / RULES
- active visible units -> CONCEPTS
- same four policy channels -> ATTEND / COMPOSE / REJECT_RULE / COMMIT
- semantic outcome -> R / reward and outcome

Target-leak rule:
The hidden target is never wired into Text Sensors, A/B Local Brain or A/B Policy inputs.

Current native CUDA V4 limitation:
The native desktop simulator still reports brainTelemetryAvailable=false. Therefore the adapter can stream and animate immediately, but START TEXT TRAINING is guarded and refuses to claim training until the native GPU runtime exposes the trainable Local Brain / optimizer state. This prevents a visual adapter run from being mislabeled as learning.

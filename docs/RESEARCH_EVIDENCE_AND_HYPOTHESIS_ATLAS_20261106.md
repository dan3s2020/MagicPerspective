# MagicPerspective — full-version evidence and hypothesis atlas
**Research status:** ongoing, audit snapshot 2026-11-06. **Not peer-reviewed. No rerun or independent replication has been performed by this documentation process.**

## Canonical preservation & file census
- The original conversations remain under \`verbatim/\`, \`VERBATIM_ROOT.md\`, \`CONVERSATIE_COMPLETA_DIN_CONTEXT.md\`; full source verification is explicitly BLOCKED by the original policy. New recovered dialogue: [2026-11-06-CRYPTIC-PATH-HIGHER-DIMENSIONAL-RECOVERED-PARTIAL.md](../verbatim/2026-11-06-CRYPTIC-PATH-HIGHER-DIMENSIONAL-RECOVERED-PARTIAL.md) is labelled PARTIAL, not 100% verified.
- [Complete per-path Git blob/SHA inventory](RESEARCH_COMPLETE_FILE_INVENTORY_20261106.md): \`main\` after archive had 568 tracked files, V1 rooted in repository root and V2–V16 in separate directories. \`v17-torus-aether\` had 800 tracked files, of which 240 were in \`v17/\`. These are reference snapshots, not one combined checkout.
- Review source evidence before asserting compliance: \`verbatim/SOURCE_POLICY.md\`, \`verbatim/implementation-mirror.json\`, \`scripts/verbatim-gate.mjs\`, \`scripts/verbatim-mirror-gate.mjs\`. Existing release gate remains BLOCKED.
- Uncommitted local checkpoints, images, model weights, datasets, and other unindexed branches may not appear in these manifests.

## Technical timeline — reproducibility and limitations per version
All values below are reported by the project's own README/REPORT documents, **not rerun in this audit**. Parenthetical seed/test counts and observation scopes matter.

| Version | Distinct architecture and experimental question | Positive reported evidence | Contradictory/negative evidence or limits | Source |
|---|---|---|---|---|
| V1 (root) | Partial 3x3 sensor; neural path-occupancy heatmap; BFS oracle for labels; explicit path decoding. | Runnable Node.js 7x7–21x21 maze baseline. | Maze-specialized; not autonomous representation discovery; CPU only. | [README](../README.md) |
| V2 | Shared embedding + path occupancy; causal-cost observations; ablation. | On 7x7: trained BCE 0.32187 vs geometric 0.33593. | On 11x11: trained route effort 35.867 vs geometric 35.650; no consistent navigation advantage. | [REPORT](../v2/REPORT.md) |
| V3 | Shared neural encoder, online wall/effort prediction and updates. | Neural weights change from online experience; 11x11 BCE 0.39571 vs geometric 0.40446. | Frozen-vs-online navigation 7x7,11x11 ties; 15x15 68.958 vs 68.992, tiny difference. | [REPORT](../v3/REPORT.md) |
| V4 | Perspective selector, learned transitions, beam/trajectory search. | Initial route F1 trained 0.1585 vs untrained 0.1307. | Neutral control F1 0.1793, and cost 27.833 vs trained 32.750. Strong hypothesis fails. | [REPORT](../v4/REPORT.md) |
| V5 | Trained solution-shape organ, uncertainty, cross-map family tests. | 9x9 initial BCE ~0.334–0.362 vs baseline 0.412; 13x13 BCE 0.249 vs 0.358. | 9x9 efficiency ~0.85 vs classical 0.858; online adaptation vs frozen not established. | [REPORT](../v5/REPORT.md) |
| V6 | Learn from terrain/horizon cues; relief vs blind labyrinth. | Relief predicted path 32–34% vs 15% without organ. | Blind maze has no gain; cost 1.69–1.75x vs 1.58x baseline. | [REPORT](../v6/REPORT.md) |
| V7 | Perspective/terrain improvements and multiple specialist brains. | Relief first path 43–48%, cost 1.20x vs baseline 1.57x. | Maze cost 1.67–1.68x vs 1.58x, still worse. Many negative ablations. | [REPORT](../v7/REPORT.md) |
| V8 | Abstract graphs + target-wave 'dance' over observed and imagined edges. | Abstract graph first path 66–70%, cost 1.21–1.22x vs baseline 1.52x. | Looped/blind mazes underperform naive baseline. | [REPORT](../v8/REPORT.md) |
| V9 | Separate version path exists. | **No independent V9 evidence established here.** | \`v9/README.md\` and \`v9/REPORT.md\` still identify themselves as V8; treat results as copied/ambiguous. | [V9 README](../v9/README.md) |
| V10 | One shape organ with multi-world transfer tests (maze, graph, SAT). | Shape BCE better than next-action controls; early SAT BCE veteran 0.44/0.48 vs new 0.62/0.66. | Shape does not reliably improve steps/optimal; at step 0 full path reaches goal only 2–6%. | [REPORT](../v10/REPORT.md) |
| V11 | One shared 'polymath' across nine worlds, 2D/3D, dynamic, graph, SAT, symbols, car, text, voter. | Lower initial shape error than controls in all nine in its reported protocol; SAT solved 100% vs next-action 56% in a 16-world test. | Car 0%, graph 31%, symbols 25%; text weaker than next-action; no reliable zero-shot SAT gain; test suites small. | [REPORT](../v11/REPORT.md) |
| V12 | HTML 4D torus visualizer. | \`v12/torus4d.html\` exists. | Visualization alone is not physical 4D measurement or learned representation. | [Viewer](../v12/torus4d.html) |
| V13 | Circular alpha-to-Omega attention/perception over text. | Loop held-out bits/char 2.601 and 1.808 vs fixed B 2.808 and 2.032. | Closing the loop itself not consistently better than cut loop; advantage over frozen tiny. | [REPORT](../v13/REPORT.md) |
| V14 | Text speaking graph trained on OpenThoughts parquet, six looped levels. | Implementation and launcher specified; metrics described. | No independently reported long-run general language competence. | [README](../v14/README.md) |
| V15 | A/B bodies connected through 6-level fabric; held-out control. | Mechanism, logging and benchmark controls specified. | README explicitly says GPU run/results had NOT been performed. | [README](../v15/README.md) |
| V16 | A/B loop fabric applied to maze navigation, 3x3 perception. | 5k episodes: A+B solved 92,93,97% over seeds 7/8/9. | Control solved 95,93,98%; no clear A+B advantage. | [REPORT](../v16/REPORT.md) |
| V17 (separate branch) | Torus-Aether combined text/multiple perspectives, 5D concept geometry, 6D time+space visualization, whole-retina labyrinth, causal physical toy world, GPU batch proposals. | Reported text+field, negative ablations, 100/100 whole-retina labyrinth on three seeds, 85/90 unseen causal combinations. | Whole-retina not comparable to V16 3x3; V17 CPU text separate from GPU worlds; reported PyTorch self-test not independently reproduced here; dimensional lifting/backprop through learned projection remains a proposed experiment. | [V17 report](https://github.com/dan3s2020/MagicPerspective/blob/v17-torus-aether/v17/docs/TORUS_AETHER_ABC_20261104.md) |

## What is actually implemented (selected inspected source, not an exhaustive line audit)
### V17: path prediction with a known physical wave law
- \`v17/transcend/torus-aether/worlds/labyrinth.mjs\`: 4-neighbor BFS distance oracle; maze world physics; local five-symbol perception (N/E/S/W + goal relative direction).
- \`v17/transcend/torus-aether/worlds/exercise.mjs\`: same labyrinth exercised with a whole symbolic retina, no labels for symbol categories or action mapping. \`Discoverer.shape\` seeds attractors, iteratively propagates \`0.97 * conductance * max(neighbor values)\`, then climbs the field without revisiting nodes.
- **Distinction:** the *propagation rule is programmer-provided*. The organism learns symbol role, output displacements, passability and end-state attraction. It does not invent propagation from an unconstrained search.
- \`v17/transcend/torus-aether/worlds/transform.mjs\`: toy-world physics for movable objects, plates (reversible), levers (persistent), and doors (future action reachability changes).
- \`v17/transcend/torus-aether/worlds/causal.mjs\` and \`laws/transform.mjs\`: learned transitions, counterfactual planning and measured held-out combinations.
- \`v17/transcend/epistemic-text/engine.mjs\`: A bit cells, B hierarchical context, C validation-selected perspectives. Existing module marked immutable by V17 docs.
- \`v17/docs/TORUS_AETHER_ABC_20261104.md\`: file containing all source-provided V17 experiment descriptions and measured tables, including negative results.

## The scientific question in precise terms
Can a learner discover a **task-conditioned representation change** that improves out-of-distribution search/cost efficiency beyond matched flat-state, fixed-latent, algorithmic-planning and differentiable-planning baselines?

Let a world be a transition system \`M=(S,A,P,c,g)\`; history \`h_t\` determines a belief \`b_t\`. Learn encoders \`E_k:b_t -> z_k\` and projections \`pi_k:z_k -> b'_t\`. Each lane k predicts a future trajectory and value field. The measurable hypothesis is not 'high dimension is magic': it is that a **learned geometry / kernel** improves planning beyond matched budget and information.

A proposed objective (not implemented or validated):
\`L = L_task + lambda L_consistency + mu L_crossworld + nu L_complexity\`.
Proposed multi-lane projected update in the local linearization:
\`Delta x ≈ -eta sum_k alpha_k J(pi_k) J(pi_k)^T grad_x L\`.
This is ordinary chain-rule preconditioning, not proof of novel physics. Dimensionality must be selected via ablation, not asserted from visualization.

## Mechanism-to-visual encoding contract
| Mechanism | Live visual | Trust status |
|---|---|---|
| World state | Separate map/board with observed vs hidden coordinates | Observed |
| Shared graph | Persistent node/edge positions with real activation events | Instrumented only if backend events |
| Prediction | Transparent heatmap before the first action | Predicted |
| True distance / oracle | Optional ground-truth overlay hidden from learner | Evaluator-only |
| Path | Solid executed edges, dashed predicted edges, color for mismatch | Observed vs predicted |
| Representation lifting | Animated coordinate embedding with actual encoder vector, dimensional labels | Measured embeddings only |
| Projection | Multiple panels with linked same-step markers, mismatch scalars | Tested in original coordinates |
| Causal rules | Intervention -> predicted transition -> actual transition side-by-side | Observed prediction error |
| Lane-specific gradient | Jacobian singular values, norm, direction and step proposals | Measured tensor telemetry |
| Noise | Histograms + scale-dependent entropy & replay | Separate learned/random/temperature sources |
| Improvement | Frozen held-out metrics with confidence intervals and equal information | Evidence |
| Failures | Same figures as successes, no filtering | Evidence |
| UI | Explicit values: source/units/time/seed/model branch/learning vs inference | Required |

## Proposed decisive experimental protocol
1. Freeze one baseline commit. Preserve every original file/checkpoint; new code in isolated experimental branch with no silently edited canonical engine.
2. Use same 2D, 3D, abstract-graph, dynamic-intervention and text tasks. Compare identical sensory information, training examples, optimization steps, compute and evaluation seeds.
3. Compare baseline, fixed higher-dimensional lift, learned lift without cross-lane agreement, learned lift with agreement, random feature lift, and strong classical/differentiable planner.
4. Log every episode's first predicted field, valid path, executed actions, causal errors, lift/projection discrepancy, Jacobian statistics and wall-clock/GPU usage.
5. Evaluate zero-shot and few-shot transfer with genuinely held-out families; report sample sizes and intervals, paired seed-level statistics and negative results.
6. Ablate lane count, dimensions, observation budget, temperature, shared graph and teacher access; guard against oracle/label leakage.
7. Demand robust, independently reproduced improvements before novelty/publication claims; never conflate static torus rendering with learned manifold or quantum tunnelling.

## Literature context and non-novel components
- Hart, Nilsson & Raphael (1968), *A Formal Basis for the Heuristic Determination of Minimum Cost Paths*, doi:10.1109/TSSC.1968.300136.
- Sutton (1991), *Dyna, an integrated architecture for learning, planning, and reacting*, doi:10.1145/122344.122377.
- Tamar et al. (2016), *Value Iteration Networks*, NeurIPS 29 (differentiable planning).
- Mensch & Blondel (2018), *Differentiable Dynamic Programming for Structured Prediction and Attention*, ICML 35, PMLR 80:3462–3471.
- Absil, Mahony & Sepulchre (2008), *Optimization Algorithms on Matrix Manifolds*, Princeton University Press.

## Publication readiness: open requirements
- Resolve historic exact chronological conversation export and original media; Verbatim gates must remain BLOCKED.
- Establish an author list/affiliations, conflict-of-interest statement, dataset licensing and accessible training/reproduction artifacts.
- Rerun results on clean pinned environments and archive machine-readable metrics + seeds + hardware; inspect artifact source comparability.
- Verify branch V17 vs main lineage and consolidate without regression.
- Conduct independent review of metrics, leakage paths, experimental comparisons and novelty; prepare ethical/publication disclosures.

# Canonical MagicPerspective V1 — 2026-11-02

**Authoritative branch:** `main`.

**Research mission:** a learning system that forms an internal perspective from partial observations, predicts the shape of a potential solution before taking the first action, tests it against the environment, and corrects its perspective from experienced consequences. The long-range goal is generalization across different problem representations; that property is NOT established by V1.

**Source of original user specifications:** `CONVERSATIE_COMPLETA_DIN_CONTEXT.md` and `VERIFICARE_TRANSCRIPT.md`. Do not shorten, reinterpret, or silently rewrite prior statements. The old archive explicitly notes verbatim gaps and visual artifacts; do not turn it into a false claim of byte-exact export.

**V1 binding scientific interface:** 

1. A world owns the hidden physical truth.
2. The learner receives only a 3×3 egocentric window, an accumulated memory of observed tiles, the organism's own position and an explicit relative goal hint.
3. Before the first action, the trainable model outputs probabilities over the full *shape* of a potential route.
4. An explicit decoder turns the distribution into a connected candidate route; it must not have access to hidden walls or teacher path.
5. Actions are executed by world physics and update the learner's belief based on observations; collisions are recorded as resistance.
6. During training, the teacher's reference path guides backpropagation; at evaluation, the teacher supplies only diagnostic scoring.
7. Every claimed gain must be measured on held-out seeds and contrasted with honest baselines.
8. Do not label any future cross-domain transfer, dynamic perspective invention, superintelligence, or P=NP assertion as proven without appropriate independent tests.

**Run:** `bash run-termux.sh`, open `http://127.0.0.1:3030`.

**Exact test commands:** `npm test`, `npm run bench`.

**Implementation:** standalone Node.js with no runtime dependencies and no import from OctopusV2. `data/weights.json` is local state, not source code.

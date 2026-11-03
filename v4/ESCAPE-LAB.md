# MagicPerspective V4 — Perspective Escape extensions

This additive research laboratory lives next to the existing V4 Perspective Forge, which remains untouched. It uses separate sources, separate checkpoint (data/escape-checkpoint.json), separate tests, and port 3037. V1/V2/V3/V4/V5 applications and checkpoints are not migrated or overwritten.

## Termux install and run

```bash
pkg update -y
pkg install -y git nodejs
cd ~
if [ ! -d MagicPerspective/.git ]; then git clone https://github.com/dan3s2020/MagicPerspective.git; fi
cd MagicPerspective
git switch main
git pull --ff-only origin main
bash v4/run-escape-termux.sh
```

Open http://127.0.0.1:3037 in the same phone browser.

## Three scientific experiments

1. **Latent viewpoint construction** — a hidden three-parameter solid is observable only through 2D `front`, `side`, and `top` measurements. The learner receives pairs but not the hidden coordinates or mapping. Across observed worlds it discovers equality correspondences between view slots; its number of internal latent groups contracts from 6 toward 3 when justified by 12 or more repeated observations. The withheld test has only `front` and `side` observations; prediction of `top` must beat a non-relational independent-prior baseline. This is *limited equality-based discovery*, not an arbitrary 3D inverse-rendering engine.

2. **Unknown causal operator discovery** — two hidden numeric operators over `mod 11` may be addition, multiplication, affine, or a quadratic rule. The learner enumerates representational hypotheses, uses action-result samples to eliminate inconsistent laws, can change its active hypothesis family and performs bounded counterfactual planning. Its evaluation uses values 6–10 never shown during identification (only values 0–5). The comparator assumes addition only. All worlds are seeded; no teacher formula enters the learner's observations.

3. **FTU conservation laboratory** — a toy chemistry planner enforces C/H/O atom conservation. It rejects `water → ethanol` in a closed inventory lacking carbon and finds a balanced idealized glucose fermentation equation when a suitable carbon source exists. This is a constraints demonstration, not a real wine manufacturing or mind-over-matter method.

## Honest assessment of capabilities

The three experiments are separate baselines, not one integrated emergent general intelligence. The projection module searches equality-linked latent groups, the numeric module searches a fixed but extensible library of rule families, and the chemistry planner uses a supplied balanced reaction library. Neither the true model family nor a general algorithm for inventing wholly new scientific concepts is discovered. A successful hold-out test is a narrow positive result.

All source learning consumes observation and action outcomes only. Teacher state appears in **human diagnostics** and tests, not in the learners. No cross-domain weight transfer between the three experiments is claimed.

## Reproducibility

```bash
cd ~/MagicPerspective
node --test v4/escape-tests/*.test.mjs
node v4/scripts-escape-benchmark.mjs 100 100
```

Existing suites must also pass:

```bash
npm test
(cd v2 && npm test)
(cd v3 && npm test)
(cd v4 && npm test)
```

The blind evaluation uses `seed=990011` for projections and `seed=910037` for causal rules; these are disjoint from the corresponding training seeds. For scientific claims, use new sealed test seeds after freezing the architecture and replicate across multiple independent random initializations.

## Provenance

The original conversation archive remains `CONVERSATIE_COMPLETA_DIN_CONTEXT.md`. `VERIFICARE_TRANSCRIPT.md` explicitly states it is **not** a native byte-perfect export. No gap is automatically filled or silently paraphrased. The Hermes/Plato/FTU interpretation is the research motivation rather than evidence of supernatural intervention.

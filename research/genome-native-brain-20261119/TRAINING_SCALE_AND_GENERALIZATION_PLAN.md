# More training: what it could mean, what it cannot establish, and how to test it

**Planning only. Not executed. No training/scores beyond those in `RESULTS.md`.**  
Date: 2026-11-19  
Objective: turn a perspective-sensitive DNA classification observation into a reproducible *new causal capability of the original organism* without adding a replacement prediction head or changing working V42.

## Verified starting point

- Original V42 `Brain.live()` and `Brain.predict()` learned from **900** 60nt labeled observations, or **59,400** lived training symbols in the successful four-nt-view experiment.
- UCI dataset has 3,190 rows; after the existing deterministic group split and duplicate-cross-boundary exclusion, **2,408 unique train-eligible rows**, 597 heldout-eligible rows; 400 used for exploratory development and the remaining 197 used for one confirmatory evaluation.
- Frozen confirmatory result: **77.66% accuracy / 76.97% macro-F1** on 197; canonical GT/AG rule: **88.83% accuracy / 87.44% macro-F1**.
- The real performance bottleneck is *not known*. Evidence supports a short temporal information bottleneck in the initial input ordering; it does **not** prove model capacity, data size, number of passes or long-range reasoning is the dominant limit.
- 197 confirmatory observations have already been evaluated and must not be reused as a fresh unbiased final test after any additional model selection.

## Plausible outcomes from more training (hypotheses, NOT numerical forecasts)

| Increasing training | Potential upside if hypothesis is true | Potential failure / confound | New evidence required |
|---|---|---|---|
| 900 -> ~2,408 train-eligible examples, same viewpoint | Better statistical coverage of minority splice classes and atypical motifs | Saturation; amplifies fixed short-window bias; more examples of familiar motifs may not add information | **Pre-registered** learning curve and independent new test, multiple seeds |
| More unique organisms/tissues/species | More invariant biological relationships | Domain shift, leakage across homologous sequences, annotation inconsistency | Family/chromosome/species split, explicit stratification, same evaluation labels |
| Longer, diverse DNA context (60nt -> 256nt -> 1k/10k/...) | Long-range regulatory evidence | Native C may not retain earlier bases at all; merely increasing input length can make results worse | An actual native retention/navigation experiment with protected long-distance labels |
| Longer exposure/epochs on the same records | Better convergence (if undertrained) | Memorization; repeats do not provide new biology; can mask one-class collapse | Training/validation curves, deduplicated unseen evaluation and stopping rules |
| Autonomous perspective discovery | Discovery of local/nonlocal patterns not manually positioned | Selection overfitting or synthetic search heuristic disguised as the organism | Causal perspective actions owned by same original Brain, blind target, ablation |
| Cell-condition and reference/alternative variant worlds | One step toward AG2 functional prediction | Different target and very sparse data; biological context missing | Measured assay effects and AG2 on exactly matched same split |

**Important:** no legitimate projection `900 training rows -> N rows -> 95% accuracy` can be derived from a single experimental point. More training is an *intervention to measure*, not a claimed improvement.

## Priority 0: ensure external scientific credibility (before optimizing)

1. Freeze the existing V42 source, seed, data hash and original metrics.
2. Obtain a genuinely independent splice-junction dataset with clear genome build and gene/homology information. Keep it unseen until all method/parameter selection is frozen. Record license, accessions and SHA256.
3. Avoid homologous leakage (e.g. group by gene family or sequence similarity, chromosomes or organism); publish how pairs cross groups. The current identifier-prefix grouping is only an imperfect proxy.
4. Use at least three biologically meaningful controls: majority class, simple GT/AG motif rule, and a trained small conventional model for *measurement only*. The original organism remains the research subject; no conventional model is installed inside it.
5. Treat confidence intervals and paired comparisons seriously. With only 197 final examples, +1 correctly classified example changes accuracy by about half a percentage point. Record per-example predictions to permit paired McNemar/bootstrapped inference and error analysis.
6. Verify no inference-time answer, label, gold path, or unseen assay outcome enters the organism; use data-leakage sentinels.
7. Freeze and document *before* collecting results. No iterative prompt/viewport tuning against final data.

## Priority 1: causal training-data scaling curve — NOT merely the old experiment rerun

**New scientific question:** With the same fixed useful native perspective, are the remaining errors caused by insufficient data, by information absent from the four-base window, or by class/sequence-specific limitations?

Pre-register the learning curve before running it. Example nested train sizes drawn only from the 2,408 train-eligible examples:
`75, 150, 300, 600, 900, 1,200, 1,800, 2,408`; several fixed seeds/order permutations. Preserve identical frozen evaluation for each point.

Required analyses:
- Accuracy, **macro-F1**, balanced accuracy and per-class recall with uncertainty.
- Area under learning curve or data efficiency *against motif rule and majority*; do not cherry-pick the best seed or one metric.
- Error slices: canonical vs noncanonical sites, novel vs known motifs, low-complexity segments, similarity to training data, per-class confusion.
- Interventions: preserve counts while shuffling label mapping (negative control); shift the native four-base perspective away from the junction without changing input length; inspect whether performance vanishes.
- Predefine saturation, regression and continuation decisions. Example: if a statistically informative improvement is not supported and novel motif errors persist, **stop adding only more copies of the same data** and examine perception/representation.

This is a test of a **new limiting-factor hypothesis**, not a repeated claim that 900 training examples succeeded.

## Priority 2: make the SAME organism select the informative perspective

**Highest possible novelty payoff, but currently unimplemented/unverified.**

Replace the human choice of `dna.slice(28,32)` at decision time with actual **native organism navigation/actions** that can choose what to inspect from the available sequence before the final decision. Do not create an independent perspective-search predictor and call it V42. A genuine success requires that the learned choice belongs to the original Brain/Discoverer state and changes its future behaviour through observed action consequences.

Candidate world (research specification, not an implemented algorithm):
- World objects: fixed DNA sequence, unobserved junction/outcome, observable partial windows, organism's native body/memory.
- Available actions: native movement among local sequence windows or levels of resolution; actions reveal *input* information, never the ground-truth class.
- Training feedback: biological class/outcome after the episode; holdout labels must remain hidden throughout inference.
- Key claim test: with junction position shifted/unknown and noncanonical motifs, the organism **chooses** informative regions before predicting, better than static or random viewpoints.
- Controls: same observation budget, random window navigator, hand-coded consensus motif, native fixed viewpoint, no-op/ablated action-memory path.
- Must show a causal link between native `Brain.live`, persisted perspective action state, and increased blind accuracy. A decorative 4D visualization or a newly introduced ML optimizer is *not* evidence.

Pass criteria: robust improvement on a new external dataset, across multiple seeds and sites, while preserving all original V42 behavior. No claim of discovery from a synthetic controlled target maze alone.

## Priority 3: a real variant-effect world

This is the path toward meaningful AlphaGenome 2 comparison.

A single episode might contain:
```
Reference sequence (same biological locus, correctly aligned)
  -> choose condition / cell type or state (known input)
  -> introduce a measured sequence variant (intervention)
  -> original Brain navigates transformations and predicts a
     numeric or categorical *change* in observed activity
  -> only then reveal independent measured assay result
  -> original Brain updates its lived state
```

What matters:
- Real measured variant-effects, not merely the GT/AG consensus label.
- Biological metadata: variant coordinates, genome assembly, alleles, affected gene, tissue/state, assay, replicate counts and quality.
- Evaluation with *strictly disjoint* variants, loci, genes/families, donors/cell states where appropriate.
- Domain-appropriate metrics: correlation/mean error for quantitative activity; AUPRC/recall at fixed precision for causal variants; sign accuracy when effects are sufficiently certain.
- An external AG2 result for the exact same cases, API version, conditioning and metric.

This may require necessary extensions of the **same** original organism (e.g. native actions/state for long-range observation), not replacing it with a pretrained genomics model.

## Priority 4: long-range perspective and efficient compute

Our current organism observes useful evidence at the *last four symbols* directly seen by its `C` decision channel. The full 60nt being present earlier in training history does not guarantee its relevant signal survives until prediction.

For 256nt/1k/10k/1Mb experiments, only report success if:
- The original organism's internal memory/graph/action records can be shown to transmit *remote* sequence evidence to the output.
- Shuffling remote regulatory elements without changing nearby motifs changes prediction correctly on **real measured long-distance tasks**.
- We report actual memory use, throughput, FLOPs/energy where measurable, and compute-normalized performance.
- Functional performance cannot be explained by a last-four-base motif shortcut.

GPU acceleration alone may reduce runtime; **it is not evidence of improved biological generalization**. A low-resource advantage is credible only with measured cost-normalized, quality-matched comparison.

## Priority 5: replication across worlds and modalities

After a validated variant-effect result, explore whether the organism's *same learned native states* can adapt to other tasks: alternative splicing events, chromatin accessibility, small gene-regulatory perturbations or different cell states. Distinguish:
- **From-scratch task training** (not transfer),
- **Few-shot adaptation** (same saved organism; measured additional examples), and
- **Zero-shot transfer** (no new labels; strongest claim, presently unsupported).

Document a full change-of-domain ablation: restart the same Brain and compare to the saved DNA-trained Brain on the exact same new task.

## Critical stop/go criteria

- **GO on more labeled data** only if the scaling curve demonstrates a nontrivial and statistically stable incremental benefit on truly unseen independent DNA, not just a higher development accuracy.
- **GO on perspective discovery** only if the original Brain itself selects the windows/actions and improves unknown-position held-out classification with fixed compute/observation budget.
- **GO on AG2 comparison** only when measured *variant effects and biological conditions* align between systems and API permissions allow it.
- **STOP / disclose negative result** if native predictions collapse to one class, motif-only rule dominates after sufficient testing, holdout leakage is detected, or the predicted effects are not responsive to biologically meaningful interventions.
- **NEVER** relabel an improvement on short 3-class splice-junction accuracy as superiority to AlphaGenome 2.

## Expected benefits if the hypotheses hold (conditional only)

Successful scaling would imply: a more general *way to use the native organism* as a data-efficient adaptive biological predictor; automatically learned transformations; more reusable organism memory across worlds; and eventually more efficient genomic experiments. None of these follow automatically from the measured 77.66% accuracy.

For a credible research pitch, the most compelling future result would be **the SAME original organism discovering which genomic perspectives to inspect without hand placement, transferring this strategy to a new biological assay, and retaining performance under strong family-disjoint controls at lower measured compute**.

## Documentation and historical non-regression

- All V42 executable code, UI, checkpoints, existing GGUF research paths and user-banned experiments remain unchanged.
- Avoid repeating prior numeric/embedding/FFN/lexical assimilation tracks from Braivour as a supposed genomics solution.
- This plan does not authorize making up user checkpoints, synthetic "new" biological labels, or an unattained AlphaGenome 2 score.
- Each future training run must save source SHAs, dataset hashes, exact split IDs, environment, seeds, configuration, raw per-example outputs and failures in an isolated branch.
- Official AlphaGenome 2 overview: https://deepmind.google/blog/alphagenome-2-deciphering-how-cells-read-dna-to-better-understand-disease/
- [Exact previous results](./RESULTS.md) | [Interpretation](./SCIENTIFIC_SIGNIFICANCE_AND_HYPOTHESES.md)

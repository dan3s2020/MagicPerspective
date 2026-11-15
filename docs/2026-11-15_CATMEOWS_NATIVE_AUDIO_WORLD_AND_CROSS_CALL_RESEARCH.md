# 2026-11-15 — CatMeows original Braivour / native acoustic world, NEW causal evidence

## Status: actually executed; not animal communication translation

The original V42 Brain and its owned ConstructedPathLearner / Discoverer are run from the pinned MagicPerspective source on a *separate experimental branch* `experiment/CATMEOWS-OBSERVED-AUDIO-WORLD-20261115`. This does not update active Braivour/MagicPerspective main branches or user checkpoints.

Actual original dataset.zip: 440 genuine WAV recordings, 21 cats, 12 owners; MD5 `b5fa911bcd6514e39dfef6876f747df4`. Official extras.zip: 30 uncut sequence WAVs, 160 energy-bounded candidate bursts, from 12 cats/7 owners, MD5 `7663bb5e1de2c808beeb202a52dc99ab`. Bursts may include non-meows; no receiver behavior is annotated. No invented audio or contextual training labels enter the actual new Brain's sensors. Across heldout groups, all cats and owners are disjoint from training; assignment accounts for owners sharing cats.

### NEW mechanism (not previous suffix-copy experiments)

`research/catmeows_native/native_acoustic_world.mjs` uses the single original `Brain` and its own six `constructedPaths.scales[i]` graphs. Every real acoustic temporal observation is first `Brain.live()`, and the original `ConstructedTransitionGraph.observe(from, ADVANCE, to)` internalizes time-forward successor states. At evaluation the SAME native graphs choose the next state using `predict()`, **before the future frame is heard**, with no label/context/identity supplied. The fixed multiscale readout uses evidence thresholds from native graph edge counts; it is NOT a second trained model and no oracle is injected.

Controls: same real input data trained chronologically, completely reversed, or randomly permuted in time; baseline exact previous-frame value. This tests physical temporal causality rather than only context-label accuracy.

### Real 440-WAV original native world result

Actual GitHub Actions: https://github.com/dan3s2020/MagicPerspective/actions/runs/43741652149
Artifact: `original-braivour-native-acoustic-world-physical-heldout`, including all raw per-frame predictions.

The selected acoustic time-change multiscale policy on **27,720 heldout next-frame channel values**:

- Original native Brain chronological: **16,497 / 27,720 = 59.513%**.
- Repeat the immediately preceding acoustic value: **16,108 / 27,720 = 58.110%**.
- Brain trained with real WAV frames reversed: **16,324 / 27,720 = 58.889%**.
- Brain trained with each WAV's frames permuted: **14,653 / 27,720 = 52.861%**.
- Thus *selected* original native graph gained **+389 correct channel values** or **+1.403 percentage points** against acoustic continuity on the same unseen cats.
- Raw paired prediction changes: changing chronological training to reverse changes **5,404 / 27,720 = 19.495%** of predictions; permuting changes **8,790 / 27,720 = 31.710%**. The earlier suffix-copy model was entirely insensitive to reversal.
- 11 groups formed by cat/owner connected-components, 15,000 deterministic cluster bootstrap replicates: observed native advantage +1.403pp, descriptive 95% percentile cluster interval approximately **+0.917 to +2.069pp**. **Post-selected policy**, not an independently preregistered statistical discovery; do not claim formal population significance from this alone. Audit output created locally: `catmeows_native_audio_cluster_audit.json`.
- Absolute spectral view was not a success: multiscale accuracy **54.578%** versus previous-frame continuity **56.194%**. Retain this negative.

### Separate source validity: original uncut WAVs (critical non-success)

Actual GitHub Actions: https://github.com/dan3s2020/MagicPerspective/actions/runs/43742221759
Source: 30 *different* official uncut audio sequence recordings, 160 candidate acoustic bursts, 10,080 temporal heldout predictions. Train the fixed audio-change multiscale mechanism on separate owner/cat groups from the 440 original clips.

- Native chronological **73.254%**.
- Previous-frame continuity **73.224%**.
- Native reverse-trained **72.341%**.
- Native permuted-trained **66.567%**.
- Therefore the selected method still recognizes some chronological structure on different source material, but **its advantage over trivial continuation virtually vanishes** on external recordings. This is not verified broad generalization.

### Original Discoverer.shapeGraph() genuine attempt and why it failed

Original native `Brain.disc.shapeGraph()` was actually called on a topological audio world learned by the Brain's original `constructedPaths.links.observe()`, using 64-state and 144-state acoustic representations. The only physical observed episode goal was end of signal (silence), never a fabricated cat message. Source: `research/catmeows_native/native_acoustic_shape_world.mjs`.

Actual GitHub Actions: https://github.com/dan3s2020/MagicPerspective/actions/runs/43742661682

- Native graph readily produced a route to the terminal silence, but route lengths ~1.0–1.5 transitions in the test episodes. On many groups, early path prediction was **markedly worse** than one-step transitions in the same learned graph.
- Because the goal is physically trivial "sound ends", the original shape ascent finds shortcut-to-silence routes rather than an acoustic message trajectory. Ending a recording is NOT a semantic goal. **Do not claim success based on high target-reached rate.**
- Targeted causal intervention supplied the originally observed edge-transition probability as original `shapeGraph({edgePreference})`, with no replacement planner; https://github.com/dan3s2020/MagicPerspective/actions/runs/43742948910. **All 18 reported aggregate route metrics remained unchanged**. Avoid more superficial edge-weight scans.

### First real vocalization-to-vocalization structural test

Same Brain graph used on original 30 uncut sequences, predicting each next candidate burst from preceding calls with NO context or recipient labels. Controls included true chronological call order vs reverse and permutation; a second causal experiment transferred acoustics learned *inside* 440 independent meows to the NEXT CALL transition graph in the SAME Brain.

Actual GitHub Actions: https://github.com/dan3s2020/MagicPerspective/actions/runs/43743306600

Across 130 actual next-call situations (1,170 acoustic feature forecasts), chronological:

- Last-call value baseline **44.188%**.
- Native call-only graph **35.385%**.
- Native original Brain with chronological within-call pretraining and subsequent real between-call learning **41.880%**.
- Exactly same but PRETRAIN within-call WAV frames permuted **41.795%**.
- Cross-scale exposure helped ~6.5 percentage points relative to call-only graph but **did not beat the physical last-call baseline**; the near equality of original and shuffled PRETRAIN indicates this transfer advantage largely uses static acoustic distributions rather than a learned transferable chronological language law. No verified cat semantics.

### What remains unresolved

1. The CatMeows WAV data contains three eliciting contexts but NO measured behavioral recipient responses, intentions, or verified meanings. Predictive context correlation is not message decoding.
2. The original 8-frame acoustic compressive perception may discard useful pitch modulation, call timing, and fine spectral structure.
3. Audio-only native graph learns partial within-call temporal dynamics but cannot yet transfer stronger than basic continuity to the unseen external audio source, nor infer between-call structure.
4. Purely pursuing context-label % or artificial end-of-file goals is explicitly rejected. We need native perception/action/trajectory learning with real receiver/environment feedback to ground actual biological communication.

### Next falsifiable experiment (not rerun of an old failure)

- Keep the SAME original Brain world/action ontology and test physically improved fidelity: 24 waveform-derived acoustic frames at a 512-sample FFT window vs old 8 frames at 2048 samples. Source code `prepare_highres.py`, `native_highres_world.mjs`, fixed original policy; strictly owner/cat heldout, time-permuted negative controls.
- Separately verify on the uncut extras with same high-fidelity ear `prepare_sequences_highres.py`, `native_external_highres_validation.mjs`.
- Do not claim success until an untouched source improves against same observed prior-frame and shuffled-time baselines. If not, treat as non-transfer and return to a world containing observed *receiver outcomes*, not another scalar-output classifier.

**Provenance:** all listed runs executed to completion, logs and raw predictions available via linked GitHub runs. Any future experiment reports must append *new, directly measured evidence only*. No code merged to main.

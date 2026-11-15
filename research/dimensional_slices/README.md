# Original V17 Brain — true 4D geometric sections, complementary A/C perspectives

## User request
- "Ying yang is our a and c perspectives or something that works better"
- "We just need to make it like with those shapes,s transformation of the forms by slice of dimensions and yes everything you i said"

## Executed results and full research ledger

**See [RESULTS_20261116.md](./RESULTS_20261116.md)** for all three executed original-organism tests, including the failed passive predictor, successful native motor learning, the learned causal A/C morphology advantage, object-cluster confidence intervals, and all caveats.

Run the actual original-body stages (unchanged source imported from V17) on Node 22:

```bash
node research/dimensional_slices/native_ac_pairing.mjs
node research/dimensional_slices/native_ac_action_world.mjs
node research/dimensional_slices/native_ac_lived_form.mjs
```

The third test actually ran on GitHub Actions (25 unseen physical 4D orientations). Cross-perspective moving actions: native paired-learning occupancy F1 71.99% (combination weighted by 83+83 paired actions), shuffled-learning F1 68.11%; gain 3.885 percentage points, exploratory object-cluster sign-flip p≈0.0058. Exact full-form recovery is still not achieved, and no claim of GGUF intelligence transfer is made.

## Original-organism execution
`native_ac_pairing.mjs` imports the **existing unchanged** `Brain` and uses its native `live` and `predict` methods directly. The Brain's persistent `Discoverer` remains part of the same organism and is checked for frozen-evaluation mutations. This is not a new neural network, generic autoencoder, GAN, classifier, or standalone substitute. This experimental stage tests native perceptual prediction, **not** full `Discoverer.shapeGraph` navigation; claiming that would be incorrect.

## Causal world
An actual 4D tesseract (16 4D vertices, 32 edges) undergoes 4D plane rotations. For five different `w=h` hyperplanes, the world intersects the actual rotated 4D edges, generating 3D points. Two complementary 2D cameras yield quantized 4x4 point-density rasters. The original Brain sees *only* A/C raster values and delimiters, not the 4D state, rotation, slice depth or source identity.

During training it lives pairs A→C. During heldout evaluation it sees A, then generates all 16 C symbols **autoregressively**, where no real C token is provided as next-input feedback. A complete frozen heldout C reference is used by the scorer only, never by the Brain.

## Controls and acceptance
- Matched original Brain vs an identically initialized original Brain trained on shuffled A/C pairings.
- A→C identity baseline (copy the observed raster).
- Heldout objects: entirely different 4D rotation seeds from training.
- Metrics: full-shape exact rate, per-cell accuracy, occupied-cell F1, generated symbol out-of-range fraction, MAE.
- Verify shape diversity and that neither original native Brain is trained during heldout testing.
- A positive claim requires clear heldout wins over **both** controls; a failure is also a real result.

## Run
```bash
node research/dimensional_slices/native_ac_pairing.mjs
```

Result: `runtime/dimensional_slices/real_4d_native_ac.json` (generated at runtime, **not** prewritten).

## Separate unsolved goals
This does **not** reconstruct the full 4D object, resolve mathematically non-identifiable slices, prove quantum mechanics, demonstrate GGUF intelligence assimilation, or test the original Discoverer navigating the slice manifold. Those require follow-up body-action experiments and frozen tests rather than invented success claims.

Existing V17 user intent, historical source, active branches, UI, CUDA, checkpoints and GGUF experiments remain unchanged.

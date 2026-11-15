# Braivour — Original Native Auditory Body / CatMeows Sound World

This experimental branch runs the REAL original MagicPerspective `Brain`, `Discoverer`, and `ConstructedPathLearner` as a physical action-consequence body in a world built from original checksum-verified CatMeows audio.

There is NO surrogate neural classifier or externally trained sound generator. The original Brain holds:
- the lived 48×9 auditory states from real CatMeows WAV,
- the actual observed forward-time transitions in `brain.constructedPaths.links`,
- its active bodily motor movements and attraction in `brain.disc`,
- the original body's acoustic morphology in `brain.auditoryBody`.

The auditable game is a **12×12 controllable pitch/loudness slice** through the 9D sound state. Only pitch and loudness are actively moved; harmonicity and six spectral bands remain in the body's lived sound memory. Movement is permitted ONLY over observed one-step forward acoustic transformations. Large jumps are excluded, not synthesized. The body learns the eight raw output symbols by living their results, then uses original `Discoverer.shapeGraph()` to plan routes before acting. Neither semantic labels nor a learned sound AI are provided.

## Verified 2026-11-15 test evidence

- **Chronological actual 440 WAV experiment (fold 0, raw state and WAVs):** https://github.com/dan3s2020/MagicPerspective/actions/runs/43749222486
- **True heldout folds 1 and 2:** https://github.com/dan3s2020/MagicPerspective/actions/runs/43749504197
- **Whole original Brain saved/reloaded and frozen gameplay passed:** https://github.com/dan3s2020/MagicPerspective/actions/runs/43749811152
- **Exact persisted original Brain .v8 restored in a NEW PROCESS, without training, new audio imagined and rendered:** https://github.com/dan3s2020/MagicPerspective/actions/runs/43750369957
- Full research report: `docs/2026-11-15_CATMEOWS_ORIGINAL_NATIVE_EMBODIED_AUDIO_WORLD_RESULTS.md`

Heldout results: original Brain achieved 100/100, 100/100, 100/100 playable acoustic-target goals in three disjoint cat/owner folds; cold original body achieved 6/100, 5/100, 4/100. The user-provided acoustic endpoint is visible as a goal, as in original MagicPerspective. This is NOT proof that it predicts the natural future vocalization, understands the message, or has already embodied all 9 auditory degrees of freedom.

The native experimental sound renderer makes short (48 frames, 0.96s) 8 kHz WAVs from real original motor trajectories; it cannot guarantee recognizable natural cat vocalizations. No raw donor waveform PCM is included.

## Run exactly on Windows PowerShell

Requirements: Git, Python 3 with NumPy, Node.js 22.

```powershell
git clone -b experiment/CATMEOWS-TEMPORAL-BODY-WORLD-20261115 https://github.com/dan3s2020/MagicPerspective.git MagicPerspective-CatBody
cd MagicPerspective-CatBody
py -m pip install numpy
py research/catmeows_native/prepare_generative.py

$env:CATMEOWS_BODY_FOLD = '0'
$env:CATMEOWS_BODY_GAMES = '320'
$env:CATMEOWS_BODY_AUDIO_ORDER = 'chronological'
$env:CATMEOWS_SAVE_NATIVE_BRAIN = '1'
node --max-old-space-size=6000 research/catmeows_native/run_temporal_body_game.mjs
py research/catmeows_native/render_temporal_body_audio.py
```

Outputs are under `runtime/catmeows/`, including four synthesized WAVs and the entire original Brain checkpoint `Original_Braivour_CatMeows_TemporalBody.v8`.

## Resume exact learned original organism, no retraining

```powershell
node --max-old-space-size=6000 research/catmeows_native/resume_temporal_body.mjs runtime/catmeows/Original_Braivour_CatMeows_TemporalBody.v8 29173
py research/catmeows_native/render_resumed_body.py
```

The original Brain is loaded using its **own** `Brain.load()`. Only the new auditory-body class methods are reattached after load (because those new class definitions did not exist when the original Brain class registry was authored). All original learned sound transitions, sensor states, native action effects, and attractors come from the checkpoint itself. The separate official CI job verified this exact restore-and-dream route.

**Preservation:** No original main branches, donor model weights, other agents' experiments, or running checkpoints were changed. All additions are confined to this explicit experimental branch. Do not merge the prototype on the strength of goal navigation alone.

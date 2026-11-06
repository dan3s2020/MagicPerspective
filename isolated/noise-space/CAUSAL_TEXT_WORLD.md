# MagicPerspective V17 — language action world (isolated experiment)

Base branch: `experiment/V17-REAL-TEXT-NAVIGATION-20261106`. Experimental branch: `experiment/V17-CAUSAL-LANGUAGE-ACTIONS-20261106`.

## What changed

- The original V17 `Brain`, the existing PyTorch/CUDA text batch, `TextActionPaths`, maze and transformation code are kept intact.
- The original OpenThoughts Parquet Q/A loader supplies training rows to an **additional action environment**. The reference answer is withheld from the policy. Each learner-selected opaque action changes a draft world, and the environment returns actual state differences and a training-only progress signal.
- `ActionDynamics` discovers consequences from observed `before→action→after` events, including explicit pre-action predictions. It does not read the environment's private tool mapping. Invalid / resisted actions do not become false physical laws.
- `TextValueField` learns an empirical reward-gradient approximation from real Q/A training feedback. This is not a verified semantic value function. It uses a bounded context/prefix/action table; it is not a D-dimensional neural field.
- `CausalTextAgent` explores the action world, tests alternative actions from the original V17 corpus-derived navigator, and saves learned effects and values. Goal-length priors are learned from **previous training** answers. Held-out reference answers cannot enter the action policy.
- Action observations are optionally fed back through the original `Brain.live()` graph (ASCII event protocol) on TRAINING rows only. This is how original V17 graph observes the new action/reward stream; it does not imply its native causal policy has learned semantics.
- The existing `brain.v8` file and CUDA implementation are unchanged. The experimental world checkpoints separately in `runs/<MP_SESSION>/causal_text_world.json`.
- The dedicated `/language-actions.html` page draws the measured action-state trajectory, predictions, feedback, and frozen held-out examples. Horizontal position represents time; it is not a fabricated hyperdimensional embedding.

## What it is **not**

- Not proof of general natural-language reasoning or a discovered language manifold.
- Not CUDA training of the new action-value field (the **original V17 TextCard** may use real CUDA; the new field remains CPU).
- Not a reliable correctness signal for open-ended Q/A. Reward is a *training-only lexical similarity heuristic*; semantically correct alternate answers may be penalized and incorrect overlapping answers may score well.
- Not transfer of learned latent representations from labyrinth or transformation games to natural language. V17 receives traces, but no proven policy transfer occurs.

## Requirements and reproducibility

From a **separate clone** of the experimental branch, run:

```powershell
node --test isolated/noise-space/causal_text_world.test.mjs
# Existing regressions must still pass:
node --test isolated/noise-space/*.test.mjs
# Existing launcher after CUDA setup (if desired):
powershell -NoProfile -ExecutionPolicy Bypass -File .\START_NOISE_SPACE.ps1
```

Open `http://127.0.0.1:8897/`, select your actual Parquet Q/A dataset path, enable text. In the new world the first training episode probes opaque action effects using observations; subsequent episodes update dynamics and value estimates. Inspect `http://127.0.0.1:8897/language-actions.html`.

A 4GB VRAM setup should configure the original V17 GPU text batch conservatively. New JS learning does not execute on the GPU and may limit throughput. No silent CPU fallback is claimed as CUDA.

## Evaluation contract

Training experiences may contain the reference answer **only inside `LanguageWorld.reward()`** and in a length-prior update at the end of training; neither is passed to the action-selection method. The frozen evaluation calls `CausalTextAgent.navigate(prompt)` first and computes lexical metrics only afterward. Repeated held-out questions are evaluation-only and never update action dynamics, reward field, or original V17 `Brain`.

The real OpenThoughts dataset on the user's D: disk is not accessible in this tool environment; all local tests use short illustrative Q/A strings and validate mechanism/integrity, not generalization. Real-corpus performance must be checked after running on the user's computer. Avoid any 100% success claim for unrestricted language.

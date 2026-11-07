# V26 actual source, execution and acceptance evidence — 2026-11-07

**STATUS: REAL TRAINING UI WORKS IN CI / SEMANTIC Q&A TARGET OPEN.**  
**Native test CI SHA:** b1ac36a371f260304e50d5f2733645bce0351c59 (the commit which triggered the final acceptance run).  
**GitHub Actions run ID:** 42344117032.  
**Workflow:** .github/workflows/v26-native-live-training.yml.  
**Browser proof:** v26-real-browser-ui screenshot artifact included in this run.  
**Isolated PR:** #61, draft; target V25 experimental branch, not main.

## What has actually run, not inferred

Node 22 GitHub Actions Ubuntu:
- 6/6 native Node engine/session/server tests passed. No skipped case counted as a pass.
- 120/120 complete predicted initial full text states, with test texts of 1,024, 2,048 and 4,096 tokens and 698 independently executed, correct observed edit actions.
- 50/50 frozen holdout controlled corpus-state exercises correct in the integrated native training session. Model checkpoint unchanged during holdout.
- 84/84 original 2D Discoverer shape parity checks with previous frozen original code. 128 seeded-noise trials produced 116 distinct alternative full paths.
- 10 discrete learned axes, 1,024 real combinatorial graph states, 5,120 physical action edges, 8,192-token input and 10-action full initial solution path, physically executed correctly. A **graph representation** had 528,735 JSON bytes in that tested example, instead of cloning the entire 8,192-token document into every graph node. This is a specific test point, not a guarantee at arbitrary dataset scale.
- End-to-end Node HTTP endpoints, new static HTML/CSS/JS responses, real text upload, start/pause/step, frozen eval, full exact text export, checkpoint save + complete RNG/restored replay and corpus fingerprint checks passed.

REAL Chrome/Chromium browser run:
- Headless Chrome opened the **new UI**, connected to the real server's live SSE updates and actually drew its 6-axis state graph in a nonzero-size canvas.
- 2,491 training worlds processed by native Node during that browser test, actual graph slice selector with six model dimensions, four actual route steps displayed, frozen evaluation 72 worlds counted, no browser JS exceptions.
- Browser clicks successfully paused training, stepped a world, applied a noise setting, changed graph projection and triggered frozen holdout. The PNG screenshot was captured using Chrome DevTools Protocol and uploaded as the run's v26-real-browser-ui artifact.

REAL Windows runner:
- The **supplied Windows PowerShell startup script** was executed through Windows PowerShell and started the live local server successfully.
- Actual HTTP /api/health answered healthy; /api/state returned running=true.
- 4,640 corpus train tokens were available, text-world length=512 and axes=6.
- Locale-safe PowerShell decimal argument **0.37** arrived exactly as 0.37 in Node.

All tests, the browser test, and the Windows launcher passed in the SAME 2026-11-07 workflow run ID 42344117032; no screenshot rendering substitutes or mock backend metrics were counted as end-to-end UI tests.

## Reproduce this run

    node --test v17/apps/hypermaze-studio-v26/tests/engine.test.mjs v17/apps/hypermaze-studio-v26/tests/session-server.test.mjs

And, with a real Chromium/Chrome installation:

    node --test v17/apps/hypermaze-studio-v26/tests/browser-ui.test.mjs

Windows PowerShell from repository root:

    powershell -ExecutionPolicy Bypass -File .\v17\apps\hypermaze-studio-v26\START_V26_LIVE_TRAINING.ps1 -Axes 6 -Words 2048 -Batch 4

Open http://127.0.0.1:8896. Training starts immediately.

## Accuracy scope, gaps and scientific guardrails

The studied learning process uses a genuinely loaded real text source and learns actual independent state/action/effect observations online; no single-screen toy UI or fake training progress generator. However, it defines controlled token-edit physics and a goal specified by target words, and inserts those controlled action sources into corpus windows. It **does not** test self-discovery of arbitrary language semantics or accuracy on free-form, open-ended unseen OpenThoughts solutions.

Other unverified requirements: all computation on the user's laptop CUDA GPU; unrestricted graph/physical world self-discovery; 4D torus as a causally active native language representation; pretrained checkpoint migration into this independent app; 70+% exact semantic reasoning on large natural questions; full high-dimensional natural-language target discovery without supplied goal words. These remain **OPEN**, no false success claimed.

The original V17 code and main branch remain untouched. New UI file contents were authored independently; the original V17 Discoverer.shape law was intentionally preserved, not replaced.

# MagicPerspective V17 — actual native learned WHOLE-solution routes, tests and throughput
Date: 2026-11-07. **Scope: genuine experimental code; release BLOCKED for general long-form language and user-GPU validation.**

## Exact source and reproducible evidence

Experimental implementation in **isolated branch**
\`experiment/V17-NATIVE-COUPLED-GOAL-ROUTES-20261107\`.
Draft code review **PR #63**: https://github.com/dan3s2020/MagicPerspective/pull/63

Relevant original V17 source files (the same Brain, original UI and original checkpoint format):
- \`v17/transcend/torus-aether/worlds/native-coupled-goal-field.mjs\`: observed real question/answer coordinate correspondences; learned correlated local action effects; **complete goal path BEFORE the first answer character**; executes the already frozen plan; rejects unavailable paths. No hardcoded arithmetic operator; nonetheless the architectural inductive bias is numeric template + locally affine transforms.
- \`v17/research/text-hypermaze/state-dependent-axes.mjs\`: existing robust local transformations, recomputes only when a NEW observed transition invalidates the cached field. This is a performance optimization with no dropped training data or altered plan rules. Its earlier controlled 54/54 and 18/18 unsupported refusals are documented separately in \`docs/ROBUST_CAUSAL_LOCAL_AXES_VERIFIED_BUT_NOT_LANGUAGE_SOLVED_20261107.md\`.
- \`v17/transcend/torus-aether/devour/brain.mjs\`: original Brain owns this numeric field, the lexical world, 2D maze learner and shared text/maze/transform model; \`Brain.chat\` defaults to \`mode:"goal-path"\`. The old \`AligningGraph.write\` mode remains ONLY as an explicitly selected \`legacy-character\` diagnostic, NEVER an unannounced fallback in whole-goal generation. Original V8 save/load registers new classes and resumes real learned states.
- \`v17/transcend/torus-aether/devour/worker.mjs\`, \`devour.mjs\`: new *opt-in* \`--goal-training\` processes **every complete actual Q/A row through all FOUR existing structural stages** (perspectives, constructed text paths / causal numeric axes, observed transformations, causal text action world / shared experiences), plus existing maze/transform worlds and common CUDA latent training when enabled. This training objective does **not** train TextCard next-character accuracy. However the preserved constructed six-scale text-path observer DOES update from real characters as an auxiliary model; do not misrepresent this as zero character processing. Source examples with non-numeric/long answers still enter their respective real structural learners, but the numerical goal index has explicit bounded applicability.
- Original UI files \`v17/transcend/torus-aether/ui/index.html\` / \`app.js\` plus \`native-goal-live.js\`: true learned *predicted whole state/route/axis actions* vs actual execution, numeric path projected in 2D (NOT a fake 5D representation); true FIRST SHOT before current answer observation, actual result shown afterwards. Existing V17 UI controls remain intact.
- \`isolated/noise-space/causal_text_world.mjs\`: an intra-episode cache of the **unchanged** learned latent goal vector and identical already computed candidate projections. In an isolated internal experiment, 50 genuine training records had byte-identical learned model state and action totals for old vs optimized paths, 1842ms vs 1341ms on that fixture. This is not a GPU benchmark.
- \`v17/START_V17.ps1\` / \`START_NATIVE_V17_TRAINING_LIVE.ps1\`: opt-in \`-GoalTraining\` explicit; original modes retained. Neither user laptop CUDA sustained test nor clean full long-answer release validation has been run.

## Exact positive tests executed, not predicted

- Native \`Brain\` trained 25 question/answer examples in each of FIVE controlled numeric worlds, independently answered **45/45 heldout whole equations** across addition, multiplication, affine, quadratic and sum-of-squares, with correct **whole planned state before ANY output**, genuine action execution, no nextchar fallback. Strict causal ablation disables learned axes; no covert fallback. V8 checkpoint persisted/restored + continued actual learning. Negative long-form unknown prompt correctly abstained.
- Original V17 worker HTTP process started on an ACTUAL local Q/A text file, held out some rows, and answered **5/5 distinct unseen complete numeric questions**. Original browser UI's controls, live goal route module, original server endpoints and checkpoint restoration verified.
- REAL original V17 server \`--goal-training\` on a 500-Q/A-row short numeric fixture: **450 complete training records**, **50 never-trained heldout**, all 450 processed by ALL four actual original structural learners, with 6471 observed correlated transition pairs. Real \`/goal-stream\` returned 15 PRE-OBSERVATION first-shot examples and true observed answers; one separately tested unseen Q/A had full predicted shape \`27 + 21 = 48.\`.
- Later test added strict heldout exact comparison: **50/50 entire heldout numeric Q/A answers exact**. The reference was used ONLY after the complete frozen goal plan had been returned, not as the model's goal or a teacher-forced input. This is 100% **only on this specific small arithmetic fixture**, not on arbitrary language.
- Existing Maze/transform shared-world, original UI, original causal text action model, original 48/48 state-dependent numeric learning, and PowerShell parse checks all passed on the named successful CI below; no parts deleted to obtain a headline metric.

## Measured throughput: NOT a promise of hundreds/sec on OpenThoughts or GPU

**End-to-end** timing includes real text processing, numeric local-axes learning, causal actions, real UI server, initial + final checkpoint and heldout test. The following are separate runs on shared GitHub-hosted **Ubuntu CPU** runners, for 450 **SHORT structured Q/A** training records:

| Exact job | Time | Measured throughput |
|---|---:|---:|
| Baseline prior to numeric-field caching, passing 2026-11-07 CI | 19.993 seconds | 22.51 exercises/s |
| After exact model-caching optimization, completely passing CI | **2.560 seconds** | **175.78 exercises/s** |
| Next CPU runner, stricter full 50/50 heldout assertion (other legacy integration test timed out in same job) | 4.796 seconds | **93.83 exercises/s** |

**Passing 175.78/s evidence**:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42345077874/job/128320959341

The fast run's real per-stage wall timings (450 calls per stage): language perspectives 31.95ms; constructed state paths + goal axes 344.54ms; observed transformations 81.49ms; causal actions + shared experiences 1475.16ms; first-shot blind queries (15) 345.32ms; frozen full heldout evaluation (50) 61.45ms; native V8 checkpoint 39.68ms. **No source learning stages were skipped.**

The preceding slow run took **14.230 seconds** just to recompute the same unchanged observed local action field during the frozen heldout test. The optimized passing run needed only **61.45ms** for the same evaluation category; cache invalidates upon observing every new real paired transition. A proposed binary priority heap was privately tested but provided NO speedup; **it was deliberately not merged**.

Because GitHub runners have variable performance and this input is ~tens of characters rather than the user's often long OpenThoughts examples, **no guaranteed sustained >=100 exercises/sec** can be inferred. On an RTX 3050 Ti laptop the natural-language structural planner still runs on CPU; CUDA handles separately supported shared/physical-world kernels. No 100% GPU claim.

## Negative findings — do not conceal

- The actual long-answer language test requires a **717-character / 108-word** six-sentence water-cycle explanation. Its earlier current lexical/one-edit goal planner failed to construct the complete heldout answer: **0/1**. The numeric correlated-axis extension does not resolve general unrestricted prose.
- Earlier plain numeric-goal lexical planner failed nine heldout new addition pairs: **0/9**, showing why integrating the observed correlated action field was necessary. Passing new numeric tests is not a demonstration of universal language understanding.
- In a stricter recent full-CI run, an older original shared-world HTTP comparison test **intermittently timed out at 60s** after the new structural tests had already passed, and was rerun. Until the rerun or follow-up identifies the cause, treat full-regression stability as under investigation. NEVER call it 'all green' without checking the current exact SHA/attempt.
- The currently observable numeric world has input/answer coordinates and learned state-local effects, but **does not yet establish a complete persistent learned 4D/5D torus manifold of arbitrary semantic states**. The UI projection must not imply this.
- Numeric index is bounded (e.g. max 512-character indexed Q/A), the observed edit model supports limited operators and other native text learners still have their own budgets. “No exercises intentionally skipped in the 450-row fixture” does **not** mean every byte of every historical user corpus is stored forever or every possible long response can be planned.
- Tests did not train on the user Windows \`D:\training\OpenThoughts3-1.2M\` dataset and did not benchmark the user RTX 3050 Ti or validate all real content/answer correctness.

## Release gate

**BLOCKED.** Original stable main V17 and old user checkpoints are left alone. Draft experimental PR only; never merge to main or provide a “fully functioning universal solver” PowerShell command until:
1. Real long-form and open-ended text goal-state generalization from an observed, learnable hyperdimensional world/route, first-shot full answer, and external semantic reference scoring.
2. Causal ablation demonstrating actual learned local axes/transformations drive correct unseen *long* answers, not just small integer equations.
3. Original UI, all saved brains, noise, 2D mazes, all world types, safe interruption, restart and throughput regressions pass repeatedly without intermittent hangs.
4. Actual sustained training speed and memory benchmark on user's genuine OpenThoughts partition + RTX 3050 Ti, with honest examples/sec and bytes/sec.

Everything above was documented **after** the source-level tests and the specific GitHub Actions observations, not fabricated before experimentation. Byte-exact preservation of every prior chat/image is not certified.

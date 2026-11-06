# MagicPerspective V17: from knowing a path to CONSTRUCTING paths

## User's actual proposal (not a demo)
- Treat each predicted next character as a transition in a high-dimensional text state graph.
- Treat an entire response as a hierarchy/composition of these shorter routes.
- Instead of only supplying complete maze paths, compare an intact labyrinth and an incomplete version of **the same labyrinth** to make the organism learn the transformation that can reconstruct missing connections.
- Do not silently remove other requirements, replace the existing UI or claim success from alignment after the answer becomes visible.

## Actual isolated implementation in this branch

`worlds/constructed-paths.mjs`: one persistable `ConstructedPathLearner` inside original V17 `Brain`. Its `ConstructedTransitionGraph` records actual state/action/next-state outcomes. The same learned generic path-selection coefficients are used by both maze and character-state candidate ranking. An existing separate `NoiseAgency` can select exploratory branches, including no noise.

**Paired complete/masked training:** A real generated training maze is seen in a complete view and in local 5x5 incomplete views. The model updates a compressed preference/reliability operator from differences in reachable routes and actual local action outcomes. The complete-view shortest distances are used **for training targets only**. A later blind evaluation receives an unknown-valued map (not a fabricated all-open map), a location and goal coordinate, plus local sensory patches revealed during travel. It constructs an internal route, takes actual physical actions, updates the belief map and repairs its route after blocked motions. No test terrain/BFS field is passed into the planner. Initial route quality is measured separately from actual final success; the evaluator references the complete map only *after* predicting.

**Actual text as a path:** Each corpus answer character updates real outgoing edges at context scales 1,2,4,8,16,32. The entire text response is composed by rolling out decisions from the question without passing the unseen answer, with word/sentence boundary markers. Only then is answer-position accuracy scored. The shared path policy learned on the complete/masked maze comparisons also contributes to text candidate scoring. This is a learnable multiscale lexical world; it is not a demonstrated semantic or physical hyperdimensional manifold.

**Original integration:** Both worlds update the same original V17 Brain and `.v8` checkpoint. The masked-world's genuine local retina and actions are lived through `Brain.live` and observed by the shared transition queue. Actual Q/A rows train the character path model in original CPU and GPU training loops; the original frozen Evaluare tab reports this alongside teacher-forced alignment and earlier token/action-model paths. Live Torus Aether UI gains an additive path-construction panel with a real frozen blind exam, and side-by-side complete evaluator map versus incomplete learned belief + initial predicted route + actual movement replay. Original buttons, worlds, graph and previous agents' branches remain unchanged.

## Independently measured results, not claims of universal transfer

- GitHub run `42269570588` passed original Brain checkpoint, live four-world original HTTP server, preserved native UI, frozen blind exam, control noise and original V17 regression.
- In 24 novel masked mazes after **16 paired training mazes**: trained agent solved **24/24** in **331 total actions**; matched untrained controller solved **24/24** in **349 actions**. That is a difference of **18 actions**, not a statistically established improvement. Both always solved these chosen mazes.
- Separate test repeated one observed Q/A completion seven times; it reconstructed that same 21-character response before the reference was consulted. **This is a checkpoint/mechanism test, NOT unseen language generalization.**
- A test with equal text experience and additional paired-maze experience confirmed that maze-learned path-selection weights alter text candidate scores. **It does not show improved unseen answers.**

## Remaining before release

1. A learned causal multi-step, goal-conditioned representation linking text symbols, sentences, relations, context and semantics, not merely counting character transitions or hashed 32D tokens.
2. Strong held-out Q/A tests of full pre-answer route quality; control against character-only alignment, target-only text training, shuffled actions and branch randomization.
3. Different mazes with no prior, incomplete observation; test reconstruction of previously unseen action laws, different goals, and failed-path recovery. Compare at least dozens of seeds and uncertainty intervals.
4. Transfer better than equal-data text-only under the same corpus and compute budget. Inspect actual paired-ablation path accuracy, not just percent of solved mazes.
5. Full CUDA integration/profiling on user's Windows RTX 3050 Ti, including the learned path constructor and code-world evaluator. Current pairing and abstract character-path builder run in original JS brain (CPU) alongside GPU world physics. Do not claim 100% CUDA.
6. All other earlier requirements (5D geometry as live graph not decoration, replay, self-code lock, multi-organism typed/layered, long text and persistent saves) must remain implemented, tested, and unexcluded.

**This branch is research/integration only. Do not deliver as the user-requested complete V17.** The user asked to receive it only after the remaining uncertainty is training outcome, not missing mechanisms.

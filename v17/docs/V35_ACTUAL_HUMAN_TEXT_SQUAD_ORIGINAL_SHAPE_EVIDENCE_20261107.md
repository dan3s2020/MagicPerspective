# MagicPerspective V35 — Original Brain on genuine human question/passage evidence

Date: 2026-11-07. Isolated branch: experiment/V35-REAL-SQUAD-EVIDENCE-PATHS-20261107
Parent: V31 verified commit c14ed44612b117ee0fca7a90c31cd12d0b52d7d8.
Status: actual frozen real human extractive-QA benchmark. NOT free-form natural-language semantic understanding, self-discovered causal text physics or CUDA training.

## Actual original modules and new code

The original V17 Brain, Discoverer.shape(), shapeGraph(), .v8 serialisation, original UI, original learned GPU training and checkpoints are UNCHANGED.

New research-only module: v17/research/text-hypermaze/real-squad-evidence-paths.mjs.
New acceptance: v17/tests/v35-real-squad-evidence-paths.test.mjs.
New CI: .github/workflows/v35-real-squad-evidence-paths.yml.

- The same actual original Brain owns persistent realEvidencePathMemory, storing a supervised linear preference model of genuine user questions against source passages.
- The training model derives witnessed lexical features from annotated human training examples: question type, original source sentence, nearest shared question anchors and bridge phrases, surrounding context, candidate answer length, text form, question/sentence matches.
- The bounded passage is expanded into complete available source-evidence graph: question state -> sentence -> source text-span terminals. Every possible candidate within the explicit budget is exposed as a potential goal, NOT the hidden gold answer.
- Original Brain.disc.shapeGraph computes its learned target attraction on this graph. The bounded learned preference affects the path among possible extractive answers. Plan accepts ONLY question and context; gold answer and gold answer offset are never passed.
- Every prediction is an exact original source substring. Whole atlas of retained available candidate spans/edges and native attraction is available optionally.
- This is source-backed answer retrieval, NOT actual independently verified action effects / natural physical law learning. The semantic boost originates from supervised span scoring. Direct argmax over the same scores could duplicate the current answer-selection benefit, so do not claim attraction alone learned semantics.

## Official Stanford SQuAD 1.1 dataset evidence

Actual TRAIN-v1.1 downloaded: 87,599 original Q/A rows, 442 articles, SHA256 3527663986b8295af4f7fcdff1ba1ff3f72d07d61a20f487cb238a6ef92fd955.
Actual DEV-v1.1 downloaded: 10,570 original Q/A rows, 48 DIFFERENT articles, SHA256 95aa6a52d5d6a735563366753ca50492a658031da74f301ac5238b03966972c9.

2,400 original TRAIN questions sampled from source (2 epochs, 3,854 representable supervised updates/examples); 450 previously unseen DEV human questions from disjoint articles. A total of 946 sampled training exposures across the two epochs had gold answer spans outside the restricted contiguous token budget.
Original Brain disc was trained in 26 original 2D maze episodes to give actual learned goal attraction/conductance.
Strict nonleakage: training/heldout question strings and article titles disjoint. Reference answers used only for training labels OR AFTER frozen heldout preaction prediction.

## Exact real CI result

GREEN independent CI: https://github.com/dan3s2020/MagicPerspective/actions/runs/42361550762
Original V29/V31 regression job: GREEN.

- NO learned question preference, same native original maze attraction graph: 1/450 exact complete DEV answers (0.22%).
- Learned preference but substituted wrong unrelated heldout question: 14/450 (3.11%).
- Correct learned preference, genuine correct question, original full shape path: 62/450 exact full answers (13.78%).
- Standard punctuation/article-normalized SQuAD EM: 65/450 (14.44%).

Every frozen answer was literally sourced in the supplied real passage. Trained parameter keys: 16,371; supervised weight updates: 3,273.
450 retained evaluated graphs contained 65,939 source tokens and 271,399 directed source evidence edges combined. The reader's observed-source graph was rebuilt for each new question, with no gold answer tokens inserted.
Full original Brain save / load: 483,471 bytes, exact same output, path and all candidate graph edges after resume; retained memory had 3,854 accepted training exposures.

Authentic heldout success: Which Denver linebacker was named Super Bowl MVP? -> Von Miller.
Authentic heldout failure: Who won Super Bowl 50? -> Roman numerals. The model is not reliably semantic; failing answers are not hidden or counted as success.

## Falsification / limits

- 388/450 genuine questions FAIL exact. No claim of production readiness or 100% first-shot correct text.
- This is extractive reading comprehension with a given context, not unrestricted OpenThoughts3 long-form generation; the independent V31 true OpenThoughts full-answer benchmark remains 0/24.
- The input question and source context are human natural text; the training labels are supervised. The 2-step extracted answer route is not proof of emergent hyperdimensional general physics.
- Code is CPU Node.js 22 on GitHub-hosted Ubuntu; no proof of original RTX 3050 Ti CUDA.
- No merge to main, V34 integration or other agents' original code.

## Reproduce

    node --test v17/tests/v35-real-squad-evidence-paths.test.mjs

The test fetches the real official SQuAD dataset, requires full authentic source rows, and has no synthetic fallback.
Next decisive experiment: more authentic Q/A training and direct-ranking versus native-original-shape counterfactual; evaluate same strictly frozen new articles and only then test compositional multi-hop semantic paths.

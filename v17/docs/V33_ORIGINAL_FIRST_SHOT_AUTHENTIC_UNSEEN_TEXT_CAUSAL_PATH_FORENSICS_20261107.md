# V33 — original V17 first-shot text paths: exact blocked corridor and disjoint real-world falsification

Date: 2026-11-07  
Branch: `experiment/V33-FIRST-SHOT-TEXT-PATH-FORENSICS-20261107`  
Status: **ISOLATED RESEARCH / NOT SEMANTIC GENERAL-ANSWER RELEASE**. Original `main`, V17 Brain files, historical UI, user data and checkpoints are not overwritten.

## What the user actually demanded

Use the **existing** organism, previous discoveries and original `Discoverer.shape`/native Brain; find and reproduce the historical ~10–15% initial text solution shape on never-seen text; expose EXACTLY which pathways succeeded and which failed, what walls the code adds, and whether lifting a specific wall with evidence changes frozen initial prediction. Do not silently rebrand next-character accuracy as whole-answer success. Keep comparisons from **before** an actual bridge appears (avoid future topology leakage).

## Source selection, byte-level evidence and complete test

All native tests run on GitHub Actions Node 22 Linux, not the user's NVIDIA CUDA. The same untouched original `Brain` owns the original `ConstructedPathLearner`, original `Discoverer.shapeGraph` and original observed transformations. No alternate LLM, outside API inference or hidden answer oracle.

- Real official dataset: `open-thoughts/OpenThoughts3-1.2M` via authentic public Hugging Face Dataset Viewer rows; exact parser `qaPairsFromRealJSON`.
- Initial 60 actual rows: offsets `0–19`, `210000–210019`, `810000–810019`; **50 training / 10 unseen** by every-sixth-row split. SHA-256 of canonical JSON list of `[rowIndex,question,answer]`: `6a533454efd6c8640102bf264002d8b7c72ded5ff2cbdeefc9dad387bb42b815`.
- Independent second validation: **20 more previously unseen questions**, `420000–420009` and `960000–960009`, never included in training OR initial exploratory sample. Source SHA-256 `fe28cba547bd445de4ebbf626ef7d364b035571b199ce1e9940ed83fc1a9e6c2`.
- The exact original text worker was trained on the first `1,024` answer code units of each of 50 training questions only. Each original frozen character-world initial route was **128 characters**, generated without the heldout answer. Unicode, punctuation and full raw exact answer metrics remain separately identifiable.
- Boilerplate prefix `<think> ` (8 characters) was computed from **training answers only**, never from heldout evaluation, and separately removed from scoring; do not confuse preamble overlap with reasoning.
- Original six context scales: `1,2,4,8,16,32`. For scales 8/16/32 the learned state includes the 6-word exact `qkey(question)`, so **novel question keys render these longer paths inaccessible**, even though they have been traversed in different episodes.
- Research-only negative ablation: SAME original `ConstructedPathLearner` class, same 50 real training examples, all long-scale contexts given the same source-world key. This **drops a design gate WITHOUT independently proving semantic compatibility**; it does not become a production solution. Original model remains unmodified.

## ACTUAL measured first frozen shape (historical character-world)

| Condition | Initial 10 unseen: after training-only 8-char prefix | **Second independent 20 unseen:** after prefix | Distinct predicted answers in 20 unseen | Exact full answers in 20 unseen |
|---|---:|---:|---:|---:|
| Original six-scale question-key gate | 179/1200 **14.9167%** | 311/2400 **12.9583%** | 1 | **0/20** |
| Same original six-scale learner, deliberately shared long-context key (research-only) | 212/1200 **17.6667%** | 376/2400 **15.6667%** | 1 | **0/20** |

**Independent gain: +2.7083 percentage points = 65/2400 more characters correct on their actual positions**, even though the frozen outputs did not differ by question. This reproduces the sign of the original exploratory +2.75pp and proves original anchor gating blocks real previously learned character-state corridors, NOT independent transfer of semantic question-answer transformations. Original 20 unseen: 471/2560 (18.3984%) including the boilerplate, shared-key arm 536/2560 (20.9375%). The original was correct from character zero until mean position 13.5; the shared-key arm until mean position 17.95.

In the original arm **0/20** independent heldout queries had any learned long-scale edge at the root or after `<think> `. In the ungated research arm **20/20** had evidence of a learned long-scale corridor at both points. **Yet the output remained IDENTICAL across all 20 questions.** The unlocked pathways improved the generic prefix continuation, not understanding of the actual problems.

Original frozen beam 3 vs identical text experience:
- Original beam3 initial exploratory: **179/1200 14.92%** after training-only prefix, same answer on all ten.
- Greedy original local action selection: **190/1200 15.83%** after prefix, also same answer on all ten.
- Wider beam6: **172/1200 14.33%** after prefix.
- Additional eight real paired training mazes with same text evidence: **179/1200 14.92%** after prefix. Maze training **did not produce a measured gain on these natural questions**.

## A real exact path blockage / two independent kinds of wall

### 1. Previously observed physical corridor disconnected from previously observed exit

Before: original CumulativeHyperMaze has **two verified components**, root `corridor 0` reaches 5 known states, target `exit reached` is known but unreachable; **NO pre-action shape**. Even with corpus text ordering `corridor 4` then `corridor 6`, or a model proposal for a bridge, it **remains blocked**.

**New verified, independent actual action evidence**: `corridor 4` --`cross-bridge`--> `corridor 6`.

After: original `brain.disc.shapeGraph` now sees **one** connected component and computes the entire exact 9-action first-shape with scalar goal field:
`[0.7053820147, 0.7271979533, 0.7527237882, 0.7791456216, 0.8064949045, 0.8348041918, 0.8641071813, 0.8944387535, 0.9258350134, 0.9583333333]`.
Trusted world callback checks **9/9 independent physical steps**. Final `exit reached` = **12/12 character emissions** from the final observed state. This proves shape-to-output action wiring for this controlled verified world; it **does not** teach arbitrary English answers.

**Forensic regression detected and fixed:** Before the fix the old failure diagnosis could read the topology *after* adding the bridge and falsely categorize the prior blocked prediction as wrong path choice. V33 now freezes known/reachable **state hashes and codepoint sets before action**, and all after-only scoring uses that frozen snapshot. Before new bridge: expected character known elsewhere but NOT reachable. After bridge: verified route reaches it. A failed state is never retrospectively credited with future evidence.

### 2. All three TEXT axes were witnessed in different partial worlds, but original strict local anchors hid valid compositions

Before: **13** actual observed sentences, **0/64** withheld triple-composition routes (original unchanged strict local anchor gating). An external independent world checks TWO candidate bridge states involving adjacent axes **before** admitting them as evidence. After these two bridges: evidence-gated `ContextAxisNavigator` transfers the actually observed edits and constructs **64/64** unseen three-step complete text states, **2688/2688** characters exact in controlled factorized grammar. The original strict planner (even after both bridge observations) obtains **1/64**.

Critical negative control: a different world admits the same original singleton observations but REJECTS both compound bridge states. The navigator correctly keeps the paths blocked. Therefore the bridge cannot be blindly inferred from co-occurring text; actual verification is required.

This is a second, independent exact design-wall demonstration. The original unchanged `ObservedTransformations` and original non-grid `Discoverer` remain in the real Brain; this research comparison does not imply full natural semantics.

## The REAL semantic benchmark still fails

The original genuine OpenThoughts V29 source worker previously ingested **20 training, 4 heldout** authentic public full Q/A rows, with **277,941 training answer tokens** and **2991 sequential source edges**, but obtained **zero causal Q/A axes** and **0/4 complete answer predictions**. This was replicated on green V33 CI `42357097700`.

A later CI run `42357959198` suffered an **external Hugging Face HTTP 500** on the old V29 independent-source job (and therefore had a failed job), while the separate new 50/10 + 20 independent historical-path character audit **passed** using actual rows. Never label that whole workflow green; the earlier independent V29 audit is the successful run.

**None** of the above has demonstrated 70% first-shot *semantic solution shape* on arbitrary unseen natural questions, causal original 5D coordinates controlling native character writing, or Windows RTX CUDA throughput. The exact 10–15% post-template character result is **not** 10–15% semantic answer accuracy. Issue #25 remains blocking. Do not merge or provide a production-ready native training launch.

## Sources, original code and reproduction

- Real original historical path engine: `v17/transcend/torus-aether/worlds/constructed-paths.mjs`, unchanged on V33.
- Original non-grid goal attraction: `v17/transcend/torus-aether/worlds/exercise.mjs`.
- Verified causal cumulative memory: `v17/research/text-hypermaze/cumulative-hypermaze.mjs`.
- Forensic snapshot fix, alternative routes, disconnected components, missing action evidence: `v17/research/text-hypermaze/forensic-path-atlas.mjs`.
- Additive native shape->physical action->character writer: `v17/research/text-hypermaze/native-frozen-shape-writer.mjs`.
- Actual full test: `v17/tests/v33-first-shot-path-forensics.test.mjs`, `v17/tests/v33-native-chat-shape-bridge.test.mjs`, `v17/tests/v33-authentic-original-first-shot-paths.test.mjs`.
- CI with per-world JSON output and full provenance per heldout: `.github/workflows/v33-first-shot-path-forensics.yml`.
- Native V33 first-shape and forensic frozen graph: https://github.com/dan3s2020/MagicPerspective/actions/runs/42357097700 (all green).
- Initial real OpenThoughts historical 10-question audit: https://github.com/dan3s2020/MagicPerspective/actions/runs/42357750505 (all green).
- Disjoint real 20-question crossworld ablation (historical-path job green; V29 source job externally failed HTTP 500): https://github.com/dan3s2020/MagicPerspective/actions/runs/42357959198 .
- Exact frozen per-question comparisons, six context-scale support, 128-character source paths and reference only after prediction saved as Actions artifact **`v33-authentic-original-v17-first-shot-path-errors-and-ablation`**, not silently reduced to a successful-only shortlist.

```bash
node --test v17/tests/v31-forensic-path-atlas.test.mjs
node --test v17/tests/v33-first-shot-path-forensics.test.mjs
node --test v17/tests/v33-native-chat-shape-bridge.test.mjs
node --test v17/tests/v33-authentic-original-first-shot-paths.test.mjs
```

Last test requires actual Hugging Face network access and fails instead of generating fake data. Original user checkpoints, prior UIs, CUDA engines and main are untouched.

## Concrete next falsifiable hypothesis

What is missing after opening ALL unverified question-key walls? **Question-conditional causal movement axes and terminal objective inference.** The now-visible long-context graph still writes the SAME continuation for every unrelated question. Future tests must induce reusable *validated* question→world-action→goal dynamics from independent observed effects; no amount of unconstrained character-state merging alone establishes the target world, the meanings of actions, or reliable first-shot semantic answers.

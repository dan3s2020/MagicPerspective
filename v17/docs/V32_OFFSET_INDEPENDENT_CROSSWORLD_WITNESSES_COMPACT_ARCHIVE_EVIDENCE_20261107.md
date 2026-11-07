# V32 — Offsets, lifelong source-witness integrity and exact compact archive of the ORIGINAL MagicPerspective Brain

**Date:** 7 November 2026. **Isolated parent:** `experiment/V31-ALTERNATE-PATHS-MISSING-EDGES-20261107` at `70c8f6981370de09ccfaa062e48f21aaf7e73065`. **Status:** original-engine source memory research, **not** general language-answer release. Critical issue #25 remains OPEN, no changes to `main`, original brain weights, noise, CUDA training objectives, physical maze mechanics, `Discoverer.shapeGraph`, or previous user checkpoints.

## The concrete failure observed in previous genuine source experiments

V31 retained 5- and 12-token motifs selected using a roughly 1-in-32 hash of the **first token**, plus one forced initial anchor. This is sparse but cannot guarantee identical long passages at different absolute offsets ever get a matching motif.

V31 real official OpenThoughts3-1.2M public source: 96 unchanged actual distinct rows from 3 distant offsets `[0, 210000, 810000]`, 32 rows each, **80 train and 16 genuinely heldout**, source **5,502,517 UTF-8 JSONL bytes** SHA256 `b171badf1494348d2c9a358abaedf22aa5fc36b387eb5804bf4c0c5b0cd2c661`. Native original tokenizer witnessed **1,140,875 actual answer tokens**. Earlier 1-in-32 version indexed 59,098 motifs, 906 cross-episode shared anchors, 63,700 source-only edge types, 87,446,784 actual SQLite+WAL bytes (same corpus). It achieved **0/16 whole unseen natural OpenThoughts answers**, because there was no proven general semantic Q/A action.

## Test BEFORE implementation: prove the missed connection

`v17/tests/v32-winnowed-crossworld-replay.test.mjs` initially hard-gated 5 tests, including a constructed exact **23-token shared passage** with no token whose old sampling hash selected it. The old original selector demonstrably missed *all* possible common 5-token anchors. Deterministic rolling whole-token rightmost-minimum winnowing over 16 consecutive k-grams in `v17/research/text-hypermaze/winnow-token-anchors.mjs` now selects matching 5-token fingerprints anywhere inside any identical shared substring with **at least 20 tokens** (5+16-1), regardless of surrounding passages or absolute offset. The same holds for **12-token anchors in shared substrings ≥27 tokens**. Exact SHA256 of the *whole actual observed token span* remains the saved identity; the 32-bit rolling hash is only a choice priority, never used as proof that two phrases are identical.

The same original `QARoleAxes` (in the same `Brain.v8`) now persists content-defined **source-only** anchors. Separate long Q/A problems with different contexts obtained **38 shared indexed anchors** without any verified physical semantic action. These anchor guarantees are for sufficiently long EXACT contiguous equal token spans, **not** paraphrase equivalence, automatically discovered semantics, or every possible short substring. One substantial text problem remains only a partial maze even with this structural guarantee. Corpus-derived goal induction is still absent.

## Test BEFORE implementation: prevent corrupted checkpoint replay

In V31 SQLite indexed motif occurrences used episode ordinal + role + token offset/width. A restored checkpoint could restart an existing numeric episode after a dataset/source change; `INSERT OR IGNORE` would silently treat new positions as earlier evidence or merge unrelated old evidence.

New V32 `source_episode(episode,source_sha256)` ledger is committed in the **same SQLite transaction as its motif occurrences**. Every real training episode now supplies SHA256 of the **complete canonically tokenized question and answer**, not a 5-token sample; the exact same historical source at the same episode is idempotent. Attempting a changed Q/A under a previously used episode throws `SOURCE_REPLAY_IDENTITY_MISMATCH` before any writing. Legacy archives with unidentifiable old witness rows cannot be silently rebound to a different source; the error is explicit. This is an integrity/lineage fix, not an inferred meaning-changing world action. The old original V17 `.v8` checkpoint path/protected resume remains untouched.

## Another actual bottleneck: source archive space increased dramatically

The true 96-row winnowed original engine indexed **249,580 distinct source motifs**, **2,681 repeated motifs between experiences**, and **269,163 distinct source-only adjacency edge types**. Its old textual SHA256+role+position SQLite index grew to **353,705,488 bytes** SQLite+WAL (roughly 354 MB for 5.50 MB source JSONL). **200,842** active 50,000-memory motif node evictions were recorded; disk preserves them.

A separate, initially unconnected experimental storage adapter `native-motif-compact-archive.mjs` was built and tested **against the original legacy adapter** before enabling in any native worker. It stores original 5/12-token exact identities as 33-byte binary keys (1 width + 32 SHA256 bytes), uses `WITHOUT ROWID` composite key tables, and a dictionary for repeated role labels. All original episode/position/role/motif and source-edge occurrences remain materialized: no lossy sampling changes in this storage adapter. It exposes the exact prior lookup/pagination/replay interface and preserves legacy `node:sqlite` null-prototype row contract and historic lexical neighbor tie ordering.

Independent side-by-side 35-episode parity test on genuine recorded synthetic fixture events and independent original source-identity references:
- Original prior archive: **6,156,288 bytes**.
- Compact archive: **2,342,912 bytes** (**0.3806** original, about 61.94% less).
- **3,324** identical motif IDs, **4,545** identical source-edge types, **35** exact source episode identities, matching lookup evidence and provenance, no replay count inflation, old-source identity mismatches rejected.
- This test is SOURCE-INDEX parity on witnessed events, **not** a proof that new language reasoning works.

**Only after this passed**, fresh original V17 real corpus workers were switched to the **separate** `original-native-long-language-motifs-compact.sqlite` file; an existing V31 `original-native-long-language-motifs.sqlite` is preserved **verbatim** and reused when the worker is attached to an older output. A checkpoint manifest naming a specific old or compact archive overrides defaults, and the worker refuses to start if that archive is missing, unexpected, or two incompatible archives exist without an authoritative manifest. The protected original server output ownership marker is unchanged; prepopulated outputs with no valid original marker are still refused.

Verified in real original 36-row HTTP/Brain training: old original V31 archive with a preserved independently witnessed episode #800 retained all old evidence; a separate clean training output used compact format; source Q/A behavior was identical and all original checkpoint files/controls were maintained. The 36 rows were used only as integration fixtures, not as proof of semantic generality.

## Authentic public 96-row OpenThoughts3 under the *same compact original* worker

The full original 96-row withheld-answer test ran unchanged on the same official public dataset with frozen withheld answer ground truth **never given to the planner or the source memory**. It confirmed:

| Evidence | Full real 96-row result |
|---|---:|
| Source bytes | 5,502,517 |
| Training questions / frozen heldout questions | 80 / 16 |
| Original native answer tokens observed | 1,140,875 |
| Exact source motif IDs indexed on disk | **249,580** |
| Cross-episode shared exact source anchors | **2,681** |
| Source-only edge types indexed | **269,163** |
| Current active source motif nodes in `Brain` | 50,000 |
| Source motif nodes evicted from active map | 200,842 |
| Previous textual SQLite+WAL bytes | **353,705,488** |
| New compact SQLite+WAL bytes | **139,144,720** |
| Space ratio | **0.3934** |
| Observed disk-space reduction | **~60.66%** |
| Actual complete heldout natural Q/A | **0/16** |
| General Q/A transformations learned | **0** |
| Cross-document lexical edges physically verified as semantics | **0** |
| Full user PC RTX 3050 Ti CUDA benchmark | NOT DONE |

The new compact archive still uses ~25× the sampled 5.5 MB original text size, so do not extrapolate it as affordable for the 1.2M corpus or the user's private ~594MB file without measuring actual disk capacity, throughput, and periodic retention. SQLite itself is experimental in Node22. Existing Node20 original native worker, HTTP, UI and checkpoint still run via its prior explicitly reported *without indexed source disk memory* compatibility path; no claim it has Node22 SQLite support.

## Original real ATLAS and the remaining crucial missing dimension

The existing V30/V31 native UI atlas, physical walls, rejected transitions, original learned 5D graph, alternate paths and `Discoverer.shapeGraph` are unchanged; V32 updated the actual atlas `designGates` to show `content-defined-winnow-rightmost-minimum` and exact independently proved 20/27-token overlap boundaries for new Brain checkpoints, while old legacy Brain checkpoints retain their honestly reported 1/32 sampler configuration.

**Crucial STOPSHIP #25:** no learned action from `question observed → answer generated` exists for general, long authentic Q/A. In the original `QARoleAxes.observe`, any question or answer exceeding **128 original tokens** runs the *long source-sequential witness collector*, not the short answer-variable semantic-action learner. All 96 actual OpenThoughts answers are 2,563–17,823 tokens, so the learner's `S.examples` and transferable `S.edges` cannot acquire general complete-answer constraints from these 80 long Q/A training problems. A complete graph of *literal source order* is not yet a complete graph of **permitted semantic state transitions**, and repeated phrase SHA matches cannot replace independent environment validation.

### What must be researched next rather than faked
1. Learn **state-dependent, independently falsifiable semantic transition operators** from long text examples, including latent context/history coordinates, actual goals and walls, and authentic physical/action feedback.
2. Use these action laws to construct the reachable semantic graph **without passing the hidden answer**. The *original* `Discoverer.shapeGraph` must select the frozen whole route before execution; independent executor then validates each predicted state/action/after.
3. Measure true whole unseen answer accuracy and semantic causal ablation. Keep separate original GPU/CPU claims and do not turn lexically matched phrases into physically walkable actions by fiat.
4. Scale archive with recorded checkpoint/IO/SSD bounds. Current 139MB per 5.5MB real sample is still very expensive; optimize only with lossless source evidence parity, protected old checkpoints and real hardware benchmarks.

### Reproduce exact tests
```bash
node --test v17/tests/v32-winnowed-crossworld-replay.test.mjs
node --test v17/tests/v32-compact-motif-archive.test.mjs
node --test v17/tests/v32-native-archive-format-selection.test.mjs
node --test v17/tests/v30-cumulative-hypermaze.test.mjs
node --test v17/tests/v30-real-corpus-cumulative-http.test.mjs
node --test v17/tests/v31-authentic-96-openthoughts-stress.test.mjs
```

The final authentic public source test uses live Hugging Face data (same fixed offsets, no invented fallback); source outages are explicit CI failures. Green integration tests do **not** mean general semantic release acceptance passed. Branch is DRAFT only, no main merge. No Windows 4GB CUDA parity claim.

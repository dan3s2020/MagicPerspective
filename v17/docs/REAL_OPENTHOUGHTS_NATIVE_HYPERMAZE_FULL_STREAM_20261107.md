# Real OpenThoughts JSONL through the verified NativeGoalTextMaze learner

Date: 2026-11-07
Branch: feature/V17-REAL-OPENTHOUGHTS-HYPERMAZE-STREAM-20261107
Status: REAL TRAINING WORKFLOW TESTED ON CI FILES; GENERAL SEMANTIC RELEASE STILL BLOCKED.

## Source and motor
User-supplied actual file visible in Windows Explorer:
D:\training\OpenThoughts3-1.2M\train-00015-of-00120.jsonl (approximately 594 MB).

The trainer uses ONLY the same NativeGoalTextMaze + original Discoverer.shapeGraph + ObservedTransformations + NoiseAgency architecture that passed 42/42 maze parity, 100/100 strictly held-out long structured text goals, and 24/24 further long held-out structured compositions. No legacy V17 AligningGraph byte predictor, no TinyStories fast_text.py, no independent second V17 training worker and no fabricated example injected into training. The actual original Brain is persistent and saved in one V17 .v8 checkpoint.

Source: v17/research/text-hypermaze/openthoughts-jsonl-source.mjs
Motor worker: v17/research/text-hypermaze/real-corpus-worker.mjs
Single-brain server: v17/research/text-hypermaze/real-corpus-server.mjs
Windows launcher: v17/START_REAL_OPENTHOUGHTS_HYPERMAZE.ps1
Real UI: v17/transcend/torus-aether/ui/native-hypermaze.html

The launcher accepts a real JSONL file or a directory of JSONL files. It NEVER needs to reconvert the screenshot's already-converted JSONL into Parquet.

## Actual training mechanics and limitations

The exact UTF-8 source is streamed line by line at byte-exact offsets; the complete file is never loaded into RAM. Actual question, answer, reasoning and ordered conversation message strings are extracted from known JSONL schemas, no invented answers. Source text tokens are visited consecutively in genuine windows (96-token original-action observation windows by default), and an occasional adjacent genuine observed prefix/next-token pair trains the original edit-action learner with pre-action noise decisions and post-action feedback.

The original Discoverer learns maze target attraction/conductance from original procedural maze experiences; the SAME learned original Brain owns text operator discovery, 5D observed-action coordinates, transferable path policy and endogenous NoiseAgency. This is not a new frequency model.

Meaning of "100% dataset": every source byte has been READ, excluding explicitly frozen rows from TRAINING. This does NOT mean 100% of all corpus bytes are distinct permanently stored knowledge. The original model has bounded active textual-state capacity (12,000 default) and operator capacity (80,000 default). The UI truthfully displays evictions and capacity saturation.

If an actual row is corrupt, UTF-8 invalid, more than 20% of the first 100 rows contain no parseable text, or learned operator memory saturates, the worker STOPS; it does NOT falsely claim 100% training. The last fully committed original Brain + byte-offset source cursor are preserved and can resume after an explicit capacity increase. Three generations of checkpoint state are preserved, two as rollback history. Real heldout rows (every 100th by default) never enter the learner.

There is no working verified CUDA port of this exact learner. The real tested engine trains on Node CPU. The old unrelated CUDA byte head is intentionally NOT substituted.

## Verification

GitHub Actions verifies:
- Real Node stream on actual UTF-8 JSONL files, CRLF and UTF-8 split boundaries and exact restart offsets.
- One original Brain trains 120 real Q/A JSONL records, save/pause/restart/resume, 108 trained and 12 unseen-heldout; real original source operators/5D/noise persist. Actual Chromium shows dataset percentage and original hypermaze graph.
- Memory index remains bounded under genuine evictions; old dormant and newly observed action operators preserved correctly.
- Original prior 42/42 maze solution-shape path parity, 100/100 long text 5-edit structured predictions and 24/24 additional unseen long text targets remain passing.
- A 4.264 MB ACTUAL on-disk JSONL stream with 1,200 diverse Q/A-shaped records, 1,140 trained and 60 held out: 4.23 MB/s observed source text and ~1,215 real JSONL examples/sec on GitHub-hosted CPU. This is only the measured CI fixture, not a speed promise for the user's actual Windows 594 MB source.
- Native original-operator saturation must trigger a STOP without checkpointing a partial input row, with later resumed capacity expansion (specific recovery CI added separately).
- Real Windows PowerShell launcher parsing.

## Unsatisfied research claims

General large unseen natural-language answer semantics, automatic goal extraction from a question, 100% complete first-try answers, causal benefit of learned 5D geometry/noise, full native CUDA acceleration and actual throughput on the user's RTX 3050 Ti are NOT demonstrated. The production release gate remains BLOCKED; it does not prevent safely running a separately labeled experimental, genuine-corpus training workflow.

Previous TinyStories and legacy original V17 checkpoints, UIs, git branches and source bytes are not overwritten by the new isolated output directory.

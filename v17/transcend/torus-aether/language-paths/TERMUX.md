# Run language paths in Termux — 2026-11-06

This experiment is isolated from other agents/branches. No CUDA, Python, npm install or parquet dataset is necessary. It uses Node.js to **induce symbolic word-rewrite templates** from paired text examples; it does **not** train a neural language model, infer open-ended semantics or implement higher-dimensional gradient descent.

## Install, clone, test, train, evaluate and search
Paste all of this into Android **Termux**, not PowerShell:

```bash
pkg update -y
pkg install -y git nodejs

BRANCH="experiment/V17-LANGUAGE-TRANSFORMATION-PATHS-20261106"
DEST="$HOME/MagicPerspective-Language-Paths"
URL="https://github.com/dan3s2020/MagicPerspective.git"

if [ ! -e "$DEST" ]; then
    git clone --single-branch --branch "$BRANCH" "$URL" "$DEST"
elif [ -d "$DEST/.git" ]; then
    git -C "$DEST" fetch origin "$BRANCH"
    git -C "$DEST" switch "$BRANCH"
    git -C "$DEST" pull --ff-only origin "$BRANCH"
else
    echo "STOP: $DEST exists and is not a Git repository"
    exit 1
fi

cd "$DEST/v17" || exit 1
node --test tests/language-paths.test.mjs tests/language-text-trainer.test.mjs

LAB="transcend/torus-aether/language-paths"
node "$LAB/benchmark.mjs"
node "$LAB/train-text.mjs" train "$LAB/examples.jsonl" "$LAB/rules.json"
node "$LAB/train-text.mjs" eval "$LAB/examples.jsonl" "$LAB/rules.json"
node "$LAB/train-text.mjs" path "$LAB/rules.json"    "farmer pushes shield" "if farmer pushes then shield moves"
```

Expected: **4 core tests + 1 CLI integration test passed**, benchmark **25/25** on unseen subject/object combinations, file-driven held-out evaluation **50/50**, two learned transformation families, and the path:
```
farmer pushes shield
→ shield is pushed by farmer
→ if farmer pushes then shield moves
```

These are *narrow template-transfer tests*. The second transformation reflects a **toy world's training assumption**, not a general real-world claim that pushing something guarantees it moves.

## What is supplied to the learner?
`examples.jsonl` has separate `train` and `test` rows. Each training row is a **before/after transition** with a transformation family:
```json
{"family":"active_to_passive","split":"train","before":"mage pushes stone","after":"stone is pushed by mage"}
```

At least **3 varied paired examples per family** are required to induce the current form of rules. Vary actors and objects across examples. Fixed words form the learned template's conditions, and changing word slots become variables. Families are presently supplied by the dataset author; discovering the families autonomously is still open.

The held-out `test` rows never contribute to induction. To train your own examples, edit a **copy** of `examples.jsonl`, not the source engine, then rerun `train` and `eval`. The JSON rules file is a learned symbolic artifact, not weights for an LLM.

## What have we actually proved?
The code demonstrates recognition of variable slots, reuse of learned textual rewrites with unseen vocabulary combinations, composition of two transitions by generic graph search, and refusal of unsupported verb patterns. It has **not** learned grammar or causal reality from raw books, trained the original `AligningGraph`, invented the pathfinding algorithm, or achieved general text problem solving. The original V17 maze/causal/text engines are unchanged.

## What should be next?
Build a language retina with explicit edit actions, observations after edits, and measurable goals; let the shared graph discover an action/world model and learned attractor field. Compare with fixed templates, raw text prediction, and existing `AligningGraph` on genuinely unseen tasks. Keep failures, trajectories, and source evidence visible. Do not add a superficial visualization claiming neural mechanisms that are not instrumented.

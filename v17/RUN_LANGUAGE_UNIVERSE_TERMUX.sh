#!/data/data/com.termux/files/usr/bin/bash
# From cloned branch: bash v17/RUN_LANGUAGE_UNIVERSE_TERMUX.sh [path-to-text]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
CORPUS="docs/TORUS_AETHER_ABC_20261104.md"
if [ "$#" -ge 1 ]; then CORPUS="$1"; fi
OUT="$HOME/magic-language-universe-v17"
TRAIN="transcend/torus-aether/language-universe/train.mjs"

echo '=== ORIGINAL V17 + TEXT PERSPECTIVES ==='
node --version
node --check "$TRAIN"
node --check 'transcend/torus-aether/language-universe/perspectives.mjs'
node --test tests/language-universe.test.mjs tests/language-universe-v17-integration.test.mjs

echo '=== CORPUS / CHECKPOINT ==='
echo "Corpus: $CORPUS"
echo "State: $OUT"
args=()
if [ -f "$OUT/latest.json" ]; then args+=(--resume); fi
node "$TRAIN" --text "$CORPUS" --chars 12000 --eval 500 \
  --maze-every 5000 --out "$OUT" "${args[@]}"
echo "Final metrics: $OUT/last-report.json"

#!/usr/bin/env bash
# Isolated Self-Code World runner. Does not modify the V17 trainer or checkpoints.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/experimental/self-world"
if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js missing. In Termux: pkg install nodejs -y\n' >&2
  exit 1
fi
printf '\n=== MagicPerspective Self-Code World: tests ===\n'
node --test code-world.test.mjs
printf '\n=== MagicPerspective Self-Code World: training + lock evaluation ===\n'
node run-demo.mjs
printf '\nReplay: %s\n' "$PWD/self-world-viewer.html"
printf 'The original V17 source/checkpoints were not modified.\n'
printf 'To view on the phone: cd %s && python -m http.server 8090 --bind 127.0.0.1\n' "$PWD"
printf 'Then open http://127.0.0.1:8090/self-world-viewer.html\n'

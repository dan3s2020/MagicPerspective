#!/usr/bin/env bash
# Same actual original Brain, on this phone, with genuine memory + real audio.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
CHECKPOINT="$ROOT/runtime/termux_cat_audio/checkpoints/active.v8"
if [ ! -s "$CHECKPOINT" ]; then
  echo "No saved original Braivour Brain. Run install.sh first; will not create a fake Brain."
  exit 2
fi
echo "Braivour uses the SAME original trained 9-dimensional audio body:"
ls -lh "$CHECKPOINT"
echo "Open in Android Chrome: http://127.0.0.1:8765"
echo "Keep this Termux session running while listening and training."
export BRAIVOUR_PORT=8765
export BRAIVOUR_PYTHON=python
exec node --max-old-space-size=1536 research/catmeows_native/termux_audio/server.mjs

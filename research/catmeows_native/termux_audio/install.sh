#!/usr/bin/env bash
# Install the EXISTING original Brain in Termux. Never replace an active save.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
STORE="$ROOT/runtime/termux_cat_audio/checkpoints"
TARGET="$STORE/active.v8"
NAME="Original_Braivour_9D_SoundTransform_Body_chronological.v8"
mkdir -p "$STORE"

command -v node >/dev/null || { echo "Missing Node: pkg install nodejs-lts"; exit 2; }
command -v python >/dev/null || { echo "Missing Python: pkg install python python-numpy"; exit 2; }
command -v ffmpeg >/dev/null || { echo "Missing ffmpeg: pkg install ffmpeg"; exit 2; }
command -v unzip >/dev/null || { echo "Missing unzip: pkg install unzip"; exit 2; }
python -c 'import numpy; print("NumPy:",numpy.__version__)'

if [ -s "$TARGET" ]; then
  echo "Keeping original active native Brain, not resetting its training."
else
  FOUND=""
  if [ "$#" -gt 0 ] && [ -f "$1" ]; then
    FOUND="$1"
  else
    if [ -d "$HOME/storage/downloads" ]; then
      FOUND="$(find "$HOME/storage/downloads" -maxdepth 1 -type f -name '*Braivour*9D*zip' | head -1)"
    fi
  fi
  if [ -z "$FOUND" ]; then
    echo "Download Braivour_Native_9D_Sound_Transform_WAVs_And_Brain.zip from the chat into Android Downloads."
    echo "Run termux-setup-storage, grant access, and rerun this installer."
    echo "Or pass the full zip path as the first argument."
    exit 3
  fi
  echo "Installing exactly the original native 9D body from $FOUND"
  if [ "$FOUND" = "$NAME" ]; then
    cp "$FOUND" "$TARGET.new"
  elif unzip -Z -1 "$FOUND" | grep -Fxq "$NAME"; then
    unzip -p "$FOUND" "$NAME" > "$TARGET.new"
  else
    echo "Archive does not contain the original 9D Brain; refusing to start empty."
    exit 4
  fi
  [ "$(wc -c < "$TARGET.new")" -gt 25000000 ] || { rm -f "$TARGET.new"; echo "Truncated original Brain"; exit 5; }
  mv "$TARGET.new" "$TARGET"
fi
test -s "$TARGET"
test -f "v17/transcend/torus-aether/devour/brain.mjs"
test -f "research/catmeows_native/native_temporal_body.mjs"
test -f "research/catmeows_native/termux_audio/server.mjs"
echo "Brain is ready:"
ls -lh "$TARGET"
echo "START: bash research/catmeows_native/termux_audio/start.sh"
echo "WEB UI: http://127.0.0.1:8765"

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
  for item in "$@" "$HOME/storage/downloads/"*Braivour*9D*zip "$HOME/storage/downloads/"Original_Braivour_9D*.v8; do
    [ -s "$item" ] || continue
    if [ "$(basename "$item")" = "$NAME" ]; then
      cp "$item" "$TARGET.new"
    elif [[ "$item" == *.zip ]] && unzip -Z -1 "$item" 2>/dev/null | grep -Fxq "$NAME"; then
      unzip -p "$item" "$NAME" > "$TARGET.new"
    else
      echo "Skipping unrelated audio ZIP / unexpected checkpoint: $item"
      continue
    fi
    if [ "$(wc -c < "$TARGET.new")" -le 25000000 ]; then
      rm -f "$TARGET.new"
      echo "Skipping incomplete original Brain: $item"
      continue
    fi
    mv "$TARGET.new" "$TARGET"
    FOUND="$item"
    break
  done
  if [ -z "$FOUND" ]; then
    echo "No valid original trained 9D Brain checkpoint found. A blank Brain will NOT be started."
    echo "Download Braivour_Native_9D_Sound_Transform_WAVs_And_Brain.zip into Android Downloads."
    echo "Run termux-setup-storage, grant access and rerun install.sh."
    echo "Or pass the full path to that ZIP as the first argument."
    exit 3
  fi
  echo "Installed original nine-dimensional checkpoint from: $FOUND"
fi

test -s "$TARGET"
test -f "v17/transcend/torus-aether/devour/brain.mjs"
test -f "research/catmeows_native/native_temporal_body.mjs"
test -f "research/catmeows_native/termux_audio/server.mjs"
echo "Brain is ready:"
ls -lh "$TARGET"
echo "START: bash research/catmeows_native/termux_audio/start.sh"
echo "WEB UI: http://127.0.0.1:8765"

#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
CORPUS="$HOME/storage/downloads/octopus-text.txt"
if [[ $# -ge 1 ]]; then CORPUS="$1"; fi
if [[ ! -f "$CORPUS" ]]; then
  echo "Required real corpus file missing: $CORPUS"
  echo "Usage: bash v17/RUN_V19_COGNITIVE_TERMUX.sh /absolute/path/to/text.txt"
  exit 1
fi
command -v node >/dev/null || { echo "Install Node.js: pkg install nodejs-lts"; exit 1; }
echo "V19 Native V17 cognitive map; actual text corpus; no next-token training."
echo "Open http://127.0.0.1:8871/transcend/torus-aether/ui/index.html?live=1"
node transcend/torus-aether/devour/devour.mjs --workers 1 --arms stable+many \
 --worlds cognitivemap --text "$CORPUS" --out runtime-v19-cognitive-termux \
 --port 8871 --gpu off --mem 2 --resume --start

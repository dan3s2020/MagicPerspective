#!/data/data/com.termux/files/usr/bin/bash
# Run in an isolated checkout of experiment/V17-SELF-CODE-NOISE-LOCK-20261106
# No fake GPU, no Parquet dataset required.
set -euo pipefail
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Install Node.js: pkg install nodejs-lts"; exit 1; }
mkdir -p runtime-selfcode-termux
echo "V17 native self-code world: http://127.0.0.1:8867/transcend/torus-aether/ui/index.html?live=1"
node transcend/torus-aether/devour/devour.mjs \
 --workers 1 --arms stable+many --mem 2 \
 --worlds code --out runtime-selfcode-termux --port 8867 \
 --gpu off --resume --start
#!/data/data/com.termux/files/usr/bin/bash
# Real continuous V17 brain: maze + transformation + its own code universe.
# Isolated data and checkpoints; unchanged original V17 main/install.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
command -v node >/dev/null || { echo 'Install nodejs: pkg install nodejs'; exit 1; }
PORT="${MP_PORT:-8092}"
MEM="${MP_MEM_GB:-1.3}"
# Reject an occupied server port instead of silently training with no browser.
node - "$PORT" <<'JS'
const net=require('node:net');
const port=Number(process.argv[2]);
if(!Number.isInteger(port)||port<1024||port>65535)process.exit(2);
const server=net.createServer();
server.once('error',err=>{console.error(`Port ${port} unavailable: ${err.message}`);process.exit(3)});
server.listen(port,'127.0.0.1',()=>server.close());
JS
echo "Native V17 viewer: http://127.0.0.1:${PORT}/"
mkdir -p "$ROOT/v17/runtime-native-selfcode-termux"
node "$ROOT/v17/transcend/torus-aether/devour/devour.mjs" \
  --workers 1 --arms stable+many --worlds maze,transform,selfcode \
  --text "$ROOT/v17/docs/TORUS_AETHER_ABC_20261104.md" \
  --gpu off --mem "$MEM" --every 100 --maze-every 20 \
  --out "$ROOT/v17/runtime-native-selfcode-termux" --port "$PORT" --start --resume

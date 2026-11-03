#!/data/data/com.termux/files/usr/bin/bash
# Original V7 maze/relief UI + original Graph Dance UI. Two processes, no overwrites.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
if ! command -v node >/dev/null 2>&1; then pkg install -y nodejs; fi
check_port() {
  node -e '
    const net=require("node:net");
    const port=Number(process.argv[1]);
    const server=net.createServer();
    server.once("error",()=>{console.error("PORT "+port+" OCUPAT: opreste serverul vechi cu Ctrl+C si ruleaza din nou.");process.exit(2);});
    server.listen(port,"127.0.0.1",()=>server.close());
  ' "$1"
}
check_port 3036
check_port 3040
printf '\nMAGICPERSPECTIVE ORIGINAL UI + UNLIMITED TRAINING\n'
printf 'Relief + Labirint: http://127.0.0.1:3036\n'
printf 'Abstract Networks:  http://127.0.0.1:3040\n'
printf 'Antrenare: alege ∞ Nelimitat si apasa Antreneaza. Ctrl+C inchide ambele servere.\n\n'
HOST=127.0.0.1 PORT=3036 node "$ROOT/v7/server.mjs" &
V7_PID=$!
HOST=127.0.0.1 PORT=3040 node "$ROOT/experiments/graph-dance-20261103/server.mjs" &
GRAPH_PID=$!
cleanup(){
  kill "$V7_PID" "$GRAPH_PID" 2>/dev/null || true
  wait "$V7_PID" "$GRAPH_PID" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
wait -n "$V7_PID" "$GRAPH_PID"

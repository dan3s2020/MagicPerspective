#!/data/data/com.termux/files/usr/bin/bash
# Full V17 with live controls, real worlds and original UI; separate branch and runtime.
set -Eeuo pipefail
HERE="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd -P)"
REPO="$(cd "$HERE/.." && pwd -P)"
EXPECTED="fix/V17-LIVE-STOCHASTIC-CONTROLS-ISOLATED-20261105"
command -v node >/dev/null 2>&1 || { echo "Install Node.js: pkg install -y nodejs git" >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo "Install Git: pkg install -y git" >&2; exit 1; }
BRANCH="$(git -C "$REPO" symbolic-ref --quiet --short HEAD || true)"
[[ "$BRANCH" == "$EXPECTED" ]] || { echo "Refusing to run in $BRANCH. Separate isolated clone of $EXPECTED required." >&2; exit 1; }
[[ "$(node -p 'Number(process.versions.node.split(".")[0])')" -ge 20 ]] || { echo "Node.js 20+ required" >&2; exit 1; }
WORKERS=1; ARMS="stable+many"; MEM=".5"; WORLDS="text,maze,transform"; TEXT=""; DATA=""
PORT=8861; EVERY=200000; CHARS=0; MAZE_EVERY=4000; FRESH=0; START=0
usage(){ cat <<'EOF'
MagicPerspective V17 isolated Termux, same real engine/UI and live stochastic controls.
  bash v17/run-v17-live-controls-isolated.sh -Text "$HOME/storage/downloads/octopus-text.txt" -Workers 1 -Mem 0.5 -Worlds text,maze,transform
  bash v17/run-v17-live-controls-isolated.sh -Data "$HOME/training/OpenThoughts3-1.2M" -Start
Options: -Text FILE or -Data DIRECTORY; -Workers N; -Arms NAME; -Mem GB; -Worlds LIST; -Port N; -Every N; -Chars N; -MazeEvery N; -Start; -Resume; -Fresh
CPU on Termux (no fake CUDA). Save/resume only in v17/runtime-live-controls-isolated.
EOF
}
while (($#)); do
  key="$1"; case "$key" in
    -h|--help|-Help) usage; exit 0 ;;
    -Start|--start) START=1; shift ;;
    -Fresh|--fresh) FRESH=1; shift ;;
    -Resume|--resume) FRESH=0; shift ;;
    -Workers|-Arms|-Mem|-Worlds|-Text|-Data|-Port|-Every|-Chars|-MazeEvery)
      (($#>=2)) || { echo "Missing value for $key" >&2; exit 1; }
      case "$key" in
        -Workers) WORKERS="$2";; -Arms) ARMS="$2";; -Mem) MEM="$2";; -Worlds) WORLDS="$2";;
        -Text) TEXT="$2";; -Data) DATA="$2";; -Port) PORT="$2";; -Every) EVERY="$2";;
        -Chars) CHARS="$2";; -MazeEvery) MAZE_EVERY="$2";;
      esac; shift 2 ;;
    *) echo "Unknown flag: $key" >&2; exit 1 ;;
  esac
done
[[ "$WORKERS" =~ ^[1-9][0-9]*$ && "$PORT" =~ ^[0-9]+$ && "$EVERY" =~ ^[1-9][0-9]*$ && "$CHARS" =~ ^[0-9]+$ && "$MAZE_EVERY" =~ ^[1-9][0-9]*$ ]] || { echo "Invalid integer parameter" >&2; exit 1; }
[[ "$MEM" =~ ^[0-9]+(\.[0-9]+)?$ ]] || { echo "Invalid memory value" >&2; exit 1; }
[[ -z "$TEXT" || -z "$DATA" ]] || { echo "Use -Text OR -Data, not both" >&2; exit 1; }
if [[ -z "$TEXT" && -z "$DATA" ]]; then
  if [[ -f "$HOME/storage/downloads/octopus-text.txt" ]]; then TEXT="$HOME/storage/downloads/octopus-text.txt"
  elif [[ -d "$HOME/training/OpenThoughts3-1.2M" ]]; then DATA="$HOME/training/OpenThoughts3-1.2M"
  else echo "Real corpus missing: use -Text FILE or -Data PARQUET_DIRECTORY" >&2; exit 1; fi
fi
INPUT=()
if [[ -n "$TEXT" ]]; then
  IFS=',' read -r -a files <<< "$TEXT"
  for file in "\${files[@]}"; do [[ -f "$file" ]] || { echo "Real text corpus missing: $file" >&2; exit 1; }; done
  INPUT=(--text "$TEXT")
else
  [[ -d "$DATA" ]] || { echo "Real parquet directory missing: $DATA" >&2; exit 1; }
  INPUT=(--data "$DATA")
fi
RUNTIME="$HERE/runtime-live-controls-isolated"
mkdir -p "$RUNTIME"
HEAP="$(node -p 'Math.ceil(Number(process.argv[1])*1024*1.7)' "$MEM")"
ARGS=("--max-old-space-size=$HEAP" "$HERE/transcend/torus-aether/devour/devour.mjs"
  --workers "$WORKERS" --arms "$ARMS" --mem "$MEM" --worlds "$WORLDS"
  --every "$EVERY" --chars "$CHARS" --maze-every "$MAZE_EVERY" --out "$RUNTIME" --port "$PORT" --gpu off)
((FRESH)) || ARGS+=(--resume)
((START)) && ARGS+=(--start)
echo "MAGICPERSPECTIVE V17 ISOLATED / TERMUX"
echo "Original native controls and live sliders: http://127.0.0.1:$PORT/"
echo "Observatory: http://127.0.0.1:$PORT/transcend/torus-aether/devour/observatory.html"
echo "Checkpoint data: $RUNTIME"
echo "Workers $WORKERS, memory $MEM GB each, worlds $WORLDS, no fake training data"
cd "$HERE"
exec node "\${ARGS[@]}" "\${INPUT[@]}"

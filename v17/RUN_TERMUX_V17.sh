#!/usr/bin/env sh
# MagicPerspective native V17 runner for Termux / ordinary POSIX shells.
# CPU-only: Android has no NVIDIA CUDA runtime. No change to original Node brain.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$HERE"

usage() {
  cat <<'HELP'
MagicPerspective V17 native CPU training (Termux / Linux)

  sh v17/RUN_TERMUX_V17.sh --text /path/to/corpus.txt
  sh v17/RUN_TERMUX_V17.sh --data /path/to/parquet/folder
  sh v17/RUN_TERMUX_V17.sh --sample
  sh v17/RUN_TERMUX_V17.sh --worlds maze,transform

Options:
  --text FILE        Training text with paragraphs separated by blank lines
  --data DIR         Existing OpenThoughts (or compatible) Parquet files
  --sample           Use the repository's existing V17 documentation as TEXT
  --worlds LIST      text,maze,transform (default), or any subset
  --port PORT        HTTP port (default 8866)
  --out DIR          Isolated runtime directory
  --mem GB           Node per-brain budget (default 0.65 GB)
  --every N          Frozen evaluation interval in characters (default 50000)
  --maze-every N     World episode interval in text characters (default 4000)
  --chars N          Training character limit; 0 = until source exhausted
  --paused           Wait for Start in native browser UI
  --fresh            Do NOT resume; archives previous brain files as native V17 does
  --trace            Record opt-in actual training transitions
  --help             Print usage

GPU shared PyTorch head and CUDA audit are not run by this CPU launcher.
To use native V17 from a browser on the same phone:
  http://127.0.0.1:8866/transcend/torus-aether/ui/index.html?live=1
Stop using Ctrl+C: native V17 saves its brain as it stops.
HELP
}

command -v node >/dev/null 2>&1 || {
  echo "Missing Node.js. In Termux run: pkg update && pkg install nodejs git"
  exit 1
}
NODE_MAJOR=$(node -p "parseInt(process.versions.node.split('.')[0],10)")
[ "$NODE_MAJOR" -ge 20 ] || {
  echo "Node.js 20+ required (found $(node --version)). Install/update nodejs."
  exit 1
}

WORLDS="text,maze,transform"
PORT=8866
MEM=0.65
EVERY=50000
MAZE_EVERY=4000
CHARS=0
OUT="$HERE/runtime-termux-20261106"
TEXT=""
DATA=""
SAMPLE=0
PAUSED=0
FRESH=0
TRACE=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --text|--data|--worlds|--port|--out|--mem|--every|--maze-every|--chars)
      [ "$#" -ge 2 ] || { echo "Missing value for $1" >&2; exit 2; }
      case "$1" in
        --text) TEXT=$2 ;;
        --data) DATA=$2 ;;
        --worlds) WORLDS=$2 ;;
        --port) PORT=$2 ;;
        --out) OUT=$2 ;;
        --mem) MEM=$2 ;;
        --every) EVERY=$2 ;;
        --maze-every) MAZE_EVERY=$2 ;;
        --chars) CHARS=$2 ;;
      esac
      shift 2 ;;
    --sample) SAMPLE=1; shift ;;
    --paused) PAUSED=1; shift ;;
    --fresh) FRESH=1; shift ;;
    --trace) TRACE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$WORLDS" in
  text|maze|transform|text,maze|maze,text|text,transform|transform,text|maze,transform|transform,maze|text,maze,transform|text,transform,maze|maze,text,transform|maze,transform,text|transform,text,maze|transform,maze,text) ;;
  *) echo "Invalid --worlds list: $WORLDS" >&2; exit 2 ;;
esac
case "$PORT" in ''|*[!0-9]*) echo "Invalid port: $PORT" >&2; exit 2 ;; esac
[ "$PORT" -ge 1024 ] && [ "$PORT" -le 65535 ] || { echo "Port must be 1024..65535" >&2; exit 2; }
case "$CHARS" in ''|*[!0-9]*) echo "Invalid --chars: $CHARS" >&2; exit 2 ;; esac
case "$EVERY" in ''|*[!0-9]*) echo "Invalid --every: $EVERY" >&2; exit 2 ;; esac
case "$MAZE_EVERY" in ''|*[!0-9]*) echo "Invalid --maze-every: $MAZE_EVERY" >&2; exit 2 ;; esac
[ "$EVERY" -gt 0 ] && [ "$MAZE_EVERY" -gt 0 ] || { echo "Evaluation/world intervals must be positive" >&2; exit 2; }
case "$MEM" in ''|*[!0-9.]*|.*.*.*) echo "Invalid --mem: $MEM" >&2; exit 2 ;; esac

if [ -n "$DATA" ] && { [ -n "$TEXT" ] || [ "$SAMPLE" -eq 1 ]; }; then
  echo "Choose only one input: --text, --data, or --sample." >&2; exit 2
fi
if [ -n "$TEXT" ] && [ "$SAMPLE" -eq 1 ]; then
  echo "Choose --text or --sample, not both." >&2; exit 2
fi

if [ "$SAMPLE" -eq 1 ]; then
  TEXT="$HERE/docs/TORUS_AETHER_ABC_20261104.md"
  echo "SAMPLE SOURCE: original V17 documentation; not an OpenThoughts Q/A dataset."
fi

if [ -z "$DATA" ] && [ -z "$TEXT" ]; then
  case ",$WORLDS," in
    *,text,*) echo "Text training needs --text FILE, --data DIR, or --sample" >&2; usage >&2; exit 2 ;;
    *)
      # V17 initializes source metadata even for maze-only/transform-only worlds.
      TEXT="$HERE/docs/TORUS_AETHER_ABC_20261104.md"
      echo "Maze/transform-only: using built-in documentation for source metadata (NOT trained)."
      ;;
  esac
fi

if [ -n "$DATA" ]; then
  [ -d "$DATA" ] || { echo "Dataset folder missing: $DATA" >&2; exit 1; }
  echo "Dataset: $DATA"
  set -- --data "$DATA"
else
  [ -f "$TEXT" ] || { echo "Text file missing: $TEXT" >&2; exit 1; }
  [ -s "$TEXT" ] || { echo "Text file is empty: $TEXT" >&2; exit 1; }
  echo "Text source: $TEXT"
  set -- --text "$TEXT"
fi

SAVE="$OUT/brains/brain-0-stable+many.v8"
if [ "$FRESH" -eq 0 ] && [ -f "$SAVE" ]; then
  set -- "$@" --resume
  echo "Resuming independent Termux brain: $SAVE"
elif [ "$FRESH" -eq 1 ]; then
  echo "Fresh session requested; native trainer archives previous brain saves."
fi
if [ "$PAUSED" -eq 0 ]; then set -- "$@" --start; fi
if [ "$TRACE" -eq 1 ]; then set -- "$@" --trace-transformations; fi

echo "Original V17 UI: http://127.0.0.1:$PORT/transcend/torus-aether/ui/index.html?live=1"
echo "CPU mode: original brain/maze/transform/text, NO CUDA, NO PyTorch shared updates."
echo "Runtime: $OUT"
echo "Use Ctrl+C once to stop and save."

# Avoid a direct exec so the shell's Ctrl+C foreground handling remains normal.
node transcend/torus-aether/devour/devour.mjs \
  --workers 1 --arms "stable+many" --mem "$MEM" \
  --worlds "$WORLDS" --maze-every "$MAZE_EVERY" \
  --every "$EVERY" --chars "$CHARS" \
  --out "$OUT" --port "$PORT" --gpu off \
  "$@"

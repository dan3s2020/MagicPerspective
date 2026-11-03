#!/data/data/com.termux/files/usr/bin/bash
# MagicPerspective V11 in Termux (CPU, NumPy): git pull, then  bash v11/run-termux.sh
set -e
cd "$(dirname "$0")"
command -v python >/dev/null 2>&1 || pkg install -y python
python -c "import numpy" 2>/dev/null || pkg install -y python-numpy
printf "\nMagicPerspective V11 — http://127.0.0.1:3047\n"
HOST=127.0.0.1 PORT=3047 python server.py --device cpu

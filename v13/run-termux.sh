#!/data/data/com.termux/files/usr/bin/bash
# MagicPerspective V13 — Bucla perspectivei. In Termux: git pull, then  bash v13/run-termux.sh
set -e
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || pkg install -y nodejs-lts
printf "\nMagicPerspective V13 — http://127.0.0.1:3048\n"
HOST=127.0.0.1 PORT=3048 node server.mjs

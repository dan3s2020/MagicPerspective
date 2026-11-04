#!/data/data/com.termux/files/usr/bin/bash
# MagicPerspective V16 — Țesătura vie. In Termux: git pull, then  bash v16/run-termux.sh
set -e
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || pkg install -y nodejs-lts
printf "\nMagicPerspective V13 — http://127.0.0.1:3051\n"
HOST=127.0.0.1 PORT=3051 node server.mjs

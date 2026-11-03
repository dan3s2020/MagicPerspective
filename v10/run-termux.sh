#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  pkg install -y nodejs
fi
printf "\nMagicPerspective V10 — http://127.0.0.1:3046\n"
HOST=127.0.0.1 PORT=3046 node server.mjs

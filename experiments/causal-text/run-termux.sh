#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then pkg install -y nodejs; fi
printf '\nMagic Perspective Causal Text Lab — http://127.0.0.1:3038\n'
HOST=127.0.0.1 PORT=3038 node server.mjs

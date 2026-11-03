#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then pkg install -y nodejs; fi
printf '\nMagic Perspective V6 — http://127.0.0.1:3036\n'
HOST=127.0.0.1 PORT=3036 node server.mjs

#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  pkg install -y nodejs
fi
printf '\nPerspective Escape laboratory — http://127.0.0.1:3037\n'
HOST=127.0.0.1 PORT=3037 node escape-server.mjs

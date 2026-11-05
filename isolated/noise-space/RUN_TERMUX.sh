#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo 'Install Node inside Termux: pkg install nodejs'; exit 1; }
node --test test.mjs
HOST=127.0.0.1 PORT=8897 node server.mjs
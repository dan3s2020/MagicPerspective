#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then echo 'Install Node.js first: pkg install nodejs'; exit 1; fi
mkdir -p data
HOST=127.0.0.1 PORT=3041 node server.mjs

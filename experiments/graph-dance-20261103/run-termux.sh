#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
node --version
printf '\nMagicPerspective Graph Dance Experiment — http://127.0.0.1:3040\n\n'
exec node server.mjs

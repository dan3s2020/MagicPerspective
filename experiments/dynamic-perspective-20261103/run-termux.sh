#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo 'Instalează Node.js cu: pkg install nodejs'; exit 1; }
echo 'MagicPerspective · Dynamic Perspective Lab · http://127.0.0.1:3043'
exec node server.mjs

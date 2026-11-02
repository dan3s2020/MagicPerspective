#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Installing via Termux pkg..."
  pkg install -y nodejs
fi
node --version
printf '\nStarting MagicPerspective — open http://127.0.0.1:3030 in your Android browser.\n'
node server.js

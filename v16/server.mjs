// MagicPerspective V13 — local static server (the engine runs in the browser).  node server.mjs   → http://127.0.0.1:3048
import http from 'node:http'; import {readFile} from 'node:fs/promises'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'web'), port = Number(process.env.PORT || 3051), host = process.env.HOST || '127.0.0.1';
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8'};
http.createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  if (!/^[\w.-]+$/.test(name)) { res.writeHead(404); return res.end(); }
  try { const b = await readFile(path.join(root, name)); res.writeHead(200, {'Content-Type': MIME[path.extname(name)] || 'application/octet-stream', 'Cache-Control': 'no-cache'}); res.end(b); }
  catch { res.writeHead(404); res.end('not found'); }
}).listen(port, host, () => console.log(`MagicPerspective V16 · Țesătura vie · http://${host}:${port}`));

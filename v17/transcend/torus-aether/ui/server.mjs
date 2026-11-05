// node transcend/torus-aether/ui/server.mjs [text-file] [port]
// Serves the living-graph page. The page trains everything itself in the browser; this server only hands it the
// corpus (a text file you give, or the repository's docs) and the module files.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {exec} from "node:child_process";
import {fileURLToPath} from "node:url";
import {corpusFromText, repoDocsCorpus} from "../measure.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../../..");
const file = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? path.resolve(process.argv[2]) : null;
const port = +(process.argv.find(a => /^\d+$/.test(a)) || 8840);
const corpus = file ? corpusFromText(fs.readFileSync(file, "utf8")) : repoDocsCorpus();
const name = file ? path.basename(file) : "repo docs";
const types = {".html": "text/html; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css"};

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/corpus") { res.writeHead(200, {"content-type": "application/json"}); return res.end(JSON.stringify({name, ...corpus})); }
  if (url === "/") { res.writeHead(302, {location: "/transcend/torus-aether/ui/index.html"}); return res.end(); }
  const rel = url.replace(/^\/+/, "");
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(path.join(root, "transcend")) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, {"content-type": types[path.extname(abs)] || "application/octet-stream", "cache-control": "no-store"});
  fs.createReadStream(abs).pipe(res);
}).listen(port, "127.0.0.1", () => {
  const u = `http://127.0.0.1:${port}/`;
  console.log(`Living graph: ${u}   corpus: ${name} (${corpus.train.length} train lines, ${corpus.held.length} held-out lines)   Ctrl+C to stop`);
  const open = process.platform === "win32" ? `start "" "${u}"` : process.platform === "darwin" ? `open "${u}"` :
    process.env.PREFIX?.includes("com.termux") ? `termux-open-url "${u}"` : `xdg-open "${u}"`;
  exec(open, () => {});
});

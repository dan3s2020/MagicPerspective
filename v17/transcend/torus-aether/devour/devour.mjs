// node transcend/torus-aether/devour/devour.mjs [--workers 8] [--data D:\training\OpenThoughts3-1.2M | --text a.txt,b.txt]
//      [--arms winner,stable+many,…] [--every 200000] [--chars 0] [--mem 3] [--out runtime-devour] [--port 8841]
//      [--worlds text,maze] [--maze-every 4000] [--resume]
// http://127.0.0.1:<port>/ opens the living graph (the 5-torus you navigate), fed live by the devouring graphs;
// /dashboard has the curves of every graph on the unseen text.
// Many graphs at once, each devouring its own share of the world once (no repetition), all tested on the same unseen
// text (with several arms, each group of arms shares the same part of the world). One worker thread per graph (the graphs are independent; each one is sequential by nature: it lives byte by
// byte). Ctrl+C stops them all and prints the summary. A JSON line per test goes to <out>/log.jsonl.
import {Worker} from "node:worker_threads";
import http from "node:http";
import {exec} from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {openTextDataset, DEFAULT_TEXT_ROOT} from "../data/text-dataset.mjs";
import {Brain} from "./brain.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const workers = +arg("workers", Math.max(1, os.cpus().length - 1)), every = +arg("every", 200000), maxChars = +arg("chars", 0) || Infinity;
const memGB = +arg("mem", 3), out = path.resolve(arg("out", "runtime-devour")), evalChars = +arg("eval", 4000);
// worlds the same brains live: text (the corpus) and/or maze (the 2D maps); brains are saved in <out>/brains and
// --resume continues every brain from its save; /reset (the page's button) starts every brain again from nothing
// many worlds at once on the GPU (gpu/worlds_gpu.py): --gpu cuda:0|cuda:1|cpu|off, --gpu-worlds N (no limit here),
// --vram GB (split among the brains), --gpu-util % (the card works, then rests, so its average use is this)
let gpuSettings = {device: arg("gpu", "off"), worlds: +arg("gpu-worlds", 0), textBatch: +arg("gpu-text-batch", 2), textChunk: +arg("gpu-text-chunk", 128), vram: +arg("vram", 0), util: +arg("gpu-util", 100)};
const worldsArg = arg("worlds", "text").split(",").map(x => x.trim()).filter(Boolean), mazeEvery = +arg("maze-every", 4000), resume = process.argv.includes("--resume");
for (const x of worldsArg) if (!["text", "maze", "transform", "selfcode"].includes(x)) throw Error("unknown world " + x + " (text, maze, transform, selfcode)");
const BASE = {depth: 1, off: ["R2", "R4"], budEvery: 100, empty: true, maxWires: 32};
const ARMS = {winner: {...BASE, fold: false}, log: {...BASE, fold: "log"}, event: {...BASE, fold: "event"}, concepts: {...BASE, fold: "blend"}};
// C's laws (laws/cexp.mjs): "stable" — C needs more evidence to change perspective; "grow" — C's attention may grow to 6
// positions with experience (both measured as arms on the big world; the winner keeps the engine's C)
const CLAWS = {stable: {margin: .05, window: 400}, grow: {cap: 6}, "stable+grow": {cap: 6, margin: .05, window: 400}, many: {many: 12}, "stable+many": {margin: .05, window: 400, many: 12}};
const arms = arg("arms", "winner").split(",").map(a => { if (CLAWS[a]) return {name: a, rules: ARMS.winner, c: CLAWS[a]};
  if (!ARMS[a]) throw Error("unknown arm " + a + " (" + [...Object.keys(ARMS), ...Object.keys(CLAWS)] + ")"); return {name: a, rules: ARMS[a]}; });

let source, evalText = "", heldPick = async () => [];          // heldPick(n): n unseen exercises drawn at random (Evaluare)
if (arg("text")) {
  const files = arg("text").split(",").map(f => path.resolve(f)), heldSet = [], heldParas = []; let k = 0;
  for (const f of files) for (const para of fs.readFileSync(f, "utf8").split(/\n\s*\n/)) { if (para.trim().length < 20) continue; k++;
    if (k % 10 === 0) { heldSet.push(k); heldParas.push(para + "\n\n"); if (evalText.length < evalChars) evalText += para + "\n\n"; } }
  heldPick = async n => Array.from({length: n}, () => heldParas[Math.floor(Math.random() * heldParas.length)]);
  source = {kind: "text", files, heldSet};
} else {
  const root = arg("data", DEFAULT_TEXT_ROOT), ds = await openTextDataset(root);
  for (let k = 0; k < ds.held && evalText.length < evalChars; k++) { const x = await ds.heldOut(k); evalText += "Q: " + x.prompt + "\nA: " + x.answer + "\n\n"; }
  source = {kind: "parquet", root};
  heldPick = async n => { const o = []; for (let j = 0; j < n; j++) { const x = await ds.heldOut(Math.floor(Math.random() * ds.held)); o.push("Q: " + x.prompt + "\nA: " + x.answer + "\n\n"); } return o; };
  console.log(`world: ${root} · ${ds.total.toLocaleString()} exercises in ${ds.files.length} files · ${ds.held} kept unseen for the test`);
}
evalText = evalText.slice(0, evalChars);
fs.mkdirSync(out, {recursive: true}); const log = fs.createWriteStream(path.join(out, "log.jsonl"), {flags: "a"});
console.log(`worlds: ${worldsArg.join(" + ")} in the same brains${worldsArg.includes("maze") ? ` (a labyrinth every ${mazeEvery.toLocaleString()} chars)` : ""} · saves in ${path.join(out, "brains")}${resume ? " · resuming" : ""}`);
console.log(`GPU worlds: ${gpuSettings.device === "off" ? "off (worlds one at a time on the CPU)" : `${gpuSettings.device} · ${gpuSettings.worlds} worlds at once · VRAM ${gpuSettings.vram || "all"} GB · ${gpuSettings.util}% of the GPU`}`);
console.log(`${workers} graphs devouring at once · arms ${arms.map(a => a.name).join(", ")} · test every ${every.toLocaleString()} chars on ${evalText.length} unseen chars · memory budget ${memGB} GB each`);

// Every graph is a slot you control from the page: start, pause, reset (from nothing), save, remove; new graphs can be
// added with their own arm and worlds. With --start the graphs begin training at once; otherwise they wait for Start.
const slots = [], last = new Map(), history = new Map(), graphs = new Map(); let started = new Date().toISOString(), stopping = false;
const root = path.resolve(here, "../../..");
const world = source.kind === "parquet" ? source.root : source.files.map(f => path.basename(f)).join(", ");
const port = +arg("port", 8841), autostart = process.argv.includes("--start"), brainsDir = path.join(out, "brains");
const armOf = name => CLAWS[name] ? {name, rules: ARMS.winner, c: CLAWS[name]} : ARMS[name] ? {name, rules: ARMS[name]} : null;
const saveOf = sl => path.join(brainsDir, `brain-${sl.w}-${sl.arm.name}.v8`);
function slotInfo(sl) { const g = graphs.get(sl.w), t = last.get(sl.w);
  const G = g?.gpu || t?.gpu || null;
  return {w: sl.w, arm: sl.arm.name, worlds: sl.worlds, status: sl.status, error: sl.lastError || null, gpu: G, chars: g?.chars || t?.chars || 0, test: t?.test || null, maze: g?.maze || t?.maze || null, transform: t?.transform || g?.transform || null, selfcode: g?.selfcode || t?.selfcode || null,
    perspective: g?.perspective || t?.perspective || null,
    constructedPaths: g?.constructedPaths || t?.constructedPaths || null,
    language: g?.language || t?.language || null, endogenousNoise: g?.endogenousNoise || t?.endogenousNoise || null, final: !!t?.final}; }
function launch(sl, {fresh = false, paused = !autostart, fromSave = true} = {}) {          // a worker thread holds one brain
  sl.lastError = null;
  if (sl.wk) { sl.gen++; sl.wk.terminate(); }
  if (fresh && fs.existsSync(saveOf(sl))) { fs.mkdirSync(path.join(out, "brains-before-reset"), {recursive: true}); fs.renameSync(saveOf(sl), path.join(out, "brains-before-reset", Date.now() + "-" + path.basename(saveOf(sl)))); }
  if (fresh) for (const suffix of [".shared.pt", ".causal.json", ".transitions.jsonl"]) {
    const old = saveOf(sl) + suffix;
    if (fs.existsSync(old)) { fs.mkdirSync(path.join(out, "brains-before-reset"), {recursive: true});
      fs.renameSync(old, path.join(out, "brains-before-reset", Date.now() + "-" + path.basename(old))); }
  }
  if (fresh) { last.delete(sl.w); history.delete(sl.w); graphs.delete(sl.w); }
  const gen = ++sl.gen, share = sl.share, shares = Math.max(1, Math.ceil(slots.length / arms.length));
  fs.mkdirSync(brainsDir, {recursive: true});
  const wk = new Worker(path.join(here, "worker.mjs"), {workerData: {w: share, n: shares, gw: sl.w, source, arm: sl.arm, every, maxChars, memGB, evalText,
    worlds: sl.worlds, mazeEvery, saveFile: saveOf(sl), resume: !fresh && fromSave, paused, gpu: gpuFor(), controls: sl.controls || null,
    traceTransformations: process.argv.includes("--trace-transformations"), endogenousNoise: process.argv.includes("--endogenous-noise")}, resourceLimits: {maxOldGenerationSizeMb: Math.round(memGB * 1024 * 1.6)}});
  sl.wk = wk; sl.status = paused ? "oprit" : "antrenează";
  wk.on("message", m => {
    if (gen !== sl.gen) return;
    if (m.type === "note") return console.log(`#${sl.w} ${m.text}`);
    if (m.type === "fatal") { sl.lastError = m.text; sl.status = "eroare"; return console.error(`#${sl.w} ${m.text}`); }
    if (m.type === "graph") { const old = graphs.get(sl.w); if (!m.text && old?.text) m.text = old.text; graphs.set(sl.w, m); return; }   // its living graph
    if (m.type === "chat") { const cb = chats.get(m.id); if (cb) { chats.delete(m.id); cb(m); } return; }
    if (m.type === "saved") { sl.savedMB = m.MB; for (const f of sl.onSaved?.splice(0) || []) f(); return console.log(`#${sl.w} saved ${m.MB.toFixed(0)} MB → ${saveOf(sl)}`); }
    last.set(sl.w, m); if (!history.has(sl.w)) history.set(sl.w, []); history.get(sl.w).push(m); log.write(JSON.stringify({time: new Date().toISOString(), ...m}) + "\n");
    if (m.final) sl.status = "gata";
    const t = m.test, p = v => (100 * v).toFixed(1).padStart(5) + "%", tf = m.transform?.test ? ` | transforms unseen solved ${p(m.transform.test.solved)} steps/optimal ${m.transform.test.ratio?.toFixed(2) ?? "—"} wrong predictions ${p(m.transform.test.failedRate || 0)} limitation ${m.transform.test.saidLimitation}/${m.transform.test.impossible}` : "", mz = m.maze ? ` | labyrinths lived ${m.maze.played} · unseen solved ${m.maze.test ? p(m.maze.test.solved) : "—"} steps/optimal ${m.maze.test?.ratio?.toFixed(2) ?? "—"} shape ${m.maze.test ? p(m.maze.test.shape) : "—"}` : "";
    console.log(`#${String(sl.w).padStart(2)} ${m.arm.padEnd(8)} ${(m.chars / 1e6).toFixed(2).padStart(7)}M chars ${String(m.exercises).padStart(6)} ex` +
      (t ? ` | unseen: ALIGNED ${p(t.aligned)}  graph ${p(t.live)}  field ${p(t.field)}  together ${p(t.together)}  C ${p(t.C)}  masked ${p(t.masked)}` : "") + mz + tf +
      (m.gpu ? ` | GPU ${m.gpu.info?.name || m.gpu.info?.device || m.gpu.settings.device}${m.gpu.error ? " ERROR " + m.gpu.error : ` ${m.gpu.settings.worlds} worlds/batch${m.gpu.maze?.vramUsedGB != null ? " VRAM " + m.gpu.maze.vramUsedGB + " GB" : ""}`}` : "") + ` | C ${m.cActive} lag ${m.cLag} flips ${m.cFlips} | ${(m.speed / 1000).toFixed(1)}k/s ${m.heapGB.toFixed(2)} GB${m.savedMB ? ` saved ${m.savedMB.toFixed(0)}MB` : ""}${m.dissolved ? " dissolved " + m.dissolved : ""}${m.final ? "  DONE" : ""}`); });
  wk.on("error", err => console.error(`#${sl.w} error:`, err.message));
  wk.on("exit", () => { for (const f of sl.onSaved?.splice(0) || []) f(); if (gen === sl.gen) { sl.wk = null; if (sl.status !== "gata" && sl.status !== "eroare") sl.status = "oprit"; } });
}
function gpuFor() { const share = Math.max(1, slots.filter(x => x.worlds.some(w => w !== "text")).length); return gpuSettings.device === "off" ? null : {...gpuSettings, vram: gpuSettings.vram ? gpuSettings.vram / share : 0}; }
function addSlot(armName, worlds) { const arm = armOf(armName); if (!arm) throw Error("unknown arm " + armName);
  const w = slots.length ? Math.max(...slots.map(x => x.w)) + 1 : 0, sl = {w, arm, worlds, share: Math.floor(w / arms.length), gen: 0, wk: null, status: "oprit"}; slots.push(sl); launch(sl, {fresh: false, fromSave: resume || booted}); return sl; }
function control(sl, act) {
  if (act === "start") { if (!sl.wk) launch(sl, {paused: false}); else { sl.wk.postMessage("resume"); sl.status = "antrenează"; } }
  else if (act === "pause") { sl.wk?.postMessage("pause"); if (sl.wk) sl.status = "pauză"; }
  else if (act === "reset") launch(sl, {fresh: true, paused: sl.status !== "antrenează"});
  else if (act === "save") sl.wk?.postMessage("save");
  else if (act === "remove") { sl.gen++; sl.wk?.terminate(); slots.splice(slots.indexOf(sl), 1); last.delete(sl.w); history.delete(sl.w); graphs.delete(sl.w); }
}
// a new run without --resume keeps the old saves aside and starts from nothing
if (!resume && fs.existsSync(brainsDir) && fs.readdirSync(brainsDir).length) fs.renameSync(brainsDir, path.join(out, "brains-before-" + Date.now()));
let booted = false; for (let w = 0; w < workers; w++) addSlot(arms[w % arms.length].name, worldsArg); booted = true;
const chats = new Map(); let chatId = 0;                                     // talking to a graph: page → worker → page
const json = (res, o) => { res.writeHead(200, {"content-type": "application/json", "cache-control": "no-store"}); res.end(JSON.stringify(o)); };
http.createServer((req, res) => {
  const U = new URL(req.url, "http://x"), url = decodeURIComponent(U.pathname), q = U.searchParams;
  if (url === "/state") return json(res, {world, worlds: worldsArg, workers: slots.length, arms: arms.map(a => a.name), every, memGB, started, stopping,
    graphs: [...history.entries()].map(([w, h]) => ({w, arm: h.at(-1).arm, history: h.map(m => ({chars: m.chars, live: m.test?.live, C: m.test?.C, masked: m.test?.masked, bits: m.test?.bits, field: m.test?.field, together: m.test?.together, maze: m.maze?.recent})), last: h.at(-1)}))});
  if (req.method === "POST" && url === "/control") {                     // ?do=start|pause|reset|save|remove &w=<graph> (no w = every graph)
    const act = q.get("do"), w = q.get("w"), targets = w == null ? slots.slice() : slots.filter(x => x.w === +w);
    for (const sl of targets) control(sl, act); return json(res, {ok: true, graphs: slots.map(slotInfo)}); }
  if (req.method === "POST" && url === "/add") { try { addSlot(q.get("arm") || "stable+many", (q.get("worlds") || "text").split(",").filter(x => ["text", "maze", "transform", "selfcode"].includes(x))); return json(res, {ok: true}); } catch (err) { res.writeHead(400); return res.end(err.message); } }
  if (req.method === "POST" && url === "/gpu") {                         // the person's GPU settings, applied to every brain at its next batch
    for (const k of ["device", "worlds", "vram", "util", "textBatch"]) if (q.has(k) && q.get(k) !== "") gpuSettings[k] = k === "device" ? q.get(k) : Math.max(0, +q.get(k));
    for (const sl of slots) sl.wk?.postMessage({gpu: gpuFor() || {device: "off"}}); console.log("GPU settings:", JSON.stringify(gpuSettings)); return json(res, {ok: true, gpu: gpuSettings}); }
  if (req.method === "POST" && url === "/controls") {                    // ?w=<graph> (none = every graph) &ltemp=&pnoise=&gnoise=&glr=&repel=&wtemp=&ttemp=
    const c = {}; for (const k of ["ltemp", "pnoise", "gnoise", "glr", "repel", "wtemp", "ttemp"]) if (q.has(k) && Number.isFinite(+q.get(k))) c[k] = +q.get(k);
    const to = q.has("w") ? slots.filter(x => x.w === +q.get("w")) : slots; for (const sl of to) { sl.controls = {...(sl.controls || {}), ...c}; sl.wk?.postMessage({controls: c}); }
    return json(res, {ok: true, applied: c, graphs: to.map(x => x.w)}); }
  if (req.method === "POST" && url === "/eval") {                        // the Evaluare tab: body {w, kind: maze|text|transform, opts}; a copy from the save, on the CPU
    let body = ""; req.on("data", d => body += d); req.on("end", async () => { let m; try { m = JSON.parse(body); } catch { return json(res, {error: "bad json"}); }
      const sl = slots.find(x => x.w === +m.w); if (!sl) return json(res, {error: "nu există graful #" + m.w});
      const f = saveOf(sl);
      if (sl.wk) await new Promise(ok => { (sl.onSaved ||= []).push(ok); sl.wk.postMessage("save"); setTimeout(ok, 30000); });   // if it cannot save within 30 s, the last save is used   // the newest brain: it saves itself first
      if (!fs.existsSync(f)) return json(res, {error: "graful nu are încă un save"});
      const mt = fs.statSync(f).mtimeMs;
      if (!sl.ev || sl.ev.mt !== mt || sl.ev.dead) { sl.ev?.wk.terminate(); const wk = new Worker(path.join(here, "eval-worker.mjs"), {workerData: {saveFile: f}, resourceLimits: {maxOldGenerationSizeMb: Math.round(memGB * 1024 * 1.6)}});
        const ev = sl.ev = {wk, mt, wait: new Map(), id: 0}; ev.ready = new Promise((ok, no) => { wk.on("message", r => { if (r.type === "loaded") return ok(); const cb = ev.wait.get(r.id); if (cb) { ev.wait.delete(r.id); cb(r); } });
          wk.on("error", err => { ev.dead = true; no(err); for (const cb of ev.wait.values()) cb({error: err.message}); }); wk.on("exit", () => { ev.dead = true; }); }); }
      const ev = sl.ev; try { await ev.ready; } catch (err) { return json(res, {error: "save-ul nu s-a putut încărca: " + err.message}); }
      const opts = m.opts || {};
      const toB = t => Array.from(t, ch => { const c = ch.charCodeAt(0); return c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63; }).filter(c => c !== 13);
      if (m.kind === "text") { opts.own = !!(opts.text && opts.text.trim());     // your text, or unseen exercises drawn at random, new every time
        const list = opts.again && sl.lastText ? sl.lastText : opts.own ? [opts.text] : await heldPick(Math.max(1, Math.min(200, +opts.count || 12))); sl.lastText = list;   // "again": the same exercises
        opts.list = list.map(t => toB(t).slice(0, Math.max(50, +opts.max || 20000))); delete opts.text; }
      const id = ++ev.id; ev.wait.set(id, r => json(res, {...r, w: sl.w, source: m.kind === "text" ? (opts.own ? "textul tău" : "exerciții nevăzute trase la întâmplare din " + world) : undefined})); ev.wk.postMessage({id, kind: m.kind, opts}); }); return; }
  // Frozen multilingual/token-scale continuation from the SAME lived source.
  // The model gets no held-out training updates during this endpoint.
  if (req.method === "POST" && url === "/language-eval") {
    const sl=slots.find(x=>x.w===+(q.get('w')||0));
    if(!sl||!sl.worlds.includes('text')||!sl.wk)
      return json(res,{error:'Select a running graph training actual text'});
    const id=++chatId,timer=setTimeout(()=>{
      chats.delete(id);json(res,{error:'Language evaluation timed out'});
    },180000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{...result,w:sl.w});});
    sl.wk.postMessage({languageExam:{id,limit:Math.max(100,Math.min(10000,
      Math.trunc(+(q.get('limit')||1800)))),seed:+(q.get('seed')||11)}});
    return;
  }
  // Frozen original V17 comparison: same learned operator against unseen
  // complete and incomplete mazes, with no teacher route in the blind arm.
  if(req.method==="POST"&&url==="/constructed-paths-eval"){
    const sl=slots.find(x=>x.w===+(q.get("w")||0));
    if(!sl||!sl.worlds.includes("maze"))return json(res,{error:"Select a maze-training graph"});
    const count=Math.max(1,Math.min(80,Math.trunc(+(q.get("count")||12))));
    const seed=Math.max(0,Math.min(1000000,Math.trunc(+(q.get("seed")||73))));
    if(!sl.wk) {
      const save=saveOf(sl);if(!fs.existsSync(save))return json(res,{error:"No brain checkpoint"});
      try{return json(res,{...Brain.load(save).testConstructedMaze(count,seed),fromSave:true});}
      catch(err){return json(res,{error:err.message});}
    }
    const id=++chatId,timer=setTimeout(()=>{
      chats.delete(id);json(res,{error:"Blind-map evaluation timed out"});
    },180000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{...result,w:sl.w});});
    sl.wk.postMessage({constructedPathExam:{id,count,seed}});
    return;
  }
  // The selected ORIGINAL Brain predicts and executes unseen global->local
  // perspective tasks with no online updates to the shared learned mapping.
  if (req.method === "POST" && url === "/perspective-eval") {
    const sl = slots.find(x => x.w === +(q.get("w") || 0));
    const count = Math.max(4, Math.min(80, Math.trunc(+(q.get("count") || 20))));
    const seed = Math.max(0, Math.min(1000000, Math.trunc(+(q.get("seed") || 73))));
    if (!sl || !sl.worlds.includes("maze")) return json(res,{error:"Select a graph training labyrinths"});
    if (!sl.wk) {
      const save=saveOf(sl);if(!fs.existsSync(save))return json(res,{error:"No saved Brain"});
      try {return json(res,{...Brain.load(save).testPerspective(count,seed),fromSave:true});}
      catch(err){return json(res,{error:err.message});}
    }
    const id=++chatId,timer=setTimeout(()=>{chats.delete(id);json(res,{error:"Perspective evaluation timed out"});},180000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{...result,w:sl.w});});
    sl.wk.postMessage({perspectiveExam:{id,count,seed}});
    return;
  }
  if (req.method === "POST" && url === "/exam") {                        // ?w=&sizes=7,9,…&per=1 : the frozen brain plays unseen labyrinths, small to large
    const sl = slots.find(x => x.w === +q.get("w")), sizes = (q.get("sizes") || "7,9,11,13,15,17,19,21,25,31,41,51").split(",").map(Number).filter(n => n >= 5 && n % 2 && n <= 61), per = Math.max(1, Math.min(10, +q.get("per") || 1));
    if (!sl) return json(res, {error: "nu există graful"});
    if (!sl.wk) { const f = saveOf(sl); if (!fs.existsSync(f)) return json(res, {error: "graful nu rulează și nu are încă un save"});
      try { const mt = fs.statSync(f).mtimeMs; if (!sl.talker || sl.talkerAt !== mt) { sl.talker = Brain.load(f); sl.talkerAt = mt; } return json(res, {...sl.talker.examMazes(sizes, per), fromSave: true}); } catch (err) { return json(res, {error: err.message}); } }
    const id = ++chatId, t = setTimeout(() => { chats.delete(id); json(res, {error: "graful nu a răspuns în 300 s"}); }, 300000);
    chats.set(id, r => { clearTimeout(t); json(res, r); }); sl.wk.postMessage({exam: {id, sizes, per}}); return; }
  if (req.method === "POST" && url === "/shared-eval") {
    const sl = slots.find(x => x.w === +(q.get("w") || 0));
    if (!sl || !sl.wk) return json(res, {error: "The selected V17 graph is not running"});
    const id = ++chatId, timer = setTimeout(() => { chats.delete(id); json(res, {error: "Shared PyTorch evaluation timeout"}); }, 180000);
    chats.set(id, result => { clearTimeout(timer); json(res, result); });
    sl.wk.postMessage({sharedEval: {id, seed: +(q.get("seed") || 74129)}});
    return;
  }
  if (req.method === "POST" && url === "/chat") {                        // body {w, history: [["you"|"him", text]…], opts: {T, max, stopBlank, learn}}
    let body = ""; req.on("data", d => body += d); req.on("end", () => { let m; try { m = JSON.parse(body); } catch { return json(res, {error: "bad json"}); }
      const sl = slots.find(x => x.w === +m.w); if (!sl) return json(res, {error: "nu există graful #" + m.w});
      if (!sl.wk) {                                                        // stopped or finished: it answers from its last save
        const f = saveOf(sl); if (!fs.existsSync(f)) return json(res, {error: "graful #" + m.w + " nu rulează și nu are încă un save (apasă ▶)"});
        try { const mt = fs.statSync(f).mtimeMs; if (!sl.talker || sl.talkerAt !== mt) { sl.talker = Brain.load(f); sl.talkerAt = mt; }
          return json(res, {...sl.talker.chat(m.history || [], {...(m.opts || {}), learn: false}), fromSave: true}); } catch (err) { return json(res, {error: "save-ul nu s-a putut citi: " + err.message}); } }
      const id = ++chatId, t = setTimeout(() => { chats.delete(id); json(res, {error: "graful nu a răspuns în 120 s"}); }, 120000);
      chats.set(id, r => { clearTimeout(t); json(res, r); }); sl.wk.postMessage({chat: {id, history: m.history || [], opts: m.opts || {}}}); }); return; }
  if (req.method === "POST" && url === "/reset") { for (const sl of slots) control(sl, "reset"); return json(res, {ok: true}); }
  if (req.method === "POST" && url === "/stop") { stopping = true; for (const sl of slots) sl.wk?.postMessage("stop"); res.writeHead(200); return res.end("ok"); }
  // the graph is the home: the living-graph page, fed by the devouring graphs instead of training in the browser
  if (url === "/") { res.writeHead(302, {location: "/transcend/torus-aether/ui/index.html?live=1"}); return res.end(); }
  if (url === "/dashboard") { res.writeHead(200, {"content-type": "text/html; charset=utf-8"}); return fs.createReadStream(path.join(here, "dashboard.html")).pipe(res); }
  if (url === "/graphs") return json(res, {world, every, graphs: slots.map(slotInfo), worlds: worldsArg, gpu: gpuSettings, arms: [...Object.keys(ARMS), ...Object.keys(CLAWS)]});
  if (url === "/graph") { const w = +q.get("w") || 0, g = graphs.get(w);
    res.writeHead(g ? 200 : 404, {"content-type": "application/json", "cache-control": "no-store"});
    return res.end(g ? JSON.stringify({...g, test: last.get(w)?.test || null, world}) : "{}"); }
  const types = {".html": "text/html; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".js": "text/javascript; charset=utf-8"};
  const abs = path.resolve(root, url.replace(/^\/+/, ""));
  if (abs.startsWith(path.join(root, "transcend")) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    res.writeHead(200, {"content-type": types[path.extname(abs)] || "application/octet-stream", "cache-control": "no-store"}); return fs.createReadStream(abs).pipe(res); }
  res.writeHead(404); res.end();
}).listen(port, "127.0.0.1", () => {
  const u = `http://127.0.0.1:${port}/`; console.log(`living graph: ${u}   (charts: ${u}dashboard)` + (autostart ? "" : " · press Start on the page (or run with --start)"));
  exec(process.platform === "win32" ? `start "" "${u}"` : process.platform === "darwin" ? `open "${u}"` : process.env.PREFIX?.includes("com.termux") ? `termux-open-url "${u}"` : `xdg-open "${u}"`, () => {});
}).on("error", e => console.log(`dashboard not started (${e.message}); use --port <other>`));
const summary = () => {
  console.log("\n=== summary (latest test of every graph) ===");
  const by = {}; for (const m of last.values()) (by[m.arm] ??= []).push(m);
  for (const [a, ms] of Object.entries(by)) { const avg = f => ms.reduce((s, m) => s + (f(m) || 0), 0) / ms.length;
    console.log(`${a.padEnd(9)} graphs ${ms.length} · chars each ${(avg(m => m.chars) / 1e6).toFixed(2)}M` + (ms[0].test ? ` · unseen: graph ${(100 * avg(m => m.test.live)).toFixed(2)}%  field ${(100 * avg(m => m.test.field)).toFixed(2)}%  together ${(100 * avg(m => m.test.together)).toFixed(2)}%  C ${(100 * avg(m => m.test.C)).toFixed(2)}%` : "") +
      (ms[0].maze ? ` · labyrinths unseen solved ${(100 * avg(m => m.maze.test?.solved)).toFixed(1)}%` : "")); }
  console.log(`log: ${path.join(out, "log.jsonl")} · brains: ${brainsDir}`);
};
let interrupted = false;
process.on("SIGINT", () => { const live = slots.filter(x => x.wk); if (!live.length || interrupted) { summary(); log.end(); process.exit(0); } interrupted = true; stopping = true;
  console.log("\nstopping and saving… (Ctrl+C again to quit)"); for (const sl of live) sl.wk.postMessage("stop");
  const wait = setInterval(() => { if (!slots.some(x => x.wk)) { clearInterval(wait); summary(); log.end(); process.exit(0); } }, 300); });

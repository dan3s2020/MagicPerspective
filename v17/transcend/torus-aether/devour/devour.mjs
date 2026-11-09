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
import {NativeTextPathAtlas} from "../worlds/native-text-path-atlas.mjs";
import {archiveV43Session,stopV43WorkerForReset} from "./v43-reset.mjs";
import {requestV43WorkerAck,verifyV43SavedCheckpoint} from "./v43-controls.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const workers = +arg("workers", Math.max(1, os.cpus().length - 1)), every = +arg("every", 200000), maxChars = +arg("chars", 0) || Infinity;
// V43 in ORIGINAL MagicPerspective, not an external Braivour process. Absent => byte-identical V42 mode.
const v43DonorPath=process.env.MAGICPERSPECTIVE_V43_DONOR||null;
if(v43DonorPath&&workers!==1)throw Error("V43 ONE organism requires exactly one original native Brain worker");
const checkpointEvery = Math.max(0,Math.trunc(+arg("checkpoint-every",0)));
const xdAtlasEvery=Math.max(0,Math.trunc(+arg("xd-atlas-every",0)));
// 0 preserves the native behavior; nonzero decouples atomic saves from expensive frozen evaluations.
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
  for (const f of files) for (const para of fs.readFileSync(f, "utf8").split(/\n\s*\n/)) { if (!para.trim()) continue; k++;
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
const slots = [], last = new Map(), history = new Map(), graphs = new Map(), telemetry = new Map(), sharedJobs = new Map(); let started = new Date().toISOString(), stopping = false;
const root = path.resolve(here, "../../..");
const world = source.kind === "parquet" ? source.root : source.files.map(f => path.basename(f)).join(", ");
const port = +arg("port", 8841), autostart = process.argv.includes("--start"), brainsDir = path.join(out, "brains");
const armOf = name => CLAWS[name] ? {name, rules: ARMS.winner, c: CLAWS[name]} : ARMS[name] ? {name, rules: ARMS[name]} : null;
const saveOf = sl => path.join(brainsDir, `brain-${sl.w}-${sl.arm.name}.v8`);
function recordTelemetry(m) {
  let samples=telemetry.get(m.w);if(!samples){samples=[];telemetry.set(m.w,samples);}
  const sample={at:Date.now(),chars:m.chars||0,lived:m.lived||0,
    exercises:m.exercises||0,nodes:m.nodes?.length||0,edges:m.edges?.length||0,
    aligned:m.accAlign??null,sharedStep:m.shared?.training?.step||0,
    sharedLoss:m.shared?.training?.preUpdatePredictionLoss??null,
    updates:m.observedTransformations?.learnedOperators||0,
    comparisons:m.observedTransformations?.oneChangePairs||0,
    textStates:m.constructedPaths?.scaleGraphStates?.reduce((n,x)=>n+(x.distinctStates||0),0)||0,
    pairedWorlds:m.constructedPaths?.pairedWorlds||0,
    noiseDecisions:m.endogenousNoise?.decisions||0,
    hypermazeRows:m.hypermaze?.rows||0,
    hypermazeAccuracy:m.hypermaze?.nextTokenAccuracy??null,
    hypermazeBaseline:m.hypermaze?.unigramAccuracy??null,
    hypermazeContext:m.hypermaze?.contextScale??null,
    gpuPhase:m.gpu?.batch?.phase||null,gpuDone:m.gpu?.batch?.done??null,
    gpuTotal:m.gpu?.batch?.total??null,gpuTextAccuracy:m.gpu?.text?.acc??null,
    vramGB:m.gpu?.maze?.vramUsedGB??m.gpu?.text?.vramUsedGB??null};
  const last=samples.at(-1);
  if(!last||sample.at-last.at>=800||sample.chars!==last.chars||
    sample.updates!==last.updates||sample.gpuPhase!==last.gpuPhase){
    samples.push(sample);if(samples.length>360)samples.splice(0,samples.length-360);
  }
}
function workerHealth(sl, graph = graphs.get(sl.w)) {
  const now = Date.now(),heartbeatAgeMs = sl.lastHeartbeatAt != null ?
    now-sl.lastHeartbeatAt : null;
  const snapshotAgeMs = graph?.snapshotAt ? now-graph.snapshotAt : null;
  const startingAgeMs = sl.launchedAt ? now-sl.launchedAt : null;
  const referenceAge = heartbeatAgeMs ?? startingAgeMs;
  const noHeartbeat = sl.status === "antrenează" &&
    referenceAge != null && referenceAge > 45000;
  const snapshotStale = sl.status === "antrenează" &&
    snapshotAgeMs != null && snapshotAgeMs > 90000;
  const phase=sl.lastHeartbeat?.phase ?? "starting";
  const gpuRequest=sl.lastHeartbeat?.activeGpuRpc??null;
  return {
    state:sl.status==="eroare"?"error":noHeartbeat?"unresponsive":
      snapshotStale?"stale-snapshot":sl.status==="pauză"?"paused":
      sl.status==="gata"?"completed":sl.status==="oprit"?"stopped":"running",
    heartbeatAgeMs,snapshotAgeMs,phase,phaseSince:sl.lastHeartbeat?.phaseSince??null,
    gpuRequest,batch:sl.lastHeartbeat?.batch??null,
    realDatasetRowsRead:sl.lastHeartbeat?.realDatasetRowsRead??null,
    lastRealDatasetRowIndex:sl.lastHeartbeat?.lastRealDatasetRowIndex??null,
    realDatasetRowCharacters:sl.lastHeartbeat?.realDatasetRowCharacters??null,
    gpuBatchQueuedRows:sl.lastHeartbeat?.gpuBatchQueuedRows??null,
    gpuBatchQueuedCharacters:sl.lastHeartbeat?.gpuBatchQueuedCharacters??null,
    v43Conveyor:sl.lastHeartbeat?.v43Conveyor??null,
    lastReportedChars:sl.lastHeartbeat?.chars??0,
    lastReportedExercises:sl.lastHeartbeat?.exercises??0,
    textMBps:sl.lastHeartbeat?.textMBps??null,
    exercisesPerSecond:sl.lastHeartbeat?.exercisesPerSecond??null,
    rawTextMB:sl.lastHeartbeat?.rawTextMB??null,
    throughputIntervalSeconds:sl.lastHeartbeat?.throughputIntervalSeconds??null,
    workerResponsive:!noHeartbeat,
    staleSnapshot:snapshotStale,
    message:sl.status==="eroare"?sl.lastError:
      noHeartbeat?"Worker JS event loop unresponsive for >45s; no new real heartbeat.":
      snapshotStale?"Graph snapshot >90s old. Worker phase: "+phase+
        (gpuRequest?" / CUDA RPC: "+gpuRequest.cmd:""):
      sl.status==="pauză"?"Training paused":phase
  };
}
function slotInfo(sl) { const g = graphs.get(sl.w), t = last.get(sl.w);
  const G = g?.gpu || t?.gpu || null;
  const assigned=sl.dataset?.assignedTrainingRows??null;
  const completed=Math.max(sl.lastHeartbeat?.exercises||0,
    g?.exercises||0,t?.exercises||0);
  const dataset=assigned==null?null:{...sl.dataset,
    completedTrainingRows:Math.min(assigned,completed),
    percent:assigned?100*Math.min(assigned,completed)/assigned:100,
    countsAreCompletedExercises:true};
  return {w: sl.w, arm: sl.arm.name, worlds: sl.worlds, status: sl.status, error: sl.lastError || null, gpu:G,chars:Math.max(g?.chars||0,t?.chars||0),lived:g?.lived??0,
    dataset,
    nodeCount:g?.nodes?.length??0,edgeCount:g?.edges?.length??0,
    health:workerHealth(sl,g),
    snapshotAt:g?.snapshotAt||null,batch:G?.batch||null,test: t?.test || null, maze: g?.maze || t?.maze || null, transform: t?.transform || g?.transform || null, selfcode: g?.selfcode || t?.selfcode || null,
    perspective: g?.perspective || t?.perspective || null,
    constructedPaths: g?.constructedPaths || t?.constructedPaths || null,
    observedTransformations: t?.final ? t.observedTransformations : g?.observedTransformations || t?.observedTransformations || null,
    observedPipeline: t?.final ? t.observedPipeline : g?.observedPipeline || t?.observedPipeline || null,
    language: g?.language || t?.language || null, hypermaze:g?.hypermaze || t?.hypermaze || null,
    nativePathAtlas:g?.nativePathAtlas || t?.nativePathAtlas || null,
    xdAtlas:g?.xdAtlas || t?.xdAtlas || null,
    endogenousNoise: g?.endogenousNoise || t?.endogenousNoise || null, final: !!t?.final}; }
function launch(sl, {fresh = false, paused = !autostart, fromSave = true} = {}) {          // a worker thread holds one brain
  sl.lastError = null;sl.launchedAt=Date.now();sl.lastHeartbeatAt=null;sl.lastHeartbeat=null;
  if (sl.wk) { sl.gen++; sl.wk.terminate(); }
  if (fresh && fs.existsSync(saveOf(sl))) { fs.mkdirSync(path.join(out, "brains-before-reset"), {recursive: true}); fs.renameSync(saveOf(sl), path.join(out, "brains-before-reset", Date.now() + "-" + path.basename(saveOf(sl)))); }
  if (fresh) for (const suffix of [".shared.pt", ".causal.json", ".transitions.jsonl", ".hypermaze.json", ".native-paths.json", ".path-atlas.jsonl", ".xd-atlas.jsonl"]) {
    const old = saveOf(sl) + suffix;
    if (fs.existsSync(old)) { fs.mkdirSync(path.join(out, "brains-before-reset"), {recursive: true});
      fs.renameSync(old, path.join(out, "brains-before-reset", Date.now() + "-" + path.basename(old))); }
  }
  if (fresh) { last.delete(sl.w); history.delete(sl.w); graphs.delete(sl.w); }
  const gen = ++sl.gen, share = sl.share, shares = Math.max(1, Math.ceil(slots.length / arms.length));
  fs.mkdirSync(brainsDir, {recursive: true});
  const wk = new Worker(path.join(here, "worker.mjs"), {workerData: {w: share, n: shares, gw: sl.w, source, arm: sl.arm, every, maxChars, memGB, evalText,
    worlds: sl.worlds, mazeEvery, checkpointEvery, xdAtlasEvery, saveFile: saveOf(sl), resume: !fresh && fromSave, paused, gpu: gpuFor(), controls: sl.controls || null,
    traceTransformations: process.argv.includes("--trace-transformations"), endogenousNoise: process.argv.includes("--endogenous-noise"), v43DonorPath}, resourceLimits: {maxOldGenerationSizeMb: Math.round(memGB * 1024 * 1.6)}});
  sl.wk = wk; sl.status = paused ? "oprit" : "antrenează";
  wk.on("message", m => {
    if (gen !== sl.gen) return;
    if (m.type === "note") {
      sl.lastNote=m.text;
      if (typeof m.text === "string" && m.text.startsWith("V41_BATCH_END_TO_END_REAL ")) {
        try { sl.lastBatchReal=JSON.parse(m.text.slice("V41_BATCH_END_TO_END_REAL ".length)); }
        catch { /* keep the original note even if diagnostic JSON is incomplete */ }
      }
      return console.log(`#${sl.w} ${m.text}`);
    }
    if (m.type === "heartbeat") {
      sl.lastHeartbeatAt=Date.now();sl.lastHeartbeat=m;return;
    }
    if (m.type === "dataset") {sl.dataset=m;return;}
    if (m.type === "fatal") { sl.lastError = m.text; sl.status = "eroare"; return console.error(`#${sl.w} ${m.text}`); }
    if (m.type === "graph") { const old=graphs.get(sl.w);
      if(!m.text&&old?.text)m.text=old.text;
      m.snapshotAt=Date.now();sl.lastGraphAt=m.snapshotAt;
      graphs.set(sl.w,m);recordTelemetry(m);return; }   // its living graph
    if (m.type === "chat") { const cb = chats.get(m.id); if (cb) { chats.delete(m.id); cb(m); } return; }
    if (m.type === "saved") { sl.savedMB = m.MB; for (const f of sl.onSaved?.splice(0) || []) f(); return console.log(`#${sl.w} saved ${m.MB.toFixed(0)} MB → ${saveOf(sl)}`); }
    last.set(sl.w, m);
    if (!history.has(sl.w)) history.set(sl.w, []);
    // Real long-running training must not retain every massive evaluation
    // snapshot forever. Disk log.jsonl is still append-only; UI keeps 240.
    const hist=history.get(sl.w);hist.push(m);
    if(hist.length>240)hist.splice(0,hist.length-240);
    log.write(JSON.stringify({time: new Date().toISOString(), ...m}) + "\n");
    if (m.final) sl.status = "gata";
    const t = m.test, p = v => (100 * v).toFixed(1).padStart(5) + "%", tf = m.transform?.test ? ` | transforms unseen solved ${p(m.transform.test.solved)} steps/optimal ${m.transform.test.ratio?.toFixed(2) ?? "—"} wrong predictions ${p(m.transform.test.failedRate || 0)} limitation ${m.transform.test.saidLimitation}/${m.transform.test.impossible}` : "", mz = m.maze ? ` | labyrinths lived ${m.maze.played} · unseen solved ${m.maze.test ? p(m.maze.test.solved) : "—"} steps/optimal ${m.maze.test?.ratio?.toFixed(2) ?? "—"} shape ${m.maze.test ? p(m.maze.test.shape) : "—"}` : "";
    console.log(`#${String(sl.w).padStart(2)} ${m.arm.padEnd(8)} ${(m.chars / 1e6).toFixed(2).padStart(7)}M chars ${String(m.exercises).padStart(6)} ex` +
      (t ? ` | unseen: ALIGNED ${p(t.aligned)}  graph ${p(t.live)}  field ${p(t.field)}  together ${p(t.together)}  C ${p(t.C)}  masked ${p(t.masked)}` : "") + mz + tf +
      (m.gpu ? ` | GPU ${m.gpu.info?.name || m.gpu.info?.device || m.gpu.settings.device}${m.gpu.error ? " ERROR " + m.gpu.error : ` ${m.gpu.settings.worlds} worlds/batch${m.gpu.maze?.vramUsedGB != null ? " VRAM " + m.gpu.maze.vramUsedGB + " GB" : ""}`}` : "") + ` | C ${m.cActive} lag ${m.cLag} flips ${m.cFlips} | ${(m.speed / 1000).toFixed(1)}k/s ${m.heapGB.toFixed(2)} GB${m.savedMB ? ` saved ${m.savedMB.toFixed(0)}MB` : ""}${m.dissolved ? " dissolved " + m.dissolved : ""}${m.final ? "  DONE" : ""}`); });
  wk.on("error", err => {
    sl.lastError="Worker crashed: "+err.message;sl.status="eroare";
    console.error(`#${sl.w} error:`,err.message);
  });
  wk.on("exit", code => {
    for (const f of sl.onSaved?.splice(0) || []) f();
    if(gen===sl.gen){
      sl.wk=null;
      if(code!==0 && sl.status!=="eroare"){
        sl.lastError="Worker exited unexpectedly with code "+code;
        sl.status="eroare";
      }else if(sl.status!=="gata"&&sl.status!=="eroare")sl.status="oprit";
    }
  });
}
function gpuFor() { const share = Math.max(1, slots.filter(x => x.worlds.some(w => w !== "text")).length); return gpuSettings.device === "off" ? null : {...gpuSettings, vram: gpuSettings.vram ? gpuSettings.vram / share : 0}; }
function addSlot(armName, worlds) { const arm = armOf(armName); if (!arm) throw Error("unknown arm " + armName);
  const w = slots.length ? Math.max(...slots.map(x => x.w)) + 1 : 0, sl = {w, arm, worlds, share: Math.floor(w / arms.length), gen: 0, wk: null, status: "oprit"}; slots.push(sl); launch(sl, {fresh: false, fromSave: resume || booted}); return sl; }
async function verifiedV43Reset(sl) {
  if(sl.resetting)throw Error("V43_RESET_ALREADY_IN_PROGRESS");
  sl.resetting=true;
  const old=sl.wk,oldGen=sl.gen,wasRunning=sl.status==="antrenează";
  sl.status="resetează";sl.lastError=null;
  sl.gen++; // Ignore all late snapshots and callbacks from the old worker.
  try{
    const stopped=await stopV43WorkerForReset(old,{timeoutMs:25000});
    if(!stopped.acknowledged||!stopped.terminated)
      throw Error("Original Brain did not confirm CUDA shutdown");
    sl.wk=null;
    const archive=archiveV43Session(saveOf(sl),path.join(out,"brains-before-reset"));
    // NEVER reuse old sidecars: source progress, V43 live rows, Qwen movements,
    // logs and original V42 checkpoint are all archived as ONE session.
    last.delete(sl.w);history.delete(sl.w);graphs.delete(sl.w);
    sl.lastHeartbeat=null;sl.lastHeartbeatAt=null;sl.lastGraphAt=null;
    sl.lastBatchReal=null;sl.dataset=null;sl.savedMB=null;
    sl.status="oprit";
    launch(sl,{fresh:false,paused:!wasRunning,fromSave:false});
    return {w:sl.w,resetVerified:true,oldWorkerTerminated:true,
      oldCudaProcessClosed:true,archive:archive.destination,
      filesArchived:archive.files,sourceReset:true,
      newWorkerGeneration:sl.gen};
  }catch(err){
    if(sl.wk===old&&old)sl.gen=oldGen;
    sl.lastError="V43_RESET_FAILED: "+err.message;
    sl.status="eroare";
    throw err;
  }finally{sl.resetting=false;}
}
async function verifiedV43Control(sl,act) {
  if(sl.resetting)throw Error("V43 command refused while original Brain is resetting");
  if(sl.status==="eroare")
    throw Error("Original Brain is in error state: "+(sl.lastError||"unknown")+
      ". Inspect the native worker error; Reset performs verified replacement.");
  if(["start","pause","save"].indexOf(act)<0)
    throw Error("Unsupported verified V43 control: "+act);
  if(!sl.wk){
    if(act!=="start")throw Error("Cannot "+act+" original Brain: worker absent");
    if(sl.status==="gata")throw Error("Dataset finished; use verified Reset to begin from zero");
    launch(sl,{fresh:false,paused:true,fromSave:true});
  }
  const result=await requestV43WorkerAck(sl.wk,act,{timeoutMs:act==="save"?150000:25000});
  if(act==="start")sl.status="antrenează";
  if(act==="pause")sl.status="pauză";
  if(act==="save")return {...result,...verifyV43SavedCheckpoint(saveOf(sl)),w:sl.w};
  return {...result,w:sl.w,verifiedCommandReceipt:true};
}
function control(sl, act) {
  if (act === "start") { if (!sl.wk) launch(sl, {paused: false}); else { sl.wk.postMessage("resume"); sl.status = "antrenează"; } }
  else if (act === "pause") { sl.wk?.postMessage("pause"); if (sl.wk) sl.status = "pauză"; }
  else if (act === "reset") { if(v43DonorPath)throw Error("V43 reset must use the verified async CUDA shutdown and archive"); launch(sl, {fresh: true, paused: sl.status !== "antrenează"}); }
  else if (act === "save") sl.wk?.postMessage("save");
  else if (act === "remove") { sl.gen++; sl.wk?.terminate(); slots.splice(slots.indexOf(sl), 1); last.delete(sl.w); history.delete(sl.w); graphs.delete(sl.w); }
}
// a new run without --resume keeps the old saves aside and starts from nothing
if (!resume && fs.existsSync(brainsDir) && fs.readdirSync(brainsDir).length) fs.renameSync(brainsDir, path.join(out, "brains-before-" + Date.now()));
let booted = false; for (let w = 0; w < workers; w++) addSlot(arms[w % arms.length].name, worldsArg); booted = true;
const chats = new Map(); let chatId = 0;                                     // talking to a graph: page → worker → page
const json = (res, o) => { res.writeHead(res.statusCode||200, {"content-type": "application/json", "cache-control": "no-store"}); res.end(JSON.stringify(o)); };
http.createServer((req, res) => {
  const U = new URL(req.url, "http://x"), url = decodeURIComponent(U.pathname), q = U.searchParams;
  // V34 native research inspection/typed evidence in the SAME original Brain.
  // Existing training and all previous V17 HTTP routes remain untouched.
  if(url==="/v34/status"||url==="/v34/research"){
    if(req.headers.origin&&req.headers.origin!=="http://"+req.headers.host)
      return json(res,{error:"Cross-origin original Brain modifications refused"});
    const w=Number(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!Number.isSafeInteger(w)||!sl)
      return json(res,{error:"Choose an existing original V17 Brain slot"});
    // An authentic finite corpus can finish and the worker exits normally,
    // leaving a COMPLETE, SAVED original native Brain. A user must still
    // inspect every learned path after it finishes. Reopen its exact saved
    // Brain in a PAUSED original worker, not a replacement simulator.
    // Never mask crashes, train in this inspection path, or reset weights.
    if(!sl.wk&&sl.status==="gata"&&fs.existsSync(saveOf(sl))){
      launch(sl,{fresh:false,paused:true,fromSave:true});
      sl.status="gata";
      sl.inspectionFromSavedBrain=true;
    }
    if(!sl.wk)
      return json(res,{error:"Original Brain worker not currently available",
        state:sl.status,checkpoint:saveOf(sl),
        note:"No dummy Brain or fabricated final graph was substituted"});
    const send=request=>{
      const id=++chatId,timer=setTimeout(()=>{
        chats.delete(id);
        json(res,{error:"Original V17 Brain research request timed out, no fake result"});
      },30000);
      chats.set(id,reply=>{
        clearTimeout(timer);
        json(res,reply.error?{error:reply.error}:{...reply.result,w,
          originalLiveWorker:true,engine:"Native original V17 Brain"});
      });
      sl.wk.postMessage({v34Research:{id,request}});
    };
    if(req.method==="GET"&&url==="/v34/status"){
      send({type:"status"});return;
    }
    if(req.method!=="POST"||url!=="/v34/research")
      return json(res,{error:"Unsupported V34 HTTP method"});
    let bytes=0,parts=[],tooLarge=false;
    req.on("data",chunk=>{
      bytes+=chunk.length;
      if(bytes>65536){tooLarge=true;parts=[];}
      else if(!tooLarge)parts.push(chunk);
    });
    req.on("end",()=>{
      if(tooLarge)return json(res,{error:"V34 evidence body exceeds 64 KiB"});
      let request;
      try{request=JSON.parse(Buffer.concat(parts).toString("utf8"));}
      catch(err){return json(res,{error:"Invalid V34 UTF-8 evidence JSON: "+err.message});}
      if(!request||typeof request!=="object"||Array.isArray(request))
        return json(res,{error:"V34 request must be an object"});
      send(request);
    });
    req.on("error",err=>{
      if(!res.writableEnded)json(res,{error:"V34 evidence connection: "+err.message});
    });
    return;
  }
  if (url === "/state") return json(res, {world, worlds: worldsArg, workers: slots.length, arms: arms.map(a => a.name), every, memGB, started, stopping,
    graphs: [...history.entries()].map(([w, h]) => ({w, arm: h.at(-1).arm, history: h.map(m => ({chars: m.chars, live: m.test?.live, C: m.test?.C, masked: m.test?.masked, bits: m.test?.bits, field: m.test?.field, together: m.test?.together, maze: m.maze?.recent})), last: h.at(-1)}))});
  if (req.method === "POST" && url === "/control") {                     // ?do=start|pause|reset|save|remove &w=<graph> (no w = every graph)
    const act = q.get("do"), w = q.get("w"), targets = w == null ? slots.slice() : slots.filter(x => x.w === +w);
    if(v43DonorPath&&["start","pause","save"].includes(act)){
      void (async()=>{
        if(!targets.length)throw Error("Unknown original Brain for V43 "+act);
        const done=[];
        for(const sl of targets)done.push(await verifiedV43Control(sl,act));
        return json(res,{ok:true,commandAcknowledged:true,
          saveVerified:act==="save"&&done.every(x=>x.saveVerified===true),
          controls:done,graphs:slots.map(slotInfo)});
      })().catch(err=>{
        console.error("V43 "+act+" failed:",err);
        if(!res.writableEnded){res.statusCode=409;json(res,{ok:false,error:"V43_"+act.toUpperCase()+"_FAILED: "+err.message});}
      });
      return;
    }
    if(v43DonorPath&&act==="reset"){
      void (async()=>{
        if(!targets.length)throw Error("No original Brain matched the reset request");
        const done=[];
        for(const sl of targets)done.push(await verifiedV43Reset(sl));
        return json(res,{ok:true,resetVerified:true,done,graphs:slots.map(slotInfo)});
      })().catch(err=>{
        console.error("V43 verified reset failed:",err);
        if(!res.writableEnded){res.statusCode=409;json(res,{ok:false,error:"V43_RESET_FAILED: "+err.message});}
      });
      return;
    }
    for (const sl of targets) control(sl, act);
    return json(res, {ok: true, graphs: slots.map(slotInfo)}); }
  if (req.method === "POST" && url === "/add") { try { addSlot(q.get("arm") || "stable+many", (q.get("worlds") || "text").split(",").filter(x => ["text", "maze", "transform", "selfcode"].includes(x))); return json(res, {ok: true}); } catch (err) { res.writeHead(400); return res.end(err.message); } }
  if (req.method === "POST" && url === "/gpu") {                         // the person's GPU settings, applied to every brain at its next batch
    for (const k of ["device", "worlds", "vram", "util", "textBatch", "textChunk"]) if (q.has(k) && q.get(k) !== "") gpuSettings[k] = k === "device" ? q.get(k) : Math.max(0, +q.get(k));
    gpuSettings.textBatch=Math.max(1,Math.min(128,Math.trunc(gpuSettings.textBatch||1)));
    gpuSettings.textChunk=Math.max(32,Math.min(4096,Math.trunc(gpuSettings.textChunk||128)));
    gpuSettings.util=Math.max(5,Math.min(100,Math.trunc(gpuSettings.util||100)));
    for (const sl of slots) sl.wk?.postMessage({gpu: gpuFor() || {device: "off"}}); console.log("GPU settings:", JSON.stringify(gpuSettings)); return json(res, {ok: true, gpu: gpuSettings}); }
  // Every recorded training episode is stored append-only in its real
  // native worker journal; read only a bounded byte range from a known path.
  // Offset is an opaque BYTE cursor; no arbitrary client filesystem paths.
  if(req.method==="GET"&&url==="/atlas-log"){
    const w=+(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!sl)return json(res,{error:"Unknown worker"});
    const kind=q.get("kind")==="xd"?"xd-atlas":"path-atlas";
    const file=saveOf(sl)+"."+kind+".jsonl";
    const offset=Number(q.get("offset")||0),limit=Math.min(30,Math.max(1,+q.get("limit")||8));
    if(!Number.isSafeInteger(offset)||offset<0)return json(res,{error:"Invalid append-only byte cursor"});
    if(!fs.existsSync(file))return json(res,{entries:[],nextOffset:0,kind,
      message:"Journal has no completed rows yet"});
    const size=fs.statSync(file).size;
    if(offset>=size)return json(res,{entries:[],nextOffset:offset,kind,
      doneForNow:true,totalBytes:size});
    const bytes=Math.min(size-offset,4*1024*1024),buf=Buffer.allocUnsafe(bytes);
    const fd=fs.openSync(file,"r");let read=0;
    try{read=fs.readSync(fd,buf,0,bytes,offset);}
    finally{fs.closeSync(fd);}
    const part=buf.subarray(0,read),lines=[],starts=[];
    let begin=0;
    for(let pos=0;pos<part.length&&lines.length<limit;pos++){
      if(part[pos]===10){
        lines.push(part.subarray(begin,pos).toString("utf8"));
        starts.push(pos+1);begin=pos+1;
      }
    }
    if(!lines.length)return json(res,{entries:[],nextOffset:offset,kind,
      error:"Current atlas record exceeds 4 MiB or is not yet committed; no cursor advanced"});
    const entries=[];
    for(const line of lines){
      try{entries.push(JSON.parse(line));}
      catch(err){return json(res,{error:"Corrupt atlas journal record at byte "+offset+": "+err.message});}
    }
    return json(res,{kind,w,entries,nextOffset:offset+starts.at(-1),
      totalBytes:size,moreAvailable:offset+starts.at(-1)<size,
      source:"REAL append-only training episode journal"});
  }
  // An EXHAUSTIVE paged view of every stored learned native context state
  // and outgoing transition. Querying does not trigger teacher training.
  if(req.method==="GET"&&url==="/atlas-graph"){
    const w=+(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!sl)return json(res,{error:"Original V17 Brain slot missing"});
    const scale=Math.max(0,Math.min(5,Math.trunc(+(q.get("scale")||0))));
    const offset=Math.max(0,Math.trunc(+(q.get("offset")||0)));
    const limit=Math.max(1,Math.min(200,Math.trunc(+(q.get("limit")||80))));
    // The ORIGINAL trainer may have consumed EVERY row and finished while
    // the user is browsing its thousands of learned graph edges. Page the
    // exact checkpoint after completion instead of waiting on an exited
    // worker. This is NOT a reconstructed/demo graph; NativeTextPathAtlas
    // is a read-only view over the ORIGINAL saved V17 Brain.
    if(sl.status==="gata"||!sl.wk){
      const saved=saveOf(sl);
      if(!fs.existsSync(saved))
        return json(res,{error:"Original saved Brain unavailable for atlas paging",
          status:sl.status,checkpoint:saved});
      try{
        const original=Brain.load(saved);
        const view=new NativeTextPathAtlas();
        const result=q.get("family")==="edits"?
          view.operatorPage(original.observedTransformations,{offset,limit}):
          view.page(original.constructedPaths,{scale,offset,limit});
        return json(res,{w,...result,fromOriginalSavedBrain:true,
          originalGraphNotMutated:true});
      }catch(err){
        return json(res,{error:"Original saved Brain atlas read failed: "+err.message});
      }
    }
    const id=++chatId,timer=setTimeout(()=>{
      chats.delete(id);json(res,{error:"Worker busy; no fabricated empty atlas response"});
    },25000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{w,...result});});
    sl.wk.postMessage({nativeAtlasPage:{id,scale,offset,limit,family:q.get("family")==="edits"?"edits":"scales"}});
    return;
  }
  // REAL disjoint held-out QA from original Parquet split or held-out text
  // paragraphs. Neither the Brain nor the native inspector is updated.
  if(req.method==="POST"&&url==="/native-atlas-eval"){
    const w=+(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!sl?.wk)return json(res,{error:"Original Brain worker unavailable"});
    const count=Math.max(1,Math.min(16,Math.trunc(+(q.get("count")||6))));
    const id=++chatId,timer=setTimeout(()=>{
      chats.delete(id);json(res,{error:"Native frozen text atlas evaluation timed out"});
    },45000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{w,...result,
      source:"original V17 held-out corpus split; no teacher update"});});
    void heldPick(count).then(rows=>{
      if(chats.has(id))sl.wk.postMessage({nativeAtlasEval:{id,rows}});
    }).catch(err=>{if(chats.has(id)){chats.delete(id);clearTimeout(timer);
      json(res,{error:"Could not read disjoint heldout corpus: "+err.message});}});
    return;
  }
  if(req.method==="POST"&&url==="/evidence-gated-text-path"){
    const w=+(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!sl?.wk)return json(res,{error:"Original V17 Brain worker unavailable"});
    const start=(q.get("start")||"").slice(0,1000);
    const required=(q.get("required")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,16);
    if(!start||!required.length)
      return json(res,{error:"Required: start sentence and goal tokens, not an ideal answer"});
    const maxSteps=Math.max(1,Math.min(9,Math.trunc(+(q.get("steps")||8))));
    const id=++chatId,timer=setTimeout(()=>{
      chats.delete(id);json(res,{error:"Native evidence-gated worker busy; no fabricated result"});
    },25000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{w,...result});});
    sl.wk.postMessage({evidenceGatedText:{id,start,required,maxSteps,maxExpanded:6000}});
    return;
  }
  // Full finite-world frozen test. The agent receives the ENTIRE map, no
  // correct path, no new probes; we compare the real action execution.
  if(req.method==="POST"&&url==="/xd-atlas-eval"){
    const w=+(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!sl?.wk)return json(res,{error:"Original Brain worker unavailable"});
    const dimensions=Math.trunc(+(q.get("dimensions")||1024));
    const seed=Math.trunc(+(q.get("seed")||81919));
    if(!Number.isInteger(dimensions)||dimensions<16||dimensions>8192)
      return json(res,{error:"Dimension range 16..8192"});
    const id=++chatId,timer=setTimeout(()=>{
      chats.delete(id);json(res,{error:"Frozen xD evaluation timed out"});
    },25000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{w,...result});});
    sl.wk.postMessage({xdAtlasTest:{id,dimensions,seed}});
    return;
  }
  // Sidecar-only settings. Native Brain and CUDA training parameters are unchanged.
  if(req.method==="POST"&&url==="/hypermaze-config"){
    const w=+(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!sl||!sl.wk)return json(res,{error:"Select a running text-training graph"});
    const noise=+(q.get("noise")||0);
    if(!Number.isFinite(noise)||noise<0||noise>1)return json(res,{error:"Noise must be between 0 and 1"});
    sl.wk.postMessage({hyperMazeConfig:{noise}});
    return json(res,{ok:true,w,noise,engine:"real streaming text-world sidecar"});
  }
  if(req.method==="POST"&&url==="/hypermaze-eval"){
    const w=+(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!sl||!sl.worlds.includes("text")||!sl.wk)
      return json(res,{error:"A running graph training real text is required"});
    const n=Math.max(1,Math.min(60,Math.trunc(+(q.get("count")||12))));
    const id=++chatId,timer=setTimeout(()=>{chats.delete(id);
      json(res,{error:"Frozen text maze evaluation exceeded 60 seconds"});},60000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{...result,w,
      source:"actual held-out rows from the original V17 training dataset"})});
    void heldPick(n).then(rows=>{
      if(chats.has(id))sl.wk.postMessage({hyperMazeEval:{id,rows}});
    }).catch(err=>{if(chats.has(id)){chats.delete(id);clearTimeout(timer);
      json(res,{error:"Could not read held-out corpus: "+err.message});}});
    return;
  }
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
  // This is a second, instrumented view of the SAME original learner.
  // Search on ACTUAL learned edges is captured before any body action, then
  // local action choices and corrective replans are returned for native replay.
  // The only supplied goal is required tokens; no answer text or teacher path.
  if(req.method==="POST"&&url==="/language-maze"){
    const sl=slots.find(x=>x.w===+(q.get("w")||0));
    if(!sl||!sl.worlds.includes("text"))
      return json(res,{error:"Selectează un graf care învață lumea text."});
    const auto=q.get("auto")==="1";
    const required=(q.get("required")||"").split(",").map(x=>x.trim()).filter(Boolean);
    if(!auto&&(!required.length||required.length>8||required.some(x=>x.length>80)))
      return json(res,{error:"Obiectivul trebuie să conțină 1–8 simboluri, nu răspunsul complet."});
    const start=q.get("start")?.trim()||null;
    if(start&&start.length>500)return json(res,{error:"Starea de pornire este prea lungă"});
    const maxDepth=Math.max(1,Math.min(7,Math.trunc(+(q.get("maxDepth")||4))));
    const localPolicy=q.get("local")!=="off";
    if(!sl.wk){
      const file=saveOf(sl);
      if(!fs.existsSync(file))return json(res,{error:"Nu există un checkpoint pentru acest graf."});
      try{
        const brain=Brain.load(file);
        const selfGoal=auto?brain.observedTransformations?.selfSelectedChallenge():null;
        if(auto&&!selfGoal)return json(res,{found:false,selfProbe:true,
          reason:"no-reachable-novel-self-probe-from-observed-operators"});
        const actualGoal=selfGoal?{required:selfGoal.required,start:selfGoal.start,maxDepth}:
          {required,start,maxDepth};
        return json(res,{...brain.planObservedTransformation(actualGoal,
          {trace:true,embodied:true,localPolicy}),
          w:sl.w,fromSave:true,selfProbe:!!selfGoal,selfGoal:selfGoal||null});
      }catch(err){return json(res,{error:err.message});}
    }
    const id=++chatId;
    const timer=setTimeout(()=>{
      chats.delete(id);json(res,{error:"Căutarea reală a depășit 60 secunde"});
    },60000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{...result,w:sl.w});});
    sl.wk.postMessage({languageMaze:{id,required,start,maxDepth,localPolicy,auto}});
    return;
  }
  // Native V17: the original Brain constructs a NEW sentence by composing
  // effects learned from actual observed differences, with a partial GOAL.
  // The correct complete answer is deliberately NOT part of the request.
  if(req.method==="POST"&&url==="/composition-plan"){
    const sl=slots.find(x=>x.w===+(q.get("w")||0));
    if(!sl||!sl.worlds.includes("text"))
      return json(res,{error:"Choose a graph currently training the text world"});
    const required=(q.get("required")||"").split(",").map(x=>x.trim()).filter(Boolean);
    if(!required.length||required.length>8||required.some(x=>x.length>80))
      return json(res,{error:"Specify 1–8 goal tokens, not a full reference answer"});
    const start=q.get("start")?.trim()||null;
    if(start&&start.length>500)
      return json(res,{error:"Observed starting sentence is too long"});
    const goal={required,start,maxDepth:Math.max(0,Math.min(7,
      Math.trunc(+(q.get("maxDepth")||4))))};
    if(!sl.wk){
      const file=saveOf(sl);
      if(!fs.existsSync(file))return json(res,{error:"Original Brain has not been saved"});
      try {return json(res,{...Brain.load(file).planObservedTransformation(goal),fromSave:true});}
      catch(err){return json(res,{error:err.message});}
    }
    const id=++chatId,timer=setTimeout(()=>{
      chats.delete(id);json(res,{error:"Goal-conditioned transformation timed out"});
    },120000);
    chats.set(id,result=>{clearTimeout(timer);json(res,{...result,w:sl.w});});
    sl.wk.postMessage({compositionGoal:{id,...goal}});
    return;
  }
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
  if(req.method==="GET"&&url==="/shared-eval-status"){
    const id=+(q.get("id")||0),job=sharedJobs.get(id);
    if(!job)return json(res,{error:"Evaluation job not found or expired"});
    return json(res,{id,status:job.status,elapsedMs:Date.now()-job.created,
      result:job.result||null,error:job.error||null,w:job.w});
  }
  if (req.method === "POST" && url === "/shared-eval") {
    const sl = slots.find(x => x.w === +(q.get("w") || 0));
    if (!sl || !sl.wk) return json(res, {error: "The selected V17 graph is not running"});
    const busy=[...sharedJobs.values()].find(j=>j.w===sl.w&&j.status==="running");
    if(busy)return json(res,{id:busy.id,status:"running",w:sl.w,reused:true});
    const id=++chatId,job={id,w:sl.w,status:"running",created:Date.now(),
      result:null,error:null};sharedJobs.set(id,job);
    const timer=setTimeout(()=>{
      chats.delete(id);
      if(job.status==="running"){job.status="failed";
        job.error="Evaluarea a depășit 180 s; verifică jurnalele CUDA."; }
    },180000);
    chats.set(id,result=>{
      clearTimeout(timer);job.result=result;
      job.status=result.error?"failed":"done";job.error=result.error||null;
    });
    try{sl.wk.postMessage({sharedEval:{id,seed:+(q.get("seed")||74129)}});
    }catch(err){clearTimeout(timer);chats.delete(id);job.status="failed";job.error=err.message;}
    if(sharedJobs.size>25)for(const [key,item] of sharedJobs){
      if(sharedJobs.size<=20)break;
      if(item.status!=="running")sharedJobs.delete(key);
    }
    return json(res,{id,status:job.status,error:job.error,w:sl.w});
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
  if (req.method === "POST" && url === "/reset") {
    if(v43DonorPath){
      void (async()=>{
        const done=[];
        for(const sl of slots)done.push(await verifiedV43Reset(sl));
        return json(res,{ok:true,resetVerified:true,done});
      })().catch(err=>{if(!res.writableEnded){res.statusCode=409;json(res,{ok:false,error:"V43_RESET_FAILED: "+err.message});}});
      return;
    }
    for (const sl of slots) control(sl, "reset"); return json(res, {ok: true}); }
  if (req.method === "POST" && url === "/stop") { stopping = true; for (const sl of slots) sl.wk?.postMessage("stop"); res.writeHead(200); return res.end("ok"); }
  // the graph is the home: the living-graph page, fed by the devouring graphs instead of training in the browser
  if (url === "/") { res.writeHead(302, {location: "/transcend/torus-aether/ui/index.html?live=1"}); return res.end(); }
  if (url === "/dashboard") { res.writeHead(200, {"content-type": "text/html; charset=utf-8"}); return fs.createReadStream(path.join(here, "dashboard.html")).pipe(res); }
  if(url==="/telemetry"){
    const w=+(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!sl)return json(res,{error:"Graph not found",w});
    const after=+(q.get("after")||0),all=telemetry.get(w)||[];
    return json(res,{w,status:sl.status,points:all.filter(x=>x.at>after),
      newestAt:all.at(-1)?.at||null,snapshotAt:graphs.get(w)?.snapshotAt||null,
      observedTransformations:graphs.get(w)?.observedTransformations||null,
      shared:graphs.get(w)?.shared||null,
      endogenousNoise:graphs.get(w)?.endogenousNoise||null,
      constructedPaths:graphs.get(w)?.constructedPaths||null,
      hypermaze:graphs.get(w)?.hypermaze||null,
      nativePathAtlas:graphs.get(w)?.nativePathAtlas||null,
      xdAtlas:graphs.get(w)?.xdAtlas||null});
  }
  if (url === "/health") {
    const w=+(q.get("w")||0),sl=slots.find(x=>x.w===w);
    if(!sl)return json(res,{error:"Graph not found",w});
    return json(res,{w,status:sl.status,health:workerHealth(sl),
      canResume:fs.existsSync(saveOf(sl)),
      checkpoint:saveOf(sl),lastError:sl.lastError||null,
      lastNote:sl.lastNote||null,
      lastBatchReal:sl.lastBatchReal||null,
      snapshotAt:graphs.get(w)?.snapshotAt||null,
      lastGraphChars:graphs.get(w)?.chars??null,
      dataset:slotInfo(sl).dataset});
  }
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

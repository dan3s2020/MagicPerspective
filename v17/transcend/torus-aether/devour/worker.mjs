// One devouring brain. It lives through its own share of the world exactly once (no repetition) and, if the maps are
// among its worlds, plays a map between pieces of text — the same graph lives both. Every `every` characters it is
// tested, frozen, on the same unseen text as all the other brains, and it is saved whole (resume continues from there).
// When its memory passes the budget, what happened only once dissolves (solve).
import {parentPort, workerData} from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";
import {openTextDataset} from "../data/text-dataset.mjs";
import {Brain} from "./brain.mjs";
import {GpuWorlds} from "../gpu/client.mjs";
import {SharedExperience} from "../shared/experience.mjs";
import {TextActionPaths} from "../../../../isolated/noise-space/text_action_paths.mjs";
import {CausalTextAgent} from "../../../../isolated/noise-space/causal_text_world.mjs";

const {w, n, source, arm, every, maxChars, memGB, evalText, worlds = ["text"], mazeEvery = 4000, saveFile, resume} = workerData;
const ascii = s => { const out = []; for (const ch of s) { const c = ch.charCodeAt(0); if (c === 13) continue; out.push(c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63); } return out; };
const TEXT = worlds.includes("text"), MAZE = worlds.includes("maze"), TRANS = worlds.includes("transform");

async function* stream() {                                                 // this brain's share of the world, once
  if (!TEXT) { for (;;) yield {k: -1, bytes: []}; }
  if (source.kind === "parquet") {
    const ds = await openTextDataset(source.root);
    for (let k = w; k < ds.trainRows; k += n) { const x = await ds.exercise(k); yield {k, bytes: ascii("Q: " + x.prompt + "\nA: " + x.answer + "\n\n"), prompt: x.prompt, answer: x.answer}; }
  } else {
    let k = 0; for (const f of source.files) for (const para of fs.readFileSync(f, "utf8").split(/\n\s*\n/)) {
      if (para.trim().length < 20) continue; if (k++ % n === w && !source.heldSet.includes(k)) yield {k, bytes: ascii(para + "\n\n")}; }
  }
}

let brain = null, skip = 0;
if (resume && saveFile && fs.existsSync(saveFile)) { try { brain = Brain.load(saveFile); skip = brain.exercises || 0; } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "could not resume: " + err.message}); } }
if (!brain) brain = new Brain({rules: arm.rules, c: arm.c || {}, seed: 11 + w});
if (workerData.endogenousNoise) brain.enableEndogenousNoise(); // policy is saved with the original Brain
if (workerData.controls) brain.setControls(workerData.controls);         // the person's determinism / noise settings survive a restart
// Original V17 decisions remain unchanged; this observes TRAINING results only.
const shared = new SharedExperience({capacity: 384, seed: brain.seed});
const traceFile = workerData.traceTransformations && saveFile ? saveFile + ".transitions.jsonl" : null;
let traced = 0;
let traceBytes = traceFile && fs.existsSync(traceFile) ? fs.statSync(traceFile).size : 0;
// Explicit opt-in: record only real TRAINING observations, no oracle or held-out
// reference, with a bounded file size and a group ID for episode-disjoint tests.
brain.setSharedObserver(sample => {
  const item = shared.observe(sample);
  if (traceFile && traced < 50000 && traceBytes < 64 * 1024 * 1024) {
    const i = item.domain === "maze" ? brain.mazes.index : item.domain === "transform" ? brain.trans?.index : brain.exercises;
    const episode = item.domain + ":" + String(i ?? 0);
    fs.mkdirSync(path.dirname(traceFile), {recursive: true});
    const line = JSON.stringify({...item, episode}) + "\n";
    fs.appendFileSync(traceFile, line);
    traceBytes += Buffer.byteLength(line);
    traced++;
  }
});
const sharedFile = saveFile ? saveFile + ".shared.pt" : null;
const textFile = saveFile ? saveFile + ".causal.json" : null;
let textPaths = new TextActionPaths(), causalText = new CausalTextAgent({seed: brain.seed});
if (resume && textFile && fs.existsSync(textFile)) {
  try {
    const t = JSON.parse(fs.readFileSync(textFile, "utf8"));
    if (t.version !== 1) throw Error("unknown language sidecar");
    textPaths = TextActionPaths.restore(t.paths); causalText = CausalTextAgent.restore(t.causal);
  } catch (err) {
    parentPort.postMessage({type: "note", w: workerData.gw, text: "language sidecar not loaded: " + err.message});
  }
}
const saveText = () => {
  if (!textFile) return;
  fs.mkdirSync(path.dirname(textFile), {recursive: true});
  fs.writeFileSync(textFile + ".tmp", JSON.stringify({version: 1, paths: textPaths.export(), causal: causalText.export()}));
  fs.renameSync(textFile + ".tmp", textFile);
};
const absorbText = row => {
  if (typeof row?.prompt !== "string" || typeof row?.answer !== "string" || !row.prompt.trim() || !row.answer.trim()) return;
  textPaths.learn(row.prompt, row.answer);
  causalText.train(row.prompt, row.answer, textPaths,
    {maxActions: 12, seed: ((row.k || 0) + brain.seed) >>> 0, emit: event => shared.observeText(event, row.prompt)});
};
const H = Array.from(evalText, ch => { const c = ch.charCodeAt(0); return c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63; });
let lastShot = 0, shots = 0, dissolved = 0, nextTest = (brain.chars || 0) + every, nextMaze = (brain.chars || 0) + 1; const t0 = performance.now(), c0 = brain.chars || 0;
const transStats = () => { brain.tWorld(); const T = brain.trans; return {played: T.played, won: T.won, test: T.test, last: T.last}; };
const mazeStats = () => { const M = brain.mazes; return {played: M.played, won: M.won, recent: M.recent.length ? M.recent.reduce((a, b) => a + b, 0) / M.recent.length : 0, test: M.test || null, knows: M.knows || null, last: M.last}; };
const report = (final = false) => {
  const msg = {type: "test", w: workerData.gw, arm: arm.name, chars: brain.chars, exercises: brain.exercises || 0, dissolved, heapGB: process.memoryUsage().heapUsed / 1e9,
    speed: (brain.chars - c0) / ((performance.now() - t0) / 1000), test: TEXT ? brain.test(H) : null, final, maze: MAZE ? (brain.testMazes(30), mazeStats()) : null, transform: TRANS ? (brain.testTransforms(24), transStats()) : null,
    gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null,
    shared: shared.status(), endogenousNoise: brain.noiseAgent?.status() || null, form: brain.chain.A[0].wires.length ? brain.chain.A[0].form().split(", ").slice(0, 4).join(", ") : "", cActive: brain.e.c.active, cLag: brain.e.c.maxLag, cFlips: brain.e.c.promotions};
  if (saveFile) { try { msg.savedMB = brain.save(saveFile) / 1e6; saveText(); } catch (err) { msg.saveError = err.message; } }
  parentPort.postMessage(msg);
};
const shot = (force) => { if (!force && performance.now() - lastShot < 3000) return; lastShot = performance.now(); try { brain.organismView(); } catch {}
  parentPort.postMessage({type: "graph", w: workerData.gw, arm: arm.name, chars: brain.chars, lived: brain.lived, controls: brain.controls, shared: shared.status(), selfModel: brain.align ? brain.align.selfModel() : null, accAlign: brain.align ? brain.align.accuracy() : null, exercises: brain.exercises || 0, form: brain.chain.A[0].form(),
    maze: MAZE ? mazeStats() : null, transform: TRANS ? transStats() : null, endogenousNoise: brain.noiseAgent?.status() || null, gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null, ...brain.trace.snapshot(shots++ % 5 === 0)}); };
let stop = false, paused = !!workerData.paused, saveNow = false;
// many worlds at once on the GPU (gpu/worlds_gpu.py) for this brain, with the settings chosen on the page or the command line
let gpuSet = workerData.gpu && workerData.gpu.device && workerData.gpu.device !== "off" ? workerData.gpu : null, gpu = null, gpuInfo = null, gpuError = null, sharedLoaded = false, gpuResetPending = false;
const gpuOn = async () => {
  // Never kill a Python process while a CUDA batch is in flight. Apply changes at the next batch boundary.
  if (gpuResetPending) { gpu?.close(); gpu = null; sharedLoaded = false; gpuResetPending = false; }
  if (!gpuSet) return null;
  if (!gpu || gpu.dead) { gpu = new GpuWorlds(gpuSet); sharedLoaded = false; batchNow = {phase: "GPU: pornește " + gpu.py, done: 0, total: 0}; shot(true);
    try { gpuInfo = await gpu.ready; gpuError = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ready: " + JSON.stringify(gpuInfo)}); }
    catch (err) { gpuError = err.message; gpu = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } batchNow = null; } return gpu; };
let batchNow = null;                                                       // where the current GPU batch is (shown on the page while the brain lives it)
const flushShared = async (force = false) => {
  if (!shared.queue.length || (!force && shared.queue.length < 24)) return;
  if (!gpuSet) { shared.error = "Observed transitions queued; choose CUDA or explicit CPU for PyTorch training."; return; }
  const G = await gpuOn();
  if (!G) { shared.error = gpuError || "PyTorch process not ready"; return; }
  const samples = shared.take(96);
  try {
    if (!sharedLoaded) {
      if (sharedFile) await G.call({cmd: "shared_load", checkpoint: sharedFile, seed: brain.seed});
      sharedLoaded = true;
    }
    const result = await G.call({cmd: "shared_train", samples, checkpoint: sharedFile, seed: brain.seed, adaptiveNoise: true});
    shared.training = result; shared.error = null;
  } catch (err) {
    shared.requeue(samples); shared.error = "Shared model: " + err.message;
    parentPort.postMessage({type: "note", w: workerData.gw, text: shared.error});
  }
};
const tick = async (phase, done, total) => { batchNow = {phase, done, total}; shot(); if (paused || saveNow) await hold(); await new Promise(r => setImmediate(r)); };
const worldsOnce = async (record) => {                                     // one round of the worlds: one each on the CPU, or a batch of N on the GPU
  const G = await gpuOn();
  if (G) { try { if (MAZE) await brain.learnMazesGPU(G, gpuSet.worlds, tick); if (TRANS) await brain.playTransformsGPU(G, gpuSet.worlds, tick); await flushShared(); batchNow = null; return; } catch (err) { gpuError = err.message; batchNow = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } }
  if (gpuSet) { shot(true); return; }                                      // the card was asked for and does not work: the error is on the page, no CPU fallback
  if (MAZE) brain.playMaze(record || brain.mazes.played % 10 === 0); if (TRANS) { brain.tWorld(); brain.playTransform(record || brain.trans.played % 5 === 0); } await flushShared(); };

const selectedTextBatch = () => Math.max(1, Math.min(128, Math.trunc(Number(gpuSet?.textBatch) || gpuInfo?.autoText || 2)));
const processGpuText = async (exs, meta) => {
  const total = exs.reduce((sum, e) => sum + Math.max(0, e.length - 1), 0);
  batchNow = {phase: "text CUDA: aliniere", done: 0, total}; shot(true);
  const startChars = brain.chars;
  await brain.learnTextGPU(gpu, exs, progress => {
    batchNow = {phase: "text CUDA: " + progress.phase, done: progress.done, total: progress.total};
    shot();
  });
  batchNow = {phase: "text: integrare în graful V17", done: 0, total: exs[0]?.length || 0}; shot(true);
  // The original V17 trace sees the first actual exercise, exactly once.
  if (exs.length) for (const y of exs[0]) brain.live(y, brain.lived % 50 === 0, {old: true});
  for (let j = 0; j < meta.length; j += Math.max(1, Math.floor(meta.length / 8))) absorbText(meta[j]);
  batchNow = {phase: "CUDA: model comun de transformări", done: 0, total: shared.queue.length};
  await flushShared();
  if ((MAZE || TRANS) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); }
  batchNow = null;
  // Report the first committed batch immediately, not only after 60,000 bytes.
  if (brain.exercises <= exs.length || Math.floor(brain.chars / every) > Math.floor(startChars / every)) report();
  shot(true);
};
parentPort.on("message", m => { if (m && m.controls) { const C = brain.setControls(m.controls); parentPort.postMessage({type: "note", w: workerData.gw, text: "controls " + JSON.stringify(C)}); shot(true); return; }
  if (m && m.sharedEval) {
    const {id, seed = 74129} = m.sharedEval;
    void (async () => {
      if (!gpuSet) throw Error("Choose a real PyTorch device (CUDA or explicit CPU) before shared evaluation");
      if (!shared.training?.step && !(sharedFile && fs.existsSync(sharedFile))) throw Error("Shared head has not trained yet");
      const observed = [], count = {maze: 0, transform: 0, text: 0};
      const collect = (domain, cap) => e => { if (count[domain] >= cap) return;
        observed.push({domain: e.domain, before: e.before, after: e.after, action: e.action, context: e.context}); count[domain]++; };
      if (MAZE) brain.examMazes([7, 9, 11], 1, seed, {onTransition: collect("maze", 40)});
      if (TRANS && brain.causal) brain.evalTransforms(3, 0, seed, {onTransition: collect("transform", 40)});
      const held = /Q:\s*([^\r\n]+)\r?\nA:/.exec(evalText);
      if (TEXT && held) {
        const episode = causalText.navigate(held[1], textPaths, {steps: 24, seed});
        for (const e of episode.events) { if (count.text >= 24) break;
          observed.push({domain: "text", before: e.before, after: e.after,
            action: "speech-tool:" + e.action.tool + ":" + e.action.token, context: held[1].slice(0, 256)}); count.text++; }
      }
      if (!observed.length) throw Error("No unseen actions could be observed by frozen evaluators");
      const G = await gpuOn(); if (!G) throw Error(gpuError || "PyTorch device not ready");
      if (!sharedLoaded) { if (sharedFile) await G.call({cmd: "shared_load", checkpoint: sharedFile, seed: brain.seed}); sharedLoaded = true; }
      const results = await G.call({cmd: "shared_eval", samples: observed.slice(0, 128), seed: brain.seed});
      parentPort.postMessage({type: "chat", id, kind: "shared", seed, counts: count, ...results, frozen: true,
        explanation: "Unseen V17 world transitions; no training, no BFS oracle or heldout answer provided to the shared learner."});
    })().catch(err => parentPort.postMessage({type: "chat", id, kind: "shared", error: err.message}));
    return;
  }
  if (m && m.exam) { let r; try { r = brain.examMazes(m.exam.sizes, m.exam.per); } catch (err) { r = {error: err.message}; } parentPort.postMessage({type: "chat", id: m.exam.id, ...r}); return; }
  if (m && m.chat) { let r; try { r = brain.chat(m.chat.history, m.chat.opts || {}); } catch (err) { r = {error: err.message}; } parentPort.postMessage({type: "chat", id: m.chat.id, ...r}); if (m.chat.opts?.learn) shot(true); return; }
  if (m && m.gpu) { gpuSet = m.gpu.device === "off" ? null : {...(gpuSet || {}), ...m.gpu}; gpuResetPending = true; gpuError = null; return; }
  if (m === "stop") stop = true; else if (m === "pause") paused = true; else if (m === "resume") paused = false; else if (m === "save") saveNow = true; });
const hold = async () => { while (paused && !stop) { if (saveNow) doSave(); await new Promise(r => setTimeout(r, 150)); } if (saveNow) doSave(); };
const doSave = () => { saveNow = false; if (saveFile) try { parentPort.postMessage({type: "saved", w: workerData.gw, MB: (saveText(), brain.save(saveFile) / 1e6)}); } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "save failed: " + err.message}); } };
let k = 0, textBatch = [], textMeta = [];
shot(true); await hold();
for await (const ex of stream()) {
  await hold();
  if (TEXT && k++ < skip) continue;                                         // a resumed brain does not live the same exercises twice
  // the card is there: text is lived on the card in batches (gpu/text_gpu.py); the brain adds the totals, and one
  // exercise of each batch is also lived here by the older organs (so they and the drawn graph stay alive)
  // Explicit CUDA errors stop the worker: NEVER silently continue on CPU or discard an unseen batch.
  if (TEXT && gpuSet) {
    if (gpuError || !(await gpuOn())) {
      parentPort.postMessage({type: "fatal", w: workerData.gw, text: "CUDA unavailable: " + (gpuError || "backend did not initialize")});
      stop = true; break;
    }
    textBatch.push(ex.bytes); textMeta.push(ex);
    if (textBatch.length >= selectedTextBatch() || textBatch.reduce((n, b) => n + b.length, 0) >= 120000) {
      const exs = textBatch, meta = textMeta;
      try { await processGpuText(exs, meta); textBatch = []; textMeta = []; }
      catch (err) {
        gpuError = err.message; batchNow = {phase: "CUDA error: " + err.message, done: 0, total: 0}; shot(true);
        parentPort.postMessage({type: "fatal", w: workerData.gw, text: "GPU batch failed without CPU fallback: " + err.message});
        stop = true; break;
      }
    }
    if (brain.chars >= maxChars || stop) break; await new Promise(r => setImmediate(r)); continue;
  }
  // Explicitly switching to CPU drains any pending exercises rather than dropping them.
  if (TEXT && textBatch.length) {
    for (let j = 0; j < textBatch.length; j++) {
      brain.beginExercise(); for (const y of textBatch[j]) { brain.live(y, brain.chars % 50 === 0); brain.chars++; }
      brain.exercises = (brain.exercises || 0) + 1; absorbText(textMeta[j]);
    }
    textBatch = []; textMeta = []; shot(true);
  }
  brain.exercises = (brain.exercises || 0) + (TEXT ? 1 : 0); if (TEXT) brain.beginExercise();
  for (const y of ex.bytes) {
    brain.live(y, brain.chars % 50 === 0); brain.chars++;
    if (brain.chars % 2000 === 0) shot();
    if ((MAZE || TRANS) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); shot(); }
    if (brain.chars >= nextTest) { nextTest += every; if (process.memoryUsage().heapUsed / 1e9 > memGB && !brain.full) { brain.full = true; parentPort.postMessage({type: "note", w: workerData.gw, text: "memory budget reached: nothing is deleted; the old graph stops growing, the aligning graph keeps everything"}); } report(); }
    if (brain.chars >= maxChars || stop) break;
    if (paused || saveNow) { shot(true); await hold(); }
  }
  if (TEXT && !stop && brain.chars < maxChars) { absorbText(ex); await flushShared(); }
  if (!TEXT) { brain.episodes = (brain.episodes || 0) + 1;
    await worldsOnce(false);
    shot(); if (brain.episodes % (gpu ? 5 : 50) === 0) report(); if (stop) break; }
  if (brain.chars >= maxChars || stop) break;
  await new Promise(r => setImmediate(r));                                   // let the stop message in
}
// A dataset can end before the final batch reaches the configured size; those rows must still be trained.
if (TEXT && gpuSet && !stop && textBatch.length) {
  try { const G = await gpuOn(); if (!G) throw Error(gpuError || "CUDA unavailable"); await processGpuText(textBatch, textMeta); textBatch = []; textMeta = []; }
  catch (err) { gpuError = err.message; batchNow = {phase: "CUDA error: " + err.message, done: 0, total: 0}; shot(true);
    parentPort.postMessage({type: "fatal", w: workerData.gw, text: "Final GPU text batch failed: " + err.message}); stop = true; }
}
report(stop ? false : true);
if (gpu) gpu.close();
parentPort.close();

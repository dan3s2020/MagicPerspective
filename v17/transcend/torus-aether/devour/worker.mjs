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

const {w, n, source, arm, every, maxChars, memGB, evalText, worlds = ["text"], mazeEvery = 4000, saveFile, resume} = workerData;
const ascii = s => { const out = []; for (const ch of s) { const c = ch.charCodeAt(0); if (c === 13) continue; out.push(c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63); } return out; };
const TEXT = worlds.includes("text"), MAZE = worlds.includes("maze"), TRANS = worlds.includes("transform");

async function* stream() {                                                 // this brain's share of the world, once
  if (!TEXT) { for (;;) yield {k: -1, bytes: []}; }
  if (source.kind === "parquet") {
    const ds = await openTextDataset(source.root);
    for (let k = w; k < ds.trainRows; k += n) { const x = await ds.exercise(k); yield {k, bytes: ascii("Q: " + x.prompt + "\nA: " + x.answer + "\n\n")}; }
  } else {
    let k = 0; for (const f of source.files) for (const para of fs.readFileSync(f, "utf8").split(/\n\s*\n/)) {
      if (para.trim().length < 20) continue; if (k++ % n === w && !source.heldSet.includes(k)) yield {k, bytes: ascii(para + "\n\n")}; }
  }
}

let brain = null, skip = 0;
if (resume && saveFile && fs.existsSync(saveFile)) { try { brain = Brain.load(saveFile); skip = brain.exercises || 0; } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "could not resume: " + err.message}); } }
if (!brain) brain = new Brain({rules: arm.rules, c: arm.c || {}, seed: 11 + w});
const H = Array.from(evalText, ch => { const c = ch.charCodeAt(0); return c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63; });
let lastShot = 0, shots = 0, dissolved = 0, nextTest = (brain.chars || 0) + every, nextMaze = (brain.chars || 0) + 1; const t0 = performance.now(), c0 = brain.chars || 0;
const transStats = () => { brain.tWorld(); const T = brain.trans; return {played: T.played, won: T.won, test: T.test, last: T.last}; };
const mazeStats = () => { const M = brain.mazes; return {played: M.played, won: M.won, recent: M.recent.length ? M.recent.reduce((a, b) => a + b, 0) / M.recent.length : 0, test: M.test || null, knows: M.knows || null, last: M.last}; };
const report = (final = false) => {
  const msg = {type: "test", w: workerData.gw, arm: arm.name, chars: brain.chars, exercises: brain.exercises || 0, dissolved, heapGB: process.memoryUsage().heapUsed / 1e9,
    speed: (brain.chars - c0) / ((performance.now() - t0) / 1000), test: TEXT ? brain.test(H) : null, final, maze: MAZE ? (brain.testMazes(30), mazeStats()) : null, transform: TRANS ? (brain.testTransforms(24), transStats()) : null,
    gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null} : null,
    form: brain.chain.A[0].wires.length ? brain.chain.A[0].form().split(", ").slice(0, 4).join(", ") : "", cActive: brain.e.c.active, cLag: brain.e.c.maxLag, cFlips: brain.e.c.promotions};
  if (saveFile) { try { msg.savedMB = brain.save(saveFile) / 1e6; } catch (err) { msg.saveError = err.message; } }
  parentPort.postMessage(msg);
};
const shot = (force) => { if (!force && performance.now() - lastShot < 3000) return; lastShot = performance.now();
  parentPort.postMessage({type: "graph", w: workerData.gw, arm: arm.name, chars: brain.chars, exercises: brain.exercises || 0, form: brain.chain.A[0].form(),
    maze: MAZE ? mazeStats() : null, transform: TRANS ? transStats() : null, gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null} : null, ...brain.trace.snapshot(shots++ % 5 === 0)}); };
let stop = false, paused = !!workerData.paused, saveNow = false;
// many worlds at once on the GPU (gpu/worlds_gpu.py) for this brain, with the settings chosen on the page or the command line
let gpuSet = workerData.gpu && workerData.gpu.device && workerData.gpu.device !== "off" ? workerData.gpu : null, gpu = null, gpuInfo = null, gpuError = null;
const gpuOn = async () => { if (!gpuSet) return null; if (!gpu || gpu.dead) { gpu = new GpuWorlds(gpuSet); try { gpuInfo = await gpu.ready; gpuError = null; } catch (err) { gpuError = err.message; gpu = null; } } return gpu; };
const worldsOnce = async (record) => {                                     // one round of the worlds: one each on the CPU, or a batch of N on the GPU
  const G = await gpuOn();
  if (G) { try { if (MAZE) await brain.playMazesGPU(G, gpuSet.worlds); if (TRANS) await brain.playTransformsGPU(G, gpuSet.worlds); return; } catch (err) { gpuError = err.message; } }
  if (MAZE) brain.playMaze(record || brain.mazes.played % 10 === 0); if (TRANS) { brain.tWorld(); brain.playTransform(record || brain.trans.played % 5 === 0); } };
parentPort.on("message", m => { if (m && m.gpu) { gpuSet = m.gpu.device === "off" ? null : {...(gpuSet || {}), ...m.gpu}; if (gpu) { gpu.close(); gpu = null; } return; }
  if (m === "stop") stop = true; else if (m === "pause") paused = true; else if (m === "resume") paused = false; else if (m === "save") saveNow = true; });
const hold = async () => { while (paused && !stop) { if (saveNow) doSave(); await new Promise(r => setTimeout(r, 150)); } if (saveNow) doSave(); };
const doSave = () => { saveNow = false; if (saveFile) try { parentPort.postMessage({type: "saved", w: workerData.gw, MB: brain.save(saveFile) / 1e6}); } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "save failed: " + err.message}); } };
let k = 0;
shot(true); await hold();
for await (const ex of stream()) {
  await hold();
  if (TEXT && k++ < skip) continue;                                         // a resumed brain does not live the same exercises twice
  brain.exercises = (brain.exercises || 0) + (TEXT ? 1 : 0);
  for (const y of ex.bytes) {
    brain.live(y, brain.chars % 50 === 0); brain.chars++;
    if (brain.chars % 2000 === 0) shot();
    if ((MAZE || TRANS) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); shot(); }
    if (brain.chars >= nextTest) { nextTest += every; if (process.memoryUsage().heapUsed / 1e9 > memGB) dissolved += brain.dissolve(); report(); }
    if (brain.chars >= maxChars || stop) break;
    if (paused || saveNow) { shot(true); await hold(); }
  }
  if (!TEXT) { brain.episodes = (brain.episodes || 0) + 1;
    await worldsOnce(false);
    shot(); if (brain.episodes % (gpu ? 5 : 50) === 0) report(); if (stop) break; }
  if (brain.chars >= maxChars || stop) break;
  await new Promise(r => setImmediate(r));                                   // let the stop message in
}
report(stop ? false : true);
if (gpu) gpu.close();
parentPort.close();

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
import {LiveResearch} from "../../../../isolated/native-language-paths/live-research.mjs";

const {w, n, source, arm, every, maxChars, memGB, evalText, worlds = ["text"], mazeEvery = 4000, saveFile, resume} = workerData;
const ascii = s => { const out = []; for (const ch of s) { const c = ch.charCodeAt(0); if (c === 13) continue; out.push(c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63); } return out; };
const TEXT = worlds.includes("text"), MAZE = worlds.includes("maze"), TRANS = worlds.includes("transform");
const RESEARCH = !!workerData.research?.enabled && TEXT && source.kind === "parquet";
const researchFile = saveFile ? saveFile + ".research.json" : null;
let research = null, heldoutResearch = [];
if (RESEARCH) {
  const config = {maxEntries: Math.max(64, workerData.research.maxEntries || 3000),
    reportEvery: Math.max(1, workerData.research.reportEvery || 5),
    characterLimit: 160, candidates: 8, loopWindow: 24, loopPenalty: 4, gamma: .9};
  if (resume && researchFile && fs.existsSync(researchFile)) {
    research = LiveResearch.restore(JSON.parse(fs.readFileSync(researchFile,"utf8")),config);
  } else research = new LiveResearch(config);
  const ds = await openTextDataset(source.root);
  for(let i=0;i<Math.min(ds.held,Math.max(1,workerData.research.evalCount || 4));i++)
    heldoutResearch.push(await ds.heldOut(i));
}
const researchSave=()=>{
  if(!research||!researchFile)return;
  const temp=researchFile+".tmp";
  fs.writeFileSync(temp,JSON.stringify(research.save()));
  fs.renameSync(temp,researchFile);
};
let lastResearchPulse=0;
const researchPulse=(force=false)=>{
  if(!research)return;
  const now=performance.now();
  if(!force&&now-lastResearchPulse<2500)return;
  lastResearchPulse=now;
  parentPort.postMessage({type:"research",w:workerData.gw,arm:arm.name,
    ...research.status({brainCharacters:brain?.chars||0,mazeEpisodes:brain?.mazes?.played||0,
      targetAttraction:brain?.disc?.attract(2)||0,
      realTraining:true,heldoutNeverTrained:true})});
};

async function* stream() {                                                 // this brain's share of the world, once
  if (!TEXT) { for (;;) yield {k: -1, bytes: []}; }
  if (source.kind === "parquet") {
    const ds = await openTextDataset(source.root);
    for (let k = w; k < ds.trainRows; k += n) { const x = await ds.exercise(k); yield {k, prompt: x.prompt, answer: x.answer, bytes: ascii("Q: " + x.prompt + "\nA: " + x.answer + "\n\n")}; }
  } else {
    let k = 0; for (const f of source.files) for (const para of fs.readFileSync(f, "utf8").split(/\n\s*\n/)) {
      if (para.trim().length < 20) continue; if (k++ % n === w && !source.heldSet.includes(k)) yield {k, bytes: ascii(para + "\n\n")}; }
  }
}

let brain = null, skip = 0;
if (resume && saveFile && fs.existsSync(saveFile)) { try { brain = Brain.load(saveFile); skip = brain.exercises || 0; } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "could not resume: " + err.message}); } }
if (!brain) brain = new Brain({rules: arm.rules, c: arm.c || {}, seed: 11 + w});
if (workerData.controls) brain.setControls(workerData.controls);         // the person's determinism / noise settings survive a restart
const H = Array.from(evalText, ch => { const c = ch.charCodeAt(0); return c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63; });
let lastShot = 0, shots = 0, dissolved = 0, nextTest = (brain.chars || 0) + every, nextMaze = (brain.chars || 0) + 1; const t0 = performance.now(), c0 = brain.chars || 0;
const transStats = () => { brain.tWorld(); const T = brain.trans; return {played: T.played, won: T.won, test: T.test, last: T.last}; };
const mazeStats = () => { const M = brain.mazes; return {played: M.played, won: M.won, recent: M.recent.length ? M.recent.reduce((a, b) => a + b, 0) / M.recent.length : 0, test: M.test || null, knows: M.knows || null, last: M.last}; };
const report = (final = false) => {
  const msg = {type: "test", w: workerData.gw, arm: arm.name, chars: brain.chars, exercises: brain.exercises || 0, dissolved, heapGB: process.memoryUsage().heapUsed / 1e9,
    speed: (brain.chars - c0) / ((performance.now() - t0) / 1000), test: TEXT ? brain.test(H) : null, final, maze: MAZE ? (brain.testMazes(30), mazeStats()) : null, transform: TRANS ? (brain.testTransforms(24), transStats()) : null,
    gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null,
    form: brain.chain.A[0].wires.length ? brain.chain.A[0].form().split(", ").slice(0, 4).join(", ") : "", cActive: brain.e.c.active, cLag: brain.e.c.maxLag, cFlips: brain.e.c.promotions};
  if (saveFile) { try { msg.savedMB = brain.save(saveFile) / 1e6; researchSave(); } catch (err) { msg.saveError = err.message; } }
  researchPulse(true);
  parentPort.postMessage(msg);
};
const shot = (force) => { if (!force && performance.now() - lastShot < 3000) return; lastShot = performance.now(); try { brain.organismView(); } catch {}
  parentPort.postMessage({type: "graph", w: workerData.gw, arm: arm.name, chars: brain.chars, lived: brain.lived, controls: brain.controls, selfModel: brain.align ? brain.align.selfModel() : null, accAlign: brain.align ? brain.align.accuracy() : null, exercises: brain.exercises || 0, form: brain.chain.A[0].form(),
    maze: MAZE ? mazeStats() : null, transform: TRANS ? transStats() : null, research: research ? {enabled: true, observed: research.observed, attempts: research.attempts, progress: research.progress} : null, gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null, ...brain.trace.snapshot(shots++ % 5 === 0)}); };
let stop = false, paused = !!workerData.paused, saveNow = false;
// many worlds at once on the GPU (gpu/worlds_gpu.py) for this brain, with the settings chosen on the page or the command line
let gpuSet = workerData.gpu && workerData.gpu.device && workerData.gpu.device !== "off" ? workerData.gpu : null, gpu = null, gpuInfo = null, gpuError = null;
const gpuOn = async () => { if (!gpuSet) return null; if (!gpu || gpu.dead) { gpu = new GpuWorlds(gpuSet); batchNow = {phase: "GPU: pornește " + gpu.py, done: 0, total: 0}; shot(true);
    try { gpuInfo = await gpu.ready; gpuError = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ready: " + JSON.stringify(gpuInfo)}); }
    catch (err) { gpuError = err.message; gpu = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } batchNow = null; } return gpu; };
let batchNow = null;                                                       // where the current GPU batch is (shown on the page while the brain lives it)
const tick = async (phase, done, total) => { batchNow = {phase, done, total}; shot(); if (paused || saveNow) await hold(); await new Promise(r => setImmediate(r)); };
const worldsOnce = async (record) => {                                     // one round of the worlds: one each on the CPU, or a batch of N on the GPU
  const G = await gpuOn();
  if (G) { try { if (MAZE) await brain.learnMazesGPU(G, gpuSet.worlds, tick); if (TRANS) await brain.playTransformsGPU(G, gpuSet.worlds, tick); batchNow = null; return; } catch (err) { gpuError = err.message; batchNow = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } }
  if (gpuSet) { shot(true); return; }                                      // the card was asked for and does not work: the error is on the page, no CPU fallback
  if (MAZE) brain.playMaze(record || brain.mazes.played % 10 === 0); if (TRANS) { brain.tWorld(); brain.playTransform(record || brain.trans.played % 5 === 0); } };
parentPort.on("message", m => { if (m && m.controls) { const C = brain.setControls(m.controls); parentPort.postMessage({type: "note", w: workerData.gw, text: "controls " + JSON.stringify(C)}); shot(true); return; }
  if (m && m.exam) { let r; try { r = brain.examMazes(m.exam.sizes, m.exam.per); } catch (err) { r = {error: err.message}; } parentPort.postMessage({type: "chat", id: m.exam.id, ...r}); return; }
  if (m && m.chat) { let r; try { r = brain.chat(m.chat.history, m.chat.opts || {}); } catch (err) { r = {error: err.message}; } parentPort.postMessage({type: "chat", id: m.chat.id, ...r}); if (m.chat.opts?.learn) shot(true); return; }
  if (m && m.gpu) { gpuSet = m.gpu.device === "off" ? null : {...(gpuSet || {}), ...m.gpu}; if (gpu) { gpu.close(); gpu = null; } return; }
  if (m === "stop") stop = true; else if (m === "pause") paused = true; else if (m === "resume") paused = false; else if (m === "save") saveNow = true; });
const hold = async () => { while (paused && !stop) { if (saveNow) doSave(); await new Promise(r => setTimeout(r, 150)); } if (saveNow) doSave(); };
const doSave = () => { saveNow = false; if (saveFile) try { const size=brain.save(saveFile); researchSave(); parentPort.postMessage({type: "saved", w: workerData.gw, MB: size / 1e6}); } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "save failed: " + err.message}); } };
let k = 0, textBatch = [];
shot(true); await hold();
for await (const ex of stream()) {
  await hold();
  if (TEXT && k++ < skip) continue;                                         // a resumed brain does not live the same exercises twice
  if (research && TEXT && ex.prompt && ex.answer) {
    try {
      research.progress={index:ex.k,bytesTotal:ex.bytes.length,bytesProcessed:0,
        phase:"observed pre-action prediction (before learning this record)"};
      research.experience({index:ex.k,question:ex.prompt,answer:ex.answer,characters:ex.bytes.length},brain);
      research.progress.phase="original V17 Brain learning full text";
      researchPulse(true);
    } catch(err) {
      research.error=err.stack||err.message;
      parentPort.postMessage({type:"note",w:workerData.gw,text:"RESEARCH ERROR: "+err.message});
      researchPulse(true);
    }
  }
  // the card is there: text is lived on the card in batches (gpu/text_gpu.py); the brain adds the totals, and one
  // exercise of each batch is also lived here by the older organs (so they and the drawn graph stay alive)
  if (TEXT && gpuSet && !gpuError && (await gpuOn())) {
    if(research&&research.progress) {
      research.progress.phase="queued for real CUDA text batch (not yet learned)";
      research.progress.bytesProcessed=0;
      research.progress.queuedRows=(textBatch.length+1);
      researchPulse(true);
    }
    textBatch.push(ex.bytes);
    if (textBatch.length >= (gpuSet.textBatch || gpu?.info?.autoText || 512)) {
      const exs = textBatch; textBatch = []; batchNow = {phase: "text pe placă", done: 0, total: exs.length}; shot();
      try { const before = brain.chars; await brain.learnTextGPU(gpu, exs); batchNow = null;
        for (const y of exs[0]) brain.live(y, brain.lived % 50 === 0, {old: true});
        if ((MAZE || TRANS) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); }
        if(research&&research.progress) {
          research.progress.phase="CUDA batch committed to original V17 Brain";
          research.progress.bytesProcessed=research.progress.bytesTotal;
          research.progress.queuedRows=0;researchPulse(true);
        }
        if (Math.floor(brain.chars / every) > Math.floor(before / every)) report(); shot(); }
      catch (err) { gpuError = err.message; batchNow = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR (text): " + err.message}); } }
    if (brain.chars >= maxChars || stop) break; await new Promise(r => setImmediate(r)); continue; }
  brain.exercises = (brain.exercises || 0) + (TEXT ? 1 : 0); if (TEXT) brain.beginExercise();
  let rowRead=0;
  for (const y of ex.bytes) {
    brain.live(y, brain.chars % 50 === 0); brain.chars++;
    if(research && ++rowRead % 512 === 0) {
      research.progress.bytesProcessed=rowRead;
      researchPulse();
    }
    if (brain.chars % 2000 === 0) shot();
    if ((MAZE || TRANS) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); shot(); }
    if (brain.chars >= nextTest) { nextTest += every; if (process.memoryUsage().heapUsed / 1e9 > memGB && !brain.full) { brain.full = true; parentPort.postMessage({type: "note", w: workerData.gw, text: "memory budget reached: nothing is deleted; the old graph stops growing, the aligning graph keeps everything"}); } report(); }
    if (brain.chars >= maxChars || stop) break;
    if (paused || saveNow) { shot(true); await hold(); }
  }
  if (!TEXT) { brain.episodes = (brain.episodes || 0) + 1;
    await worldsOnce(false);
    shot(); if (brain.episodes % (gpu ? 5 : 50) === 0) report(); if (stop) break; }
  if(research&&TEXT) {
    research.progress={index:ex.k,bytesTotal:ex.bytes.length,
      bytesProcessed:rowRead,phase:rowRead===ex.bytes.length?"record completed":"record interrupted at character limit"};
    if(research.observed>0&&research.observed%research.config.reportEvery===0){
      try { research.evaluateHeldout(heldoutResearch,brain); } catch(err) {
        research.error=err.stack||err.message;
        parentPort.postMessage({type:"note",w:workerData.gw,text:"HELDOUT RESEARCH ERROR: "+err.message});
      }
    }
    researchPulse(true);
  }
  if (brain.chars >= maxChars || stop) break;
  await new Promise(r => setImmediate(r));                                   // let the stop message in
}
report(stop ? false : true);
researchPulse(true);
if (gpu) gpu.close();
parentPort.close();

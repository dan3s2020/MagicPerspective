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
import {BodyPerspectiveMemory} from "../perspective/body-memory.mjs";
import {LanguageMazeMemory} from "../language-maze/language-world.mjs";
import {observeCompletedTrainingRows} from "../language-maze/observe-committed.mjs";
import {gpuTextWindows,resumeSourceState,applyCompletedWindow,DEFAULT_GPU_WINDOW_CHARS} from "./gpu-text-windows.mjs";
import {createHash} from "node:crypto";

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
if (resume && saveFile && fs.existsSync(saveFile)) { try { brain = Brain.load(saveFile); skip = resumeSourceState(brain).rows; } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "could not resume: " + err.message}); } }
if (!brain) brain = new Brain({rules: arm.rules, c: arm.c || {}, seed: 11 + w});
const sourceStart=resumeSourceState(brain);
brain.sourceRows=sourceStart.rows;
brain.sourceOffset=sourceStart.offset;
skip=sourceStart.rows;
// Original dataset ROWS count, not GPU windows, is the durable resume cursor.
if (TEXT)brain.exercises=brain.sourceRows;
const GPU_MAX_WINDOW=Math.max(256,Math.min(32768,Math.trunc(Number(workerData.gpuMaxChars)||DEFAULT_GPU_WINDOW_CHARS)));
let activeSourceWindow=null;
if (workerData.controls) brain.setControls(workerData.controls);         // the person's determinism / noise settings survive a restart
// Original V17 decisions remain unchanged; this observes TRAINING results only.
const shared = new SharedExperience({capacity: 384, seed: brain.seed});
// An independent, versioned memory of the original V17 body's ACTUAL observed action effects.
// A new research sidecar; existing .v8 Brain saves and other agents are not rewritten.
const bodyMapFile=saveFile?saveFile+".body-perspective.json":null;
let bodyPerspective=new BodyPerspectiveMemory();
if(resume&&bodyMapFile&&fs.existsSync(bodyMapFile)){
  try{bodyPerspective=BodyPerspectiveMemory.restore(JSON.parse(fs.readFileSync(bodyMapFile,"utf8")));}
  catch(err){parentPort.postMessage({type:"note",w:workerData.gw,text:"body perspective sidecar not restored: "+err.message});}
}
const saveBodyPerspective=()=>{
  if(!bodyMapFile)return;
  fs.mkdirSync(path.dirname(bodyMapFile),{recursive:true});
  const tmp=bodyMapFile+".tmp";
  fs.writeFileSync(tmp,JSON.stringify(bodyPerspective.export()));
  fs.renameSync(tmp,bodyMapFile);
};
const traceFile = workerData.traceTransformations && saveFile ? saveFile + ".transitions.jsonl" : null;
let traced = 0;
let traceBytes = traceFile && fs.existsSync(traceFile) ? fs.statSync(traceFile).size : 0;
// Explicit opt-in: record only real TRAINING observations, no oracle or held-out
// reference, with a bounded file size and a group ID for episode-disjoint tests.
brain.setSharedObserver(sample => {
  const item = shared.observe(sample);
  if(item.domain==="maze")bodyPerspective.observe(item,brain.disc?.self?.()??-1);
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
// V18 independent experienced-world memory. The unchanged V17 .v8 Brain and
// prior language sidecar remain byte-compatible and usable by other agents.
const languageMazeFile = saveFile ? saveFile + ".language-maze.v18.json" : null;
let languageMaze = new LanguageMazeMemory();
if(resume&&languageMazeFile&&fs.existsSync(languageMazeFile)){
  try{languageMaze=LanguageMazeMemory.restore(JSON.parse(fs.readFileSync(languageMazeFile,"utf8")));}
  catch(err){parentPort.postMessage({type:"note",w:workerData.gw,text:"V18 language-world restore failed: "+err.message});}
}
const saveLanguageMaze=()=>{
  if(!languageMazeFile)return;
  fs.mkdirSync(path.dirname(languageMazeFile),{recursive:true});
  fs.writeFileSync(languageMazeFile+".tmp",JSON.stringify(languageMaze.export()));
  fs.renameSync(languageMazeFile+".tmp",languageMazeFile);
};
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
// Live hypermaze is opt-in from an open UI and samples only REAL completed
// training rows. Bounded events; no model/original CUDA/maze law changed.
let hypermazeLiveUntil=0,lastHypermazeAt=0,hypermazeEvent=0;
const shouldObserveHypermaze = row =>
  Date.now()<hypermazeLiveUntil && Date.now()-lastHypermazeAt>=1750 &&
  typeof row?.prompt==="string" && typeof row?.answer==="string" &&
  row.prompt.trim() && row.answer.trim();
function beforeHypermazeRow(row){
 if(!shouldObserveHypermaze(row))return null;
 lastHypermazeAt=Date.now();
 try{
  // The Q/A world has NOT observed this training row yet. Its existing
  // prediction is genuinely prior to the new language-world update.
  const prev=languageMaze.plan(row.prompt,{mode:"original",maxReplay:384});
  return {before:prev.abstained?null:prev.output,
    abstained:!!prev.abstained,candidates:prev.candidates??0,
    seenQABefore:languageMaze.stats().rowsObserved,
    charsBefore:brain.chars};
 }catch(err){return {before:null,abstained:true,error:err.message,
    seenQABefore:languageMaze.stats().rowsObserved,charsBefore:brain.chars};}
}
function afterHypermazeRow(row,prior,where){
 if(!prior)return;
 try{
  const after=languageMaze.plan(row.prompt,{mode:"hybrid",maxReplay:1024,
    observeReplans:false});
  parentPort.postMessage({
    type:"hypermaze-live",w:workerData.gw,kind:"TRAINING_QA_COMMITTED",
    event:++hypermazeEvent,at:Date.now(),where,
    brainChars:brain.chars,sourceRows:brain.sourceRows,
    phase:stageTimes?.phase??"training",trainingMemory:languageMaze.stats(),
    prompt:row.prompt.slice(0,1200),
    observedAnswer:String(row.answer).slice(0,1024),
    fullAnswerChars:[...String(row.answer)].length,
    answerPreviewTruncated:[...String(row.answer)].length>1024,
    before:prior,after,
    provenance:"Real completed Q/A row. BEFORE=previous memory before this row; AFTER=updated learned world. Observed characters are training targets, not autonomous agent actions."
  });
 }catch(err){parentPort.postMessage({type:"hypermaze-live",w:workerData.gw,
    kind:"TRAINING_QA_ERROR",event:++hypermazeEvent,at:Date.now(),
    brainChars:brain.chars,error:err.message});}
}
const absorbText = (row,{languageAlreadyObserved=false}={}) => {
  if (typeof row?.prompt !== "string" || typeof row?.answer !== "string" || !row.prompt.trim() || !row.answer.trim()) return;
  // Complete original Q/A row committed to the training stream. In CUDA
  // batches, the new learner has already observed EVERY completed row below.
  const hypermazePrior=!languageAlreadyObserved?beforeHypermazeRow(row):null;
  if(!languageAlreadyObserved){
    observeCompletedTrainingRows([row],languageMaze);
    afterHypermazeRow(row,hypermazePrior,"CPU_OR_COMMITTED_LONG_CUDA_ROW");
  }
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
    shared: shared.status(), bodyPerspective: bodyPerspective.summary(), languageMaze:languageMaze.stats(), form: brain.chain.A[0].wires.length ? brain.chain.A[0].form().split(", ").slice(0, 4).join(", ") : "", cActive: brain.e.c.active, cLag: brain.e.c.maxLag, cFlips: brain.e.c.promotions};
  if (saveFile) { try { msg.savedMB = brain.save(saveFile) / 1e6; saveText(); saveBodyPerspective(); saveLanguageMaze(); } catch (err) { msg.saveError = err.message; } }
  parentPort.postMessage(msg);
};
const shot = (force) => { const now=performance.now(); if (lastShot && now-lastShot<(force?650:3000)) return; lastShot=now; try { brain.organismView(); } catch {}
  parentPort.postMessage({type: "graph", w: workerData.gw, arm: arm.name, chars: brain.chars, lived: brain.lived, controls: brain.controls, shared: shared.status(), bodyPerspective: bodyPerspective.summary(), languageMaze:languageMaze.stats(), selfModel: brain.align ? brain.align.selfModel() : null, accAlign: brain.align ? brain.align.accuracy() : null, exercises: brain.exercises || 0, form: brain.chain.A[0].form(),
    maze: MAZE ? mazeStats() : null, transform: TRANS ? transStats() : null, gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null, ...brain.trace.snapshot(shots++ % 5 === 0)}); };
let stop = false, paused = !!workerData.paused, saveNow = false, fatalTrainingError = false;
// many worlds at once on the GPU (gpu/worlds_gpu.py) for this brain, with the settings chosen on the page or the command line
let gpuSet = workerData.gpu && workerData.gpu.device && workerData.gpu.device !== "off" ? workerData.gpu : null, gpu = null, gpuInfo = null, gpuError = null, sharedLoaded = false, gpuResetPending = false;
const gpuOn = async () => {
  // Never kill a Python process while a CUDA batch is in flight. Apply changes at the next batch boundary.
  if (gpuResetPending) { gpu?.close(); gpu = null; sharedLoaded = false; gpuResetPending = false; }
  if (!gpuSet) return null;
  if (!gpu || gpu.dead) { gpu = new GpuWorlds(gpuSet); sharedLoaded = false; changePhase("GPU: pornește "+gpu.py); shot(true);
    try { gpuInfo = await gpu.ready; gpuError = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ready: " + JSON.stringify(gpuInfo)}); }
    catch (err) { gpuError = err.message; gpu = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } changePhase("GPU: ready"); } return gpu; };
let batchNow = null;                                                       // current real GPU phase
// Lightweight observability while awaiting a long GPU call. No graph reconstruction,
// no checkpoint write, no fabricated progress. It also keeps running while PyTorch
// performs work and the Node worker awaits its response.
const stageTimes = {phase:'initializing',started:performance.now(),totalsMs:{},changes:0};
const changePhase=(phase,done=0,total=0)=>{
  const name=String(phase||'idle'),now=performance.now();
  if(name!==stageTimes.phase){
    const prior=stageTimes.phase;
    stageTimes.totalsMs[prior]=(stageTimes.totalsMs[prior]||0)+(now-stageTimes.started);
    stageTimes.phase=name;stageTimes.started=now;stageTimes.changes++;
  }
  batchNow={phase:name,done:Number.isFinite(done)?done:0,total:Number.isFinite(total)?total:0};
};
const phaseStats=()=>{
  const now=performance.now(),totals={...stageTimes.totalsMs};
  totals[stageTimes.phase]=(totals[stageTimes.phase]||0)+(now-stageTimes.started);
  return {phase:batchNow?.phase||stageTimes.phase,done:batchNow?.done||0,total:batchNow?.total||0,
    phaseElapsedMs:Math.round(now-stageTimes.started),totalsMs:totals,changes:stageTimes.changes};
};
const emitTelemetry=()=>{
  const now=performance.now();
  parentPort.postMessage({type:'telemetry',w:workerData.gw,observedAt:Date.now(),
    chars:brain.chars,exercises:brain.exercises||0,lived:brain.lived,mazePlayed:brain.mazes.played,
    transformPlayed:brain.trans?.played||0,bodyTransitions:bodyPerspective.observed,
    sharedObserved:shared.total,sharedUpdates:shared.training?.step||0,sharedError:shared.error||null,
    languageMaze:languageMaze.stats(),
    heapMB:Math.round(process.memoryUsage().heapUsed/1048576),
    textCharsPerSecond:+((brain.chars-c0)/Math.max(1,(now-t0)/1000)).toFixed(2),
    gpuDevice:gpuInfo?.device||gpuSet?.device||'off',gpuError:gpuError||null,
    phase:phaseStats(),paused,stop,savePending:saveNow,
    sourceRows:brain.sourceRows||0,sourceOffset:brain.sourceOffset||0,
    sourceWindow:activeSourceWindow?{...activeSourceWindow,completed:brain.sourceOffset||0}:null,
    gpuTextWindowLimit:GPU_MAX_WINDOW});
};
const heartbeat=setInterval(emitTelemetry,1000);
heartbeat.unref();
emitTelemetry();
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
    changePhase("CUDA: shared_train",0,samples.length);
    const result = await G.call({cmd: "shared_train", samples, checkpoint: sharedFile, seed: brain.seed, adaptiveNoise: true});
    changePhase("CUDA: shared_train done",samples.length,samples.length);
    shared.training = result; shared.error = null;
  } catch (err) {
    shared.requeue(samples); shared.error = "Shared model: " + err.message;
    parentPort.postMessage({type: "note", w: workerData.gw, text: shared.error});
  }
};
const tick = async (phase, done, total) => { changePhase(phase,done,total); shot(); if (paused || saveNow) await hold(); await new Promise(r => setImmediate(r)); };
const worldsOnce = async (record) => {                                     // one round of the worlds: one each on the CPU, or a batch of N on the GPU
  const G = await gpuOn();
  if (G) { try { if (MAZE) {changePhase("CUDA: maze worlds",0,gpuSet.worlds); await brain.learnMazesGPU(G, gpuSet.worlds, tick);} if (TRANS) {changePhase("CUDA: transform worlds",0,gpuSet.worlds); await brain.playTransformsGPU(G, gpuSet.worlds, tick);} await flushShared(); changePhase("CUDA: world batch complete"); batchNow = null; return; } catch (err) { gpuError = err.message; batchNow = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } }
  if (gpuSet) { shot(true); return; }                                      // the card was asked for and does not work: the error is on the page, no CPU fallback
  if (MAZE) brain.playMaze(record || brain.mazes.played % 10 === 0); if (TRANS) { brain.tWorld(); brain.playTransform(record || brain.trans.played % 5 === 0); } await flushShared(); };

const selectedTextBatch = () => Math.max(1, Math.min(128, Math.trunc(Number(gpuSet?.textBatch) || gpuInfo?.autoText || 2)));
const processGpuText = async (exs, meta) => {
  const total = exs.reduce((sum, e) => sum + Math.max(0, e.length - 1), 0);
  changePhase("text CUDA: aliniere",0,total); shot(true);
  await brain.learnTextGPU(gpu, exs, progress => {
    changePhase("text CUDA: "+progress.phase,progress.done,progress.total);
    shot();
  });
  changePhase("text: integrare în graful V17",0,exs[0]?.length||0); shot(true);
  // CPU receives the same REAL observed symbols in their original order.
  // Yield every 256 characters so pause/telemetry/UI can run while the old organs
  // integrate the GPU-trained sample. No character is dropped or fabricated.
  if(exs.length){
    const sample=exs[0];
    for(let i=0;i<sample.length;i++){
      brain.live(sample[i],brain.lived%50===0,{old:true});
      if((i+1)%256===0){
        changePhase("text: integrare în graful V17",i+1,sample.length);
        await new Promise(r=>setImmediate(r));
      }
    }
    changePhase("text: integrare în graful V17",sample.length,sample.length);
  }
  // The original causal-text tools intentionally sample a limited number
  // of rows per GPU batch. The NEW language-world / successor training must
  // not inherit that subsampling: every real, completed Q/A observation is
  // consumed exactly once in its original order, without altering the
  // existing causal tool's behavior or the original V17 CUDA alignment.
  // Do not subsample learning or change original GPU text CUDA processing.
  // Only a subscribed UI gets a bounded real Q/A path snapshot on commit.
  if(Date.now()<hypermazeLiveUntil){
    for(const row of meta){
      const prior=beforeHypermazeRow(row);
      observeCompletedTrainingRows([row],languageMaze);
      afterHypermazeRow(row,prior,"CUDA_BATCH_COMMITTED");
    }
  }else observeCompletedTrainingRows(meta,languageMaze);
  for(let j=0;j<meta.length;j+=Math.max(1,Math.floor(meta.length/8)))
    absorbText(meta[j],{languageAlreadyObserved:true});
  changePhase("CUDA: model comun de transformări",0,shared.queue.length);
  await flushShared();
  if ((MAZE || TRANS) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); }
  changePhase("GPU batch finished"); batchNow = null;
  emitTelemetry();
  // Only the CALLER commits the durable dataset-row cursor. In particular,
  // never save an intermediate GPU model under an older row cursor.
  // Heavy frozen tests/checkpointing happen AFTER a fully committed text window.
  shot(true);
};
let lastCommitReportChars=brain.chars||0, reportedFirst=!!brain.chars;
function reportAfterCommit(){
  if(!reportedFirst || Math.floor(brain.chars/every)>Math.floor(lastCommitReportChars/every)){
    changePhase("CPU: frozen V17 evaluation + checkpoint");emitTelemetry();
    report();changePhase("CPU: evaluation complete");
    lastCommitReportChars=brain.chars;reportedFirst=true;
  }
}
parentPort.on("message", m => { if(m&&m.hypermazeLive===true){hypermazeLiveUntil=Date.now()+8500;return;} if (m && m.controls) { const C = brain.setControls(m.controls); parentPort.postMessage({type: "note", w: workerData.gw, text: "controls " + JSON.stringify(C)}); shot(true); return; }
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
  // Read-only statistics and a genuinely OBSERVED prompt to view the
  // actual learned graph immediately. This is TRAINING evidence, NEVER a
  // hidden/held-out answer or a claimed successful unseen prediction.
  if(m&&m.successorObservedStatus){
    const {id}=m.successorObservedStatus;
    const eligible=languageMaze.records;
    const recent=[...eligible].reverse();
    const picked=recent.find(r=>r.prompt?.length<=2000&&r.answer?.length>0&&r.answer.length<=384)
      ||recent.find(r=>r.prompt?.length<=2000&&r.answer?.length>0&&r.answer.length<=4000);
    parentPort.postMessage({type:"chat",id,kind:"successor-observed-status",
      protocol:"OBSERVED_TRAINING_TEXT_WORLD",available:eligible.length>0,
      trainingMemory:languageMaze.stats(),
      observedPrompt:picked?.prompt||null,
      observedAnswerLength:picked?.characters??null,
      source:"previously_observed_training_question_not_unseen_test"});
    return;
  }
  // Two views of one exact in-memory training-world snapshot, serialized by
  // this worker event loop. No reference answer and no training during either
  // plan(). The original policy is computed before the optional successor.
  if(m&&m.successorPairExam){
    const {id,prompt}=m.successorPairExam;
    try{
      const original=languageMaze.plan(prompt,{maxReplay:4096,mode:"original"});
      const hybrid=languageMaze.plan(prompt,{maxReplay:4096,mode:"hybrid",observeReplans:true});
      parentPort.postMessage({type:"chat",id,kind:"successor-pair",
        protocol:"FROZEN_SAME_EXPERIENCED_TEXT_WORLD",
        original,hybrid,trainingMemory:languageMaze.stats(),
        sameWorkerSnapshot:true,referenceEnteredPlanner:false,
        explanation:"Two read-only plans on the same real worker, no training or held-out answer within planning."});
    }catch(err){parentPort.postMessage({type:"chat",id,kind:"successor-pair",error:err.message});}
    return;
  }
  if(m&&m.languageMazeExam){
    const {id,prompt,mode="hybrid"}=m.languageMazeExam;
    try{
      // The unseen reference is never accepted by this protocol.
      const r=languageMaze.plan(prompt,{maxReplay:256,mode});
      parentPort.postMessage({type:"chat",id,kind:"language-maze",...r,
        trainingMemory:languageMaze.stats(),backend:"original V17 worker, experienced Q/A only"});
    }catch(err){parentPort.postMessage({type:"chat",id,kind:"language-maze",error:err.message});}
    return;
  }
  if (m && m.exam) { let r; try { r = brain.examMazes(m.exam.sizes, m.exam.per); } catch (err) { r = {error: err.message}; } parentPort.postMessage({type: "chat", id: m.exam.id, ...r}); return; }
  if (m && m.chat) { let r; try { r = brain.chat(m.chat.history, m.chat.opts || {}); } catch (err) { r = {error: err.message}; } parentPort.postMessage({type: "chat", id: m.chat.id, ...r}); if (m.chat.opts?.learn) shot(true); return; }
  if (m && m.gpu) { gpuSet = m.gpu.device === "off" ? null : {...(gpuSet || {}), ...m.gpu}; gpuResetPending = true; gpuError = null; return; }
  if (m === "stop") stop = true; else if (m === "pause") paused = true; else if (m === "resume") paused = false; else if (m === "save") saveNow = true; });
const hold = async () => { while (paused && !stop) { if (saveNow) doSave(); await new Promise(r => setTimeout(r, 150)); } if (saveNow) doSave(); };
const doSave = () => { saveNow = false; if (saveFile) try { parentPort.postMessage({type: "saved", w: workerData.gw, MB: (saveText(), saveBodyPerspective(), saveLanguageMaze(), brain.save(saveFile) / 1e6)}); } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "save failed: " + err.message}); } };
let k = 0, textBatch = [], textMeta = [];
const finishBatch=async()=>{
  if(!textBatch.length)return;
  const n=textMeta.length;
  await processGpuText(textBatch,textMeta);
  brain.sourceRows+=n;
  brain.sourceOffset=0;
  brain.exercises=brain.sourceRows;
  textBatch=[];textMeta=[];
  emitTelemetry();reportAfterCommit();
};
shot(true); await hold();
for await (const ex of stream()) {
  await hold();
  if (TEXT && k++ < skip) continue;                                         // a resumed brain does not live the same exercises twice
  // the card is there: text is lived on the card in batches (gpu/text_gpu.py); the brain adds the totals, and one
  // exercise of each batch is also lived here by the older organs (so they and the drawn graph stay alive)
  // Explicit CUDA errors stop the worker: NEVER silently continue on CPU or discard an unseen batch.
  if (TEXT && gpuSet) {
    if(gpuError||!(await gpuOn())){
      parentPort.postMessage({type:"fatal",w:workerData.gw,text:"CUDA unavailable: "+(gpuError||"backend did not initialize")});
      stop=true;fatalTrainingError=true;break;
    }
    try {
      // Very long OpenThoughts answers can exceed 100,000 symbols. Training the entire
      // answer as ONE GPU call held brain.chars=0 for minutes and made Save unresponsive.
      // Work on bounded, ordered windows; each real symbol is processed once.
      if(ex.bytes.length>GPU_MAX_WINDOW||brain.sourceOffset>0){
        await finishBatch(); // previous short rows must commit first
        const rowHash=createHash("sha256").update(Buffer.from(ex.bytes)).digest("hex");
        if(brain.sourceOffset>0&&
           (brain.sourceRowLength!==ex.bytes.length||brain.sourceRowFingerprint!==rowHash))
          throw Error("Resumed Parquet row differs from saved partial-row fingerprint; stopping to protect the brain.");
        brain.sourceRowLength=ex.bytes.length;brain.sourceRowFingerprint=rowHash;
        const windows=gpuTextWindows(ex.bytes,{maxChars:GPU_MAX_WINDOW,offset:brain.sourceOffset});
        activeSourceWindow={datasetRow:k-1,originalLength:ex.bytes.length,windows:windows.length,
          firstOffset:brain.sourceOffset,index:0};
        let finished=true;
        for(let wi=0;wi<windows.length;wi++){
          if(stop||brain.chars>=maxChars){finished=false;break;}
          const part=windows[wi];
          activeSourceWindow.index=wi+1;
          changePhase("CUDA: text original row "+(k-1)+" · window "+(wi+1)+"/"+windows.length,0,part.bytes.length);
          emitTelemetry();
          // No substring is dropped. The bounded CUDA window shares learned trust
          // and rolling full-CPU alignment memory with the previous window.
          await processGpuText([part.bytes],[]);
          applyCompletedWindow(brain,{rowChars:ex.bytes.length,from:part.from,to:part.to});
          emitTelemetry();reportAfterCommit();
          await hold(); // Save/Pause can now complete at a safe, committed window boundary.
          if(stop){finished=false;break;}
        }
        if(finished&&brain.sourceOffset===0){
          absorbText(ex); // learn causal text tools ONCE for the ORIGINAL Q/A row
          await flushShared();
        }
        activeSourceWindow=null;
        if(!finished||stop)break;
      }else{
        textBatch.push(ex.bytes);textMeta.push(ex);
        if(textBatch.length>=selectedTextBatch()||
           textBatch.reduce((n,b)=>n+b.length,0)>=GPU_MAX_WINDOW){
          await finishBatch();
        }
      }
    }catch(err){
      gpuError=String(err.stack||err.message||err);
      changePhase("CUDA error: "+err.message);
      parentPort.postMessage({type:"fatal",w:workerData.gw,text:"GPU text window failed without CPU fallback: "+err.message});
      stop=true;fatalTrainingError=true;break;
    }
    if(brain.chars>=maxChars||stop)break;
    await new Promise(r=>setImmediate(r));
    continue;
  }
  // Explicitly switching to CPU drains any pending exercises rather than dropping them.
  if (TEXT && textBatch.length) {
    for(let j=0;j<textBatch.length;j++){
      brain.beginExercise();
      for(const y of textBatch[j]){brain.live(y,brain.chars%50===0);brain.chars++;}
      brain.sourceRows++;brain.exercises=brain.sourceRows;absorbText(textMeta[j]);
    }
    textBatch = []; textMeta = []; shot(true);
  }
  if(TEXT)brain.beginExercise();
  // Switching CUDA off during a partially committed long row must resume at the
  // exact original byte offset, not re-train its completed windows.
  const cpuStart=TEXT?(brain.sourceOffset||0):0;
  for(let j=cpuStart;j<ex.bytes.length;j++){
    const y=ex.bytes[j];
    brain.live(y,brain.chars%50===0);brain.chars++;
    if(TEXT)brain.sourceOffset=j+1;
    if(brain.chars%2000===0)shot();
    if ((MAZE || TRANS) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); shot(); }
    if (brain.chars >= nextTest) { nextTest += every; if (process.memoryUsage().heapUsed / 1e9 > memGB && !brain.full) { brain.full = true; parentPort.postMessage({type: "note", w: workerData.gw, text: "memory budget reached: nothing is deleted; the old graph stops growing, the aligning graph keeps everything"}); } changePhase("CPU: frozen V17 evaluation + checkpoint"); emitTelemetry(); report(); changePhase("CPU: evaluation complete"); }
    if (brain.chars >= maxChars || stop) break;
    if (paused || saveNow) { shot(true); await hold(); }
  }
  if(TEXT&&brain.sourceOffset===ex.bytes.length){
    brain.sourceRows++;brain.sourceOffset=0;brain.exercises=brain.sourceRows;
    brain.sourceRowFingerprint=null;brain.sourceRowLength=0;
  }
  if(TEXT&&!stop&&brain.chars<maxChars&&brain.sourceOffset===0){absorbText(ex);await flushShared();}

  if (!TEXT) { brain.episodes = (brain.episodes || 0) + 1;
    await worldsOnce(false);
    shot(); if (brain.episodes % (gpu ? 5 : 50) === 0) report(); if (stop) break; }
  if (brain.chars >= maxChars || stop) break;
  await new Promise(r => setImmediate(r));                                   // let the stop message in
}
// The last few normal Q/A rows are still committed in original source order.
if(TEXT&&gpuSet&&!stop&&textBatch.length){
  try{const G=await gpuOn();if(!G)throw Error(gpuError||"CUDA unavailable");await finishBatch();}
  catch(err){gpuError=err.message;changePhase("CUDA error: "+err.message);
    parentPort.postMessage({type:"fatal",w:workerData.gw,text:"Final GPU text batch failed: "+err.message});stop=true;fatalTrainingError=true;}
}
changePhase(fatalTrainingError?"stopped after GPU error":stop?"stopped":"completed");emitTelemetry();
clearInterval(heartbeat);
// If a GPU batch has already updated trust but failed before its source cursor
// was committed, writing that partially processed state would cause duplicate
// learning on restart. Keep the last previously committed checkpoint instead.
if(!fatalTrainingError)report(stop?false:true);
else parentPort.postMessage({type:"note",w:workerData.gw,text:
  "GPU error: checkpoint NOT overwritten; restart will resume at the last previously saved confirmed CUDA window."});
if (gpu) gpu.close();
parentPort.close();

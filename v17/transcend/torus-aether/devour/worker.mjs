// One devouring brain. It lives through its own share of the world exactly once (no repetition) and, if the maps are
// among its worlds, plays a map between pieces of text — the same graph lives both. Every `every` characters it is
// tested, frozen, on the same unseen text as all the other brains, and it is saved whole (resume continues from there).
// When its memory passes the budget, what happened only once dissolves (solve).
import {parentPort, workerData} from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";
import {openTextDataset} from "../data/text-dataset.mjs";
import {Brain} from "./brain.mjs";
import {LiveHyperMaze,parseHeldoutText} from "./live-hypermaze.mjs";
import {NativeTextPathAtlas} from "../worlds/native-text-path-atlas.mjs";
import {CompleteXDWorld} from "../worlds/full-xd-maze-atlas.mjs";
import {once} from "node:events";
import {GpuWorlds} from "../gpu/client.mjs";
import {SharedExperience} from "../shared/experience.mjs";
import {NativeSelfCodeWorld} from "./selfcode-native.mjs";
import {TextActionPaths} from "../../../../isolated/noise-space/text_action_paths.mjs";
import {CausalTextAgent} from "../../../../isolated/noise-space/causal_text_world.mjs";

const {w, n, source, arm, every, maxChars, memGB, evalText, worlds = ["text"], mazeEvery = 4000, checkpointEvery = 0, xdAtlasEvery = 0, saveFile, resume} = workerData;
const ascii = s => { const out = []; for (const ch of s) { const c = ch.charCodeAt(0); if (c === 13) continue; out.push(c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63); } return out; };
const TEXT = worlds.includes("text"), MAZE = worlds.includes("maze"), TRANS = worlds.includes("transform"), SELF_CODE = worlds.includes("selfcode");
// A real text corpus may be Q/A pairs OR free prose. Both contain observed
// state transitions: explicit question->answer, or earlier->later sentence.
// Never synthesize a desired answer, and never use held-out paragraphs here.
const splitObservedText = source => {
  const t=String(source||"").trim();
  const a=/(?:^|\n)\s*(?:A|Assistant)\s*:\s*/im.exec(t);
  if(a){
    const prompt=t.slice(0,a.index).replace(/^\s*(?:Q|User)\s*:\s*/im,"").trim();
    const answer=t.slice(a.index+a[0].length).trim();
    if(prompt.length>=5&&answer.length>=5)return {prompt,answer,provenance:"observed-QA"};
  }
  const sentences=(t.match(/[^.!?\n]+(?:[.!?]+|$)/gu)||[])
    .map(x=>x.trim()).filter(x=>x.length>=15);
  if(sentences.length>=2)return {prompt:sentences[0],answer:sentences.slice(1,4).join(" "),
    provenance:"observed-consecutive-sentences"};
  if(t.length>=120){
    const cut=Math.min(350,Math.max(40,Math.floor(t.length/3)));
    return {prompt:t.slice(0,cut),answer:t.slice(cut,Math.min(t.length,cut+1000)),
      provenance:"observed-contiguous-span"};
  }
  return null;
};

async function* stream() {                                                 // this brain's share of the world, once
  if (!TEXT) { for (;;) yield {k: -1, bytes: []}; }
  if (source.kind === "parquet") {
    const ds = await openTextDataset(source.root);
    const assigned = w < ds.trainRows ? Math.ceil((ds.trainRows-w)/n) : 0;
    parentPort.postMessage({type:"dataset",w:workerData.gw,
      totalTrainingRows:ds.trainRows,assignedTrainingRows:assigned,
      heldOutRows:ds.held,sourceParquetFiles:ds.files.length,
      sourceKind:"OpenThoughts Parquet",
      source:"metadata only, not counted as consumed exercises"});
    for (let k = w; k < ds.trainRows; k += n) { const x = await ds.exercise(k); yield {k, bytes: ascii("Q: " + x.prompt + "\nA: " + x.answer + "\n\n"), prompt: x.prompt, answer: x.answer}; }
  } else {
    let k = 0; for (const f of source.files) for (const para of fs.readFileSync(f, "utf8").split(/\n\s*\n/)) {
      if (!para.trim()) continue;  // 4-word sentences are valid structural training observations
      if (k++ % n === w && !source.heldSet.includes(k)) {
        const observed = splitObservedText(para);
        yield {k, bytes: ascii(para + "\n\n"), ...observed};
      } }
  }
}

let brain = null, skip = 0;
if (resume && saveFile && fs.existsSync(saveFile)) { try { brain = Brain.load(saveFile); skip = brain.exercises || 0; } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "could not resume: " + err.message}); } }
if (!brain) brain = new Brain({rules: arm.rules, c: arm.c || {}, seed: 11 + w});
if (workerData.endogenousNoise) brain.enableEndogenousNoise(); // policy is saved with the original Brain
if (workerData.controls) brain.setControls(workerData.controls);         // the person's determinism / noise settings survive a restart
// Bounded additional text-transition learner on real, never repeated V17 rows.
// The original Brain, CUDA model and existing UI remain authoritative.
const hyperFile=saveFile?saveFile+".hypermaze.json":null;
let hyperMaze=new LiveHyperMaze({maxContexts:5000,maxAnswerTokens:2048,previewSteps:24});
if(resume&&hyperFile&&fs.existsSync(hyperFile)){
 try{hyperMaze=LiveHyperMaze.restore(JSON.parse(fs.readFileSync(hyperFile,"utf8")));}
 catch(err){parentPort.postMessage({type:"note",w:workerData.gw,
  text:"Hypermaze checkpoint not loaded: "+err.message});}
}
const absorbHyperMaze=row=>{
 if(!TEXT||!Array.isArray(row?.bytes)||!row.bytes.length)return;
 const observed=typeof row.prompt==="string"&&typeof row.answer==="string"&&
   row.prompt.trim()&&row.answer.trim()?
   {prompt:row.prompt,answer:row.answer,source:"qa"}:
   splitObservedText(Buffer.from(row.bytes).toString("latin1"));
 if(!observed?.prompt||!observed?.answer)return;
 hyperMaze.learn(observed.prompt,observed.answer,
   {episode:row.k,source:observed.source||"prose"});
};
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
// This code universe uses the SAME Brain, native graph and observed shared
// transitions; all risky edits run in an isolated evaluator, never in V17.
const selfcode = SELF_CODE ? new NativeSelfCodeWorld({brain,saveFile,seed:brain.seed}) : null;
if(workerData.paused)selfcode?.pause();
const sharedFile = saveFile ? saveFile + ".shared.pt" : null;
const textFile = saveFile ? saveFile + ".causal.json" : null;
const nativeAtlasFile=saveFile?saveFile+".native-paths.json":null;
const nativeAtlasLogFile=saveFile?saveFile+".path-atlas.jsonl":null;
let nativeAtlas=new NativeTextPathAtlas({maxFrames:160,maxLast:12});
if(resume&&nativeAtlasFile&&fs.existsSync(nativeAtlasFile)){
  try{
    const saved=JSON.parse(fs.readFileSync(nativeAtlasFile,"utf8"));
    if(saved.version!==1)throw Error("Unsupported atlas version");
    nativeAtlas=Object.assign(new NativeTextPathAtlas(),saved);
  }catch(err){parentPort.postMessage({type:"note",w:workerData.gw,
    text:"Native text-path atlas not loaded: "+err.message});}
}
// Append only REAL seen training episodes. Native six-scale graph lives in
// the original Brain checkpoint; all its current nodes and edges can be read
// in /atlas-graph pages independently of these causal search journals.
if(nativeAtlasLogFile)fs.mkdirSync(path.dirname(nativeAtlasLogFile),{recursive:true});
const nativeAtlasLog=nativeAtlasLogFile?fs.createWriteStream(nativeAtlasLogFile,
  {flags:"a",highWaterMark:1<<20}):null;
const xdAtlasLogFile=saveFile?saveFile+".xd-atlas.jsonl":null;
const xdAtlasLog=xdAtlasLogFile?fs.createWriteStream(xdAtlasLogFile,
  {flags:"a",highWaterMark:1<<20}):null;
const atlasFlush=async()=>{
  if(nativeAtlasLog?.writableNeedDrain)await once(nativeAtlasLog,"drain");
  if(xdAtlasLog?.writableNeedDrain)await once(xdAtlasLog,"drain");
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
  if(hyperFile){
    fs.writeFileSync(hyperFile+".tmp",JSON.stringify(hyperMaze.export()));
    fs.renameSync(hyperFile+".tmp",hyperFile);
  }
  if(nativeAtlasFile){
    fs.writeFileSync(nativeAtlasFile+".tmp",JSON.stringify(nativeAtlas));
    fs.renameSync(nativeAtlasFile+".tmp",nativeAtlasFile);
  }
};
// The very same corpus, already lived by the original AligningGraph, is also
// learned at token/phrase/sentence scales within the SAME Brain and checkpoint.
const absorbLanguage = row => {
  if(!TEXT || !Array.isArray(row?.bytes) || !row.bytes.length)return;
  brain.liveLanguage(Buffer.from(row.bytes).toString('latin1'));
};
const observedPipeline={called:0,accepted:0,unreadable:0,last: null};
// Actual production 6-scale text path learner, captured BEFORE the
// current row's observed answer is absorbed into the same native Brain.
let textMazeLive={ready:false,reason:"waiting-for-observed-text",epoch:0,
  source:"original-six-scale-text-learner"};
let textMazeSeen=0;
const previewCurrentLanguageWorld=row=>{
  if(!TEXT||!Array.isArray(row?.bytes)||!row.bytes.length)return;
  textMazeSeen++;
  if(textMazeSeen>4&&textMazeSeen%8!==0)return;
  const actual=Buffer.from(row.bytes).toString("latin1");
  const prompt=(typeof row.prompt==="string"&&row.prompt.trim()?
    row.prompt:actual.slice(0,160)).trim();
  if(!prompt)return;
  try{
    const before=brain.constructedPaths.textRows;
    const episode=brain.constructedPaths.traceLiveTextMaze(prompt,{maxChars:24});
    if(before!==brain.constructedPaths.textRows)
      throw Error("Preview unexpectedly trained from the current answer");
    textMazeLive={...episode,epoch:textMazeSeen,atChars:brain.chars,
      mode:row.prompt?"observed-QA":"observed-text-prefix",
      source:"original-six-scale-text-learner",
      observedTrainingAnswerUsed:false};
  }catch(err){
    textMazeLive={ready:false,reason:"error: "+err.message,epoch:textMazeSeen,
      atChars:brain.chars,source:"original-six-scale-text-learner"};
  }
};
const absorbObservedDifferences = row => {
  observedPipeline.called++;
  if(!TEXT||!Array.isArray(row?.bytes)||!row.bytes.length){
    observedPipeline.unreadable++;
    return;
  }
  // In plain text worlds, no fictitious answer is invented: use the
  // prefix genuinely observed before learning transformations from this row.
  if(!row.prompt)previewCurrentLanguageWorld(row);
  // Exactly the text already lived by AligningGraph, including short
  // unlabeled sentences; do not invent teacher classes or complete goals.
  const learned=brain.learnObservedTransformations(Buffer.from(row.bytes).toString("latin1"));
  observedPipeline.accepted+=learned.newSentences;
  observedPipeline.last=learned;
};
const absorbConstructed = row => {
  if (typeof row?.prompt !== 'string' || typeof row?.answer !== 'string' ||
      !row.prompt.trim() || !row.answer.trim()) return;
  previewCurrentLanguageWorld(row);
  // Prediction FIRST, from the REAL six-scale native Brain, with no answer
  // available. Only after this is frozen do we diagnose with the actual
  // observed answer. The native graph is trained LAST, preventing leakage.
  const before=nativeAtlas.before(brain.constructedPaths,row.prompt,
    {episode:row.k,observed:brain.observedTransformations,maxOutput:48});
  const judged=nativeAtlas.after(brain.constructedPaths,before,row.answer,
    {observed:brain.observedTransformations,maxAnalyze:512});
  if(nativeAtlasLog)nativeAtlasLog.write(JSON.stringify(judged)+"\n");
  brain.learnConstructedText(row.prompt,row.answer);
};
const absorbText = row => {
  if (typeof row?.prompt !== "string" || typeof row?.answer !== "string" || !row.prompt.trim() || !row.answer.trim()) return;
  textPaths.learn(row.prompt, row.answer);
  causalText.train(row.prompt, row.answer, textPaths,
    {maxActions: 12, seed: ((row.k || 0) + brain.seed) >>> 0, emit: event => shared.observeText(event, row.prompt)});
};
const H = Array.from(evalText, ch => { const c = ch.charCodeAt(0); return c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63; });
let lastShot = 0, shots = 0, dissolved = 0, nextTest = (brain.chars || 0) + every, nextMaze = (brain.chars || 0) + 1; const t0 = performance.now(), c0 = brain.chars || 0;
let nextAutoSave=checkpointEvery>0?(brain.chars||0)+checkpointEvery:Infinity;
let nextXd=xdAtlasEvery>0?(brain.chars||0)+xdAtlasEvery:Infinity;
const autonomousCheckpoint = () => {
  if(!saveFile||!Number.isFinite(nextAutoSave)||brain.chars<nextAutoSave)return false;
  setWorkerPhase("CPU: checkpoint without frozen unseen evaluation");
  doSave(); // original native Brain saved atomically before other organs
  nextAutoSave=brain.chars+checkpointEvery;
  return true;
};
const transStats = () => { brain.tWorld(); const T = brain.trans; return {played: T.played, won: T.won, test: T.test, last: T.last}; };
const perspectiveStats = () => brain.perspective?.summary() || null;
const mazeStats = () => { const M = brain.mazes; return {played: M.played, won: M.won, recent: M.recent.length ? M.recent.reduce((a, b) => a + b, 0) / M.recent.length : 0, test: M.test || null, knows: M.knows || null, last: M.last}; };
const report = (final = false) => {
  const msg = {type: "test", w: workerData.gw, arm: arm.name, chars: brain.chars, exercises: brain.exercises || 0, dissolved, heapGB: process.memoryUsage().heapUsed / 1e9,
    speed: (brain.chars - c0) / ((performance.now() - t0) / 1000), test: TEXT ? brain.test(H) : null, final, maze: MAZE ? (brain.testMazes(30), mazeStats()) : null, transform: TRANS ? (brain.testTransforms(24), transStats()) : null,
    gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null,
    shared: shared.status(), constructedPaths: brain.constructedPaths?.summary() || null,
    observedTransformations: brain.observedTransformations?.report() || null,
    observedPipeline: {...observedPipeline},
    textMaze: textMazeLive,
    hypermaze: TEXT ? hyperMaze.report() : null,
    nativePathAtlas:TEXT?nativeAtlas.summary():null,
    xdAtlas:brain.xdAtlas?.summary({includeWorld:true})||null,
    language: brain.language?.report() || null,
    endogenousNoise: brain.noiseAgent?.status() || null, selfcode: selfcode?.status() || null, perspective: perspectiveStats(), form: brain.chain.A[0].wires.length ? brain.chain.A[0].form().split(", ").slice(0, 4).join(", ") : "", cActive: brain.e.c.active, cLag: brain.e.c.maxLag, cFlips: brain.e.c.promotions};
  if (saveFile) { try {
    setWorkerPhase("checkpoint: serializing original Brain");
    msg.savedMB = brain.save(saveFile) / 1e6;
    setWorkerPhase("checkpoint: saving sidecars");
    saveText();selfcode?.save();
    setWorkerPhase("checkpoint complete");
  } catch (err) { msg.saveError = err.message; } }
  parentPort.postMessage(msg);
};
const shot = (force) => { if (!force && performance.now() - lastShot < 1100) return; lastShot = performance.now(); try { brain.organismView(); } catch {}
  parentPort.postMessage({type: "graph", w: workerData.gw, arm: arm.name, chars: brain.chars, lived: brain.lived, controls: brain.controls, shared: shared.status(), constructedPaths: brain.constructedPaths?.summary() || null,
    observedTransformations: brain.observedTransformations?.report() || null,
    observedPipeline: {...observedPipeline},
    textMaze: textMazeLive,
    hypermaze: TEXT ? hyperMaze.report() : null,
    nativePathAtlas:TEXT?nativeAtlas.summary():null,
    xdAtlas:brain.xdAtlas?.summary({includeWorld:true})||null,
    language: brain.language?.report() || null,
    selfcode: selfcode?.status() || null, perspective: perspectiveStats(), selfModel: brain.align ? brain.align.selfModel() : null, accAlign: brain.align ? brain.align.accuracy() : null, exercises: brain.exercises || 0, form: brain.chain.A[0].form(),
    maze: MAZE ? mazeStats() : null, transform: TRANS ? transStats() : null, endogenousNoise: brain.noiseAgent?.status() || null, gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null, ...brain.trace.snapshot(shots++ % 5 === 0)}); };
// LIVE controlled-world training: full finite 128-state xD maze, every wall,
// every corridor and all 7 active physical coordinates available BEFORE
// action. The original native Brain owns/persists the action atlas, and no
// correct action sequence is supplied. Do not enumerate 2^2048 states.
const liveXdWorld = async () => {
  if(!(xdAtlasEvery>0)||brain.chars<nextXd)return null;
  const dims=[16,64,256,1024,2048];
  const index=brain.xdAtlas.trainedWorlds;
  const dimension=dims[index%dims.length];
  const seed=1000003+index*7919;
  setWorkerPhase("xD: full "+dimension+"D finite maze; learn transformations from actions");
  const result=brain.liveCompleteXDWorld({
    dimensions:dimension,seed,physicsSeed:17,heldoutSeed:seed+99001
  });
  if(xdAtlasLog)xdAtlasLog.write(JSON.stringify({
    episode:index+1,atChars:brain.chars,...result
  })+"\n");
  parentPort.postMessage({type:"note",w:workerData.gw,
    text:"Full finite "+dimension+"D xD atlas (7 active axes): "+
      "training solved="+result.training.execution.solved+
      ", unseen WITHOUT target probes solved="+result.heldout.execution.solved+
      ", shortest path="+result.heldout.plan.evaluatorPhysicalShortestPath+
      ", actions observed previously="+brain.xdAtlas.effects.size});
  nextXd=brain.chars+xdAtlasEvery;
  shot(true);
  await atlasFlush();
  return result;
};
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
// Independent signal while waiting for CUDA; detects idle IPC vs frozen JS.
// No invented progress counters: the same original worker emits its own data.
let workerPhase = "starting", phaseSince = Date.now();
const setWorkerPhase = label => {workerPhase=label;phaseSince=Date.now();};
let rateAt=Date.now(),rateChars=brain.chars||0,rateExercises=brain.exercises||0;
const heartbeat = setInterval(()=>{
  const now=Date.now(),deltaSeconds=Math.max(.001,(now-rateAt)/1000);
  const committedChars=brain.chars||0,committedExercises=brain.exercises||0;
  const textMBps=Math.max(0,(committedChars-rateChars)/1e6/deltaSeconds);
  const exercisesPerSecond=Math.max(0,(committedExercises-rateExercises)/deltaSeconds);
  rateAt=now;rateChars=committedChars;rateExercises=committedExercises;
  parentPort.postMessage({type:"heartbeat",w:workerData.gw,at:now,
    phase:workerPhase,phaseSince,chars:committedChars,
    exercises:committedExercises,batch:batchNow,
    textMBps,exercisesPerSecond,
    throughputIntervalSeconds:deltaSeconds,
    rawTextMB:committedChars/1e6,
    throughputDefinition:"COMMITTED text characters in original Brain / wall-clock seconds (NOT Parquet file I/O bytes)",
    activeGpuRpc:gpu?.activeCommand||null,
    gpuDead:!!gpu?.dead,heapGB:process.memoryUsage().heapUsed/1e9});
},5000);
heartbeat.unref?.();
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
    // A single organism-owned policy chooses *where* to perturb the shared learner.
    // If it is not enabled, keep the original adaptive-noise behavior unchanged.
    const portal = brain.noiseAgent ? brain.noiseAgent.decide({domain: 'shared',
      known: !!shared.training?.step, planned: samples.length > 24}) : null;
    const result = await G.call({cmd: "shared_train", samples, checkpoint: sharedFile,
      seed: brain.seed, adaptiveNoise: !portal,
      noiseSelection: portal ? {site: portal.site, strength: portal.strength} : null});
    if (portal && Number.isFinite(result.trainingNoiseGain))
      brain.noiseAgent.learn(portal, {gain: result.trainingNoiseGain});
    shared.training = result; shared.error = null;
  } catch (err) {
    shared.requeue(samples); shared.error = "Shared model: " + err.message;
    parentPort.postMessage({type: "note", w: workerData.gw, text: shared.error});
  }
};
const tick = async (phase, done, total) => { batchNow = {phase, done, total}; shot(); if (paused || saveNow) await hold(); await new Promise(r => setImmediate(r)); };
const worldsOnce = async (record) => {                                     // one round of the worlds: one each on the CPU, or a batch of N on the GPU
  setWorkerPhase("GPU: worlds / transformation batch");
  const G = await gpuOn();
  if (G) { try { if (MAZE) await brain.learnMazesGPU(G, gpuSet.worlds, tick); if (TRANS) await brain.playTransformsGPU(G, gpuSet.worlds, tick); if (selfcode) selfcode.step(); await flushShared(); batchNow = null; return; } catch (err) { gpuError = err.message; batchNow = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } }
  if (gpuSet) { shot(true); throw Error("CUDA worlds batch failed: "+(gpuError||"GPU process unavailable")+
    ". No world silently skipped and no CPU fallback."); }
  if (MAZE) brain.playMaze(record || brain.mazes.played % 10 === 0); if (TRANS) { brain.tWorld(); brain.playTransform(record || brain.trans.played % 5 === 0); } if (selfcode) selfcode.step(); await flushShared(); };

const selectedTextBatch = () => Math.max(1, Math.min(128, Math.trunc(Number(gpuSet?.textBatch) || gpuInfo?.autoText || 2)));
const processGpuText = async (exs, meta) => {
  const total = exs.reduce((sum, e) => sum + Math.max(0, e.length - 1), 0);
  setWorkerPhase("text CUDA: working on real training batch");
  batchNow = {phase: "text CUDA: aliniere", done: 0, total}; shot();
  const startChars = brain.chars;
  const observeProgress = progress => {
    batchNow = {phase: "text CUDA: " + progress.phase, done: progress.done, total: progress.total};
    setWorkerPhase(batchNow.phase);
    // Lightweight /health heartbeat records actual Python progress.
  };
  try {
    await brain.learnTextGPU(gpu,exs,observeProgress);
  } catch (err) {
    // For a dead / unresponsive Python child, the native Brain has NOT
    // absorbed the batch: Brain.learnTextGPU mutates it only AFTER receiving
    // a completed reply. The dead child is discarded and its text memory
    // reloaded from the unchanged native Brain before replaying this batch.
    // Never retry errors after the first GPU result was committed.
    if (!/GPU RPC (idle|hard) timeout|GPU process .*ended|GPU process is not running/i.test(err.message))
      throw err;
    parentPort.postMessage({type:"note",w:workerData.gw,text:
      "CUDA stalled: restarting the dead child and replaying THIS uncommitted text batch exactly once: "+err.message});
    setWorkerPhase("CUDA: recovering stalled uncommitted text batch");
    gpu?.close("restart after stalled uncommitted CUDA batch");
    gpu=null;gpuInfo=null;gpuError=null;sharedLoaded=false;
    const restarted=await gpuOn();
    if(!restarted)throw Error("CUDA recovery failed: "+(gpuError||err.message));
    await brain.learnTextGPU(restarted,exs,observeProgress);
    parentPort.postMessage({type:"note",w:workerData.gw,text:
      "CUDA recovered. Native text batch committed once after successful retry."});
  }
  setWorkerPhase("CPU: merging real CUDA text batch into original Brain");
  batchNow = {phase: "text: integrare în graful V17", done: 0, total: exs[0]?.length || 0}; shot();
  // The original V17 trace sees the first actual exercise, exactly once.
  if (exs.length) for (const y of exs[0]) brain.live(y, brain.lived % 50 === 0, {old: true});
  for(const row of meta){absorbHyperMaze(row);absorbLanguage(row);absorbConstructed(row);absorbObservedDifferences(row);}
  for (let j = 0; j < meta.length; j += Math.max(1, Math.floor(meta.length / 8))) absorbText(meta[j]);
  setWorkerPhase("CUDA: training shared transition model");
  batchNow = {phase: "CUDA: model comun de transformări", done: 0, total: shared.queue.length};
  await flushShared();
  if ((MAZE || TRANS || SELF_CODE) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); }
  // The full xD world executes in the SAME native Brain after real text is committed.
  await liveXdWorld();
  await atlasFlush();
  batchNow = null;
  setWorkerPhase("completed text batch; preparing next exercises");
  // Heavy frozen evaluation and serializing the entire native Brain must
  // NOT block the very first batch when the user's intent is continuous text
  // training. It still runs on each configured true-text checkpoint boundary.
  if (Math.floor(brain.chars / every) > Math.floor(startChars / every)) {
    setWorkerPhase("CPU: frozen unseen evaluation and atomic checkpoint");
    report();
    if(checkpointEvery>0)nextAutoSave=brain.chars+checkpointEvery;
  }else autonomousCheckpoint();
  // Limit expensive full-size UI graph snapshots; return counts via /health
  // every 5 seconds even when the Brain is in a long CUDA batch.
  shot();
};
parentPort.on("message", m => {
  // On-demand PAGE through the ORIGINAL persistent six-scale graph. No
  // static 220-edge cap, no answer generated and no native memory update.
  if(m?.evidenceGatedText){
    const {id,start="",required=[],maxSteps=8,maxExpanded=6000}=m.evidenceGatedText;
    try{
      const result=brain.planEvidenceGatedTextRoute(start,required,{maxSteps,maxExpanded});
      parentPort.postMessage({type:"chat",id,evidenceGatedText:true,result});
    }catch(err){
      parentPort.postMessage({type:"chat",id,evidenceGatedText:true,error:err.message});
    }
    return;
  }
  if(m?.nativeAtlasPage){
    const {id,scale=0,offset=0,limit=80}=m.nativeAtlasPage;
    try{
      const page=m.nativeAtlasPage.family==="edits"?
        nativeAtlas.operatorPage(brain.observedTransformations,{offset,limit}):
        nativeAtlas.page(brain.constructedPaths,{scale,offset,limit});
      parentPort.postMessage({type:"chat",id,nativeAtlasPage:true,...page});
    }catch(err){parentPort.postMessage({type:"chat",id,nativeAtlasPage:true,error:err.message});}
    return;
  }
  if(m?.nativeAtlasEval){
    const id=m.nativeAtlasEval.id;
    try{
      const held=Array.isArray(m.nativeAtlasEval.rows)?
        m.nativeAtlasEval.rows.map(parseHeldoutText).filter(Boolean):[];
      const tested=nativeAtlas.evaluateFrozen(brain.constructedPaths,held,
        {max:Math.min(16,held.length)});
      parentPort.postMessage({type:"chat",id,nativeAtlasEval:true,...tested,
        trainingRowsBefore:brain.constructedPaths.textRows,
        trainingAtlasEpisodesBefore:nativeAtlas.episodes,
        trainingAtlasEpisodesAfter:nativeAtlas.episodes});
    }catch(err){parentPort.postMessage({type:"chat",id,nativeAtlasEval:true,error:err.message});}
    return;
  }
  // Freeze the learned axis operators before testing a NEW complete world.
  // Test seeds are distinct from all training episodes; no probes supplied.
  if(m?.xdAtlasTest){
    const {id,dimensions=1024,seed=81919}=m.xdAtlasTest;
    try{
      if(!Number.isInteger(dimensions)||dimensions<16||dimensions>8192)
        throw Error("Choose ambient dimensions 16..8192");
      if(!Number.isInteger(seed))throw Error("Seed must be integer");
      const world=new CompleteXDWorld({dimensions,seed,physicsSeed:17});
      const frozen=brain.xdAtlas.testFrozen(world);
      parentPort.postMessage({type:"chat",id,xdAtlasTest:true,
        result:frozen,learnedEffects:brain.xdAtlas.effects.size,
        noTestTargetProbes:true});
      shot(true);
    }catch(err){parentPort.postMessage({type:"chat",id,xdAtlasTest:true,error:err.message});}
    return;
  }
  if(m && m.hyperMazeConfig){
    if(Number.isFinite(+m.hyperMazeConfig.noise))
      hyperMaze.noise=Math.max(0,Math.min(1,+m.hyperMazeConfig.noise));
    shot(true);return;
  }
  if(m && m.hyperMazeEval){
    const id=m.hyperMazeEval.id;
    try{
      const held=Array.isArray(m.hyperMazeEval.rows)?
        m.hyperMazeEval.rows.map(parseHeldoutText).filter(Boolean):[];
      parentPort.postMessage({type:"chat",id,hyperMazeEval:true,
        ...(held.length?hyperMaze.evaluateFrozen(held,{max:60}):
           {error:"No held-out text available from the real source"})});
    }catch(err){parentPort.postMessage({type:"chat",id,hyperMazeEval:true,error:err.message});}
    return;
  }
  if(m && m.languageMaze){
    const {id,required,start,maxDepth=4,localPolicy=true,auto=false}=m.languageMaze;
    try{
      const selfGoal=auto?brain.observedTransformations?.selfSelectedChallenge():null;
      if(auto&&!selfGoal){
        parentPort.postMessage({type:"chat",id,languageMaze:true,
          found:false,reason:"no-reachable-novel-self-probe-from-observed-operators",
          selfProbe:true,referenceProvided:false});return;
      }
      const actualGoal=selfGoal?{required:selfGoal.required,start:selfGoal.start,maxDepth}:
        {required,start,maxDepth};
      const result=brain.planObservedTransformation(actualGoal,
        {trace:true,embodied:true,localPolicy});
      parentPort.postMessage({type:"chat",id,languageMaze:true,...result,
        selfProbe:!!selfGoal,selfGoal:selfGoal||null,
        perspectivePair:{global:"initial frozen plan + alternative search",
          local:"actually selected learned text actions + fresh plan when diverging"}});
    }catch(err){parentPort.postMessage({type:"chat",id,languageMaze:true,error:err.message});}
    return;
  }
  if(m && m.compositionGoal){
    const id=m.compositionGoal.id;
    let result;
    try {
      // Goal is a set of required tokens, not a supplied correct sentence.
      result=brain.planObservedTransformation({
        required:m.compositionGoal.required,start:m.compositionGoal.start??null,
        maxDepth:m.compositionGoal.maxDepth??4
      });
    }catch(err){result={error:err.message};}
    parentPort.postMessage({type:"chat",id,compositionGoal:true,...result});
    return;
  }
  if(m && m.constructedPathExam){
    const {id,count=12,seed=73}=m.constructedPathExam;
    let result;
    try{result=brain.testConstructedMaze(count,seed);}
    catch(err){result={error:err.message};}
    parentPort.postMessage({type:'chat',id,constructedPathExam:true,...result});
    return;
  }
  if(m && m.languageExam) {
    const {id,limit=1800,seed=11}=m.languageExam;
    let result;
    try{result=brain.testLanguage(evalText,{maxTokens:Math.max(50,Math.min(10000,limit)),seed});}
    catch(err){result={error:err.message};}
    parentPort.postMessage({type:'chat',id,...result});return;
  }
  if(m && m.perspectiveExam){
    const {id,count=20,seed=73}=m.perspectiveExam;
    let result;
    try{result=brain.testPerspective(count,seed);}
    catch(err){result={error:err.message};}
    parentPort.postMessage({type:'chat',id,...result});shot(true);return;
  }
  if (m && m.controls) { const C = brain.setControls(m.controls); parentPort.postMessage({type: "note", w: workerData.gw, text: "controls " + JSON.stringify(C)}); shot(true); return; }
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
  if (m === "stop") stop = true; else if (m === "pause") {paused = true;selfcode?.pause();} else if (m === "resume") {paused = false;selfcode?.resume();} else if (m === "save") saveNow = true; });
const hold = async () => { while (paused && !stop) { if (saveNow) doSave(); await new Promise(r => setTimeout(r, 150)); } if (saveNow) doSave(); };
const doSave = () => { saveNow = false; if (saveFile) try {
  setWorkerPhase("checkpoint: saving original Brain (atomic temp file)");
  const MB=brain.save(saveFile)/1e6;
  setWorkerPhase("checkpoint: writing auxiliary state after original Brain");
  saveText();selfcode?.save();
  parentPort.postMessage({type:"saved",w:workerData.gw,MB});
  setWorkerPhase(paused?"paused":"checkpoint saved; resume training");
} catch(err){parentPort.postMessage({type:"note",w:workerData.gw,
  text:"Checkpoint save FAILED: "+err.message});} };
let k = 0, textBatch = [], textMeta = [];
shot(true); await hold();
for await (const ex of stream()) {
  await hold();
  if (TEXT && k++ < skip) continue;                                         // a resumed brain does not live the same exercises twice
  // the card is there: text is lived on the card in batches (gpu/text_gpu.py); the brain adds the totals, and one
  // exercise of each batch is also lived here by the older organs (so they and the drawn graph stay alive)
  // Explicit CUDA errors stop the worker: NEVER silently continue on CPU or discard an unseen batch.
  if (TEXT && gpuSet) {
    setWorkerPhase("CUDA: verify device ready");
    if (gpuError || !(await gpuOn())) {
      parentPort.postMessage({type: "fatal", w: workerData.gw, text: "CUDA unavailable: " + (gpuError || "backend did not initialize")});
      stop = true; break;
    }
    textBatch.push(ex.bytes); textMeta.push(ex);
    setWorkerPhase("collecting next real CUDA text batch");
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
      brain.exercises = (brain.exercises || 0) + 1;
      absorbHyperMaze(textMeta[j]);absorbLanguage(textMeta[j]);absorbConstructed(textMeta[j]);
      absorbObservedDifferences(textMeta[j]);absorbText(textMeta[j]);
    }
    textBatch = []; textMeta = []; shot(true);
  }
  setWorkerPhase("CPU: native V17 text exercise");
  const startedAtChars=brain.chars;
  brain.exercises = (brain.exercises || 0) + (TEXT ? 1 : 0); if (TEXT) brain.beginExercise();
  for (const y of ex.bytes) {
    brain.live(y, brain.chars % 50 === 0); brain.chars++;
    if (brain.chars % 2000 === 0) shot();
    if ((MAZE || TRANS || SELF_CODE) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); shot(); }
    if (brain.chars >= nextTest) { nextTest += every; if (process.memoryUsage().heapUsed / 1e9 > memGB && !brain.full) { brain.full = true; parentPort.postMessage({type: "note", w: workerData.gw, text: "memory budget reached: nothing is deleted; the old graph stops growing, the aligning graph keeps everything"}); } report(); }
    if (brain.chars >= maxChars || stop) break;
    if (paused || saveNow) { shot(true); await hold(); }
  }
  const livedChars=brain.chars-startedAtChars;
  observedPipeline.lastLoop={TEXT,stop,gpuSet:!!gpuSet,startedAtChars,
    now:brain.chars,livedChars,rowBytes:ex.bytes?.length,
    type:typeof ex.bytes,isArray:Array.isArray(ex.bytes),exercises:brain.exercises};
  if(TEXT&&livedChars>0){
    // The structural learner must receive EVERY actually lived symbol, not
    // depend on a training budget that can end at the same moment as a row.
    // If a row is truncated, only use the observed PREFIX, never the
    // unobserved continuation (strict no-leak partial-observation rule).
    const livedRow={...ex,bytes:ex.bytes.slice(0,livedChars)};
    if(livedChars===ex.bytes.length&&!stop){
      // Diagnose BEFORE observing the current sentence/answer in EITHER
      // the six-scale graph or the contextual edit-operator atlas.
      absorbHyperMaze(ex);absorbLanguage(ex);absorbConstructed(ex);
      absorbObservedDifferences(livedRow);absorbText(ex);
      await flushShared();
    }else absorbObservedDifferences(livedRow);
  }
  if(TEXT) {await liveXdWorld();await atlasFlush();autonomousCheckpoint();}
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
setWorkerPhase("final checkpoint and test");
report(stop ? false : true);
shot(true); // publish ALL final learned transformations, graph, text and noise even for small corpora and no-noise organisms
if (gpu) gpu.close();
if(nativeAtlasLog)await new Promise((resolve,reject)=>{
  nativeAtlasLog.once("error",reject);nativeAtlasLog.end(resolve);
});
if(xdAtlasLog)await new Promise((resolve,reject)=>{
  xdAtlasLog.once("error",reject);xdAtlasLog.end(resolve);
});
await selfcode?.close();
parentPort.close();

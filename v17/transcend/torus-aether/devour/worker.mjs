// One devouring brain. It lives through its own share of the world exactly once (no repetition) and, if the maps are
// among its worlds, plays a map between pieces of text — the same graph lives both. Every `every` characters it is
// tested, frozen, on the same unseen text as all the other brains, and it is saved whole (resume continues from there).
// When its memory passes the budget, what happened only once dissolves (solve).
import {parentPort, workerData} from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";
import {openTextDataset} from "../data/text-dataset.mjs";
import {trainingProgress} from "./dataset-progress.mjs";
import {classifyGpuUpdate} from "./gpu-settings-transition.mjs";
import {Brain} from "./brain.mjs";
import {GpuWorlds} from "../gpu/client.mjs";
import {SharedExperience} from "../shared/experience.mjs";
import {SelfCodeWorld} from "../worlds/self-code.mjs";
import {NativeWholeTextWorld} from "../worlds/whole-map-text.mjs";
import {validateWorldSource} from "./world-source.mjs";
import {LearnedCognitiveMap} from "../worlds/learned-cognitive-map.mjs";
import {TextHypermaze} from "../worlds/text-hypermaze.mjs";
import {TextActionPaths} from "../../../../isolated/noise-space/text_action_paths.mjs";
import {CausalTextAgent} from "../../../../isolated/noise-space/causal_text_world.mjs";

const {w, n, source, arm, every, maxChars, memGB, evalText, worlds = ["text"], mazeEvery = 4000, saveFile, resume} = workerData;
const ascii = s => { const out = []; for (const ch of s) { const c = ch.charCodeAt(0); if (c === 13) continue; out.push(c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63); } return out; };
const TEXT = worlds.includes("text"), MAZE = worlds.includes("maze"), TRANS = worlds.includes("transform"), CODE = worlds.includes("code"), MAPTEXT = worlds.includes("maptext"), COGNITIVE = worlds.includes("cognitivemap");
const HYPER = worlds.includes("hypertext");
const MAP_ONLY = !TEXT && !MAZE && !TRANS && !CODE && (MAPTEXT || COGNITIVE || HYPER);
validateWorldSource(worlds, source); // fail closed BEFORE loading or changing any brain checkpoint

async function* stream() {                                                 // this brain's share of the world, once
  if (!TEXT && !COGNITIVE && !HYPER) { for (;;) yield {k: -1, bytes: []}; }
  if (source.kind === "parquet") {
    const ds = await openTextDataset(source.root);
    for (let k = w; k < ds.trainRows; k += n) { const x = await ds.exercise(k); yield {k, bytes: ascii("Q: " + x.prompt + "\nA: " + x.answer + "\n\n"), prompt: x.prompt, answer: x.answer, worldText: "Q: " + x.prompt + "\nA: " + x.answer}; }
  } else if (source.kind === "text") {
    let k = 0; for (const f of source.files) for (const para of fs.readFileSync(f, "utf8").split(/\n\s*\n/)) {
      if (para.trim().length < 20) continue; if (k++ % n === w && !source.heldSet.includes(k)) yield {k, bytes: ascii(para + "\n\n"), worldText: para}; }
  } else {
    throw Error("Text source not configured. This worker cannot run text without a text or parquet dataset.");
  }
}

let brain = null, skip = 0;
if (resume && saveFile && fs.existsSync(saveFile)) { try { brain = Brain.load(saveFile); skip = brain.exercises || 0; } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "could not resume: " + err.message}); } }
if (!brain) brain = new Brain({rules: arm.rules, c: arm.c || {}, seed: 11 + w});
if (workerData.controls) brain.setControls(workerData.controls);         // the person's determinism / noise settings survive a restart
// Original V17 decisions remain unchanged; this observes TRAINING results only.
const shared = new SharedExperience({capacity: 384, seed: brain.seed});
// Observer is installed after the cognitive model is initialized, so that
// real events from ALL original V17 worlds reach the SAME brain and atlas.
const codeWorld = CODE ? new SelfCodeWorld(brain) : null; // shares the original V17 brain checkpoint
const wholeText = MAPTEXT ? new NativeWholeTextWorld(brain, {dimensions: 6}) : null;
const cognitive = COGNITIVE ?
  (brain.cognitiveMap ? LearnedCognitiveMap.restore(brain.cognitiveMap) : new LearnedCognitiveMap()) : null;
const cognitionStart = brain.cognitiveDocuments || 0, cognitiveT0 = performance.now();
const hypermaze = (COGNITIVE || HYPER) ? (brain.hypermaze ? TextHypermaze.restore(brain.hypermaze) : new TextHypermaze()) : null;
// A V21 hypertext-only checkpoint can have 200 observed documents but ZERO
// native text exercises. When enabling the previously omitted 'text' world on
// resume, replay original corpus into the native AligningGraph from exercise 0
// while avoiding duplicate V20/V21 observations of those first 200 documents.
// The original shape model is NOT replaced or reset.
const previouslyObservedCognitive = cognitive?.documents || 0;
const previouslyObservedHyper = hypermaze?.documents || 0;
let cognitiveReplayCursor = skip;

brain.setSharedObserver(sample => {
  shared.observe(sample);
  if(cognitive)cognitive.observeExternalTransition(sample);
  if(hypermaze)hypermaze.veil.observeExperience(sample); // shared actual V17 actions: maze, transform, text, code
});
const saveCognitive = () => {
  if(cognitive)brain.cognitiveMap = cognitive.export();
  if(hypermaze)brain.hypermaze = hypermaze.export();
};
const absorbCognitive = row => {
  if(!cognitive && !hypermaze)return null;
  if(typeof row?.worldText !== "string")throw Error("Cognitive world requires complete original text, not ASCII token predictions");
  // Each native learned world retains its OWN observed-document count.
  // On an old hypertext-only checkpoint, newly enabled V19 cognitive rules
  // MUST learn original documents, but V20/V21 graphs MUST NOT absorb them twice.
  const observedIndex = TEXT ? cognitiveReplayCursor++ : null;
  const takeCognitive = cognitive && !(TEXT && resume && observedIndex < previouslyObservedCognitive);
  const takeHyper = hypermaze && !(TEXT && resume && observedIndex < previouslyObservedHyper);
  if(!takeCognitive && !takeHyper) return null;
  const before=cognitive?.rules.size||0;
  const result=takeCognitive?cognitive.observeWorld(row.worldText,{id:row.k}):null;
  // Freeze prediction on previous graph, then learn only NEW V20/V21 documents.
  if(takeHyper)hypermaze.observeWorld(row.worldText,{id:row.k});
  // This original aggregate counter counts unique corpus documents, not
  // duplicate ingestion by an additional native world during resumption.
  if(!(TEXT && resume && observedIndex < cognitionStart)){
    brain.cognitiveDocuments=(brain.cognitiveDocuments||0)+1;
    brain.cognitiveCharacters=(brain.cognitiveCharacters||0)+row.worldText.length;
  }
  if(takeCognitive && cognitive.rules.size>before){
    brain.trace.node("cognitive:world","world","Learned language transformation atlas");
    const rules=[...cognitive.rules.values()].slice(-Math.min(5,cognitive.rules.size-before));
    for(const rule of rules){
      const id="cognitive:rule:"+rule.id;
      brain.trace.node(id,"transformation",rule.from+" → "+rule.to+" @"+rule.at);
      brain.trace.setEdge("cognitive:world",id,"observed-contrast",.9);
    }
  }
  return result;
};
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
// Frozen held-out Q/A benchmark, independent from V20/V21 route reachability.
// Prior V21 omitted the 'text' world and therefore displayed 0% open-loop
// solution writing while reporting high retrospective alignment accuracy.
// This is the *original* Brain.evalTextExercises/AligningGraph.write result.
// Choose a complete prefix plus up to 160 answer characters; do not confuse
// teacher-forced accuracy with truly free-generated answer accuracy.
let lastShapeAudit = null;
const originalShapeAudit = () => {
  if (!TEXT) return {status:"NATIVE_TEXT_DISABLED",frozen:true,trainedChars:brain.chars};
  if (!(brain.chars>0 && brain.exercises>0 && brain.align?.mem?.n>0))
    return {status:"NATIVE_TEXT_NOT_TRAINED",frozen:true,trainedChars:brain.chars};
  const mark = H.findIndex((ch,i) => ch===10 && H[i+1]===65 && H[i+2]===58);
  if (mark<0) return {status:"HELDOUT_NO_QA_BOUNDARY",frozen:true,trainedChars:brain.chars};
  const a0=mark+3, end=Math.min(H.length,a0+160);
  if (end<=a0) return {status:"HELDOUT_NO_ANSWER",frozen:true,trainedChars:brain.chars};
  try {
    const x=brain.evalTextExercises([H.slice(0,end)],{T:0,noise:0,seed:74129}).exercises[0];
    return {status:"MEASURED",frozen:true,trainedChars:brain.chars,
      exerciseLength:x.n,answerLength:end-a0,teacherForcedAccuracy:x.answer,
      originalShapeSame:x.shapeSame,generatedLength:x.shape.length,
      generatedPreview:x.shape.slice(0,100),
      meaning:"ORIGINAL V17 free-run answer, from question ONLY; held-out answer is scored AFTER prediction; not token graph reachability"};
  }catch(err){return {status:"FROZEN_EVAL_ERROR",frozen:true,error:err.message,trainedChars:brain.chars};}
};

let lastShot = 0, shots = 0, dissolved = 0, nextTest = (brain.chars || 0) + every, nextMaze = (brain.chars || 0) + 1; const t0 = performance.now(), c0 = brain.chars || 0;
const corpusProgress = () => trainingProgress(source, {w,n,learned: TEXT ? (brain.exercises || 0) : (brain.cognitiveDocuments || 0),mode: TEXT ? "native-text" : "observed-only"});
const transStats = () => { brain.tWorld(); const T = brain.trans; return {played: T.played, won: T.won, test: T.test, last: T.last}; };
const mazeStats = () => { const M = brain.mazes; return {played: M.played, won: M.won, recent: M.recent.length ? M.recent.reduce((a, b) => a + b, 0) / M.recent.length : 0, test: M.test || null, knows: M.knows || null, last: M.last}; };
const report = (final = false) => {
  lastShapeAudit=originalShapeAudit();
  const msg = {type: "test", w: workerData.gw, arm: arm.name, worlds, chars: brain.chars, exercises: brain.exercises || 0, progress: corpusProgress(), dissolved, heapGB: process.memoryUsage().heapUsed / 1e9,
    speed: (brain.chars - c0) / ((performance.now() - t0) / 1000), test: TEXT ? brain.test(H) : null, final, maze: MAZE ? (brain.testMazes(30), mazeStats()) : null, transform: TRANS ? (brain.testTransforms(24), transStats()) : null,
    gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null,
    shapeAudit:lastShapeAudit, shared: shared.status(), cognitive: cognitive?.report() || null, hypermaze: hypermaze ? {documents:hypermaze.documents,nodes:hypermaze.nodes.length,edges:hypermaze.edges.size,onlinePredictions:hypermaze.onlineTested} : null, selfCode: codeWorld?.status() || null, wholeMap: wholeText?.status() || null, form: brain.chain.A[0].wires.length ? brain.chain.A[0].form().split(", ").slice(0, 4).join(", ") : "", cActive: brain.e.c.active, cLag: brain.e.c.maxLag, cFlips: brain.e.c.promotions};
  if (saveFile) { try { saveCognitive(); msg.savedMB = brain.save(saveFile) / 1e6; saveText(); } catch (err) { msg.saveError = err.message; } }
  parentPort.postMessage(msg);
};
let lastSentTextLength = -1;
const shot = (force) => { if (!force && performance.now() - lastShot < 3000) return; lastShot = performance.now(); try { brain.organismView(); } catch {}
  // A new CUDA batch may be the first lived text; include it immediately, not after four more snapshots.
  const currentTextLength = brain.trace.text.length;
  const includeText = (shots++ % 5 === 0) || currentTextLength !== lastSentTextLength;
  if (includeText) lastSentTextLength = currentTextLength;
  parentPort.postMessage({type: "graph", w: workerData.gw, arm: arm.name, worlds, chars: brain.chars, lived: brain.lived, progress: corpusProgress(), controls: brain.controls, shapeAudit:lastShapeAudit, shared: shared.status(), cognitive: cognitive?.report() || null, hypermaze: hypermaze?.snapshot() || null, selfCode: codeWorld?.status() || null, wholeMap: wholeText?.status() || null, selfModel: brain.align ? brain.align.selfModel() : null, accAlign: brain.align ? brain.align.accuracy() : null, exercises: brain.exercises || 0, form: brain.chain.A[0].form(),
    maze: MAZE ? mazeStats() : null, transform: TRANS ? transStats() : null, gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null, ...brain.trace.snapshot(includeText)}); };
let stop = false, paused = !!workerData.paused, saveNow = false;
// many worlds at once on the GPU (gpu/worlds_gpu.py) for this brain, with the settings chosen on the page or the command line
let gpuSet = !MAP_ONLY && workerData.gpu && workerData.gpu.device && workerData.gpu.device !== "off" ? workerData.gpu : null, gpu = null, gpuInfo = null, gpuError = null, sharedLoaded = false, gpuResetPending = false, gpuHotPending = false;
const gpuOn = async () => {
  // Never kill a Python process while a CUDA batch is in flight. Apply changes at the next batch boundary.
  if (gpuResetPending) { gpu?.close(); gpu = null; sharedLoaded = false; gpuResetPending = false; gpuHotPending = false; }
  if (!gpuSet) return null;
  if (!gpu || gpu.dead) { gpu = new GpuWorlds(gpuSet); sharedLoaded = false; batchNow = {phase: "GPU: pornește " + gpu.py, done: 0, total: 0}; shot(true);
    try { gpuInfo = await gpu.ready; gpuError = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ready: " + JSON.stringify(gpuInfo)}); }
    catch (err) { gpuError = err.message; gpu = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } batchNow = null;
  } else if (gpuHotPending) {
    // Server.init on the SAME device changes VRAM/util but does NOT replace
    // Python Server.text or .shared. Reuse the full suffix-array index.
    gpuHotPending = false;
    try { gpuInfo = await gpu.configure(gpuSet); gpuError = null;
      parentPort.postMessage({type:"note",w:workerData.gw,
        text:"GPU settings applied in-place; CUDA text memory/index and shared model preserved."});
    } catch (err) {
      gpuError = "GPU in-place reconfiguration failed: " + err.message;
      gpu.close(); gpu = null;
      parentPort.postMessage({type:"note",w:workerData.gw,text:gpuError});
    }
  }
  return gpu; };
let batchNow = null;                                                       // where the current GPU batch is (shown on the page while the brain lives it)
const flushShared = async (force = false) => {
  if (!shared.queue.length || (!force && shared.queue.length < 24)) return;
  if (!gpuSet) { shared.error = MAP_ONLY
    ? "Map-only: full-map path search runs on CPU; shared PyTorch transitions are queued but not trained in this mode."
    : "Observed transitions queued; choose CUDA or explicit CPU for PyTorch training."; return; }
  const G = await gpuOn();
  if (!G) { shared.error = gpuError || "PyTorch process not ready"; return; }
  const samples = shared.take(96);
  try {
    if (!sharedLoaded) {
      if (sharedFile) await G.call({cmd: "shared_load", checkpoint: sharedFile, seed: brain.seed});
      sharedLoaded = true;
    }
    const result = await G.call({cmd: "shared_train", samples, checkpoint: sharedFile, seed: brain.seed});
    shared.training = result; shared.error = null;
  } catch (err) {
    shared.requeue(samples); shared.error = "Shared model: " + err.message;
    parentPort.postMessage({type: "note", w: workerData.gw, text: shared.error});
  }
};
const tick = async (phase, done, total) => { batchNow = {phase, done, total}; shot(); if (paused || saveNow) await hold(); await new Promise(r => setImmediate(r)); };
const worldsOnce = async (record) => {                                     // one round of the worlds: one each on the CPU, or a batch of N on the GPU
  if (CODE) for (let i = 0; i < 4; i++) codeWorld.step();
  if (MAPTEXT) wholeText.play((brain.seed * 7919 + brain.wholeText.episodes * 31337) >>> 0);
  const G = await gpuOn();
  if (G) { try { if (MAZE) await brain.learnMazesGPU(G, gpuSet.worlds, tick); if (TRANS) await brain.playTransformsGPU(G, gpuSet.worlds, tick); await flushShared(); batchNow = null; return; } catch (err) { gpuError = err.message; batchNow = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } }
  if (gpuSet) { shot(true); throw Error("CUDA world execution stopped: " + (gpuError || "CUDA backend was not initialized") + ". Refusing to continue only hypertext while selected maze/transform worlds stall."); } // fail closed
  if (MAZE) brain.playMaze(record || brain.mazes.played % 10 === 0); if (TRANS) { brain.tWorld(); brain.playTransform(record || brain.trans.played % 5 === 0); } await flushShared(); };

const selectedTextBatch = () => Math.max(1, Math.min(128, Math.trunc(Number(gpuSet?.textBatch) || gpuInfo?.autoText || 8)));
const processGpuText = async (exs, meta) => {
  const profileText = process.env.MP_PROFILE_TEXT === "1";
  const profStart = performance.now(); // cheap CPU wall-clock telemetry, no CUDA synchronization
  const total = exs.reduce((sum, e) => sum + Math.max(0, e.length - 1), 0);
  batchNow = {phase: "text CUDA: aliniere", done: 0, total}; shot(true);
  const startChars = brain.chars;
  // The Python call can contain a 229,187-character exercise batch.
  // Keep the original UI genuinely responsive even before the first CUDA
  // microchunk finishes. This heartbeat reports ELAPSED time, never
  // fabricates character progress or commits partial document counts.
  const tBatch = performance.now();
  let lastRealProgress = tBatch;
  const heartbeat = setInterval(() => {
    if (!batchNow) return;
    batchNow = {
      ...batchNow,
      elapsedSeconds: +((performance.now() - tBatch) / 1000).toFixed(1),
      waitingSeconds: +((performance.now() - lastRealProgress) / 1000).toFixed(1),
      progressSource: "last-completed-real-CUDA-microchunk",
      warning: performance.now() - lastRealProgress > 60000
        ? "NO CUDA MICROCHUNK COMPLETED FOR OVER 60 SECONDS - EXPENSIVE BATCH OR STALLED DEVICE; NO FAKE PROGRESS"
        : null
    };
    shot(true);
  }, 4000);
  try {
    await brain.learnTextGPU(gpu, exs, progress => {
      lastRealProgress = performance.now();
      batchNow = {
        phase: "text CUDA: " + progress.phase, done: progress.done, total: progress.total,
        elapsedSeconds: +((lastRealProgress - tBatch) / 1000).toFixed(1),
        waitingSeconds: 0,
        progressSource: "completed-original-CUDA-work",
        warning: null
      };
      shot();
    });
  } finally {
    clearInterval(heartbeat);
  }
  const profCardEnd = performance.now();
  batchNow = {phase: "text: integrare în graful V17", done: 0, total: exs[0]?.length || 0}; shot(true);
  // The original V17 trace sees the first actual exercise, exactly once.
  if (exs.length) for (const y of exs[0]) brain.live(y, brain.lived % 50 === 0, {old: true});
  if (COGNITIVE || HYPER) for(const row of meta) absorbCognitive(row);
  const profTraceEnd = performance.now();
  if (CODE) for (let i = 0; i < 4; i++) codeWorld.step();
  for (let j = 0; j < meta.length; j += Math.max(1, Math.floor(meta.length / 8))) absorbText(meta[j]);
  const profCausalEnd = performance.now();
  batchNow = {phase: "CUDA: model comun de transformări", done: 0, total: shared.queue.length};
  await flushShared();
  const profSharedEnd = performance.now();
  if ((MAZE || TRANS || MAPTEXT) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); }
  if (brain.textGpu) {
    const end = performance.now();
    brain.textGpu.hostMs = {
      card: +(profCardEnd - profStart).toFixed(2),
      originalGraphTrace: +(profTraceEnd - profCardEnd).toFixed(2),
      causalTextAndCode: +(profCausalEnd - profTraceEnd).toFixed(2),
      sharedPyTorch: +(profSharedEnd - profCausalEnd).toFixed(2),
      mazeAndTransform: +(end - profSharedEnd).toFixed(2),
      total: +(end - profStart).toFixed(2),
      textCharacters: exs.reduce((sum, e) => sum + e.length, 0),
      textExercises: exs.length,
      charactersPerSecond: +((exs.reduce((sum, e) => sum + e.length, 0) * 1000) / Math.max(1, end - profStart)).toFixed(2),
      note: "wall-clock per completed batch; card includes GPU+Python synchronization and suffix-index rebuild; not a GPU utilization sensor",
      detailedCudaSync: profileText
    };
  }
  batchNow = null;
  // Report the first committed batch immediately, not only after 60,000 bytes.
  if (brain.exercises <= exs.length || Math.floor(brain.chars / every) > Math.floor(startChars / every)) report();
  shot(true);
};
parentPort.on("message", m => {
  if(m?.hypermazeEval){
    const {id,texts}=m.hypermazeEval;
    try{
      if(!hypermaze)throw Error("Hypertext graph not enabled");
      const answer=hypermaze.evaluateDocuments(texts,{maxRouteSamples:3});
      parentPort.postMessage({type:"chat",kind:"hypermaze-eval",id,...answer});
    }catch(err){
      parentPort.postMessage({type:"chat",kind:"hypermaze-eval",id,error:err.message});
    }
    return;
  }
  if(m?.veilPlan){
    const {id,start,goal,maxSteps=160}=m.veilPlan;
    try{
      if(!hypermaze)throw Error("Contextual veil world not enabled");
      const before=JSON.stringify([hypermaze.veil.docs,hypermaze.veil.nodes.length,
        hypermaze.veil.edges.size,hypermaze.veil.predictions]);
      const plan=hypermaze.veil.plan(start,goal,{maxSteps});
      if(before!==JSON.stringify([hypermaze.veil.docs,hypermaze.veil.nodes.length,
        hypermaze.veil.edges.size,hypermaze.veil.predictions]))
        throw Error("Frozen perspective path mutated learned state");
      parentPort.postMessage({type:"chat",kind:"veil-plan",id,...plan,frozen:true});
    }catch(err){parentPort.postMessage({type:"chat",kind:"veil-plan",id,error:err.message});}
    return;
  }
  if(m?.hypermazePlan){
    const {id,start,goal,maxSteps=160}=m.hypermazePlan;
    try {
      if(!hypermaze)throw Error("Text hypermaze world not enabled");
      const old=JSON.stringify([hypermaze.documents,hypermaze.nodes.length,hypermaze.edges.size,hypermaze.onlineTested]);
      const plan=hypermaze.plan(start,goal,{maxSteps});
      if(old!==JSON.stringify([hypermaze.documents,hypermaze.nodes.length,hypermaze.edges.size,hypermaze.onlineTested]))
        throw Error("Frozen plan mutated training state");
      parentPort.postMessage({type:"chat",kind:"hypermaze",id,...plan,frozen:true});
    }catch(err){parentPort.postMessage({type:"chat",kind:"hypermaze",id,error:err.message});}
    return;
  }
  if(m?.cognitiveObserve){
    const {id,before,action,after,accepted}=m.cognitiveObserve;
    try{
      if(!cognitive)throw Error("Cognitive world not enabled for this brain");
      if(typeof action!=="string"||!action||action.length>256||
        typeof accepted!=="boolean")throw Error("Explicit real action and accepted/blocked result required");
      const result=cognitive.rules.has(action)?
        cognitive.observeIntervention({before,action,after,accepted}):
        cognitive.observeActionResult({before,action,after,accepted});
      saveCognitive(); // native versioned Brain checkpoint, no separate model
      const savedMB=saveFile?brain.save(saveFile)/1e6:null;
      shot(true);
      parentPort.postMessage({type:"chat",kind:"cognitive-observation",id,
        result,report:cognitive.report(),savedMB});
    }catch(err){parentPort.postMessage({type:"chat",kind:"cognitive-observation",id,error:err.message});}
    return;
  }
  if(m?.cognitiveEval){
    const {id,initial,goal,maxNodes=384,maxDepth=8}=m.cognitiveEval;
    try{
      if(!cognitive)throw Error("This graph has no cognitive world");
      const pre=cognitive.report(),plan=cognitive.formSolution(initial,goal,
        {disc:brain.disc,maxNodes,maxDepth});
      const reply={type:"chat",id,kind:"cognitive",frozen:true,found:plan.found,
        reason:plan.reason||plan.field?.reason||null,
        rules:plan.learnedRules,observedSentences:plan.world?.fromObservedExamples,
        generatedStates:plan.world?.states.length,candidateGoals:plan.world?.targets.length,
        novelGoal:plan.novelGoal||false,
        start:plan.world?.states[0]?.join(" "),
        plannedPath:plan.path?.map(e=>({action:e.action,after:plan.world.states[e.to]?.join(" ")})),
        shapeField:plan.field?.values?.slice(0,128),
        successor:plan.found?cognitive.successor(plan.world).map(x=>({gamma:x.gamma,goalOccupancyAtStart:x.goalOccupancyAtStart})):[],
        law:plan.planningLaw||null,truncated:plan.world?.truncated||false};
      if(JSON.stringify(pre)!==JSON.stringify(cognitive.report()))throw Error("Frozen evaluation changed learning state");
      parentPort.postMessage(reply);
    }catch(err){parentPort.postMessage({type:"chat",id,kind:"cognitive",error:err.message});}
    return;
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
  if (m && m.gpu) {
    const next = MAP_ONLY || m.gpu.device === "off" ? null : {...(gpuSet || {}), ...m.gpu};
    const change = classifyGpuUpdate(gpuSet,next);
    gpuSet = next;
    if (change === "restart") { gpuResetPending = true; gpuHotPending = false; }
    else if (change === "configure") gpuHotPending = true;
    // "reuse": worlds/textBatch changes are consumed at the NEXT batch
    // boundary without reloading the full text model/index or losing memory.
    gpuError = null;
    parentPort.postMessage({type:"note",w:workerData.gw,
      text:"GPU settings change: "+change+
        (change==="reuse"?" (CUDA model and suffix index kept in memory)":
        change==="configure"?" (same device, update without losing text index)":
        " (device changed, model must be reloaded)")});
    if (MAP_ONLY && m.gpu.device !== "off") parentPort.postMessage({type: "note", w: workerData.gw, text: "Maptext-only is CPU; rejected unnecessary CUDA activation."});
    return; }
  if (m === "stop") stop = true; else if (m === "pause") paused = true; else if (m === "resume") paused = false; else if (m === "save") saveNow = true; });
const hold = async () => { while (paused && !stop) { if (saveNow) doSave(); await new Promise(r => setTimeout(r, 150)); } if (saveNow) doSave(); };
const doSave = () => { saveNow = false; if (saveFile) try { parentPort.postMessage({type: "saved", w: workerData.gw, MB: (saveCognitive(), saveText(), brain.save(saveFile) / 1e6)}); } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "save failed: " + err.message}); } };
let k = 0, textBatch = [], textMeta = [];
shot(true);
// V21 safeguard: when GPU worlds are requested, verify the selected Python
// and actual device BEFORE absorbing the first training document. Otherwise
// CPU-only Python makes maze/transform stop while hypertext appears to run.
if (gpuSet) {
  const validatedGpu = await gpuOn();
  if (!validatedGpu) {
    const message = "CUDA PRE-FLIGHT FAILED BEFORE TRAINING: " + (gpuError || "GPU unavailable") +
      ". No corpus ingestion or checkpoint write; fix OCTOPUS_PY / START_V21_AETHER_VEIL.ps1.";
    parentPort.postMessage({type:"fatal", w:workerData.gw, text:message});
    parentPort.close();
    throw Error(message);
  }
}
await hold();
for await (const ex of stream()) {
  await hold();
  if (TEXT && k++ < skip) continue;
  if ((COGNITIVE || HYPER) && !TEXT && k++ < cognitionStart) continue;
  if ((COGNITIVE || HYPER) && !TEXT) {
    absorbCognitive(ex); // COMPLETE document before any action; no Brain.live next-character training.
    if(brain.cognitiveDocuments%50===0 && (MAZE || TRANS || MAPTEXT || CODE)) await worldsOnce(false);
    if(brain.cognitiveDocuments%25===0) shot(true); // live UI without expensive disk writes
    if(brain.cognitiveDocuments%250===0) report(); // periodic atomic native checkpoint
    if(stop)break;
    await new Promise(resolve=>setImmediate(resolve));
    continue;
  }                                         // a resumed brain does not live the same exercises twice
  // the card is there: text is lived on the card in batches (gpu/text_gpu.py); the brain adds the totals, and one
  // exercise of each batch is also lived here by the older organs (so they and the drawn graph stay alive)
  // Explicit CUDA errors stop the worker: NEVER silently continue on CPU or discard an unseen batch.
  if (TEXT && gpuSet) {
    if (gpuError || !(await gpuOn())) {
      parentPort.postMessage({type: "fatal", w: workerData.gw, text: "CUDA unavailable: " + (gpuError || "backend did not initialize")});
      stop = true; break;
    }
    textBatch.push(ex.bytes); textMeta.push(ex);
    if (textBatch.length >= selectedTextBatch()) {
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
      brain.exercises = (brain.exercises || 0) + 1; absorbText(textMeta[j]); absorbCognitive(textMeta[j]);
    }
    textBatch = []; textMeta = []; shot(true);
  }
  brain.exercises = (brain.exercises || 0) + (TEXT ? 1 : 0); if (TEXT) brain.beginExercise();
  for (const y of ex.bytes) {
    brain.live(y, brain.chars % 50 === 0); brain.chars++;
    if (brain.chars % 2000 === 0) shot();
    if ((MAZE || TRANS || MAPTEXT) && brain.chars >= nextMaze) { nextMaze = brain.chars + mazeEvery; await worldsOnce(false); shot(); }
    if (brain.chars >= nextTest) { nextTest += every; if (process.memoryUsage().heapUsed / 1e9 > memGB && !brain.full) { brain.full = true; parentPort.postMessage({type: "note", w: workerData.gw, text: "memory budget reached: nothing is deleted; the old graph stops growing, the aligning graph keeps everything"}); } report(); }
    if (brain.chars >= maxChars || stop) break;
    if (paused || saveNow) { shot(true); await hold(); }
  }
  if (TEXT && !stop && brain.chars < maxChars) { if (CODE && !gpuSet) codeWorld.step(); absorbText(ex); absorbCognitive(ex); await flushShared(); }
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
// Publish the FINAL real corpus state even when fewer than 25 documents remain.
report(stop ? false : true);
shot(true);
if (gpu) gpu.close();
parentPort.close();

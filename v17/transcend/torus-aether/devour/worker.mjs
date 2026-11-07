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
import {NativeSelfCodeWorld} from "./selfcode-native.mjs";
import {TextActionPaths} from "../../../../isolated/noise-space/text_action_paths.mjs";
import {CausalTextAgent} from "../../../../isolated/noise-space/causal_text_world.mjs";

const {w, n, source, arm, every, maxChars, memGB, evalText, worlds = ["text"], mazeEvery = 4000, saveFile, resume} = workerData;
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
if(workerData.unifiedWorld)brain.enableUnifiedWorldLearning();
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
// This code universe uses the SAME Brain, native graph and observed shared
// transitions; all risky edits run in an isolated evaluator, never in V17.
const selfcode = SELF_CODE ? new NativeSelfCodeWorld({brain,saveFile,seed:brain.seed}) : null;
if(workerData.paused)selfcode?.pause();
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
  // Operator-effects are streamed by the existing learner's real observation
  // hook directly into Brain.worldCore, with no separate Q/A phrase atlas.
  observedPipeline.accepted+=learned.newSentences;
  observedPipeline.last=learned;
};
const absorbConstructed = row => {
  if (typeof row?.prompt !== 'string' || typeof row?.answer !== 'string' ||
      !row.prompt.trim() || !row.answer.trim()) return;
  previewCurrentLanguageWorld(row);
  // Every actual answer becomes a chain of observed character transitions.
  // No held-out sample enters this stream. The same Brain owns the path model.
  brain.learnConstructedText(row.prompt,row.answer);
  // Every actual observed Q/A pair trains the native goal-state axis model.
  brain.learnGoalPathPair(row.prompt,row.answer);
};
const absorbText = row => {
  if (typeof row?.prompt !== "string" || typeof row?.answer !== "string" || !row.prompt.trim() || !row.answer.trim()) return;
  textPaths.learn(row.prompt, row.answer);
  causalText.train(row.prompt, row.answer, textPaths,
    {maxActions: 12, seed: ((row.k || 0) + brain.seed) >>> 0, emit: event => shared.observeText(event, row.prompt)});
};
const H = Array.from(evalText, ch => { const c = ch.charCodeAt(0); return c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63; });
let currentPhase = "";
const stage = name => {
  if (currentPhase !== name) {
    currentPhase = name;
    parentPort.postMessage({type: "phase", w: workerData.gw, phase: name});
  }
};
let lastShot = 0, shots = 0, dissolved = 0, nextTest = (brain.chars || 0) + every, nextMaze = (brain.chars || 0) + 1; const t0 = performance.now(), c0 = brain.chars || 0;
// Real accounting for every existing phase; never omit a learner to inflate rate.
const goalTimings = {startedAt:performance.now(),sourceRows:0,sourceBytes:0,
  phases:Object.create(null)};
const measureGoal = (name,fn) => {
  const t0=performance.now();
  try { return fn(); } finally {
    const ms=performance.now()-t0;
    const s=goalTimings.phases[name] ||= {calls:0,totalMs:0,maxMs:0};
    s.calls++;s.totalMs+=ms;s.maxMs=Math.max(s.maxMs,ms);
  }
};
const measureGoalAsync = async (name,fn) => {
  const t0=performance.now();
  try {return await fn();}finally{
    const ms=performance.now()-t0;
    const s=goalTimings.phases[name] ||= {calls:0,totalMs:0,maxMs:0};
    s.calls++;s.totalMs+=ms;s.maxMs=Math.max(s.maxMs,ms);
  }
};
const goalTelemetry = () => {
  const elapsedMs=performance.now()-goalTimings.startedAt;
  return {sourceRows:goalTimings.sourceRows,sourceBytes:goalTimings.sourceBytes,
    measuredWallSeconds:+(elapsedMs/1000).toFixed(3),
    measuredRowsPerSecond:elapsedMs>0?+(1000*goalTimings.sourceRows/elapsedMs).toFixed(3):0,
    measuredBytesPerSecond:elapsedMs>0?+(1000*goalTimings.sourceBytes/elapsedMs).toFixed(3):0,
    phases:Object.fromEntries(Object.entries(goalTimings.phases).map(([k,v])=>
      [k,{calls:v.calls,totalMs:+v.totalMs.toFixed(3),maxMs:+v.maxMs.toFixed(3)}]))};
};
const transStats = () => { brain.tWorld(); const T = brain.trans; return {played: T.played, won: T.won, test: T.test, last: T.last}; };
const perspectiveStats = () => brain.perspective?.summary() || null;
const mazeStats = () => { const M = brain.mazes; return {played: M.played, won: M.won, recent: M.recent.length ? M.recent.reduce((a, b) => a + b, 0) / M.recent.length : 0, test: M.test || null, knows: M.knows || null, last: M.last}; };
// Heldout answers are NEVER observed as training. A complete frozen route
// is produced from the Q alone; the A is consulted ONLY after planning.
const goalHeldoutEval = () => {
  const paragraphs=evalText.split(/\n\s*\n/);
  let tested=0,exact=0,planned=0,noPath=0,totalAnswerChars=0;
  for(const para of paragraphs){
    if(!/(?:^|\n)\s*(?:A|Assistant)\s*:/im.test(para))continue;
    const row=splitObservedText(para);
    if(!row||row.provenance!=="observed-QA")continue;
    const result=brain.answerByGoalPath(row.prompt);
    tested++;planned+=+(result.ready===true);noPath+=+(result.ready!==true);
    totalAnswerChars+=row.answer.length;
    exact+=+(result.ready===true&&result.text.trim()===row.answer.trim());
  }
  return {tested,planned,exact,failedToPlan:noPath,exactRate:tested?exact/tested:null,
    referenceAnswerUsedOnlyAfterFullPlan:true,totalAnswerChars,
    caution:"Only complete Q/A records in existing HELDOUT split; text semantics not guaranteed"};
};
const report = (final = false) => {
  stage("CPU: evaluare înghețată + statistici");
  const msg = {type: "test", w: workerData.gw, arm: arm.name, chars: brain.chars, exercises: brain.exercises || 0, dissolved, heapGB: process.memoryUsage().heapUsed / 1e9,
    speed: (brain.chars - c0) / ((performance.now() - t0) / 1000), test: TEXT && !workerData.goalTraining ? brain.test(H) : null,
    nativeGoalHeldout: TEXT ? goalHeldoutEval() : null, goalTraining: !!workerData.goalTraining, final, maze: MAZE ? (brain.testMazes(30), mazeStats()) : null, transform: TRANS ? (brain.testTransforms(24), transStats()) : null,
    gpu: gpuSet ? {settings: gpuSet, info: gpuInfo, error: gpuError, maze: brain.mazes.gpu || null, transform: brain.trans?.gpu || null, text: brain.textGpu || null, batch: batchNow} : null,
    shared: shared.status(), worldCore: brain.unifiedEnabled?brain.worldCore.report():null,
    constructedPaths: brain.constructedPaths?.summary() || null,
    observedTransformations: brain.observedTransformations?.report() || null,
    goalHyperpath: brain.goalPaths?.status() || null,
    nativeGoalField: brain.numericGoalField?.report() || null,
    goalPipeline: workerData.goalTraining ? goalTelemetry() : null,
    observedPipeline: {...observedPipeline},
    textMaze: textMazeLive,
    language: brain.language?.report() || null,
    endogenousNoise: brain.noiseAgent?.status() || null, selfcode: selfcode?.status() || null, perspective: perspectiveStats(), form: brain.chain.A[0].wires.length ? brain.chain.A[0].form().split(", ").slice(0, 4).join(", ") : "", cActive: brain.e.c.active, cLag: brain.e.c.maxLag, cFlips: brain.e.c.promotions};
  if (saveFile) { try {
    stage("CPU: salvare checkpoint V17");
    selfcode?.save(); msg.savedMB = brain.save(saveFile) / 1e6; saveText();
  } catch (err) { msg.saveError = err.message; } }
  parentPort.postMessage(msg);
  stage(final ? "antrenament terminat" : "continuă următorul lot");
};
const shot = (force) => { if (!force && performance.now() - lastShot < 1100) return; lastShot = performance.now(); try { brain.organismView(); } catch {}
  parentPort.postMessage({type: "graph", w: workerData.gw, arm: arm.name, chars: brain.chars, lived: brain.lived, controls: brain.controls, shared: shared.status(),
    worldCore: brain.unifiedEnabled?brain.worldCore.report():null,
    constructedPaths: brain.constructedPaths?.summary() || null,
    observedTransformations: brain.observedTransformations?.report() || null,
    goalHyperpath: brain.goalPaths?.status() || null,
    nativeGoalField: brain.numericGoalField?.report() || null,
    goalPipeline: workerData.goalTraining ? goalTelemetry() : null,
    observedPipeline: {...observedPipeline},
    textMaze: textMazeLive,
    language: brain.language?.report() || null,
    selfcode: selfcode?.status() || null, perspective: perspectiveStats(), selfModel: brain.align ? brain.align.selfModel() : null, accAlign: brain.align ? brain.align.accuracy() : null, exercises: brain.exercises || 0, form: brain.chain.A[0].form(),
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
  const G = await gpuOn();
  if (G) { try { if (MAZE) await brain.learnMazesGPU(G, gpuSet.worlds, tick); if (TRANS) await brain.playTransformsGPU(G, gpuSet.worlds, tick); if (selfcode) selfcode.step(); await flushShared(); batchNow = null; return; } catch (err) { gpuError = err.message; batchNow = null; parentPort.postMessage({type: "note", w: workerData.gw, text: "GPU ERROR: " + err.message}); } }
  if (gpuSet) { shot(true); return; }                                      // the card was asked for and does not work: the error is on the page, no CPU fallback
  if (MAZE) brain.playMaze(record || brain.mazes.played % 10 === 0); if (TRANS) { brain.tWorld(); brain.playTransform(record || brain.trans.played % 5 === 0); } if (selfcode) selfcode.step(); await flushShared(); };

const selectedTextBatch = () => Math.max(1, Math.min(128, Math.trunc(Number(gpuSet?.textBatch) || gpuInfo?.autoText || 2)));
const processGpuText = async (exs, meta) => {
  const timing = {}, lap = async (name, fn) => {
    stage(name); const before = performance.now(); await fn();
    timing[name] = +((timing[name] || 0) + performance.now() - before).toFixed(1);
  };
  const total = exs.reduce((sum, e) => sum + Math.max(0, e.length - 1), 0);
  batchNow = {phase: "text CUDA: aliniere", done: 0, total};
  stage("CUDA: aliniere text"); shot(true);
  const startChars = brain.chars;
  await brain.learnTextGPU(gpu, exs, progress => {
    batchNow = {phase: "text CUDA: " + progress.phase, done: progress.done, total: progress.total};
    stage("CUDA: " + progress.phase);
    if (progress.sample) parentPort.postMessage({type: "text-live", w: workerData.gw,
      done: progress.done, total: progress.total,
      charsCommitted: brain.chars, exercisesCommitted: brain.exercises || 0, sample: progress.sample});
    if (performance.now() - lastShot >= 4500) shot();
  });
  batchNow = {phase: "CPU: integrare în graful V17", done: 0, total: exs[0]?.length || 0};
  await lap("CPU: graf vizual per caracter", async () => {
    // Preserve EVERY original graph update. Yield during long exercises so
    // the UI, pause and save can react instead of appearing frozen.
    if (exs.length) for (let i = 0; i < exs[0].length; i++) {
      brain.live(exs[0][i], brain.lived % 50 === 0, {old: true});
      if ((i + 1) % 512 === 0) {
        batchNow.done = i + 1;
        stage("CPU: graf vizual " + (i + 1) + "/" + exs[0].length);
        await new Promise(r => setImmediate(r));
        if (paused || saveNow) await hold();
      }
    }
  });
  for (const row of meta) {
    await lap("CPU: limbaj și perspective", () => absorbLanguage(row));
    await lap("CPU: trasee text construite", () => absorbConstructed(row));
    await lap("CPU: transformări observate", () => absorbObservedDifferences(row));
    await new Promise(r => setImmediate(r));
  }
  for (let j = 0; j < meta.length; j += Math.max(1, Math.floor(meta.length / 8))) {
    await lap("CPU: acțiuni lingvistice cauzale", () => absorbText(meta[j]));
  }
  batchNow = {phase: "CUDA: model comun de transformări", done: 0, total: shared.queue.length};
  await lap("CUDA: antrenare reprezentare comună", () => flushShared());
  if ((MAZE || TRANS || SELF_CODE) && brain.chars >= nextMaze) {
    nextMaze = brain.chars + mazeEvery;
    await lap("CUDA: lumi labirint + transformări", () => worldsOnce(false));
  }
  if (brain.textGpu) brain.textGpu.pipelineMs = timing;
  batchNow = null;
  // Report the first committed batch immediately, not only after 60,000 bytes.
  if (brain.exercises <= exs.length || Math.floor(brain.chars / every) > Math.floor(startChars / every)) report();
  shot(true);
};
parentPort.on("message", m => {
  if(m && m.languageMaze){
    const {id,required,start,maxDepth=4,localPolicy=true,auto=false,useUnified=true,compare=false}=m.languageMaze;
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
        {trace:true,embodied:true,localPolicy,useUnified});
      const control=compare&&brain.unifiedEnabled?
        brain.planObservedTransformation(actualGoal,{trace:false,embodied:true,
          localPolicy,useUnified:false}):null;
      const comparison=control?{
        actuallyCompared:true,sameStartAndGoal:true,
        withoutShared:{found:control.found,steps:control.steps?.length??0,
          predicted:control.predicted??null,bodySteps:control.body?.executed??0,
          bodySuccess:control.body?.success??false},
        withShared:{found:result.found,steps:result.steps?.length??0,
          predicted:result.predicted??null,bodySteps:result.body?.executed??0,
          bodySuccess:result.body?.success??false},
        changedInitialRoute:JSON.stringify(control.initialShape)!==JSON.stringify(result.initialShape),
        changedLocalExecution:JSON.stringify(control.body?.frames?.map(x=>x.chosen))!==
          JSON.stringify(result.body?.frames?.map(x=>x.chosen)),
        caution:"Structural internal goal, not independently verified natural-language semantics"
      }:null;
      parentPort.postMessage({type:"chat",id,languageMaze:true,...result,comparison,
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
const doSave = () => { saveNow = false; if (saveFile) try { parentPort.postMessage({type: "saved", w: workerData.gw, MB: (saveText(), selfcode?.save(), brain.save(saveFile) / 1e6)}); } catch (err) { parentPort.postMessage({type: "note", w: workerData.gw, text: "save failed: " + err.message}); } };
let k = 0, textBatch = [], textMeta = [];
shot(true); await hold();
for await (const ex of stream()) {
  await hold();
  if (TEXT && k++ < skip) continue;                                         // a resumed brain does not live the same exercises twice
  // the card is there: text is lived on the card in batches (gpu/text_gpu.py); the brain adds the totals, and one
  // exercise of each batch is also lived here by the older organs (so they and the drawn graph stay alive)
  // Explicit CUDA errors stop the worker: NEVER silently continue on CPU or discard an unseen batch.
  if (TEXT && workerData.goalTraining) {
    // Genuine fast structural training path: every source row enters all the
    // existing semantic/multiscale/causal learners. The disallowed TextCard
    // next-character objective and its expensive byte-by-byte visualization
    // are NOT trained in this explicit experimental mode.
    stage("GOAL: observații reale → axe → transformări → trasee");
    const rowBefore=brain.chars;
    if(ex.prompt&&ex.answer&&(brain.exercises||0)%32===0){
      // ONLINE blind prediction: do this BEFORE any model sees the current
      // row. The real answer is used afterwards for independent scoring.
      const first=measureGoal("blind-infer",()=>brain.answerByGoalPath(ex.prompt));
      parentPort.postMessage({type:"goal-live",w:workerData.gw,
        exercise:(brain.exercises||0)+1,observedBytes:ex.bytes.length,
        question:ex.prompt.slice(0,1200),
        predictedBeforeObserved:(first.text||"").slice(0,5000),
        actualAfterPlanning:ex.answer.slice(0,5000),
        exact:first.ready===true&&first.text.trim()===ex.answer.trim(),
        wholePlanReady:first.ready===true,
        stepCount:first.planSteps?.length||0,
        noNextCharacterFallback:first.noNextCharacterFallback===true,
        frozenRoute:{
          mode:first.mode,ready:!!first.ready,reason:first.reason||null,
          predictedFullAnswerBeforeFirstCharacter:first.predictedFullAnswerBeforeFirstCharacter||"",
          initialShape:first.initialShape?.slice(0,120)||[],
          stepAxes:first.stepAxes?.slice(0,120)||[],
          planSteps:first.planSteps?.slice(0,120)||[],
          execution:first.execution?{
            actual:first.execution.actual||first.text||"",
            frames:first.execution.frames?.slice(0,121)||[],
            internalMatch:first.execution.internalMatch??first.execution.success??false,
            executedSteps:first.execution.executedSteps??first.execution.executed??0
          }:null,
          noNextCharacterFallback:first.noNextCharacterFallback===true
        },
        trainedBeforeRow:brain.exercises||0});
    }
    brain.exercises=(brain.exercises||0)+1;
    brain.chars+=ex.bytes.length; // all source bytes were presented to the structural world
    measureGoal("language-perspectives",()=>absorbLanguage(ex));
    measureGoal("constructed-path-and-coupled-axes",()=>absorbConstructed(ex));
    measureGoal("observed-text-transformations",()=>absorbObservedDifferences(ex));
    measureGoal("causal-actions-shared-experience",()=>absorbText(ex));
    goalTimings.sourceRows++;goalTimings.sourceBytes+=ex.bytes.length;
    observedPipeline.lastLoop={TEXT:true,goalTraining:true,startedAtChars:rowBefore,
      now:brain.chars,livedChars:ex.bytes.length,rowBytes:ex.bytes.length,
      completeRowObserved:true,exercises:brain.exercises};
    if((MAZE||TRANS||SELF_CODE)&&brain.chars>=nextMaze){
      nextMaze=brain.chars+mazeEvery;
      stage("GOAL: lumi fizice labirint + transformări");await measureGoalAsync("actual-maze-transform-worlds",()=>worldsOnce(false));
    }
    if(gpuSet&&shared.queue.length>=256){
      stage("GOAL: CUDA actualizează reprezentarea comună");await measureGoalAsync("shared-latent-update",()=>flushShared());
    }
    if(brain.chars>=nextTest){
      while(brain.chars>=nextTest)nextTest+=every;
      stage("GOAL: evaluare frozen + checkpoint");report();
    }
    if((brain.exercises||0)%16===0){
      shot();await new Promise(r=>setImmediate(r));
    }
    if(brain.chars>=maxChars||stop)break;
    continue;
  }
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
      brain.exercises = (brain.exercises || 0) + 1;
      absorbLanguage(textMeta[j]);absorbConstructed(textMeta[j]);
      absorbObservedDifferences(textMeta[j]);absorbText(textMeta[j]);
    }
    textBatch = []; textMeta = []; shot(true);
  }
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
    absorbObservedDifferences(livedRow);
    if(livedChars===ex.bytes.length&&!stop){
      absorbLanguage(ex);absorbConstructed(ex);absorbText(ex);
      await flushShared();
    }
  }
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
shot(true); // publish ALL final learned transformations, graph, text and noise even for small corpora and no-noise organisms
if (gpu) gpu.close();
await selfcode?.close();
parentPort.close();

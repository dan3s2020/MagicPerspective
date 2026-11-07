// One brain that lives every world: text and the 2D maps go through the same graph (C, A's perceptions, the trust
// between them), the same learned geometry, the same field of lived moments; the maps add only the way to act
// (Precedent, read from the same lived stream). A brain is saved whole and restored whole (save / Brain.load).
import v8 from "node:v8";
import fs from "node:fs";
import {LeanC, SparseCounter} from "../lean-c.mjs";
import {distC} from "../torus.mjs";
import {EmergentChain, EmergentA, Wire, Trust, EventClock, argmax} from "../emergent.mjs";
import {Geometry} from "../concepts.mjs";
import {LivedField, MomentSpace} from "../fractal.mjs";
import {GraphTrace} from "./trace.mjs";
import {AligningGraph, AlignMemory, AlignIndex, SelfMem} from "../align.mjs";
import {TextPathObserver} from "../text-path-observer.mjs";
import {Precedent, playMaze, MAZE_SYMBOLS} from "../worlds/maze.mjs";
import {playLabyrinth, LSYM, makeMaze, seedOf, SEEDS, RNG} from "../worlds/labyrinth.mjs";
import {Discoverer, playExercise, bodyEffect} from "../worlds/exercise.mjs";
import {PerspectiveLearner, perspectiveEpisode, evaluatePerspective} from "../worlds/perspective.mjs";
import {TextPerspectives} from "../language-universe/perspectives.mjs";
import {ConstructedTransitionGraph,ConstructedPathLearner} from "../worlds/constructed-paths.mjs";
import {ObservedTransformations} from "../worlds/observed-transformations.mjs";
import {evidenceGatedTextRoute} from "../worlds/evidence-gated-text-route.mjs";
import {CompleteXDWorld,LearnedXDActionAtlas} from "../worlds/full-xd-maze-atlas.mjs";
import {CausalOrganism, liveTask} from "../worlds/causal.mjs";
import {NoiseAgency} from "../worlds/noise-agency.mjs";
import {makeLevel, TWorld, TSEEDS} from "../worlds/transform.mjs";

const CLASSES = {AligningGraph, Memory: AlignMemory, Index: AlignIndex, SelfMem, LeanC, SparseCounter, EmergentChain, EmergentA, Wire, Trust, EventClock, Geometry, LivedField, MomentSpace, GraphTrace, Precedent, Discoverer, RNG, CausalOrganism, NoiseAgency, PerspectiveLearner, TextPerspectives,ConstructedTransitionGraph,ConstructedPathLearner,ObservedTransformations,LearnedXDActionAtlas};
const rngFrom = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

const SHARED_HOOKS = new WeakMap(); // runtime-only, never placed in an existing .v8 checkpoint
export class Brain {
  // Opt-in experiment: the same saved organism owns and trains its noise policy.
  // No external noise-strength slider instructs this policy where to intervene.
  enableEndogenousNoise() {
    if (!this.noiseAgent) this.noiseAgent = new NoiseAgency(this.seed);
    return this.noiseAgent;
  }
  setSharedObserver(callback) {
    if (callback !== null && typeof callback !== "function") throw Error("shared observer must be a function or null");
    if (callback) SHARED_HOOKS.set(this, callback); else SHARED_HOOKS.delete(this);
  }
  observeShared(e) { SHARED_HOOKS.get(this)?.(e); }
  constructor({rules, c = {}, seed = 11} = {}) {
    this.e = {c: new LeanC(c)}; this.chain = new EmergentChain({...rules, seed}); this.trace = new GraphTrace(); this.field = new LivedField();
    this.precedent = new Precedent(); this.disc = Object.assign(new Discoverer(seed), {body: this.body ||= {}}); this.perspective = new PerspectiveLearner(); this.language = new TextPerspectives({maxStates:85000}); this.constructedPaths = new ConstructedPathLearner({seed}); this.observedTransformations = new ObservedTransformations(); this.xdAtlas = new LearnedXDActionAtlas(); this.past = []; this.chars = 0; this.lived = 0; this.seed = seed; this.mazes = {played: 0, won: 0, recent: [], index: 0, last: null};
    this.revive();
  }
  // determinism ↔ randomness, noise, hallucination: the person's sliders, acting on the living brain itself
  //  ltemp  temperature of what it expects and does while it learns (0 = always the most trusted)
  //  pnoise noise in perception (a perceived past symbol replaced by another lived one) and in acting (a random output)
  //  gnoise / glr / repel: the geometry's noise (random pushes), speed and repulsion; wtemp / ttemp: writing / test
  setControls(c = {}) { const C = this.controls = {ltemp: 0, pnoise: 0, gnoise: 3, glr: .03, repel: .3, wtemp: .6, ttemp: .6, ...(this.controls || {}), ...c};
    for (const k of Object.keys(C)) C[k] = +C[k];
    const g = this.trace.geo; g.neg = Math.round(C.gnoise); g.lr = C.glr; g.repel = C.repel;
    if (this.disc) { this.disc.noise = C.pnoise; this.disc.temp = C.ltemp; } if (this.causal) { this.causal.noise = C.pnoise; }
    return C; }
  revive() {                                                                 // what cannot be saved (the random streams) is reborn
    this.liveWorld = "text";
    this.place = y => this.trace.geo.U.get(y) || [.5, .5, .5, .5, .5]; this.rand = rngFrom(this.seed * 7919 + this.lived);
    this.chain.rand = rngFrom(this.seed + this.lived); this.trace.geo.r = rngFrom(this.seed * 31 + this.lived); this.setControls();
    this.body ||= {}; if (this.disc) this.disc.body = this.body; if (this.causal) this.causal.body = this.body;   // one body for every world
    this.perspective ||= new PerspectiveLearner(); // older checkpoint compatibility
    this.language ||= new TextPerspectives({maxStates:85000});
    this.constructedPaths ||= new ConstructedPathLearner({seed:this.seed}); // native checkpoint compatibility
    this.observedTransformations ||= new ObservedTransformations(); // old checkpoints remain readable
    this.xdAtlas ||= new LearnedXDActionAtlas(); // first-class cross-world transform memory, saved in SAME Brain
  }
  get CTX() { return this.e.c.cap; }
  // Exact original history: same length, order, padding and type; skip
  // per-character Array.from callbacks in the large post-CUDA CPU replay.
  // No cache: every prediction still reads the current living history.
  ctxOf(b, i) {
    const n = this.CTX, out = new Array(n);
    for (let j = 0; j < n; j++) {
      const k = i - j - 1;
      out[j] = k >= 0 ? b[k] : 32;
    }
    return out;
  }
  histOf(b, i) {
    const out = new Array(32);
    for (let j = 0; j < 32; j++) {
      const k = i - j - 1;
      out[j] = k >= 0 ? b[k] : 32;
    }
    return out;
  }
  // text lived on the card: a whole batch of exercises, the aligning graph adds the totals and keeps every exercise
  async learnTextGPU(gpu, exs, onProgress = null) {
    const A = (this.align ||= new AligningGraph()), ask = list => { const p = gpu.call({cmd: "text_learn", exercises: list, trust: A.trustForCard(), g: A.g, formW: A.formW, variants: A.variants(), chunk: gpu.settings?.textChunk || 0}, {onProgress}); p.catch(() => {}); return p; };
    // Node keeps the complete original AligningGraph memory. The CUDA suffix index
    // is a bounded working window, not a second full copy of all devoured text.
    const cardWindow = Math.max(8192, Math.trunc(gpu.info?.textMemoryWindow || 32768));
    if (SYNCED.get(gpu) !== this) { await gpu.call({cmd: "text_load", b64: Buffer.from(A.mem.buf.subarray(Math.max(0, A.mem.n - cardWindow), A.mem.n)).toString("base64")}); SYNCED.set(gpu, this); }
    const t0 = performance.now(), R = await ask(exs), t1 = performance.now(); A.absorb(R, exs);
    const n = exs.reduce((s, e) => s + e.length, 0); this.chars += n; this.exercises = (this.exercises || 0) + exs.length;
    this.textGpu = {batch: exs.length, chars: n, cardMs: +(t1 - t0).toFixed(0), mergeMs: +(performance.now() - t1).toFixed(1), busy: R.busy, vramUsedGB: R.vramUsedGB ?? null, acc: R.seen ? +(R.hits / R.seen).toFixed(4) : null, textChunk: R.textChunk ?? null, cardWindowChars: R.memory ?? null, historyChars: A.mem.n};
    return this.textGpu; }
  live(y, detailed = false, {old = false} = {}) {                                                // one lived symbol, from any world
    if (this.frozen) { this.past.push(y); if (this.past.length > 64) this.past.splice(0, 32); return; }   // a test: perceived, never learned
    const prev = this.past.length ? this.past[this.past.length - 1] : null, al = old ? {guess: -1, src: null} : (this.align ||= new AligningGraph()).live(y, {T: (this.controls || {}).ltemp, noise: (this.controls || {}).pnoise, rand: this.rand});
    if (prev !== null && !old) this.trace.aligned(prev, y, al.guess, al.src);        // in the drawn graph: the alignment it followed, or an impulse where it expected something else
    const {e, chain, trace, past} = this, i = past.length, ctx = this.ctxOf(past, i), C = this.controls || this.setControls(), h0 = this.histOf(past, i);
    const portal = !old && this.liveWorld === "text" && this.noiseAgent ? this.noiseAgent.decide({domain: "text", known: past.length >= 8, planned: !!this.align}) : null;
    let h = C.pnoise ? h0.map(x => (this.rand() < C.pnoise && past.length ? past[Math.floor(this.rand() * past.length)] : x)) : h0;
    if (portal?.site === "perception") h = this.noiseAgent.perceive(h, portal);
    const temperature = portal?.site === "imagination" ? Math.max(C.ltemp, portal.strength) : C.ltemp;
    const m = chain.play(e, ctx, h, false, {temp: temperature});
    if (portal) this.noiseAgent.learn(portal, {correct: argmax(m.out) === y});
    if (!this.full) { chain.learn(h, y, m); e.c.observe(ctx, y); }   // over the memory budget the old graph stops growing; nothing is deleted
    this.field.live(y, this.place);
    trace.record(e, chain, ctx, h, y, m, "c:" + e.c.active, detailed); past.push(y); if (past.length > 64) past.splice(0, 32); this.lived++;
  }
  // talking to it: the conversation in the shape of what it devoured ("Q: …\nA: …"), and it writes the answer symbol by
  // symbol from its own graph (chain.play → chain.pick at temperature T: the same way "Scrie liber" writes on the page).
  // learn = it also lives the words it is told (and its own answer), like any other world; otherwise it only answers.
  chat(history, {T = .6, max = 400, stopBlank = true, learn = false, observePath = false, scanTemperatures = null, seed = (Math.random() * 2 ** 32) >>> 0} = {}) {
    const asc = s => { const o = []; for (const ch of s) { const c = ch.charCodeAt(0); if (c === 13) continue; o.push(c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63); } return o; };
    const prompt = asc(history.map(([who, text]) => (who === "you" ? "Q: " : "A: ") + text + "\n" + (who === "you" ? "" : "\n")).join("") + "A: ");
    if (learn) for (const y of prompt) this.live(y);
    let ans, pathTrace = null, scanPaths = null;
    if (this.align) {
      const r = rngFrom(seed), stop = stopBlank ? (y, o) => y === 10 && o.at(-1) === 10 : null;
      // Observer is purely read-only: the ORIGINAL AligningGraph.write chooses every byte.
      const observer = observePath ? new TextPathObserver(this.trace.geo, {temperature:T,seed,lived:this.lived,geoSteps:this.trace.geo.n}) : null;
      const onStep = observer ? s => observer.capture({...s,trust:p=>this.align.tr(this.align.key(p))}) : null;
      ans = this.align.write(prompt, {max, T, rand:r, stop, ...(onStep ? {onStep} : {})});
      if (observer) pathTrace = observer.result();
      if (observer && Array.isArray(scanTemperatures) && scanTemperatures.length) {
        scanPaths = [];
        // Each temperature sees the identical frozen weights, prompt and RNG sequence.
        // This loop does not call live(), learn() or Geometry.learn().
        const ts = [...new Set(scanTemperatures.filter(x=>Number.isFinite(x) && x>=0 && x<=2).slice(0,7))];
        if (!ts.some(x=>Math.abs(x-T)<1e-7)) ts.push(T);
        for (const probeT of ts) {
          const scanObs = new TextPathObserver(this.trace.geo,{temperature:probeT,seed,lived:this.lived,geoSteps:this.trace.geo.n});
          const sequence = this.align.write(prompt, {max:Math.min(max,350),T:probeT,rand:rngFrom(seed),stop,
            onStep:s=>scanObs.capture({...s,trust:p=>this.align.tr(this.align.key(p))})});
          scanPaths.push({T:probeT,text:String.fromCharCode(...sequence),trace:scanObs.result()});
        }
      }
      if (stopBlank && ans.at(-1) === 10) ans.pop();
    }   // original graph writes; optional observer only measures
  
    else { const out = prompt.slice(), keep = this.chain.rand; ans = []; this.chain.rand = rngFrom(seed);
      for (let k = 0; k < max; k++) { const i = out.length, y = this.chain.pick(this.chain.play(this.e, this.ctxOf(out, i), this.histOf(out, i)).out, T);
        if (stopBlank && y === 10 && ans.at(-1) === 10) { ans.pop(); break; } out.push(y); ans.push(y); }
      this.chain.rand = keep; }
    if (learn) for (const y of [...ans, 10, 10]) this.live(y);
    return {text: String.fromCharCode(...ans), T, seed, lived: this.lived, ...(pathTrace ? {pathTrace} : {}), ...(scanPaths ? {scanPaths} : {})};
  }
  // A learned token/phrase perspective drawn from the SAME native text the Brain
  // lives, not a substituted language demo. Multiple context scales compete on
  // observed accuracy. Goal value is propagated along observed text edges.
  liveLanguage(text) {
    const R=(this.language ||= new TextPerspectives({maxStates:85000})).observe(text);
    const trace=this.trace;
    const L=this.language.report();
    trace.node('lang:world','self','limbaj');
    for(const scale of L.trust){
      const id='lang:perspective:'+scale.scale;
      trace.node(id,'A','limbaj·'+scale.scale);
      trace.setEdge('lang:world',id,'language-scale',
        Math.max(.1,1+2*(scale.accuracy||0)),
        scale.seen+' probe');
    }
    return R;
  }
  testLanguage(text,{maxTokens=2000,seed=11}={}) {
    if(typeof text!=='string')throw Error('A real held-out text passage is required');
    const source=this.language||new TextPerspectives();
    const held=TextPerspectives.restore(source.serialize());
    const prefix=text.trim().split(/\s+/u).slice(0,8).join(' ');
    return {tokenPrediction:held.evaluate(text,{useField:false,limit:maxTokens}),
      fieldPrediction:held.evaluate(text,{useField:true,limit:maxTokens}),
      preActionShape:held.navigate(prefix,{steps:32,useField:true}),
      perspective:held.report(),frozen:true,seed};
  }
  // what the brain expects next, after everything it has lived (the graph's own distribution over the next symbol)
  predict(past = this.past) { const i = past.length; return this.chain.play(this.e, this.ctxOf(past, i), this.histOf(past, i)).out; }
  // the shape of the solution: it writes its next K moves ahead, imagining also what it will perceive after each one,
  // from its own predictions only (nothing it has not lived is read)
  imagine(K) { const past = this.past.slice(), moves = [], pick = (cands) => { const p = this.predict(past); let b = cands[0]; for (const c of cands) if (p[c] > p[b]) b = c; past.push(b); return b; };
    for (let k = 0; k < K; k++) { moves.push(LSYM.act.indexOf(pick(LSYM.act))); pick([LSYM.moved, LSYM.blocked]); for (const d of LSYM.dir) pick(d); pick(LSYM.goal); }
    return moves; }
  playLabyrinth(w, opts) { return playLabyrinth(w, this, opts); }
  // the labyrinths (worlds/labyrinth.mjs, MagicPerspective V16's world): lived with the teacher in training, like
  // reading; the brain's own next symbol is its move, like writing
  // the labyrinths as the whole exercise, nothing explained (worlds/exercise.mjs): it sees the whole exercise, discovers
  // which symbol is itself, what its outputs do, what repels, what attracts, and predicts the whole trajectory
  playMaze(record = true) {
    if (!this.disc) this.disc = Object.assign(new Discoverer(this.seed), {body: this.body ||= {}});
    const M = this.mazes, i = M.index++, w = makeMaze(seedOf(SEEDS.train, i), [7, 9, 11][i % 3]);
    const priorWorld = this.liveWorld; this.liveWorld = 'maze';
    let r;
    try { r = playExercise(w, this.disc, y => this.live(y, this.lived % 50 === 0),
      {record, noiseAgency: this.noiseAgent || null,
        onTransition: t => this.observeShared({domain: 'maze', before: t.before, after: t.after, action: 'output:' + t.action, context: 'grid:' + t.n})}); }
    finally { this.liveWorld = priorWorld; }
    M.played++; M.won += r.solved; M.recent.push(r.solved ? 1 : 0); if (M.recent.length > 100) M.recent.shift(); M.knows = r.knows;
    if (record) M.last = {...r, kind: w.n + "×" + w.n, i};
    this.trainPerspective(w, record);
    this.trainConstructedMaze(w, record);
    return r;
  }
  // Paired complete/masked worlds teach a GENERIC construction operation.
  // The separate blind episode sees only local 5x5 observations; it does not
  // receive world.dist or any privileged complete map at test time.
  trainConstructedMaze(w,record=false) {
    const P=this.constructedPaths ||= new ConstructedPathLearner({seed:this.seed});
    P.trainPair(w,{samples:Math.min(w.n*w.n,24)});
    const old=this.liveWorld;this.liveWorld='maze';
    let r;
    try {
      r=P.navigateBlind(w,{train:true,record,noiseAgent:this.noiseAgent||null,
        live:y=>this.live(y,this.lived%50===0),
        onTransition:t=>this.observeShared({domain:'maze',before:t.before,after:t.after,
          action:t.action,context:t.context})});
    } finally {this.liveWorld=old;}
    return r;
  }
  testConstructedMaze(count=12,seed=73,{record=true}={}) {
    if(!Number.isInteger(count)||count<1||count>80)throw Error('Count 1..80 required');
    const P=this.constructedPaths||new ConstructedPathLearner({seed:this.seed});
    const frozen=Object.assign(Object.create(ConstructedPathLearner.prototype),structuredClone(P));
    frozen.links=Object.assign(Object.create(ConstructedTransitionGraph.prototype),frozen.links);
    frozen.scales=frozen.scales.map(x=>Object.assign(Object.create(ConstructedTransitionGraph.prototype),x));
    const rows=[],full=[];
    for(let i=0;i<count;i++){
      const w=makeMaze(seedOf(SEEDS.test,400000+seed*211+i*103),[7,9,11,13][i%4]);
      rows.push(frozen.navigateBlind(w,{train:false,record:record&&i<2}));
      const direct=frozen.construct(Array.from(w.wall),w.n,w.start,w.goal);
      // Evaluator-only reference for TRUE side-by-side replay. It is returned
      // AFTER blind navigation; it is never an input to the blind policy.
      full.push({n:w.n,optimal:w.dist[w.start],completeViewPath:direct.length,
        seed:w.seed,start:w.start,goal:w.goal,referenceWall:record&&i<2?Array.from(w.wall):undefined});
    }
    const success=rows.filter(r=>r.solved);
    return {count,seed,trainedPairs:P.paired,results:rows,solved:success.length,
      successRate:success.length/rows.length,
      meanStepsToGoal:success.length?success.reduce((n,r)=>n+r.steps,0)/success.length:null,
      initialBlindPathLengths:rows.map(r=>r.firstShapeLength),
      completeViewComparisons:full,frozen:true};
  }
  learnConstructedText(question,answer) {
    return (this.constructedPaths ||= new ConstructedPathLearner({seed:this.seed}))
      .trainText(question,answer);
  }
  // Lived corpus is compared on multiple perspectives: whole sentence states,
  // unchanged contextual anchors, and learned editable positions. The
  // resulting actions belong to THIS original serializable Brain, not a demo.
  learnObservedTransformations(text) {
    const M=this.observedTransformations ||= new ObservedTransformations();
    const before=M.operators.size;
    const result=M.observeText(text);
    if(M.operators.size>before){
      this.trace.node("o:diff-world","A","diferențe observate");
      this.trace.setEdge("o:self","o:diff-world","learned",
        Math.min(8,1+Math.log1p(M.matchingComparisons)));
      const recent=[...M.operators.values()].slice(-4);
      for(const op of recent){
        const id="o:diff:"+[...op.key].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
        this.trace.node(id,"A",(op.from??"∅")+"→"+(op.to??"∅"));
        this.trace.setEdge("o:diff-world",id,"transforms",
          Math.min(8,1+Math.log1p(op.sourceObservations)));
      }
    }
    return result;
  }
  // A frozen evaluation sees only GOAL CONSTRAINTS (tokens that must occur)
  // and an optional observed start; NEVER the complete correct answer.
  planObservedTransformation(goal,{execute=true,trace=false,embodied=false,localPolicy=true}={}) {
    const M=this.observedTransformations ||= new ObservedTransformations();
    const before=M.report();
    const route=M.plan({...goal,recordSearch:trace,maxRecordedStates:240});
    // GOLD line computed before the local cursor moves. Body sees only the
    // learned action model + goal constraints; its own noise agency runs on a
    // FROZEN independent copy to protect ongoing CUDA training.
    const body=embodied&&route.found?M.embody(route,{
      noiseAgent:this.noiseAgent,localPolicy,maxSteps:40}):null;
    const execution=execute&&route.found?M.execute(route,{record:false}):null;
    if(JSON.stringify(M.report())!==JSON.stringify(before))
      throw Error("Frozen transformation evaluation unexpectedly modified learned brain");
    return {...route,execution,body,training:before,frozen:true,
      goalProvidedAsTokens:true,referenceProvided:false,
      verifiedByObservedEffect:!!execution?.verified};
  }
  // The same saved organism moves from one overhead view to local body vision.
  // Initial global map is remembered once; later updates use only sensed patches,
  // the actual action outcome and its learned body->world orientation.
  trainPerspective(w, record = false) {
    const P = this.perspective ||= new PerspectiveLearner();
    const capture = record || P.episodes % 3 === 0;
    const previous = this.liveWorld;
    this.liveWorld = 'maze';
    let result;
    try {
      result = perspectiveEpisode(w, this.disc, P, {
        train: true, record: capture, seed: this.seed * 8191 + P.episodes,
        live: y => this.live(y, this.lived % 50 === 0),
        noiseAgency: this.noiseAgent || null
      });
    } finally { this.liveWorld = previous; }
    if (capture) P.last = result;
    return result;
  }
  // Frozen independent world tests cannot update the Brain or its perspective.
  testPerspective(count = 20, seed = 73) {
    const P = this.perspective ||= new PerspectiveLearner();
    const result = evaluatePerspective(this.disc, P, {count, seed});
    P.test = {seed: result.seed, count: result.count,
      learned: result.learned, control: result.control,
      improvementPoints: result.improvementPoints, explanation: result.explanation};
    return result;
  }
  // ---- many worlds at once on the GPU (gpu/worlds_gpu.py), one brain: the worlds run in parallel with what the brain
  // knew at the start of the batch, then every world's experience is lived by this same brain, one after another ----
  knowsForGpu() { const D = this.disc, s = D.self(); return {self: s, effect: [0, 1, 2, 3, 4, 5, 6, 7].map(o => D.effect(o)), conduct: [0, 1, 2, 3].map(k => D.conduct(k)), attract: [0, 1, 2, 3].map(k => D.attract(k)),
    trust: D.trust, tries: D.tries.slice(), moves: D.world.moves,
      noise: this.noiseAgent ? 0 : D.noise || 0,
      noisePolicy: this.noiseAgent?.gpuPolicy('maze') || null}; }
  // the labyrinths LIVED on the card: the card plays every world of the batch AND works out everything the brain learns
  // from it; the brain only adds the totals (Discoverer.absorb). While it adds them the card is already living the next
  // batch (with what the brain knew a batch earlier). One world per batch is also lived here, symbol by symbol, so the
  // graph sees it and the page can show it.
  async learnMazesGPU(gpu, N, tick = async () => {}) {
    if (!N || N === "auto") N = gpu.info?.autoWorlds || 4096;   // as many as fill the memory it may use
    if (!this.disc) this.disc = Object.assign(new Discoverer(this.seed), {body: this.body ||= {}}); const M = this.mazes;
    const ask = () => { const items = []; for (let k = 0; k < N; k++) { const i = M.index++; items.push({seed: seedOf(SEEDS.train, i), n: [7, 9, 11][i % 3]}); }
      return gpu.call({cmd: "exercise_learn", worlds: items, knows: this.knowsForGpu(), seed: this.seed * 1000 + M.index}); };
    let res; const pending = NEXT.get(this); NEXT.delete(this);
    try { res = pending && pending.gpu === gpu ? await pending.p : await ask(); } catch (err) { if (!pending) throw err; res = await ask(); }
    const p = ask(); p.catch(() => {}); NEXT.set(this, {gpu, p});            // the card starts the next batch now (never saved: it lives only while the card is there)
    await tick("labirinturi: adunate în creier", res.n, res.n);
    const t0 = performance.now(); this.disc.absorb(res.learn);
    // The card actually executed every chosen portal; count its measured
    // physical effects in the SAME persistent organism policy after the batch.
    if (this.noiseAgent && res.noiseEvidence)
      this.noiseAgent.absorbGpu(res.noiseEvidence, 'maze');
    M.played += res.n; M.won += res.solved; const rate = res.solved / res.n; M.recent.push(rate); if (M.recent.length > 100) M.recent.shift();
    const R = res.record, w = makeMaze(R.seed, R.n), copy = Object.assign(Object.create(Discoverer.prototype), structuredClone(this.disc)); copy.r = Object.assign(Object.create(RNG.prototype), copy.r);
    const r = playExercise(w, copy, y => this.live(y, this.lived % 50 === 0), {outputs: R.outputs, record: true, onTransition: t => this.observeShared({domain: 'maze', before: t.before, after: t.after, action: 'output:' + t.action, context: 'grid:' + t.n})}); M.knows = r.knows; M.last = {...r, kind: w.n + "×" + w.n, i: M.index};
    this.trainPerspective(w, true);
    this.trainConstructedMaze(w,true); // paired experience from one real GPU-generated maze
    M.gpu = {batch: res.n, busy: res.busy, noiseChoices: res.noiseEvidence?.counts || null,
      vramUsedGB: res.vramUsedGB ?? null, solved: res.solved, mergeMs: +(performance.now() - t0).toFixed(1), cardMs: +(1000 * (res.busy || 0)).toFixed(1)};
    return M.gpu;
  }
  async playMazesGPU(gpu, N, tick = async () => {}) {   // tick(phase, done, total): the worker shows progress and lets pause/stop in
    if (!this.disc) this.disc = Object.assign(new Discoverer(this.seed), {body: this.body ||= {}}); const M = this.mazes, items = [];
    for (let k = 0; k < N; k++) { const i = M.index++; items.push({i, seed: seedOf(SEEDS.train, i), n: [7, 9, 11][i % 3]}); }
    await tick("labirinturi: pe GPU", 0, N);
    const res = await gpu.call({cmd: "exercise", worlds: items.map(x => ({seed: x.seed, n: x.n})), knows: this.knowsForGpu(), seed: this.seed * 1000 + M.index});
    let differ = 0;
    for (let k = 0; k < items.length; k++) { const x = items[k], w = makeMaze(x.seed, x.n), rec = k === items.length - 1;
      const r = playExercise(w, this.disc, y => this.live(y, this.lived % 50 === 0), {outputs: res.worlds[k].outputs, record: rec, onTransition: t => this.observeShared({domain: 'maze', before: t.before, after: t.after, action: 'output:' + t.action, context: 'grid:' + t.n})});
      if (r.solved !== res.worlds[k].solved) differ++;
      M.played++; M.won += r.solved; M.recent.push(r.solved ? 1 : 0); if (M.recent.length > 100) M.recent.shift(); M.knows = r.knows; if (rec) M.last = {...r, kind: w.n + "×" + w.n, i: x.i};
      if (k % 16 === 15) await tick("labirinturi: trăite de creier", k + 1, N); }
    M.gpu = {batch: N, busy: res.busy, vramUsedGB: res.vramUsedGB ?? null, differ}; return M.gpu;
  }
  async playTransformsGPU(gpu, N, tick = async () => {}) {
    this.tWorld(); const T = this.trans, kinds = [["object"], ["self"], ["door"]], levels = [];
    while (levels.length < N) { const L = makeLevel(TSEEDS.train + T.index * 7919, {goals: kinds[T.index % 3]}); T.index++; if (L) levels.push(L); if (L && levels.length % 32 === 0) await tick("transformări: lumi generate", levels.length, N); }
    const frozen = Object.assign(Object.create(CausalOrganism.prototype), structuredClone(this.causal)); frozen.r = Object.assign(Object.create(RNG.prototype), frozen.r);
    const still = [0, 1, 2, 3, 4, 5, 6, 7].find(o => !this.tMoves.includes(o));          // an output the world ignores, for worlds that are done
    let boards = (await gpu.call({cmd: "t_reset", levels: levels.map(L => ({n: L.n, terr: L.terr, self: L.self, boxes: L.boxes})), moves: this.tMoves})).boards;
    const lives = levels.map(L => ({steps: [], done: false, said: null, lim: 4 * (L.optimal || 20) + 40, tries: frozen.tries.slice()})), match = (b, g) => g.every((v, i) => v === 17 || v === b[i]);
    let busy = 0, vram = null;
    while (lives.some(x => !x.done)) {
      const outs = levels.map((L, k) => { const x = lives[k]; if (x.done) return still;
        if (match(boards[k], L.goal) || x.steps.length >= x.lim) { x.done = true; return still; }
        frozen.tries = x.tries;
        // Each real CUDA-physics transform step gets an independent choice from
        // the SAME organism-owned policy, not a fixed human noise slider.
        const portal = this.noiseAgent?.decide({domain:'transform',
          known:frozen.findSelf(boards[k])>=0,
          planned:frozen.moves().length>=4}) || null;
        const sensed=portal?.site==='perception' ?
          this.noiseAgent.perceive(boards[k],portal) : boards[k];
        const c=frozen.choose(sensed,L.n,L.goal);
        if(c.how==='limitation'){x.done=true;x.said='limitation';return still;}
        if(portal && (portal.site==='action'||portal.site==='imagination')){
          const alt=portal.site==='imagination'?frozen.moves():null;
          const output=this.noiseAgent.output(c.o,8,portal,alt);
          if(output!==c.o){c.o=output;c.how='noise';}
        }
        x.tries[c.o]++;                                                    // each world keeps its own count of what it has tried
        x.steps.push({b: boards[k], at: c.at, o: c.o,portal}); return c.o; });
      if (lives.every(x => x.done)) break;
      const acted = levels.map((L, k) => !lives[k].done);
      const r = await gpu.call({cmd: "t_step", outputs: outs}); busy += r.busy; vram = r.vramUsedGB ?? vram;
      levels.forEach((L, k) => { if (acted[k]) lives[k].steps.at(-1).a = r.boards[k]; }); boards = r.boards;
      await tick("transformări: decizii (pas " + Math.max(...lives.map(x => x.steps.length)) + ")", lives.filter(x => x.done).length, N);
    }
    for (let k = 0; k < levels.length; k++) { const L = levels[k], x = lives[k], live = y => this.live(TSYM[y], this.lived % 50 === 0);   // the same brain lives every world's experience
      for (const v of x.steps[0]?.b || []) live(v); for (const v of L.goal) live(v);
      for (const s of x.steps) { if (!s.a) continue;
        if(s.portal)this.noiseAgent.learn(s.portal,{before:s.b,after:s.a,
          solved:match(s.a,L.goal)});
        this.causal.learn(s.b, s.a, L.n, this.causal.findSelf(s.b), s.o);
        this.observeShared({domain: 'transform', before: s.b, after: s.a, action: 'output:' + s.o, context: 'grid:' + L.n});
        live(18 + s.o); for (let i = 0; i < s.a.length; i++) if (s.a[i] !== s.b[i]) live(s.a[i]); }
      const solved = match(boards[k], L.goal); T.played++; T.won += solved;
      if (k === levels.length - 1) T.last = {solved, steps: x.steps.length, optimal: L.optimal, said: x.said, n: L.n, terr: L.terr, goal: L.goal, goals: L.goals, i: T.index - 1,
        frames: [...x.steps.map(s => ({b: s.b, how: s.portal?.site || 'original',
          noiseStrength: s.portal?.strength ?? 0})), {b: boards[k]}]};
      if (k % 16 === 15) await tick("transformări: trăite de creier", k + 1, N); }
    T.gpu = {batch: N, busy, vramUsedGB: vram,
      organismNoise: this.noiseAgent ? {choices: this.noiseAgent.total,
        sites: {...this.noiseAgent.bySite}} : null}; return T.gpu;
  }
  // the exam to watch: after training, a frozen copy of what it discovered plays unseen labyrinths from small to large;
  // every exercise is recorded with the whole trajectory it predicted BEFORE its first move (shapes[0]) and as it went
  examMazes(sizes = [7, 9, 11, 13, 15, 17, 19, 21, 25, 31], per = 1, seed = (Math.random() * 2 ** 31) >>> 0, {T = 0, noise = 0, onTransition = null} = {}) {   // new unseen labyrinths every time
    if (!this.disc) this.disc = Object.assign(new Discoverer(this.seed), {body: this.body ||= {}}); const out = [];
    for (const n of sizes) for (let k = 0; k < per; k++) { const c = Object.assign(Object.create(Discoverer.prototype), structuredClone(this.disc)); c.r = Object.assign(Object.create(RNG.prototype), c.r);
      c.r = new RNG((Math.random() * 2 ** 31) >>> 0); c.temp = T; c.noise = noise;   // the world comes from the seed; its own draws are new every time          // its own exploration draws differently every exam; the person's temperature and noise
      const w = makeMaze(seedOf(SEEDS.test, 100000 + (seed % 1000000) * 13 + n * 101 + k), n), r = playExercise(w, c, () => {}, {record: true,
        onTransition: t => onTransition?.({domain: "maze", before: t.before, after: t.after, action: "output:" + t.action, context: "grid:" + t.n})});
      out.push({n, k, solved: r.solved, steps: r.steps, optimal: r.optimal, first: r.first, path: r.path, shapes: r.shapes, wall: r.wall, start: r.start, goal: r.goal, knows: r.knows, how: r.how}); }
    const D = this.disc;   // what it knows when the exam starts: why a perfect shape may still not be walked
    return {played: this.mazes.played, seed, mazes: out, mind: {trust: D.trust, effects: [0, 1, 2, 3, 4, 5, 6, 7].map(o => D.effect(o)), self: D.self(), moves: D.world.moves, gpu: this.mazes.gpu || null}};
  }
  // ---- evaluation on what it never lived (the Evaluare tab; run on the CPU, on a copy loaded from the save) ----
  // whole unseen exercises, smallest to largest: the question is read, the answer guessed symbol by symbol, at the
  // temperature and noise chosen; each one scored on its answer (the solution) and on all of it
  evalTextExercises(list, {T = 0, noise = 0, seed = (Math.random() * 2 ** 32) >>> 0} = {}) {
    const rand = rngFrom(seed), out = [];
    for (const ex of list.slice().sort((a, b) => a.length - b.length)) {
      let a0 = 0; for (let i = 0; i < ex.length - 2; i++) if (ex[i] === 10 && ex[i + 1] === 65 && ex[i + 2] === 58) { a0 = i + 3; break; }
      const rows = []; let ok = 0, aok = 0, an = 0, top = 0;
      this.align.readFrozen(ex, (i, y, g, d) => { let b = 32, bv = -1; for (const [c, v] of d) if (v > bv) { bv = v; b = c; } rows.push([y, g]); ok += g === y; top += b === y; if (i >= a0) { aok += g === y; an++; } }, {T, noise, rand});
      let old = 0, oa = 0; for (let i = 0; i < ex.length; i++) { const g = argmax(this.chain.play(this.e, this.ctxOf(ex, i), this.histOf(ex, i)).out); if (i >= a0) old += g === ex[i], oa++; }
      // the shape of the solution, before it is seen: from the question alone it writes the whole answer
      const shape = a0 ? this.align.write(ex.slice(0, a0), {max: Math.min(3000, ex.length - a0 + 40), T, rand, stop: (y, o) => y === 10 && o.at(-1) === 10}) : [];
      let same = 0; for (let i = 0; i < Math.min(shape.length, ex.length - a0); i++) same += shape[i] === ex[a0 + i];
      // Separate learned state/action WORLD, rather than the next-character
      // AligningGraph. Its paths are constructed from the QUESTION only.
      // The held-out answer is consulted only AFTER inference, for scoring.
      let constructed=null,constructedAccuracy=null;
      if(a0&&this.constructedPaths?.textRows){
        const q=String.fromCharCode(...ex.slice(0,a0)).replace(/^\s*Q:\s*/,'').replace(/\nA:\s*$/,'').trim();
        const planned=this.constructedPaths.imagineText(q,{maxChars:Math.min(20000,ex.length-a0+40),beamWidth:3});
        let hits=0;
        for(let i=0;i<Math.min(planned.predicted.length,ex.length-a0);i++)
          hits+=+(planned.predicted.charCodeAt(i)===ex[a0+i]);
        constructedAccuracy=an?hits/an:null;
        constructed={predicted:planned.predicted,steps:planned.path.length,
          firstUnseenAction:planned.path[0]?.action??null,
          macroBoundaries:planned.wordOrSentenceBoundaries,
          contextGraphStates:planned.graphStates,finished:planned.finished,
          trace:planned.path.slice(0,120),beforeAnswer:true};
      }
      out.push({n: ex.length, a0, all: ok / ex.length, answer: an ? aok / an : null, best: top / ex.length, oldAnswer: oa ? old / oa : null, rows,
        shape: String.fromCharCode(...shape), shapeSame: an ? same / an : null,
        constructed,constructedAccuracy}); }
    const av = k => { const v = out.filter(x => x[k] != null); return v.length ? v.reduce((s, x) => s + x[k], 0) / v.length : null; };
    return {T, noise, seed, exercises: out, answer: av("answer"), all: av("all"), oldAnswer: av("oldAnswer"),
      constructedAccuracy:av("constructedAccuracy")};
  }
  evalText(bytes, max = 3000) {                                              // frozen: every next symbol guessed from what came before, on text it never lived
    const {e, chain} = this, H = bytes.slice(0, max), rows = []; let live = 0, c = 0;
    for (let i = 0; i < H.length; i++) { const ctx = this.ctxOf(H, i), h = this.histOf(H, i), y = H[i], L = chain.play(e, ctx, h).out, g = argmax(L), gc = argmax(distC(e.c, ctx));
      live += g === y; c += gc === y; rows.push([y, g, +L[y].toFixed(3)]); }
    let aligned = null; if (this.align) { const old = rows.map(r => r[1]); aligned = this.align.readFrozen(H, (i, y, g) => { rows[i][1] = g; rows[i][3] = old[i]; }); }
    return {n: H.length, live: live / H.length, C: c / H.length, aligned, rows};   // rows: [symbol, aligned graph's guess (or old graph's), p old, old graph's guess]
  }
  evalTransforms(count = 12, impossible = 4, seed = (Math.random() * 2 ** 31) >>> 0, {noise = 0, onTransition = null} = {}) {   // new unseen configurations every time                                // desired configurations of kinds it never encountered, and impossible ones, from the first attempt
    this.tWorld(); const kinds = [["object", "self"], ["self", "door"], ["object", "door"]], out = [], copy = () => { const c = Object.assign(Object.create(CausalOrganism.prototype), structuredClone(this.causal)); c.r = new RNG((Math.random() * 2 ** 31) >>> 0); c.noise = noise; return c; };   // its own draws differ every evaluation
    const one = (L, imp) => { const r = liveTask(L, new TWorld(L, this.tMoves), copy(), {record: true, onTransition});
      out.push({impossible: imp, goals: L.goals, n: L.n, goal: L.goal, optimal: L.optimal ?? null, solved: r.solved, steps: r.steps, said: r.said, predicted: r.predicted, failed: r.failed, frames: r.frames.map(f => ({b: f.b, how: f.how}))}); };
    const base = 3000000 + (seed % 100000) * 104729;
    for (let i = 0, k = 0; k < count && i < count * 20; i++) { const L = makeLevel(TSEEDS.test + base + i * 7919, {goals: kinds[i % 3]}); if (L) { one(L, false); k++; } }
    for (let i = 0, k = 0; k < impossible && i < impossible * 40; i++) { const L = makeLevel(TSEEDS.test + base + 1900000 + i * 7919, {goals: [["object"], ["self"]][i % 2], impossible: true}); if (L) { one(L, true); k++; } }
    return {played: this.trans.played, seed, tasks: out};
  }
  // frozen test on exercises it never saw (V16's test seeds, sizes 7, 9, 11): a copy of what it discovered plays them
  // A frozen *copy* of the learned policy can act on unseen worlds. It never
  // learns during evaluation and never alters the original policy or its RNG.
  frozenNoiseAgency() {
    if (!this.noiseAgent) return null;
    const N = Object.assign(Object.create(NoiseAgency.prototype), structuredClone(this.noiseAgent));
    N.frozenChoices = {none: 0, perception: 0, imagination: 0, action: 0};
    const choose = N.decide.bind(N);
    N.decide = context => { const d = choose(context); N.frozenChoices[d.site]++; return d; };
    return N;
  }
  testMazes(count = 30, {autonomousNoise = false} = {}) {
    if (!this.disc) this.disc = Object.assign(new Discoverer(this.seed), {body: this.body ||= {}});
    const frozenNoise = autonomousNoise ? this.frozenNoiseAgency() : null;
    const rows = []; for (let i = 0; i < count; i++) { const c = Object.assign(Object.create(Discoverer.prototype), structuredClone(this.disc)); c.r = Object.assign(Object.create(RNG.prototype), c.r);
      rows.push(playExercise(makeMaze(seedOf(SEEDS.test, i), [7, 9, 11][i % 3]), c,
        undefined, {noiseAgency: frozenNoise, noiseFeedback: false})); }
    const ok = rows.filter(r => r.solved), av = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    return this.mazes.test = {n: count, solved: av(rows.map(r => r.solved ? 1 : 0)), ratio: av(ok.map(r => r.steps / r.optimal)), shape: av(rows.map(r => r.first)),
      frozenNoiseChoices: frozenNoise?.frozenChoices || null};
  }
  // the transformation world (worlds/transform.mjs, worlds/causal.mjs): objects, switches, doors, desired configurations;
  // the same brain lives every intervention as symbols; the causal loop learns P(S'|S, do(a)) and imagines its way
  tWorld() { if (!this.causal) { this.causal = Object.assign(new CausalOrganism(this.seed), {body: this.body ||= {}}); const r = new RNG(this.seed * 2654435761 + 7), o = [0, 1, 2, 3, 4, 5, 6, 7];
      for (let i = 7; i > 0; i--) { const j = r.int(i + 1); [o[i], o[j]] = [o[j], o[i]]; } this.tMoves = o.slice(0, 4); this.trans = {played: 0, won: 0, index: 0, test: null, last: null}; } }
  playTransform(record = true) {
    this.tWorld(); const T = this.trans, kinds = [["object"], ["self"], ["door"]]; let L = null;
    while (!L) { L = makeLevel(TSEEDS.train + T.index * 7919, {goals: kinds[T.index % 3]}); T.index++; }
    const w = new TWorld(L, this.tMoves), live = y => this.live(TSYM[y], this.lived % 50 === 0);
    const priorWorld = this.liveWorld; this.liveWorld = 'transform';
    try {
      for (const v of w.board()) live(v); for (const v of L.goal) live(v);                // the board and the desired configuration, as symbols
    const agent = {org: this.causal, choose: (b, n, g) => this.causal.choose(b, n, g), learn: (b, a, n, at, o) => { this.causal.learn(b, a, n, at, o); this.observeShared({domain: 'transform', before: b, after: a, action: 'output:' + o, context: 'grid:' + n}); live(18 + o); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) live(a[i]); }};
      const r = liveTask(L, w, agent, {record, noiseAgency: this.noiseAgent || null}); T.played++; T.won += r.solved;
      if (record) T.last = {...r, terr: L.terr, goal: L.goal, goals: L.goals, i: T.index - 1, frames: r.frames.map(f => ({b: f.b, how: f.how, plan: f.plan}))};
      return r;
    } finally { this.liveWorld = priorWorld; }
  }
  testTransforms(count = 24, {autonomousNoise = false} = {}) {                                                // new arrangements, desired configurations of kinds never encountered, and impossible ones
    const frozenNoise = autonomousNoise ? this.frozenNoiseAgency() : null;
    this.tWorld(); const kinds = [["object", "self"], ["self", "door"], ["object", "door"]], rows = [], imp = [], copy = () => { const c = Object.assign(Object.create(CausalOrganism.prototype), structuredClone(this.causal)); c.r = Object.assign(Object.create(RNG.prototype), c.r); return c; };
    for (let i = 0; rows.length < count; i++) { const L = makeLevel(TSEEDS.test + i * 7919, {goals: kinds[i % 3]}); if (L) rows.push(liveTask(L, new TWorld(L, this.tMoves), copy(),
      {noiseAgency: frozenNoise, noiseFeedback: false})); }
    for (let i = 0; imp.length < 8; i++) { const L = makeLevel(TSEEDS.test + 500000 + i * 7919, {goals: [["object"], ["self"]][i % 2], impossible: true}); if (L) imp.push(liveTask(L, new TWorld(L, this.tMoves), copy(),
      {noiseAgency: frozenNoise, noiseFeedback: false})); }
    const av = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null, ok = rows.filter(r => r.solved), pred = rows.reduce((s, r) => s + r.predicted, 0);
    return this.trans.test = {n: count, solved: av(rows.map(r => r.solved ? 1 : 0)), ratio: av(ok.map(r => r.steps / r.optimal)), failedRate: pred ? rows.reduce((s, r) => s + r.failed, 0) / pred : null,
      impossible: imp.length, saidLimitation: imp.filter(r => r.said).length,
      frozenNoiseChoices: frozenNoise?.frozenChoices || null, knows: {self: this.causal.selfKinds.size, moves: this.causal.moves().length, rules: this.causal.rules.size}};
  }
  test(textBytes) {                                                          // frozen, on text it never lived
    const {e, chain} = this, H = textBytes; let c = 0, live = 0, masked = 0, bits = 0, N = 0, fld = 0, tog = 0, tbits = 0; const F = this.field.read(H, this.place);
    for (let i = 4; i < H.length; i++, N++) { const ctx = this.ctxOf(H, i), h = this.histOf(H, i), y = H[i], L = chain.play(e, ctx, h).out, p = F[i];
      c += argmax(distC(e.c, ctx)) === y; live += argmax(L) === y; masked += argmax(chain.play(e, ctx, h, true).out) === y; bits -= Math.log2(L[y]);
      const T = p ? L.map((v, j) => .5 * v + .5 * p[j]) : L; fld += p ? argmax(p) === y : 0; tog += argmax(T) === y; tbits -= Math.log2(Math.max(1e-9, T[y])); }
    const aligned = this.align ? this.align.readFrozen(H.slice(4)) : null;   // the aligning graph, frozen, on the same unseen text
    return {C: c / N, live: live / N, masked: masked / N, bits: bits / N, field: fld / N, together: tog / N, tbits: tbits / N, n: N, aligned};
  }
  // the organism in its own graph: itself (the symbol its outputs move, in every world), its body (what each output does),
  // what attracts and what repels it (learned in the labyrinths), drawn as nodes and links of the same graph
  organismView() { const T = this.trace, S = [1, 2, 3, 4], O = [5, 6, 7, 8, 11, 12, 14, 15]; T.node("o:self", "self", "eu");
    const D = this.disc; if (D) { const me = D.self(); if (me >= 0) { T.node("s:" + S[me], "sym", "◆"); T.setEdge("o:self", "s:" + S[me], "is", 3); }
      for (let k = 0; k < 4; k++) { if (k === me) continue; const a = D.attract(k), c = D.conduct(k); T.node("s:" + S[k], "sym", "◆");
        if (a > .2) T.setEdge("o:self", "s:" + S[k], "attract", 1 + 4 * a); if (c < .5) T.setEdge("o:self", "s:" + S[k], "repel", 1 + 4 * (1 - c)); } }
    if (this.causal) for (const k of this.causal.selfKinds) { const y = TSYM[k]; if (y !== undefined) { T.node("s:" + y, "sym", "◆"); T.setEdge("o:self", "s:" + y, "is", 2); } }
    for (let o = 0; o < 8; o++) { const e = bodyEffect(this.body, o) || D?.effect(o); if (!e) continue; T.node("s:" + O[o], "sym", "▶" + o); T.setEdge("s:" + O[o], "o:self", "moves", 3, (e[0] > 0 ? "→" : e[0] < 0 ? "←" : e[1] > 0 ? "↓" : "↑")); }
    // Visualize *real* internal noise decisions as owned connections in the
    // SAME native living graph, not as invented random standalone particles.
    if (this.noiseAgent) {
      T.node("o:noise", "self", "noise");
      T.setEdge("o:self", "o:noise", "owns", 3);
      for (const [site, count] of Object.entries(this.noiseAgent.bySite)) {
        if (count <= 0) continue;
        const id = "o:noise:" + site;
        T.node(id, "A", site);
        T.setEdge("o:noise", id, "portal", Math.min(12, 1 + Math.log1p(count)), "" + count + " decisions");
      }
    }
  }
  planEvidenceGatedTextRoute(start,required,{maxSteps=8,maxExpanded=6000}={}){
    // Exact original stored operators, with optional RESEARCH bridge evidence;
    // original strict actor is unchanged and not bypassed silently.
    return evidenceGatedTextRoute(this.observedTransformations,
      {start,required,maxSteps,maxExpanded});
  }
  // Each XD exercise exposes a FULL finite graph before any action. Only
  // action effects learned from earlier physical interventions may label it.
  // The atlas is part of THIS native Brain.v8 checkpoint (not an external
  // demo or an untracked browser graph).
  liveCompleteXDWorld({dimensions=64,seed=this.seed+101,
    physicsSeed=17,heldoutSeed=seed+99001}={}){
    const train=new CompleteXDWorld({dimensions,seed,physicsSeed});
    const learned=this.xdAtlas.trainWorld(train);
    const heldout=new CompleteXDWorld({dimensions,seed:heldoutSeed,physicsSeed});
    const frozen=this.xdAtlas.testFrozen(heldout);
    return {training:learned,heldout:frozen,
      realExposedFiniteTopology:true,heldoutNoInterventions:true,
      sharedBrainCheckpoint:true,ambientDimensions:dimensions,
      activeRank:train.axes,
      limitations:"7 active bits in a complete 128-state finite maze; not all 2^D hypercube states."};
  }
  beginExercise() { (this.align ||= new AligningGraph()).begin(); }          // a new exercise of a world starts: its own memory starts empty
  dissolve() {                                                               // solve: rows lived only once are let go
    let gone = 0; const drop = m => { for (const [k, v] of m) if (typeof v === "number") { m.delete(k); gone++; } };
    for (const m of Object.values(this.e.c.models)) drop(m.entries); for (const A of this.chain.A) for (const wi of A.wires) drop(wi.rows); return gone;
  }
  // ---- saving: the whole brain, every class restored, the random streams reborn ----
  save(file) {
    const dropped = [], seen = new Set();
    const walk = o => { if (!o || typeof o !== "object" || seen.has(o) || ArrayBuffer.isView(o)) return; seen.add(o);
      const name = Object.getPrototypeOf(o)?.constructor?.name; if (CLASSES[name] && o.__cls !== name) Object.defineProperty(o, "__cls", {value: name, enumerable: true, writable: true, configurable: true});
      if (o instanceof Map) { for (const [k, v] of o) { walk(k); walk(v); } return; }
      if (Array.isArray(o)) { if (o.length && typeof o[0] !== "object") return; for (const v of o) walk(v); return; }
      for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === "function") { dropped.push([o, k, v]); delete o[k]; } else walk(v); } };
    walk(this); const keep = [];
    try { const buf = v8.serialize({brain: {...this}, cls: "Brain"}); fs.mkdirSync(fileDir(file), {recursive: true}); fs.writeFileSync(file + ".tmp", buf); fs.renameSync(file + ".tmp", file); return buf.length; }
    finally { for (const [o, k, v] of dropped) o[k] = v; }
  }
  static load(file) {
    const data = v8.deserialize(fs.readFileSync(file)), seen = new Set();
    const fix = o => { if (!o || typeof o !== "object" || seen.has(o) || ArrayBuffer.isView(o)) return; seen.add(o);
      if (o.__cls && CLASSES[o.__cls]) Object.setPrototypeOf(o, CLASSES[o.__cls].prototype);
      if (o instanceof Map) { for (const [k, v] of o) { fix(k); fix(v); } return; }
      if (Array.isArray(o)) { if (o.length && typeof o[0] !== "object") return; for (const v of o) fix(v); return; }
      for (const k of Object.keys(o)) fix(o[k]); };
    fix(data.brain); const b = Object.setPrototypeOf(data.brain, Brain.prototype); b.revive(); return b;
  }
}
const NEXT = new WeakMap(), SYNCED = new WeakMap();   // the batch the card is already living; which brain's memory the card holds   // the batch the card is already living, per brain
const TSYM = [0, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127, 5, 6, 7, 8, 11, 12, 14, 15];   // transformation world: 18 board symbols (never in text), then the same 8 output symbols as the exercise
const fileDir = f => f.replace(/[\\/][^\\/]*$/, "") || ".";
export {MAZE_SYMBOLS};

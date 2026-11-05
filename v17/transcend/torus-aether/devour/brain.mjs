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
import {Precedent, playMaze, MAZE_SYMBOLS} from "../worlds/maze.mjs";
import {playLabyrinth, LSYM, makeMaze, seedOf, SEEDS, RNG} from "../worlds/labyrinth.mjs";
import {Discoverer, playExercise} from "../worlds/exercise.mjs";
import {CausalOrganism, liveTask} from "../worlds/causal.mjs";
import {makeLevel, TWorld, TSEEDS} from "../worlds/transform.mjs";
import {DEFAULT_CONTROLS, normalizeControls} from "./stochastic-controls.mjs";

const CLASSES = {LeanC, SparseCounter, EmergentChain, EmergentA, Wire, Trust, EventClock, Geometry, LivedField, MomentSpace, GraphTrace, Precedent, Discoverer, RNG, CausalOrganism};
const rngFrom = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

export class Brain {
  constructor({rules, c = {}, seed = 11} = {}) {
    this.e = {c: new LeanC(c)}; this.chain = new EmergentChain({...rules, seed}); this.trace = new GraphTrace(); this.field = new LivedField();
    this.precedent = new Precedent(); this.disc = new Discoverer(seed); this.past = []; this.chars = 0; this.lived = 0; this.seed = seed; this.mazes = {played: 0, won: 0, recent: [], index: 0, last: null};
    this.revive();
  }
  setControls(next = {}) {                                                     // changes apply to the SAME real learner, without resetting its weights
    this.controls = normalizeControls(next, this.controls || DEFAULT_CONTROLS);
    if (this.trace?.geo) Object.assign(this.trace.geo, {neg: this.controls.gnoise, lr: this.controls.glr, repel: this.controls.repel, thr: this.controls.cthr});
    return {...this.controls};
  }
  revive() {                                                                 // what cannot be saved (the random streams) is reborn
    this.place = y => this.trace.geo.U.get(y) || [.5, .5, .5, .5, .5]; this.rand = rngFrom(this.seed * 7919 + this.lived);
    this.chain.rand = rngFrom(this.seed + this.lived); this.trace.geo.r = rngFrom(this.seed * 31 + this.lived);
    this.setControls(this.controls || DEFAULT_CONTROLS);
  }
  get CTX() { return this.e.c.cap; }
  ctxOf(b, i) { return Array.from({length: this.CTX}, (_, j) => (i - j - 1 >= 0 ? b[i - j - 1] : 32)); }
  histOf(b, i) { return Array.from({length: 32}, (_, j) => (i - j - 1 >= 0 ? b[i - j - 1] : 32)); }
  live(y, detailed = false) {                                                // one lived symbol, from any world
    if (this.frozen) { this.past.push(y); if (this.past.length > 64) this.past.splice(0, 32); return; }   // a test: perceived, never learned
    const {e, chain, trace, past} = this, i = past.length, ctx = this.ctxOf(past, i), h = this.histOf(past, i);
    // Corrupt only the organism\'s historical perception, not the true label, corpus or held-out evaluator.
    if (this.controls.pnoise && past.length) for (let k = 0; k < h.length; k++) if (this.rand() < this.controls.pnoise) h[k] = past[Math.floor(this.rand() * past.length)];
    const m = chain.play(e, ctx, h, false, {temp: this.controls.ltemp});
    chain.learn(h, y, m); e.c.observe(ctx, y); this.field.live(y, this.place);
    trace.record(e, chain, ctx, h, y, m, "c:" + e.c.active, detailed); past.push(y); if (past.length > 64) past.splice(0, 32); this.lived++;
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
    if (!this.disc) this.disc = new Discoverer(this.seed);
    const M = this.mazes, i = M.index++, w = makeMaze(seedOf(SEEDS.train, i), [7, 9, 11][i % 3]);
    const r = playExercise(w, this.disc, y => this.live(y, this.lived % 50 === 0), {record});
    M.played++; M.won += r.solved; M.recent.push(r.solved ? 1 : 0); if (M.recent.length > 100) M.recent.shift(); M.knows = r.knows;
    if (record) M.last = {...r, kind: w.n + "×" + w.n, i};
    return r;
  }
  // ---- many worlds at once on the GPU (gpu/worlds_gpu.py), one brain: the worlds run in parallel with what the brain
  // knew at the start of the batch, then every world's experience is lived by this same brain, one after another ----
  knowsForGpu() { const D = this.disc, s = D.self(); return {self: s, effect: [0, 1, 2, 3, 4, 5, 6, 7].map(o => D.effect(o)), conduct: [0, 1, 2, 3].map(k => D.conduct(k)), attract: [0, 1, 2, 3].map(k => D.attract(k)),
    trust: D.trust, tries: D.tries.slice(), moves: D.world.moves}; }
  async playMazesGPU(gpu, N, tick = async () => {}) {
    if (!this.disc) this.disc = new Discoverer(this.seed); const M = this.mazes, items = [];
    for (let k = 0; k < N; k++) { const i = M.index++; items.push({i, seed: seedOf(SEEDS.train, i), n: [7, 9, 11][i % 3]}); }
    await tick("labirinturi: pe GPU", 0, N);
    const res = await gpu.call({cmd: "exercise", worlds: items.map(x => ({seed: x.seed, n: x.n})), knows: this.knowsForGpu(), seed: this.seed * 1000 + M.index});
    let differ = 0;
    for (let k = 0; k < items.length; k++) { const x = items[k], w = makeMaze(x.seed, x.n), rec = k === items.length - 1;
      const r = playExercise(w, this.disc, y => this.live(y, this.lived % 50 === 0), {outputs: res.worlds[k].outputs, record: rec});
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
        frozen.tries = x.tries; const c = frozen.choose(boards[k], L.n, L.goal); if (c.how === "limitation") { x.done = true; x.said = "limitation"; return still; }
        x.tries[c.o]++;                                                    // each world keeps its own count of what it has tried
        x.steps.push({b: boards[k], at: c.at, o: c.o}); return c.o; });
      if (lives.every(x => x.done)) break;
      const acted = levels.map((L, k) => !lives[k].done);
      const r = await gpu.call({cmd: "t_step", outputs: outs}); busy += r.busy; vram = r.vramUsedGB ?? vram;
      levels.forEach((L, k) => { if (acted[k]) lives[k].steps.at(-1).a = r.boards[k]; }); boards = r.boards;
      await tick("transformări: decizii (pas " + Math.max(...lives.map(x => x.steps.length)) + ")", lives.filter(x => x.done).length, N);
    }
    for (let k = 0; k < levels.length; k++) { const L = levels[k], x = lives[k], live = y => this.live(TSYM[y], this.lived % 50 === 0);   // the same brain lives every world's experience
      for (const v of x.steps[0]?.b || []) live(v); for (const v of L.goal) live(v);
      for (const s of x.steps) { if (!s.a) continue; this.causal.learn(s.b, s.a, L.n, this.causal.findSelf(s.b), s.o); live(18 + s.o); for (let i = 0; i < s.a.length; i++) if (s.a[i] !== s.b[i]) live(s.a[i]); }
      const solved = match(boards[k], L.goal); T.played++; T.won += solved;
      if (k === levels.length - 1) T.last = {solved, steps: x.steps.length, optimal: L.optimal, said: x.said, n: L.n, terr: L.terr, goal: L.goal, goals: L.goals, i: T.index - 1,
        frames: [...x.steps.map(s => ({b: s.b})), {b: boards[k]}]};
      if (k % 16 === 15) await tick("transformări: trăite de creier", k + 1, N); }
    T.gpu = {batch: N, busy, vramUsedGB: vram}; return T.gpu;
  }
  // frozen test on exercises it never saw (V16's test seeds, sizes 7, 9, 11): a copy of what it discovered plays them
  testMazes(count = 30) {
    if (!this.disc) this.disc = new Discoverer(this.seed);
    const rows = []; for (let i = 0; i < count; i++) { const c = Object.assign(Object.create(Discoverer.prototype), structuredClone(this.disc)); c.r = Object.assign(Object.create(RNG.prototype), c.r);
      rows.push(playExercise(makeMaze(seedOf(SEEDS.test, i), [7, 9, 11][i % 3]), c)); }
    const ok = rows.filter(r => r.solved), av = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    return this.mazes.test = {n: count, solved: av(rows.map(r => r.solved ? 1 : 0)), ratio: av(ok.map(r => r.steps / r.optimal)), shape: av(rows.map(r => r.first))};
  }
  // the transformation world (worlds/transform.mjs, worlds/causal.mjs): objects, switches, doors, desired configurations;
  // the same brain lives every intervention as symbols; the causal loop learns P(S'|S, do(a)) and imagines its way
  tWorld() { if (!this.causal) { this.causal = new CausalOrganism(this.seed); const r = new RNG(this.seed * 2654435761 + 7), o = [0, 1, 2, 3, 4, 5, 6, 7];
      for (let i = 7; i > 0; i--) { const j = r.int(i + 1); [o[i], o[j]] = [o[j], o[i]]; } this.tMoves = o.slice(0, 4); this.trans = {played: 0, won: 0, index: 0, test: null, last: null}; } }
  playTransform(record = true) {
    this.tWorld(); const T = this.trans, kinds = [["object"], ["self"], ["door"]]; let L = null;
    while (!L) { L = makeLevel(TSEEDS.train + T.index * 7919, {goals: kinds[T.index % 3]}); T.index++; }
    const w = new TWorld(L, this.tMoves), live = y => this.live(TSYM[y], this.lived % 50 === 0);
    for (const v of w.board()) live(v); for (const v of L.goal) live(v);                // the board and the desired configuration, as symbols
    const agent = {org: this.causal, choose: (b, n, g) => this.causal.choose(b, n, g), learn: (b, a, n, at, o) => { this.causal.learn(b, a, n, at, o); live(18 + o); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) live(a[i]); }};
    const r = liveTask(L, w, agent, {record}); T.played++; T.won += r.solved;
    if (record) T.last = {...r, terr: L.terr, goal: L.goal, goals: L.goals, i: T.index - 1, frames: r.frames.map(f => ({b: f.b, how: f.how, plan: f.plan}))};
    return r;
  }
  testTransforms(count = 24) {                                                // new arrangements, desired configurations of kinds never encountered, and impossible ones
    this.tWorld(); const kinds = [["object", "self"], ["self", "door"], ["object", "door"]], rows = [], imp = [], copy = () => { const c = Object.assign(Object.create(CausalOrganism.prototype), structuredClone(this.causal)); c.r = Object.assign(Object.create(RNG.prototype), c.r); return c; };
    for (let i = 0; rows.length < count; i++) { const L = makeLevel(TSEEDS.test + i * 7919, {goals: kinds[i % 3]}); if (L) rows.push(liveTask(L, new TWorld(L, this.tMoves), copy())); }
    for (let i = 0; imp.length < 8; i++) { const L = makeLevel(TSEEDS.test + 500000 + i * 7919, {goals: [["object"], ["self"]][i % 2], impossible: true}); if (L) imp.push(liveTask(L, new TWorld(L, this.tMoves), copy())); }
    const av = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null, ok = rows.filter(r => r.solved), pred = rows.reduce((s, r) => s + r.predicted, 0);
    return this.trans.test = {n: count, solved: av(rows.map(r => r.solved ? 1 : 0)), ratio: av(ok.map(r => r.steps / r.optimal)), failedRate: pred ? rows.reduce((s, r) => s + r.failed, 0) / pred : null,
      impossible: imp.length, saidLimitation: imp.filter(r => r.said).length, knows: {self: this.causal.selfKinds.size, moves: this.causal.moves().length, rules: this.causal.rules.size}};
  }
  test(textBytes) {                                                          // frozen, on text it never lived
    const {e, chain} = this, H = textBytes; let c = 0, live = 0, masked = 0, bits = 0, N = 0, fld = 0, tog = 0, tbits = 0; const F = this.field.read(H, this.place);
    for (let i = 4; i < H.length; i++, N++) { const ctx = this.ctxOf(H, i), h = this.histOf(H, i), y = H[i], L = chain.play(e, ctx, h).out, p = F[i];
      c += argmax(distC(e.c, ctx)) === y; live += argmax(L) === y; masked += argmax(chain.play(e, ctx, h, true).out) === y; bits -= Math.log2(L[y]);
      const T = p ? L.map((v, j) => .5 * v + .5 * p[j]) : L; fld += p ? argmax(p) === y : 0; tog += argmax(T) === y; tbits -= Math.log2(Math.max(1e-9, T[y])); }
    return {C: c / N, live: live / N, masked: masked / N, bits: bits / N, field: fld / N, together: tog / N, tbits: tbits / N, n: N};
  }
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
const TSYM = [0, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127, 5, 6, 7, 8, 11, 12, 14, 15];   // transformation world: 18 board symbols (never in text), then the same 8 output symbols as the exercise
const fileDir = f => f.replace(/[\\/][^\\/]*$/, "") || ".";
export {MAZE_SYMBOLS};

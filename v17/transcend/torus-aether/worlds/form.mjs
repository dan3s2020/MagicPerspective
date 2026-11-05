// THE FORM OF THE SOLUTION AS PART OF ITSELF (2026-11-05, verbatim: "nu trebuie să calculeze toate posibilitățile ...
// trebuie doar să învețe suficient încât să înțeleagă cum funcționează transformările/acțiunile/mișcările în joc și să
// înțeleagă care e forma soluției, fiind parte din el; restul lumii doar se aranjează în forma soluției").
// The same discoveries as the causal loop (worlds/causal.mjs: who it is, what its outputs do, the rewrite rules it saw),
// but no search over sequences of actions. From its rules it understands, as relations inside itself:
//   ENTER  a symbol it can step into (and what it becomes standing there, and what stays when it leaves);
//   PUSH   a symbol that moves ahead when it walks into it, and what it becomes in the cell it is pushed into;
//   CAUSE  stepping into (or pushing something into) a symbol changes other symbols elsewhere (glob); REVERT: leaving
//          it undoes that change.
// The desired configuration is held as a field: every cell that is not yet as desired attracts what can make it so
// (itself, an object, a cause), through what lets through; a barrier that a cause can change passes the attraction on
// to that cause (as far as it costs to bring the cause about). At each step it does only the one transformation, among
// those it understands, that brings the world closest to the form inside it; the rest of the world arranges itself.
// When some part of the form can be produced by nothing it understands, and nothing it does not understand is left to
// try, it says so (a limitation), without having searched.
import {CausalOrganism} from "./causal.mjs";
import {ANY} from "./transform.mjs";

const INF = 1e6;
export class FormOrganism extends CausalOrganism {
  // ---- what it understands, read from its own rules ----
  roles() {
    if (this._rolesAt === this.rules.size + this.selfKinds.size) return this._roles; this._rolesAt = this.rules.size + this.selfKinds.size;
    const enter = new Map(), stay = new Map(), push = new Map(), causeEnter = new Map(), causeLeave = new Map(), causePush = new Map(), blocked = new Set(), obs = [], globPairs = new Set();
    for (const [key, m] of this.rules) { if (key.endsWith("?") || key[0] === "x") continue; const k = key.split("|")[1].split(",").map(Number);
      let best = null, bc = 0; for (const [sig, c] of m) if (sig[0] === "{" && c > bc) { bc = c; best = sig; } if (!best) continue; const R = JSON.parse(best); obs.push({k, R});
      for (const [a, b] of R.glob) globPairs.add(a + ">" + b); }
    for (const {k, R} of obs) {
      if (!R.moved) { if (!R.glob.length) blocked.add(k[1] + "," + k[2]); continue; }
      enter.set(k[1], R.loc[1]); if (R.loc[0] !== null) stay.set(k[0], R.loc[0]);
      // pushed: the cell ahead changed in a way no cause explains (a door changing in front of it is a cause, not a push)
      const pushed = R.loc[2] !== null && R.loc[2] !== k[2] && k[2] >= 0 && !globPairs.has(k[2] + ">" + R.loc[2]);
      if (pushed) { let p = push.get(k[1]); if (!p) push.set(k[1], p = new Map()); p.set(k[2], R.loc[2]); }
      const changes = R.glob.slice(); if (!pushed && R.loc[2] !== null && k[2] >= 0 && R.loc[2] !== k[2]) changes.push([k[2], R.loc[2]]);
      for (const [a, b] of changes) { const into = pushed ? causePush : causeEnter, sym = pushed ? R.loc[2] : k[1];
        let c = into.get(a + ">" + b); if (!c) into.set(a + ">" + b, c = new Set()); c.add(sym); } }
    // a change undone when it LEAVES a cause: seen b>a exactly when it stepped off the cell whose entering made a>b
    for (const [ab, causes] of causeEnter) { const [a, b] = ab.split(">"); for (const X of causes) { const on = enter.get(X);
      if (on !== undefined && obs.some(({k, R}) => R.moved && k[0] === on && R.glob.some(([x, y]) => x === +b && y === +a))) { let r = causeLeave.get(ab); if (!r) causeLeave.set(ab, r = new Set()); r.add(X); } } }
    // only real causes: entering it changes that thing (or toggles it back) most times it entered it, not a step that happened to coincide
    const entered = new Map(), changed = new Map();
    for (const {k, R} of obs) { if (!R.moved) continue; entered.set(k[1], (entered.get(k[1]) || 0) + 1);
      const ch = new Set(R.glob.map(([a, b]) => [a, b].sort().join("~"))); for (const c of ch) changed.set(k[1] + "|" + c, (changed.get(k[1] + "|" + c) || 0) + 1); }
    for (const [ab, causes] of causeEnter) { const pair = ab.split(">").sort().join("~"); for (const X of [...causes]) if ((changed.get(X + "|" + pair) || 0) < .5 * (entered.get(X) || 1)) causes.delete(X); if (!causes.size) causeEnter.delete(ab); }
    for (const [ab, Xs] of causeLeave) { for (const X of [...Xs]) if (!causeEnter.get(ab)?.has(X)) Xs.delete(X); if (!Xs.size) causeLeave.delete(ab); }
    return this._roles = {enter, stay, push, causeEnter, causeLeave, causePush, blocked};
  }
  // ---- the form inside it: how far the world is from it, through what it understands ----
  potential(b, n, goal) {
    const R = this.roles(), at = this.findSelf(b); if (at < 0) return INF;
    const N = b.length, nb = i => { const x = i % n, y = (i / n) | 0, o = []; if (x > 0) o.push(i - 1); if (x < n - 1) o.push(i + 1); if (y > 0) o.push(i - n); if (y < n - 1) o.push(i + n); return o; };
    // what is open only because it stands on a cause that undoes itself when it leaves: for its own way, that is closed
    const held = new Map(); for (const [ab, Xs] of R.causeLeave) { const [a0, b0] = ab.split(">").map(Number); for (const X of Xs) if (R.enter.get(X) === b[at]) held.set(b0, a0); }
    const sym = v => (held.has(b[v]) ? held.get(b[v]) : b[v]), walk = v => R.enter.has(sym(v)) || v === at;
    // plain distances for itself from a cell, through what it can enter
    const plain = new Map(), field = from => { if (plain.has(from)) return plain.get(from); const d = new Float64Array(N).fill(INF), q = [from]; d[from] = 0;
      for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of nb(u)) if (d[v] >= INF && (walk(v) || (u === at && R.enter.has(b[v])))) { d[v] = d[u] + 1; q.push(v); } } plain.set(from, d); return d; };   // what it holds open, it can still step into right now
    const me = field(at);
    // an object's way to a cell, pushed, with itself behind it; returns the cost and where itself ends
    const objWay = (from, to) => { const into = R.push.get(b[from]); if (!into) return null; const d = new Float64Array(N).fill(INF), pr = new Int32Array(N).fill(-1), q = [from]; d[from] = 0;
      for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of nb(u)) { const back = 2 * u - v; if (d[v] < INF || back < 0 || back >= N || Math.abs((back % n) - (u % n)) + Math.abs(((back / n) | 0) - ((u / n) | 0)) !== 1) continue;
          if (!into.has(b[v]) && v !== to) continue; if (!walk(back) && back !== from) continue; d[v] = d[u] + 1; pr[v] = u; q.push(v); } }
      if (d[to] >= INF) return null; let first = to; while (pr[first] !== from && pr[first] >= 0) first = pr[first];
      const behind = 2 * from - first; if (behind < 0 || behind >= N || me[behind] >= INF) return null;
      return {cost: me[behind] + d[to], end: pr[to]}; };
    // a barrier a cause can change into something it can enter: the cheapest way to bring the cause about, and where it is then
    const openers = new Map(), opener = s0 => { if (openers.has(s0)) return openers.get(s0); const ways = []; let hold = null, step = null, pushW = null;
      for (const [ab, causes] of R.causeEnter) { const [a, bb] = ab.split(">").map(Number); if (a !== s0 || !R.enter.has(bb)) continue;
        const holds = !R.causeLeave.has(ab);          // a cause that holds when it leaves opens it for good; one that undoes itself, only for the step taken from it
        for (let i = 0; i < N; i++) if (causes.has(b[i]) && me[i] < INF) { if (holds) { if (!hold || me[i] < hold.cost) hold = {cost: me[i], end: i}; } else ways.push({cost: me[i], end: i, adjacentOnly: true}); } }
      for (const [ab, made] of R.causePush) { const [a, bb] = ab.split(">").map(Number); if (a !== s0 || !R.enter.has(bb)) continue;                    // or something pushed onto it
        for (const [obj, into] of R.push) for (const [tgt, res] of into) if (made.has(res)) for (let i = 0; i < N; i++) if (b[i] === obj) for (let j = 0; j < N; j++) if (b[j] === tgt) { const w = objWay(i, j); if (w && (!pushW || w.cost < pushW.cost)) pushW = w; } }
      if (hold) ways.push(hold); if (pushW) ways.push(pushW); openers.set(s0, ways); return ways; };
    // its distances, with barriers passed through their causes: to the barrier = bring the cause about + from there to the barrier
    const d = Float64Array.from(me);
    for (let v = 0; v < N; v++) { if (walk(v) || R.push.has(sym(v))) continue;
      for (const o of opener(sym(v))) { if (o.adjacentOnly) { if (nb(o.end).includes(v) && o.cost + 1 < d[v]) d[v] = o.cost + 1; continue; }
        const f = field(o.end); let near = INF; for (const u of nb(v)) near = Math.min(near, f[u]); if (near < INF && o.cost + near + 1 < d[v]) d[v] = o.cost + near + 1; } }
    const q = []; for (let v = 0; v < N; v++) if (d[v] < INF) q.push(v); q.sort((x, y) => d[x] - d[y]);
    for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of nb(u)) if ((walk(v) || (u === at && R.enter.has(b[v]))) && d[u] + 1 < d[v]) { d[v] = d[u] + 1; q.push(v); } }
    if (this.debug) this.debug({openers: [...openers].map(([k, v]) => [k, v]), d: Array.from(d).map(x => x >= INF ? -1 : x), me: Array.from(me).map(x => x >= INF ? -1 : x)});
    let total = 0, wrong = 0;
    for (let g = 0; g < N; g++) { const s = goal[g]; if (s === ANY || b[g] === s) continue; wrong++; let c = INF;
      if (this.selfKinds.has(s)) c = d[g];                                              // itself is desired there
      for (const [obj, into] of R.push) for (const [tgt, res] of into) if (res === s) for (let i = 0; i < N; i++) if (b[i] === obj) { const w = objWay(i, g); if (w) c = Math.min(c, w.cost); }   // an object becomes it there
      for (const [ab, causes] of R.causeEnter) { const [a, bb] = ab.split(">").map(Number); if (bb !== s || b[g] !== a || R.causeLeave.has(ab)) continue;   // a cause changes it there
        for (let i = 0; i < N; i++) if (causes.has(b[i])) c = Math.min(c, me[i]); }
      for (const [ab, made] of R.causePush) { const [a, bb] = ab.split(">").map(Number); if (bb !== s || b[g] !== a) continue;
        for (const [obj, into] of R.push) for (const [tgt, res] of into) if (made.has(res)) for (let i = 0; i < N; i++) if (b[i] === obj) for (let j = 0; j < N; j++) if (b[j] === tgt) { const w = objWay(i, j); if (w) c = Math.min(c, w.cost); } }
      for (const [ab, Xs] of R.causeLeave) { const [a, bb] = ab.split(">").map(Number); if (bb !== s || b[g] !== a) continue;   // held open by standing on its cause (enough if the form wants only that)
        for (let i = 0; i < N; i++) for (const X of Xs) if (b[i] === X && R.causeEnter.get(a + ">" + bb)?.has(X)) c = Math.min(c, me[i]); }
      total += c; }
    return wrong ? total + 3 * wrong : 0;
  }
  // ---- one step: the transformation it understands that brings the world closest to the form; alive (not always the same) ----
  choose(b, n, goal) {
    const at = this.findSelf(b), M = this.moves();
    if (this.noise && this.r.next() < this.noise) return {o: this.r.int(8), how: "noise", at};
    if (at < 0 || M.length < 4) return super.choose(b, n, goal);              // it does not know yet who it is or what it can do
    const key = b.join(","); this.visits ||= new Map(); this.visits.set(key, (this.visits.get(key) || 0) + 1);
    const here = this.potential(b, n, goal), opts = [];
    for (const o of M) { const p = this.predict(b, n, at, o);
      if (!p) { opts.push({o, v: here - .5, how: "curious"}); continue; }      // a consequence it has never seen: worth seeing
      const v = this.potential(p.b, n, goal) + 2 * (this.visits.get(p.b.join(",")) || 0) + (p.b.join(",") === key ? 1 : 0); opts.push({o, v, how: "form"}); }
    const bestV = Math.min(...opts.map(x => x.v));
    if (here >= INF && bestV >= INF && !opts.some(x => x.how === "curious")) { this.stuck = (this.stuck || 0) + 1; if (this.stuck > 2 * n) return {o: null, how: "limitation", at}; }
    else this.stuck = 0;
    const T = this.temp ?? .15, w = opts.map(x => Math.exp(-(x.v - bestV) / Math.max(1e-6, T))); let z = w.reduce((a, c) => a + c, 0), r = this.r.next() * z;
    for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return {o: opts[i].o, how: opts[i].how, at}; }
    return {o: opts[0].o, how: opts[0].how, at};
  }
  learn(before, after, n, at, o, goal) { super.learn(before, after, n, at, o); }
  // a new task: what it visited in the last one does not matter any more
  begin() { this.visits = new Map(); this.stuck = 0; }
}

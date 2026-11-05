// ENTANGLED A/B in text — the repo's own definition (CONCEPTS/COMPLEMENTARY_COUPLED_ORGANISMS.md,
// docs/SAME_DISH_ENTANGLED_AB_V1.md) carried from the 2D dish into the text medium:
//   - A and B stay independent: separate learners, no weight/state/table sharing, no reward message;
//   - one shared medium: the text stream;
//   - each sees only the OTHER's observable behaviour = the byte the other is about to type (its motor intent,
//     produced by its own uncoupled path), never the other's tables, never the true byte;
//   - the OTHER channel can be MASKED with the same frozen parameters; only a held-out LIVE advantage counts.
// Roles bootstrap from what each already is: B (hierarchical) seeks the target byte, A (bit cells) has almost
// no knowledge of its own, so its coupled table learns the resistance = where and how B's intent fails.
// The canonical learners A and B inside TextExperiment are untouched; each entangled organism wraps one of them
// and adds its own OTHER-conditioned table.
import {distA, distB, distC} from "./torus.mjs";

const N = 128, ALPHA = 0.05;
const argmax = v => { let k = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[k]) k = i; return k; };
const rowDist = row => { const v = new Array(N); let s = 0; for (let i = 0; i < N; i++) { v[i] = row.val[i] + ALPHA; s += v[i]; } return v.map(x => x / s); };
export const MASK = -1;

class Table {
  constructor() { this.rows = new Map(); }
  row(k) { return this.rows.get(k); }
  add(k, y) { let r = this.rows.get(k); if (!r) { r = {n: 0, val: new Array(N).fill(0)}; this.rows.set(k, r); } r.val[y]++; r.n++; }
}

export class EntangledPair {
  constructor({min = 2} = {}) { this.min = min; this.A = new Table(); this.B = new Table(); }
  // observable intents: what each organism shows before the byte is known (own uncoupled path)
  intents(e, ctx) { return {a: e.a.predict(ctx), b: e.b.predict(ctx)}; }
  // A's belief: own bit cells, re-read through B's visible intent when the channel is live and experienced
  beliefA(e, ctx, bIntent) {
    const r = bIntent === MASK ? null : this.A.row(ctx[0] + "|" + bIntent);
    return r && r.n >= this.min ? rowDist(r) : distA(e.a, ctx);
  }
  // B's belief: own hierarchy, re-read through A's visible intent
  beliefB(e, ctx, aIntent) {
    const r = aIntent === MASK ? null : this.B.row(ctx[1] + "," + ctx[0] + "|" + aIntent);
    return r && r.n >= this.min + 1 ? rowDist(r) : distB(e.b, ctx);
  }
  // after the byte is revealed: each organism learns what the other's visible behaviour meant here
  learn(ctx, y, {a, b}) { this.A.add(ctx[0] + "|" + b, y); this.B.add(ctx[1] + "," + ctx[0] + "|" + a, y); }
  stats() { return {A: this.A.rows.size, B: this.B.rows.size}; }
}
// COMPLEMENTARY roles, as in Same-Dish (A seeks the target, the other explores resistance; contact never merges):
// resolution order inside one step, like the dish's alternating joint step:
//   1. B shows its intent b (own hierarchy, sees nothing of A);
//   2. A sees b and shows its counter-intent a*: A's table learns ONLY from B's rejected intents (y != b),
//      i.e. "when B wants b here and is wrong, what is really there" — the resistance B runs into;
//   3. B sees a* and how firmly A shows it, and re-reads by learned trust (when does A's answer beat my own b).
// Each table is private to its organism; only the shown bytes cross.
// seeker "B" (default) or "C": the same dance with C as the target seeker — C shows, A explores C's
// rejections, C re-reads A. C's own learning (engine.mjs) is never touched; only its shown byte and belief are read.
export class ComplementaryPair {
  constructor({min = 2, word = true, seeker = "B"} = {}) {
    Object.assign(this, {min, word, seeker}); this.A = new Table(); this.trust = new Map();
  }
  seekShow(e, ctx) { return this.seeker === "C" ? e.c.predict(ctx) : e.b.predict(ctx); }
  seekDist(e, ctx) { return this.seeker === "C" ? distC(e.c, ctx) : distB(e.b, ctx); }
  // A's own perception of the medium: the whole word being typed (all already-written bytes, up to 12),
  // a part of the stream no 4-byte window of B or C reaches. Falls back to the last two bytes.
  keyA(ctx, b, word) { return (word && this.word ? "w:" + word : ctx[1] + "," + ctx[0]) + "|" + b; }
  keyB(ctx, b, a) { return ctx[0] + "|" + b + "|" + a; }
  beliefA(e, ctx, bIntent, word) { // fine (word) row first, coarse (2 bytes) row when the word is new
    const r = bIntent === MASK ? null : this.A.row(this.keyA(ctx, bIntent, word)) || this.A.row(this.keyA(ctx, bIntent, null));
    return r && r.n >= this.min ? rowDist(r) : distA(e.a, ctx);
  }
  // B re-reads A by trust: it sees A's shown byte and how firmly A shows it (the magnitude of the intent vector,
  // as in the dish), compares with how firmly it holds its own b, and learns from outcomes how often each wins.
  trustKey(pB, b, aShow) {
    const q = x => Math.min(9, Math.floor(x * 10));
    return aShow ? q(pB[b]) + "|" + q(aShow.firm) + "|" + Number(aShow.a === b) : q(pB[b]) + "|-";
  }
  beliefB(e, ctx, bIntent, aShow) {
    const pB = this.seekDist(e, ctx); if (!aShow) return pB;
    const t = this.trust.get(this.trustKey(pB, bIntent, aShow));
    if (!t || t.n < 30) return pB;
    // outcome shares: y==b, y==a, other (other keeps B's own shape outside b and a)
    let sB = (t.b + 1) / (t.n + 3), sA = (t.a + 1) / (t.n + 3); const sO = 1 - sB - sA;
    if (aShow.a === bIntent) { sB += sA; sA = 0; }
    let rest = 0; for (let i = 0; i < N; i++) if (i !== bIntent && i !== aShow.a) rest += pB[i];
    const out = new Array(N);
    for (let i = 0; i < N; i++) out[i] = i === bIntent ? sB : i === aShow.a ? sA : sO * pB[i] / rest;
    return out;
  }
  // the three moves of one step; masked=true cuts the OTHER channel both ways
  play(e, ctx, masked = false, word = null) {
    const b = this.seekShow(e, ctx);
    const pa = this.beliefA(e, ctx, masked ? MASK : b, word), a = argmax(pa);
    const ownRow = !masked && (this.A.row(this.keyA(ctx, b, word)) || this.A.row(this.keyA(ctx, b, null)));
    const shows = ownRow && ownRow.n >= this.min;
    const aShow = masked || !shows ? null : {a, firm: pa[a]};
    const pb = this.beliefB(e, ctx, b, aShow);
    return {b, a, pa, pb, aShow, pB: this.seekDist(e, ctx), word};
  }
  learn(ctx, y, {b, a, aShow, pB, word}) {
    if (y !== b) { this.A.add(this.keyA(ctx, b, null), y); if (word && this.word) this.A.add(this.keyA(ctx, b, word), y); } // A lives on B's rejections
    if (aShow) { const k = this.trustKey(pB, b, aShow); let t = this.trust.get(k);
      if (!t) { t = {n: 0, b: 0, a: 0}; this.trust.set(k, t); } t.n++; t.b += y === b; t.a += y === aShow.a && aShow.a !== b; }
  }
  stats() { return {A: this.A.rows.size, trust: this.trust.size}; }
}
export {argmax};

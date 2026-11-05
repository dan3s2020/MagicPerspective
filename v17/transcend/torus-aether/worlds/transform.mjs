// THE TRANSFORMATION WORLD (the experiment described in the MagicPerspective conversation, 2026-11-05):
// "a world containing movable objects, barriers, switches, and a target configuration. Don't tell it what a door or a
//  switch means. Let it perform interventions and discover that some changes persist, others reverse, and some alter
//  which future actions become possible. Then introduce a desired final configuration it has never encountered."
// Everything the organism receives is raw symbols with no names: the board (one symbol per cell), the desired
// configuration (the same symbols, plus one symbol for "any"), and the 8 outputs it can emit (4 do something, unknown
// which and what; 4 do nothing). This file is the world's physics and the observer's oracle; the organism never reads it.
//   floor, wall · a movable object (pushed when walked into, if the cell beyond is free) · two kinds of switch:
//   a PLATE (opens its doors only while something stands on it — the change REVERSES when it is left) and a LEVER
//   (stepping on it toggles its doors — the change PERSISTS) · doors that are barriers when closed and passable when open
//   (an occupied door never closes) — so switches ALTER WHICH FUTURE ACTIONS BECOME POSSIBLE.
import {RNG} from "./labyrinth.mjs";

const T = {floor: 0, wall: 1, plate: 2, lever: 3, doorP: 4, doorL: 5};      // terrain (world's own names, never shown)
export const NK = 18, ANY = 17;                                              // board symbols 0..16, 17 = "any" in a desired configuration
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
// what a cell shows: one raw symbol for every (terrain, occupant, door state) combination that can exist
const SHOW = (t, occ, open) => {
  if (t === T.wall) return 1;
  if (t === T.floor) return occ === 1 ? 2 : occ === 2 ? 3 : 0;
  if (t === T.plate) return occ === 1 ? 5 : occ === 2 ? 6 : 4;
  if (t === T.lever) return occ === 1 ? 8 : 7;
  if (t === T.doorP) return !open ? 9 : occ === 1 ? 11 : occ === 2 ? 12 : 10;
  if (t === T.doorL) return !open ? 13 : occ === 1 ? 15 : occ === 2 ? 16 : 14;
};
export class TWorld {
  constructor(level, moves) { Object.assign(this, structuredClone({n: level.n, terr: level.terr, self: level.self, boxes: level.boxes, lever: false})); this.moves = moves; this.goal = level.goal; this.steps = 0; }
  occ(i) { return i === this.self ? 1 : this.boxes.includes(i) ? 2 : 0; }
  doorOpen(t, i) { if (this.occ(i)) return true;                             // an occupied door never closes
    if (t === T.doorP) return this.terr.some((tt, j) => tt === T.plate && this.occ(j)); return t === T.doorL ? this.lever : true; }
  passable(i) { const t = this.terr[i]; return t !== T.wall && !((t === T.doorP || t === T.doorL) && !this.doorOpen(t, i)); }
  board() { const n = this.n, b = new Array(n * n); for (let i = 0; i < n * n; i++) { const t = this.terr[i]; b[i] = SHOW(t, this.occ(i), t === T.doorP || t === T.doorL ? this.doorOpen(t, i) : false); } return b; }
  step(output) {                                                             // the world's physics: output 0..7
    this.steps++; const dir = this.moves.indexOf(output); if (dir < 0) return;
    const n = this.n, nx = (i, d) => { const x = i % n + DIRS[d][0], y = ((i / n) | 0) + DIRS[d][1]; return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x; };
    const c1 = nx(this.self, dir); if (c1 < 0 || !this.passable(c1)) return;
    const bi = this.boxes.indexOf(c1);
    if (bi >= 0) { const c2 = nx(c1, dir); if (c2 < 0 || !this.passable(c2) || this.boxes.includes(c2) || this.terr[c2] === T.lever) return; this.boxes[bi] = c2; }
    this.self = c1; if (this.terr[c1] === T.lever) this.lever = !this.lever;
  }
  reached() { const b = this.board(); return this.goal.every((g, i) => g === ANY || g === b[i]); }
}
// the oracle (observer only): shortest number of moves to the desired configuration with the true physics, or null
export function oracle(level, cap = 400000) {
  const w = new TWorld(level, [0, 1, 2, 3]), key = w => w.self + "|" + w.boxes.slice().sort((a, b) => a - b).join(",") + "|" + (w.lever ? 1 : 0);
  const seen = new Map([[key(w), 0]]), q = [w];
  for (let h = 0; h < q.length && seen.size < cap; h++) { const s = q[h], d = seen.get(key(s)); if (s.reached()) return d;
    for (let a = 0; a < 4; a++) { const t = Object.assign(Object.create(TWorld.prototype), s, {boxes: s.boxes.slice()}); t.step(a); const k = key(t); if (!seen.has(k)) { seen.set(k, d + 1); q.push(t); } } }
  return seen.size >= cap ? undefined : null;                               // null = impossible (whole space searched)
}
// ---- levels: a room cut by a wall with doors; switches, objects and a desired configuration on either side ----
// goal kinds: "object" (an object on a cell), "self" (itself on a cell beyond a door), "door" (a door left open),
// and combinations; training uses single kinds, the test uses combinations it has never encountered
export function makeLevel(seed, {goals = ["object"], impossible = false} = {}) {
  const r = new RNG(seed); for (let attempt = 0; attempt < 400; attempt++) {
    const n = 7 + 2 * r.int(2), terr = new Array(n * n).fill(T.floor), at = (x, y) => y * n + x;
    for (let i = 0; i < n; i++) { terr[at(i, 0)] = terr[at(i, n - 1)] = terr[at(0, i)] = terr[at(n - 1, i)] = T.wall; }
    const c = 3 + r.int(n - 5); for (let y = 1; y < n - 1; y++) terr[at(c, y)] = T.wall;
    const free = (x0, x1) => { const out = []; for (let y = 1; y < n - 1; y++) for (let x = x0; x <= x1; x++) if (terr[at(x, y)] === T.floor) out.push(at(x, y)); return out; };
    const hasP = r.next() < .6 || goals.includes("self") && r.next() < .5, hasL = !hasP || r.next() < .5;
    const rows = [1 + r.int(n - 2), 1 + r.int(n - 2)];
    if (hasP) terr[at(c, rows[0])] = T.doorP; if (hasL) terr[at(c, rows[1] === rows[0] && hasP ? (rows[0] % (n - 2)) + 1 : rows[1])] = T.doorL;
    for (let k = 0; k < Math.floor(n * n * .04); k++) { const L = free(1, c - 1), i = L[r.int(L.length)]; if (i !== undefined && r.next() < .7) terr[i] = T.wall; }
    const left = () => { const L = free(1, c - 1); return L[r.int(L.length)]; }, right = () => { const L = free(c + 1, n - 2); return L[r.int(L.length)]; };
    if (hasP) terr[left()] = T.plate; if (hasL) terr[left()] = T.lever;
    const self = left(), boxes = []; for (let b = 0; b < 1 + r.int(2); b++) { const i = left(); if (i !== self && !boxes.includes(i) && terr[i] === T.floor) boxes.push(i); }
    if (!boxes.length) continue;
    const level = {n, terr, self, boxes, goal: new Array(n * n).fill(ANY), goals};
    const w0 = new TWorld(level, [0, 1, 2, 3]);
    for (const g of goals) {
      if (g === "object") { const i = r.next() < .5 ? left() : right(); level.goal[i] = terr[i] === T.plate ? 6 : terr[i] === T.floor ? 3 : ANY; }
      if (g === "self") { const i = right(); level.goal[i] = 2; }
      if (g === "door") { const d = terr.findIndex(t => t === T.doorL || t === T.doorP); if (d >= 0) level.goal[d] = terr[d] === T.doorL ? 14 : 10; }
    }
    if (level.goal.every(g => g === ANY) || w0.reached()) continue;
    const o = oracle(level); if (o === undefined) continue;
    if (impossible ? o === null : o !== null && o >= 3) { level.optimal = o; return level; }
  }
  return null;
}
export const TSEEDS = {train: 7000003, test: 9000011};

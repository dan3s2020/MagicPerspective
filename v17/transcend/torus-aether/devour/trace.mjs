// The living graph of a devouring graph, kept beside its training (the same bookkeeping the living-graph page does
// when it trains in the browser): symbols born from the world, C's perspectives born when C acts through them, A's
// perceptions born by budding, edges born from what happened and fading when it stops, every symbol's place on the
// 5-torus learned from the stream (concepts.mjs Geometry), the aether that just flowed, and the text just lived.
// snapshot() is what the page draws and navigates.
import {Geometry} from "../concepts.mjs";
import {argmax} from "../emergent.mjs";

const ch = c => c === 32 ? "␣" : c === 10 ? "⏎" : String.fromCharCode(c);   // the exercise speaks in raw symbols with no meaning given
const cLabel = id => { const [k, m] = id.split(":"); let pos = ""; for (let i = 0; i < 4; i++) if (+m & (1 << i)) pos += i + 1; return "C·" + k[0].replace("c", "k") + pos; };

export class GraphTrace {
  constructor() {
    this.nodes = new Map(); this.edges = new Map(); this.geo = new Geometry({D: 5, every: 20000}); this.flow = []; this.text = [];
    this.strip = []; this.hitC = 0; this.hitF = 0; this.seen = 0; this.steps = 0;
  }
  node(id, type, label) { let n = this.nodes.get(id); if (!n) { n = {id, type, label, act: 1, born: this.steps}; this.nodes.set(id, n); } return n; }
  edge(a, b, kind, dw) { const k = a + ">" + b; let x = this.edges.get(k); if (!x) { x = {a, b, kind, w: 0}; this.edges.set(k, x); } x.w += dw; }
  fire(id) { const n = this.nodes.get(id); if (n) n.act = 1; }
  // called after the graph learned byte y (m = what the chain played before seeing it)
  record(e, chain, ctx, h, y, m, cWire, detailed) {
    this.steps++; this.geo.learn(ctx[0], y); this.text.push(y); if (this.text.length > 120000) this.text.splice(0, 20000);
    const cByte = m.seq[0].byte, fin = argmax(m.out);
    this.seen++; this.hitC += cByte === y; this.hitF += fin === y;
    this.node("s:" + y, "sym", ch(y)); if (this.nodes.has("s:" + ctx[0])) this.edge("s:" + ctx[0], "s:" + y, "world", .2);
    this.node(cWire, "C", cLabel(cWire.slice(2))); if (cByte === y) this.edge(cWire, "s:" + y, "see", .3);
    const A = chain.A[0];
    for (const w of A.wires) { const id = "a:" + w.id; if (!this.nodes.has(id)) { this.node(id, "A", "A·" + (w.kind === "exact" ? w.L : w.kind[0] + w.L));
      if (w.parent) this.edge("a:" + w.parent.id, id, "bud", 2); } }
    if (detailed) {                                                          // the costly part only now and then
      this.fire("s:" + y); this.fire(cWire); let best = null, bw = 0;
      for (const w of A.wires) { if (w.silent) continue; const d = w.dist(h, cByte); if (!d) continue; const k = argmax(d);
        if (k === y) { this.edge("a:" + w.id, "s:" + y, "feel", .6 * 50); this.fire("a:" + w.id); if (d[k] > bw) { bw = d[k]; best = w; } } }
      if (best && cByte !== y && fin === y) this.edge("a:" + best.id, cWire, "trust", 2 * 50);
      this.flow.push([ctx[0], y]); if (this.flow.length > 120) this.flow.shift();
      this.strip.push([y, fin === y ? 1 : 0, cByte !== y && fin === y ? 1 : 0, cByte === y && fin !== y ? 1 : 0]); if (this.strip.length > 90) this.strip.shift();
    }
    if (this.steps % 1000 === 0) { for (const [k, x] of this.edges) { x.w *= .97; if (x.w < .05) this.edges.delete(k); } for (const n of this.nodes.values()) n.act *= .5; }
  }
  snapshot(withText) {
    const edges = [...this.edges.values()].sort((a, b) => b.w - a.w).slice(0, 2500).map(x => [x.a, x.b, x.kind, +x.w.toFixed(3)]);
    const s = {nodes: [...this.nodes.values()].map(n => [n.id, n.type, n.label, +n.act.toFixed(2), n.born]), edges,
      U: [...this.geo.U.entries()].map(([k, v]) => [k, v.map(x => +x.toFixed(5))]), flow: this.flow.slice(), strip: this.strip.slice(),
      accC: this.seen ? (this.accC = this.hitC / this.seen) : (this.accC ?? 0), accF: this.seen ? (this.accF = this.hitF / this.seen) : (this.accF ?? 0)};   // nothing lived since the last picture (a GPU batch deciding): keep the last measured
    this.hitC = this.hitF = this.seen = 0;
    if (withText) s.text = Buffer.from(this.text.slice(-60000)).toString("latin1");
    return s;
  }
}

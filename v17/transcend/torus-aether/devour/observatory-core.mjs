// Observatory read-only telemetry adapter for Torus Aether.
// Geometry comes from GraphTrace.geo.U (learned 5-torus coordinates).
// Non-symbol positions are *derived* from observed links, never passed off as learned.
const wrap1 = x => x - Math.floor(x);
export function circularMean(points, weights) {
  if (!points.length) return null;
  return Array.from({length: 5}, (_, i) => {
    let x = 0, y = 0;
    for (let k = 0; k < points.length; k++) {
      const theta = 2 * Math.PI * points[k][i];
      const w = Math.max(0, Number(weights[k]) || 0);
      x += w * Math.cos(theta); y += w * Math.sin(theta);
    }
    return wrap1(Math.atan2(y, x) / (2 * Math.PI));
  });
}
export function snapshot(raw = {}) {
  const direct = new Map();
  for (const item of Array.isArray(raw.U) ? raw.U : []) {
    if (!Array.isArray(item) || item.length !== 2) continue;
    const [symbol, p] = item;
    if (!Array.isArray(p) || p.length < 5 || !p.slice(0, 5).every(Number.isFinite)) continue;
    direct.set("s:" + symbol, p.slice(0, 5).map(wrap1));
  }
  const nodes = new Map();
  for (const row of Array.isArray(raw.nodes) ? raw.nodes : []) {
    if (!Array.isArray(row) || row.length < 4) continue;
    const id = String(row[0]), type = String(row[1]);
    if (!["sym", "C", "A"].includes(type)) continue;
    nodes.set(id, {id, type, label: String(row[2]), act: Math.max(0, Math.min(1, Number(row[3]) || 0)),
      born: Number(row[4]) || 0, p: direct.get(id) || null, origin: direct.has(id) ? "learned" : "unplaced"});
  }
  const links = [], neighborPoints = new Map();
  for (const e of Array.isArray(raw.edges) ? raw.edges : []) {
    if (!Array.isArray(e) || e.length < 4) continue;
    const [a0, b0, type0, weight0] = e, a = String(a0), b = String(b0), weight = Number(weight0);
    if (!nodes.has(a) || !nodes.has(b) || !Number.isFinite(weight) || weight <= 0) continue;
    links.push({a, b, kind: String(type0), weight});
    const attach = (id, sym) => {
      if (!nodes.get(id).p && direct.has(sym)) {
        if (!neighborPoints.has(id)) neighborPoints.set(id, []);
        neighborPoints.get(id).push({p: direct.get(sym), weight});
      }
    };
    attach(a, b); attach(b, a);
  }
  for (const [id, neighbors] of neighborPoints) {
    const node = nodes.get(id);
    if (!node || node.p) continue;
    node.p = circularMean(neighbors.map(x => x.p), neighbors.map(x => x.weight));
    node.origin = "estimated-from-edges";
  }
  const visible = [...nodes.values()].filter(n => n.p);
  const rawFlow = Array.isArray(raw.flow) ? raw.flow : [];
  const flow = rawFlow.filter(v => Array.isArray(v) && v.length === 2 &&
    nodes.has("s:" + v[0]) && nodes.has("s:" + v[1]))
    .map(v => ({a: "s:" + v[0], b: "s:" + v[1]}));
  return {allNodes: nodes, items: visible, links, flow, unplaced: nodes.size - visible.length,
    direct: visible.filter(n => n.origin === "learned").length,
    estimated: visible.filter(n => n.origin === "estimated-from-edges").length,
    counts: {nodes: nodes.size, edges: links.length, steps: Number(raw.chars) || 0,
      exercises: Number(raw.exercises) || 0}};
}
export function measuredDelta(before, after) {
  if (!before) return {newNodes: 0, newEdges: 0, first: true};
  const oldN = before.allNodes, oldE = new Set(before.links.map(e => e.a + "\u0000" + e.b + "\u0000" + e.kind));
  return {newNodes: [...after.allNodes.keys()].filter(k => !oldN.has(k)).length,
    newEdges: after.links.filter(e => !oldE.has(e.a + "\u0000" + e.b + "\u0000" + e.kind)).length,
    first: false};
}

// Pure 5D camera and evidence-driven graph coarsening. No training mutations.
export const AXES = ['X','Y','Z','W','T'];
export const PLANES = Object.freeze([
  [0,1],[0,2],[0,3],[0,4],
  [1,2],[1,3],[1,4],[2,3],[2,4],[3,4]
]);
export const PLANE_NAMES = PLANES.map(([a,b]) => AXES[a] + AXES[b]);

export function rotate5(coords, angles = Array(10).fill(0)) {
  if (!Array.isArray(coords) || coords.length !== 5 || !coords.every(Number.isFinite)) {
    throw new Error('A 5D point requires five finite coordinates');
  }
  if (!Array.isArray(angles) || angles.length !== 10 || !angles.every(Number.isFinite)) {
    throw new Error('Ten finite plane angles required');
  }
  const p = coords.slice();
  for (let i=0; i<10; i++) {
    const [a,b] = PLANES[i], c = Math.cos(angles[i]), s = Math.sin(angles[i]);
    const x = p[a], y = p[b];
    p[a] = c*x - s*y;
    p[b] = s*x + c*y;
  }
  return p;
}

// Explicit 5D -> 4D -> 3D -> 2D perspective. Pan / zoom affect the
// observer, not source coordinates. No generated/pretend learned vertices.
export function project5(point, opts={}) {
  const center = opts.center || [0,0,0,0,0];
  if (center.length !== 5 || !center.every(Number.isFinite)) throw new Error('Invalid camera center');
  const delta = point.map((v,i) => v-center[i]);
  const q = rotate5(delta, opts.angles || Array(10).fill(0));
  const d5 = (opts.depth5 || 8) - q[4];
  if (d5 <= .08) return null;
  const r4 = q.slice(0,4).map(x => x * (opts.depth5 || 8)/d5);
  const d4 = 8 - r4[3];
  if (d4 <= .08) return null;
  const r3 = r4.slice(0,3).map(x => x*8/d4);
  const d3 = 10 - r3[2];
  if (d3 <= .08) return null;
  const factor = 10/d3 * Math.exp(opts.logZoom || 0);
  const x = r3[0]*factor, y = r3[1]*factor;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {x,y,depth:r3[2],r5:q[4]};
}

export function boundedWindow(meta, center, width) {
  if (!meta || !meta.total) return {start:0,end:0,width:0};
  const first=meta.first,last=meta.last;
  const span = Math.max(1,Math.min(last-first+1,Math.floor(width)));
  const middle = Math.max(first,Math.min(last,Math.round(center)));
  let start = Math.max(first,Math.round(middle-(span-1)/2));
  let end = Math.min(last,start+span-1);
  start = Math.max(first,end-span+1);
  return {start,end,width:end-start+1};
}

export function timeCoord(traceId, window, stretch=4.5) {
  const mid=(window.start+window.end)/2;
  return (traceId-mid)/Math.max(1,window.end-window.start)*stretch;
}

// Repeated heavy-edge matching: a display-only hierarchy assembled from
// genuine observed edges. No invented neuron, synapse or 'fractal' label.
export function graphHierarchy(nodes, edges, maxLevels=8) {
  const ids = new Set(nodes.map(n=>n.id));
  const initial = nodes.map(n=>({id:String(n.id),members:[n.id],p4:n.p4.slice(),weight:1}));
  const initialEdges = edges.filter(e=>ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to)
    .map(e=>({from:String(e.from),to:String(e.to),weight:Math.max(0,Number(e.weight)||1)}));
  const levels=[{nodes:initial,edges:initialEdges}];
  for (let level=1;level<maxLevels;level++) {
    const previous=levels[levels.length-1];
    if(previous.nodes.length<2 || !previous.edges.length) break;
    const assigned=new Set(), groups=[];
    const sorted=previous.edges.slice().sort((a,b)=>b.weight-a.weight ||
      a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
    const byId=new Map(previous.nodes.map(n=>[n.id,n]));
    for(const e of sorted){
      if(assigned.has(e.from)||assigned.has(e.to))continue;
      if(!byId.has(e.from)||!byId.has(e.to))continue;
      groups.push([byId.get(e.from),byId.get(e.to)]);
      assigned.add(e.from);assigned.add(e.to);
    }
    for(const n of previous.nodes)if(!assigned.has(n.id))groups.push([n]);
    if(groups.length===previous.nodes.length)break;
    const mapping=new Map();
    const next=groups.map(group=>{
      const members=group.flatMap(n=>n.members).sort((a,b)=>String(a).localeCompare(String(b)));
      const weight=group.reduce((sum,n)=>sum+n.weight,0);
      const p4=Array.from({length:4},(_,axis)=>group.reduce((sum,n)=>sum+n.p4[axis]*n.weight,0)/weight);
      const id=`L${level}/${members.map(String).join(',')}`;
      group.forEach(n=>mapping.set(n.id,id));
      return {id,members,weight,p4};
    });
    const edgeMap=new Map();
    for(const e of previous.edges){
      const from=mapping.get(e.from),to=mapping.get(e.to);
      if(!from||!to||from===to)continue;
      const pair=from<to?[from,to]:[to,from];
      const key=JSON.stringify(pair);
      const v=edgeMap.get(key)||{from:pair[0],to:pair[1],weight:0};
      v.weight+=e.weight;edgeMap.set(key,v);
    }
    levels.push({nodes:next,edges:[...edgeMap.values()]});
  }
  return levels;
}

export function lookupHierarchy(level) {
  const out=new Map();
  for(const node of level.nodes)for(const id of node.members)out.set(id,node);
  return out;
}

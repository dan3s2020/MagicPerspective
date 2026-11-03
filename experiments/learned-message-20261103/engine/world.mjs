// Hidden world. Only localView() can be passed to an individual node.
export class RNG {
  constructor(seed=1) { this.s=(seed>>>0)||1; }
  next() {let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296;}
  int(n){return Math.floor(this.next()*n);}
  shuffle(a){for(let i=a.length-1;i>0;i--){let j=this.int(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
}
export const KINDS=['local','hierarchical','mixed'];
export function makeWorld(seed=1,n=33,kind='mixed') {
  if(!Number.isInteger(n)||n<12||n>96)throw Error('Node count must be 12..96');
  if(!KINDS.includes(kind))throw Error('Unknown world family');
  const rng=new RNG(seed),coords=Array.from({length:n},(_,i)=>{
    const cluster=Math.floor(i/(n/4)),cx=[.24,.76,.24,.76][Math.min(3,cluster)],cy=[.24,.24,.76,.76][Math.min(3,cluster)];
    const r=.055+.17*Math.sqrt(rng.next()),phi=rng.next()*Math.PI*2;
    return {x:Math.max(.035,Math.min(.965,cx+r*Math.cos(phi))),y:Math.max(.035,Math.min(.965,cy+r*Math.sin(phi)))};
  });
  const links=[],used=new Set();
  const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
  const dist=(a,b)=>Math.hypot(coords[a].x-coords[b].x,coords[a].y-coords[b].y);
  function add(a,b) {
    if(a===b||used.has(key(a,b)))return false;used.add(key(a,b));
    const d=dist(a,b),variation=rng.next(),cost=1+Math.floor(2+5*variation+1.5*d);
    // Sensor is informative but noisy. True cost is learned only after traversal.
    const sensor=Math.max(.1,.72*cost + (rng.next()-.5)*3.2 + (kind==='hierarchical'?.5:0));
    links.push({id:links.length,a,b,cost,sensor});return true;
  }
  // Every node has local physical neighbours. A spanning tree keeps the world connected.
  for(let i=1;i<n;i++){
    let options=Array.from({length:i},(_,j)=>j).sort((a,b)=>dist(i,a)-dist(i,b));
    let parent=kind==='hierarchical'&&rng.next()<.22?rng.int(i):options[rng.int(Math.min(4,options.length))];
    add(i,parent);
  }
  // Shortcuts/loops. Distribution changes across world families.
  const extras=Math.floor(n*(kind==='local'?.8:kind==='hierarchical'?.65:1.1));
  for(let t=0;t<extras*8&&links.length<n-1+extras;t++){
    const a=rng.int(n),b=rng.int(n),d=dist(a,b);
    const ok=kind==='local'?d<.36:kind==='hierarchical'?(d<.25||rng.next()<.16):true;
    if(ok)add(a,b);
  }
  const start=rng.int(n),graph=Array.from({length:n},()=>[]);
  for(const l of links){graph[l.a].push({to:l.b,cost:l.cost});graph[l.b].push({to:l.a,cost:l.cost});}
  const d=Array(n).fill(Infinity),done=Array(n).fill(false);d[start]=0;
  for(let t=0;t<n;t++){let u=-1;for(let i=0;i<n;i++)if(!done[i]&&(u<0||d[i]<d[u]))u=i;if(u<0||!Number.isFinite(d[u]))break;done[u]=true;for(const e of graph[u])d[e.to]=Math.min(d[e.to],d[u]+e.cost);}
  const goal=d.reduce((best,v,i)=>v>d[best]?i:best,start);
  return {seed,n,kind,start,goal,coords,links};
}
export function localView(world,node){
  if(!Number.isInteger(node)||node<0||node>=world.n)throw Error('Invalid node');
  return {node,goal:world.goal,position:world.coords[node],links:world.links.filter(l=>l.a===node||l.b===node).map(l=>({to:l.a===node?l.b:l.a,sensor:l.sensor,id:l.id}))};
}
export function publicInfo(w){return {n:w.n,start:w.start,goal:w.goal,kind:w.kind,positions:w.coords};}
export function traversal(world,from,to){const link=world.links.find(l=>(l.a===from&&l.b===to)||(l.a===to&&l.b===from));return link?{ok:true,from,to,cost:link.cost,sensor:link.sensor,id:link.id}:{ok:false,from,to,cost:0};}
export function oracle(world){
  const n=world.n,dist=Array(n).fill(Infinity),done=Array(n).fill(false),prev=Array(n).fill(-1);dist[world.goal]=0;
  for(let t=0;t<n;t++){let u=-1;for(let i=0;i<n;i++)if(!done[i]&&(u<0||dist[i]<dist[u]))u=i;if(u<0||!Number.isFinite(dist[u]))break;done[u]=true;for(const l of world.links){const v=l.a===u?l.b:l.b===u?l.a:-1;if(v>=0&&dist[v]>dist[u]+l.cost){dist[v]=dist[u]+l.cost;prev[v]=u;}}}
  const path=[world.start],seen=new Set(path);let u=world.start;
  while(u!==world.goal&&prev[u]>=0&&!seen.has(prev[u])){u=prev[u];path.push(u);seen.add(u);}
  return {cost:dist[world.start],route:u===world.goal?path:[],dist};
}

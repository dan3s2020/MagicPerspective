// V9: every problem is a network of STATES (nodes) joined by ACTIONS (links). Hidden: which actions work and what they cost.
// The organism never gets coordinates, grid sizes or names of world kinds — only links, what lies beyond each link, and the goal's wave.
// `layout` exists ONLY so a human can look at it.
import {RNG,makeWorld,WALL} from './world.mjs';
import {makeNetwork} from './net.mjs';
export const UKINDS=['relief','network','braided','maze','puzzle'];
// Bands of hops beyond each link: right behind it, a bit further, far.
export const UBANDS=[[0,0],[1,2],[3,5]];
export function adjacency(n,links){const a=Array.from({length:n},()=>[]);for(const l of links){a[l.a].push({to:l.b,id:l.id});a[l.b].push({to:l.a,id:l.id});}return a;}
export function shortestPath(n,adj,from,to,costOf){const dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),done=new Uint8Array(n),heap=[[0,from]];dist[from]=0;
  const push=(k,v)=>{heap.push([k,v]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=k)break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}};
  const pop=()=>{const t=heap[0],l=heap.pop();if(heap.length){heap[0]=l;let i=0;for(;;){let c=2*i+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=heap[i][0])break;[heap[c],heap[i]]=[heap[i],heap[c]];i=c;}}return t;};
  while(heap.length){const [d,u]=pop();if(done[u])continue;done[u]=1;if(u===to)break;
    for(const {to:v,id} of adj[u]){const c=costOf(id);if(!Number.isFinite(c))continue;if(d+c<dist[v]){dist[v]=d+c;prev[v]=u;push(dist[v],v);}}}
  if(to<0)return {dist};if(!Number.isFinite(dist[to]))return {nodes:[],cost:Infinity,dist};
  const nodes=[to];let a=to;while(a!==from){a=prev[a];nodes.push(a);}return {nodes:nodes.reverse(),cost:dist[to],dist};}
function finish(w){w.adj=adjacency(w.n,w.links);w.goalDist=shortestPath(w.n,w.adj,w.goal,-1,id=>w.links[id].open?w.links[id].cost:Infinity).dist;return w;}
// Grid worlds: each cell is a state, each move between neighbouring cells an action. A move works only between passable cells.
function fromGrid(g){const n=g.n,links=[];
  for(let i=0;i<n*n;i++){const x=i%n;for(const j of [x<n-1?i+1:-1,i+n<n*n?i+n:-1]){if(j<0)continue;const open=g.h[i]<=WALL&&g.h[j]<=WALL;
    links.push({id:links.length,a:i,b:j,open,cost:open?Math.round(1+8*(g.h[i]+g.h[j])/2):0});}}
  return finish({kind:g.kind,seed:g.seed,n:n*n,links,start:g.start,goal:g.goal,layout:Array.from({length:n*n},(_,i)=>({x:(i%n+.5)/n,y:(((i/n)|0)+.5)/n}))});}
// Puzzle: arrange 5 tokens in order using swaps of neighbouring places. 120 states, 4 actions each.
// Hidden rules (different in every world): some swaps are forbidden when certain tokens meet, and each swap has its own cost.
function perms(k){const out=[],a=[...Array(k).keys()];const rec=i=>{if(i===k){out.push(a.slice());return;}for(let j=i;j<k;j++){[a[i],a[j]]=[a[j],a[i]];rec(i+1);[a[i],a[j]]=[a[j],a[i]];}};rec(0);return out;}
function puzzle(seed){const rng=new RNG(seed),k=5,states=perms(k),key=s=>s.join(''),idx=new Map(states.map((s,i)=>[key(s),i]));
  const forbid=new Set(),place=Array.from({length:k-1},()=>1+rng.int(4)),heavy=Array.from({length:k},()=>rng.int(4));
  for(let t=0;t<3+rng.int(3);t++){const a=rng.int(k),b=rng.int(k);if(a!==b)forbid.add(a<b?`${a}${b}`:`${b}${a}`);}
  const links=[],seen=new Set();
  states.forEach((s,i)=>{for(let p=0;p<k-1;p++){const t=s.slice();[t[p],t[p+1]]=[t[p+1],t[p]];const j=idx.get(key(t)),kk=i<j?`${i}:${j}`:`${j}:${i}`;if(seen.has(kk))continue;seen.add(kk);
    const pair=s[p]<s[p+1]?`${s[p]}${s[p+1]}`:`${s[p+1]}${s[p]}`,open=!forbid.has(pair);
    links.push({id:links.length,a:i,b:j,open,cost:open?Math.min(9,place[p]+heavy[s[p]]+heavy[s[p+1]]):0});}});
  // layout for humans: inversions on one axis, a spread on the other
  const inv=s=>{let c=0;for(let i=0;i<k;i++)for(let j=i+1;j<k;j++)if(s[i]>s[j])c++;return c;};
  // human layout: one column per number of tokens out of order (0 = solved, left), states spread evenly in each column
  const cols=new Map();states.forEach((st,i)=>{const v=inv(st);(cols.get(v)??cols.set(v,[]).get(v)).push(i);});
  const layout=Array(states.length);for(const [v,ids] of cols)ids.forEach((i,r)=>{layout[i]={x:.06+.88*(v/10),y:ids.length===1?.5:.06+.88*(r/(ids.length-1))};});
  const goal=idx.get(key([...Array(k).keys()]));
  for(let tries=0;tries<200;tries++){const start=rng.int(states.length);const w=finish({kind:'puzzle',seed,n:states.length,links,start,goal,layout,labels:states.map(key)});
    if(start!==goal&&Number.isFinite(w.goalDist[start])&&w.goalDist[start]>=6)return w;}
  const w=finish({kind:'puzzle',seed,n:states.length,links,start:goal,goal,layout,labels:states.map(key)});
  w.start=[...Array(w.n).keys()].filter(i=>Number.isFinite(w.goalDist[i])).sort((a,b)=>w.goalDist[b]-w.goalDist[a])[0];return w;}
export function makeUniversal(seed,kind,size=15){
  if(kind==='network'){const w=makeNetwork(seed,size);return finish({kind,seed,n:w.n,links:w.links.map(l=>({...l})),start:w.start,goal:w.goal,layout:w.pos});}
  if(kind==='puzzle')return puzzle(seed);
  if(['relief','maze','braided'].includes(kind))return fromGrid(makeWorld(seed,kind,size));
  throw Error('Unknown world kind');}
export function publicView(w){return {n:w.n,start:w.start,goal:w.goal,links:w.links.map(l=>({id:l.id,a:l.a,b:l.b}))};}
export const truthRoute=(w,from=w.start)=>shortestPath(w.n,w.adj,from,w.goal,id=>w.links[id].open?w.links[id].cost:Infinity);
// Links lying in each hop band beyond the direction v→u (never looking back through v).
export function bandsBeyond(adj,v,u){const depth=new Map([[v,-1],[u,0]]),q=[u],bands=UBANDS.map(()=>[]),used=new Set([...adj[v].map(x=>x.id)]),max=UBANDS.at(-1)[1];
  for(let k=0;k<q.length;k++){const x=q[k],d=depth.get(x);const b=UBANDS.findIndex(([lo,hi])=>d>=lo&&d<=hi);
    for(const {to,id} of adj[x]){if(!used.has(id)){used.add(id);if(b>=0)bands[b].push(id);}if(!depth.has(to)&&d<max){depth.set(to,d+1);q.push(to);}}}
  return bands;}
// What a state shows: its own actions exactly, and for each action what lies beyond (4 readings per band).
export function senseAt(w,v){const rng=new RNG((w.seed*131+v*977)>>>0);
  const window=w.adj[v].map(({id})=>({id,open:w.links[id].open?1:0,cost:w.links[id].open?w.links[id].cost:null}));
  const horizon=w.adj[v].map(({to,id})=>({via:id,to,bands:bandsBeyond(w.adj,v,to).map(ids=>{if(!ids.length)return [0,0,0,0];let mx=0,bl=0,deg=0,sig=0;const nodes=new Set();
    for(const i of ids){const l=w.links[i];mx=Math.max(mx,l.open?l.cost/9:1);if(!l.open)bl++;nodes.add(l.a);nodes.add(l.b);}
    for(const x of nodes){deg+=w.adj[x].length;sig=Math.max(sig,Number.isFinite(w.goalDist[x])?Math.exp(-w.goalDist[x]/8):0);}
    sig=Math.max(0,Math.min(1,Math.round((sig+(rng.next()-.5)*.12)*10)/10));
    return [+mx.toFixed(2),+(bl/ids.length).toFixed(2),+Math.min(deg/nodes.size/8,1).toFixed(2),sig];})}));
  return {position:v,window,horizon};}

// V8 abstract network. Public: node identities ("name" = index), addresses (layout positions), the scaffold of possible links,
// start and goal. Hidden: which links are open and what each costs. Costs and blockages follow a hidden "terrain" over the layout.
//
// What a node perceives (its own kind of horizon):
//   - every incident link exactly (open/blocked, cost)               → the node's "window"
//   - for EACH of its links — its own directions, however many —  what lies beyond at 1, 2 and 3 hops:
//       the most expensive link, the share of blocked links, how crowded the nodes are,
//       and how strongly the goal's wave arrives from that direction (coarse, noisy, attenuated — never the distance itself).
import {RNG} from './world.mjs';
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const pair=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export const NET_BANDS=3,NET_READ=4;
export const netNodes=size=>Math.round(size*size*.18);
export function makeNetwork(seed=1,size=15){
  const n=netNodes(size);if(n<13||n>120)throw Error('Network size out of range');
  const rng=new RNG(seed);
  for(let attempt=0;attempt<40;attempt++){
    const phi=(Math.sqrt(5)-1)*Math.PI,family=['local','hierarchical','mixed'][rng.int(3)];
    const pos=Array.from({length:n},(_,i)=>{const a=i*phi+.35*Math.sin(i*11+seed*.001),r=.075+.41*Math.sqrt((i+.5)/n);return {x:.5+r*Math.cos(a),y:.5+r*Math.sin(a)};});
    const hills=Array.from({length:3+rng.int(3)},()=>({x:rng.next(),y:rng.next(),r:.08+.14*rng.next(),a:.6+.6*rng.next()}));
    const field=(x,y)=>clip(hills.reduce((s,h)=>s+h.a*Math.exp(-((x-h.x)**2+(y-h.y)**2)/(2*h.r*h.r)),0),0,1);
    const links=[],seen=new Set(),d=(a,b)=>Math.hypot(pos[a].x-pos[b].x,pos[a].y-pos[b].y);
    const add=(a,b)=>{if(a===b||seen.has(pair(a,b)))return;seen.add(pair(a,b));const m=field((pos[a].x+pos[b].x)/2,(pos[a].y+pos[b].y)/2);
      const open=m<.78&&rng.next()>.12+.25*m;links.push({id:links.length,a,b,open,cost:open?Math.round(1+8*m*(.7+.3*rng.next())):0});};
    for(let i=1;i<n;i++){let p;if(family==='local'||(family==='mixed'&&rng.next()<.65)){const o=[...Array(i).keys()].sort((x,y)=>d(i,x)-d(i,y));p=o[rng.int(Math.min(3,o.length))];}
      else p=rng.next()<.62?Math.floor((i-1)/2):rng.int(i);add(i,p);}
    for(let t=0;t<n*12&&links.length<n*2.4;t++){const a=rng.int(n),near=[...Array(n).keys()].filter(j=>j!==a&&!seen.has(pair(a,j))).sort((x,y)=>d(a,x)-d(a,y));
      if(near.length)add(a,family==='hierarchical'&&rng.next()<.4?rng.int(n):near[rng.int(Math.min(6,near.length))]);}
    const w={kind:'network',seed,n,size,family,pos,links,adj:adjacency(n,links)};
    const ends=[...Array(n).keys()].sort((a,b)=>Math.hypot(pos[a].x-.5,pos[a].y-.5)-Math.hypot(pos[b].x-.5,pos[b].y-.5)).slice(Math.floor(n*.6));
    w.start=ends[rng.int(ends.length)];const far=ends.filter(i=>Math.hypot(pos[i].x-pos[w.start].x,pos[i].y-pos[w.start].y)>.45);
    if(!far.length)continue;w.goal=far[rng.int(far.length)];
    w.goalDist=trueDistances(w,w.goal);if(Number.isFinite(w.goalDist[w.start]))return w;}
  throw Error('Network generator failed');}
export function adjacency(n,links){const a=Array.from({length:n},()=>[]);for(const l of links){a[l.a].push({to:l.b,id:l.id});a[l.b].push({to:l.a,id:l.id});}return a;}
export function publicNetwork(w){return {kind:'network',n:w.n,size:w.size,pos:w.pos,start:w.start,goal:w.goal,links:w.links.map(l=>({id:l.id,a:l.a,b:l.b}))};}
// Shortest path (cost) through OPEN links. Used by the evaluator on the true network, and by the organism on its imagined one.
export function netShortest(n,adj,from,to,costOf){const dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),done=new Uint8Array(n);dist[from]=0;
  for(let k=0;k<n;k++){let u=-1;for(let i=0;i<n;i++)if(!done[i]&&(u<0||dist[i]<dist[u]))u=i;if(u<0||!Number.isFinite(dist[u])||u===to)break;done[u]=1;
    for(const {to:v,id} of adj[u]){const c=costOf(id);if(!Number.isFinite(c))continue;if(dist[u]+c<dist[v]){dist[v]=dist[u]+c;prev[v]=u;}}}
  if(to<0)return {dist};if(!Number.isFinite(dist[to]))return {nodes:[],cost:Infinity,dist};
  const nodes=[to];let a=to;while(a!==from){a=prev[a];nodes.push(a);}return {nodes:nodes.reverse(),cost:dist[to],dist};}
export function trueDistances(w,from){return netShortest(w.n,w.adj,from,-1,id=>w.links[id].open?w.links[id].cost:Infinity).dist;}
export const netTruthRoute=(w,from=w.start)=>netShortest(w.n,w.adj,from,w.goal,id=>w.links[id].open?w.links[id].cost:Infinity);
// For direction (v→u): nodes at depth 0,1,2 beyond u (scaffold hops, not going back through v), and the links touching each depth.
export function bandsBeyond(adj,v,u){const depth=new Map([[v,-1],[u,0]]),frontier=[u],bands=[[],[],[]],used=new Set();
  for(let k=0;k<NET_BANDS;k++){const next=[];for(const x of frontier)for(const {to,id} of adj[x]){if(to===v&&x===u)continue;
      if(!used.has(id)){used.add(id);bands[k].push(id);}if(!depth.has(to)&&k<NET_BANDS-1){depth.set(to,k+1);next.push(to);}}frontier.splice(0,frontier.length,...next);}
  return bands;}
export function netSense(w,v,rng=new RNG((w.seed*131+v*977)>>>0)){
  const window=w.adj[v].map(({id})=>({id,open:w.links[id].open?1:0,cost:w.links[id].open?w.links[id].cost:null}));
  const horizon=w.adj[v].map(({to,id})=>{const bands=bandsBeyond(w.adj,v,to);
    return {via:id,to,bands:bands.map(ids=>{if(!ids.length)return [0,0,0,0];let mx=0,bl=0,deg=0,sig=0;const nodes=new Set();
      for(const i of ids){const l=w.links[i];mx=Math.max(mx,l.open?l.cost/9:1);if(!l.open)bl++;nodes.add(l.a);nodes.add(l.b);}
      for(const x of nodes){deg+=w.adj[x].length;sig=Math.max(sig,Number.isFinite(w.goalDist[x])?Math.exp(-w.goalDist[x]/8):0);}
      // the goal's wave: coarse (steps of 0.1) and noisy
      sig=clip(Math.round((sig+(rng.next()-.5)*.12)*10)/10,0,1);
      return [+mx.toFixed(2),+(bl/ids.length).toFixed(2),+Math.min(deg/nodes.size/8,1).toFixed(2),sig];})};});
  return {position:v,window,horizon};}
export function netAct(w,v,to){const e=w.adj[v].find(x=>x.to===to);if(!e)return {type:'invalid',position:v,cost:0};const l=w.links[e.id];
  return l.open?{type:'moved',position:to,cost:l.cost}:{type:'blocked',position:v,cost:1};}

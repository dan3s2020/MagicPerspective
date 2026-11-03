// Hidden, mutable environment. Agent access is through localView() and traversal() only.
export class RNG {
 constructor(seed=1){this.s=(seed>>>0)||1;}
 next(){let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296;}
 int(n){return Math.floor(this.next()*n)}
}
export const FAMILIES=['clusters','bridges','dense'];
export const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function bounded(x,a,b){return Math.max(a,Math.min(b,x));}
export function makeWorld(seed=1,n=33,family='clusters'){
 if(!Number.isInteger(n)||n<16||n>80)throw Error('n must be 16..80');
 if(!FAMILIES.includes(family))throw Error('Invalid family');
 const r=new RNG(seed),coords=Array.from({length:n},(_,i)=>{
   const k=i%4,cx=[.19,.80,.24,.76][k],cy=[.22,.20,.78,.77][k];
   return {x:bounded(cx+(r.next()-.5)*.32,.025,.975),y:bounded(cy+(r.next()-.5)*.32,.025,.975)};
 });
 const links=[],used=new Set();
 function add(a,b,tree=false){if(a===b||used.has(key(a,b)))return false;used.add(key(a,b));
   const d=dist(coords[a],coords[b]),vol=.25+.75*r.next(),base=2+Math.floor(r.next()*7)+d*4;
   const drift=1.1*(r.next()-.5),sensor=bounded(base*.83+drift+1.4*vol,.4,20);
   links.push({id:links.length,a,b,tree,vol,base,sensor,open:true,actual:base,changes:0});return true;
 }
 // A spanning tree survives dynamic closures; only non-tree edges can temporarily close.
 for(let i=1;i<n;i++){
   const near=Array.from({length:i},(_,j)=>j).sort((a,b)=>dist(coords[i],coords[a])-dist(coords[i],coords[b]));
   add(i,near[r.int(Math.min(family==='bridges'?8:4,i))],true);
 }
 const extras=Math.floor(n*(family==='dense'?1.5:family==='bridges'?1.1:.85));
 for(let t=0;t<extras*45&&links.length<n-1+extras;t++){
   const a=r.int(n),b=r.int(n),d=dist(coords[a],coords[b]);
   if(family==='clusters'&&d>.54&&r.next()<.95)continue;
   if(family==='bridges'&&d<.34&&r.next()<.35)continue;
   add(a,b,false);
 }
 const start=r.int(n);let goal=r.int(n);if(goal===start)goal=(start+Math.floor(n/2))%n;
 return {seed,n,family,coords,links,start,goal,tick:0,changeCount:0,rng:r.s};
}
// A sensor can read its own incident links. It may NOT inspect other nodes or oracle.
export function localView(world,node){if(!Number.isInteger(node)||node<0||node>=world.n)throw Error('Invalid local node');
 return {node,goal:world.goal,pos:world.coords[node],links:world.links.filter(e=>e.a===node||e.b===node).map(e=>({
  to:e.a===node?e.b:e.a,id:e.id,open:e.open,sensor:e.sensor,vol:e.vol,
 }))};
}
export function publicInfo(world){return {n:world.n,start:world.start,goal:world.goal,family:world.family,positions:world.coords};}
export function traversal(world,from,to){const e=world.links.find(x=>(x.a===from&&x.b===to)||(x.b===from&&x.a===to));
 if(!e||!e.open)return {ok:false,from,to,cost:0,reason:'edge unavailable'};
 return {ok:true,from,to,cost:e.actual,sensor:e.sensor,edge:e.id};
}
// Between navigation steps, the hidden world evolves. Only endpoints of changed edges can observe changes.
export function evolve(world,step){world.tick++;const r=new RNG((world.seed+step*7919+world.changeCount*149)>>>0);const touched=new Set();let count=0;
 const limit=Math.min(world.links.length,Math.max(1,Math.floor(world.links.length*.045)));
 for(let k=0;k<limit;k++){
   const e=world.links[r.int(world.links.length)];
   if(!e.tree&&r.next()<.50)e.open=!e.open;
   if(e.open){const factor=.65+r.next()*1.9;e.actual=bounded(e.base*factor,1,30);e.sensor=bounded(e.actual*.83+(r.next()-.5)*(1.4+e.vol*2),.4,30);}
   e.changes++;world.changeCount++;count++;touched.add(e.a);touched.add(e.b);
 }
 return {changed:count,endpoints:[...touched],tick:world.tick};
}
// Explicit laboratory intervention, kept inside the physical environment only.
// Prefer disrupting a predicted path edge; the spanning tree remains intact.
export function intervene(world,preferred=[]){
 const routeEdges=new Set(preferred.slice(1).map((v,i)=>key(preferred[i],v)));
 const choices=world.links.filter(e=>!e.tree&&e.open),chosen=choices.find(e=>routeEdges.has(key(e.a,e.b)))||choices[0];
 if(!chosen){const fallback=world.links[0];if(!fallback)throw Error('World has no links');
  const old=fallback.actual;fallback.actual=Math.min(35,old+9);fallback.sensor=fallback.actual*.83;
  world.changeCount++;return {edge:fallback.id,endpoints:[fallback.a,fallback.b],type:'cost',oldCost:old,newCost:fallback.actual};}
 const old=chosen.actual;chosen.open=false;chosen.changes++;world.changeCount++;
 return {edge:chosen.id,endpoints:[chosen.a,chosen.b],type:'closed',oldCost:old,newCost:null};
}
export function oracle(world,start=world.start){const n=world.n,d=Array(n).fill(Infinity),prev=Array(n).fill(-1),done=Array(n).fill(false);d[world.goal]=0;
 for(let t=0;t<n;t++){let u=-1;for(let i=0;i<n;i++)if(!done[i]&&(u<0||d[i]<d[u]))u=i;
  if(u<0||!Number.isFinite(d[u]))break;done[u]=true;
  for(const e of world.links){if(!e.open)continue;const v=e.a===u?e.b:e.b===u?e.a:-1;
   if(v>=0&&d[v]>d[u]+e.actual){d[v]=d[u]+e.actual;prev[v]=u;}
  }
 }
 const route=[start];let at=start;const seen=new Set(route);
 while(at!==world.goal&&prev[at]>=0&&!seen.has(prev[at])){at=prev[at];route.push(at);seen.add(at);}
 return {cost:d[start],route:at===world.goal?route:[],allDistances:d};
}
export function fingerprint(world){return JSON.stringify([world.seed,world.tick,world.links.map(e=>[e.id,e.open,e.actual])]);}

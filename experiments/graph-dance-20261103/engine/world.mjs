// The world owns hidden edges and costs. The organism may only sense its current node.
export class RNG {
  constructor(seed=1){this.state=(seed>>>0)||1;}
  next(){let x=this.state;x^=x<<13;x^=x>>>17;x^=x<<5;this.state=x>>>0;return this.state/4294967296;}
  int(n){return Math.floor(this.next()*n);}
  choose(a){return a[this.int(a.length)];}
}
const pair=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function makeWorld(seed=1,n=33,family='mixed') {
  if(!Number.isInteger(n)||n<13||n>65)throw Error('Nodes must be 13..65');
  if(!['local','hierarchical','mixed'].includes(family))throw Error('Invalid world family');
  const rng=new RNG(seed),phi=(Math.sqrt(5)-1)*Math.PI;
  const positions=Array.from({length:n},(_,i)=>{
    const a=i*phi+0.35*Math.sin(i*11+seed*.001),r=.075+.41*Math.sqrt((i+.5)/n);
    return {x:.5+r*Math.cos(a),y:.5+r*Math.sin(a)};
  });
  const edges=[],added=new Set();
  const distance=(a,b)=>Math.hypot(positions[a].x-positions[b].x,positions[a].y-positions[b].y);
  function add(a,b,open=true){if(a===b||added.has(pair(a,b)))return;
    added.add(pair(a,b));edges.push({id:edges.length,a,b,open,cost:1+rng.int(3)});
  }
  // A connected backbone, generated using different structural rules per family.
  for(let i=1;i<n;i++){
    let parent;
    if(family==='local'||(family==='mixed'&&rng.next()<.65)){
      const options=Array.from({length:i},(_,j)=>j).sort((a,b)=>distance(i,a)-distance(i,b));
      parent=options[rng.int(Math.min(4,options.length))];
    }else parent=rng.next()<.62?Math.floor((i-1)/2):rng.int(i);
    add(i,parent,true);
  }
  const extra=Math.round(n*1.3);
  for(let t=0;t<extra*8&&edges.length<n-1+extra;t++){
    const a=rng.int(n);let b;
    if(family==='local'||(family==='mixed'&&rng.next()<.58)){
      const nearest=Array.from({length:n},(_,j)=>j).filter(j=>j!==a&&!added.has(pair(a,j)))
       .sort((x,y)=>distance(a,x)-distance(a,y));
      if(!nearest.length)continue;b=nearest[rng.int(Math.min(7,nearest.length))];
    }else b=rng.int(n);
    add(a,b,rng.next()<.65);
  }
  const start=rng.int(n),dist=Array(n).fill(Infinity),q=[start];dist[start]=0;
  for(let i=0;i<q.length;i++)for(const e of edges){if(!e.open)continue;
    const v=e.a===q[i]?e.b:e.b===q[i]?e.a:-1;
    if(v>=0&&!Number.isFinite(dist[v])){dist[v]=dist[q[i]]+1;q.push(v);}}
  let goal=start;for(let i=0;i<n;i++)if(Number.isFinite(dist[i])&&dist[i]>dist[goal])goal=i;
  if(goal===start)throw Error('Generator failed to choose a goal');
  return {seed,n,family,positions,edges,start,goal};
}
export function publicInfo(w){return {n:w.n,positions:w.positions,start:w.start,goal:w.goal,family:w.family};}
export function sense(w,node){
  if(node<0||node>=w.n)throw Error('Invalid node');
  // A node can inspect every adjacent link and know that unlisted nodes are NOT linked to it.
  return {node,links:w.edges.filter(e=>e.a===node||e.b===node).map(e=>({to:e.a===node?e.b:e.a,open:e.open,cost:e.open?e.cost:null}))};
}
export function act(w,node,to){const e=w.edges.find(x=>(x.a===node&&x.b===to)||(x.a===to&&x.b===node));
 if(!e||!e.open)return {type:'blocked',position:node,cost:1};
 return {type:'moved',position:to,cost:e.cost};
}
export function oracle(w,from=w.start){const d=Array(w.n).fill(Infinity),pre=Array(w.n).fill(-1),seen=Array(w.n).fill(false);d[from]=0;
 for(let t=0;t<w.n;t++){let u=-1;for(let i=0;i<w.n;i++)if(!seen[i]&&(u<0||d[i]<d[u]))u=i;
  if(u<0||!Number.isFinite(d[u])||u===w.goal)break;seen[u]=true;
  for(const e of w.edges){if(!e.open)continue;const v=e.a===u?e.b:e.b===u?e.a:-1;
   if(v>=0&&d[v]>d[u]+e.cost){d[v]=d[u]+e.cost;pre[v]=u;}}
 }
 const path=[w.goal];if(!Number.isFinite(d[w.goal]))return {nodes:[],cost:Infinity};
 for(let i=w.goal;i!==from;){i=pre[i];if(i<0)return {nodes:[],cost:Infinity};path.push(i);}
 return {nodes:path.reverse(),cost:d[w.goal]};
}
export const key=pair;

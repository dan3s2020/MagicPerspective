// The hidden world is owned here. Learners receive publicStructure() and local sense()/act() only.
export class RNG {
  constructor(seed=1){this.s=(seed>>>0)||1;}
  next(){let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296;}
  int(n){return Math.floor(this.next()*n);}
  shuffle(a){for(let i=a.length-1;i>0;i--){const j=this.int(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
}
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function makeWorld(seed=1,kind='maze',size=9){
  const rng=new RNG(seed);
  if(!['maze','braided','graph'].includes(kind))throw Error('Invalid world family');
  if(!Number.isInteger(size)||size<5||size>17||size%2!==1)throw Error('size must be odd 5..17');
  let nodes,positions,edges=[],start,goal;
  if(kind==='graph'){
    nodes=Math.max(15,Math.round(size*size*.48));
    positions=Array.from({length:nodes},(_,i)=>({x:Math.cos(i*2.399963)*(.10+.36*Math.sqrt(i/nodes))+.5,y:Math.sin(i*2.399963)*(.10+.36*Math.sqrt(i/nodes))+.5}));
    const pairs=new Set();const add=(a,b,open)=>{if(a===b||pairs.has(key(a,b)))return;pairs.add(key(a,b));edges.push({a,b,open,cost:1+rng.int(3),id:edges.length});};
    // Open spanning tree guarantees a connected true world; some extra edges are blocked.
    for(let i=1;i<nodes;i++)add(i,rng.int(i),true);
    for(let i=0;i<nodes*2;i++){
      const a=rng.int(nodes),b=rng.int(nodes);add(a,b,rng.next()<.65);
    }
    start=rng.int(nodes);goal=(start+Math.floor(nodes/2))%nodes;
  }else{
    nodes=size*size;positions=Array.from({length:nodes},(_,i)=>({x:(i%size+.5)/size,y:(Math.floor(i/size)+.5)/size}));
    const walls=Array(nodes).fill(1),stack=[size+1];walls[size+1]=0;
    while(stack.length){const i=stack.at(-1),x=i%size,y=Math.floor(i/size);let carved=false;
      for(const [dx,dy] of rng.shuffle([[2,0],[-2,0],[0,2],[0,-2]])){
        const xx=x+dx,yy=y+dy;if(xx<=0||yy<=0||xx>=size-1||yy>=size-1||walls[yy*size+xx]===0)continue;
        walls[(y+dy/2)*size+x+dx/2]=0;walls[yy*size+xx]=0;stack.push(yy*size+xx);carved=true;break;
      }
      if(!carved)stack.pop();
    }
    if(kind==='braided')for(let y=1;y<size-1;y++)for(let x=1;x<size-1;x++){
      const i=y*size+x;
      if(walls[i]&&rng.next()<.35&&((!walls[i-1]&&!walls[i+1])||(!walls[i-size]&&!walls[i+size])))walls[i]=0;
    }
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const a=y*size+x;
      for(const b of [x+1<size?a+1:-1,y+1<size?a+size:-1])if(b>=0)edges.push({a,b,open:!walls[a]&&!walls[b],cost:1+rng.int(3),id:edges.length});
    }
    const floor=walls.map((w,i)=>w?-1:i).filter(i=>i>=0);
    start=floor[rng.int(floor.length)];
    const graph=adjacency(nodes,edges,true);const distances=pathToAll(graph,start);
    goal=floor.filter(i=>Number.isFinite(distances[i])).sort((a,b)=>distances[b]-distances[a])[0];
  }
  if(!Number.isInteger(goal)||goal===start)throw Error('Invalid generated goal');
  return {seed,kind,size,nodes,positions,edges,start,goal,turn:0};
}
export function adjacency(nodes,edges,onlyOpen=false){const a=Array.from({length:nodes},()=>[]);for(const e of edges){if(onlyOpen&&!e.open)continue;a[e.a].push({to:e.b,edge:e.id});a[e.b].push({to:e.a,edge:e.id});}return a;}
function pathToAll(adj,start){const dist=Array(adj.length).fill(Infinity);dist[start]=0;const q=[start];for(let k=0;k<q.length;k++)for(const a of adj[q[k]])if(!Number.isFinite(dist[a.to])){dist[a.to]=dist[q[k]]+1;q.push(a.to)}return dist;}
export function publicStructure(world){return {kind:world.kind,size:world.size,nodes:world.nodes,start:world.start,goal:world.goal,links:world.edges.map(e=>({id:e.id,a:e.a,b:e.b})),layout:world.positions};}
export function emptyBelief(spec){return {status:Array(spec.links.length).fill(-1),cost:Array(spec.links.length).fill(-1),visits:Array(spec.nodes).fill(0),observed:Array(spec.nodes).fill(false)};}
export function sense(world,position){const edges=[];for(const e of world.edges)if(e.a===position||e.b===position){edges.push({id:e.id,open:e.open?1:0,cost:e.open?e.cost:null});}return {position,edges};}
export function absorb(belief,observation){const revealed=[];belief.observed[observation.position]=true;
  for(const e of observation.edges){if(belief.status[e.id]!==e.open||belief.cost[e.id]!==e.cost){revealed.push({id:e.id,old:belief.status[e.id],open:e.open,cost:e.cost});belief.status[e.id]=e.open;belief.cost[e.id]=e.cost??-1;}}
  return revealed;
}
export function act(world,position,edgeId){const e=world.edges[edgeId];if(!e||(e.a!==position&&e.b!==position))return {type:'invalid',position,cost:0};world.turn++;
  if(!e.open)return {type:'blocked',position,cost:1};
  return {type:'moved',position:e.a===position?e.b:e.a,cost:e.cost};
}
export function oracle(world,from=world.start){const n=world.nodes,dist=Array(n).fill(Infinity),seen=Array(n).fill(false),prev=Array(n).fill(-1),prevEdge=Array(n).fill(-1);
  dist[from]=0;for(let k=0;k<n;k++){let u=-1;for(let i=0;i<n;i++)if(!seen[i]&&(u<0||dist[i]<dist[u]))u=i;if(u<0||!Number.isFinite(dist[u])||u===world.goal)break;seen[u]=true;
    for(const e of world.edges){if(!e.open)continue;let v=e.a===u?e.b:e.b===u?e.a:-1;if(v<0)continue;const cand=dist[u]+e.cost;if(cand<dist[v]){dist[v]=cand;prev[v]=u;prevEdge[v]=e.id;}}
  }
  if(!Number.isFinite(dist[world.goal]))return {nodes:[],edges:[],cost:Infinity};
  const ns=[world.goal],es=[];let at=world.goal;while(at!==from){es.push(prevEdge[at]);at=prev[at];if(at<0)return {nodes:[],edges:[],cost:Infinity};ns.push(at)}return {nodes:ns.reverse(),edges:es.reverse(),cost:dist[world.goal]};
}

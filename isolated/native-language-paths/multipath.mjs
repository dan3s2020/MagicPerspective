// Real observed-state graph analysis for the V17 native-language experiment.
// Do not alter Discoverer.shape(): it remains the authoritative original path.
// This module counts shortest paths, evaluates discounted successor occupancy,
// and optionally ranks ONLY equally attractive next edges.
// No graph/text answers, targets or action effects are invented here.
import {KIND} from '../../v17/transcend/torus-aether/worlds/exercise.mjs';

const NMAX = 20000;
const tolerance = (a,b) => Math.abs(a-b) <= 1e-10*Math.max(1,Math.abs(a),Math.abs(b));
function inspect(graph){
  if(!graph||!Array.isArray(graph.nodes)||!Array.isArray(graph.adj))throw Error('Observed graph required');
  const n=graph.nodes.length;
  if(n<1||n>NMAX||graph.adj.length!==n)throw Error('Invalid observed graph size');
  for(const neighbors of graph.adj){
    if(!Array.isArray(neighbors)||neighbors.some(i=>!Number.isInteger(i)||i<0||i>=n))throw Error('Invalid observed graph edge');
  }
  return n;
}
export function exactShortestPaths(graph, origin=0) {
  const n=inspect(graph);
  if(!Number.isInteger(origin)||origin<0||origin>=n)throw Error('Invalid start state');
  const goal=graph.nodes.map((v,i)=>v.kind===KIND.target?i:-1).filter(i=>i>=0);
  const reverse=Array.from({length:n},()=>[]);
  graph.adj.forEach((edges,i)=>edges.forEach(j=>reverse[j].push(i)));
  const dist=Array(n).fill(Infinity),count=Array(n).fill(0n),queue=[];
  for(const target of goal){dist[target]=0;count[target]=1n;queue.push(target);}
  for(let i=0;i<queue.length;i++){
    const u=queue[i];
    for(const v of reverse[u])if(!Number.isFinite(dist[v])){
      dist[v]=dist[u]+1;queue.push(v);
    }
  }
  // Process increasing distance: this counts directed shortest ACTION sequences,
  // not arbitrary walks, and cannot loop even when the graph has cycles.
  for(const v of queue)if(dist[v]>0){
    let ways=0n;
    for(const w of graph.adj[v])if(dist[w]===dist[v]-1)ways+=count[w];
    count[v]=ways;
  }
  const choices=graph.adj[origin].map((to,action)=>({
    action,to,distance:dist[to],shortestCount:count[to].toString(),
    onShortestPath:dist[to]===dist[origin]-1
  }));
  return {distance:Number.isFinite(dist[origin])?dist[origin]:null,
    count:count[origin].toString(),dist,counts:count,choices,
    goalIndices:goal,reachable:goal.length>0&&Number.isFinite(dist[origin])};
}
export function discountedGoalOccupancy(graph,{gamma=.9,iterations=512,epsilon=1e-12}={}){
  const n=inspect(graph);
  if(!(gamma>0&&gamma<1)||!Number.isInteger(iterations)||iterations<1||iterations>10000)throw Error('Invalid successor parameters');
  const targets=new Set(graph.nodes.map((v,i)=>v.kind===KIND.target?i:-1).filter(i=>i>=0));
  let values=Array.from({length:n},(_,i)=>targets.has(i)?1:0),steps=0,delta=0;
  for(let it=0;it<iterations;it++){
    const next=new Array(n);delta=0;
    for(let i=0;i<n;i++){
      if(targets.has(i)){next[i]=1;continue;}
      const edges=graph.adj[i];
      const v=edges.length?gamma*edges.reduce((s,j)=>s+values[j],0)/edges.length:0;
      next[i]=v;delta=Math.max(delta,Math.abs(v-values[i]));
    }
    values=next;steps=it+1;
    if(delta<epsilon)break;
  }
  return {values,gamma,iterations:steps,residual:delta,
    interpretation:'discounted probability of eventually reaching any marked target under UNIFORM outgoing-edge choices, not exact shortest-path counts'};
}
// Reproduce the original V17 scalar relaxation solely for tracing/tie inspection;
// parity against Discoverer.shape() is asserted in tests. No replacement planner.
export function nativeAttractionField(graph,discoverer,origin=0){
  const n=inspect(graph),ret=graph.nodes.map(x=>x.kind),V=new Float64Array(n);
  const att=[0,1,2,3].map(k=>discoverer.attract(k));
  const cond=[0,1,2,3].map(k=>discoverer.conduct(k));
  let any=false;
  for(let i=0;i<n;i++)if(att[ret[i]]>.2&&i!==origin){V[i]=att[ret[i]];any=true;}
  if(!any)return {values:V,hasGoal:false,sweeps:0};
  let sweeps=0;
  for(let it=0;it<2*n;it++){
    let changed=false;sweeps++;
    for(let i=0;i<n;i++){
      const kind=ret[i];
      if(att[kind]>.2&&i!==origin)continue;
      const conduct=i===origin?1:cond[kind];
      if(conduct<.5)continue;
      let best=0;for(const j of graph.adj[i])if(V[j]>best)best=V[j];
      const value=.97*conduct*best;
      if(value>V[i]+1e-12){V[i]=value;changed=true;}
    }
    if(!changed)break;
  }
  return {values:V,hasGoal:true,sweeps};
}
function follow(graph,actions,origin){
  const path=[origin];let at=origin;
  for(const action of actions||[]){
    if(!Number.isInteger(action)||action<0||action>=graph.adj[at].length)throw Error('Native path emitted invalid action');
    at=graph.adj[at][action];path.push(at);
  }
  return path;
}
export function inspectNativeVsSuccessor(graph,discoverer,{origin=0,gamma=.9,maxSteps=null}={}){
  const n=inspect(graph);
  const referenceActions=discoverer.shape(graph.nodes.map(v=>v.kind),0,origin,graph.adj);
  const referencePath=follow(graph,referenceActions,origin);
  const F=nativeAttractionField(graph,discoverer,origin);
  const S=discountedGoalOccupancy(graph,{gamma});
  const exact=exactShortestPaths(graph,origin);
  const steps=[{node:origin,action:null}],seen=new Set([origin]);
  let at=origin,ties=0,altered=0;
  const ceiling=Math.min(n, maxSteps===null?n:Math.max(1,Math.floor(maxSteps)));
  while(steps.length<=ceiling&&!seen.has(-1)&&graph.nodes[at].kind!==KIND.target){
    const options=[];
    for(let a=0;a<graph.adj[at].length;a++){
      const to=graph.adj[at][a];
      if(seen.has(to)||F.values[to]<=F.values[at])continue;
      options.push({action:a,to,field:F.values[to],sr:S.values[to],
        shortestCount:exact.counts[to],dist:exact.dist[to]});
    }
    if(!options.length)break;
    const bestV=Math.max(...options.map(o=>o.field));
    const tied=options.filter(x=>tolerance(x.field,bestV));
    if(tied.length>1)ties++;
    // Preserve original V17 maximum field as primary choice. SR is only a
    // SECONDARY tie-break; exact count is recorded but not passed as a goal.
    const best=[...tied].sort((a,b)=>b.sr-a.sr || (a.action-b.action))[0];
    const nativePreferred=options.find(x=>x.field===bestV);
    if(best.action!==nativePreferred?.action)altered++;
    at=best.to;seen.add(at);
    steps.push({node:at,action:best.action,value:best.field,sr:best.sr,
      pathsToGoal:best.shortestCount.toString(),distance:best.dist});
  }
  const hybridPath=steps.map(s=>s.node);
  return {native:{actions:referenceActions||[],path:referencePath,
    reached:graph.nodes[referencePath.at(-1)]?.kind===KIND.target},
    successorTie:{path:hybridPath,steps,reached:graph.nodes[at].kind===KIND.target,
      actualTieSteps:ties,changedSteps:altered},
    shortest:{length:exact.distance,count:exact.count,
      choices:exact.choices.filter(x=>x.onShortestPath)},
    successor:{start:S.values[origin],gamma:S.gamma,iterations:S.iterations,residual:S.residual},
    field:{start:F.values[origin],sweeps:F.sweeps,hasGoal:F.hasGoal},
    graph:{nodes:n,edges:graph.adj.reduce((s,x)=>s+x.length,0)},
    disclaimer:'Goal nodes come from observed TRAINING answers; reachability is not proof of correctness on held-out natural language.'};
}

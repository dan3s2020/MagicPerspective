// One observable state-transition graph contract for ALL existing Brain Studio engines.
// This is a TRACE/VIEW adapter. Hidden evaluator truth is NEVER returned to the model
// or used in its gradient updates; it is appended only after an episode executes.
import {truthRoute,neighbors,WALL} from '../../../v7/engine/world.mjs';
import {oracle as networkOracle} from '../../graph-dance-20261103/engine/world.mjs';
import {shortestOracle,TOOLS} from '../../causal-text/engine/world.mjs';

const xyGrid=(n,i)=>({x:((i%n)+.5)/n,y:(Math.floor(i/n)+.5)/n});
const vertex=(i,p,domain)=>({id:i,x:p.x,y:p.y,label:domain==='text'?
  Math.floor(i/7)+','+(i%7):String(i)});
const safePath=p=>Array.isArray(p)?p.filter(Number.isInteger):[];
const validEdge=e=>e&&Number.isInteger(e.a)&&Number.isInteger(e.b)&&e.a>=0&&e.b>=0;
function metaGraph(meta,world,domain){
 const positions=meta.positions||[];
 let edges=[],solution={path:[],actions:[],cost:null,reachable:false};
 if(domain==='maze'||domain==='relief'){
  const n=world.n;
  for(let u=0;u<world.h.length;u++)if(world.h[u]<=WALL)
   for(const v of neighbors(n,u))if(v>u&&world.h[v]<=WALL)
    edges.push({a:u,b:v,cost:1+8*world.h[v],type:'passage'});
  const r=truthRoute(world);
  solution={path:r.cells,actions:[],cost:Number.isFinite(r.cost)?+r.cost.toFixed(2):null,
   reachable:!!r.cells.length};
 }else if(domain==='network'){
  edges=(world?.edges||world?.links||meta.truth||[]).map(e=>({
   a:e.a,b:e.b,cost:e.cost??e.actual??null,
   open:e.open!==false,type:e.open===false?'closed':'passage'}));
  const r=Array.isArray(meta.referencePath)?
   {nodes:meta.referencePath,cost:null}:
   world?.edges?networkOracle(world):{nodes:[],cost:null};
  solution={path:r.nodes||r.route||[],actions:[],cost:Number.isFinite(r.cost)?+r.cost.toFixed(2):null,
   reachable:!!(r.nodes||r.route)?.length};
 }else if(domain==='text'){
  const start=[Math.floor(meta.start/7),meta.start%7],
    goal=[Math.floor(meta.goal/7),meta.goal%7];
  for(let id=0;id<49;id++)for(const action of TOOLS){
   const t=world.intervene([Math.floor(id/7),id%7],action);
   edges.push({a:id,b:t.to[0]*7+t.to[1],action,type:'transformation',open:true});
  }
  const plan=shortestOracle(world,start,goal,14);
  const path=[meta.start];let at=start;
  if(plan)for(const action of plan){
   at=world.intervene(at,action).to;
   path.push(at[0]*7+at[1]);
  }
  solution={path:plan?path:[],actions:plan||[],
   cost:plan?plan.length:null,reachable:plan!==null};
 }
 return {schema:'magic.abstract.graph.v1',domain,
  nodes:positions.map((p,i)=>vertex(i,p,domain)),
  edges,solution,provenance:{
   evaluator:'Hidden simulator; view and scoring only',
   learned:'Observations, model scores, actual transitions only'
  }};
}
const uniqueEdges=edges=>{
 const seen=new Set();return (edges||[]).filter(validEdge).filter(e=>{
  const k=e.a+':'+e.b+':'+(e.action||'');
  if(seen.has(k))return false;seen.add(k);return true;
 }).slice(-550).map(e=>({a:e.a,b:e.b,action:e.action??null,
  cost:e.cost??null,open:e.open!==false}));
};
function nativeFrame(f,meta,domain){
 const walked=safePath(f.walked||f.walk||[]);
 const route=safePath(f.graph?.predictedPath||f.route||f.shape);
 const seen=[];
 let observed=[];
 if(Array.isArray(f.known)&&f.known.length&&typeof f.known[0]==='number'){
  const n=Math.round(Math.sqrt(f.known.length));
  for(let i=0;i<f.known.length;i++)if(f.known[i]>=0)seen.push(i);
  const good=new Set(seen.filter(i=>f.known[i]<=WALL));
  for(const i of good)for(const j of neighbors(n,i))
   if(j>i&&good.has(j))observed.push({a:i,b:j,open:true});
 }else if(Array.isArray(f.known)&&f.known.length&&Array.isArray(f.known[0])){
  for(const [key,status] of f.known){
   const ids=String(key).split(':').map(Number);
   if(ids.length===2&&ids.every(Number.isInteger)&&status===1)
    observed.push({a:ids[0],b:ids[1],open:true});
  }
 }
 if(Array.isArray(f.learnedEdges))observed.push(...f.learnedEdges);
 for(let k=1;k<walked.length;k++)observed.push({a:walked[k-1],b:walked[k],open:true});
 const current=f.current??f.position??walked.at(-1)??meta.start;
 let planned=f.graph?.predictedNext??route[1]??null;
 if(route[0]!==current&&route.length)planned=route[route.indexOf(current)+1]??null;
 return {...f,graph:{observedNodes:seen.length?seen:walked,
  observedEdges:uniqueEdges(observed),predictedPath:route,
  candidates:f.graph?.candidates||[],
  predictedNext:planned,chosen:f.graph?.chosen||null,
  actual:f.graph?.actual||null,modelType:meta.kind,
  derivedFrom:'Native model trace; no synthetic optimal learner route'}};
}
export function attachAbstractGraph(output,world,domain){
 const {meta,frames}=output;
 // No oracle data is used by trainEpisode or policy; attach only after they finish.
 meta.abstract=metaGraph(meta,world,domain);
 output.frames=frames.map(f=>f.graph?{
  ...f,graph:{...f.graph,observedEdges:uniqueEdges(f.graph.observedEdges)}
 }:nativeFrame(f,meta,domain));
 return output;
}
export function graphInvariant(output){
 const a=output?.meta?.abstract;
 if(a?.schema!=='magic.abstract.graph.v1')return false;
 const n=a.nodes.length;
 if(!a.nodes.every(v=>Number.isInteger(v.id)&&Number.isFinite(v.x)&&Number.isFinite(v.y)))return false;
 if(!a.edges.every(e=>e.a>=0&&e.a<n&&e.b>=0&&e.b<n))return false;
 if(!a.solution.path.every(v=>Number.isInteger(v)&&v>=0&&v<n))return false;
 return output.frames.every(f=>f.graph&&
  f.graph.observedEdges.every(e=>e.a>=0&&e.a<n&&e.b>=0&&e.b<n));
}

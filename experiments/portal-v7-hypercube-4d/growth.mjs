// Append-only, evidence-driven 4D experience graph.
// No hardcoded exercise nodes/edges: topology grows exclusively from measured
// events supplied by the ORIGINAL training engine, never from UI animation.
// Coordinates must have all four measured/explicit embedding dimensions.
import {point4} from './geometry.mjs';

export const GROWTH_SCHEMA='portal4d.verified-experience-graph.v1';
const copy=o=>structuredClone(o);
const token=(value,label,max=256)=>{
 if(typeof value!=='string'||!value.trim()||value.length>max)
  throw Error(label+' must be a nonempty, bounded string');
 return value;
};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const boundCount=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const eventKey=e=>token(e.event_id,'event_id');
const edgeKey=(e)=>JSON.stringify([e.from,e.to,e.kind]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const unique=(arr)=>[...new Set(arr)];

function validateEvent(input,currentNodes){
 if(!input||typeof input!=='object'||Array.isArray(input))
  throw Error('Expected an original measured training event object');
 const event={
  event_id:eventKey(input),
  source:token(input.source,'source'),
  domain:token(input.domain,'domain',100),
  problem_id:token(input.problem_id,'problem_id',300),
  step:input.step,
  nodes:[],
  edges:[],
  messages:[],
  predictedEdges:[],
  executed:null,
  model_update:null,
  reward:input.reward??null,
  occurred_at:input.occurred_at??null
 };
 if(!boundCount(event.step,0,Number.MAX_SAFE_INTEGER))
  throw Error('A real training step index must be a nonnegative integer');
 if(event.reward!==null&&!finite(event.reward))throw Error('Nonfinite measured reward');
 if(event.occurred_at!==null&&typeof event.occurred_at!=='string')
  throw Error('Invalid event timestamp');
 if(!Array.isArray(input.nodes)||!Array.isArray(input.edges))
  throw Error('Real event must contain nodes[] and edges[] arrays');
 if(input.nodes.length>3000||input.edges.length>20000)
  throw Error('Single event exceeds bounded ingest limits');
 const existing=new Set(currentNodes.keys()),incoming=new Map();
 for(const n of input.nodes){
  const id=token(n?.id,'node id');
  if(incoming.has(id))throw Error('Repeated node id inside the same evidence event');
  let position=null;
  if(n.position!==undefined||n.pos!==undefined){
   position=point4(n.position??n.pos);
  }else if(!existing.has(id)){
   throw Error('New 4D node '+id+' is missing x,y,z,w (will not fabricate W)');
  }
  if(n.activity!==undefined&&!finite(n.activity))
   throw Error('Activity must be measured finite numeric data');
  incoming.set(id,{id,position,
   role:typeof n.role==='string'?n.role:'observed',
   activity:n.activity??null});
 }
 const available=new Set([...existing,...incoming.keys()]);
 const parseEdge=(e,kindDefault)=>{
  const from=token(e?.from,'edge from'),to=token(e?.to,'edge to');
  if(!available.has(from)||!available.has(to))
   throw Error('Evidence edge references unknown node '+from+' -> '+to);
  if(from===to)throw Error('Self-edges must be represented as observations, not invented links');
  const kind=token(e.kind??kindDefault,'edge kind',120);
  const measured=e.strength??e.weight??null;
  if(measured!==null&&!finite(measured))
   throw Error('Nonfinite measured edge strength');
  return {from,to,kind,strength:measured};
 };
 const dedupedEdges=new Map();
 for(const e of input.edges){
  const x=parseEdge(e,'observed');
  dedupedEdges.set(edgeKey(x),x);
 }
 event.messages=(Array.isArray(input.messages)?input.messages:[]).map(e=>{
  const x=parseEdge(e,'message');if(x.strength===null)
   throw Error('A message strength must be supplied by real neural computation');
  return {...x,round:boundCount(e.round,0,100)?e.round:null};
 });
 for(const message of event.messages){
  const x={from:message.from,to:message.to,kind:'message',strength:message.strength};
  dedupedEdges.set(edgeKey(x),x);
 }
 event.predictedEdges=(Array.isArray(input.predictedEdges)?input.predictedEdges:[])
  .map(e=>parseEdge(e,'prediction')).map(e=>({from:e.from,to:e.to}));
 // Model predictions are never inserted into the confirmed topology.
 if(input.executed!==undefined&&input.executed!==null){
  const x=parseEdge(input.executed,'executed');
  event.executed={...x,action:input.executed.action??null};
  dedupedEdges.set(edgeKey(x),x);
 }
 if(input.model_update!==undefined&&input.model_update!==null){
  const update=input.model_update;
  if(!finite(update.gradient_norm)||!finite(update.weight_delta)||
     update.gradient_norm<0||update.weight_delta<0)
   throw Error('Model updates require measured nonnegative gradient_norm and weight_delta');
  event.model_update={gradient_norm:update.gradient_norm,weight_delta:update.weight_delta};
 }
 event.nodes=[...incoming.values()];
 event.edges=[...dedupedEdges.values()];
 return event;
}
function signalValues(nodes,domain){
 const active=[];
 for(const n of nodes)if(n.activity!==null&&n.activity!==undefined)
  active.push(n.id);
 return active;
}
export function validateEvidence(event,graph){
 if(!(graph instanceof EvidenceGraph))throw Error('Expected evidence graph');
 return validateEvent(event,graph.nodes);
}
export class EvidenceGraph{
 constructor(){
  this.nodes=new Map();
  this.edges=new Map();
  this.events=new Map();
  this.problems=new Set();
  this.sequence=0;
  this.learnedSteps=0;
  this.eventsByDomain=new Map();
  this.history=[];
  this.last=null;
 }
 ingest(raw){
  const data=validateEvent(raw,this.nodes);
  const signature=JSON.stringify(data);
  const duplicate=this.events.get(data.event_id);
  if(duplicate){
   if(duplicate!==signature)
    throw Error('Conflicting payload for existing event '+data.event_id);
   return {accepted:false,duplicate:true,sequence:this.sequence,
    growth:{nodes:[],edges:[]},stats:this.stats()};
  }
  const addedNodes=[],addedEdges=[],updatedEdges=[],active=[];
  for(const item of data.nodes){
   let node=this.nodes.get(item.id);
   if(!node){
    node={id:item.id,position:item.position,role:item.role,uses:0,
     domains:[],createdAtEvent:this.sequence+1,lastSeenEvent:0,activity:null};
    this.nodes.set(item.id,node);addedNodes.push(item.id);
   }else if(item.position){
    // A true model can update its learned 4D embedding; keep the exact new value.
    node.position=item.position.slice();
   }
   node.uses++;
   node.lastSeenEvent=this.sequence+1;
   node.domains=unique([...node.domains,data.domain]);
   if(item.activity!==null){node.activity=item.activity;active.push(item.id);}
  }
  for(const item of data.edges){
   const key=edgeKey(item);
   let edge=this.edges.get(key);
   if(!edge){
    edge={from:item.from,to:item.to,kind:item.kind,
     count:0,total_strength:0,strength_samples:0,
     domains:[],createdAtEvent:this.sequence+1,lastSeenEvent:0};
    this.edges.set(key,edge);addedEdges.push({from:item.from,to:item.to,kind:item.kind});
   }else updatedEdges.push({from:item.from,to:item.to,kind:item.kind});
   edge.count++;
   if(item.strength!==null){
    edge.total_strength+=item.strength;
    edge.strength_samples++;
   }
   edge.domains=unique([...edge.domains,data.domain]);
   edge.lastSeenEvent=this.sequence+1;
  }
  this.sequence++;
  this.events.set(data.event_id,signature);
  this.problems.add(data.problem_id);
  this.eventsByDomain.set(data.domain,(this.eventsByDomain.get(data.domain)||0)+1);
  if(data.model_update&&data.model_update.weight_delta>0)this.learnedSteps++;
  const growth={nodes:addedNodes,edges:addedEdges,updated_edges:updatedEdges};
  this.last={growth};
  const result={accepted:true,duplicate:false,sequence:this.sequence,growth,
   event:data,stats:this.stats(),frame:{
    step:data.step,domain:data.domain,problem_id:data.problem_id,
    event_seq:this.sequence,activeNodes:active,
    messages:data.messages.map(({from,to,strength,round})=>({from,to,strength,round})),
    predictedEdges:data.predictedEdges,
    executed:data.executed?{...data.executed}:null,
    reward:data.reward,model_update:data.model_update,growth
   }};
  this.last=result;
  // Bounded durable history, each point derived from a committed real event.
  this.history.push({sequence:this.sequence,stats:{...result.stats}});
  if(this.history.length>1200)this.history.shift();
  return result;
 }
 stats(){
  const n=this.nodes.size,e=this.edges.size;
  // Confirmed edges are a labeled multigraph; density must count each
  // ordered pair ONCE so it can never exceed 100%.
  const simplePairs=new Set([...this.edges.values()]
   .map(edge=>JSON.stringify([edge.from,edge.to]))).size;
  let crossDomainNodes=0,crossDomainEdges=0;
  for(const node of this.nodes.values())if(node.domains.length>1)crossDomainNodes++;
  for(const edge of this.edges.values())if(edge.domains.length>1)crossDomainEdges++;
  return {
   sequence:this.sequence,unique_problems:this.problems.size,
   total_nodes:n,total_edges:e,unique_directed_pairs:simplePairs,
   observed_actions:this.sequence,
   edges_per_node:n?e/n:0,
   directed_density:n>1?simplePairs/(n*(n-1)):0,
   learned_steps:this.learnedSteps,
   cross_domain_nodes:crossDomainNodes,
   cross_domain_edges:crossDomainEdges,
   by_domain:Object.fromEntries(this.eventsByDomain),
   last_growth:this.last?.growth??{nodes:[],edges:[]}
  };
 }
 view({maxNodes=1500,maxEdges=6000}={}){
  if(!boundCount(maxNodes,1,20000)||!boundCount(maxEdges,1,100000))
   throw Error('Invalid graph view bounds');
  const importance=node=>{
   const recent=this.sequence-node.lastSeenEvent;
   return (node.domains.length>1?1e5:0)+
    Math.min(node.uses,10000)*4+
    (recent<10?1e6-recent*100:0);
  };
  const selected=[...this.nodes.values()]
   .sort((a,b)=>importance(b)-importance(a)||a.id.localeCompare(b.id))
   .slice(0,maxNodes);
  const keep=new Set(selected.map(n=>n.id));
  const selectedEdges=[...this.edges.values()]
   .filter(e=>keep.has(e.from)&&keep.has(e.to))
   .sort((a,b)=>b.lastSeenEvent-a.lastSeenEvent||
    b.count-a.count).slice(0,maxEdges);
  const stats=this.stats();
  return {
   nodes:selected.map(n=>({id:n.id,position:n.position.slice(),
    role:n.role,uses:n.uses,domains:[...n.domains],activity:n.activity,
    createdAtEvent:n.createdAtEvent})),
   edges:selectedEdges.map(e=>({from:e.from,to:e.to,kind:e.kind,
    count:e.count,domains:[...e.domains],
    strength:e.strength_samples?e.total_strength/e.strength_samples:null,
    createdAtEvent:e.createdAtEvent})),
   meta:{schema:GROWTH_SCHEMA,source:'real original model evidence only',
    ...stats,visible_nodes:selected.length,visible_edges:selectedEdges.length,
    sampled:selected.length<stats.total_nodes||selectedEdges.length<stats.total_edges}
  };
 }
 serialize(){
  return {schema:GROWTH_SCHEMA,sequence:this.sequence,learnedSteps:this.learnedSteps,
   nodes:[...this.nodes.values()].map(copy),edges:[...this.edges.values()].map(copy),
   events:[...this.events.entries()],
   problems:[...this.problems],
   eventsByDomain:[...this.eventsByDomain.entries()],
   history:this.history.map(copy)};
 }
 static restore(payload){
  if(payload?.schema!==GROWTH_SCHEMA)throw Error('Incompatible graph snapshot schema');
  const graph=new EvidenceGraph();
  if(!boundCount(payload.sequence,0,Number.MAX_SAFE_INTEGER))
   throw Error('Invalid persisted graph sequence');
  graph.sequence=payload.sequence;
  graph.learnedSteps=payload.learnedSteps;
  graph.nodes=new Map(payload.nodes.map(n=>{
   if(!n.id||graph.nodes.has(n.id))throw Error('Duplicate invalid node');
   return [n.id,{...copy(n),position:point4(n.position)}];
  }));
  graph.edges=new Map(payload.edges.map(e=>[edgeKey(e),copy(e)]));
  if(graph.edges.size!==payload.edges.length)
   throw Error('Duplicate persisted edges');
  graph.events=new Map(payload.events);
  graph.problems=new Set(payload.problems);
  graph.eventsByDomain=new Map(payload.eventsByDomain);
  graph.history=(payload.history||[]).map(copy);
  if(graph.events.size!==graph.sequence)
   throw Error('Graph snapshot sequence/events mismatch');
  for(const e of graph.edges.values())
   if(!graph.nodes.has(e.from)||!graph.nodes.has(e.to))
    throw Error('Persisted edge references missing node');
  return graph;
 }
}
